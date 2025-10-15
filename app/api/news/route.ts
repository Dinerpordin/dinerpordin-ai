export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // 🔧 emergency override
  if (searchParams.get('provider') === 'rss' || process.env.FORCE_RSS === '1') {
    const country = (searchParams.get('country') || 'gb').toLowerCase();
    const topic   = (searchParams.get('topic')   || 'world').toLowerCase();
    const lang    = (searchParams.get('lang')    || 'en').toLowerCase();
    const q       = searchParams.get('q') || undefined;

    const a = await fromRSS({ country, topic, lang, q });
    return j({ articles: a.articles, country, topic, lang, warning: a.warning ?? null });
  }
  // … continue with the rest of the file unchanged …
}
