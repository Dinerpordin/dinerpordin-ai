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

function LanguageToggle({ currentLang, onLangChange }: {
  currentLang: string;
  onLangChange: (lang: string) => void;
}) {
  return (
    <div className="flex items-center space-x-2 bg-gray-100 rounded-lg p-1">
      <button
        onClick={() => onLangChange('en')}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          currentLang === 'en'
            ? 'bg-white text-blue-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-800'
        }`}
      >
        English
      </button>
      <button
        onClick={() => onLangChange('bn')}
        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
          currentLang === 'bn'
            ? 'bg-white text-green-600 shadow-sm'
            : 'text-gray-600 hover:text-gray-800'
        }`}
      >
        বাংলা
      </button>
    </div>
  );
}

function SearchBox({ currentQuery, onSearch, resultsCount }: {
  currentQuery: string;
  onSearch: (query: string) => void;
  resultsCount: number;
}) {
  const [localQuery, setLocalQuery] = useState(currentQuery);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(localQuery);
  };

  const handleClear = () => {
    setLocalQuery('');
    onSearch('');
  };

  return (
    <div className="w-full max-w-2xl">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Search news headlines, content, or sources..."
            className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg shadow-sm"
          />
          {localQuery && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-20 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
          <button
            type="submit"
            className="absolute right-2 top-1/2 transform -translate-y-1/2 px-4 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            Search
          </button>
        </div>
      </form>
      {currentQuery && (
        <p className="text-sm text-gray-600 mt-2">
          Found {resultsCount} result{resultsCount !== 1 ? 's' : ''} for "{currentQuery}"
        </p>
      )}
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const [imageError, setImageError] = useState(false);
  
  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return 'Just now';
      if (diffInHours < 24) return `${diffInHours}h ago`;
      if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`;
      
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return '';
    }
  };

  const getCategoryColor = (category: string) => {
    const cat = CATEGORIES.find(c => c.id === category);
    return cat?.color || 'gray';
  };

  return (
    <article className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100 group">
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-3">
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-${getCategoryColor(item.category)}-100 text-${getCategoryColor(item.category)}-800`}>
                {item.category}
              </span>
              <span className="text-xs text-gray-500">{item.readTime || 2} min read</span>
            </div>
            
            <h2 className="text-xl font-bold text-gray-900 leading-tight mb-3 group-hover:text-blue-600 transition-colors">
              <a 
                href={item.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:underline"
              >
                {item.title}
              </a>
            </h2>
            
            <p className="text-gray-700 leading-relaxed mb-4 line-clamp-3">
              {item.summary}
            </p>
          </div>
          
          {item.imageUrl && !imageError && (
            <div className="ml-6 flex-shrink-0">
              <img 
                src={item.imageUrl} 
                alt={item.title}
                className="w-24 h-24 object-cover rounded-lg shadow-sm"
                onError={() => setImageError(true)}
              />
            </div>
          )}
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span className="font-semibold text-gray-700">{item.source}</span>
            {item.publishedAt && (
              <span>{formatDate(item.publishedAt)}</span>
            )}
            {item.lang === 'bn' && (
              <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">বাংলা</span>
            )}
          </div>
          
          <a 
            href={item.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors group-hover:underline"
          >
            Read full
            <svg className="ml-1 w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </article>
  );
}

function StatsPanel({ meta }: { meta: NewsResponse['meta'] }) {
  if (!meta) return null;

  return (
    <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-6 mb-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="text-3xl">{meta.categoryIcon}</div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{meta.category}</h2>
            <p className="text-gray-600">{meta.categoryDescription}</p>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="bg-white px-3 py-2 rounded-lg shadow-sm">
            <span className="font-semibold text-gray-700">{meta.returnedItems}</span>
            <span className="text-gray-500 ml-1">articles</span>
          </div>
          {meta.sources.length > 0 && (
            <div className="bg-white px-3 py-2 rounded-lg shadow-sm">
              <span className="font-semibold text-gray-700">{meta.sources.length}</span>
              <span className="text-gray-500 ml-1">sources</span>
            </div>
          )}
          {meta.summarization !== 'none' && (
            <div className="bg-white px-3 py-2 rounded-lg shadow-sm">
              <span className="font-semibold text-orange-600">AI</span>
              <span className="text-gray-500 ml-1">summaries</span>
            </div>
          )}
        </div>
      </div>
      
      {meta.sources.length > 0 && (
        <div className="mt-4 pt-4 border-t border-blue-200">
          <p className="text-sm text-gray-600 mb-2">Sources: {meta.sources.join(', ')}</p>
        </div>
      )}
      
      {meta.warning && (
        <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">{meta.warning}</p>
        </div>
      )}
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-md p-6 animate-pulse border border-gray-100">
          <div className="flex justify-between items-start mb-4">
            <div className="flex-1 space-y-3">
              <div className="flex space-x-2">
                <div className="h-6 bg-gray-200 rounded w-20"></div>
                <div className="h-6 bg-gray-200 rounded w-16"></div>
              </div>
              <div className="h-7 bg-gray-200 rounded w-4/5"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded w-full"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                <div className="h-4 bg-gray-200 rounded w-4/6"></div>
              </div>
            </div>
            <div className="w-24 h-24 bg-gray-200 rounded-lg ml-6"></div>
          </div>
          <div className="flex justify-between pt-4 border-t border-gray-100">
            <div className="flex space-x-4">
              <div className="h-5 bg-gray-200 rounded w-20"></div>
              <div className="h-5 bg-gray-200 rounded w-16"></div>
            </div>
            <div className="h-5 bg-gray-200 rounded w-16"></div>
          </div>
        </div>
      ))}
    </div>
  );
}

function NewsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const category = searchParams.get('category') || 'world';
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
    updateURL(newCategory, lang, q);
  };

  const handleLangChange = (newLang: string) => {
    setLoading(true);
    updateURL(category, newLang, q);
  };

  const handleSearch = (query: string) => {
    setLoading(true);
    updateURL(category, lang, query);
  };

  useEffect(() => {
    const fetchNews = async () => {
      setError(null);
      
      try {
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
        setNews(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load news. Please try again.');
        console.error('Error fetching news:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [category, lang, q]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Diner Pordin News
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Curated news from trusted global and Bangladeshi sources
          </p>
        </header>

        {/* Category Filters */}
        <div className="mb-8">
          <CategoryFilter
            currentCategory={category}
            onCategoryChange={handleCategoryChange}
          />
        </div>

        {/* Search and Language */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 mb-8">
          <SearchBox
            currentQuery={q}
            onSearch={handleSearch}
            resultsCount={news?.meta.returnedItems || 0}
          />
          <LanguageToggle
            currentLang={lang}
            onLangChange={handleLangChange}
          />
        </div>

        {/* Stats Panel */}
        {news?.meta && <StatsPanel meta={news.meta} />}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8">
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
        {loading && <LoadingSkeleton />}

        {/* News Items */}
        {!loading && news && (
          <div className="space-y-6">
            {news.items.length > 0 ? (
              news.items.map((item) => (
                <NewsCard key={item.id} item={item} />
              ))
            ) : (
              <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
                <div className="text-6xl mb-4">📰</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No news found</h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  {q ? `No results found for "${q}". Try different search terms.` 
                     : 'No articles available for this category. Try selecting a different category.'}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-16 pt-8 border-t border-gray-200">
          <div className="text-center text-sm text-gray-500 max-w-2xl mx-auto">
            <p className="mb-2">
              News aggregated from trusted global and Bangladeshi sources including BBC, Reuters, The Daily Star, and more.
            </p>
            <p>
              Summaries may be AI-generated. All content belongs to their respective publishers.
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading Diner Pordin News...</p>
        </div>
      </div>
    }>
      <NewsContent />
    </Suspense>
  );
}
