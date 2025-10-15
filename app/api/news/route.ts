// app/api/news/route.ts
export const revalidate = 600;
export const runtime = 'nodejs';

type Article = { title: string; url: string; urlToImage?: string | null; source: { name: string } };

const ALLOWED_TOPICS = new Set([
  'breaking-news','world','nation','business','technology',
  'entertainment','sports','science','health'
]);

function clampTopic(raw?: string | null) {
  const t = (raw || '').toLowerCase();
  return ALLOWED_TOPICS.has(t) ? t : undefined;
}

function j(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const country = (searchParams.get('country') || 'gb').toLowerCase();
  const topic   = clampTopic(searchParams.get('topic')) || 'world';
  const lang    = (searchParams.get('lang') || 'en').toLowerCase();
  const q       = searchParams.get('q') || undefined;

  // 1) Try GNews (if key present)
  const gKey = process.env.GNEWS_API_KEY || process.env.NEWS_API_KEY || '';
  if (gKey) {
    const a = await fromGNews({ gKey, country, topic, lang, q });
    if (a.ok) return j({ articles: a.articles, country, topic, lang });
    // keep reason for debugging but don’t fail
  }

  // 2) Optional: NewsData.io fallback (add NEWSDATA_API_KEY to Vercel to enable)
  const ndKey = process.env.NEWSDATA_API_KEY || '';
  if (ndKey) {
    const a = await fromNewsData({ ndKey, country, topic, lang, q });
    if (a.ok) return j({ articles: a.articles, country, topic, lang });
  }

  // 3) RSS fallback (no key)
  const a = await fromRSS({ country, topic, lang, q });
  return j({ articles: a.articles, country, topic, lang, warning: a.warning ?? null });
}

// ------------------------- providers -------------------------

async function fromGNews({
  gKey, country, topic, lang, q
}: { gKey: string; country: string; topic: string; lang: string; q?: string }) {
  try {
    const base = 'https://gnews.io/api/v4/top-headlines';
    const params = new URLSearchParams({ country, topic, lang, max: '12', token: gKey });
    if (q) params.set('q', q);

    const r = await fetch(`${base}?${params.toString()}`, { cache: 'no-store' });
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      return { ok: false, reason: `gnews/non-json ${r.status}` };
    }
    const data = await r.json().catch(() => null);
    if (!r.ok || !data) return { ok: false, reason: `gnews/${r.status}` };

    const articles: Article[] = Array.isArray(data?.articles)
      ? data.articles.map((a: any) => ({
          title: a.title, url: a.url, urlToImage: a.image ?? null,
          source: { name: a.source?.name || 'GNews' }
        }))
      : [];
    return { ok: true, articles };
  } catch (e) {
    return { ok: false, reason: 'gnews/exception' };
  }
}

async function fromNewsData({
  ndKey, country, topic, lang, q
}: { ndKey: string; country: string; topic: string; lang: string; q?: string }) {
  try {
    // map our topic to NewsData.io's category names where possible
    const map: Record<string,string> = {
      world: 'world', business:'business', technology:'technology',
      entertainment:'entertainment', sports:'sports', science:'science', health:'health'
    };
    const category = map[topic] || 'top';

    const base = 'https://newsdata.io/api/1/news';
    const params = new URLSearchParams({
      apikey: ndKey, country, language: lang, category, page: '1'
    });
    if (q) params.set('q', q);

    const r = await fetch(`${base}?${params.toString()}`, { cache: 'no-store' });
    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('application/json')) return { ok: false, reason: `newsdata/non-json ${r.status}` };
    const data = await r.json().catch(() => null);
    if (!r.ok || !data) return { ok: false, reason: `newsdata/${r.status}` };

    const items = Array.isArray(data?.results) ? data.results : [];
    const articles: Article[] = items.slice(0,12).map((a: any) => ({
      title: a.title,
      url: a.link || a.url,
      urlToImage: a.image_url || a.image || null,
      source: { name: a.source_id || a.source || 'NewsData' }
    })).filter((x: Article) => !!x.title && !!x.url);
    return { ok: true, articles };
  } catch {
    return { ok: false, reason: 'newsdata/exception' };
  }
}

async function fromRSS({
  country, topic, lang, q
}: { country: string; topic: string; lang: string; q?: string }) {
  // choose a couple of stable feeds by topic (no keys)
  const feeds: string[] = selectFeeds(topic, country);
  let all: Article[] = [];
  for (const url of feeds) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      const xml = await r.text();
      const items = parseRSS(xml).slice(0, 6); // take a few from each
      const mapped: Article[] = items.map(it => ({
        title: it.title,
        url: it.link,
        urlToImage: it.image || null,
        source: { name: it.source || hostOf(url) }
      }));
      all = all.concat(mapped);
      if (all.length >= 12) break;
    } catch {/* skip */}
  }
  // simple keyword filter if q provided
  if (q) {
    const qq = q.toLowerCase();
    all = all.filter(a => a.title.toLowerCase().includes(qq));
  }
  return { articles: all.slice(0,12), warning: all.length ? null : 'rss-empty' };
}

function selectFeeds(topic: string, country: string): string[] {
  // safe, globally accessible feeds (no keys).
  // For Bangladesh, bias to Asia/World feeds that regularly include BD items.
  const world = [
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://www.aljazeera.com/xml/rss/all.xml'
  ];
  const sports = [
    'https://www.espn.com/espn/rss/news',
    'https://www.bbc.co.uk/sport/rss.xml'
  ];
  const tech = [
    'https://www.theverge.com/rss/index.xml',
    'https://feeds.arstechnica.com/arstechnica/technology-lab'
  ];

  if (topic === 'sports') return sports;
  if (topic === 'technology') return tech;
  return world; // default
}

// -------------- tiny RSS parser (no deps) -------------------

function parseRSS(xml: string) {
  // very small XML -> object parser good enough for common RSS formats
  const items: any[] = [];
  const itemRe = /<item[\s\S]*?<\/item>/gi;
  const get = (s: string, tag: string) => {
    const m = s.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
    return m ? decode(m[1]) : '';
  };
  const getAttr = (s: string, tag: string, attr: string) => {
    const m = s.match(new RegExp(`<${tag}[^>]*${attr}="([^"]+)"[^>]*\\/?>`, 'i'));
    return m ? m[1] : '';
  };
  let m: RegExpExecArray | null;
  while ((m = itemRe.exec(xml))) {
    const block = m[0];
    const title = strip(get(block, 'title'));
    const link  = strip(get(block, 'link')) || getAttr(block, 'link', 'href');
    const source = strip(get(block, 'source')) || hostOf(link);
    // try common image locations
    const media = getAttr(block, 'media:content', 'url') ||
                  getAttr(block, 'enclosure', 'url') ||
                  getAttr(block, 'media:thumbnail', 'url') || '';
    items.push({ title, link, source, image: media });
  }
  return items;
}

function decode(s: string) {
  return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>')
          .replace(/&quot;/g,'"').replace(/&#39;/g,"'");
}
function strip(s: string) {
  return s.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
}
function hostOf(url: string) {
  try { return new URL(url).host.replace(/^www\./,''); } catch { return 'news'; }
}
