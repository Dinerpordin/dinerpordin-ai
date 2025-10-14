export const revalidate = 600; // 10 min cache

export async function GET() {
  const key = process.env.GNEWS_API_KEY || process.env.NEWS_API_KEY;
  if (!key) {
    return new Response(
      JSON.stringify({ articles: [], error: "GNEWS_API_KEY missing" }),
      { status: 200, headers: { "content-type": "application/json" } }
    );
  }

  // Top headlines for GB in English. Change country/lang if you prefer.
  const url = `https://gnews.io/api/v4/top-headlines?country=gb&lang=en&max=12&token=${key}`;
  const r = await fetch(url, { next: { revalidate: 600 } });
  const j = await r.json();

  // Normalize to the shape your page already expects
  const articles = Array.isArray(j?.articles)
    ? j.articles.map((a: any) => ({
        title: a.title,
        url: a.url,
        urlToImage: a.image,
        source: { name: a.source?.name || "" }
      }))
    : [];

  return new Response(JSON.stringify({ articles, provider: "gnews" }), {
    headers: { "content-type": "application/json" }
  });
}
