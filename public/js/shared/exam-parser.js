// Unified, header-aware exam workbook parser + automatic Excel image extractor.
// Parses all 3 template families (English / STEM / Arabic) and any custom subset of columns.
//
//   const { parseExamWorkbook } = require('./lib/exam-parser');
//   const result = await parseExamWorkbook(fs.readFileSync('exam.xlsx'));
//   // result = { ok, examInfo, config, passages, questions, images, errors, warnings }
//   // questions[i].image_ref -> key into result.images ({ buffer, ext, source }) – save to disk, then set image_url.
//
// Supported images:
//   1. Floating / anchored pictures (xl/drawings/drawingN.xml + rels + xl/media) — matched by anchor <xdr:from><xdr:row>.
//   2. Excel 365 "Place in Cell" pictures (xl/metadata.xml + xl/richData/* + xl/media) — matched by the cell's vm attribute.
//   3. WPS-style cell images (xl/cellimages.xml + =DISPIMG("ID",1) formula).
//   4. A URL (http/https or /path) or data:image URI typed in the Image cell.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('exceljs'), require('jszip'), true);
  else root.ExamParser = factory(root.ExcelJS, root.JSZip, false);
})(typeof self !== 'undefined' ? self : this, function (ExcelJS, JSZip, IS_NODE) {
'use strict';
const BIN = IS_NODE ? 'nodebuffer' : 'uint8array';
const path = { posix: {
  dirname: p => p.includes('/') ? p.slice(0, p.lastIndexOf('/')) : '.',
  basename: p => p.slice(p.lastIndexOf('/') + 1),
  extname: p => { const b = p.slice(p.lastIndexOf('/') + 1); const i = b.lastIndexOf('.'); return i > 0 ? b.slice(i) : ''; },
  join: (...a) => a.filter(x => x && x !== '.').join('/'),
  normalize: p => { const out = []; for (const s of p.split('/')) { if (s === '..') out.pop(); else if (s && s !== '.') out.push(s); } return out.join('/'); },
} };

const norm = h => String(h ?? '').trim().toLowerCase().replace(/[\s\-]+/g, '_');
const LETTERS = ['A', 'B', 'C', 'D'];
const toWestern = s => String(s).replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d));

function cellText(v) {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  if (typeof v === 'object') {
    if (v.richText) return v.richText.map(t => t.text).join('');
    if (v.text != null) return String(v.text);           // hyperlink
    if (v.hyperlink) return String(v.hyperlink);
    if (v.result != null) return String(v.result);       // formula
    if (v.error) return '';
    return '';
  }
  return String(v);
}
const clean = v => cellText(v).replace(/\r\n/g, '\n').trim();
const yes = (v, def) => { const s = norm(v); if (!s) return def; return ['yes', 'y', 'true', '1', 'نعم'].includes(s); };

// ---------------------------------------------------------------- zip helpers
const xmlAttr = (tag, name) => { const m = tag.match(new RegExp(`\\b${name}="([^"]*)"`)); return m ? m[1] : null; };
// Some writers prefix every tag (<x:row>, <x:c> …): drop tag prefixes so one set of patterns fits all files.
const unprefix = xml => String(xml).replace(/<(\/?)[A-Za-z]\w*:(?=[A-Za-z])/g, '<$1');
function resolveTarget(baseFile, target) {
  if (target.startsWith('/')) return target.slice(1);
  return path.posix.normalize(path.posix.join(path.posix.dirname(baseFile), target));
}
async function readRels(zip, file) {
  const relsPath = path.posix.join(path.posix.dirname(file), '_rels', path.posix.basename(file) + '.rels');
  const f = zip.file(relsPath); const out = {};
  if (!f) return out;
  const xml = await f.async('string');
  for (const m of xml.matchAll(/<Relationship\b[^>]*>/g)) out[xmlAttr(m[0], 'Id')] = { target: resolveTarget(file, xmlAttr(m[0], 'Target')), type: xmlAttr(m[0], 'Type') || '' };
  return out;
}
async function sheetFileByName(zip, sheetName) {
  const wbXml = await zip.file('xl/workbook.xml').async('string');
  const rels = await readRels(zip, 'xl/workbook.xml');
  for (const m of wbXml.matchAll(/<sheet\b[^>]*>/g)) {
    const name = xmlAttr(m[0], 'name').replace(/&amp;/g, '&');
    if (name.trim().toLowerCase() === sheetName.toLowerCase()) return rels[xmlAttr(m[0], 'r:id')]?.target;
  }
  return null;
}
const extOf = p => (path.posix.extname(p).slice(1) || 'png').toLowerCase().replace('jpeg', 'jpg');

// Returns every picture of the sheet with its cell: [{ row, col (both 1-based), buffer, ext, source }].
async function extractCellImages(zip, sheetFile) {
  const list = [], seen = new Set();
  if (!sheetFile || !zip.file(sheetFile)) return list;
  const sheetXml = await zip.file(sheetFile).async('string');
  const sheetRels = await readRels(zip, sheetFile);
  const put = async (row, col, mediaPath, source) => {
    const key = row + ':' + col;
    if (seen.has(key) || !mediaPath || !zip.file(mediaPath)) return;
    seen.add(key);
    list.push({ row, col, buffer: await zip.file(mediaPath).async(BIN), ext: extOf(mediaPath), source });
  };
  const refCol = ref => colIndex(String(ref).replace(/\$/g, ''));

  // (1) Floating / anchored pictures
  for (const rel of Object.values(sheetRels).filter(r => /\/drawing$/.test(r.type))) {
    const df = zip.file(rel.target); if (!df) continue;
    // Excel writes <xdr:oneCellAnchor><xdr:from><xdr:row>…; openpyxl (used by Claude) writes the same tags with no prefix.
    // Drop tag prefixes so both forms match (attributes such as r:embed are untouched).
    const dXml = unprefix(await df.async('string'));
    const dRels = await readRels(zip, rel.target);
    for (const a of dXml.matchAll(/<(twoCellAnchor|oneCellAnchor|absoluteAnchor)\b[\s\S]*?<\/\1>/g)) {
      const rowM = a[0].match(/<from>[\s\S]*?<row>(\d+)<\/row>/);
      const colM = a[0].match(/<from>[\s\S]*?<col>(\d+)<\/col>/);
      const embed = a[0].match(/<blip\b[^>]*r:embed="([^"]+)"/);
      if (!rowM || !embed) continue;
      await put(Number(rowM[1]) + 1, colM ? Number(colM[1]) + 1 : 0, dRels[embed[1]]?.target, 'anchored');
    }
  }

  // (2) Excel 365 "Place in Cell" (rich value) pictures: <c r="H5" vm="1">
  const vmCells = [...sheetXml.matchAll(/<c\b[^>]*\bvm="(\d+)"[^>]*>/g)].map(m => ({ ref: xmlAttr(m[0], 'r'), vm: Number(m[1]) }));
  if (vmCells.length && zip.file('xl/richData/rdrichvalue.xml')) {
    const rvXml = await zip.file('xl/richData/rdrichvalue.xml').async('string');
    const richValues = [...rvXml.matchAll(/<rv\b[^>]*>([\s\S]*?)<\/rv>/g)].map(m => [...m[1].matchAll(/<v\b[^>]*>([^<]*)<\/v>/g)].map(v => v[1]));
    const relFile = zip.file('xl/richData/richValueRel.xml') ? 'xl/richData/richValueRel.xml' : null;
    let relIds = [], relMap = {};
    if (relFile) {
      relIds = [...(await zip.file(relFile).async('string')).matchAll(/<rel\b[^>]*r:id="([^"]+)"/g)].map(m => m[1]);
      relMap = await readRels(zip, relFile);
    }
    // valueMetadata (vm, 1-based) -> rc v -> futureMetadata XLRICHVALUE bk -> rvb i (rich value index)
    let vmToRv = null;
    if (zip.file('xl/metadata.xml')) {
      const meta = await zip.file('xl/metadata.xml').async('string');
      const types = [...meta.matchAll(/<metadataType\b[^>]*name="([^"]+)"/g)].map(m => m[1]);
      const fm = meta.match(/<futureMetadata\b[^>]*name="XLRICHVALUE"[^>]*>([\s\S]*?)<\/futureMetadata>/);
      const rvb = fm ? [...fm[1].matchAll(/<xlrd:rvb\b[^>]*i="(\d+)"/g)].map(m => Number(m[1])) : [];
      const vmBlock = meta.match(/<valueMetadata\b[^>]*>([\s\S]*?)<\/valueMetadata>/);
      if (vmBlock) {
        vmToRv = [...vmBlock[1].matchAll(/<bk>([\s\S]*?)<\/bk>/g)].map(b => {
          const rc = b[1].match(/<rc\b[^>]*t="(\d+)"[^>]*v="(\d+)"/);
          if (!rc || types[Number(rc[1]) - 1] !== 'XLRICHVALUE') return null;
          return rvb[Number(rc[2])] ?? Number(rc[2]);
        });
      }
    }
    for (const { ref, vm } of vmCells) {
      const rvIndex = vmToRv ? vmToRv[vm - 1] : vm - 1;
      const rv = richValues[rvIndex ?? vm - 1];
      if (!rv) continue;
      const relIdx = Number(rv[0]);
      const media = relMap[relIds[relIdx]]?.target;
      await put(Number(ref.replace(/^[A-Z]+/, '')), refCol(ref), media, 'in-cell');
    }
  }

  // (3) WPS cellimages.xml + =DISPIMG("ID_…",1)
  if (zip.file('xl/cellimages.xml')) {
    const ciXml = await zip.file('xl/cellimages.xml').async('string');
    const ciRels = await readRels(zip, 'xl/cellimages.xml');
    const idToMedia = {};
    for (const m of ciXml.matchAll(/<etc:cellImage>([\s\S]*?)<\/etc:cellImage>/g)) {
      const name = m[1].match(/<xdr:cNvPr\b[^>]*name="([^"]+)"/)?.[1];
      const embed = m[1].match(/r:embed="([^"]+)"/)?.[1];
      if (name && embed) idToMedia[name] = ciRels[embed]?.target;
    }
    for (const m of sheetXml.matchAll(/<c\b[^>]*r="([A-Z]+)(\d+)"[^>]*>\s*<f>[^<]*DISPIMG\(&quot;([^&]+)&quot;/g)) await put(Number(m[2]), refCol(m[1]), idToMedia[m[3]], 'cellimages');
  }
  return list;
}
// Back-compatible helper: Map(rowNumber1Based -> first picture of that row).
async function extractImages(zip, sheetFile) {
  const byRow = new Map();
  for (const im of await extractCellImages(zip, sheetFile)) if (!byRow.has(im.row)) byRow.set(im.row, im);
  return byRow;
}

// ---------------------------------------------------------------- sheet reading
function readTable(ws) {
  if (!ws) return { headers: {}, rows: [] };
  const headers = {};
  ws.getRow(1).eachCell((c, col) => { const k = norm(cellText(c.value)); if (k) headers[k] = col; });
  const rows = [];
  ws.eachRow((row, r) => {
    if (r === 1) return;
    const get = h => { const col = headers[norm(h)]; return col ? clean(row.getCell(col).value) : ''; };
    const has = h => headers[norm(h)] != null;
    const raw = col => row.getCell(col).value;
    rows.push({ r, get, has, raw: h => (headers[norm(h)] ? raw(headers[norm(h)]) : null) });
  });
  return { headers, rows };
}
const findSheet = (wb, name) => wb.worksheets.find(w => w.name.trim().toLowerCase() === name.toLowerCase())
  || wb.worksheets.find(w => w.name.trim().toLowerCase().startsWith(name.toLowerCase()));

const SUBJECTS = ['Mathematics', 'Science', 'English', 'Arabic', 'Islamic Education', 'Social Studies', 'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Other'];

// ---------------------------------------------------------------- backup reader
// Files written by other tools (openpyxl / Claude, Google Sheets, LibreOffice…) sometimes contain parts ExcelJS cannot
// load (drawings, validations, styles). This minimal reader takes the cell VALUES straight from the XML and exposes the
// small subset of the ExcelJS API the parser uses (worksheets, name, eachRow, getRow, getCell().value, eachCell).
const decodeXml = s => String(s).replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16))).replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(+d))
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const textOf = xml => decodeXml([...String(xml).replace(/<rPh\b[\s\S]*?<\/rPh>/g, '').matchAll(/<t\b[^>]*>([\s\S]*?)<\/t>/g)].map(m => m[1]).join(''));
const colIndex = ref => { let n = 0; for (const ch of String(ref).replace(/\d+$/, '')) n = n * 26 + (ch.charCodeAt(0) - 64); return n; };
async function liteWorkbook(zip) {
  const shared = zip.file('xl/sharedStrings.xml') ? [...unprefix(await zip.file('xl/sharedStrings.xml').async('string')).matchAll(/<si>([\s\S]*?)<\/si>/g)].map(m => textOf(m[1])) : [];
  const wbXml = unprefix(await zip.file('xl/workbook.xml').async('string'));
  const rels = await readRels(zip, 'xl/workbook.xml');
  const worksheets = [];
  for (const m of wbXml.matchAll(/<sheet\b[^>]*>/g)) {
    const name = decodeXml(xmlAttr(m[0], 'name') || ''), target = rels[xmlAttr(m[0], 'r:id')] && rels[xmlAttr(m[0], 'r:id')].target;
    if (!target || !zip.file(target)) continue;
    const xml = unprefix(await zip.file(target).async('string')); const rows = new Map(); let auto = 0;
    for (const rm of xml.matchAll(/<row\b([^>]*?)(?:\/>|>([\s\S]*?)<\/row>)/g)) {
      const r = Number(xmlAttr('<x ' + rm[1] + '>', 'r')) || ++auto; auto = r; const cells = new Map(); let col = 0;
      for (const cm of String(rm[2] || '').matchAll(/<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const attrs = '<x ' + cm[1] + '>', ref = xmlAttr(attrs, 'r'), t = xmlAttr(attrs, 't'), body = cm[2] || '';
        col = ref ? colIndex(ref) : col + 1;
        const v = (body.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        let val = null;
        if (t === 's') val = v !== undefined ? shared[Number(v)] : null;
        else if (t === 'inlineStr') val = textOf(body);
        else if (t === 'str') val = v !== undefined ? decodeXml(v) : null;
        else if (t === 'b') val = v === '1';
        else if (t === 'e') val = null;
        else if (v !== undefined) { const n = Number(v); val = Number.isFinite(n) ? n : decodeXml(v); }
        if (val !== null && val !== '') cells.set(col, val);
      }
      if (cells.size) rows.set(r, cells);
    }
    const rowObj = r => { const cells = rows.get(r) || new Map(); return { getCell: c => ({ value: cells.has(c) ? cells.get(c) : null }), eachCell: cb => [...cells.keys()].sort((a, b) => a - b).forEach(c => cb({ value: cells.get(c) }, c)) }; };
    worksheets.push({ name, getRow: rowObj, eachRow: cb => [...rows.keys()].sort((a, b) => a - b).forEach(r => cb(rowObj(r), r)) });
  }
  return { worksheets, lite: true };
}

async function parseExamWorkbook(buffer, opts = {}) {
  const errors = [], warnings = [];
  const empty = (message, message_ar) => ({ ok: false, examInfo: {}, config: {}, passages: {}, questions: [], images: {}, warnings,
    errors: [{ sheet: '-', row: null, message, message_ar: message_ar || 'تعذر قراءة الملف.' }], stats: { questions: 0, totalMarks: 0, passages: 0, images: 0 } });
  let zip;
  try { zip = await JSZip.loadAsync(buffer); } catch (e) { return empty('This is not an Excel .xlsx file. Save it as .xlsx and upload again.', 'هذا ليس ملف Excel بصيغة ‎.xlsx — احفظه بصيغة ‎.xlsx ثم أعد الرفع.'); }
  if (!zip.file('xl/workbook.xml')) return empty('This is not an Excel .xlsx workbook (an .xls, .csv or another file type?). Save it as .xlsx and upload again.', 'هذا الملف ليس مصنف Excel بصيغة ‎.xlsx (ربما ‎.xls أو ‎.csv) — احفظه بصيغة ‎.xlsx ثم أعد الرفع.');
  let wb = new ExcelJS.Workbook();
  try { if (opts.forceLite) throw new Error('forced backup reader'); await wb.xlsx.load(buffer); }
  catch (e) {   // fall back to reading the cell values directly
    try { wb = await liteWorkbook(zip); } catch (e2) { return empty('The Excel file could not be read (' + e.message + ').', 'تعذر قراءة ملف Excel — افتحه في Excel واحفظه مرة أخرى ثم أعد الرفع.'); }
  }
  const err = (sheet, row, message, message_ar) => errors.push({ sheet, row, message, message_ar });
  const warn = (sheet, row, message, message_ar) => warnings.push({ sheet, row, message, message_ar });

  // ---- Exam_Info (Field | Value)
  const examInfo = {};
  const infoWs = findSheet(wb, 'Exam_Info');
  if (infoWs) infoWs.eachRow((row, r) => {
    if (r === 1) return;
    const k = clean(row.getCell(1).value); if (k) examInfo[k] = clean(row.getCell(2).value);
  });
  else warn('Exam_Info', null, 'Exam_Info sheet not found – portal selections and defaults will be used.', 'لم يتم العثور على ورقة Exam_Info – سيتم استخدام اختيارات البوابة والقيم الافتراضية.');
  const I = k => examInfo[Object.keys(examInfo).find(x => norm(x) === norm(k))] ?? '';
  const subject = SUBJECTS.find(s => s.toLowerCase() === I('Subject').toLowerCase()) || '';
  if (I('Subject') && !subject) warn('Exam_Info', null, `Unknown Subject "${I('Subject')}".`, `مادة غير معروفة "${I('Subject')}".`);
  const gradeNum = Number(toWestern(I('Grade')).replace(/[^\d]/g, '')) || null;
  const term = /([123])/.exec(toWestern(I('Term')))?.[1];
  const lang = norm(I('Default_Language')) === 'ar' ? 'ar' : (norm(I('Default_Language')) === 'en' ? 'en' : null);

  // ---- Passages
  const passages = {};
  const pt = readTable(findSheet(wb, 'Passages'));
  for (const row of pt.rows) {
    const id = row.get('Passage_ID').toUpperCase();
    const en = row.get('Passage_EN'), ar = row.get('Passage_AR'), title = row.get('Passage_Title');
    if (!id && !en && !ar && !title) continue;
    if (!id) { err('Passages', row.r, 'Passage_ID is missing.', 'رمز النص Passage_ID مفقود.'); continue; }
    if (passages[id]) err('Passages', row.r, `Duplicate Passage_ID "${id}".`, `رمز النص "${id}" مكرر.`);
    if (!en && !ar) err('Passages', row.r, `Passage "${id}" has no text.`, `النص "${id}" فارغ.`);
    passages[id] = { title, en, ar };
  }

  // ---- Questions
  const qWsName = (findSheet(wb, 'Questions') || {}).name;
  const qt = readTable(findSheet(wb, 'Questions'));
  if (!qWsName) err('Questions', null, 'Questions sheet not found.', 'لم يتم العثور على ورقة Questions.');
  const images = {};
  // Pictures: a picture in the Image_A…Image_D (or Option_A…Option_D) column belongs to that option;
  // any other picture in the row belongs to the question.
  const cellImgs = qWsName ? await extractCellImages(zip, await sheetFileByName(zip, qWsName)) : [];
  const optCol = {};
  LETTERS.forEach((L, k) => ['Image_' + L, 'Option_' + L, 'Option_' + L + '_AR'].forEach(h => { if (qt.headers[norm(h)]) optCol[qt.headers[norm(h)]] = k; }));
  const imgByRow = new Map(), optImgByRow = new Map();
  for (const im of cellImgs) {
    if (optCol[im.col] !== undefined) { const m = optImgByRow.get(im.row) || {}; if (!m[optCol[im.col]]) m[optCol[im.col]] = im; optImgByRow.set(im.row, m); }
    else if (!imgByRow.has(im.row)) imgByRow.set(im.row, im);
  }
  const questions = [];
  for (const row of qt.rows) {
    const en = row.get('Question_EN'), ar = row.get('Question_AR');
    const S = 'Questions', R = row.r;
    const opts = LETTERS.map(L => row.get('Option_' + L));
    const optsAr = LETTERS.map(L => row.get('Option_' + L + '_AR'));   // optional Arabic text of each answer (bilingual exams)
    // option pictures: an embedded picture, or a link typed in Image_X
    const oPics = optImgByRow.get(R) || {};
    const optImg = LETTERS.map((L, k) => {
      if (oPics[k]) return { ref: `row${R}_${L}`, img: oPics[k] };
      const txt = row.get('Image_' + L);
      if (/^(https?:\/\/|data:image\/|\/)/i.test(txt)) return { url: txt };
      if (txt) warn(S, R, `Image_${L} cell text "${txt.slice(0, 40)}" is not an image or link – ignored.`, `محتوى الخلية Image_${L} ليس صورة أو رابطًا وتم تجاهله.`);
      return null;
    });
    const filled = opts.map((o, k) => !!(o || optsAr[k] || optImg[k]));
    const imageCell = row.get('Image');
    const anything = en || ar || filled.some(Boolean) || row.get('Correct_Option');
    if (!anything && !imgByRow.has(row.r)) continue;
    if (!en && !ar) err(S, R, 'Question text is missing (Question_EN / Question_AR).', 'نص السؤال مفقود.');
    const lastFilled = filled.reduce((m, o, i) => (o ? i : m), -1);
    const gap = filled.slice(0, lastFilled + 1).findIndex(o => !o);
    if (gap !== -1) err(S, R, `Option_${LETTERS[gap]} is empty but a later option is filled – fill options in order A, B, C, D.`, `الخيار ${LETTERS[gap]} فارغ مع وجود خيار بعده – املأ الخيارات بالترتيب.`);
    const keep = LETTERS.map((_, k) => k).filter(k => filled[k]);
    const options = keep.map(k => opts[k]);
    const options_ar = keep.map(k => optsAr[k] || '');
    const option_images = [], option_image_refs = [];
    keep.forEach(k => { const p = optImg[k];
      option_images.push(p && p.url ? p.url : '');
      option_image_refs.push(p && p.ref ? p.ref : '');
      if (p && p.ref) images[p.ref] = p.img; });
    if (options.length < 2) err(S, R, 'At least 2 options (Option_A, Option_B – text or picture) are required.', 'يجب كتابة خيارين على الأقل (نص أو صورة).');
    const textOnly = options.filter((o, k) => o && !option_images[k] && !option_image_refs[k]);
    const dup = textOnly.find((o, i) => textOnly.indexOf(o) !== i);
    if (dup) warn(S, R, `Two options are identical ("${dup.slice(0, 30)}").`, 'يوجد خياران متطابقان.');
    const co = toWestern(row.get('Correct_Option')).toUpperCase().replace(/[^A-D1-4]/g, '');
    let correct = -1;
    if (!co) err(S, R, 'Correct_Option is missing.', 'الإجابة الصحيحة Correct_Option مفقودة.');
    else {
      correct = /[1-4]/.test(co) ? Number(co) - 1 : LETTERS.indexOf(co[0]);
      if (!filled[correct]) { err(S, R, `Correct_Option "${co}" points to an empty option.`, `الإجابة الصحيحة "${co}" تشير إلى خيار فارغ.`); correct = -1; }
    }
    const marksRaw = toWestern(row.get('Marks'));
    const marks = Number(marksRaw);
    if (!marksRaw) err(S, R, 'Marks is missing.', 'الدرجة Marks مفقودة.');
    else if (!Number.isFinite(marks) || marks <= 0) err(S, R, `Marks "${marksRaw}" is not a positive number.`, `الدرجة "${marksRaw}" ليست رقمًا موجبًا.`);
    const pid = row.get('Passage_ID').toUpperCase();
    if (pid && !passages[pid]) err(S, R, `Unknown Passage_ID "${pid}" (not in the Passages sheet).`, `رمز النص "${pid}" غير موجود في ورقة Passages.`);

    let image_url = '', image_ref = '';
    if (imgByRow.has(R)) { image_ref = `row${R}`; images[image_ref] = imgByRow.get(R); }
    else if (/^(https?:\/\/|data:image\/|\/)/i.test(imageCell)) image_url = imageCell;
    else if (imageCell) warn(S, R, `Image cell text "${imageCell.slice(0, 40)}" is not an image or link – ignored.`, 'محتوى خلية الصورة ليس صورة أو رابطًا وتم تجاهله.');

    questions.push({
      row: R,
      q_num: Number(toWestern(row.get('Q_Num'))) || questions.length + 1,
      section_part: row.get('Section_Part'), topic: row.get('Topic'),
      outcome_code: row.get('Outcome_Code'), outcome_label: row.get('Outcome_Label'),
      passage_id: pid, en, ar, image_url, image_ref, options, correct,
      ...(option_images.some(Boolean) || option_image_refs.some(Boolean) ? { option_images, option_image_refs } : {}),
      ...(options_ar.some(Boolean) ? { options_ar } : {}),
      marks: Number.isFinite(marks) && marks > 0 ? marks : 0,
      feedback: row.get('Feedback'), hint: row.get('Hint'),
    });
  }
  if (qWsName && !questions.length) err('Questions', null, 'No questions found.', 'لا توجد أسئلة.');
  questions.sort((a, b) => a.q_num - b.q_num);
  const seen = new Set();
  questions.forEach(q => { if (seen.has(q.q_num)) warn('Questions', q.row, `Q_Num ${q.q_num} is repeated.`, `رقم السؤال ${q.q_num} مكرر.`); seen.add(q.q_num); });
  const usedPassages = new Set(questions.map(q => q.passage_id).filter(Boolean));
  Object.keys(passages).filter(p => !usedPassages.has(p)).forEach(p => warn('Passages', null, `Passage "${p}" is not used by any question.`, `النص "${p}" غير مستخدم في أي سؤال.`));

  const hasAr = questions.some(q => q.ar), hasEn = questions.some(q => q.en);
  const num = (k, d) => { const n = Number(toWestern(I(k))); return I(k) !== '' && Number.isFinite(n) ? n : d; };
  const config = {
    examTitle: I('Exam_Title'),
    subject, grade: gradeNum, track: ['general', 'advanced', 'all'].includes(norm(I('Track'))) ? I('Track')[0].toUpperCase() + norm(I('Track')).slice(1) : '',
    term: term ? `Term ${term}` : '',
    teacher: I('Teacher_Name'), author: I('Teacher_Name'),
    examCode: I('Exam_Code'),
    durationMinutes: num('Duration_Minutes', 60),
    passingPercent: num('Passing_Percent', 50),
    calculatorAllowed: yes(I('Calculator_Allowed'), false),
    allowBacktrack: yes(I('Allow_Backtrack'), true),
    shuffleQuestions: yes(I('Shuffle_Questions'), false),
    shuffleOptions: yes(I('Shuffle_Options'), true),
    requireSeenAll: yes(I('Require_Seen_All'), true),
    showReviewAfterSubmit: yes(I('Show_Review_After_Submit'), true),
    defaultLanguage: lang || (hasAr && !hasEn ? 'ar' : 'en'),
    extraInstructions: I('Extra_Instructions') ? I('Extra_Instructions').split('|').map(s => s.trim()).filter(Boolean) : [],
    school: 'Zayed Educational Complex – Suhaila', academicYear: '2026 / 2027',
  };
  return {
    ok: errors.length === 0, examInfo, config, passages, questions, images, errors, warnings,
    stats: { questions: questions.length, totalMarks: questions.reduce((s, q) => s + q.marks, 0), passages: Object.keys(passages).length, images: Object.keys(images).length + questions.filter(q => q.image_url).length + questions.reduce((n, q) => n + (q.option_images || []).filter(Boolean).length, 0) },
  };
}

return { parseExamWorkbook, extractImages, extractCellImages };
});
