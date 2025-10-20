/****************************************************
 * config.gs — 全域設定、金鑰、共用工具（v3.8）
 ****************************************************/
const CONFIG = {
  pcode: 'B0000001',
  lawName: '中華民國民法',
  lawUrlBase: 'https://law.moj.gov.tw/LawClass/LawAll.aspx',
  openaiModel: 'gpt-4o-mini',
  overwrite: 'false'
};

const JDG_FIXED_ACCOUNT = 'v3681';
const USE_CLASSIC_CASES = false;

const LAW_TABLE = {
  '民法':   { pcode: 'B0000001', lawName: '中華民國民法' },
  '刑法':   { pcode: 'C0000001', lawName: '中華民國刑法' },
  '憲法':   { pcode: 'A0000001', lawName: '中華民國憲法' },
  '商標法': { pcode: 'J0070001', lawName: '中華民國商標法' }
};

function getCurrentConfig_() {
  const prop = PropertiesService.getDocumentProperties();
  return {
    pcode: prop.getProperty('pcode') || CONFIG.pcode,
    lawName: prop.getProperty('lawName') || CONFIG.lawName,
    lawUrlBase: CONFIG.lawUrlBase,
    openaiModel: prop.getProperty('openai_model') || CONFIG.openaiModel,
    overwrite: (prop.getProperty('overwrite') || CONFIG.overwrite).toLowerCase()
  };
}

function getLawSheet_() {
  return SpreadsheetApp.getActive().getSheetByName('law') || SpreadsheetApp.getActive().getActiveSheet();
}

function shortLawName_(full) {
  return String(full || '').replace(/^中華民國/, '').replace(/\s+/g,'').trim();
}

function setOpenAIKey() { ensureOpenAIKey_(); }

function ensureOpenAIKey_() {
  const key = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if (!key || !/^sk-/.test(key)) {
    const ui = SpreadsheetApp.getUi();
    const res = ui.prompt('請輸入 OpenAI API 金鑰', '格式：sk-xxxx', ui.ButtonSet.OK);
    if (res.getSelectedButton() !== ui.Button.OK) throw new Error('未設定 OPENAI_API_KEY');
    const newKey = (res.getResponseText() || '').trim();
    PropertiesService.getScriptProperties().setProperty('OPENAI_API_KEY', newKey);
    ui.alert('✅ 已儲存 OPENAI_API_KEY');
    return newKey;
  }
  return key;
}

function quickSelectLaw() {
  const ui = SpreadsheetApp.getUi();
  const names = Object.keys(LAW_TABLE);
  const list = names.map((n, i) => `${i + 1}. ${n}`).join('\n');
  const res = ui.prompt(`請選擇法規：\n${list}`, '', ui.ButtonSet.OK_CANCEL);
  if (res.getSelectedButton() !== ui.Button.OK) return;
  const idx = parseInt(res.getResponseText(), 10);
  const key = names[idx - 1];
  if (!key) return ui.alert('輸入錯誤');
  const law = LAW_TABLE[key];
  const prop = PropertiesService.getDocumentProperties();
  prop.setProperty('pcode', law.pcode);
  prop.setProperty('lawName', law.lawName);
  ui.alert(`✅ 已切換至：${law.lawName}`);
}

function setLawByPcodeDialog() {
  const ui = SpreadsheetApp.getUi();
  const p = ui.prompt('輸入 pcode', '例如：B0000001', ui.ButtonSet.OK_CANCEL);
  if (p.getSelectedButton() !== ui.Button.OK) return;
  const n = ui.prompt('輸入法名（完整，如：中華民國民法）', '', ui.ButtonSet.OK_CANCEL);
  if (n.getSelectedButton() !== ui.Button.OK) return;
  const prop = PropertiesService.getDocumentProperties();
  prop.setProperty('pcode', (p.getResponseText() || '').trim());
  prop.setProperty('lawName', (n.getResponseText() || '').trim());
  ui.alert('✅ 已更新 pcode 與法名');
}

function showCurrentConfig() {
  const cfg = getCurrentConfig_();
  const msg = `目前設定：
法規：${cfg.lawName}
代碼：${cfg.pcode}
模型：${cfg.openaiModel}
覆寫D欄：${cfg.overwrite}
司法院帳號（固定）：${JDG_FIXED_ACCOUNT}
司法院密碼：${PropertiesService.getUserProperties().getProperty('JDG_PASS') ? '已設定' : '未設定'}`;
  SpreadsheetApp.getUi().alert(msg);
}
