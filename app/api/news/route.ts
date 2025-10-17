// app/api/news/route.ts
import type { NextRequest } from 'next/server';

// Ensure Node runtime (not edge) for best RSS compatibility
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type Topic = 'world' | 'bangladesh' | 'sports' | 'technology';

// Feed configuration
const FEED_CONFIG: Record<Topic, string[]> = {
  world: [
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://www.theguardian.com/world/rss',
  ],
  bangladesh: [
    // English & Bangla (some may block occasionally; we skip on error)
    'https://en.prothomalo.com/feed/',
    'https://www.prothomalo.com/feed',
  ],
  sports: [
    'https://www.espn.com/espn/rss/news',
    'http://feeds.bbci.co.uk/sport/rss.xml?edition=uk',
  ],
  technology: [
    'https://www.theverge.com/rss/index.xml',
    'http://feeds.feedburner.com/TechCrunch/',
  ],
};

// Friendly source names
const SOURCE_NAMES: Record<string, string> = {
  'bbci.co.uk': 'BBC',
  'bbc.co.uk': 'BBC',
  'theguardian.com': 'The Guardian',
  'prothomalo.com': 'Prothom Alo',
  'espn.com': 'ESPN',
  'theverge.com': 'The Verge',
  'feedburner.com': 'TechCrunch',
};

interface NewsItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  topic: string;
  lang: string;
}

interface ApiResponse {
  items: NewsItem[];
  meta: {
    country: string;
    topic: string;
    lang: string;
    provider: 'rss' | 'rss+openai';
    errorCount: number;
    warning: string | null;
  };
}

// Clean up HTML/Entities
function cleanText(text: string): string {
  return text
    .replace(/<[^>]*>/g, ' ')        // strip HTML
    .replace(/\s+/g, ' ')            // collapse whitespace
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// Simple language guess: if it contains Bengali script, mark as bn, else fallback
function determineLanguage(text: string, defaultLang: string): string {
  return /[\u0980-\u09FF]/.test(text) ? 'bn' : defaultLang;
}

// RSS parser without external deps (robust enough for common feeds)
function parseRSS(xml: string, topic: string, lang: string): NewsItem[] {
  const items: NewsItem[] = [];
  try {
    const matches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    for (const chunk of matches) {
      try {
        const title = cleanText((chunk.match(/<title>([\s\S]*?)<\/title>/i)?.[1] ?? ''));
        const url = cleanText((chunk.match(/<link>([\s\S]*?)<\/link>/i)?.[1] ?? ''));
        const description =
          cleanText(
            (chunk.match(/<description>([\s\S]*?)<\/description>/i)?.[1] ??
              chunk.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/i)?.[1] ??
              '')
          );

        if (!title || !url) continue;

        // Derive display source from URL hostname
        let source = 'Unknown';
        try {
          const host = new URL(url).hostname.replace(/^www\./, '');
          source = SOURCE_NAMES[host] || host.split('.')[0];
        } catch { /* ignore */ }

        items.push({
          title,
          summary: description,
          url,
          source,
          topic,
          lang: determineLanguage(`${title} ${description}`, lang),
        });
      } catch {
        // Skip unparseable item
      }
    }
  } catch {
    // Skip a broken feed
  }
  return items;
}

// Optional OpenAI summarization
async function summarize(text: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY || process.env.FORCE_RSS === '1') {
    return text;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const resp = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'Summarize the following news content in 30-60 words. Be neutral, factual, and concise.' },
          { role: 'user', content: text.slice(0, 2000) },
        ],
        max_tokens: 100,
        temperature: 0.4,
      }),
    });

    clearTimeout(timeout);

    if (!resp.ok) throw new Error(`OpenAI ${resp.status}`);
    const data = await resp.json();
    return (data?.choices?.[0]?.message?.content ?? '').trim() || text;
  } catch {
    return text; // fallback to original description
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const topic = (searchParams.get('topic') || 'world') as Topic;
  const lang = (searchParams.get('lang') || 'en').toLowerCase();
  const country = (searchParams.get('country') || 'gb').toLowerCase();
  const q = (searchParams.get('q') || '').trim();

  const feeds = FEED_CONFIG[topic] || FEED_CONFIG.world;

  let errorCount = 0;
  let provider: ApiResponse['meta']['provider'] = 'rss';

  // Fetch in parallel with safe timeouts
  const results = await Promise.allSettled(
    feeds.map(async (url) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const resp = await fetch(url, {
          signal: controller.signal,
          headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DinerPordinNews/1.0)' },
        });
        clearTimeout(timeout);
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const xml = await resp.text();
        return parseRSS(xml, topic, lang);
      } catch {
        clearTimeout(timeout);
        errorCount++;
        return [];
      }
    })
  );

  // Flatten
  let items: NewsItem[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') items.push(...r.value);
  }

  // De-duplicate by URL
  const seen = new Set<string>();
  items = items.filter(i => {
    if (seen.has(i.url)) return false;
    seen.add(i.url);
    return true;
  });

  // Search server-side
  if (q) {
    const needle = q.toLowerCase();
    items = items.filter(i =>
      i.title.toLowerCase().includes(needle) ||
      i.summary.toLowerCase().includes(needle)
    );
  }

  // Optional summarization
  if (process.env.OPENAI_API_KEY && process.env.FORCE_RSS !== '1') {
    provider = 'rss+openai';
    items = await Promise.all(
      items.map(async (i) => {
        if (!i.summary) return i;
        const s = await summarize(i.summary);
        return { ...i, summary: s };
      })
    );
  }

  // Trim to top N
  items = items.slice(0, 20);

  const payload: ApiResponse = {
    items,
    meta: {
      country,
      topic,
      lang,
      provider,
      errorCount,
      warning: errorCount > 0 ? `Failed to fetch ${errorCount} feed(s)` : null,
    },
  };

  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      // short cache on the CDN, but always re-run on request (dynamic route)
      'Cache-Control': 's-maxage=60, stale-while-revalidate=60',
    },
  });
}
