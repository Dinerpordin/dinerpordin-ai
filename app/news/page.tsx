// app/news/page.tsx
import Link from "next/link";
import { headers } from "next/headers";

type Item = {
  title: string;
  summary: string;
  url: string;
  source: string;
  topic: string;
  lang: string;
};

function pill(href: string, active: boolean, label: string) {
  return (
    <Link
      href={href}
      className={`px-4 py-2 rounded-full border transition
        ${active ? "bg-black text-white" : "bg-white text-black hover:bg-gray-100"}`}
    >
      {label}
    </Link>
  );
}

export default async function NewsPage({
  searchParams,
}: {
  searchParams?: { country?: string; topic?: string; lang?: string; q?: string; count?: string };
}) {
  const country = (searchParams?.country ?? "gb").toLowerCase();
  const topic   = (searchParams?.topic ?? "world").toLowerCase();
  const lang    = (searchParams?.lang ?? "en").toLowerCase();
  const q       = searchParams?.q?.trim() ?? "";
  const count   = searchParams?.count ?? "8";

  // Build the query string for the API call
  const qs = new URLSearchParams({ country, topic, lang, count });
  if (q) qs.set("q", q);

  // ✅ Build absolute origin for server-side fetch
  const hdrs = headers();
  const proto = hdrs.get("x-forwarded-proto") ?? "https";
  const host  = hdrs.get("x-forwarded-host") ?? hdrs.get("host") ?? "localhost:3000";
  const origin = `${proto}://${host}`;

  let items: Item[] = [];
  let errorMsg = "";

  try {
    const res = await fetch(`${origin}/api/headlines?${qs.toString()}`, {
      // SSR: do not cache
      cache: "no-store",
      // Pass-through headers if you want (not strictly required)
      headers: { "accept": "application/json" },
    });

    if (!res.ok) {
      errorMsg = `Headlines API returned ${res.status}`;
    } else {
      const data = (await res.json()) as { items?: Item[] };
      items = Array.isArray(data.items) ? data.items : [];
    }
  } catch (err: any) {
    errorMsg = "Failed to fetch headlines.";
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-semibold mb-6">Top headlines</h1>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-3 mb-6">
        {pill(`/news?country=${country}&topic=world&lang=${lang}`, topic === "world", "World")}
        {pill(`/news?country=bd&topic=${topic}&lang=${lang}`, country === "bd", "Bangladesh")}
        {pill(`/news?country=${country}&topic=sports&lang=${lang}`, topic === "sports", "Sports")}
        {pill(`/news?country=${country}&topic=technology&lang=${lang}`, topic === "technology", "Technology")}
        {pill(`/news?country=${country}&topic=${topic}&lang=en`, lang === "en", "EN")}
        {pill(`/news?country=${country}&topic=${topic}&lang=bn`, lang === "bn", "বাংলা")}
      </div>

      {/* Any API error */}
      {errorMsg && (
        <div className="rounded border bg-yellow-50 p-4 text-sm mb-6">
          {errorMsg}. Try changing filters or refreshing.
        </div>
      )}

      {/* Results */}
      {(!items || items.length === 0) && !errorMsg ? (
        <div className="rounded border bg-yellow-50 p-4 text-sm">
          No stories found. Try a different filter.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {items.map((it, i) => (
            <article key={i} className="rounded-lg border p-4 bg-white">
              <a href={it.url} target="_blank" rel="noreferrer" className="block group">
                <h2 className="text-lg font-semibold group-hover:underline">{it.title}</h2>
              </a>
              <p className="text-gray-700 mt-2">{it.summary}</p>
              <div className="text-xs text-gray-500 mt-3">
                {it.source} · {it.topic.toUpperCase()} · {it.lang.toUpperCase()}
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
