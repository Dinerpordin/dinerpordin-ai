// app/news/page.tsx
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface NewsItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  topic: string;
  lang: string;
}

interface NewsResponse {
  items: NewsItem[];
  meta: {
    country: string;
    topic: string;
    lang: string;
    provider: string;
    errorCount: number;
    warning: string | null;
  };
}

// Filter chips component
function FilterChips({ currentTopic, currentLang, onFilterChange }: {
  currentTopic: string;
  currentLang: string;
  onFilterChange: (topic: string, lang: string) => void;
}) {
  const topics = [
    { id: 'world', label: 'World' },
    { id: 'bangladesh', label: 'Bangladesh' },
    { id: 'sports', label: 'Sports' },
    { id: 'technology', label: 'Technology' }
  ];

  return (
    <div className="space-y-4">
      {/* Topic Filters */}
      <div className="flex flex-wrap gap-2">
        {topics.map((topic) => (
          <button
            key={topic.id}
            onClick={() => onFilterChange(topic.id, currentLang)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              currentTopic === topic.id
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {topic.label}
          </button>
        ))}
      </div>

      {/* Language Toggle */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-gray-700">Language:</span>
        <button
          onClick={() => onFilterChange(currentTopic, 'en')}
          className={`px-3 py-1 rounded text-sm font-medium ${
            currentLang === 'en'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          EN
        </button>
        <button
          onClick={() => onFilterChange(currentTopic, 'bn')}
          className={`px-3 py-1 rounded text-sm font-medium ${
            currentLang === 'bn'
              ? 'bg-green-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          BN
        </button>
      </div>
    </div>
  );
}

// Search component
function SearchBox({ currentQuery, onSearch }: {
  currentQuery: string;
  onSearch: (query: string) => void;
}) {
  const [localQuery, setLocalQuery] = useState(currentQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localQuery);
  };

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-md">
      <div className="relative">
        <input
          type="text"
          value={localQuery}
          onChange={(e) => setLocalQuery(e.target.value)}
          placeholder="Search news..."
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <button
          type="submit"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 px-3 py-1 bg-blue-600 text-white rounded text-sm"
        >
          Search
        </button>
      </div>
    </form>
  );
}

// News item component
function NewsCard({ item }: { item: NewsItem }) {
  return (
    <article className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <div className="flex justify-between items-start mb-2">
        <h2 className="text-xl font-semibold text-gray-900 pr-4">
          <a 
            href={item.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="hover:text-blue-600 transition-colors"
          >
            {item.title}
          </a>
        </h2>
        <span className={`px-2 py-1 text-xs rounded-full ${
          item.lang === 'bn' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
        }`}>
          {item.lang.toUpperCase()}
        </span>
      </div>
      
      <p className="text-gray-600 mb-3 line-clamp-3">{item.summary}</p>
      
      <div className="flex justify-between items-center text-sm text-gray-500">
        <span className="font-medium">{item.source}</span>
        <span className="capitalize">{item.topic}</span>
      </div>
    </article>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
          <div className="h-6 bg-gray-200 rounded mb-2 w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded mb-1 w-full"></div>
          <div className="h-4 bg-gray-200 rounded mb-1 w-5/6"></div>
          <div className="h-4 bg-gray-200 rounded mb-3 w-4/6"></div>
          <div className="flex justify-between">
            <div className="h-4 bg-gray-200 rounded w-20"></div>
            <div className="h-4 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Main news content component
function NewsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const topic = searchParams.get('topic') || 'world';
  const lang = searchParams.get('lang') || 'en';
  const q = searchParams.get('q') || '';
  
  const [news, setNews] = useState<NewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateURL = (newTopic: string, newLang: string, newQuery: string = '') => {
    const params = new URLSearchParams();
    params.set('topic', newTopic);
    params.set('lang', newLang);
    if (newQuery) {
      params.set('q', newQuery);
    }
    router.push(`/news?${params.toString()}`);
  };

  const handleFilterChange = (newTopic: string, newLang: string) => {
    updateURL(newTopic, newLang, q);
  };

  const handleSearch = (query: string) => {
    updateURL(topic, lang, query);
  };

  useEffect(() => {
    const fetchNews = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const params = new URLSearchParams({ topic, lang });
        if (q) params.set('q', q);
        
        const response = await fetch(`/api/news?${params.toString()}`, {
          cache: 'no-store'
        });
        
        if (!response.ok) {
          throw new Error('Failed to fetch news');
        }
        
        const data: NewsResponse = await response.json();
        setNews(data);
      } catch (err) {
        setError('Failed to load news. Please try again.');
        console.error('Error fetching news:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [topic, lang, q]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Diner Pordin News</h1>
          <p className="text-gray-600">Latest headlines from around the world</p>
        </header>

        {/* Filters and Search */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <FilterChips
            currentTopic={topic}
            currentLang={lang}
            onFilterChange={handleFilterChange}
          />
          <SearchBox
            currentQuery={q}
            onSearch={handleSearch}
          />
        </div>

        {/* Meta Info */}
        {news?.meta && (
          <div className="mb-6 p-4 bg-white rounded-lg shadow-sm">
            <div className="flex flex-wrap gap-4 text-sm text-gray-600">
              <span>Provider: {news.meta.provider}</span>
              <span>Topic: {news.meta.topic}</span>
              <span>Language: {news.meta.lang.toUpperCase()}</span>
              <span>Country: {news.meta.country.toUpperCase()}</span>
              {news.meta.warning && (
                <span className="text-yellow-600">{news.meta.warning}</span>
              )}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Loading State */}
        {loading && <LoadingSkeleton />}

        {/* News Items */}
        {!loading && news && (
          <div className="space-y-6">
            {news.items.length > 0 ? (
              news.items.map((item, index) => (
                <NewsCard key={`${item.url}-${index}`} item={item} />
              ))
            ) : (
              <div className="text-center py-12">
                <p className="text-gray-500 text-lg">No news found for your selection.</p>
                <p className="text-gray-400 mt-2">Try changing filters or search terms.</p>
              </div>
            )}
          </div>
        )}

        {/* Footer Disclaimer */}
        <footer className="mt-12 pt-6 border-t border-gray-200">
          <p className="text-center text-sm text-gray-500">
            News aggregated from various RSS feeds. Summaries may be AI-generated.
          </p>
        </footer>
      </div>
    </div>
  );
}

// Main page with Suspense boundary
export default function NewsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading news...</p>
        </div>
      </div>
    }>
      <NewsContent />
    </Suspense>
  );
}
