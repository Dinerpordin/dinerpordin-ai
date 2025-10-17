'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

interface NewsItem {
  id: string;
  title: string;
  summary: string;
  url: string;
  source: string;
  topic: string;
  lang: string;
  publishedAt?: string;
  imageUrl?: string;
}

interface NewsResponse {
  items: NewsItem[];
  meta: {
    topic: string;
    lang: string;
    totalItems: number;
    returnedItems: number;
    sources: string[];
    error?: string;
  };
}

const TOPICS = [
  { id: 'world', name: '🌍 World News', description: 'International news' },
  { id: 'bangladesh', name: '🇧🇩 Bangladesh', description: 'Local news' },
  { id: 'economy', name: '💼 Economy', description: 'Business & finance' },
  { id: 'sports', name: '⚽ Sports', description: 'Sports news' }
];

function TopicFilter({ currentTopic, onTopicChange }: {
  currentTopic: string;
  onTopicChange: (topic: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {TOPICS.map((topic) => (
        <button
          key={topic.id}
          onClick={() => onTopicChange(topic.id)}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            currentTopic === topic.id
              ? 'bg-blue-600 text-white'
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
          title={topic.description}
        >
          {topic.name}
        </button>
      ))}
    </div>
  );
}

function LanguageToggle({ currentLang, onLangChange }: {
  currentLang: string;
  onLangChange: (lang: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 mb-6">
      <span className="text-sm font-medium text-gray-700">Language:</span>
      <button
        onClick={() => onLangChange('en')}
        className={`px-3 py-1 rounded text-sm font-medium ${
          currentLang === 'en'
            ? 'bg-blue-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        English
      </button>
      <button
        onClick={() => onLangChange('bn')}
        className={`px-3 py-1 rounded text-sm font-medium ${
          currentLang === 'bn'
            ? 'bg-green-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        বাংলা
      </button>
      <button
        onClick={() => onLangChange('all')}
        className={`px-3 py-1 rounded text-sm font-medium ${
          currentLang === 'all'
            ? 'bg-purple-600 text-white'
            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
        }`}
      >
        All
      </button>
    </div>
  );
}

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
    <form onSubmit={handleSubmit} className="mb-6">
      <div className="relative max-w-md">
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

function NewsCard({ item }: { item: NewsItem }) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

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
        <div className="flex items-center gap-2">
          <span className="capitalize">{item.topic}</span>
          {item.publishedAt && (
            <span>{formatDate(item.publishedAt)}</span>
          )}
        </div>
      </div>
    </article>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(6)].map((_, i) => (
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
    router.push(`/news?${params.toString()}`, { scroll: false });
  };

  const handleTopicChange = (newTopic: string) => {
    setLoading(true);
    updateURL(newTopic, lang, q);
  };

  const handleLangChange = (newLang: string) => {
    setLoading(true);
    updateURL(topic, newLang, q);
  };

  const handleSearch = (query: string) => {
    setLoading(true);
    updateURL(topic, lang, query);
  };

  useEffect(() => {
    const fetchNews = async () => {
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
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Diner Pordin News</h1>
          <p className="text-gray-600">Latest headlines from around the world</p>
        </header>

        <div className="max-w-4xl mx-auto">
          <TopicFilter currentTopic={topic} onTopicChange={handleTopicChange} />
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <LanguageToggle currentLang={lang} onLangChange={handleLangChange} />
            <SearchBox currentQuery={q} onSearch={handleSearch} />
          </div>

          {news?.meta && (
            <div className="mb-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex flex-wrap items-center gap-4 text-sm text-blue-800">
                <span>Showing {news.meta.returnedItems} of {news.meta.totalItems} articles</span>
                <span>•</span>
                <span>Sources: {news.meta.sources.join(', ')}</span>
                {news.meta.error && (
                  <span className="text-orange-600">• {news.meta.error}</span>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
            </div>
          )}

          {loading && <LoadingSkeleton />}

          {!loading && news && (
            <div className="space-y-6">
              {news.items.length > 0 ? (
                news.items.map((item) => (
                  <NewsCard key={item.id} item={item} />
                ))
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-500 text-lg">No news found for your selection.</p>
                  <p className="text-gray-400 mt-2">Try changing filters or search terms.</p>
                </div>
              )}
            </div>
          )}
        </div>

        <footer className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>News aggregated from various RSS feeds. All content belongs to their respective publishers.</p>
        </footer>
      </div>
    </div>
  );
}

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
