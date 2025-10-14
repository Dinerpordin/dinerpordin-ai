
'use client';
import React, { useEffect, useState } from 'react';
export default function EconomyPage(){
  const [rate,setRate]=useState<number|null>(null); const [note,setNote]=useState<string>(''); const [err,setErr]=useState<string|null>(null);
  useEffect(()=>{(async()=>{try{const r=await fetch('/api/economy'); const j=await r.json(); if(!r.ok) throw new Error(j.error||'Failed'); setRate(j.rate??null); if(j.rate) setNote(`USD→BDT approx ${Number(j.rate).toFixed(2)} (Alpha Vantage).`);}catch(e:any){setErr(e.message||'Error');}})();},[]);
  return (<section className="space-y-4"><h1 className="text-2xl font-semibold">Economy</h1>{err&&<div className="p-3 bg-red-50 text-red-800 rounded">{err}</div>}<div className="border rounded p-4 bg-white">
  <div className="text-sm font-semibold mb-1">USD→BDT</div><div className="text-2xl">{rate?Number(rate).toFixed(4):'—'}</div><div className="text-xs text-slate-500 mt-1">{note}</div></div></section>);
}
