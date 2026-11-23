# Claude prompts (fill the Excel template)

Shown in the Teacher Portal (Upload → "Copy Claude Prompt"). The portal fills in the teacher's subject, grade, track, term, name, the official electronic-part blueprint and the template file name automatically. The examples below use one class per family.

How teachers use it: 1) download the template, 2) attach it + the exam paper in Claude and paste the prompt, 3) download the filled Excel Claude returns and upload it in Step 2.

Source: `public/js/shared/ai-prompts.js`.

## English (English) — English instructions (example: English G8 General)

```text
You are an expert assessment writer for the UAE Ministry of Education curriculum, working for Zayed Educational Complex – Suhaila.

YOUR TASK
I have attached:
  1) the Excel template "English_Exam_Template.xlsx" (downloaded from our exam platform), and
  2) the exam material (exam paper, worksheet, textbook pages or my notes).
Turn the material into an electronic multiple-choice practice exam by FILLING IN THE ATTACHED EXCEL TEMPLATE, then give me the completed file to download, named "English_G8_Term1_Exam.xlsx".
Do not just print tables in the chat — I need the actual .xlsx file. I will upload it directly to the platform.

EXAM DETAILS
• Subject: English · Grade: 8 · Track: General · Term 1, Academic Year 2026–2027 · Teacher: [Teacher name]
• Exactly 26 multiple-choice questions, 60 marks in total (marks per question: 2–3).
   - Part 1: Vocabulary: 5 questions × 2 marks, 3 options each
   - Part 2: Grammar: 5 questions × 2 marks, 3 options each
   - Part 3A: Reading: 8 questions × 3 marks, 3 options each
   - Part 3B: Reading: 8 questions × 2 marks, 3 options each
• The paper part is NOT included (Writing (40 marks) is on paper).

HOW TO FILL THE WORKBOOK (it has 4 sheets — keep their names exactly)
1. Keep every sheet name, the header row (row 1), the column order and the existing formatting/drop-down lists. Do not add, delete, rename or reorder sheets or columns.
2. Remove the yellow example rows in "Passages" and "Questions" and write your data starting on row 2, overwriting them, with no blank rows in between.
   The sheets contain pre-formatted empty rows: write INTO rows 2, 3, 4 … — do not append below the last formatted row.
3. Sheet "Exam_Info" — fill ONLY column B (Value) of each existing row:
   Exam_Title = a clear title (e.g. "English – Grade 8 – Term 1 Practice") · Subject = English · Grade = 8 · Track = General · Term = Term 1
   Teacher_Name = [Teacher name] · Exam_Code = A · Duration_Minutes = 60 · Passing_Percent = 50 · Calculator_Allowed = No
   Allow_Backtrack = Yes · Shuffle_Questions = No · Shuffle_Options = Yes · Require_Seen_All = Yes · Show_Review_After_Submit = Yes
   Default_Language = en · Extra_Instructions = short instructions for students, or leave empty.
4. Sheet "Passages" — columns: Passage_ID | Passage_Title | Passage_EN
   One row per shared text (a reading text, cloze paragraph, scenario, data table described in words, poem…). Passage_ID = P1, P2, P3 …
5. Sheet "Questions" — columns: Q_Num | Section_Part | Topic | Outcome_Code | Outcome_Label | Passage_ID | Question_EN | Image | Option_A | Option_B | Option_C | Option_D | Image_A | Image_B | Image_C | Image_D | Correct_Option | Marks | Feedback | Hint
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

ENGLISH RULES
A. Section_Part must be exactly one of: "Part 1: Vocabulary", "Part 2: Grammar", "Part 3A: Reading", "Part 3B: Reading" — keep this order (Shuffle_Questions = No).
B. Most questions have 3 options: fill Option_A–C and leave Option_D EMPTY.
C. Grammar cloze: write the paragraph ONCE in "Passages" (e.g. P1) with numbered gaps written "(1) _____", "(2) _____" … then one question per gap: Question_EN = "Choose the correct answer for gap (1)." with Passage_ID = P1.
D. Reading: write each reading text ONCE in "Passages" (P2, P3 …), keep the paragraphs (separate them with a blank line inside the cell), and link all its questions with the same Passage_ID.
E. The Writing section is done on paper (or as a separate task) — do not include it.

YOUR REPLY
Attach the completed "English_G8_Term1_Exam.xlsx". In the message write only: number of questions, total marks, the parts (Section_Part with counts), the questions that still need a picture (Q_Num + what to insert), and anything from the material you skipped.
```

## English (English) — تعليمات بالعربية (example: English G8 General)

```text
أنت خبير في إعداد الاختبارات وفق مناهج وزارة التربية والتعليم في دولة الإمارات، وتعمل لصالح مجمع زايد التعليمي - سهيلة.

المهمة
أرفقتُ لك:
  1) ملف Excel النموذجي "English_Exam_Template.xlsx" (المحمَّل من منصة الاختبارات)،
  2) مادة الاختبار (ورقة اختبار أو ورقة عمل أو صفحات من الكتاب أو ملاحظاتي).
حوّل المادة إلى اختبار تدريبي إلكتروني من نوع الاختيار من متعدد عن طريق تعبئة ملف Excel المرفق نفسه، ثم أعطني الملف المكتمل للتحميل باسم "English_G8_Term1_Exam.xlsx".
لا تكتفِ بعرض جداول في المحادثة — أحتاج ملف ‎.xlsx الفعلي لأرفعه مباشرة إلى المنصة.

بيانات الاختبار
• المادة: English · الصف: 8 · المسار: General · Term 1 – العام الدراسي 2026–2027 · المعلم: [Teacher name]
• 26 سؤالاً بالضبط من نوع الاختيار من متعدد، مجموعها 60 درجة (درجة السؤال: 2–3).
   - Part 1: Vocabulary: 5 سؤالاً × 2 درجة، 3 خيارات لكل سؤال
   - Part 2: Grammar: 5 سؤالاً × 2 درجة، 3 خيارات لكل سؤال
   - Part 3A: Reading: 8 سؤالاً × 3 درجة، 3 خيارات لكل سؤال
   - Part 3B: Reading: 8 سؤالاً × 2 درجة، 3 خيارات لكل سؤال
• لا يُدرج الجزء الورقي.

طريقة تعبئة الملف (يحتوي على 4 أوراق — لا تغيّر أسماءها)
1. حافظ على أسماء الأوراق وصف العناوين (الصف 1) وترتيب الأعمدة والتنسيق والقوائم المنسدلة كما هي، ولا تضف أو تحذف أو تُعِد تسمية أي ورقة أو عمود.
2. احذف الصفوف الصفراء (الأمثلة) من ورقتي "Passages" و"Questions" واكتب بياناتك بدءاً من الصف 2 فوقها مباشرة دون صفوف فارغة بينها.
   تحتوي الأوراق على صفوف فارغة منسّقة مسبقاً: اكتب داخل الصفوف 2، 3، 4 … ولا تُضِف البيانات أسفل آخر صف منسّق.
3. ورقة "Exam_Info" — املأ العمود B (Value) فقط لكل صف موجود:
   Exam_Title = عنوان واضح · Subject = English · Grade = 8 · Track = General · Term = Term 1
   Teacher_Name = [Teacher name] · Exam_Code = A · Duration_Minutes = 60 · Passing_Percent = 50 · Calculator_Allowed = No
   Allow_Backtrack = Yes · Shuffle_Questions = No · Shuffle_Options = Yes · Require_Seen_All = Yes · Show_Review_After_Submit = Yes
   Default_Language = en · Extra_Instructions = تعليمات قصيرة للطلبة أو اتركها فارغة.
4. ورقة "Passages" — الأعمدة: Passage_ID | Passage_Title | Passage_EN
   صف لكل نص مشترك (نص قراءة، فقرة فراغات، موقف، قصيدة، آية أو حديث…)، و Passage_ID = P1، P2، P3 …
5. ورقة "Questions" — الأعمدة: Q_Num | Section_Part | Topic | Outcome_Code | Outcome_Label | Passage_ID | Question_EN | Image | Option_A | Option_B | Option_C | Option_D | Image_A | Image_B | Image_C | Image_D | Correct_Option | Marks | Feedback | Hint
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

قواعد اللغة الإنجليزية (تُكتب الأسئلة بالإنجليزية في عمود Question_EN)
أ. ‏Section_Part يكون واحداً من: "Part 1: Vocabulary" أو "Part 2: Grammar" أو "Part 3A: Reading" أو "Part 3B: Reading" بهذا الترتيب.
ب. معظم الأسئلة لها 3 خيارات: املأ Option_A إلى Option_C واترك Option_D فارغاً.
ج. نص الفراغات: اكتب الفقرة مرة واحدة في "Passages" (مثل P1) مع فراغات مرقّمة "(1) _____"، ثم سؤالاً لكل فراغ: "Choose the correct answer for gap (1)." مع Passage_ID = P1.
د. نصوص القراءة: اكتب كل نص مرة واحدة في "Passages" (P2، P3 …) مع الحفاظ على الفقرات (سطر فارغ بين الفقرات داخل الخلية)، واربط أسئلته بالرمز نفسه.
هـ. قسم الكتابة (Writing) لا يُدرج.

ردّك
أرفق الملف المكتمل "English_G8_Term1_Exam.xlsx"، واكتب في الرسالة فقط: عدد الأسئلة، ومجموع الدرجات، والأجزاء (Section_Part مع عدد أسئلة كل جزء)، والأسئلة التي ما زالت تحتاج صورة (Q_Num مع وصف الصورة)، وأي جزء من المادة لم تُدرجه.
```

## STEM bilingual (Mathematics, Science, Physics, Chemistry, Biology) — English instructions (example: Mathematics G9 Advanced)

```text
You are an expert assessment writer for the UAE Ministry of Education curriculum, working for Zayed Educational Complex – Suhaila.

YOUR TASK
I have attached:
  1) the Excel template "STEM_Exam_Template.xlsx" (downloaded from our exam platform), and
  2) the exam material (exam paper, worksheet, textbook pages or my notes).
Turn the material into an electronic multiple-choice practice exam by FILLING IN THE ATTACHED EXCEL TEMPLATE, then give me the completed file to download, named "Mathematics_G9_Term1_Exam.xlsx".
Do not just print tables in the chat — I need the actual .xlsx file. I will upload it directly to the platform.

EXAM DETAILS
• Subject: Mathematics · Grade: 9 · Track: Advanced · Term 1, Academic Year 2026–2027 · Teacher: [Teacher name]
• Exactly 20 multiple-choice questions (marks per question: 2–4 (varies)).
• The paper part is NOT included (5 free-response questions on paper).

HOW TO FILL THE WORKBOOK (it has 4 sheets — keep their names exactly)
1. Keep every sheet name, the header row (row 1), the column order and the existing formatting/drop-down lists. Do not add, delete, rename or reorder sheets or columns.
2. Remove the yellow example rows in "Passages" and "Questions" and write your data starting on row 2, overwriting them, with no blank rows in between.
   The sheets contain pre-formatted empty rows: write INTO rows 2, 3, 4 … — do not append below the last formatted row.
3. Sheet "Exam_Info" — fill ONLY column B (Value) of each existing row:
   Exam_Title = a clear title (e.g. "Mathematics – Grade 9 – Term 1 Practice") · Subject = Mathematics · Grade = 9 · Track = Advanced · Term = Term 1
   Teacher_Name = [Teacher name] · Exam_Code = A · Duration_Minutes = 60 · Passing_Percent = 50 · Calculator_Allowed = Yes
   Allow_Backtrack = Yes · Shuffle_Questions = No · Shuffle_Options = Yes · Require_Seen_All = Yes · Show_Review_After_Submit = Yes
   Default_Language = en · Extra_Instructions = short instructions for students, or leave empty.
4. Sheet "Passages" — columns: Passage_ID | Passage_Title | Passage_EN | Passage_AR
   One row per shared text (a reading text, cloze paragraph, scenario, data table described in words, poem…). Passage_ID = P1, P2, P3 …
5. Sheet "Questions" — columns: Q_Num | Section_Part | Topic | Outcome_Code | Outcome_Label | Passage_ID | Question_EN | Question_AR | Image | Option_A | Option_B | Option_C | Option_D | Image_A | Image_B | Image_C | Image_D | Correct_Option | Marks | Feedback | Hint
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

MATH & SCIENCE RULES
A. Fill BOTH Question_EN and Question_AR (accurate Modern Standard Arabic using UAE MoE terminology). Write every answer in BOTH languages too: English in Option_A–Option_D and its Arabic translation in Option_A_AR–Option_D_AR (same order, same maths). Leave an Option_X_AR cell empty only when that answer is identical in both languages (a number, a symbol or a pure expression such as $x = 5$).
B. Write EVERY mathematical or scientific expression in KaTeX between dollar signs: inline $...$, display $$...$$ — e.g. $\frac{3}{4}$, $x^2-5x+6=0$, $\sqrt{72}$, $3.0\times10^{8}\ \text{m/s}$, $H_2O$, $\Delta v$. This applies to options, feedback and passages too.
C. Money: write \$4.50 (backslash before the dollar sign) so it is not read as maths.
D. Section_Part groups questions by unit or lesson, e.g. "Part 1: Functions", "Part 2: Equations".
E. Shared data (a scenario, experiment, or a table written out in words) goes in "Passages" with Passage_EN and Passage_AR.
F. Graphs, diagrams and tables that must be seen as pictures: follow step 6 (insert the picture in the "Image" cell, or list the row).

YOUR REPLY
Attach the completed "Mathematics_G9_Term1_Exam.xlsx". In the message write only: number of questions, total marks, the parts (Section_Part with counts), the questions that still need a picture (Q_Num + what to insert), and anything from the material you skipped.
```

## STEM bilingual (Mathematics, Science, Physics, Chemistry, Biology) — تعليمات بالعربية (example: Mathematics G9 Advanced)

```text
أنت خبير في إعداد الاختبارات وفق مناهج وزارة التربية والتعليم في دولة الإمارات، وتعمل لصالح مجمع زايد التعليمي - سهيلة.

المهمة
أرفقتُ لك:
  1) ملف Excel النموذجي "STEM_Exam_Template.xlsx" (المحمَّل من منصة الاختبارات)،
  2) مادة الاختبار (ورقة اختبار أو ورقة عمل أو صفحات من الكتاب أو ملاحظاتي).
حوّل المادة إلى اختبار تدريبي إلكتروني من نوع الاختيار من متعدد عن طريق تعبئة ملف Excel المرفق نفسه، ثم أعطني الملف المكتمل للتحميل باسم "Mathematics_G9_Term1_Exam.xlsx".
لا تكتفِ بعرض جداول في المحادثة — أحتاج ملف ‎.xlsx الفعلي لأرفعه مباشرة إلى المنصة.

بيانات الاختبار
• المادة: Mathematics · الصف: 9 · المسار: Advanced · Term 1 – العام الدراسي 2026–2027 · المعلم: [Teacher name]
• 20 سؤالاً بالضبط من نوع الاختيار من متعدد (درجة السؤال: 2–4 (varies)).
• لا يُدرج الجزء الورقي.

طريقة تعبئة الملف (يحتوي على 4 أوراق — لا تغيّر أسماءها)
1. حافظ على أسماء الأوراق وصف العناوين (الصف 1) وترتيب الأعمدة والتنسيق والقوائم المنسدلة كما هي، ولا تضف أو تحذف أو تُعِد تسمية أي ورقة أو عمود.
2. احذف الصفوف الصفراء (الأمثلة) من ورقتي "Passages" و"Questions" واكتب بياناتك بدءاً من الصف 2 فوقها مباشرة دون صفوف فارغة بينها.
   تحتوي الأوراق على صفوف فارغة منسّقة مسبقاً: اكتب داخل الصفوف 2، 3، 4 … ولا تُضِف البيانات أسفل آخر صف منسّق.
3. ورقة "Exam_Info" — املأ العمود B (Value) فقط لكل صف موجود:
   Exam_Title = عنوان واضح · Subject = Mathematics · Grade = 9 · Track = Advanced · Term = Term 1
   Teacher_Name = [Teacher name] · Exam_Code = A · Duration_Minutes = 60 · Passing_Percent = 50 · Calculator_Allowed = Yes
   Allow_Backtrack = Yes · Shuffle_Questions = No · Shuffle_Options = Yes · Require_Seen_All = Yes · Show_Review_After_Submit = Yes
   Default_Language = en · Extra_Instructions = تعليمات قصيرة للطلبة أو اتركها فارغة.
4. ورقة "Passages" — الأعمدة: Passage_ID | Passage_Title | Passage_EN | Passage_AR
   صف لكل نص مشترك (نص قراءة، فقرة فراغات، موقف، قصيدة، آية أو حديث…)، و Passage_ID = P1، P2، P3 …
5. ورقة "Questions" — الأعمدة: Q_Num | Section_Part | Topic | Outcome_Code | Outcome_Label | Passage_ID | Question_EN | Question_AR | Image | Option_A | Option_B | Option_C | Option_D | Image_A | Image_B | Image_C | Image_D | Correct_Option | Marks | Feedback | Hint
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

قواعد الرياضيات والعلوم
أ. املأ Question_EN و Question_AR معاً (بالعربية الفصحى وبمصطلحات الوزارة)، واكتب كل خيار باللغتين أيضاً: الإنجليزية في Option_A إلى Option_D وترجمتها العربية في Option_A_AR إلى Option_D_AR بالترتيب نفسه. اترك خلية Option_X_AR فارغة فقط إذا كان الخيار متطابقاً في اللغتين (رقم أو رمز أو تعبير رياضي فقط).
ب. اكتب كل تعبير رياضي أو علمي بصيغة KaTeX بين علامتي الدولار: ‏$...$ داخل السطر و $$...$$ في سطر مستقل، مثل $\frac{3}{4}$ و $x^2-5x+6=0$ و $H_2O$، ويشمل ذلك الخيارات والتغذية الراجعة والنصوص.
ج. للعملة اكتب \$4.50 (شرطة مائلة قبل علامة الدولار).
د. ‏Section_Part لتجميع الأسئلة حسب الوحدة أو الدرس مثل "Part 1: Functions".
هـ. البيانات المشتركة (موقف أو تجربة أو جدول مكتوب بالكلمات) توضع في "Passages" بالعمودين Passage_EN و Passage_AR.
و. الرسوم والأشكال والجداول التي يجب أن تظهر كصور: اتبع الخطوة 6.

ردّك
أرفق الملف المكتمل "Mathematics_G9_Term1_Exam.xlsx"، واكتب في الرسالة فقط: عدد الأسئلة، ومجموع الدرجات، والأجزاء (Section_Part مع عدد أسئلة كل جزء)، والأسئلة التي ما زالت تحتاج صورة (Q_Num مع وصف الصورة)، وأي جزء من المادة لم تُدرجه.
```

## Arabic & Humanities (Arabic, Islamic Education, Social Studies) — English instructions (example: Islamic Education G6 General)

```text
You are an expert assessment writer for the UAE Ministry of Education curriculum, working for Zayed Educational Complex – Suhaila.

YOUR TASK
I have attached:
  1) the Excel template "Arabic_Exam_Template.xlsx" (downloaded from our exam platform), and
  2) the exam material (exam paper, worksheet, textbook pages or my notes).
Turn the material into an electronic multiple-choice practice exam by FILLING IN THE ATTACHED EXCEL TEMPLATE, then give me the completed file to download, named "IslamicEducation_G6_Term1_Exam.xlsx".
Do not just print tables in the chat — I need the actual .xlsx file. I will upload it directly to the platform.

EXAM DETAILS
• Subject: Islamic Education · Grade: 6 · Track: General · Term 1, Academic Year 2026–2027 · Teacher: [Teacher name]
• Exactly 27 multiple-choice questions, 100 marks in total (marks per question: 2, 3 or 4).
• The paper part is NOT included (None — fully electronic).

HOW TO FILL THE WORKBOOK (it has 4 sheets — keep their names exactly)
1. Keep every sheet name, the header row (row 1), the column order and the existing formatting/drop-down lists. Do not add, delete, rename or reorder sheets or columns.
2. Remove the yellow example rows in "Passages" and "Questions" and write your data starting on row 2, overwriting them, with no blank rows in between.
   The sheets contain pre-formatted empty rows: write INTO rows 2, 3, 4 … — do not append below the last formatted row.
3. Sheet "Exam_Info" — fill ONLY column B (Value) of each existing row:
   Exam_Title = a clear title (e.g. "Islamic Education – Grade 6 – Term 1 Practice") · Subject = Islamic Education · Grade = 6 · Track = General · Term = Term 1
   Teacher_Name = [Teacher name] · Exam_Code = A · Duration_Minutes = 120 · Passing_Percent = 50 · Calculator_Allowed = No
   Allow_Backtrack = Yes · Shuffle_Questions = No · Shuffle_Options = Yes · Require_Seen_All = Yes · Show_Review_After_Submit = Yes
   Default_Language = ar · Extra_Instructions = short instructions for students, or leave empty.
4. Sheet "Passages" — columns: Passage_ID | Passage_Title | Passage_AR
   One row per shared text (a reading text, cloze paragraph, scenario, data table described in words, poem…). Passage_ID = P1, P2, P3 …
5. Sheet "Questions" — columns: Q_Num | Section_Part | Topic | Outcome_Code | Outcome_Label | Passage_ID | Question_AR | Image | Option_A | Option_B | Option_C | Option_D | Image_A | Image_B | Image_C | Image_D | Correct_Option | Marks | Feedback | Hint
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

ARABIC / ISLAMIC EDUCATION / SOCIAL STUDIES RULES
A. Write every question, option, feedback and hint in Arabic (Question_AR). Keep the English sheet names and column headers exactly as they are.
B. Keep FULL Tashkeel (diacritics) accurately. Copy Quran verses exactly from the Uthmani Mushaf between ﴿ ﴾ with the verse number, and Hadith between « » with the narrator. Never paraphrase a verse.
C. Reading texts, poems, Quran passages, Hadith and informational texts used by several questions go ONCE in "Passages" (Passage_AR) with P1, P2 … and are linked by Passage_ID.
D. Section_Part in Arabic, e.g. "الجزء الأول: الفهم والاستيعاب", "النص السردي", "النص المعلوماتي".
E. Questions may have 3 or 4 options (leave Option_D empty for 3). Correct_Option stays a Latin letter A–D.
F. Maps, pictures and charts: follow step 6.

YOUR REPLY
Attach the completed "IslamicEducation_G6_Term1_Exam.xlsx". In the message write only: number of questions, total marks, the parts (Section_Part with counts), the questions that still need a picture (Q_Num + what to insert), and anything from the material you skipped.
```

## Arabic & Humanities (Arabic, Islamic Education, Social Studies) — تعليمات بالعربية (example: Islamic Education G6 General)

```text
أنت خبير في إعداد الاختبارات وفق مناهج وزارة التربية والتعليم في دولة الإمارات، وتعمل لصالح مجمع زايد التعليمي - سهيلة.

المهمة
أرفقتُ لك:
  1) ملف Excel النموذجي "Arabic_Exam_Template.xlsx" (المحمَّل من منصة الاختبارات)،
  2) مادة الاختبار (ورقة اختبار أو ورقة عمل أو صفحات من الكتاب أو ملاحظاتي).
حوّل المادة إلى اختبار تدريبي إلكتروني من نوع الاختيار من متعدد عن طريق تعبئة ملف Excel المرفق نفسه، ثم أعطني الملف المكتمل للتحميل باسم "IslamicEducation_G6_Term1_Exam.xlsx".
لا تكتفِ بعرض جداول في المحادثة — أحتاج ملف ‎.xlsx الفعلي لأرفعه مباشرة إلى المنصة.

بيانات الاختبار
• المادة: Islamic Education · الصف: 6 · المسار: General · Term 1 – العام الدراسي 2026–2027 · المعلم: [Teacher name]
• 27 سؤالاً بالضبط من نوع الاختيار من متعدد، مجموعها 100 درجة (درجة السؤال: 2, 3 or 4).
• لا يُدرج الجزء الورقي.

طريقة تعبئة الملف (يحتوي على 4 أوراق — لا تغيّر أسماءها)
1. حافظ على أسماء الأوراق وصف العناوين (الصف 1) وترتيب الأعمدة والتنسيق والقوائم المنسدلة كما هي، ولا تضف أو تحذف أو تُعِد تسمية أي ورقة أو عمود.
2. احذف الصفوف الصفراء (الأمثلة) من ورقتي "Passages" و"Questions" واكتب بياناتك بدءاً من الصف 2 فوقها مباشرة دون صفوف فارغة بينها.
   تحتوي الأوراق على صفوف فارغة منسّقة مسبقاً: اكتب داخل الصفوف 2، 3، 4 … ولا تُضِف البيانات أسفل آخر صف منسّق.
3. ورقة "Exam_Info" — املأ العمود B (Value) فقط لكل صف موجود:
   Exam_Title = عنوان واضح · Subject = Islamic Education · Grade = 6 · Track = General · Term = Term 1
   Teacher_Name = [Teacher name] · Exam_Code = A · Duration_Minutes = 120 · Passing_Percent = 50 · Calculator_Allowed = No
   Allow_Backtrack = Yes · Shuffle_Questions = No · Shuffle_Options = Yes · Require_Seen_All = Yes · Show_Review_After_Submit = Yes
   Default_Language = ar · Extra_Instructions = تعليمات قصيرة للطلبة أو اتركها فارغة.
4. ورقة "Passages" — الأعمدة: Passage_ID | Passage_Title | Passage_AR
   صف لكل نص مشترك (نص قراءة، فقرة فراغات، موقف، قصيدة، آية أو حديث…)، و Passage_ID = P1، P2، P3 …
5. ورقة "Questions" — الأعمدة: Q_Num | Section_Part | Topic | Outcome_Code | Outcome_Label | Passage_ID | Question_AR | Image | Option_A | Option_B | Option_C | Option_D | Image_A | Image_B | Image_C | Image_D | Correct_Option | Marks | Feedback | Hint
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

قواعد اللغة العربية والتربية الإسلامية والدراسات الاجتماعية
أ. اكتب جميع الأسئلة والخيارات والتغذية الراجعة والتلميحات بالعربية في عمود Question_AR، مع إبقاء أسماء الأوراق والأعمدة بالإنجليزية.
ب. حافظ على التشكيل الكامل بدقة، وانسخ الآيات من المصحف العثماني بين ﴿ ﴾ مع رقم الآية، والأحاديث بين « » مع ذكر الراوي، ولا تُعِد صياغة الآيات.
ج. النصوص والقصائد والآيات والأحاديث والنصوص المعلوماتية المشتركة تُكتب مرة واحدة في "Passages" (Passage_AR) برمز P1، P2 … وتُربط بها الأسئلة.
د. ‏Section_Part بالعربية مثل "الجزء الأول: الفهم والاستيعاب" أو "النص السردي" أو "النص المعلوماتي".
هـ. يمكن أن يكون للسؤال 3 أو 4 خيارات (اترك Option_D فارغاً عند 3 خيارات)، ويبقى Correct_Option حرفاً لاتينياً A–D.
و. الخرائط والصور والرسوم: اتبع الخطوة 6.

ردّك
أرفق الملف المكتمل "IslamicEducation_G6_Term1_Exam.xlsx"، واكتب في الرسالة فقط: عدد الأسئلة، ومجموع الدرجات، والأجزاء (Section_Part مع عدد أسئلة كل جزء)، والأسئلة التي ما زالت تحتاج صورة (Q_Num مع وصف الصورة)، وأي جزء من المادة لم تُدرجه.
```
