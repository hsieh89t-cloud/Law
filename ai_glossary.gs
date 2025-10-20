/****************************************************
 * ai_glossary.gs — 產生「專有詞彙」與「教學理解」
 ****************************************************/
const OPENAI_MODEL = 'gpt-4o-mini';

function setOpenAIKey() {
  const ui = SpreadsheetApp.getUi();
  const r = ui.prompt('設定 OpenAI API 金鑰', '請輸入以 sk- 開頭的金鑰', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  const key = (r.getResponseText() || '').trim();
  if (!/^sk-/.test(key)) return ui.alert('格式錯誤：金鑰需以 sk- 開頭');
  PropertiesService.getScriptProperties().setProperty('OPENAI_API_KEY', key);
  ui.alert('✅ 已儲存 OPENAI_API_KEY');
}

function ensureOpenAIKey_() {
  const key = PropertiesService.getScriptProperties().getProperty('OPENAI_API_KEY');
  if (!key || !/^sk-/.test(key)) throw new Error('尚未設定 OPENAI_API_KEY');
  return key;
}

function generateGlossaryTeaching_(noKey, lawName, body) {
  const apiKey = ensureOpenAIKey_();
  const sys = `你是台灣法律條文助理。僅能依「本條條文」產出，禁止引用外部法條或案例。請用中性、簡潔用語。
請以 JSON 回覆：
{
  "glossary":[{"term":"…","definition":"…"}],
  "teaching":"…"
}`;
  const user = JSON.stringify({
    articleHeader: `${lawName}第 ${noKey} 條`,
    articleBody: String(body || '')
  });

  const payload = {
    model: OPENAI_MODEL,
    messages: [{ role:'system', content:sys }, { role:'user', content:user }],
    temperature: 0.2,
    max_tokens: 300,
    response_format: { type: 'json_object' }
  };

  const res = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    headers: { Authorization: `Bearer ${apiKey}` },
    muteHttpExceptions: true
  });

  if (res.getResponseCode() >= 400) throw new Error(`HTTP ${res.getResponseCode()}: ${res.getContentText().slice(0,180)}`);

  let obj; try { obj = JSON.parse(res.getContentText()); } catch(e) { throw new Error('OpenAI 回傳非 JSON'); }
  const content = obj?.choices?.[0]?.message?.content || '{}';
  let parsed = {}; try { parsed = JSON.parse(content); } catch(e) { parsed = {}; }

  const glossary = Array.isArray(parsed.glossary)
    ? parsed.glossary.filter(x => x && x.term && x.definition).slice(0,6)
    : [];
  const teaching = (parsed.teaching || '').toString().trim().slice(0, 120);

  return { glossary, teaching };
}
