/****************************************************
 * batch_runner.gs — 單條/批次生成與批次查判例（v3.8）
 ****************************************************/
function formatSingleNote() {
  const ui = SpreadsheetApp.getUi();
  const input = ui.prompt('請輸入條號（例如：2 或 15-1）', '', ui.ButtonSet.OK_CANCEL);
  if (input.getSelectedButton() !== ui.Button.OK) return;
  const noKey = (input.getResponseText() || '').trim();
  if (!noKey) return ui.alert('請輸入條號');

  const cfg = getCurrentConfig_();
  const sh = getLawSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return SpreadsheetApp.getUi().alert('請先執行「抓取法條」');

  const data = sh.getRange(2, 1, lastRow - 1, 3).getValues();
  const idx = data.findIndex(r => String(r[0]).trim() === noKey);
  if (idx === -1) return SpreadsheetApp.getUi().alert(`找不到第 ${noKey} 條`);

  const overwrite = (cfg.overwrite === 'true');
  const outCell = sh.getRange(idx + 2, 4);
  if (!overwrite && outCell.getValue()) return;

  const body = String(data[idx][2] || '');
  SpreadsheetApp.getActiveSpreadsheet().toast(`🔄 正在處理第 ${noKey} 條...`, '法務智研', 5);

  try {
    const ai = cachedGlossaryTeaching_(noKey, body);
    const note = composeNoteBlock_(cfg, noKey, body, ai.glossary, ai.teaching);
    outCell.setValue(note);
    SpreadsheetApp.getActiveSpreadsheet().toast(`✅ 完成第 ${noKey} 條`, '法務智研', 3);
  } catch (e) {
    Logger.log(`❌ 處理失敗（${noKey}）：${e.message}`);
    const note = composeNoteBlock_(cfg, noKey, body, [], '');
    outCell.setValue(note);
  }
}

function formatBatchNotes() {
  const ui = SpreadsheetApp.getUi();
  const a = ui.prompt('起始條號（整數）', '例如：1', ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  const b = ui.prompt('結束條號（整數）', '例如：100', ui.ButtonSet.OK_CANCEL);
  if (b.getSelectedButton() !== ui.Button.OK) return;

  const startNo = parseInt(a.getResponseText(),10);
  const endNo   = parseInt(b.getResponseText(),10);
  const sh = getLawSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return SpreadsheetApp.getUi().alert('請先抓取法條');
  const cfg = getCurrentConfig_();
  const data = sh.getRange(2, 1, lastRow - 1, 3).getValues();
  const overwrite = (cfg.overwrite === 'true');
  let done = 0;

  for (let i = 0; i < data.length; i++) {
    const noKey = String(data[i][0] || '');
    const base = parseInt(noKey.split('-')[0] || '0', 10);
    if (!(base >= startNo && base <= endNo)) continue;

    const outCell = sh.getRange(i + 2, 4);
    if (!overwrite && outCell.getValue()) continue;

    const body = String(data[i][2] || '');
    SpreadsheetApp.getActiveSpreadsheet().toast(`🔄 第 ${noKey} 條處理中…`, '法務智研', 5);

    try {
      const ai = cachedGlossaryTeaching_(noKey, body);
      const note = composeNoteBlock_(cfg, noKey, body, ai.glossary, ai.teaching);
      outCell.setValue(note);
      if (++done % 30 === 0) SpreadsheetApp.flush();
    } catch (e) {
      Logger.log(`⚠️ ${noKey}：${e.message}`);
      outCell.setValue(composeNoteBlock_(cfg, noKey, body, [], ''));
    }
  }
  SpreadsheetApp.getActiveSpreadsheet().toast(`✅ 批次完成（${done} 筆）`, '法務智研', 5);
}

function autoFillCasesBatch() {
  const ui = SpreadsheetApp.getUi();
  const a = ui.prompt('起始條號（整數）', '例如：1', ui.ButtonSet.OK_CANCEL);
  if (a.getSelectedButton() !== ui.Button.OK) return;
  const b = ui.prompt('結束條號（整數）', '例如：200', ui.ButtonSet.OK_CANCEL);
  if (b.getSelectedButton() !== ui.Button.OK) return;

  const startNo = parseInt((a.getResponseText() || '').trim(), 10);
  const endNo   = parseInt((b.getResponseText() || '').trim(), 10);
  if (!(startNo >= 1 && endNo >= startNo)) { ui.alert('區間輸入錯誤'); return; }

  const sh = getLawSheet_();
  const lastRow = sh.getLastRow();
  if (lastRow < 2) return ui.alert('請先抓取法條');

  const data = sh.getRange(2, 1, lastRow - 1, 4).getValues();
  let updated = 0;

  for (let i = 0; i < data.length; i++) {
    const noKey = String(data[i][0] || '');
    if (!noKey) continue;
    const base = parseInt(noKey.split('-')[0] || '0', 10);
    if (!(base >= startNo && base <= endNo)) continue;

    const outCell = sh.getRange(i + 2, 4);
    const curr = String(outCell.getValue() || '');
    if (/\n判例\n(?!（\.\.\.）)[\s\S]+/.test(curr)) continue;

    const res = autoUpdateValuableCase_(noKey);
    if (res && res.updated) updated++;
    if (updated % 20 === 0) SpreadsheetApp.flush();
  }

  ui.alert(`✅ 批次完成。此次自動填入：${updated} 筆。`);
}
