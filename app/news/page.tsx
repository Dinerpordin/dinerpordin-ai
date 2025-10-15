// app/news/page.tsx
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs'; // ensure Node runtime on Vercel

type Search = { [key: string]: string | string[] | undefined };

function getParam(sp: Search, key: string): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v || undefined;
}

function buildHref(sp: Search, patch: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) for (const vv of v) params.append(k, vv);
    else params.set(k, v);
  }
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === '') params.delete(k);
    else {
      const current = params.get(k);
      if (current === v) params.delete(k); // toggle off if same
      else params.set(k, v);
    }
  }
  const q = params.toString();
  return q ? `/news?${q}` : `/news`;
}

export default async function Page({ searchParams }: { searchParams: Search }) {
  const country = (getParam(searchParams, 'country') ?? 'gb').toLowerCase();
  const topic   = (getParam(searchParams, 'topic')   ?? 'world').toLowerCase();
  const lang    = (getParam(searchParams, 'lang')    ?? 'en').toLowerCase();
  const q       = getParam(searchParams, 'q');

  const qs = new URLSearchParams({ country, topic, lang, max: '12' });
  if (q) qs.set('q', q);

  // Build absolute base URL for Vercel SSR
  const base =
    (process.env.VERCEL_URL && `https://${process.env.VERCEL_URL}`) ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    'http://localhost:3000';

  let items: any[] = [];
  let loadErr: string | null = null;

  try {
    const r = await fetch(`${base}/api/news?${qs.toString()}`, {
      cache: 'no-store',
      // Avoid region-to-region caching issues
      headers: { 'x-internal-ssr': '1' },
    });
    const data = await r.json();
    items = Array.isArray(data?.articles) ? data.articles : [];
  } catch (e: any) {
    loadErr = e?.message || 'Failed to load headlines';
  }

  const hrefWorld      = buildHref(searchParams, { topic: 'world' });
  const hrefBangladesh = buildHref(searchParams, { country: 'bd' });
  const hrefSports     = buildHref(searchParams, { topic: 'sports' });
  const hrefTechnology = buildHref(searchParams, { topic: 'technology' });
  const hrefEN         = buildHref(searchParams, { lang: 'en' });
  const hrefBN         = buildHref(searchParams, { lang: 'bn' });

  const isWorld  = topic === 'world';
  const isBD     = country === 'bd';
  const isSports = topic === 'sports';
  const isTech   = topic === 'technology';
  const isEN     = lang === 'en';
  const isBN     = lang === 'bn';

  return (
    <section>
      <h1 className="text-2xl font-semibold mb-3">Top headlines</h1>

      <div className="flex flex-wrap gap-2 mb-4">
        <Pill href={hrefWorld} active={isWorld} label="World" />
        <Pill href={hrefBangladesh} active={isBD} label="Bangladesh" />
        <Pill href={hrefSports} active={isSports} label="Sports" />
        <Pill href={hrefTechnology} active={isTech} label="Technology" />
        <Pill href={hrefEN} active={isEN} label="EN" />
        <Pill href={hrefBN} active={isBN} label="বাংলা" />
      </div>

      <form action="/news" className="mb-3">
        <input
          name="q"
          defaultValue={q || ''}
          placeholder="Search headlines…"
          className="w-full md:w-96 border rounded px-3 py-2 mr-2"
        />
        <input type="hidden" name="country" value={country} />
        <input type="hidden" name="topic" value={topic} />
        <input type="hidden" name="lang" value={lang} />
        <button className="px-3 py-2 rounded border bg-white">Search</button>
      </form>

      {loadErr && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded">
          {loadErr}
        </div>
      )}
      {!loadErr && items.length === 0 && (
        <div className="text-slate-500">No headlines for these filters.</div>
      )}

      <div className="mt-4 grid md:grid-cols-3 gap-4">
        {items.map((a, i) => (
          <a key={i} className="border rounded p-3 bg-white hover:bg-slate-50" href={a.url} target="_blank">
            {a.urlToImage && (
              <img
                src={a.urlToImage}
                alt={a.title}
                className="w-full h-36 object-cover rounded mb-2"
              />
            )}
            <div className="font-medium">{a.title}</div>
            <div className="text-xs text-slate-500">{a.source?.name}</div>
          </a>
        ))}
      </div>
    </section>
  );
}

function Pill({ href, active, label }: { href: string; active: boolean; label: string }) {
  const cls = active ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700';
  return (
    <a href={href} className={`px-3 py-1 rounded-full border ${cls}`}>{label}</a>
  );
}
