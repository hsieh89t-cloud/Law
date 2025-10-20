/****************************************************
 * notes_composer.gs — 輸出模板與安全覆寫（v3.8）
 ****************************************************/
function lawHeader_(cfg, noKey) {
  return `${cfg.lawName}第 ${noKey} 條`;
}

function composeNoteBlock_(cfg, noKey, body, glossaryArr, teachingStr) {
  const header = lawHeader_(cfg, noKey);
  const glossaryBlock = (Array.isArray(glossaryArr) && glossaryArr.length)
    ? glossaryArr.map(g => `${g.term}\n${g.definition}`).join('\n')
    : '（...）';
  const teaching = teachingStr && String(teachingStr).trim()
    ? String(teachingStr).trim()
    : '（...）';
  const caseBlock = '（...）';

  return [
    `${header}`, '',
    '條文',
    (body || '').trim(), '',
    '專有詞彙',
    glossaryBlock, '',
    '教學理解',
    teaching, '',
    '判例',
    caseBlock, '',
    '資料來源',
    `《${cfg.lawName}》：${cfg.lawUrlBase}?pcode=${cfg.pcode}`, '',
    '標籤'
  ].join('\n');
}

function replaceOnlyCaseSection_(fullText, newCaseBlock) {
  const block = (newCaseBlock && String(newCaseBlock).trim()) ? String(newCaseBlock).trim() : '（...）';
  const txt = String(fullText || '');
  const re = /(\n判例\n)([\s\S]*?)(\n\n資料來源\n)/;
  if (re.test(txt)) return txt.replace(re, `$1${block}$3`);
  const insRe = /(\n\n資料來源\n)/;
  if (insRe.test(txt)) return txt.replace(insRe, `\n判例\n${block}$1`);
  return `${txt.replace(/\s+$/, '')}\n\n判例\n${block}\n`;
}
