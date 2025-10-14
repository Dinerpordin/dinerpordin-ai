
export const revalidate = 600;
export async function GET(){
  const key = process.env.ALPHA_VANTAGE_KEY;
  if(!key) return new Response(JSON.stringify({rate:null, error:'Missing ALPHA_VANTAGE_KEY'}), { status: 500 });
  const u = `https://www.alphavantage.co/query?function=CURRENCY_EXCHANGE_RATE&from_currency=USD&to_currency=BDT&apikey=${key}`;
  const r=await fetch(u, { next: { revalidate: 600 } }); const j=await r.json();
  const rate = Number(j?.['Realtime Currency Exchange Rate']?.['5. Exchange Rate']);
  return new Response(JSON.stringify({ rate: isFinite(rate)?rate:null }), { headers: { 'content-type': 'application/json' } });
}
