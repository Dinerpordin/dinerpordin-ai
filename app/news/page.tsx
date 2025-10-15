// app/news/page.tsx
// Pure Server Component version: no 'use client', no hooks, no Suspense needed.
export const dynamic = 'force-dynamic';

type Search = { [key: string]: string | string[] | undefined };

function getParam(sp: Search, key: string): string | undefined {
  const v = sp[key];
  if (Array.isArray(v)) return v[0];
  return v || undefined;
}

function buildHref(sp: Search, patch: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  // copy existing params
  for (const [k, v] of Object.entries(sp)) {
    if (v === undefined) continue;
    if (Array.isArray(v)) {
      for (const vv of v) params.append(k, vv);
    } else {
      params.set(k, v);
    }
  }
  // apply patch (toggle-like behavior)
  for (const [k, v] of Object.entries(patch)) {
    if (v === undefined || v === '') params.delete(k);
    else {
      // if the value is already set to v, remove it (toggle off)
      const current = params.get(k);
      if (current === v) params.delete(k);
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

  // Build the internal API URL using the current filters
  const p = new URLSearchParams({ country, topic, lang, max: '12' });
  if (q) p.set('q', q);
  const apiUrl = `/api/news?${p.toString()}`;

  // Server-side fetch (no hooks)
  const r = await fetch(apiUrl, { cache: 'no-store' });
  const data = await r.json();
  const items: any[] = Array.isArray(data?.articles) ? data.articles : [];

  // helpers for pill links
  const hrefWorld       = buildHref(searchParams, { topic: 'world' });
  const hrefBangladesh  = buildHref(searchParams, { country: 'bd' });
  const hrefSports      = buildHref(searchParams, { topic: 'sports' });
  const hrefTechnology  = buildHref(searchParams, { topic: 'technology' });
  const hrefEN          = buildHref(searchParams, { lang: 'en' });
  const hrefBN          = buildHref(searchParams, { lang: 'bn' });

  // “active” state (for styling)
  const isWorld      = topic === 'world';
  const isBD         = country === 'bd';
  const isSports     = topic === 'sports';
  const isTech       = topic === 'technology';
  const isEN         = lang === 'en';
  const isBN         = lang === 'bn';

  return (
    <section>
      <h1 className="text-2xl font-semibold mb-3">Top headlines</h1>

      {/* Filter pills as plain links (no client code) */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Pill href={hrefWorld} active={isWorld}       label="World" />
        <Pill href={hrefBangladesh} active={isBD}      label="Bangladesh" />
        <Pill href={hrefSports} active={isSports}     label="Sports" />
        <Pill href={hrefTechnology} active={isTech}   label="Technology" />
        <Pill href={hrefEN} active={isEN}             label="EN" />
        <Pill href={hrefBN} active={isBN}             label="বাংলা" />
      </div>

      {/* Simple server-side search form: submits via GET so URL updates */}
      <form action="/news" className="mb-3">
        <input
          name="q"
          defaultValue={q || ''}
          placeholder="Search headlines…"
          className="w-full md:w-96 border rounded px-3 py-2 mr-2"
        />
        {/* persist existing filters when searching */}
        <input type="hidden" name="country" value={country} />
        <input type="hidden" name="topic" value={topic} />
        <input type="hidden" name="lang" value={lang} />
        <button className="px-3 py-2 rounded border bg-white">Search</button>
      </form>

      {items.length === 0 && (
        <div className="text-slate-500">No headlines for these filters.</div>
      )}

      <div className="mt-4 grid md:grid-cols-3 gap-4">
        {items.map((a, i) => (
          <a
            key={i}
            className="border rounded p-3 bg-white hover:bg-slate-50"
            href={a.url}
            target="_blank"
          >
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
  const cls = active
    ? 'bg-slate-900 text-white border-slate-900'
    : 'bg-white text-slate-700';
  return (
    <a href={href} className={`px-3 py-1 rounded-full border ${cls}`}>
      {label}
    </a>
  );
}
