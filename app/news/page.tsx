// app/news/page.tsx
import { Suspense } from 'react';
import NewsClient from './news-client';

// make sure we render at runtime (not pre-render) to avoid static bailouts
export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <section>
      <h1 className="text-2xl font-semibold mb-3">Top headlines</h1>
      <Suspense fallback={<div className="text-slate-600">Loading…</div>}>
        <NewsClient />
      </Suspense>
    </section>
  );
}
