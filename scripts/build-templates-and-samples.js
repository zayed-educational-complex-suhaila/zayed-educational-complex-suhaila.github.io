// Generates:
//   templates/*.xlsx                 – the 3 subject-tailored templates (Term 1 default)
//   public/templates/*.xlsx          – same files served as static fallbacks
//   samples/*.xlsx                   – 4 ready-to-upload test exams (English, Math w/ anchored image,
//                                      Science w/ Excel-365 "Place in Cell" image, Islamic Education RTL)
// then parses every sample with the unified parser and prints a validation summary.
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const JSZip = require('jszip');
const { buildTemplate, FAMILIES } = require('../lib/excel-templates');
const { parseExamWorkbook } = require('../lib/exam-parser');

const ROOT = path.join(__dirname, '..');
const out = d => { fs.mkdirSync(path.join(ROOT, d), { recursive: true }); return path.join(ROOT, d); };

// ---------------------------------------------------------------- tiny PNG painter (no deps)
function png(w, h, draw) {
  const px = Buffer.alloc(w * h * 3, 255);
  const set = (x, y, [r, g, b]) => { x = Math.round(x); y = Math.round(y); if (x < 0 || y < 0 || x >= w || y >= h) return; const i = (y * w + x) * 3; px[i] = r; px[i + 1] = g; px[i + 2] = b; };
  const line = (x0, y0, x1, y1, c, t = 1) => { const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)) * 2 || 1; for (let i = 0; i <= n; i++) { const x = x0 + (x1 - x0) * i / n, y = y0 + (y1 - y0) * i / n; for (let a = -t + 1; a < t; a++) for (let b = -t + 1; b < t; b++) set(x + a, y + b, c); } };
  const dot = (cx, cy, r, c) => { for (let y = -r; y <= r; y++) for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r) set(cx + x, cy + y, c); };
  draw({ set, line, dot, w, h });
  const raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; px.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3); }
  const crcT = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
  const crc = b => { let c = 0xffffffff; for (const x of b) c = crcT[(c ^ x) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
  const chunk = (type, data) => { const l = Buffer.alloc(4); l.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 2;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
// Graph of y = 2x on a 0..6 grid (used by the Math sample).
const graphPng = () => png(360, 300, ({ line, dot }) => {
  const ox = 40, oy = 260, s = 40, grid = [215, 225, 238], axis = [23, 64, 109], blue = [15, 111, 198];
  for (let i = 0; i <= 7; i++) { line(ox + i * s, oy, ox + i * s, oy - 6 * s, grid); }
  for (let j = 0; j <= 6; j++) { line(ox, oy - j * s, ox + 7 * s, oy - j * s, grid); }
  line(ox, oy, ox + 7 * s + 10, oy, axis, 2); line(ox, oy, ox, oy - 6 * s - 10, axis, 2);
  line(ox, oy, ox + 3 * s, oy - 6 * s, blue, 2);
  [[0, 0], [1, 2], [2, 4], [3, 6]].forEach(([x, y]) => dot(ox + x * s, oy - y * s / 2 * 2 / 2 * 1, 0, blue));
  [[0, 0], [1, 2], [2, 4], [3, 6]].forEach(([x, y]) => dot(ox + x * s, oy - y * s, 6, [165, 194, 73]));
});
// Small graph of y = m·x + b (used as PICTURE ANSWERS in the Math sample).
const lineGraphPng = (m, b) => png(160, 160, ({ line }) => {
  const o = 80, s = 14, grid = [215, 225, 238], axis = [23, 64, 109], c = [83, 98, 33];
  for (let i = -5; i <= 5; i++) { line(o + i * s, 10, o + i * s, 150, grid); line(10, o + i * s, 150, o + i * s, grid); }
  line(8, o, 152, o, axis, 2); line(o, 8, o, 152, axis, 2);
  const y = x => o - (m * x + b) * s;
  line(o - 5 * s, y(-5), o + 5 * s, y(5), c, 2);
});
// Simple plant-cell diagram (used by the Science sample, placed IN the cell).
const cellPng = () => png(320, 220, ({ line, dot, set }) => {
  const g = [76, 91, 33], n = [15, 111, 198];
  line(20, 20, 300, 20, g, 3); line(300, 20, 300, 200, g, 3); line(300, 200, 20, 200, g, 3); line(20, 200, 20, 20, g, 3); // wall
  line(30, 30, 290, 30, g); line(290, 30, 290, 190, g); line(290, 190, 30, 190, g); line(30, 190, 30, 30, g);        // membrane
  dot(110, 100, 34, n); dot(110, 100, 12, [23, 64, 109]);                                                                // nucleus
  for (const [x, y] of [[200, 60], [230, 140], [180, 160], [250, 80]]) { for (let a = -18; a <= 18; a++) for (let b = -9; b <= 9; b++) if (a * a / 324 + b * b / 81 <= 1) set(x + a, y + b, [124, 202, 98]); } // chloroplasts
});

// ---------------------------------------------------------------- helpers
async function fillWorkbook(fam, opts, passages, questions) {
  const wb = await buildTemplate(fam, { ...opts, withExamples: false });
  const info = wb.getWorksheet('Exam_Info');
  info.eachRow((row, i) => { if (i > 1 && opts.info && opts.info[row.getCell(1).value] !== undefined) row.getCell(2).value = opts.info[row.getCell(1).value]; });
  const ps = wb.getWorksheet('Passages'); passages.forEach(p => { const r = ps.addRow(p); r.height = 120; r.eachCell(c => (c.alignment = { wrapText: true, vertical: 'top' })); });
  const qs = wb.getWorksheet('Questions'); questions.forEach((q, i) => { const r = qs.getRow(i + 2); FAMILIES[fam].questionCols.forEach((h, c) => { if (q[h] !== undefined) r.getCell(c + 1).value = q[h]; }); r.commit(); });
  return wb;
}

// Converts a picture into a genuine Excel 365 "Place in Cell" picture (rich value) in sheet3 cell `ref`.
async function placeInCell(buf, ref, imgBuf) {
  const zip = await JSZip.loadAsync(buf);
  zip.file('xl/media/incell1.png', imgBuf);
  zip.file('xl/metadata.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<metadata xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:xlrd="http://schemas.microsoft.com/office/spreadsheetml/2017/richdata"><metadataTypes count="1"><metadataType name="XLRICHVALUE" minSupportedVersion="120000" copy="1" pasteAll="1" pasteValues="1" merge="1" splitFirst="1" rowColShift="1" clearFormats="1" clearComments="1" assign="1" coerce="1"/></metadataTypes><futureMetadata name="XLRICHVALUE" count="1"><bk><extLst><ext uri="{3e2802c4-a4d2-4d8b-9148-e3be6c30e623}"><xlrd:rvb i="0"/></ext></extLst></bk></futureMetadata><valueMetadata count="1"><bk><rc t="1" v="0"/></bk></valueMetadata></metadata>`);
  zip.file('xl/richData/rdrichvalue.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<rvData xmlns="http://schemas.microsoft.com/office/spreadsheetml/2017/richdata" count="1"><rv s="0"><v>0</v><v>5</v></rv></rvData>`);
  zip.file('xl/richData/rdrichvaluestructure.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<rvStructures xmlns="http://schemas.microsoft.com/office/spreadsheetml/2017/richdata" count="1"><s t="_localImage"><k n="_rvRel:LocalImageIdentifier" t="i"/><k n="CalcOrigin" t="i"/></s></rvStructures>`);
  zip.file('xl/richData/richValueRel.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<richValueRels xmlns="http://schemas.microsoft.com/office/spreadsheetml/2022/richvaluerel" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><rel r:id="rId1"/></richValueRels>`);
  zip.file('xl/richData/_rels/richValueRel.xml.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/incell1.png"/></Relationships>`);
  let ct = await zip.file('[Content_Types].xml').async('string');
  if (!ct.includes('Extension="png"')) ct = ct.replace('<Default ', '<Default Extension="png" ContentType="image/png"/><Default ');
  ct = ct.replace('</Types>', '<Override PartName="/xl/metadata.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheetMetadata+xml"/><Override PartName="/xl/richData/rdrichvalue.xml" ContentType="application/vnd.ms-excel.rdrichvalue+xml"/><Override PartName="/xl/richData/rdrichvaluestructure.xml" ContentType="application/vnd.ms-excel.rdrichvaluestructure+xml"/><Override PartName="/xl/richData/richValueRel.xml" ContentType="application/vnd.ms-excel.richvaluerel+xml"/></Types>');
  zip.file('[Content_Types].xml', ct);
  let wbRels = await zip.file('xl/_rels/workbook.xml.rels').async('string');
  wbRels = wbRels.replace('</Relationships>', '<Relationship Id="rIdMeta1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/sheetMetadata" Target="metadata.xml"/><Relationship Id="rIdRv1" Type="http://schemas.microsoft.com/office/2022/10/relationships/richValueRel" Target="richData/richValueRel.xml"/><Relationship Id="rIdRv2" Type="http://schemas.microsoft.com/office/2017/06/relationships/rdRichValue" Target="richData/rdrichvalue.xml"/><Relationship Id="rIdRv3" Type="http://schemas.microsoft.com/office/2017/06/relationships/rdRichValueStructure" Target="richData/rdrichvaluestructure.xml"/></Relationships>');
  zip.file('xl/_rels/workbook.xml.rels', wbRels);
  const sheet = 'xl/worksheets/sheet3.xml';
  let sx = await zip.file(sheet).async('string');
  const cellRe = new RegExp(`<c r="${ref}"([^>]*?)(/>|>[\\s\\S]*?</c>)`);
  const newCell = m => { const s = (m.match(/\ss="(\d+)"/) || [])[0] || ''; return `<c r="${ref}"${s} t="e" vm="1"><v>#VALUE!</v></c>`; };
  if (cellRe.test(sx)) sx = sx.replace(cellRe, m => newCell(m));
  else throw new Error(`Cell ${ref} not found in ${sheet}`);
  zip.file(sheet, sx);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

// ---------------------------------------------------------------- samples
const SAMPLES = {
  english: {
    file: 'Sample_English_G8_Term1.xlsx', fam: 'english',
    opts: { subject: 'English', grade: 8, track: 'General', term: 'Term 1', info: { Exam_Title: 'Grade 8 English – EoT1 Practice', Teacher_Name: 'Ms. Sara Ahmed', Duration_Minutes: 30, Extra_Instructions: 'Part 4 (Writing) is completed on paper.' } },
    passages: [
      { Passage_ID: 'P1', Passage_Title: 'Grammar Cloze – A Trip to Hatta', Passage_EN: 'Last winter, my family (1) _____ a weekend in Hatta. We (2) _____ kayaks on the dam and watched the sunset.\nI had never (3) _____ such clear water before. It was the best trip I (4) _____ all year.' },
      { Passage_ID: 'P2', Passage_Title: 'Reading – The Ghaf Tree', Passage_EN: 'The Ghaf tree is the national tree of the UAE. It can survive in the harsh desert because its roots grow very deep – sometimes more than 30 metres – to reach underground water.\n\nFor centuries, travellers rested in the Ghaf\'s shade, and camels and goats ate its leaves. Today, the Ghaf is a symbol of stability and peace, and planting new Ghaf trees helps protect the desert from spreading.' },
    ],
    questions: [
      { Q_Num: 1, Section_Part: 'Part 1: Vocabulary', Topic: 'Word meaning', Outcome_Code: 'EN8.V1', Outcome_Label: 'Determine word meaning from context', Question_EN: 'The museum was so ______ that we had to wait an hour to get in.', Option_A: 'crowded', Option_B: 'empty', Option_C: 'quiet', Correct_Option: 'A', Marks: 2, Feedback: 'Waiting an hour means many people were there: "crowded".', Hint: 'Why would you wait an hour?' },
      { Q_Num: 2, Section_Part: 'Part 1: Vocabulary', Topic: 'Synonyms', Outcome_Code: 'EN8.V2', Outcome_Label: 'Identify synonyms', Question_EN: 'Choose the word closest in meaning to "enormous".', Option_A: 'tiny', Option_B: 'huge', Option_C: 'ancient', Correct_Option: 'B', Marks: 2, Feedback: '"Enormous" means very big – "huge".' },
      { Q_Num: 3, Section_Part: 'Part 2: Grammar', Topic: 'Past simple', Outcome_Code: 'EN8.G1', Outcome_Label: 'Use the past simple', Passage_ID: 'P1', Question_EN: 'Choose the correct answer for gap (1).', Option_A: 'spend', Option_B: 'spent', Option_C: 'spending', Correct_Option: 'B', Marks: 2, Feedback: '"Last winter" → past simple: spent.' },
      { Q_Num: 4, Section_Part: 'Part 2: Grammar', Topic: 'Past simple', Outcome_Code: 'EN8.G1', Outcome_Label: 'Use the past simple', Passage_ID: 'P1', Question_EN: 'Choose the correct answer for gap (2).', Option_A: 'rode', Option_B: 'ride', Option_C: 'riden', Correct_Option: 'A', Marks: 2, Feedback: 'Past of "ride" is "rode".' },
      { Q_Num: 5, Section_Part: 'Part 2: Grammar', Topic: 'Present perfect / past perfect', Outcome_Code: 'EN8.G2', Outcome_Label: 'Use perfect tenses', Passage_ID: 'P1', Question_EN: 'Choose the correct answer for gap (3).', Option_A: 'see', Option_B: 'saw', Option_C: 'seen', Correct_Option: 'C', Marks: 2, Feedback: '"had never" + past participle: seen.' },
      { Q_Num: 6, Section_Part: 'Part 2: Grammar', Topic: 'Present perfect / past perfect', Outcome_Code: 'EN8.G2', Outcome_Label: 'Use perfect tenses', Passage_ID: 'P1', Question_EN: 'Choose the correct answer for gap (4).', Option_A: 'have had', Option_B: 'had had', Option_C: 'has', Correct_Option: 'B', Marks: 2, Feedback: 'Narrative in the past → past perfect "had had".' },
      { Q_Num: 7, Section_Part: 'Part 3A: Reading', Topic: 'Main idea', Outcome_Code: 'EN8.R1', Outcome_Label: 'Identify the main idea', Passage_ID: 'P2', Question_EN: 'What is the main idea of the text?', Option_A: 'How to plant trees in the city', Option_B: 'Why the Ghaf tree is important in the UAE', Option_C: 'The history of camels', Option_D: 'Where to find underground water', Correct_Option: 'B', Marks: 3, Feedback: 'Both paragraphs explain the Ghaf\'s survival and importance.' },
      { Q_Num: 8, Section_Part: 'Part 3A: Reading', Topic: 'Detail', Outcome_Code: 'EN8.R2', Outcome_Label: 'Locate specific information', Passage_ID: 'P2', Question_EN: 'How does the Ghaf tree survive in the desert?', Option_A: 'It stores water in its leaves.', Option_B: 'Its roots reach deep underground water.', Option_C: 'People water it every day.', Option_D: 'It only grows near the sea.', Correct_Option: 'B', Marks: 3, Feedback: '"its roots grow very deep … to reach underground water".' },
      { Q_Num: 9, Section_Part: 'Part 3B: Reading', Topic: 'Inference', Outcome_Code: 'EN8.R3', Outcome_Label: 'Make inferences', Passage_ID: 'P2', Question_EN: 'Planting Ghaf trees "helps protect the desert from spreading". This suggests that Ghaf trees …', Option_A: 'hold the soil and sand in place', Option_B: 'make the desert hotter', Option_C: 'attract more camels', Correct_Option: 'A', Marks: 3, Feedback: 'Deep roots keep sand from moving, slowing desertification.' },
    ],
  },
  math: {
    file: 'Sample_Math_G9Adv_Term1_with_Image.xlsx', fam: 'stem',
    opts: { subject: 'Mathematics', grade: 9, track: 'Advanced', term: 'Term 1', info: { Exam_Title: 'Grade 9 Advanced Math – Linear Functions', Teacher_Name: 'Mr. Omar Khalid', Duration_Minutes: 40, Calculator_Allowed: 'Yes' } },
    passages: [{ Passage_ID: 'P1', Passage_Title: 'Taxi Fares', Passage_EN: 'A taxi charges a fixed fee of \\$12 plus \\$1.75 per kilometre. Let $C$ be the cost and $d$ the distance in km.', Passage_AR: 'تتقاضى سيارة أجرة رسمًا ثابتًا قدره 12 درهمًا بالإضافة إلى 1.75 درهم لكل كيلومتر. لتكن $C$ التكلفة و $d$ المسافة بالكيلومتر.' }],
    questions: [
      { Q_Num: 1, Section_Part: 'Part 1: Functions', Topic: 'Slope', Outcome_Code: 'M9.F1', Outcome_Label: 'Find slope from a graph', Question_EN: 'What is the slope of the line shown in the graph?', Question_AR: 'ما ميل المستقيم الموضح في التمثيل البياني؟', Option_A: '$2$', Option_B: '$\\frac{1}{2}$', Option_C: '$-2$', Option_D: '$6$', Correct_Option: 'A', Marks: 3, Feedback: '$m=\\frac{\\Delta y}{\\Delta x}=\\frac{6-0}{3-0}=2$', Hint: 'Use two points on the line.', __image: 'graph' },
      { Q_Num: 2, Section_Part: 'Part 1: Functions', Topic: 'Modelling', Outcome_Code: 'M9.F2', Outcome_Label: 'Write linear models', Passage_ID: 'P1', Question_EN: 'Which equation models the cost?', Question_AR: 'أي معادلة تمثّل التكلفة؟', Option_A: '$C=12d+1.75$', Option_B: '$C=1.75d+12$', Option_C: '$C=13.75d$', Option_D: '$C=12-1.75d$', Correct_Option: 'B', Marks: 3, Feedback: 'Rate × distance + fixed fee: $C=1.75d+12$.' },
      { Q_Num: 3, Section_Part: 'Part 1: Functions', Topic: 'Modelling', Outcome_Code: 'M9.F2', Outcome_Label: 'Write linear models', Passage_ID: 'P1', Question_EN: 'What is the cost of a $20$ km trip?', Question_AR: 'ما تكلفة رحلة طولها $20$ كم؟', Option_A: '\\$35', Option_B: '\\$47', Option_C: '\\$252', Option_D: '\\$32', Correct_Option: 'B', Marks: 4, Feedback: '$C=1.75(20)+12=35+12=47$' },
      { Q_Num: 4, Section_Part: 'Part 2: Equations', Topic: 'Quadratics', Outcome_Code: 'M9.E1', Outcome_Label: 'Solve quadratic equations', Question_EN: 'Solve $x^2-5x+6=0$.', Question_AR: 'حل المعادلة $x^2-5x+6=0$.', Option_A: '$x=2$ or $x=3$', Option_B: '$x=-2$ or $x=-3$', Option_C: '$x=1$ or $x=6$', Correct_Option: 'A', Marks: 2, Feedback: '$(x-2)(x-3)=0$' },
      { Q_Num: 5, Section_Part: 'Part 2: Equations', Topic: 'Radicals', Outcome_Code: 'M9.E2', Outcome_Label: 'Simplify radicals', Question_EN: 'Simplify $\\sqrt{72}$.', Question_AR: 'بسّط $\\sqrt{72}$.', Option_A: '$6\\sqrt{2}$', Option_B: '$8\\sqrt{3}$', Option_C: '$2\\sqrt{6}$', Option_D: '$36\\sqrt{2}$', Correct_Option: 'A', Marks: 2, Feedback: '$\\sqrt{72}=\\sqrt{36\\cdot2}=6\\sqrt{2}$' },
      { Q_Num: 6, Section_Part: 'Part 2: Equations', Topic: 'Graphs', Outcome_Code: 'M9.F3', Outcome_Label: 'Match an equation to its graph', Question_EN: 'Which graph shows $y=-x+2$?', Question_AR: 'أي تمثيل بياني يمثل $y=-x+2$؟', Correct_Option: 'C', Marks: 2, Feedback: 'Slope $-1$ (falls to the right) and $y$-intercept $2$.', __optImages: [[1, 2], [-1, -2], [-1, 2], [2, 0]] },
    ],
  },
  science: {
    file: 'Sample_Science_G7_Term1_InCellImage.xlsx', fam: 'stem',
    opts: { subject: 'Science', grade: 7, track: 'General', term: 'Term 1', info: { Exam_Title: 'Grade 7 Science – Cells', Teacher_Name: 'Ms. Huda Salem', Duration_Minutes: 20 } },
    passages: [],
    questions: [
      { Q_Num: 1, Section_Part: 'Part 1: Cells', Topic: 'Plant cells', Outcome_Code: 'S7.C1', Outcome_Label: 'Identify cell organelles', Question_EN: 'The green oval structures in this plant cell are …', Question_AR: 'التراكيب البيضاوية الخضراء في هذه الخلية النباتية هي …', Option_A: 'chloroplasts', Option_B: 'nuclei', Option_C: 'vacuoles', Option_D: 'ribosomes', Correct_Option: 'A', Marks: 2, Feedback: 'Chloroplasts are green and carry out photosynthesis.', __image: 'incell' },
      { Q_Num: 2, Section_Part: 'Part 1: Cells', Topic: 'Plant cells', Outcome_Code: 'S7.C2', Outcome_Label: 'Compare plant and animal cells', Question_EN: 'Which structure is found in plant cells but NOT in animal cells?', Question_AR: 'أي تركيب يوجد في الخلية النباتية ولا يوجد في الخلية الحيوانية؟', Option_A: 'Cell membrane', Option_B: 'Cell wall', Option_C: 'Nucleus', Option_D: 'Mitochondria', Correct_Option: 'B', Marks: 2, Feedback: 'Only plant cells have a rigid cellulose cell wall.' },
      { Q_Num: 3, Section_Part: 'Part 2: Energy', Topic: 'Photosynthesis', Outcome_Code: 'S7.E1', Outcome_Label: 'Describe photosynthesis', Question_EN: 'Photosynthesis produces glucose and …', Question_AR: 'ينتج عن البناء الضوئي الجلوكوز و …', Option_A: '$CO_2$', Option_B: '$O_2$', Option_C: '$N_2$', Option_D: '$H_2$', Correct_Option: 'B', Marks: 2, Feedback: '$6CO_2+6H_2O \\rightarrow C_6H_{12}O_6+6O_2$' },
    ],
  },
  islamic: {
    file: 'Sample_Islamic_G6_Term1_RTL.xlsx', fam: 'arabic',
    opts: { subject: 'Islamic Education', grade: 6, track: 'General', term: 'Term 1', info: { Exam_Title: 'التربية الإسلامية – الصف السادس – تدريب الفصل الأول', Teacher_Name: 'أ. عبدالله الكعبي', Duration_Minutes: 25 } },
    passages: [{ Passage_ID: 'P1', Passage_Title: 'سورة العصر', Passage_AR: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ\nوَالْعَصْرِ ﴿١﴾ إِنَّ الْإِنسَانَ لَفِي خُسْرٍ ﴿٢﴾ إِلَّا الَّذِينَ آمَنُوا وَعَمِلُوا الصَّالِحَاتِ وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ ﴿٣﴾' }],
    questions: [
      { Q_Num: 1, Section_Part: 'الجزء الأول: القرآن الكريم', Topic: 'سورة العصر', Outcome_Code: 'IS6.Q1', Outcome_Label: 'يحدد مقاصد السورة', Passage_ID: 'P1', Question_AR: 'أَقْسَمَ اللَّهُ تَعَالَى فِي السُّورَةِ بِـ:', Option_A: 'الْعَصْرِ', Option_B: 'الْفَجْرِ', Option_C: 'الضُّحَى', Option_D: 'اللَّيْلِ', Correct_Option: 'A', Marks: 2, Feedback: 'قَالَ تَعَالَى: ﴿وَالْعَصْرِ﴾ وَهُوَ الزَّمَنُ.', Hint: 'انظر إلى الآية الأولى.' },
      { Q_Num: 2, Section_Part: 'الجزء الأول: القرآن الكريم', Topic: 'سورة العصر', Outcome_Code: 'IS6.Q2', Outcome_Label: 'يستنتج شروط النجاة', Passage_ID: 'P1', Question_AR: 'مِنْ شُرُوطِ النَّجَاةِ مِنَ الْخُسْرَانِ كَمَا وَرَدَ فِي السُّورَةِ:', Option_A: 'جَمْعُ الْمَالِ', Option_B: 'التَّوَاصِي بِالْحَقِّ وَالصَّبْرِ', Option_C: 'كَثْرَةُ النَّوْمِ', Correct_Option: 'B', Marks: 3, Feedback: '﴿وَتَوَاصَوْا بِالْحَقِّ وَتَوَاصَوْا بِالصَّبْرِ﴾' },
      { Q_Num: 3, Section_Part: 'الجزء الثاني: الحديث الشريف', Topic: 'الأخلاق', Outcome_Code: 'IS6.H1', Outcome_Label: 'يوضح معنى الحديث', Question_AR: 'قَالَ رَسُولُ اللَّهِ ﷺ: «الْكَلِمَةُ الطَّيِّبَةُ صَدَقَةٌ». يَدُلُّ الْحَدِيثُ عَلَى:', Option_A: 'فَضْلِ الْكَلَامِ الْحَسَنِ', Option_B: 'وُجُوبِ الصَّمْتِ', Option_C: 'كَثْرَةِ الْكَلَامِ', Option_D: 'تَرْكِ الصَّدَقَةِ', Correct_Option: 'A', Marks: 2, Feedback: 'الْكَلِمَةُ الطَّيِّبَةُ يُؤْجَرُ عَلَيْهَا الْمُسْلِمُ كَالصَّدَقَةِ.' },
    ],
  },
};

(async () => {
  // Templates
  const tDir = out('templates'), pubT = out('public/templates');
  for (const fam of Object.keys(FAMILIES)) {
    const wb = await buildTemplate(fam, { term: 'Term 1' });
    const buf = Buffer.from(await wb.xlsx.writeBuffer());
    fs.writeFileSync(path.join(tDir, FAMILIES[fam].file), buf);
    fs.writeFileSync(path.join(pubT, FAMILIES[fam].file), buf);
    console.log('Template  ', FAMILIES[fam].file);
  }
  // Samples
  const sDir = out('samples'), pubS = out('public/samples');
  for (const [key, s] of Object.entries(SAMPLES)) {
    const wb = await fillWorkbook(s.fam, s.opts, s.passages, s.questions);
    const qs = wb.getWorksheet('Questions');
    const imgCol = FAMILIES[s.fam].questionCols.indexOf('Image');
    let inCellRef = null;
    s.questions.forEach((q, i) => {
      if (q.__image === 'graph') {
        const id = wb.addImage({ buffer: graphPng(), extension: 'png' });
        qs.addImage(id, { tl: { col: imgCol + 0.05, row: i + 1 + 0.05 }, ext: { width: 220, height: 183 } });
        qs.getRow(i + 2).height = 145;
      }
      if (q.__image === 'incell') { inCellRef = String.fromCharCode(65 + imgCol) + (i + 2); qs.getCell(inCellRef).value = 'x'; }
      if (q.__optImages) {   // one picture per answer, anchored in Image_A … Image_D
        q.__optImages.forEach(([m, b], k) => {
          const c = FAMILIES[s.fam].questionCols.indexOf('Image_' + 'ABCD'[k]);
          const id = wb.addImage({ buffer: lineGraphPng(m, b), extension: 'png' });
          qs.addImage(id, { tl: { col: c + 0.05, row: i + 1 + 0.05 }, ext: { width: 110, height: 110 } });
        });
        qs.getRow(i + 2).height = 90;
      }
    });
    let buf = Buffer.from(await wb.xlsx.writeBuffer());
    if (inCellRef) buf = await placeInCell(buf, inCellRef, cellPng());
    fs.writeFileSync(path.join(sDir, s.file), buf);
    fs.writeFileSync(path.join(pubS, s.file), buf);
    const r = await parseExamWorkbook(buf);
    const imgs = Object.entries(r.images).map(([k, v]) => `${k}:${v.source}:${v.buffer.length}B`).join(', ');
    console.log(`Sample     ${s.file}\n   ok=${r.ok} q=${r.stats.questions} marks=${r.stats.totalMarks} passages=${r.stats.passages} images=[${imgs}] lang=${r.config.defaultLanguage} options=${r.questions.map(q => q.options.length).join('')} errors=${r.errors.length} warnings=${r.warnings.length}`);
    r.errors.concat(r.warnings).forEach(e => console.log('   -', e.sheet, e.row, e.message));
  }
  // Template sanity: parsing the example rows of each template must be error-free
  for (const fam of Object.keys(FAMILIES)) {
    const r = await parseExamWorkbook(fs.readFileSync(path.join(tDir, FAMILIES[fam].file)));
    console.log(`Parse check ${FAMILIES[fam].file}: ok=${r.ok} q=${r.stats.questions} errors=${r.errors.map(e => e.message).join('; ')}`);
  }
})().catch(e => { console.error(e); process.exit(1); });
