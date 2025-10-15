import { Suspense } from 'react';
import NewsClient from './news-client';

export const dynamic = 'force-dynamic';

export default function Page() {
  return (
    <section>
      <h1 className="text-2xl font-semibold mb-3">Top headlines</h1>

      {/* Required: wrap Client Component (uses useSearchParams) in Suspense */}
      <Suspense fallback={<div className="text-slate-600">Loading…</div>}>
        <NewsClient />
      </Suspense>
    </section>
  );
}
