"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

type Item = {
  title: string;
  summary: string;
  url: string;
  source: string;
  topic: string;
  lang: string;
};

export default function NewsPage() {
  const sp = useSearchParams();
  const country = (sp.get("country") ?? "gb").toLowerCase();
  const topic   = (sp.get("topic")   ?? "world").toLowerCase();
  const lang    = (sp.get("lang")    ?? "en").toLowerCase();
  const q       = (sp.get("q")       ?? "").trim();

  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      setLoading(true);
      setNote(null);
      try {
        const url = `/api/news?country=${country}&topic=${topic}&lang=${lang}` + (q ? `&q=${encodeURIComponent(q)}` : "");
        const r = await fetch(url, { cache: "no-store" });
        const data = await r.json();
        const arr = Array.isArray(data.items) ? data.items : [];
        setItems(arr);
        if (arr.length === 0) setNote("No headlines for this filter.");
      } catch {
        setNote("Could not load headlines. Please try again.");
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [country, topic, lang, q]);

  return (
    <main className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="text-3xl font-bold mb-6">Top headlines</h1>

      {loading && <div className="rounded bg-gray-50 p-3">Loading…</div>}
      {!loading && note && <div className="rounded bg-yellow-50 p-3 text-yellow-900">{note}</div>}

      {!loading && items.length > 0 && (
        <ul className="space-y-4">
          {items.map((it, i) => (
            <li key={i} className="border rounded p-4">
              <a href={it.url} target="_blank" rel="noreferrer" className="block">
                <div className="text-xs text-gray-500 mb-1">{it.source}</div>
                <h3 className="font-semibold">{it.title}</h3>
                {it.summary && <p className="text-sm text-gray-700 mt-1">{it.summary}</p>}
              </a>
            </li>
          ))}
        </ul>
      )}

      <p className="text-xs text-gray-400 mt-8">Educational purposes only. Not medical advice.</p>

      <div className="mt-8 flex gap-2">
        <Link href={`?country=${country}&topic=world&lang=${lang}`} className="px-3 py-1 border rounded">World</Link>
        <Link href={`?country=bd&topic=bangladesh&lang=${lang}`} className="px-3 py-1 border rounded">Bangladesh</Link>
        <Link href={`?country=${country}&topic=sports&lang=${lang}`} className="px-3 py-1 border rounded">Sports</Link>
        <Link href={`?country=${country}&topic=technology&lang=${lang}`} className="px-3 py-1 border rounded">Technology</Link>
        <Link href={`?country=${country}&topic=${topic}&lang=en`} className="ml-auto px-3 py-1 border rounded">EN</Link>
        <Link href={`?country=${country}&topic=${topic}&lang=bn`} className="px-3 py-1 border rounded">বাংলা</Link>
      </div>
    </main>
  );
}
