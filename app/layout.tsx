
import './globals.css';
import Link from 'next/link';
import type { Metadata } from 'next';
export const metadata: Metadata = { title: 'Diner Pordin — AI', description: 'AI-enabled site starter' };
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="text-slate-900">

        <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
        <footer className="max-w-5xl mx-auto px-4 py-10 text-xs text-slate-500">Educational purposes only.</footer>
      </body>
    </html>
  );
}
