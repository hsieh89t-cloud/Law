/****************************************************
 * ai_helpers.gs — 關鍵字與詞彙教學（v3.8）
 ****************************************************/
function genKeywordsForEmptyB() {
  const sh = getLawSheet_();
  const last = sh.getLastRow();
  if (last < 2) return SpreadsheetApp.getUi().alert('請先抓取法條');

  const data = sh.getRange(2, 1, last - 1, 3).getValues(); // A B C
  let done = 0;
  for (let i = 0; i < data.length; i++) {
    const noKey = String(data[i][0] || '').trim();
    const b     = String(data[i][1] || '').trim();
    const body  = String(data[i][2] || '').trim();
    if (!noKey || b || !body) continue;

    try {
      const kws = generateKeywordsFromArticle_(noKey, body);
      const text = (Array.isArray(kws) ? kws : []).slice(0,8).join('、');
      if (text) { sh.getRange(i + 2, 2).setValue(text); done++; }
      if (done % 20 === 0) SpreadsheetApp.flush();
    } catch(e) {
      Logger.log('genKeywords error @ ' + noKey + ': ' + e.message);
    }
  }
  SpreadsheetApp.getUi().alert(`✅ 關鍵字產生完成：填入 ${done} 筆（僅 B 欄原本為空）。`);
}

function generateKeywordsFromArticle_(noKey, body) {
  const apiKey = ensureOpenAIKey_();
  const sys = `你是台灣法律助理。僅根據提供的單一「法條全文」，產出繁體中文關鍵字陣列，用於搜尋相關裁判。避免過度寬泛或過長字串，不要含標點符號。輸出有效 JSON，格式：
{"keywords": ["關鍵字1","關鍵字2","..."]}（3~8 個）`;
  const user = `條號：${noKey}\n條文全文：\n${body}`;

  const payload = {
    model: getCurrentConfig_().openaiModel,
    messages: [{ role: 'system', content: sys }, { role: 'user', content: user }],
    temperature: 0.2,
    max_tokens: 200
  };

  const res = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
    method: 'post',
    headers: { Authorization: `Bearer ${apiKey}` },
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  if (res.getResponseCode() >= 400) return [];
  try {
    const outer = JSON.parse(res.getContentText());
    const content = outer?.choices?.[0]?.message?.content || '{}';
    const obj = JSON.parse(content);
    return Array.isArray(obj.keywords) ? obj.keywords.map(s => String(s).trim()).filter(Boolean) : [];
  } catch(e) { return []; }
}

// 選配：詞彙／教學
function cachedGlossaryTeaching_(noKey, body) {
  const dp = PropertiesService.getDocumentProperties();
  const key = 'AI_CACHE_' + Utilities.base64EncodeWebSafe(noKey + '|' + body).slice(0,64);
  const got = dp.getProperty(key);
  if (got) return JSON.parse(got);
  const ai = generateGlossaryTeachingJSON_(noKey, body);
  dp.setProperty(key, JSON.stringify(ai));
  return ai;
}
function generateGlossaryTeachingJSON_(noKey, body) {
  const apiKey = ensureOpenAIKey_();
  const cfg = getCurrentConfig_();

  const sys = `你是台灣法律筆記助理。僅根據提供的單一條文內容，輸出有效 JSON：
{
  "glossary": [{"term":"名詞","definition":"簡短解釋"}],
  "teaching": "一句白話、保持中性的教學理解"
}`;
  const user = `條號：${noKey}\n條文：${body}`;

  const payload = {
    model: cfg.openaiModel,
    messages: [
      { role: 'system', content: sys },
      { role: 'user', content: user }
    ],
    temperature: 0.2,
    max_tokens: 400
  };

  const res = UrlFetchApp.fetch('https://api.openai.com/v1/chat/completions', {
    method: 'post',
    headers: { Authorization: `Bearer ${apiKey}` },
    contentType: 'application/json',
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = res.getResponseCode();
  const txt = res.getContentText();

  let glossary = [];
  let teaching = '';

  if (code < 400) {
    try {
      const outer = JSON.parse(txt);
      const content = outer?.choices?.[0]?.message?.content || '{}';
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed.glossary)) {
        glossary = parsed.glossary.filter(x => x && x.term && x.definition).slice(0, 6);
      }
      teaching = (parsed.teaching || '').toString().trim();
    } catch (e) { }
  }
  return { glossary, teaching };
}
