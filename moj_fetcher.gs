/****************************************************
 * moj_fetcher.gs — 抓取 MOJ 條文並寫入 A~C（4模組 版 v3.8.2）
 ****************************************************/
function fetchAndParseLaw() {
  const cfg = getCurrentConfig_();
  const url = `${cfg.lawUrlBase}?pcode=${encodeURIComponent(cfg.pcode)}`;
  const html = fetchWithRetry_(url, 3, 800);
  if (!html) { SpreadsheetApp.getUi().alert(`❌ 無法取得法條頁面（${url}）。`); return; }

  const { articles } = parseMOJHtmlToArticlesSafe_(html);
  if (!articles.length) {
    SpreadsheetApp.getUi().alert(`❌ 解析失敗：未找到任何「第 N 條」。\n目前 pcode：${cfg.pcode}`);
    return;
  }

  const sh = getLawSheet_();
  sh.clearContents();
  sh.getRange(1, 1, 1, 5).setValues([['條號', '關鍵字', '條文', '輸出', '標籤']]);
  const rows = articles.map(a => [a.noKey, '', a.body, '', a.tags?.join('，') || '']);
  sh.getRange(2, 1, rows.length, 5).setValues(rows);
  SpreadsheetApp.getUi().alert(`✅ 抓取完成，共 ${rows.length} 條。`);
}

function fetchWithRetry_(url, maxRetry, baseDelayMs) {
  for (let i = 0; i < maxRetry; i++) {
    try {
      const res = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      const code = res.getResponseCode();
      if (code === 200) return res.getContentText('utf-8');
      if (code === 404) return null;
      Utilities.sleep(baseDelayMs * Math.pow(2, i));
    } catch (e) {
      Utilities.sleep(baseDelayMs * Math.pow(2, i));
    }
  }
  return null;
}

/** HTML → 條目（支援 15-1／之 1 等） */
function parseMOJHtmlToArticlesSafe_(html) {
  const clean = String(html)
    .replace(/\r/g, '')
    .replace(/\t/g, ' ')
    .replace(/<br\s*\/?>/gi, '\n');

  const headingLines = [];
  clean.replace(/>[^<]+</g, m => {
    const s = m.slice(1, -1).trim();
    if (/^第[一二三四五六七八九十百千〇零○0-9]+\s*(編|章|節|款|目)/.test(s)) headingLines.push(s);
    return m;
  });

  const headerRe = /第\s*(\d+)\s*(?:[-－]\s*(\d+)|之\s*(\d+))?\s*條/g;
  const matches = [];
  let mm;
  while ((mm = headerRe.exec(clean)) !== null) {
    const base = parseInt(mm[1], 10);
    const sub  = mm[2] ? parseInt(mm[2], 10) : (mm[3] ? parseInt(mm[3], 10) : 0);
    matches.push({ index: mm.index, base, sub });
  }

  if (!matches.length) {
    const soft = clean.split(/\n(?=第\s*\d+.*?條)/).filter(Boolean);
    if (soft.length < 1) return { articles: [], warnings: ['未命中 headerRe'] };
    const articles = soft.map(seg => {
      const h = seg.match(/^第\s*(\d+)\s*(?:[-－]\s*(\d+)|之\s*(\d+))?\s*條/);
      if (!h) return null;
      const base = parseInt(h[1], 10);
      const sub  = h[2] ? parseInt(h[2], 10) : (h[3] ? parseInt(h[3], 10) : 0);
      const noKey = (sub && sub > 0) ? `${base}-${sub}` : `${base}`;
      const body = seg.replace(/^第\s*\d+\s*(?:[-－]\s*\d+|之\s*\d+)?\s*條\s*/, '')
                      .replace(/<[^>]+>/g, '').trim();
      return { noKey, name: '', body, tags: Array.from(new Set(headingLines)).slice(-3) };
    }).filter(Boolean);
    return { articles, warnings: ['寬鬆切片'] };
  }

  const articles = [];
  for (let i = 0; i < matches.length; i++) {
    const curr = matches[i];
    const nextStart = (i + 1 < matches.length) ? matches[i + 1].index : clean.length;
    const segment = clean.substring(curr.index, nextStart);

    const text = segment.replace(/<[^>]+>/g, ' ').replace(/\u00A0/g, ' ')
                        .replace(/\s+\n/g, '\n').trim();
    const body  = text.replace(/^第\s*\d+\s*(?:[-－]\s*\d+|之\s*\d+)?\s*條\s*/, '').trim();
    const noKey = (curr.sub && curr.sub > 0) ? `${curr.base}-${curr.sub}` : `${curr.base}`;
    articles.push({ noKey, name: '', body, tags: Array.from(new Set(headingLines)).slice(-3) });
  }
  return { articles, warnings: [] };
}
