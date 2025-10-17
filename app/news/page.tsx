// app/news/page.tsx
'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface NewsItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  topic: string;
  lang: string;
}

interface NewsResponse {
  items: NewsItem[];
  meta: {
    country: string;
    topic: string;
    lang: string;
    provider: string;
    errorCount: number;
    warning: string | null;
  };
}

function Chips({
  topic,
  lang,
  onChange,
}: {
  topic: string;
  lang: string;
  onChange: (t: string, l: string) => void;
}) {
  const topics = [
    { id: 'world', label: 'World' },
    { id: 'bangladesh', label: 'Bangladesh' },
    { id: 'sports', label: 'Sports' },
    { id: 'technology', label: 'Technology' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {topics.map((t) => (
          <button
            key={t.id}
            onClick={() => onChange(t.id, lang)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              topic === t.id ? 'bg-blue-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">Language:</span>
        <button
          onClick={() => onChange(topic, 'en')}
          className={`px-3 py-1 rounded text-sm font-medium ${
            lang === 'en' ? 'bg-green-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
          }`}
        >
          EN
        </button>
        <button
          onClick={() => onChange(topic, 'bn')}
          className={`px-3 py-1 rounded text-sm font-medium ${
            lang === 'bn' ? 'bg-green-600 text-white' : 'bg-gray-200 hover:bg-gray-300 text-gray-800'
          }`}
        >
          BN
        </button>
      </div>
    </div>
  );
}

function SearchBox({
  q,
  onSearch,
}: {
  q: string;
  onSearch: (q: string) => void;
}) {
  const [val, setVal] = useState(q);
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSearch(val.trim());
      }}
      className="w-full max-w-md"
    >
      <div className="relative">
        <input
          value={val}
          onChange={(e) => setVal(e.target.value)}
          placeholder="Search headlines…"
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-blue-600 text-white rounded text-sm"
        >
          Search
        </button>
      </div>
    </form>
  );
}

function Card({ item }: { item: NewsItem }) {
  return (
    <article className="bg-white rounded-lg shadow p-6 hover:shadow-md transition">
      <div className="flex justify-between gap-2 mb-2">
        <h2 className="text-xl font-semibold text-gray-900 leading-snug">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-blue-600"
          >
            {item.title}
          </a>
        </h2>
        <span
          className={`px-2 py-1 text-xs rounded-full h-fit ${
            item.lang === 'bn' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
          }`}
        >
          {item.lang.toUpperCase()}
        </span>
      </div>
      <p className="text-gray-700 mb-3">{item.summary}</p>
      <div className="text-sm text-gray-500 flex justify-between">
        <span className="font-medium">{item.source}</span>
        <span className="capitalize">{item.topic}</span>
      </div>
    </article>
  );
}

function Loading() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-2 w-3/4" />
          <div className="h-4 bg-gray-200 rounded mb-1 w-full" />
          <div className="h-4 bg-gray-200 rounded mb-1 w-5/6" />
          <div className="h-4 bg-gray-200 rounded mb-3 w-4/6" />
          <div className="flex justify-between">
            <div className="h-4 bg-gray-200 rounded w-20" />
            <div className="h-4 bg-gray-200 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}

function NewsInner() {
  const router = useRouter();
  const sp = useSearchParams();

  const topic = sp.get('topic') || 'world';
  const lang = sp.get('lang') || 'en';
  const q = sp.get('q') || '';

  const [data, setData] = useState<NewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const pushURL = (t: string, l: string, query = q) => {
    const p = new URLSearchParams();
    p.set('topic', t);
    p.set('lang', l);
    if (query) p.set('q', query);
    router.push(`/news?${p.toString()}`);
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr(null);
      try {
        const p = new URLSearchParams({ topic, lang });
        if (q) p.set('q', q);
        const resp = await fetch(`/api/news?${p.toString()}`, { cache: 'no-store' });
        if (!resp.ok) throw new Error('Failed to fetch news');
        const json: NewsResponse = await resp.json();
        if (!alive) return;
        setData(json);
      } catch (e) {
        if (!alive) return;
        setErr('Failed to load news. Please try again.');
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [topic, lang, q]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Diner Pordin — News</h1>
          <p className="text-gray-600">Latest headlines from trusted sources</p>
        </header>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <Chips topic={topic} lang={lang} onChange={(t, l) => pushURL(t, l)} />
          <SearchBox q={q} onSearch={(val) => pushURL(topic, lang, val)} />
        </div>

        {data?.meta && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow-sm text-sm text-gray-700 flex flex-wrap gap-4">
            <span>Provider: {data.meta.provider}</span>
            <span>Topic: {data.meta.topic}</span>
            <span>Language: {data.meta.lang.toUpperCase()}</span>
            <span>Country: {data.meta.country.toUpperCase()}</span>
            {!!data.meta.warning && <span className="text-yellow-700">{data.meta.warning}</span>}
          </div>
        )}

        {err && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 text-red-800">
            {err}
          </div>
        )}

        {loading && <Loading />}

        {!loading && data && (
          <div className="space-y-6">
            {data.items.length ? (
              data.items.map((n, i) => <Card key={`${n.url}-${i}`} item={n} />)
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-600">No news found. Try different filters or a new search.</p>
              </div>
            )}
          </div>
        )}

        <footer className="mt-12 pt-6 border-t border-gray-200 text-center text-sm text-gray-500">
          News aggregated from RSS feeds. Summaries may be AI-generated.
        </footer>
      </div>
    </div>
  );
}

export default function NewsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600">Loading news...</p>
          </div>
        </div>
      }
    >
      <NewsInner />
    </Suspense>
  );
}
