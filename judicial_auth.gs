/****************************************************
 * judicial_auth.gs — 司法院授權（v3.8）
 ****************************************************/
function jy_setPasswordOnly() {
  const ui = SpreadsheetApp.getUi();
  const pwd = ui.prompt('輸入司法院 JDG 密碼（帳號固定：' + JDG_FIXED_ACCOUNT + '）', '', ui.ButtonSet.OK_CANCEL);
  if (pwd.getSelectedButton() !== ui.Button.OK) return;
  const up = PropertiesService.getUserProperties();
  up.setProperty('JDG_USER', JDG_FIXED_ACCOUNT);
  up.setProperty('JDG_PASS', (pwd.getResponseText() || '').trim());
  up.deleteProperty('JDG_TOKEN');
  up.deleteProperty('JDG_TOKEN_AT');
  ui.alert('✅ 已儲存 JDG 密碼（帳號固定 ' + JDG_FIXED_ACCOUNT + '）');
}

function jy_testAuth() {
  try { jy_getToken_(); SpreadsheetApp.getUi().alert('✅ 授權成功，已取得 token。'); }
  catch(e) { SpreadsheetApp.getUi().alert('❌ 授權失敗：' + e.message); }
}

function safeGetToken_() { try { return jy_getToken_(); } catch(e) { return null; } }

function jy_getToken_() {
  const up = PropertiesService.getUserProperties();
  const account = up.getProperty('JDG_USER') || JDG_FIXED_ACCOUNT;
  const pwd     = up.getProperty('JDG_PASS');
  if (!pwd) throw new Error('尚未設定 JDG 密碼（選單：設定司法院密碼）');

  const cached = up.getProperty('JDG_TOKEN');
  const at = parseInt(up.getProperty('JDG_TOKEN_AT') || '0', 10);
  if (cached && (Date.now() - at) < 5.5 * 60 * 60 * 1000) return cached;

  const url = 'https://opendata.judicial.gov.tw/api/MemberTokens';
  const payload = { memberAccount: account, pwd: pwd };
  const res = UrlFetchApp.fetch(url, {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true,
  });

  const code = res.getResponseCode();
  const txt  = res.getContentText();
  if (code >= 400) throw new Error('授權失敗：HTTP ' + code + '｜' + txt.slice(0,200));

  let obj; try { obj = JSON.parse(txt); } catch(e) { throw new Error('授權回應不是 JSON：' + txt.slice(0,200)); }
  const token = obj.token;
  if (!token) throw new Error('授權成功但未回傳 token：' + txt.slice(0,200));

  up.setProperty('JDG_TOKEN', token);
  up.setProperty('JDG_TOKEN_AT', String(Date.now()));
  return token;
}
