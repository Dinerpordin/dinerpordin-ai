
'use client';
import React, { useEffect, useState } from 'react';
export default function GalleryPage(){
  const [videos,setVideos]=useState<any[]>([]); const [photos,setPhotos]=useState<any[]>([]); const [err,setErr]=useState<string|null>(null);
  useEffect(()=>{(async()=>{try{const v=await fetch('/api/gallery/videos'); const vj=await v.json(); if(!v.ok) throw new Error(vj.error||'Videos failed');
    const p=await fetch('/api/gallery/photos'); const pj=await p.json(); if(!p.ok) throw new Error(pj.error||'Photos failed');
    setVideos(vj.items||[]); setPhotos(pj.photos||[]);}catch(e:any){setErr(e.message||'Error');}})();},[]);
  return (<section className="space-y-6"><h1 className="text-2xl font-semibold">Gallery</h1>{err&&<div className="p-3 bg-red-50 text-red-800 rounded">{err}</div>}
  <h2 className="text-lg font-semibold">Trending videos</h2>
  <div className="grid md:grid-cols-3 gap-4">{videos.map((it:any)=>(
    <a key={it.id} href={`https://www.youtube.com/watch?v=${it.id}`} target="_blank" className="block border rounded p-2 bg-white hover:bg-slate-50">
      <img src={it.snippet?.thumbnails?.medium?.url} className="w-full h-36 object-cover rounded" alt={it.snippet?.title||'video'} />
      <div className="mt-2 text-sm font-medium">{it.snippet?.title}</div>
    </a>))}</div>
  <h2 className="text-lg font-semibold">Popular photos</h2>
  <div className="grid md:grid-cols-3 gap-4">{photos.map((p:any)=>(
    <a key={p.id} href={p.url} target="_blank" className="block border rounded p-2 bg-white hover:bg-slate-50">
      <img src={p.src?.medium} className="w-full h-36 object-cover rounded" alt={p.alt||'photo'} />
      <div className="mt-2 text-sm">{p.photographer}</div>
    </a>))}</div></section>);
}
