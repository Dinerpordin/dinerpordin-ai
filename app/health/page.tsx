'use client';

import React, { useState } from 'react';

const TEXT = {
  en: {
    header: "Healthcheck AI (Educational)",
    desc: "Not medical advice. If symptoms are severe or worsening, seek urgent care.",
    placeholder: "Briefly describe your concern…",
    banglaSummary: "Bangla summary",
    concise: "Concise",
    analyze: "Analyze",
    analyzing: "Analyzing…",
    inputBangla: "Bangla summary",
    summary: "Summary",
    possibleCauses: "Possible causes",
    redFlags: "Red flags (seek care urgently)",
    selfCare: "Self-care (general info)",
    error: "Something went wrong:",
    clear: "Clear",
    lang: "বাংলা",
    disclaimer: "Disclaimer: This tool is for educational purposes only and does not provide medical diagnosis, treatment, or advice. Always consult a qualified healthcare professional for medical concerns. If symptoms are severe or worsening, seek urgent care."
  },
  bn: {
    header: "হেলথচেক এআই (শিক্ষামূলক)",
    desc: "এটি কোনো চিকিৎসা পরামর্শ নয়। উপসর্গ গুরুতর হলে বা বাড়লে দ্রুত চিকিৎসা নিন।",
    placeholder: "সংক্ষেপে আপনার সমস্যা লিখুন…",
    banglaSummary: "বাংলা সারাংশ",
    concise: "সংক্ষেপে",
    analyze: "বিশ্লেষণ করুন",
    analyzing: "বিশ্লেষণ চলছে…",
    inputBangla: "বাংলা সারাংশ",
    summary: "সারাংশ",
    possibleCauses: "সম্ভাব্য কারণ",
    redFlags: "সতর্ক সংকেত (জরুরি চিকিৎসা)",
    selfCare: "স্ব-যত্ন নির্দেশিকা (সাধারণ তথ্য)",
    error: "কিছু ভুল হয়েছে:",
    clear: "মুছুন",
    lang: "English",
    disclaimer: "সতর্কতা: এটি শুধুমাত্র শিক্ষামূলক টুল, চিকিৎসা নির্ণয়/পরামর্শ নয়। চিকিৎসার জন্য যোগ্য চিকিৎসক পরামর্শ নিন। উপসর্গ বেশি হলে জরুরি চিকিৎসা নিন।"
  }
};

export default function HealthPage() {
  const [q, setQ] = useState('');
  const [compact, setCompact] = useState(true);
  const [ui, setUi] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [lang, setLang] = useState<'en'|'bn'>('en');

  async function analyze() {
    setLoading(true);
    setErr(null);
    setUi(null);
    try {
      const r = await fetch('/api/health', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ q, want_bn: true, compact })
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Request failed');
      setUi(j);
    } catch (e: any) {
      setErr(e.message || 'Network error');
    } finally {
      setLoading(false);
    }
  }

  const t = TEXT[lang];

  return (
    <section className={`max-w-2xl mx-auto p-4 ${lang === 'bn' ? 'font-[Noto_Sans_Bengali,sans-serif]' : ''}`}>
      <div className="flex justify-between items-center mb-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1">{t.header}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">{t.desc}</p>
        </div>
        <button
          className="ml-4 px-3 py-1 rounded border bg-white dark:bg-slate-800 text-sm hover:bg-slate-100 dark:hover:bg-slate-700"
          onClick={() => setLang(lang === 'en' ? 'bn' : 'en')}
        >
          {t.lang}
        </button>
      </div>
      <textarea
        className="w-full border rounded p-3 h-32 bg-white dark:bg-slate-900 text-base"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t.placeholder}
      />
      <div className="mt-3 flex gap-4 items-center">
        <label className="text-sm">
          <input
            type="checkbox"
            checked={compact}
            onChange={e => setCompact(e.target.checked)}
          />{' '}
          {t.concise}
        </label>
        <button
          onClick={analyze}
          disabled={loading}
          className="ml-auto px-4 py-2 rounded bg-indigo-600 text-white font-semibold"
        >
          {loading ? t.analyzing : t.analyze}
        </button>
        <button
          type="button"
          onClick={() => { setQ(''); setUi(null); setErr(null); }}
          className="px-4 py-2 rounded border bg-slate-50 text-sm ml-2"
        >
          {t.clear}
        </button>
      </div>
      {err && (
        <div className="mt-4 p-3 bg-red-50 text-red-800 rounded">
          {t.error} {err}
        </div>
      )}
      {ui && (
        <section className="mt-6 space-y-4">
          <Card title={t.summary} lang={lang}>{ui.summary}</Card>
          <Card title={t.possibleCauses} lang={lang}><List items={ui.possible_causes} /></Card>
          <Card title={t.redFlags} intent="danger" lang={lang}><List items={ui.red_flags} /></Card>
          <Card title={t.selfCare} intent="success" lang={lang}><List items={ui.self_care} /></Card>
          {ui.bn_summary && <Card title={t.banglaSummary} lang="bn">{ui.bn_summary}</Card>}
          {ui.usage && (
            <div className="text-xs text-slate-500">
              Model: {ui.usage.model} • In: {ui.usage.input_tokens ?? '-'} • Out: {ui.usage.output_tokens ?? '-'}
            </div>
          )}
        </section>
      )}
      <div className="mt-6 text-xs text-slate-500">{t.disclaimer}</div>
    </section>
  );
}

function Card({ title, children, intent, lang }: { title: string; children: any; intent?: 'danger' | 'success'; lang?: 'en'|'bn' }) {
  const cls =
    intent === 'danger'
      ? 'bg-red-50 border-red-200 dark:bg-red-800/20'
      : intent === 'success'
      ? 'bg-green-50 border-green-200 dark:bg-green-800/20'
      : 'bg-white dark:bg-slate-900';
  return (
    <div className={`border rounded p-4 ${cls} ${lang === 'bn' ? 'font-[Noto_Sans_Bengali,sans-serif]' : ''}`}>
      <div className="text-sm font-semibold mb-2">{title}</div>
      <div>{children}</div>
    </div>
  );
}
function List({ items }: { items: string[] }) {
  if (!items?.length) return <div className="text-slate-500">—</div>;
  return (
    <ul className="list-disc pl-5">
      {items.map((x, i) => (<li key={i}>{x}</li>))}
    </ul>
  );
}
