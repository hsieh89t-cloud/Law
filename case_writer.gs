/****************************************************
 * case_writer.gs — 只改〈判例〉段的寫回（v3.8）
 ****************************************************/
function buildCaseBlock_(hit) {
  const parts = [];
  if (hit && hit.caseNo) parts.push(String(hit.caseNo).trim() + (hit.type ? `（類型：${hit.type}）` : ''));
  if (hit && hit.url) parts.push(`來源：${String(hit.url).trim()}`);
  const block = parts.length ? parts.join('\n') : '（...）';
  return block;
}

function writeCaseBlockFromHit_(noKey, hit) {
  const sh = getLawSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return { updated:false };

  const data = sh.getRange(2, 1, lastRow - 1, 4).getValues();
  const idx = data.findIndex(r => String(r[0]).trim() === String(noKey).trim());
  if (idx === -1) return { updated:false };

  const outCell = sh.getRange(idx + 2, 4);
  const curr = String(outCell.getValue() || '');
  const rebuilt = replaceOnlyCaseSection_(curr, buildCaseBlock_(hit));
  outCell.setValue(rebuilt);
  return { updated:true };
}

function updateCaseForArticleDialog() {
  const ui = SpreadsheetApp.getUi();
  const no = ui.prompt('輸入條號', '例如：62 或 15-1', ui.ButtonSet.OK_CANCEL);
  if (no.getSelectedButton() !== ui.Button.OK) return;
  const caseNo = ui.prompt('輸入判例案號', '例如：最高法院 84 年台上字第 163 號', ui.ButtonSet.OK_CANCEL);
  if (caseNo.getSelectedButton() !== ui.Button.OK) return;
  const src = ui.prompt('輸入來源連結（必填）', '例如：https://law.judicial.gov.tw/...', ui.ButtonSet.OK_CANCEL);
  if (src.getSelectedButton() !== ui.Button.OK) return;

  const hit = { caseNo: (caseNo.getResponseText() || '').trim(), type: 'B', url: (src.getResponseText() || '').trim() };
  const res = writeCaseBlockFromHit_((no.getResponseText() || '').trim(), hit);
  if (res && res.updated) ui.alert('✅ 已更新該條之判例段');
  else ui.alert('❌ 失敗：找不到條號或無法寫入');
}
