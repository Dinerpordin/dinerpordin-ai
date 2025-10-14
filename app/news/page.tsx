
'use client';
import React, { useEffect, useState } from 'react';
export default function NewsPage(){
  const [items,setItems]=useState<any[]>([]); const [err,setErr]=useState<string|null>(null);
  useEffect(()=>{(async()=>{try{const r=await fetch('/api/news'); const j=await r.json(); if(!r.ok) throw new Error(j.error||'Failed'); setItems(j.articles||[]);}catch(e:any){setErr(e.message)}})();},[]);
  return (<section><h1 className="text-2xl font-semibold mb-4">Top headlines</h1>{err&&<div className="p-3 bg-red-50 text-red-800 rounded">{err}</div>}
    <div className="grid md:grid-cols-3 gap-4">{items.map((a,i)=>(
      <a key={i} className="border rounded p-3 bg-white hover:bg-slate-50" href={a.url} target="_blank">
        {a.urlToImage && <img src={a.urlToImage} alt={a.title} className="w-full h-36 object-cover rounded mb-2" />}
        <div className="font-medium">{a.title}</div>
        <div className="text-xs text-slate-500">{a.source?.name}</div>
      </a>))}</div></section>);
}
