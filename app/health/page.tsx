
'use client';
import React, { useState } from 'react';
export default function HealthPage() {
  const [q,setQ]=useState(''); const [wantBn,setWantBn]=useState(false); const [compact,setCompact]=useState(true);
  const [ui,setUi]=useState<any>(null); const [loading,setLoading]=useState(false); const [err,setErr]=useState<string|null>(null);
  async function analyze(){ setLoading(true); setErr(null); setUi(null); try{
    const r=await fetch('/api/health',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({q,want_bn:wantBn,compact})});
    const j=await r.json(); if(!r.ok) throw new Error(j.error||'Request failed'); setUi(j);
  }catch(e:any){ setErr(e.message||'Network error'); }finally{ setLoading(False);} }
  return (<section><h1 className="text-2xl font-semibold mb-2">Healthcheck AI (Educational)</h1>
  <p className="text-sm text-slate-600 mb-4">Not medical advice.</p>
  <textarea className="w-full border rounded p-3 h-36" value={q} onChange={e=>setQ(e.target.value)} placeholder="Briefly describe your concern…" />
  <div className="mt-3 flex gap-4 items-center">
    <label className="text-sm"><input type="checkbox" checked={wantBn} onChange={e=>setWantBn(e.target.checked)} /> Bangla summary</label>
    <label className="text-sm"><input type="checkbox" checked={compact} onChange={e=>setCompact(e.target.checked)} /> Concise</label>
    <button onClick={analyze} disabled={loading} className="ml-auto px-4 py-2 rounded bg-indigo-600 text-white">{loading?'Analyzing…':'Analyze'}</button>
  </div>
  {err && <div className="mt-4 p-3 bg-red-50 text-red-800 rounded">{err}</div>}
  {ui && (<section className="mt-6 space-y-4">
    <Card title="Summary">{ui.summary}</Card>
    <Card title="Possible causes"><List items={ui.possible_causes} /></Card>
    <Card title="Red flags (seek care urgently)" intent="danger"><List items={ui.red_flags} /></Card>
    <Card title="Self-care (general info)" intent="success"><List items={ui.self_care} /></Card>
    {ui.bn_summary ? <Card title="বাংলা সারাংশ">{ui.bn_summary}</Card> : null}
    {ui.usage ? <div className="text-xs text-slate-500">Model: {ui.usage.model} • In: {ui.usage.input_tokens ?? '-'} • Out: {ui.usage.output_tokens ?? '-'}</div> : null}
  </section>)}</section>);}
function Card({title,children,intent}:{title:string;children:any;intent?:'danger'|'success'}){
  const cls=intent==='danger'?'bg-red-50 border-red-200':intent==='success'?'bg-green-50 border-green-200':'bg-white';
  return (<div className={`border rounded p-4 ${cls}`}><div className="text-sm font-semibold mb-2">{title}</div><div className="prose prose-sm max-w-none">{children}</div></div>);
}
function List({items}:{items:string[]}){ if(!items?.length) return <div className="text-slate-500">—</div>; return <ul className="list-disc pl-5">{items.map((x,i)=><li key={i}>{x}</li>)}</ul>; }
