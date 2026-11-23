// Builds public/exam.html from scripts/exam-engine.template.html + verbatim sections of the
// SwiftAssess reference (reference/swiftassess-reference.html). Re-run after editing the template.
const fs = require('fs'), path = require('path');
const R = path.join(__dirname, '..');
const ref = fs.readFileSync(path.join(R, 'reference/swiftassess-reference.html'), 'utf8').split(/\r?\n/);
const lines = (a, b) => ref.slice(a - 1, b).join('\n');
// sanity anchors so a changed reference fails loudly instead of silently producing a broken engine
const expect = (n, s) => { if (!ref[n - 1].includes(s)) throw new Error(`Reference line ${n} expected to contain "${s}"`); };
expect(40, ':root{--navy'); expect(91, 'exam top bar'); expect(254, '@media(max-width:820px)'); expect(291, 'id="examScreen"');
expect(339, 'id="mback"'); expect(524, 'const T = {'); expect(543, '};'); expect(551, 'const fmt'); expect(557, 'function math');
expect(576, 'const ICO'); expect(582, "$('#mNo')"); expect(750, 'accessibility'); expect(770, '}'); expect(772, 'calculator'); expect(835, '}');
const parts = {
  '/*@CSS_BASE@*/': lines(40, 55),
  '/*@CSS_EXAM@*/': lines(91, 254),
  '<!--@HTML_EXAM@-->': lines(290, 339),
  '/*@JS_T@*/': lines(524, 543),
  '/*@JS_HELPERS@*/': [lines(551, 551), lines(553, 558)].join('\n'),
  '/*@JS_UI@*/': lines(575, 582),
  '/*@JS_A11Y@*/': lines(750, 770),
  '/*@JS_CALC@*/': lines(772, 835),
};
let out = fs.readFileSync(path.join(__dirname, 'exam-engine.template.html'), 'utf8');
for (const [k, v] of Object.entries(parts)) { if (!out.includes(k)) throw new Error('Missing marker ' + k); out = out.replace(k, () => v); }
fs.writeFileSync(path.join(R, 'public/exam.html'), out);
console.log('public/exam.html built (' + out.length + ' bytes)');
