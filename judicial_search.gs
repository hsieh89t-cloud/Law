/****************************************************
 * judicial_search.gs — 逐關鍵字查判例＋類型判定（v3.8）
 ****************************************************/
function getKeywordsSeqForNo_(noKey) {
  const cfg = getCurrentConfig_();
  const sh = getLawSheet_();
  const last = sh.getLastRow();
  if (last < 2) return [];

  const data = sh.getRange(2, 1, last - 1, 3).getValues(); // A B C
  const idx = data.findIndex(r => String(r[0]).trim() === String(noKey).trim());
  if (idx === -1) return [];

  let b = String(data[idx][1] || '').trim();
  const body = String(data[idx][2] || '').trim();

  if (!b && body) {
    const kws = generateKeywordsFromArticle_(noKey, body);
    if (kws.length) {
      b = kws.slice(0,8).join('、');
      sh.getRange(idx + 2, 2).setValue(b);
    }
  }

  const shortLaw = shortLawName_(cfg.lawName);
  const base     = String(noKey).split('-')[0];
  const exact    = `${shortLaw}第${base}條`;

  const list = (b ? b.split(/[、，,;；\s]+/) : []).map(s => s.trim()).filter(Boolean);
  const seen = new Set([exact]);
  const seq = [exact];
  for (const w of list) { if (!seen.has(w)) { seen.add(w); seq.push(w); } }
  return seq;
}

function providerJudicialSearchOne_(keyword, top) {
  const token = safeGetToken_();
  if (!token) return null;

  const url = 'https://opendata.judicial.gov.tw/api/JudicialData?keyword='
    + encodeURIComponent(String(keyword || '')) + '&top=' + encodeURIComponent(top || 20);

  try {
    const res = UrlFetchApp.fetch(url, {
      method: 'get',
      headers: { Authorization: 'Bearer ' + token },
      muteHttpExceptions: true
    });
    if (res.getResponseCode() >= 400) return null;
    let arr; try { arr = JSON.parse(res.getContentText()); } catch(e) { return null; }
    if (!Array.isArray(arr) || !arr.length) return null;

    let best = null, bestScore = -1;
    for (const item of arr) {
      let s = 0;
      if (item.isImportantJudgment) s += 5;
      if (/最高法院|憲法法庭|大法官/.test(String(item.court || ''))) s += 3;
      if (/判例|要旨/.test(String(item.title || ''))) s += 2;
      if ((String(item.title || '') + String(item.summary || '')).includes(String(keyword))) s += 2;
      if ((item.summary || '').length > 30) s += 1;
      if (s > bestScore) { bestScore = s; best = item; }
    }
    if (!best || bestScore < 2) return null;

    return {
      caseNo: (best.caseNo || '').toString().trim(),
      title: (best.title || '').toString().trim(),
      summary: (best.summary || '').toString().trim(),
      url: (best.url || '').toString().trim(),
      court: (best.court || '').toString().trim(),
      isImportantJudgment: !!best.isImportantJudgment
    };
  } catch(e) { return null; }
}

function classifyRelationType_(hit, lawName, noKey, keyword) {
  const short = shortLawName_(lawName);
  const base  = String(noKey).split('-')[0];
  const patterns = [
    new RegExp(`${short}\\s*第\\s*${base}\\s*條`),
    new RegExp(`第\\s*${base}\\s*條`),
    new RegExp(`§\\s*${base}`)
  ];
  const text = (hit.title + ' ' + hit.summary).replace(/\s+/g,'');
  if (patterns.some(re => re.test(text))) return 'A';
  const kw = String(keyword || '').replace(/\s+/g,'');
  if (kw && text.includes(kw)) return 'B';
  return 'C';
}

function autoUpdateValuableCase_(noKey) {
  const cfg = getCurrentConfig_();
  const seq = getKeywordsSeqForNo_(noKey);
  if (!seq.length) return { updated:false };

  for (let i = 0; i < seq.length; i++) {
    const kw = seq[i];
    SpreadsheetApp.getActiveSpreadsheet().toast(`🔎 查找：${kw}（${i+1}/${seq.length}）`, '法務智研', 3);
    const hit = providerJudicialSearchOne_(kw, 25);
    if (hit) {
      const type = classifyRelationType_(hit, cfg.lawName, noKey, kw);
      return writeCaseBlockFromHit_(noKey, { caseNo: hit.caseNo, type: type, url: hit.url, summary: hit.summary });
    }
  }

  if (USE_CLASSIC_CASES) {
    const classic = classicCaseFallback_(cfg.lawName, noKey);
    if (classic) return writeCaseBlockFromHit_(noKey, { caseNo: classic.caseNo, type: 'C', url: classic.url, summary: classic.summary });
  }

  return { updated:false };
}

function autoUpdateValuableCaseDialog() {
  const ui = SpreadsheetApp.getUi();
  const no = ui.prompt('輸入條號（例如：62 或 15-1）', '', ui.ButtonSet.OK_CANCEL);
  if (no.getSelectedButton() !== ui.Button.OK) return;
  const noKey = (no.getResponseText() || '').trim();
  if (!noKey) return ui.alert('請輸入條號');

  const res = autoUpdateValuableCase_(noKey);
  if (res && res.updated) ui.alert('✅ 已自動更新該條之判例段（逐關鍵字）');
  else ui.alert('⚠️ 未找到合適裁判，判例維持（...）。');
}

function classicCaseFallback_(lawName, noKey) { return null; }
