/****************************************************
 * moj_parser.gs — MOJ HTML 解析（v3.8）
 ****************************************************/
function parseMOJHtmlToArticlesSafe_(html) {
  const warnings = [];
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
      return { noKey, name: '', body, tags: [] };
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
    articles.push({ noKey, name: '', body, tags: [] });
  }
  return { articles, warnings: [] };
}
