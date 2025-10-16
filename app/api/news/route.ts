export const runtime = 'nodejs';

export async function GET() {
  return new Response(JSON.stringify({ ok: true, route: '/api/news' }), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
}
