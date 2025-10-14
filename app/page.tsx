
import Link from 'next/link';
export default function Home(){return (<section className="space-y-4">
  <h1 className="text-2xl font-semibold">Diner Pordin — AI Starter</h1>
  <p className="text-slate-600">Jump into any feature below.</p>
  <ul className="grid grid-cols-1 md:grid-cols-2 gap-4">
    <li className="border rounded p-4 bg-white"><Link href="/health" className="font-medium">Health Assistant</Link><p className="text-sm text-slate-600">Structured EN/BN output.</p></li>
    <li className="border rounded p-4 bg-white"><Link href="/chat" className="font-medium">Chat</Link><p className="text-sm text-slate-600">Streaming chat with AI SDK.</p></li>
    <li className="border rounded p-4 bg-white"><Link href="/news" className="font-medium">News</Link><p className="text-sm text-slate-600">Top headlines, cached.</p></li>
    <li className="border rounded p-4 bg-white"><Link href="/gallery" className="font-medium">Gallery</Link><p className="text-sm text-slate-600">Trending videos/photos.</p></li>
    <li className="border rounded p-4 bg-white"><Link href="/economy" className="font-medium">Economy</Link><p className="text-sm text-slate-600">USD→BDT + AI note.</p></li>
    <li className="border rounded p-4 bg-white"><Link href="/local" className="font-medium">Local</Link><p className="text-sm text-slate-600">Weather & prayer times.</p></li>
  </ul>
</section>);}
