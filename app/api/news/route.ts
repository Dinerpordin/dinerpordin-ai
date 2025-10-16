// app/api/headlines/route.ts
// Fetches headlines from trusted RSS feeds, then uses OpenAI to select
// key stories, summarize, and optionally translate to Bangla.
//
// Query params:
//   country=bd|gb|us (optional; influences feed set & prompting)
//   topic=world|sports|technology|business|science|health (optional)
//   lang=en|bn (default: en)
//   count=5..12 (default: 8) number of final items
//   translate=bn (optional) if you want Bengali summaries regardless of lang
//
// Response: { items: Array<{ title, summary, url, source, topic, lang }> }

export const runtime = 'nodejs';
export const revalidate = 300; // 5 minutes CDN cache

type RawItem = { title: string; link: string; image?: string; source?: string; };
type FinalItem = { title: string; summary: string; url: string; source: string; topic: string; lang: string };

const DEFAULT_COUNT = 8;

const COMMON_FEEDS = {
  world: [
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://www.aljazeera.com/xml/rss/all.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    'https://feeds.reuters.com/reuters/worldNews',
    'https://rss.cnn.com/rss/edition_world.rss'
  ],
  general: [
    'https://feeds.bbci.co.uk/news/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml',
    'https://feeds.reuters.com/reuters/topNews',
    'https://rss.cnn.com/rss/edition.rss'
  ],
  sports: [
    'https://www.bbc.co.uk/sport/rss.xml',
    'https://www.espn.com/espn/rss/news'
  ],
  technology: [
    'https://www.theverge.com/rss/index.xml',
    'https://feeds.arstechnica.com/arstechnica/technology-lab',
    'https://www.engadget.com/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml'
  ],
  business: [
    'https://feeds.reuters.com/reuters/businessNews',
    'https://rss.nytimes.com/services/xml/rss/nyt/Business.xml',
    'https://feeds.bbci.co.uk/news/business/rss.xml'
  ],
  science: [
    'https://www.science.org/rss/news_current.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/Science.xml'
  ],
  health: [
    'https://feeds.bbci.co.uk/news/health/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/Health.xml'
  ]
};

// Bangladesh-relevant feeds (Bangla + regional)
const BD_FEEDS = {
  world: [
    'https://www.aljazeera.com/xml/rss/all.xml',
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://rss.nytimes.com/services/xml/rss/nyt/World.xml'
  ],
  general: [
    'https://feeds.bbci.co.uk/bengali/rss.xml',        // BBC Bangla
    'https://en.prothomalo.com/feed',                  // Prothom Alo (English)
    'https://www.prothomalo.com/feed'                  // Prothom Alo (Bangla)
  ],
  sports: [
    'https://www.bbc.co.uk/sport/rss.xml'
  ],
  technology: [
    'https://www.theverge.com/rss/index.xml'
  ],
  business: [
    'https://feeds.reuters.com/reuters/businessNews'
  ]
};

function pickFeeds(country: string, topic: string): string[] {
  const t = topic || 'world';
  const isBD = country === 'bd';
  const base = isBD ? BD_FEEDS : COMMON_FEEDS;
  const chosen = base[t as keyof typeof base] || base.world;
  // Add general feeds to widen coverage
  const general = base.general || [];
  return Array.from(new Set([...(chosen || []), ...general])).slice(0, 8);
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const country = (searchParams.get('country') || 'gb').toLowerCase();
  const topic   = (searchParams.get('topic') || 'world').toLowerCase();
  const lang    = (searchParams.get('lang') || 'en').toLowerCase();
  const count   = Math.min(Math.max(parseInt(searchParams.get('count') || '') || DEFAULT_COUNT, 5), 12);
  const translate = (searchParams.get('translate') || '').toLowerCase();

  // 1) Gather headlines from RSS
  const feeds = pickFeeds(country, topic);
  let raw: RawItem[] = [];
  for (const url of feeds) {
    try {
      const r = await fetch(url, { cache: 'no-store' });
      const xml = await r.text();
      const items = parseRSS(xml).slice(0, 8).map(i => ({
        title: i.title, link: i.link, image: i.image,
        source: i.source || hostOf(url),
      }));
      raw = raw.concat(items);
      if (raw.length > 80) break; // bound list size
    } catch {
      // ignore broken feed
    }
  }
  // basic de-dupe by title
  const seen = new Set<string>();
  raw = raw.filter(i => {
    const k = (i.title || '').toLowerCase();
    if (!k || seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  // 2) Ask OpenAI to pick top stories + summarize
  const finalLang = translate === 'bn' ? 'bn' : lang;
  const items = await summarizeWithOpenAI(raw, {
    country, topic, lang: finalLang, count
  });

  return json({ items, country, topic, lang: finalLang, provider: 'openai+rss' });
}

// -------------------- OpenAI summarizer --------------------

async function summarizeWithOpenAI(raw: RawItem[], opts: { country: string; topic: string; lang: string; count: number; }) {
  const { country, topic, lang, count } = opts;

  const system = `You are a news curator. From the provided headlines, pick the ${count} most important, diverse stories for a general audience in ${country.toUpperCase()}.
- Prefer original reporting from major outlets (BBC, CNN, Al Jazeera, NYTimes, Reuters, BBC Bangla, Prothom Alo).
- Avoid duplicates and sensational duplicates of the same event.
- Output concise JSON only.`;

  const user = {
    instruction: `Return an array of objects with: title, summary (2 sentences, plain text), url, source, topic, lang.
Language for title+summary must be: ${lang}.
If a headline is already in ${lang}, keep it; otherwise translate.
Topic should be one of: world, sports, technology, business, science, health, general.`,
    country, topic, count,
    headlines: raw.slice(0, 80), // cap
  };

  const body = {
    model: 'gpt-4o-mini',
    temperature: 0.3,
    messages: [
      { role: 'system', content: system },
      { role: 'user', content: JSON.stringify(user) }
    ],
    response_format: { type: 'json_object' }
  };

  const resp = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'authorization': `Bearer ${process.env.OPENAI_API_KEY || ''}`
    },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const text = await resp.text();
    return fallbackPick(raw, count, lang, text);
  }

  try {
    const data = await resp.json();
    const content = data.choices?.[0]?.message?.content || '{}';
    const parsed = JSON.parse(content);
    let items = (parsed?.items || parsed || []) as FinalItem[];
    // sanitize + limit
    items = (Array.isArray(items) ? items : []).map(x => ({
      title: String(x.title || '').trim(),
      summary: String(x.summary || '').trim(),
      url: String(x.url || ''),
      source: String(x.source || hostOf(x.url || '') || 'news'),
      topic: String(x.topic || 'general').toLowerCase(),
      lang: String(x.lang || lang),
    })).filter(x => x.title && x.url).slice(0, count);

    if (items.length) return items;
    return fallbackPick(raw, count, lang, 'empty-ai');
  } catch {
    return fallbackPick(raw, count, lang, 'parse-error');
  }
}

function fallbackPick(raw: RawItem[], count: number, lang: string, reason: string): FinalItem[] {
  return raw.slice(0, count).map(i => ({
    title: i.title,
    summary: lang === 'bn'
      ? 'সংক্ষিপ্তসার অনুপলব্ধ (ব্যাকআপ আউটপুট)।'
      : 'Summary unavailable (fallback output).',
    url: i.link,
    source: i.source || hostOf(i.link),
    topic: 'general',
    lang
  }));
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
  return s.replace(/&amp;/g,'&').replace(/&lt;/g,'<')
          .replace(/&gt;/g,'>').replace(/&quot;/g,'"')
          .replace(/&#39;/g,"'");
}
function strip(s: string) {
  return s.replace(/<!\[CDATA\[(.*?)\]\]>/g, '$1').trim();
}
function hostOf(url: string) {
  try { return new URL(url).host.replace(/^www\./, ''); } catch { return 'news'; }
}
