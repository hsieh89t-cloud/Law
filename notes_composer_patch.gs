/****************************************************
 * notes_composer_patch.gs — 補「專有詞彙／教學理解」
 ****************************************************/
function replaceOnlyGlossarySection_(fullText, glossaryArr) {
  const txt = String(fullText || '');
  const block = (Array.isArray(glossaryArr) && glossaryArr.length)
    ? glossaryArr.map(g => `${(g.term||'').trim()}\n${(g.definition||'').trim()}`).join('\n')
    : '（...）';
  const re = /(\n專有詞彙\n)([\s\S]*?)(\n\n教學理解\n)/;
  if (re.test(txt)) return txt.replace(re, `$1${block}$3`);
  const insRe = /(\n\n條文[\s\S]*?)(\n\n教學理解\n)/;
  if (insRe.test(txt)) return txt.replace(insRe, `$1\n\n專有詞彙\n${block}$2`);
  return txt;
}

function replaceOnlyTeachingSection_(fullText, teachingStr) {
  const txt = String(fullText || '');
  const block = (teachingStr && String(teachingStr).trim()) ? String(teachingStr).trim() : '（...）';
  const re = /(\n教學理解\n)([\s\S]*?)(\n\n判例\n)/;
  if (re.test(txt)) return txt.replace(re, `$1${block}$3`);
  const insRe = /(\n\n專有詞彙[\s\S]*?)(\n\n判例\n)/;
  if (insRe.test(txt)) return txt.replace(insRe, `$1\n\n教學理解\n${block}$2`);
  return txt;
}

function enrichGlossaryTeachingIfNeeded_(noKey) {
  const cfg = getCurrentConfig_();
  const sh = getLawSheet_();
  const last = sh.getLastRow();
  if (last < 2) return false;
  const data = sh.getRange(2, 1, last - 1, 4).getValues();
  const idx  = data.findIndex(r => String(r[0]).trim() === String(noKey).trim());
  if (idx === -1) return false;

  const body = String(data[idx][2] || '').trim();
  let note   = String(data[idx][3] || '');

  if (!note.trim()) {
    const template = composeNoteBlock_(cfg, noKey, body, [], '');
    sh.getRange(idx + 2, 4).setValue(template);
    note = template;
  }

  const needGlossary = /\n專有詞彙\n（\.\.\.）/.test(note);
  const needTeaching = /\n教學理解\n（\.\.\.）/.test(note);
  if (!needGlossary && !needTeaching) return false;

  let gl = [], teach = '';
  try {
    const ai = generateGlossaryTeaching_(noKey, cfg.lawName, body);
    gl = ai.glossary || [];
    teach = ai.teaching || '';
  } catch(e) { return false; }

  let rebuilt = note;
  if (needGlossary && gl.length) rebuilt = replaceOnlyGlossarySection_(rebuilt, gl);
  if (needTeaching && teach)     rebuilt = replaceOnlyTeachingSection_(rebuilt, teach);

  if (rebuilt !== note) {
    sh.getRange(idx + 2, 4).setValue(rebuilt);
    return true;
  }
  return false;
}
