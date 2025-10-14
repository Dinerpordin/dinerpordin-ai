
'use client';
import { useChat } from '@ai-sdk/react';
export default function ChatPage(){
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({ api:'/api/chat' });
  return (<section className="space-y-4">
    <h1 className="text-2xl font-semibold">General AI Chat</h1>
    <div className="border rounded p-4 bg-white h-80 overflow-y-auto">
      {messages.map(m=>(<div key={m.id} className="mb-2"><span className="text-xs text-slate-500">{m.role==='user'?'You':'AI'}</span><div className="whitespace-pre-wrap">{m.content}</div></div>))}
      {isLoading && <div className="text-slate-500 text-sm">Thinking…</div>}
    </div>
    <form onSubmit={handleSubmit} className="flex gap-2">
      <input value={input} onChange={handleInputChange} className="flex-1 border rounded p-2" placeholder="Ask anything…" />
      <button className="px-4 py-2 rounded bg-indigo-600 text-white">Send</button>
    </form>
  </section>);
}
