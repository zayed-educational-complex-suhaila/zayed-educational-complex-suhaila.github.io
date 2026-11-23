// Subject-tailored AI prompts (English / STEM / Arabic & Humanities) × (EN / AR instructions).
// Written for Claude (which can read and create Excel files): the teacher attaches the downloaded template + the exam
// material, and Claude returns the COMPLETED .xlsx ready to upload in Step 2.
// getPrompt(family, lang, { subject, grade, track, term, teacher, blueprint, templateFile }) -> string
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.AIPrompts = factory();
})(typeof self !== 'undefined' ? self : this, function () {
'use strict';
const HEAD = {
  english: ['Q_Num', 'Section_Part', 'Topic', 'Outcome_Code', 'Outcome_Label', 'Passage_ID', 'Question_EN', 'Image', 'Option_A', 'Option_B', 'Option_C', 'Option_D', 'Image_A', 'Image_B', 'Image_C', 'Image_D', 'Correct_Option', 'Marks', 'Feedback', 'Hint'],
  stem: ['Q_Num', 'Section_Part', 'Topic', 'Outcome_Code', 'Outcome_Label', 'Passage_ID', 'Question_EN', 'Question_AR', 'Image', 'Option_A', 'Option_B', 'Option_C', 'Option_D', 'Image_A', 'Image_B', 'Image_C', 'Image_D', 'Correct_Option', 'Marks', 'Feedback', 'Hint'],
  arabic: ['Q_Num', 'Section_Part', 'Topic', 'Outcome_Code', 'Outcome_Label', 'Passage_ID', 'Question_AR', 'Image', 'Option_A', 'Option_B', 'Option_C', 'Option_D', 'Image_A', 'Image_B', 'Image_C', 'Image_D', 'Correct_Option', 'Marks', 'Feedback', 'Hint'],
};
const PHEAD = { english: ['Passage_ID', 'Passage_Title', 'Passage_EN'], stem: ['Passage_ID', 'Passage_Title', 'Passage_EN', 'Passage_AR'], arabic: ['Passage_ID', 'Passage_Title', 'Passage_AR'] };
const TEMPLATE = { english: 'English_Exam_Template', stem: 'STEM_Exam_Template', arabic: 'Arabic_Exam_Template' };
const DEFAULT_LANG = { english: 'en', stem: 'en', arabic: 'ar' };

function ctx(fam, o) {
  const b = o.blueprint || null;
  const calc = b ? (b.calculator ? 'Yes' : 'No') : (fam === 'stem' ? 'Yes or No (as in the original exam)' : 'No');
  return {
    subject: o.subject || '[SUBJECT]', grade: o.grade || '[GRADE 5–12]', track: o.track || 'General', term: o.term || 'Term 1',
    teacher: o.teacher || '[TEACHER NAME]', b, calc, duration: b ? b.duration : 60,
    file: o.templateFile || `${TEMPLATE[fam]}.xlsx`,
    out: `${String(o.subject || 'Exam').replace(/\s+/g, '')}_G${o.grade || 'X'}_${String(o.term || 'Term 1').replace(/\s+/g, '')}_Exam.xlsx`,
  };
}
const list = a => a.join(' | ');

// ======================================================================= ENGLISH-LANGUAGE INSTRUCTIONS
function en(fam, o) {
  const c = ctx(fam, o), b = c.b;
  const parts = b && b.parts && b.parts.length > 1 ? b.parts.map(p => `   - ${p.label}: ${p.count} questions${p.marks ? ` × ${p.marks} marks` : ''}${p.options ? `, ${p.options} options each` : ''}`).join('\n') : '';
  const target = b && b.questions ? `• Exactly ${b.questions} multiple-choice questions${b.marks ? `, ${b.marks} marks in total` : ''} (marks per question: ${b.marksEach}).${parts ? '\n' + parts : ''}
• The paper part is NOT included (${b.paper}).` : '• All multiple-choice questions from the material.';

  const base = `You are an expert assessment writer for the UAE Ministry of Education curriculum, working for Zayed Educational Complex – Suhaila.

YOUR TASK
I have attached:
  1) the Excel template "${c.file}" (downloaded from our exam platform), and
  2) the exam material (exam paper, worksheet, textbook pages or my notes).
Turn the material into an electronic multiple-choice practice exam by FILLING IN THE ATTACHED EXCEL TEMPLATE, then give me the completed file to download, named "${c.out}".
Do not just print tables in the chat — I need the actual .xlsx file. I will upload it directly to the platform.

EXAM DETAILS
• Subject: ${c.subject} · Grade: ${c.grade} · Track: ${c.track} · ${c.term}, Academic Year 2026–2027 · Teacher: ${c.teacher}
${target}

HOW TO FILL THE WORKBOOK (it has 4 sheets — keep their names exactly)
1. Keep every sheet name, the header row (row 1), the column order and the existing formatting/drop-down lists. Do not add, delete, rename or reorder sheets or columns.
2. Remove the yellow example rows in "Passages" and "Questions" and write your data starting on row 2, overwriting them, with no blank rows in between.
   The sheets contain pre-formatted empty rows: write INTO rows 2, 3, 4 … — do not append below the last formatted row.
3. Sheet "Exam_Info" — fill ONLY column B (Value) of each existing row:
   Exam_Title = a clear title (e.g. "${c.subject} – Grade ${c.grade} – ${c.term} Practice") · Subject = ${c.subject} · Grade = ${c.grade} · Track = ${c.track} · Term = ${c.term}
   Teacher_Name = ${c.teacher} · Exam_Code = A · Duration_Minutes = ${c.duration} · Passing_Percent = 50 · Calculator_Allowed = ${c.calc}
   Allow_Backtrack = Yes · Shuffle_Questions = ${fam === 'english' ? 'No' : 'No'} · Shuffle_Options = Yes · Require_Seen_All = Yes · Show_Review_After_Submit = Yes
   Default_Language = ${DEFAULT_LANG[fam]} · Extra_Instructions = short instructions for students, or leave empty.
4. Sheet "Passages" — columns: ${list(PHEAD[fam])}
   One row per shared text (a reading text, cloze paragraph, scenario, data table described in words, poem…). Passage_ID = P1, P2, P3 …
5. Sheet "Questions" — columns: ${list(HEAD[fam])}
   One row per question, in the order they should appear:
   • Q_Num: 1, 2, 3 … (whole numbers).
   • Section_Part: the part/section label (rules below). Topic: unit or lesson name. Outcome_Code + Outcome_Label: the learning outcome (code and short description; take them from the material when shown).
   • Passage_ID: the ID of the shared text this question uses (must exist in "Passages"), otherwise leave empty.
   • Options: fill Option_A, Option_B, then C and D in order — never leave a gap. Plausible distractors based on common mistakes; no "all/none of the above".
   • Correct_Option: ONE capital letter A, B, C or D that points to a filled option. Spread the correct answers across the letters.
   • Marks: a number (not text). Use the marks of the original paper; otherwise follow the exam details above.
   • Feedback: a short worked solution / explanation of the correct answer. Hint: one short clue (optional).
   • Cells contain plain text only — no formulas (never start a cell with "="), no merged cells.
6. Pictures: if a question needs a graph, diagram, map or picture and you can extract or recreate it from the material, insert it as a picture whose top-left corner sits inside the "Image" cell of that question's row. If you cannot, leave "Image" empty and list that question in your final message. If the ANSWERS themselves are pictures (e.g. "Which graph shows …?"), insert one picture per answer with its top-left corner inside that answer's cell: Image_A, Image_B, Image_C, Image_D (same row). Leave Option_X text empty for a picture-only answer, or add a short label. Correct_Option still uses A–D.
7. Only questions that can be answered electronically as multiple choice. Skip essays, writing tasks and free-response questions.

BEFORE YOU SEND THE FILE, CHECK
• The number of questions and the total marks match the exam details.
• Every Correct_Option points to a filled option; options are filled in order A→D with no gaps.
• Every Passage_ID used in "Questions" exists in "Passages"; no leftover example rows; Marks are numbers.
`;
  const finish = `
YOUR REPLY
Attach the completed "${c.out}". In the message write only: number of questions, total marks, the parts (Section_Part with counts), the questions that still need a picture (Q_Num + what to insert), and anything from the material you skipped.`;

  if (fam === 'english') return base + `
ENGLISH RULES
A. Section_Part must be exactly one of: "Part 1: Vocabulary", "Part 2: Grammar", "Part 3A: Reading", "Part 3B: Reading" — keep this order (Shuffle_Questions = No).
B. Most questions have 3 options: fill Option_A–C and leave Option_D EMPTY.${b && b.parts && b.parts[0] && b.parts[0].options === 2 ? ' Part 1 (Vocabulary) questions in this grade have only 2 options (A and B) — leave C and D empty.' : ''}
C. Grammar cloze: write the paragraph ONCE in "Passages" (e.g. P1) with numbered gaps written "(1) _____", "(2) _____" … then one question per gap: Question_EN = "Choose the correct answer for gap (1)." with Passage_ID = P1.
D. Reading: write each reading text ONCE in "Passages" (P2, P3 …), keep the paragraphs (separate them with a blank line inside the cell), and link all its questions with the same Passage_ID.
E. The Writing section is done on paper (or as a separate task) — do not include it.
` + finish;
  if (fam === 'stem') return base + `
MATH & SCIENCE RULES
A. Fill BOTH Question_EN and Question_AR (accurate Modern Standard Arabic using UAE MoE terminology). Options may stay in English/symbols.
B. Write EVERY mathematical or scientific expression in KaTeX between dollar signs: inline $...$, display $$...$$ — e.g. $\\frac{3}{4}$, $x^2-5x+6=0$, $\\sqrt{72}$, $3.0\\times10^{8}\\ \\text{m/s}$, $H_2O$, $\\Delta v$. This applies to options, feedback and passages too.
C. Money: write \\$4.50 (backslash before the dollar sign) so it is not read as maths.
D. Section_Part groups questions by unit or lesson, e.g. "Part 1: Functions", "Part 2: Equations".
E. Shared data (a scenario, experiment, or a table written out in words) goes in "Passages" with Passage_EN and Passage_AR.
F. Graphs, diagrams and tables that must be seen as pictures: follow step 6 (insert the picture in the "Image" cell, or list the row).
` + finish;
  return base + `
ARABIC / ISLAMIC EDUCATION / SOCIAL STUDIES RULES
A. Write every question, option, feedback and hint in Arabic (Question_AR). Keep the English sheet names and column headers exactly as they are.
B. Keep FULL Tashkeel (diacritics) accurately. Copy Quran verses exactly from the Uthmani Mushaf between ﴿ ﴾ with the verse number, and Hadith between « » with the narrator. Never paraphrase a verse.
C. Reading texts, poems, Quran passages, Hadith and informational texts used by several questions go ONCE in "Passages" (Passage_AR) with P1, P2 … and are linked by Passage_ID.
D. Section_Part in Arabic, e.g. "الجزء الأول: الفهم والاستيعاب", "النص السردي", "النص المعلوماتي".
E. Questions may have 3 or 4 options (leave Option_D empty for 3). Correct_Option stays a Latin letter A–D.
F. Maps, pictures and charts: follow step 6.
` + finish;
}

// ======================================================================= ARABIC-LANGUAGE INSTRUCTIONS
function ar(fam, o) {
  const c = ctx(fam, o), b = c.b;
  const calcAr = c.calc === 'Yes' ? 'Yes' : c.calc === 'No' ? 'No' : 'Yes أو No (حسب الاختبار الأصلي)';
  const parts = b && b.parts && b.parts.length > 1 ? b.parts.map(p => `   - ${p.label}: ${p.count} سؤالاً${p.marks ? ` × ${p.marks} درجة` : ''}${p.options ? `، ${p.options} خيارات لكل سؤال` : ''}`).join('\n') : '';
  const target = b && b.questions ? `• ${b.questions} سؤالاً بالضبط من نوع الاختيار من متعدد${b.marks ? `، مجموعها ${b.marks} درجة` : ''} (درجة السؤال: ${b.marksEach}).${parts ? '\n' + parts : ''}
• لا يُدرج الجزء الورقي.` : '• جميع أسئلة الاختيار من متعدد الموجودة في المادة.';

  const base = `أنت خبير في إعداد الاختبارات وفق مناهج وزارة التربية والتعليم في دولة الإمارات، وتعمل لصالح مجمع زايد التعليمي - سهيلة.

المهمة
أرفقتُ لك:
  1) ملف Excel النموذجي "${c.file}" (المحمَّل من منصة الاختبارات)،
  2) مادة الاختبار (ورقة اختبار أو ورقة عمل أو صفحات من الكتاب أو ملاحظاتي).
حوّل المادة إلى اختبار تدريبي إلكتروني من نوع الاختيار من متعدد عن طريق تعبئة ملف Excel المرفق نفسه، ثم أعطني الملف المكتمل للتحميل باسم "${c.out}".
لا تكتفِ بعرض جداول في المحادثة — أحتاج ملف ‎.xlsx الفعلي لأرفعه مباشرة إلى المنصة.

بيانات الاختبار
• المادة: ${c.subject} · الصف: ${c.grade} · المسار: ${c.track} · ${c.term} – العام الدراسي 2026–2027 · المعلم: ${c.teacher}
${target}

طريقة تعبئة الملف (يحتوي على 4 أوراق — لا تغيّر أسماءها)
1. حافظ على أسماء الأوراق وصف العناوين (الصف 1) وترتيب الأعمدة والتنسيق والقوائم المنسدلة كما هي، ولا تضف أو تحذف أو تُعِد تسمية أي ورقة أو عمود.
2. احذف الصفوف الصفراء (الأمثلة) من ورقتي "Passages" و"Questions" واكتب بياناتك بدءاً من الصف 2 فوقها مباشرة دون صفوف فارغة بينها.
   تحتوي الأوراق على صفوف فارغة منسّقة مسبقاً: اكتب داخل الصفوف 2، 3، 4 … ولا تُضِف البيانات أسفل آخر صف منسّق.
3. ورقة "Exam_Info" — املأ العمود B (Value) فقط لكل صف موجود:
   Exam_Title = عنوان واضح · Subject = ${c.subject} · Grade = ${c.grade} · Track = ${c.track} · Term = ${c.term}
   Teacher_Name = ${c.teacher} · Exam_Code = A · Duration_Minutes = ${c.duration} · Passing_Percent = 50 · Calculator_Allowed = ${calcAr}
   Allow_Backtrack = Yes · Shuffle_Questions = No · Shuffle_Options = Yes · Require_Seen_All = Yes · Show_Review_After_Submit = Yes
   Default_Language = ${DEFAULT_LANG[fam]} · Extra_Instructions = تعليمات قصيرة للطلبة أو اتركها فارغة.
4. ورقة "Passages" — الأعمدة: ${list(PHEAD[fam])}
   صف لكل نص مشترك (نص قراءة، فقرة فراغات، موقف، قصيدة، آية أو حديث…)، و Passage_ID = P1، P2، P3 …
5. ورقة "Questions" — الأعمدة: ${list(HEAD[fam])}
   صف لكل سؤال بترتيب الظهور:
   • ‏Q_Num: ‏1، 2، 3 … (أرقام صحيحة).
   • ‏Section_Part: اسم الجزء (انظر القواعد أدناه). ‏Topic: الوحدة أو الدرس. ‏Outcome_Code و Outcome_Label: رمز نتاج التعلم ووصفه المختصر (من المادة إن وُجد).
   • ‏Passage_ID: رمز النص المشترك الذي يعتمد عليه السؤال (ويجب أن يكون موجوداً في "Passages")، وإلا فاتركه فارغاً.
   • الخيارات: املأ Option_A ثم Option_B ثم C و D بالترتيب دون ترك فراغ، ببدائل منطقية مبنية على الأخطاء الشائعة، ودون "جميع ما سبق" أو "لا شيء مما سبق".
   • ‏Correct_Option: حرف لاتيني كبير واحد A أو B أو C أو D يشير إلى خيار مكتوب، مع توزيع الإجابات الصحيحة على الحروف.
   • ‏Marks: رقم (وليس نصاً)، بحسب درجات الورقة الأصلية أو بيانات الاختبار أعلاه.
   • ‏Feedback: حل مختصر أو تفسير للإجابة الصحيحة. ‏Hint: تلميح قصير (اختياري).
   • تحتوي الخلايا على نص فقط — بلا معادلات Excel (لا تبدأ أي خلية بعلامة "=") وبلا دمج خلايا.
6. الصور: إذا احتاج السؤال رسماً بيانياً أو شكلاً أو خريطة أو صورة وأمكنك استخراجها أو إعادة رسمها من المادة، فأدرجها صورةً تقع زاويتها العلوية اليسرى داخل خلية "Image" في صف السؤال. وإن لم تستطع فاترك الخلية فارغة واذكر السؤال في رسالتك الأخيرة. وإذا كانت الإجابات نفسها صوراً (مثل: أي تمثيل بياني يمثل …؟) فأدرج صورة لكل خيار تقع زاويتها العلوية اليسرى داخل خلية ذلك الخيار: Image_A أو Image_B أو Image_C أو Image_D (في الصف نفسه)، واترك نص Option_ فارغاً للخيار الذي هو صورة فقط أو اكتب وصفاً قصيراً، ويبقى Correct_Option بالحروف A–D.
7. أدرج فقط الأسئلة التي يمكن حلها إلكترونياً كاختيار من متعدد، واستبعد أسئلة التعبير والكتابة والإجابات المفتوحة.

قبل إرسال الملف تحقّق من:
• أن عدد الأسئلة ومجموع الدرجات يطابقان بيانات الاختبار.
• أن كل Correct_Option يشير إلى خيار مكتوب، وأن الخيارات مرتبة من A إلى D دون فراغ.
• أن كل Passage_ID مستخدم موجود في "Passages"، وعدم بقاء صفوف الأمثلة، وأن Marks أرقام.
`;
  const finish = `
ردّك
أرفق الملف المكتمل "${c.out}"، واكتب في الرسالة فقط: عدد الأسئلة، ومجموع الدرجات، والأجزاء (Section_Part مع عدد أسئلة كل جزء)، والأسئلة التي ما زالت تحتاج صورة (Q_Num مع وصف الصورة)، وأي جزء من المادة لم تُدرجه.`;

  if (fam === 'english') return base + `
قواعد اللغة الإنجليزية (تُكتب الأسئلة بالإنجليزية في عمود Question_EN)
أ. ‏Section_Part يكون واحداً من: "Part 1: Vocabulary" أو "Part 2: Grammar" أو "Part 3A: Reading" أو "Part 3B: Reading" بهذا الترتيب.
ب. معظم الأسئلة لها 3 خيارات: املأ Option_A إلى Option_C واترك Option_D فارغاً.${b && b.parts && b.parts[0] && b.parts[0].options === 2 ? ' أسئلة الجزء الأول (Vocabulary) في هذا الصف لها خياران فقط (A و B).' : ''}
ج. نص الفراغات: اكتب الفقرة مرة واحدة في "Passages" (مثل P1) مع فراغات مرقّمة "(1) _____"، ثم سؤالاً لكل فراغ: "Choose the correct answer for gap (1)." مع Passage_ID = P1.
د. نصوص القراءة: اكتب كل نص مرة واحدة في "Passages" (P2، P3 …) مع الحفاظ على الفقرات (سطر فارغ بين الفقرات داخل الخلية)، واربط أسئلته بالرمز نفسه.
هـ. قسم الكتابة (Writing) لا يُدرج.
` + finish;
  if (fam === 'stem') return base + `
قواعد الرياضيات والعلوم
أ. املأ Question_EN و Question_AR معاً (بالعربية الفصحى وبمصطلحات الوزارة)، ويمكن أن تبقى الخيارات بالإنجليزية أو بالرموز.
ب. اكتب كل تعبير رياضي أو علمي بصيغة KaTeX بين علامتي الدولار: ‏$...$ داخل السطر و $$...$$ في سطر مستقل، مثل $\\frac{3}{4}$ و $x^2-5x+6=0$ و $H_2O$، ويشمل ذلك الخيارات والتغذية الراجعة والنصوص.
ج. للعملة اكتب \\$4.50 (شرطة مائلة قبل علامة الدولار).
د. ‏Section_Part لتجميع الأسئلة حسب الوحدة أو الدرس مثل "Part 1: Functions".
هـ. البيانات المشتركة (موقف أو تجربة أو جدول مكتوب بالكلمات) توضع في "Passages" بالعمودين Passage_EN و Passage_AR.
و. الرسوم والأشكال والجداول التي يجب أن تظهر كصور: اتبع الخطوة 6.
` + finish;
  return base + `
قواعد اللغة العربية والتربية الإسلامية والدراسات الاجتماعية
أ. اكتب جميع الأسئلة والخيارات والتغذية الراجعة والتلميحات بالعربية في عمود Question_AR، مع إبقاء أسماء الأوراق والأعمدة بالإنجليزية.
ب. حافظ على التشكيل الكامل بدقة، وانسخ الآيات من المصحف العثماني بين ﴿ ﴾ مع رقم الآية، والأحاديث بين « » مع ذكر الراوي، ولا تُعِد صياغة الآيات.
ج. النصوص والقصائد والآيات والأحاديث والنصوص المعلوماتية المشتركة تُكتب مرة واحدة في "Passages" (Passage_AR) برمز P1، P2 … وتُربط بها الأسئلة.
د. ‏Section_Part بالعربية مثل "الجزء الأول: الفهم والاستيعاب" أو "النص السردي" أو "النص المعلوماتي".
هـ. يمكن أن يكون للسؤال 3 أو 4 خيارات (اترك Option_D فارغاً عند 3 خيارات)، ويبقى Correct_Option حرفاً لاتينياً A–D.
و. الخرائط والصور والرسوم: اتبع الخطوة 6.
` + finish;
}

const getPrompt = (family, lang, opts = {}) => (lang === 'ar' ? ar : en)(family, opts);
const outputName = (family, opts = {}) => ctx(family, opts).out;
return { getPrompt, outputName };
});
