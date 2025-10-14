
import { NextRequest } from 'next/server';
export async function GET(req: NextRequest){
  const { searchParams } = new URL(req.url);
  const lat = searchParams.get('lat') || process.env.DEFAULT_LAT || '53.289';
  const lon = searchParams.get('lon') || process.env.DEFAULT_LON || '-3.06';
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
  const r = await fetch(url, { next: { revalidate: 1800 } });
  const j = await r.json();
  return new Response(JSON.stringify({ weather: j?.current_weather ?? null }), { headers: { 'content-type':'application/json' } });
}
