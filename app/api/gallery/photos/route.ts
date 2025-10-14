
export async function GET(){
  const key = process.env.PEXELS_API_KEY;
  if(!key) return new Response(JSON.stringify({photos:[], error:'Missing PEXELS_API_KEY'}), { status: 500 });
  const r = await fetch('https://api.pexels.com/v1/curated?per_page=12', { headers: { Authorization: key }, next: { revalidate: 900 } });
  const j = await r.json();
  return new Response(JSON.stringify({ photos: j?.photos ?? [] }), { headers: { 'content-type': 'application/json' } });
}
