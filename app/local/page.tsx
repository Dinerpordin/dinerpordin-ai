
'use client';
import React, { useEffect, useState } from 'react';
export default function LocalPage(){
  const [w,setW]=useState<any>(null); const [p,setP]=useState<any>(null); const [err,setErr]=useState<string|null>(null);
  useEffect(()=>{(async()=>{try{const wr=await fetch('/api/weather'); const wj=await wr.json(); if(!wr.ok) throw new Error(wj.error||'Weather failed');
    const pr=await fetch('/api/prayer'); const pj=await pr.json(); if(!pr.ok) throw new Error(pj.error||'Prayer failed');
    setW(wj.weather); setP(pj);}catch(e:any){setErr(e.message||'Error');}})();},[]);
  return (<section className="space-y-4"><h1 className="text-2xl font-semibold">Local</h1>{err&&<div className="p-3 bg-red-50 text-red-800 rounded">{err}</div>}
  <div className="grid md:grid-cols-2 gap-4">
    <div className="border rounded p-4 bg-white"><div className="text-sm font-semibold mb-1">Weather</div>{w?(<><div className="text-2xl">{w.temperature}°C</div><div className="text-xs text-slate-500">windspeed {w.windspeed} km/h</div></>):'—'}</div>
    <div className="border rounded p-4 bg-white"><div className="text-sm font-semibold mb-1">Prayer Times ({p?.date||''})</div>{p?.timings?(<ul className="text-sm space-y-1">{Object.entries(p.timings).map(([k,v]:any)=>(<li key={k}><span className="font-medium">{k}:</span> {v as string}</li>))}</ul>):'—'}</div>
  </div></section>);
}
