
import { NextRequest } from 'next/server';
export async function GET(req: NextRequest){
  const { searchParams } = new URL(req.url);
  const city = searchParams.get('city') || process.env.DEFAULT_CITY || 'Neston';
  const country = searchParams.get('country') || process.env.DEFAULT_COUNTRY || 'United Kingdom';
  const t = Math.floor(Date.now()/1000);
  const url = `https://api.aladhan.com/v1/timingsByCity/${t}?city=${encodeURIComponent(city)}&country=${encodeURIComponent(country)}`;
  const r = await fetch(url, { next: { revalidate: 3600 } });
  const j = await r.json();
  return new Response(JSON.stringify({ timings: j?.data?.timings ?? null, date: j?.data?.date?.readable ?? null }), { headers: { 'content-type': 'application/json' } });
}
