// Subject-tailored Excel template builder (3 families, one unified parser: lib/exam-parser.js).
// Pure Node + exceljs — call it from any backend to stream a template with the active term pre-filled:
//   const { buildTemplate, familyForSubject } = require('./lib/excel-templates');
//   const wb = await buildTemplate(familyForSubject('Physics'), { term: 'Term 2', grade: 10, track: 'Advanced', subject: 'Physics' });
//   await wb.xlsx.write(res);
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('exceljs'));
  else root.ExamTemplates = factory(root.ExcelJS);
})(typeof self !== 'undefined' ? self : this, function (ExcelJS) {
'use strict';

const SUBJECTS = ['Mathematics', 'Science', 'English', 'Arabic', 'Islamic Education', 'Social Studies',
  'Physics', 'Chemistry', 'Biology', 'Computer Science', 'Other'];
const SUBJECT_AR = {
  'Mathematics': 'الرياضيات', 'Science': 'العلوم', 'English': 'اللغة الإنجليزية', 'Arabic': 'اللغة العربية',
  'Islamic Education': 'التربية الإسلامية', 'Social Studies': 'الدراسات الاجتماعية', 'Physics': 'الفيزياء',
  'Chemistry': 'الكيمياء', 'Biology': 'الأحياء', 'Computer Science': 'علوم الحاسوب', 'Other': 'أخرى',
};
const FAMILY_BY_SUBJECT = {
  'English': 'english',
  'Mathematics': 'stem', 'Science': 'stem', 'Physics': 'stem', 'Chemistry': 'stem', 'Biology': 'stem', 'Computer Science': 'stem', 'Other': 'stem',
  'Arabic': 'arabic', 'Islamic Education': 'arabic', 'Social Studies': 'arabic',
};
const familyForSubject = s => FAMILY_BY_SUBJECT[s] || 'stem';

const FAMILIES = {
  english: {
    file: 'English_Exam_Template.xlsx', label: 'English',
    defaults: { Subject: 'English', Default_Language: 'en', Calculator_Allowed: 'No', Shuffle_Questions: 'No', Shuffle_Options: 'Yes' },
    passageCols: ['Passage_ID', 'Passage_Title', 'Passage_EN'],
    questionCols: ['Q_Num', 'Section_Part', 'Topic', 'Outcome_Code', 'Outcome_Label', 'Passage_ID', 'Question_EN', 'Image',
      'Option_A', 'Option_B', 'Option_C', 'Option_D', 'Image_A', 'Image_B', 'Image_C', 'Image_D', 'Correct_Option', 'Marks', 'Feedback', 'Hint'],
  },
  stem: {
    file: 'STEM_Exam_Template.xlsx', label: 'STEM (Math / Science / Physics / Chemistry / Biology / CS)',
    defaults: { Subject: 'Mathematics', Default_Language: 'en', Calculator_Allowed: 'No', Shuffle_Questions: 'No', Shuffle_Options: 'Yes' },
    passageCols: ['Passage_ID', 'Passage_Title', 'Passage_EN', 'Passage_AR'],
    questionCols: ['Q_Num', 'Section_Part', 'Topic', 'Outcome_Code', 'Outcome_Label', 'Passage_ID', 'Question_EN', 'Question_AR', 'Image',
      'Option_A', 'Option_B', 'Option_C', 'Option_D', 'Option_A_AR', 'Option_B_AR', 'Option_C_AR', 'Option_D_AR', 'Image_A', 'Image_B', 'Image_C', 'Image_D', 'Correct_Option', 'Marks', 'Feedback', 'Hint'],
  },
  arabic: {
    file: 'Arabic_Exam_Template.xlsx', label: 'Arabic & Humanities (Arabic / Islamic Education / Social Studies)',
    defaults: { Subject: 'Arabic', Default_Language: 'ar', Calculator_Allowed: 'No', Shuffle_Questions: 'No', Shuffle_Options: 'Yes' },
    passageCols: ['Passage_ID', 'Passage_Title', 'Passage_AR'],
    questionCols: ['Q_Num', 'Section_Part', 'Topic', 'Outcome_Code', 'Outcome_Label', 'Passage_ID', 'Question_AR', 'Image',
      'Option_A', 'Option_B', 'Option_C', 'Option_D', 'Image_A', 'Image_B', 'Image_C', 'Image_D', 'Correct_Option', 'Marks', 'Feedback', 'Hint'],
  },
};

// Exam_Info rows: [Field, default value, note EN, note AR]
function examInfoRows(fam, o) {
  const d = { ...FAMILIES[fam].defaults };
  if (o.subject) d.Subject = o.subject;
  if (fam === 'stem' && ['Science', 'Physics', 'Chemistry', 'Biology'].includes(d.Subject)) d.Calculator_Allowed = 'Yes';
  const bp = o.blueprint || null; // official electronic-part blueprint (Catalog.blueprint)
  if (bp) d.Calculator_Allowed = bp.calculator ? 'Yes' : 'No';
  return [
    ['Exam_Title', o.title || '', 'Title shown to students, e.g. "End of Term 1 Practice – Version A"', 'عنوان الاختبار كما يظهر للطلبة'],
    ['Subject', d.Subject, 'One of: ' + SUBJECTS.join(', '), 'المادة الدراسية'],
    ['Grade', o.grade || '', 'Number 5–12 (the portal selection takes priority)', 'رقم الصف من 5 إلى 12 (اختيار البوابة له الأولوية)'],
    ['Track', o.track || 'General', 'General / Advanced / All', 'المسار: عام / متقدم / الكل'],
    ['Term', o.term || 'Term 1', 'Term 1 / Term 2 / Term 3', 'الفصل الدراسي: Term 1 / Term 2 / Term 3'],
    ['Teacher_Name', o.teacher || '', 'Your name as it should appear', 'اسم المعلم'],
    ['Exam_Code', 'A', 'Version letter (A, B, …)', 'رمز النسخة'],
    ['Duration_Minutes', bp ? bp.duration : 60, bp ? `Official electronic part: ${bp.duration} min (0 = no time limit)` : '0 = no time limit', bp ? `مدة الجزء الإلكتروني الرسمي: ${bp.duration} دقيقة` : '0 = بدون حد زمني'],
    ['Passing_Percent', 50, 'Pass mark in %', 'نسبة النجاح المئوية'],
    ['Calculator_Allowed', d.Calculator_Allowed, 'Yes / No – shows the scientific calculator', 'السماح بالآلة الحاسبة: Yes / No'],
    ['Allow_Backtrack', 'Yes', 'Yes / No – allow going back to earlier questions', 'السماح بالرجوع للأسئلة السابقة'],
    ['Shuffle_Questions', d.Shuffle_Questions, 'Yes / No – keep "No" when Parts must stay in order', 'خلط ترتيب الأسئلة (اتركه No للحفاظ على ترتيب الأجزاء)'],
    ['Shuffle_Options', d.Shuffle_Options, 'Yes / No', 'خلط ترتيب الخيارات'],
    ['Require_Seen_All', 'Yes', 'Yes / No – student must view every question before submitting', 'يجب مشاهدة جميع الأسئلة قبل التسليم'],
    ['Show_Review_After_Submit', 'Yes', 'Yes / No – show answers & worked solutions after submitting', 'عرض الإجابات والحلول بعد التسليم'],
    ['Default_Language', d.Default_Language, 'en / ar – language the exam opens in', 'لغة العرض الافتراضية: en / ar'],
    ['Extra_Instructions', '', 'Optional. Separate several instructions with |', 'تعليمات إضافية اختيارية، افصل بينها بالرمز |'],
  ];
}

const NAVY = 'FF89191E', BLUE = 'FFA35D25', OLIVE = 'FF5C1014', LIME = 'FFE08A4F', PALE = 'FFFCF3ED', WHITE = 'FFFFFFFF';
const headStyle = cell => {
  cell.font = { bold: true, color: { argb: WHITE }, name: 'Calibri', size: 11 };
  cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } };
  cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
  cell.border = { bottom: { style: 'thin', color: { argb: LIME } } };
};
const exampleFill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF9E6' } };

const COL_WIDTH = {
  Q_Num: 7, Section_Part: 20, Topic: 22, Outcome_Code: 13, Outcome_Label: 32, Passage_ID: 11,
  Question_EN: 55, Question_AR: 55, Image: 30, Option_A: 24, Option_B: 24, Option_C: 24, Option_D: 24,
  Option_A_AR: 24, Option_B_AR: 24, Option_C_AR: 24, Option_D_AR: 24,
  Image_A: 18, Image_B: 18, Image_C: 18, Image_D: 18,
  Correct_Option: 11, Marks: 8, Feedback: 40, Hint: 30, Passage_Title: 28, Passage_EN: 90, Passage_AR: 90,
};

// Example content for the yellow example rows (teachers overwrite / delete them).
function examples(fam) {
  if (fam === 'english') return {
    passages: [
      { Passage_ID: 'P1', Passage_Title: 'Grammar Cloze – A Day at the Museum', Passage_EN: 'Last Saturday, my class (1) _____ the Louvre Abu Dhabi. We (2) _____ there by bus early in the morning.\nThe guide showed us paintings that (3) _____ hundreds of years ago.' },
      { Passage_ID: 'P2', Passage_Title: 'Reading – The Falcon', Passage_EN: 'The falcon is the national bird of the UAE. For centuries, Emirati families trained falcons to hunt in the desert.\n\nToday, falcons have their own hospitals and even travel with passports. Falconry is listed by UNESCO as part of the world\'s cultural heritage.' },
    ],
    questions: [
      { Q_Num: 1, Section_Part: 'Part 1: Vocabulary', Topic: 'Word meaning', Outcome_Code: 'EN.V.1', Outcome_Label: 'Use context to determine word meaning', Question_EN: 'Choose the word that best completes the sentence: The desert is very _____ in summer.', Option_A: 'hot', Option_B: 'wet', Option_C: 'crowded', Correct_Option: 'A', Marks: 2, Feedback: '"Hot" fits the desert climate in summer.', Hint: 'Think about the weather.' },
      { Q_Num: 2, Section_Part: 'Part 2: Grammar', Topic: 'Past simple', Outcome_Code: 'EN.G.2', Outcome_Label: 'Use the past simple correctly', Passage_ID: 'P1', Question_EN: 'Choose the correct word for gap (1).', Option_A: 'visit', Option_B: 'visited', Option_C: 'visiting', Correct_Option: 'B', Marks: 2, Feedback: '"Last Saturday" requires the past simple: visited.' },
      { Q_Num: 3, Section_Part: 'Part 2: Grammar', Topic: 'Past simple', Outcome_Code: 'EN.G.2', Outcome_Label: 'Use the past simple correctly', Passage_ID: 'P1', Question_EN: 'Choose the correct word for gap (2).', Option_A: 'go', Option_B: 'goes', Option_C: 'went', Correct_Option: 'C', Marks: 2, Feedback: 'Irregular past of "go" is "went".' },
      { Q_Num: 4, Section_Part: 'Part 3A: Reading', Topic: 'Main idea', Outcome_Code: 'EN.R.1', Outcome_Label: 'Identify the main idea of a text', Passage_ID: 'P2', Question_EN: 'What is the passage mainly about?', Option_A: 'Desert animals', Option_B: 'The falcon and its importance in the UAE', Option_C: 'How to build a hospital', Option_D: 'Travelling with passports', Correct_Option: 'B', Marks: 3, Feedback: 'Every paragraph talks about the falcon\'s role in Emirati culture.' },
    ],
  };
  if (fam === 'arabic') return {
    passages: [
      { Passage_ID: 'P1', Passage_Title: 'نص القراءة – الأمانة', Passage_AR: 'الأَمَانَةُ خُلُقٌ عَظِيمٌ، أَمَرَ اللهُ تَعَالَى بِهِ فِي قَوْلِهِ: ﴿إِنَّ اللَّهَ يَأْمُرُكُمْ أَن تُؤَدُّوا الْأَمَانَاتِ إِلَىٰ أَهْلِهَا﴾.\nوَكَانَ النَّبِيُّ ﷺ يُلَقَّبُ بِالصَّادِقِ الأَمِينِ قَبْلَ البِعْثَةِ.' },
    ],
    questions: [
      { Q_Num: 1, Section_Part: 'الجزء الأول: الفهم والاستيعاب', Topic: 'الأخلاق', Outcome_Code: 'IS.1', Outcome_Label: 'يستنتج القيم من النص', Passage_ID: 'P1', Question_AR: 'بِمَ كَانَ يُلَقَّبُ النَّبِيُّ ﷺ قَبْلَ البِعْثَةِ؟', Option_A: 'الصَّادِقُ الأَمِينُ', Option_B: 'الفَارُوقُ', Option_C: 'ذُو النُّورَيْنِ', Option_D: 'سَيْفُ اللهِ', Correct_Option: 'A', Marks: 2, Feedback: 'وَرَدَ فِي النَّصِّ أَنَّهُ ﷺ لُقِّبَ بِالصَّادِقِ الأَمِينِ.', Hint: 'ارجع إلى السطر الأخير من النص.' },
      { Q_Num: 2, Section_Part: 'الجزء الثاني: اللغة', Topic: 'الإعراب', Outcome_Code: 'AR.G.3', Outcome_Label: 'يعرب الكلمات إعرابًا صحيحًا', Question_AR: 'مَا إِعْرَابُ كَلِمَةِ (الأَمَانَةُ) فِي جُمْلَةِ: «الأَمَانَةُ خُلُقٌ عَظِيمٌ»؟', Option_A: 'خَبَرٌ مَرْفُوعٌ', Option_B: 'مُبْتَدَأٌ مَرْفُوعٌ', Option_C: 'فَاعِلٌ مَرْفُوعٌ', Correct_Option: 'B', Marks: 3, Feedback: 'الأَمَانَةُ: مُبْتَدَأٌ مَرْفُوعٌ وَعَلَامَةُ رَفْعِهِ الضَّمَّةُ.' },
    ],
  };
  return {
    passages: [
      { Passage_ID: 'P1', Passage_Title: 'Data – Water Tank', Passage_EN: 'A water tank holds $500$ L. It drains at a constant rate of $25$ L per minute.', Passage_AR: 'يحتوي خزان ماء على $500$ لتر، ويُفرَّغ بمعدل ثابت قدره $25$ لترًا في الدقيقة.' },
    ],
    questions: [
      { Q_Num: 1, Section_Part: 'Part 1: Algebra', Topic: 'Linear equations', Outcome_Code: 'M.A.1', Outcome_Label: 'Solve linear equations', Question_EN: 'Solve for $x$: $3x + 5 = 20$', Question_AR: 'أوجد قيمة $x$: $3x + 5 = 20$', Option_A: '$x = 5$', Option_B: '$x = 15$', Option_C: '$x = \\frac{25}{3}$', Option_D: '$x = 3$', Correct_Option: 'A', Marks: 3, Feedback: '$3x = 15 \\Rightarrow x = 5$', Hint: 'Subtract $5$ from both sides first.' },
      { Q_Num: 2, Section_Part: 'Part 1: Algebra', Topic: 'Rates', Outcome_Code: 'M.A.2', Outcome_Label: 'Interpret rates of change', Passage_ID: 'P1', Question_EN: 'After how many minutes will the tank be empty?', Question_AR: 'بعد كم دقيقة يصبح الخزان فارغًا؟', Option_A: '$20$ minutes', Option_B: '$25$ minutes', Option_C: '$475$ minutes', Option_D: '$12.5$ minutes', Option_A_AR: '$20$ دقيقة', Option_B_AR: '$25$ دقيقة', Option_C_AR: '$475$ دقيقة', Option_D_AR: '$12.5$ دقيقة', Correct_Option: 'A', Marks: 3, Feedback: '$\\frac{500}{25} = 20$ minutes.' },
    ],
  };
}

function instructions(fam) {
  const common = [
    ['GENERAL', ''],
    ['1. Keep the sheet names and column headers EXACTLY as they are (English names). You may delete the yellow example rows.', '1. لا تغيّر أسماء الأوراق ولا عناوين الأعمدة (تبقى بالإنجليزية). يمكنك حذف الصفوف الصفراء (أمثلة).'],
    ['2. One question per row in the "Questions" sheet. Q_Num is the display order (1, 2, 3 …).', '2. كل سؤال في صف واحد في ورقة Questions. ‏Q_Num هو ترتيب العرض (1، 2، 3 …).'],
    ['3. Options: fill Option_A and Option_B at least. Fill options in order (A, B, C, D) – never leave a gap.', '3. الخيارات: املأ Option_A و Option_B على الأقل، وبالترتيب (A ثم B ثم C ثم D) دون ترك فراغ بينها.'],
    ['4. Correct_Option is a single letter A, B, C or D and must point to a filled option.', '4. ‏Correct_Option حرف واحد A أو B أو C أو D ويجب أن يشير إلى خيار مكتوب.'],
    ['5. Marks is a number (e.g. 2, 3, 4). Different questions may have different marks.', '5. ‏Marks رقم (مثل 2 أو 3 أو 4)، ويمكن أن تختلف الدرجة من سؤال لآخر.'],
    ['6. Feedback = worked solution / explanation shown after submitting. Hint = optional clue shown by the Hint button.', '6. ‏Feedback هو الحل أو التفسير بعد التسليم. ‏Hint تلميح اختياري يظهر عند الضغط على زر التلميح.'],
    ['7. Section_Part groups questions (e.g. "Part 1: Vocabulary"). Questions with the same Section_Part are grouped in the question list and results.', '7. ‏Section_Part لتجميع الأسئلة (مثل "Part 1: Vocabulary")، وتظهر مجمّعة في قائمة الأسئلة والنتائج.'],
    ['', ''],
    ['PASSAGES (shared texts)', ''],
    ['8. Write each shared text once in the "Passages" sheet with an ID (P1, P2 …). Put the same ID in Passage_ID of every question that uses it. The text stays open beside those questions.', '8. اكتب كل نص مشترك مرة واحدة في ورقة Passages مع رمز (P1، P2 …)، وضع الرمز نفسه في عمود Passage_ID لكل سؤال يعتمد عليه، فيبقى النص ظاهرًا بجانب تلك الأسئلة.'],
    ['9. Use a new line (Alt+Enter) to start a new paragraph inside a passage.', '9. استخدم Alt+Enter لبدء فقرة جديدة داخل النص.'],
    ['', ''],
    ['IMAGES', ''],
    ['10. Click the Image cell of the question row, then Insert → Pictures → Place in Cell (Excel 365), OR insert a picture so its top-left corner sits inside that row. The platform extracts it automatically.', '10. اختر خلية Image في صف السؤال ثم إدراج ← صور ← وضع في الخلية (Excel 365)، أو أدرج الصورة بحيث تكون زاويتها العلوية اليسرى داخل صف السؤال، وسيستخرجها النظام تلقائيًا.'],
    ['11. You can also paste an image web link (https://…) in the Image cell, or add / replace / paste the image later in the upload preview.', '11. يمكنك أيضًا لصق رابط صورة (https://…) في خلية Image، أو إضافة الصورة واستبدالها لاحقًا من شاشة المعاينة عند الرفع.'],
    ['11b. PICTURE ANSWERS: put a picture in Image_A, Image_B, Image_C or Image_D (same way as above) to show it in that option. An option may be a picture only (leave its Option_ text empty) or a picture with text. Correct_Option works the same.', '11ب. خيارات بالصور: ضع صورة في الخلية Image_A أو Image_B أو Image_C أو Image_D (بالطريقة نفسها) لتظهر في ذلك الخيار. يمكن أن يكون الخيار صورة فقط (اترك نص Option_ فارغًا) أو صورة مع نص، ويبقى Correct_Option كما هو.'],
  ];
  const specific = {
    english: [
      ['', ''], ['ENGLISH', ''],
      ['12. 3-option questions: leave Option_D EMPTY. The exam then shows a, b, c only.', '12. الأسئلة ذات 3 خيارات: اترك Option_D فارغًا، فتظهر الخيارات a و b و c فقط.'],
      ['13. Grammar cloze: write the paragraph in Passages with numbered gaps "(1) _____", then one question per gap: "Choose the correct word for gap (1)."', '13. نص الفراغات: اكتب الفقرة في Passages مع فراغات مرقّمة "(1) _____" ثم سؤالًا لكل فراغ.'],
      ['14. Keep Shuffle_Questions = No so Parts stay in order (Part 1 → 2 → 3A → 3B). Writing tasks are done on paper – do not include them.', '14. اترك Shuffle_Questions = No ليبقى ترتيب الأجزاء. مهام الكتابة تُنفّذ ورقيًا ولا تُدرج هنا.'],
    ],
    stem: [
      ['', ''], ['MATH & SCIENCE', ''],
      ['12. Write math between dollar signs: $x^2$, $\\frac{3}{4}$, $\\sqrt{2}$, $3\\times10^{8}$ m/s. Use $$…$$ for a centred display equation.', '12. اكتب الرموز الرياضية بين علامتي الدولار: $x^2$ و $\\frac{3}{4}$. استخدم $$…$$ للمعادلة في سطر مستقل.'],
      ['13. Fill both Question_EN and Question_AR for bilingual display. If one is empty, only the other language is shown.', '13. املأ Question_EN و Question_AR معًا للعرض ثنائي اللغة، وإذا تُرك أحدهما فارغًا يظهر الآخر فقط.'],
      ['13b. LANGUAGE: Maths, Science, Physics and Chemistry show every question and answer in ENGLISH and ARABIC (question side by side, answers Arabic above English) – fill Question_EN + Question_AR and Option_A … Option_D + Option_A_AR … Option_D_AR. BIOLOGY is English only – leave the _AR columns empty. Leave an Option_X_AR cell empty when the answer is the same in both languages (numbers or $x = 5$).', '13b. اللغة: الرياضيات والعلوم والفيزياء والكيمياء تعرض كل سؤال وخيار بالإنجليزية والعربية (السؤال جنباً إلى جنب، والخيار بالعربية فوق الإنجليزية) – املأ Question_EN و Question_AR و Option_A … Option_D و Option_A_AR … Option_D_AR. الأحياء بالإنجليزية فقط – اترك أعمدة _AR فارغة. اترك خلية Option_X_AR فارغة إذا كان الخيار نفسه في اللغتين (أرقام أو $x = 5$).'],
      ['14. The Image column is wide on purpose: place graphs, tables and diagrams there.', '14. عمود Image عريض لوضع الرسوم البيانية والجداول والأشكال.'],
      ['15. To write a real dollar sign (money) type \\$ e.g. \\$4.50', '15. لكتابة رمز الدولار كعملة اكتب \\$ مثل \\$4.50'],
    ],
    arabic: [
      ['', ''], ['ARABIC / ISLAMIC / SOCIAL STUDIES', ''],
      ['12. Write questions in Question_AR. Keep full Tashkeel – copy Quran verses from a trusted Mushaf source (e.g. with ﴿ ﴾ brackets) and check the diacritics.', '12. اكتب الأسئلة في عمود Question_AR مع الحفاظ على التشكيل الكامل، وانسخ الآيات من مصدر موثوق (بين القوسين ﴿ ﴾) وراجع التشكيل.'],
      ['13. Options and feedback may be written in Arabic. Correct_Option still uses the Latin letters A, B, C, D.', '13. تُكتب الخيارات والتغذية الراجعة بالعربية، أما Correct_Option فيبقى بالحروف A أو B أو C أو D.'],
      ['14. Use Passages for reading texts, poems, Hadith or informational texts shared by several questions.', '14. استخدم ورقة Passages للنصوص والقصائد والأحاديث والنصوص المعلوماتية المشتركة بين عدة أسئلة.'],
    ],
  };
  return [...common, ...specific[fam]];
}

async function buildTemplate(fam, opts = {}) {
  const F = FAMILIES[fam];
  if (!F) throw new Error('Unknown template family: ' + fam);
  const ex = opts.withExamples === false ? { passages: [], questions: [] } : examples(fam);
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Zayed Educational Complex – Suhaila';
  wb.created = new Date();

  // 1) Exam_Info
  const info = wb.addWorksheet('Exam_Info', { views: [{ state: 'frozen', ySplit: 1 }] });
  info.columns = [{ header: 'Field', width: 26 }, { header: 'Value', width: 40 }, { header: 'Notes (EN)', width: 60 }, { header: 'ملاحظات (AR)', width: 55 }];
  info.getRow(1).eachCell(headStyle);
  examInfoRows(fam, opts).forEach(r => {
    const row = info.addRow(r);
    row.getCell(1).font = { bold: true, color: { argb: NAVY } };
    row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PALE } };
    row.getCell(4).alignment = { horizontal: 'right', readingOrder: 'rtl' };
  });
  const yesNo = { type: 'list', allowBlank: false, formulae: ['"Yes,No"'] };
  info.eachRow((row, i) => {
    if (i === 1) return;
    const f = row.getCell(1).value, c = row.getCell(2);
    if (['Calculator_Allowed', 'Allow_Backtrack', 'Shuffle_Questions', 'Shuffle_Options', 'Require_Seen_All', 'Show_Review_After_Submit'].includes(f)) c.dataValidation = yesNo;
    if (f === 'Subject') c.dataValidation = { type: 'list', formulae: ['"' + SUBJECTS.join(',') + '"'] };
    if (f === 'Track') c.dataValidation = { type: 'list', formulae: ['"General,Advanced,All"'] };
    if (f === 'Term') c.dataValidation = { type: 'list', formulae: ['"Term 1,Term 2,Term 3"'] };
    if (f === 'Default_Language') c.dataValidation = { type: 'list', formulae: ['"en,ar"'] };
    if (f === 'Grade') c.dataValidation = { type: 'whole', allowBlank: true, operator: 'between', formulae: [5, 12] };
  });

  // 2) Passages
  const ps = wb.addWorksheet('Passages', { views: [{ state: 'frozen', ySplit: 1, rightToLeft: fam === 'arabic' }] });
  ps.columns = F.passageCols.map(h => ({ header: h, key: h, width: COL_WIDTH[h] || 20 }));
  ps.getRow(1).eachCell(headStyle);
  ex.passages.forEach(p => {
    const row = ps.addRow(p);
    row.height = 90;
    row.eachCell({ includeEmpty: true }, c => { c.fill = exampleFill; c.alignment = { wrapText: true, vertical: 'top' }; });
  });

  // 3) Questions
  const qs = wb.addWorksheet('Questions', { views: [{ state: 'frozen', ySplit: 1, xSplit: 1, rightToLeft: fam === 'arabic' }] });
  qs.columns = F.questionCols.map(h => ({ header: h, key: h, width: fam === 'stem' && h === 'Image' ? 34 : (COL_WIDTH[h] || 18) }));
  qs.getRow(1).height = 30;
  qs.getRow(1).eachCell(headStyle);
  ex.questions.forEach(q => {
    const row = qs.addRow(q);
    row.height = fam === 'stem' ? 110 : 45;
    row.eachCell({ includeEmpty: true }, c => { c.fill = exampleFill; c.alignment = { wrapText: true, vertical: 'top' }; });
  });
  const colIdx = h => F.questionCols.indexOf(h) + 1;
  for (let r = 2; r <= 301; r++) {
    if (r > ex.questions.length + 1) qs.getRow(r).height = fam === 'stem' ? 80 : 30;
    qs.getCell(r, colIdx('Correct_Option')).dataValidation = { type: 'list', allowBlank: true, formulae: ['"A,B,C,D"'], showErrorMessage: true, errorTitle: 'Correct_Option', error: 'Choose A, B, C or D' };
    qs.getCell(r, colIdx('Marks')).dataValidation = { type: 'decimal', allowBlank: true, operator: 'greaterThan', formulae: [0], showErrorMessage: true, error: 'Marks must be a number > 0' };
  }
  qs.getCell(1, colIdx('Image')).note = 'Insert → Pictures → Place in Cell, or put the picture inside this row. / أدرج الصورة داخل هذه الخلية أو هذا الصف.';
  ['A', 'B', 'C', 'D'].forEach(L => { qs.getCell(1, colIdx('Image_' + L)).note = `Optional picture for option ${L} (Place in Cell, or a picture whose top-left corner is in this cell). / صورة اختيارية للخيار ${L}.`; });
  qs.getCell(1, colIdx('Passage_ID')).note = 'Optional. Must match a Passage_ID in the Passages sheet. / اختياري، ويجب أن يطابق رمزًا في ورقة Passages.';

  // 4) Instructions
  const ins = wb.addWorksheet('Instructions_تعليمات');
  ins.columns = [{ header: 'Instructions (English)', width: 95 }, { header: 'التعليمات (العربية)', width: 95 }];
  ins.getRow(1).eachCell(headStyle);
  if (opts.blueprint && opts.blueprint.questions) { const b = opts.blueprint;
    const r = ins.addRow([`OFFICIAL ELECTRONIC PART: ${b.questions} questions${b.marks ? ` · ${b.marks} marks` : ''} · ${b.duration} min · calculator: ${b.calculator ? 'Yes' : 'No'}${b.parts.length > 1 ? ' · ' + b.parts.map(p => `${p.label} ${p.count}${p.marks ? '×' + p.marks : ''}`).join(', ') : ''}. Paper part (not here): ${b.paper}.`,
      `الجزء الإلكتروني الرسمي: ${b.questions} سؤالاً${b.marks ? ` · ${b.marks} درجة` : ''} · ${b.duration} دقيقة · الآلة الحاسبة: ${b.calculator ? 'نعم' : 'لا'}. الجزء الورقي لا يُدرج هنا.`]);
    r.font = { bold: true, color: { argb: OLIVE } }; r.getCell(1).alignment = { wrapText: true }; r.getCell(2).alignment = { wrapText: true, horizontal: 'right', readingOrder: 'rtl' }; }
  const title = ins.addRow([`${F.label} – Exam Template  |  Zayed Educational Complex – Suhaila  |  ${opts.term || 'Term 1'}  2026–2027`, `نموذج اختبار – مجمع زايد التعليمي - سهيلة  |  العام الدراسي 2026–2027`]);
  title.font = { bold: true, size: 13, color: { argb: BLUE } };
  instructions(fam).forEach(([en, ar]) => {
    const row = ins.addRow([en, ar]);
    row.getCell(1).alignment = { wrapText: true, vertical: 'top' };
    row.getCell(2).alignment = { wrapText: true, vertical: 'top', horizontal: 'right', readingOrder: 'rtl' };
    if (en && en === en.toUpperCase() && !ar) row.font = { bold: true, color: { argb: OLIVE } };
  });
  return wb;
}

return { buildTemplate, familyForSubject, FAMILIES, SUBJECTS, SUBJECT_AR, FAMILY_BY_SUBJECT };
});
