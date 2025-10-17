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
  category: string;
  readTime?: number;
}

interface NewsResponse {
  items: NewsItem[];
  meta: {
    category: string;
    categoryIcon: string;
    categoryDescription: string;
    categoryDescription: string;
    categoryColor: string;
    lang: string;
    provider: string;
    totalItems: number;
    returnedItems: number;
    providerStats: any;
    summarization: string;
    sources: string[];
    warning: string | null;
  };
}

// Category configuration
const CATEGORIES = [
  {
    id: 'world',
    name: 'World News',
    icon: '🌍',
    description: 'Global politics & international affairs',
    color: 'blue'
  },
  {
    id: 'bangladesh',
    name: 'Bangladesh',
    icon: '🇧🇩', 
    description: 'Local politics & national events',
    color: 'green'
  },
  {
    id: 'economy',
    name: 'Economy',
    icon: '💹',
    description: 'Markets, trade & finance',
    color: 'purple'
  },
  {
    id: 'football',
    name: 'Football',
    icon: '⚽',
    description: 'Global soccer & local matches',
    color: 'orange'
  },
  {
    id: 'cricket',
    name: 'Cricket',
    icon: '🏏',
    description: 'International & Bangladesh cricket',
    color: 'red'
  }
];

function CategoryFilter({ currentCategory, onCategoryChange }: {
  currentCategory: string;
  onCategoryChange: (category: string) => void;
}) {
  return (
    <div className="flex flex-col space-y-4">
      <h3 className="text-lg font-semibold text-gray-900">Browse by Category</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`p-4 rounded-xl border-2 transition-all duration-300 text-left group hover:shadow-lg ${
              currentCategory === category.id
                ? `border-${category.color}-500 bg-${category.color}-50 shadow-md transform scale-105`
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-2xl">{category.icon}</span>
              <div>
                <div className={`font-semibold text-sm ${
                  currentCategory === category.id ? `text-${category.color}-700` : 'text-gray-900'
                }`}>
                  {category.name}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  {category.description}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function DebugPanel({ meta, items }: { meta: NewsResponse['meta'], items: NewsItem[] }) {
  if (!meta || items.length === 0) return null;

  return (
    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
      <h4 className="font-semibold text-yellow-800 mb-2">Debug Information</h4>
      <div className="text-sm text-yellow-700 space-y-1">
        <div>Total Items: {meta.totalItems}</div>
        <div>Sources: {meta.sources.join(', ')}</div>
        <div>Feeds: {meta.providerStats.successfulFeeds}/{meta.providerStats.totalFeeds} successful</div>
        <div>Category: {meta.category}</div>
      </div>
    </div>
  );
}

function NewsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const category = searchParams.get('category') || 'bangladesh'; // Default to Bangladesh
  const lang = searchParams.get('lang') || 'en';
  const q = searchParams.get('q') || '';
  
  const [news, setNews] = useState<NewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateURL = (newCategory: string, newLang: string, newQuery: string = '') => {
    const params = new URLSearchParams();
    params.set('category', newCategory);
    params.set('lang', newLang);
    if (newQuery) {
      params.set('q', newQuery);
    }
    router.push(`/news?${params.toString()}`, { scroll: false });
  };

  const handleCategoryChange = (newCategory: string) => {
    setLoading(true);
    setNews(null);
    updateURL(newCategory, lang, q);
  };

  useEffect(() => {
    const fetchNews = async () => {
      setError(null);
      setLoading(true);
      
      try {
        console.log(`Fetching news for category: ${category}`);
        const params = new URLSearchParams({ category, lang });
        if (q) params.set('q', q);
        params.set('limit', '30');
        
        const response = await fetch(`/api/news?${params.toString()}`, {
          cache: 'no-store',
          headers: {
            'Cache-Control': 'no-cache'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch news: ${response.status}`);
        }
        
        const data: NewsResponse = await response.json();
        console.log(`Received ${data.items.length} items for ${category}`, data.meta);
        setNews(data);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to load news. Please try again.';
        setError(errorMsg);
        console.error('Error fetching news:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [category, lang, q]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Diner Pordin News</h1>
          <p className="text-gray-600">Latest news from trusted global and Bangladeshi sources</p>
        </header>

        {/* Category Filters */}
        <div className="mb-8">
          <CategoryFilter
            currentCategory={category}
            onCategoryChange={handleCategoryChange}
          />
        </div>

        {/* Debug Info */}
        {news && <DebugPanel meta={news.meta} items={news.items} />}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3">
              <div className="text-red-500 text-xl">⚠️</div>
              <div>
                <h3 className="text-red-800 font-semibold">Unable to load news</h3>
                <p className="text-red-600 mt-1">{error}</p>
                <button 
                  onClick={() => window.location.reload()}
                  className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading {CATEGORIES.find(c => c.id === category)?.name} news...</p>
          </div>
        )}

        {/* News Items */}
        {!loading && news && (
          <div>
            {news.items.length > 0 ? (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {news.meta.category} News ({news.items.length} articles)
                  </h2>
                  <div className="text-sm text-gray-500">
                    Sources: {news.meta.sources.slice(0, 3).join(', ')}
                    {news.meta.sources.length > 3 && ' and more...'}
                  </div>
                </div>
                
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {news.items.map((item) => (
                    <div key={item.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow border border-gray-200">
                      <div className="p-6">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                            {item.source}
                          </span>
                          {item.readTime && (
                            <span className="text-xs text-gray-500">{item.readTime} min read</span>
                          )}
                        </div>
                        
                        <h3 className="font-bold text-lg mb-3 line-clamp-3">
                          <a 
                            href={item.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:text-blue-600 transition-colors"
                          >
                            {item.title}
                          </a>
                        </h3>
                        
                        <p className="text-gray-600 text-sm mb-4 line-clamp-3">
                          {item.summary}
                        </p>
                        
                        <div className="flex items-center justify-between text-xs text-gray-500">
                          <span>
                            {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString() : 'Recent'}
                          </span>
                          {item.lang === 'bn' && (
                            <span className="bg-green-100 text-green-800 px-2 py-1 rounded">বাংলা</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                <div className="text-6xl mb-4">📰</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No news found</h3>
                <p className="text-gray-600 mb-4">
                  {news.meta.warning || 'Try selecting a different category or check back later.'}
                </p>
                <div className="text-sm text-gray-500">
                  <p>Current category: {news.meta.category}</p>
                  <p>Successful feeds: {news.meta.providerStats.successfulFeeds}/{news.meta.providerStats.totalFeeds}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-200">
          <div className="text-center text-sm text-gray-500">
            <p className="mb-2">
              News aggregated from trusted global and Bangladeshi sources.
            </p>
            <p>
              All content belongs to their respective publishers.
            </p>
          </div>
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
