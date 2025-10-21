
import './globals.css';
import Link from 'next/link';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Diner Pordin — AI', description: 'AI-enabled site starter' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="text-slate-900">
       // <header className="bg-white border-b">
         // <nav className="max-w-5xl mx-auto px-4 py-3 flex gap-4">
           // <Link href="/" className="font-semibold">Diner Pordin</Link>
           // <Link href="/health">Health</Link>
          //  <Link href="/chat">Chat</Link>
           // <Link href="/news">News</Link>
           // <Link href="/gallery">Gallery</Link>
           // <Link href="/economy">Economy</Link>
           // <Link href="/local">Local</Link>
         // </nav>
       // </header>
        <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
        <footer className="max-w-5xl mx-auto px-4 py-10 text-xs text-slate-500">Educational purposes only.</footer>
      </body>
    </html>
  );
}
