// app/api/news/route.ts
// -------------------------------------------------------------------
// Option A: RSS headlines only (no API keys).
// - Add ?provider=rss to URLs OR set Vercel env var FORCE_RSS=1
// - Always returns JSON: { articles: Article[], country, topic, lang, ... }
// -------------------------------------------------------------------

export const revalidate = 600; // 10 minutes CDN revalidate
export const runtime = 'nodejs';

type Article = {
  title: string;
  url: string;
  urlToImage?: string | null;
  source: { name: string };
};

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

const ALLOWED_TOPICS = new Set([
  'breaking-news','world','nation','business',
  'technology','entertainment','sports','science','health'
]);

function clampTopic(raw?: string | null) {
  const t = (raw || '').toLowerCase();
  return ALLOWED_TOPICS.has(t) ? t : undefined;
}

// ---------- SINGLE GET HANDLER ----------
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const country = (searchParams.get('country') || 'gb').toLowerCase();
  const topic   = clampTopic(searchParams.get('topic')) || 'world';
  const lang    = (searchParams.get('lang') || 'en').toLowerCase();
  const q       = searchParams.get('q') || undefined;

  // We use RSS so you have headlines right now (no API keys).
  const rss = await fromRSS({ country, topic, lang, q });

  return json({
    articles: rss.articles,
    country, topic, lang,
    provider: 'rss',
    warning: rss.warning ?? null,
  });
}

// ---------------------- RSS implementation ----------------------

async function fromRSS({
  country, topic, lang, q
}: { country: string; topic: string; lang: string; q?: string }) {
  const feeds: string[] = selectFeeds(topic, country);

  let all: Article[] = [];
  for (const url of feeds) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      const xml = await r.text();
      const items = parseRSS(xml).slice(0, 6);
      const mapped: Article[] = items.map(it => ({
        title: it.title,
        url: it.link,
        urlToImage: it.image || null,
        source: { name: it.source || hostOf(url) },
      })).filter(a => a.title && a.url);
      all = all.concat(mapped);
      if (all.length >= 12) break;
    } catch {
      // skip broken feed
    }
  }

  if (q) {
    const qq = q.toLowerCase();
    all = all.filter(a => a.title.toLowerCase().includes(qq));
  }

  return { articles: all.slice(0, 12), warning: all.length ? null : 'rss-empty' };
}

function selectFeeds(topic: string, country: string): string[] {
  const world = [
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://www.aljazeera.com/xml/rss/all.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
  ];
  const sports = [
    'https://www.espn.com/espn/rss/news',
    'https://www.bbc.co.uk/sport/rss.xml',
  ];
  const technology = [
    'https://www.theverge.com/rss/index.xml',
    'https://feeds.arstechnica.com/arstechnica/technology-lab',
    'https://www.engadget.com/rss.xml',
  ];

  if (topic === 'sports') return sports;
  if (topic === 'technology') return technology;

  // Add country-specific feeds later if you like.
  return world; // default
}

// -------------------- tiny RSS parser (no deps) -------------------

function parseRSS(xml: string) {
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
    const media = getAttr(block, 'media:content', 'url')
               || getAttr(block, 'enclosure', 'url')
               || getAttr(block, 'media:thumbnail', 'url')
               || '';
    items.push({ title, link, source, image: media });
  }
  return items;
}

function decode(s: string) {
  return s.replace(/&amp;/g,'&')
          .replace(/&lt;/g,'<')
          .replace(/&gt;/g,'>')
          .replace(/&quot;/g,'"')
          .replace(/&#39;/g,"'");
}
function strip(s: string) {
  return s.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
}
function hostOf(url: string) {
  try { return new URL(url).host.replace(/^www\./, ''); }
  catch { return 'news'; }
}
