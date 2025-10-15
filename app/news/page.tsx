'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

type Filters = { country?: string; topic?: string; lang?: string; q?: string };

function useFilters(): [Filters, (patch: Partial<Filters>) => void] {
  const sp = useSearchParams();
  const router = useRouter();

  const filters = useMemo<Filters>(() => ({
    country: sp.get('country') || undefined,
    topic:   sp.get('topic')   || undefined,
    lang:    sp.get('lang')    || undefined,
    q:       sp.get('q')       || undefined
  }), [sp]);

  const setFilters = (patch: Partial<Filters>) => {
    const params = new URLSearchParams(sp.toString());
    for (const [k, v] of Object.entries(patch)) {
      if (v === undefined || v === null || v === '') params.delete(k);
      else params.set(k, String(v));
    }
    router.push(`/news?${params.toString()}`);
  };

  return [filters, setFilters];
}

export default function NewsPage() {
  const [filters, setFilters] = useFilters();
  const [items, setItems] = useState<any[]>([]);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const apiUrl = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.country) p.set('country', filters.country);
    if (filters.topic)   p.set('topic',   filters.topic);
    if (filters.lang)    p.set('lang',    filters.lang);
    if (filters.q)       p.set('q',       filters.q);
    return `/api/news?${p.toString()}`;
  }, [filters]);

  useEffect(() => {
    let live = true;
    (async () => {
      setLoading(true); setErr(null);
      try {
        const r = await fetch(apiUrl);
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || 'Failed');
        setItems(j.articles || []);
      } catch (e: any) {
        setErr(e.message || 'Error');
      } finally {
        if (live) setLoading(false);
      }
    })();
    return () => { live = false; };
  }, [apiUrl]);

  const toggle = (key: keyof Filters, value: string | undefined) => {
    const current = filters[key];
    setFilters({ [key]: current === value ? undefined : value });
  };

  return (
    <section>
      <h1 className="text-2xl font-semibold mb-3">Top headlines</h1>

      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        <Pill active={(filters.topic ?? 'world') === 'world'} onClick={() => toggle('topic','world')} label="World" />
        <Pill active={filters.country === 'bd'} onClick={() => toggle('country','bd')} label="Bangladesh" />
        <Pill active={filters.topic === 'sports'} onClick={() => toggle('topic','sports')} label="Sports" />
        <Pill active={filters.topic === 'technology'} onClick={() => toggle('topic','technology')} label="Technology" />
        <Pill active={(filters.lang ?? 'en') === 'en'} onClick={() => toggle('lang','en')} label="EN" />
        <Pill active={filters.lang === 'bn'} onClick={() => toggle('lang','bn')} label="বাংলা" />
      </div>

      {/* Search */}
      <SearchBar value={filters.q || ''} onChange={(v)=>setFilters({ q: v || undefined })} />

      {loading && <div className="text-slate-600">Loading…</div>}
      {err && <div className="p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded">{err}</div>}
      {!loading && !err && items.length === 0 && <div className="text-slate-500">No headlines for these filters.</div>}

      <div className="mt-4 grid md:grid-cols-3 gap-4">
        {items.map((a,i)=>(
          <a key={i} className="border rounded p-3 bg-white hover:bg-slate-50" href={a.url} target="_blank">
            {a.urlToImage && <img src={a.urlToImage} alt={a.title} className="w-full h-36 object-cover rounded mb-2" />}
            <div className="font-medium">{a.title}</div>
            <div className="text-xs text-slate-500">{a.source?.name}</div>
          </a>
        ))}
      </div>
    </section>
  );
}

function Pill({active,onClick,label}:{active:boolean;onClick:()=>void;label:string}) {
  return (
    <button onClick={onClick}
      className={`px-3 py-1 rounded-full border ${active?'bg-slate-900 text-white border-slate-900':'bg-white text-slate-700'}`}>
      {label}
    </button>
  );
}

function SearchBar({value,onChange}:{value:string;onChange:(v:string)=>void}) {
  return (
    <div className="mb-3">
      <input value={value} onChange={e=>onChange(e.target.value)} placeholder="Search headlines…"
             className="w-full md:w-96 border rounded px-3 py-2" />
    </div>
  );
}
