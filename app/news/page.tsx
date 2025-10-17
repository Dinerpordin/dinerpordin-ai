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
    totalItems: number;
    returnedItems: number;
    sources: string[];
    providers: string;
    warning: string | null;
  };
}

const CATEGORIES = [
  {
    id: 'bangladesh',
    name: 'বাংলাদেশ',
    icon: '🇧🇩',
    description: 'Bangladesh News',
    color: 'green'
  },
  {
    id: 'world',
    name: 'World',
    icon: '🌍',
    description: 'International News',
    color: 'blue'
  },
  {
    id: 'economy',
    name: 'Economy',
    icon: '💹',
    description: 'Business & Finance',
    color: 'purple'
  },
  {
    id: 'cricket',
    name: 'Cricket',
    icon: '🏏',
    description: 'Cricket News',
    color: 'red'
  },
  {
    id: 'football',
    name: 'Football',
    icon: '⚽',
    description: 'Football News',
    color: 'orange'
  }
];

function CategoryFilter({ currentCategory, onCategoryChange }: {
  currentCategory: string;
  onCategoryChange: (category: string) => void;
}) {
  return (
    <div className="flex flex-col space-y-4 mb-8">
      <h2 className="text-2xl font-bold text-gray-900 text-center">নিউজ ক্যাটেগরি</h2>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        {CATEGORIES.map((category) => (
          <button
            key={category.id}
            onClick={() => onCategoryChange(category.id)}
            className={`p-4 rounded-xl border-2 transition-all duration-200 text-center hover:shadow-lg ${
              currentCategory === category.id
                ? `border-${category.color}-500 bg-${category.color}-50 shadow-md transform scale-105`
                : 'border-gray-200 bg-white hover:border-gray-300'
            }`}
          >
            <div className="text-3xl mb-2">{category.icon}</div>
            <div className={`font-semibold text-sm ${
              currentCategory === category.id ? `text-${category.color}-700` : 'text-gray-900'
            }`}>
              {category.name}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              {category.description}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}

function NewsCard({ item }: { item: NewsItem }) {
  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Recently';
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
      
      if (diffInHours < 1) return 'Just now';
      if (diffInHours < 24) return `${diffInHours}h ago`;
      return `${Math.floor(diffInHours / 24)}d ago`;
    } catch {
      return 'Recently';
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-300 border border-gray-200 overflow-hidden">
      <div className="p-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
              {item.source}
            </span>
            {item.lang === 'bn' && (
              <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">বাংলা</span>
            )}
          </div>
          <div className="flex items-center space-x-2 text-xs text-gray-500">
            {item.readTime && <span>{item.readTime} min read</span>}
            <span>•</span>
            <span>{formatDate(item.publishedAt)}</span>
          </div>
        </div>
        
        <h3 className="font-bold text-lg mb-3 leading-tight text-gray-900 hover:text-blue-600 transition-colors">
          <a href={item.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
            {item.title}
          </a>
        </h3>
        
        <p className="text-gray-600 text-sm mb-4 leading-relaxed line-clamp-3">
          {item.summary}
        </p>
        
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 capitalize">{item.category} • {item.topic}</span>
          <a 
            href={item.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-blue-600 hover:text-blue-800 text-sm font-medium flex items-center space-x-1"
          >
            <span>Read Full</span>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      </div>
    </div>
  );
}

function NewsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const category = searchParams.get('category') || 'bangladesh';
  const lang = searchParams.get('lang') || 'en';
  
  const [news, setNews] = useState<NewsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const updateURL = (newCategory: string) => {
    const params = new URLSearchParams();
    params.set('category', newCategory);
    router.push(`/news?${params.toString()}`, { scroll: false });
  };

  const handleCategoryChange = (newCategory: string) => {
    setLoading(true);
    setNews(null);
    updateURL(newCategory);
  };

  useEffect(() => {
    const fetchNews = async () => {
      setError(null);
      setLoading(true);
      
      try {
        console.log(`Fetching ${category} news...`);
        const response = await fetch(`/api/news?category=${category}`, {
          cache: 'no-store'
        });
        
        if (!response.ok) throw new Error('Failed to fetch news');
        
        const data: NewsResponse = await response.json();
        console.log(`Received ${data.items.length} items from ${data.meta.providers}`);
        setNews(data);
      } catch (err) {
        setError('Failed to load news. Please try again.');
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, [category]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Diner Pordin News</h1>
          <p className="text-gray-600">Latest news from Bangladesh and around the world</p>
        </header>

        {/* Category Filters */}
        <CategoryFilter currentCategory={category} onCategoryChange={handleCategoryChange} />

        {/* Status Info */}
        {news?.meta && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <div>
                <span className="font-semibold text-blue-800">{news.meta.category}</span>
                <span className="text-blue-600 mx-2">•</span>
                <span className="text-blue-600">{news.meta.returnedItems} articles</span>
                <span className="text-blue-600 mx-2">•</span>
                <span className="text-blue-600">Source: {news.meta.providers}</span>
              </div>
              {news.meta.warning && (
                <span className="text-sm text-orange-600 bg-orange-50 px-2 py-1 rounded">
                  ⚠️ {news.meta.warning}
                </span>
              )}
            </div>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-6 mb-6">
            <div className="flex items-center gap-3">
              <div className="text-red-500 text-xl">⚠️</div>
              <div>
                <h3 className="text-red-800 font-semibold">Error Loading News</h3>
                <p className="text-red-600 mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="bg-white rounded-lg shadow p-6 animate-pulse">
                <div className="flex justify-between mb-3">
                  <div className="h-6 bg-gray-200 rounded w-20"></div>
                  <div className="h-6 bg-gray-200 rounded w-16"></div>
                </div>
                <div className="h-6 bg-gray-200 rounded mb-3"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        )}

        {/* News Grid */}
        {!loading && news && (
          <div>
            {news.items.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {news.items.map((item) => (
                  <NewsCard key={item.id} item={item} />
                ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-white rounded-lg border border-gray-200">
                <div className="text-6xl mb-4">📰</div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">No News Available</h3>
                <p className="text-gray-600 mb-4">Try selecting a different category</p>
                <button 
                  onClick={() => handleCategoryChange('bangladesh')}
                  className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Load Bangladesh News
                </button>
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <footer className="mt-12 pt-8 border-t border-gray-200 text-center text-sm text-gray-500">
          <p>News from trusted sources • Always up-to-date</p>
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
