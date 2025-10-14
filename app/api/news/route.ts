
export const revalidate = 600;
export async function GET(){
  const key = process.env.NEWS_API_KEY;
  if(!key) return new Response(JSON.stringify({articles:[], error:'Missing NEWS_API_KEY'}), { status: 500 });
  const url = `https://newsapi.org/v2/top-headlines?country=gb&pageSize=12&apiKey=${key}`;
  const r = await fetch(url, { next: { revalidate: 600 } });
  const j = await r.json();
  return new Response(JSON.stringify({ articles: j?.articles ?? [] }), { headers: { 'content-type': 'application/json' } });
}
