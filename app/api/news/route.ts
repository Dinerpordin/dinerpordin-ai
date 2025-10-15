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
  const key = process.env.GNEWS_API_KEY || process.env.NEWS_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ articles: [], error: 'GNEWS_API_KEY missing' }), {
      status: 200, headers: { 'content-type': 'application/json' }
    });
  }

  const { searchParams } = new URL(req.url);
  const country = (searchParams.get('country') || 'gb').toLowerCase();
  const topic   = clampTopic(searchParams.get('topic')) || 'world';
  const lang    = (searchParams.get('lang') || 'en').toLowerCase();
  const q       = searchParams.get('q') || undefined;

  const base = 'https://gnews.io/api/v4/top-headlines';
  const params = new URLSearchParams({ country, topic, lang, max: '12', token: key });
  if (q) params.set('q', q);

  const r = await fetch(`${base}?${params.toString()}`, { next: { revalidate: 600 } });
  const j = await r.json();

  const articles = Array.isArray(j?.articles)
    ? j.articles.map((a: any) => ({
        title: a.title,
        url: a.url,
        urlToImage: a.image,
        source: { name: a.source?.name || '' }
      }))
    : [];

  return new Response(JSON.stringify({ articles, country, topic, lang }), {
    headers: { 'content-type': 'application/json' }
  });
}
