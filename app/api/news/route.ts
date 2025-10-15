// app/api/news/route.ts
export const revalidate = 600; // 10 min cache

const ALLOWED_TOPICS = new Set([
  'breaking-news','world','nation','business','technology',
  'entertainment','sports','science','health'
]);

function clampTopic(raw?: string | null) {
  const t = (raw || '').toLowerCase();
  return ALLOWED_TOPICS.has(t) ? t : undefined;
}

export async function GET(req: Request) {
  try {
    const key = process.env.GNEWS_API_KEY || process.env.NEWS_API_KEY;
    if (!key) {
      return json({ articles: [], error: 'GNEWS_API_KEY missing' });
    }

    const { searchParams } = new URL(req.url);
    const country = (searchParams.get('country') || 'gb').toLowerCase();
    const topic   = clampTopic(searchParams.get('topic')) || 'world';
    const lang    = (searchParams.get('lang') || 'en').toLowerCase();
    const q       = searchParams.get('q') || undefined;

    const base = 'https://gnews.io/api/v4/top-headlines';
    const params = new URLSearchParams({ country, topic, lang, max: '12', token: key });
    if (q) params.set('q', q);

    const r = await fetch(`${base}?${params.toString()}`, { cache: 'no-store' });

    const ct = r.headers.get('content-type') || '';
    if (!ct.includes('application/json')) {
      const text = await r.text().catch(() => '');
      return json({
        articles: [],
        error: `Upstream not JSON (${r.status} ${r.statusText})`,
        detail: text.slice(0, 300)
      }, r.ok ? 200 : r.status || 200);
    }

    const data = await r.json().catch(() => null);
    if (!data) {
      return json({ articles: [], error: 'Failed to parse upstream JSON' }, 200);
    }

    if (!r.ok) {
      // GNews returns JSON error bodies as well
      return json({
        articles: [],
        error: `Upstream error (${r.status} ${r.statusText})`,
        detail: (data as any)?.message || null
      }, 200);
    }

    const articles = Array.isArray((data as any)?.articles)
      ? (data as any).articles.map((a: any) => ({
          title: a.title,
          url: a.url,
          urlToImage: a.image,
          source: { name: a.source?.name || '' }
        }))
      : [];

    return json({ articles, country, topic, lang });
  } catch (e: any) {
    return json({ articles: [], error: e?.message || 'Unknown server error' }, 200);
  }
}

function json(body: any, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' }
  });
}
