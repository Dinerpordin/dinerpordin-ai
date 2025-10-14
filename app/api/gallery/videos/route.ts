
export async function GET(){
  const key = process.env.YOUTUBE_API_KEY;
  if(!key) return new Response(JSON.stringify({items:[], error:'Missing YOUTUBE_API_KEY'}), { status: 500 });
  const url = `https://www.googleapis.com/youtube/v3/videos?part=snippet&chart=mostPopular&regionCode=GB&maxResults=9&key=${key}`;
  const r = await fetch(url, { next: { revalidate: 900 } });
  const j = await r.json();
  return new Response(JSON.stringify({ items: j?.items ?? [] }), { headers: { 'content-type': 'application/json' } });
}
