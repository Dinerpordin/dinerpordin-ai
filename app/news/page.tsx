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
  publishedAt?: string;
  imageUrl?: string;
}

interface NewsResponse {
  items: NewsItem[];
  meta: {
    country: string;
    topic: string;
    lang: string;
    provider: string;
    totalItems: number;
    returnedItems: number;
    providerStats: any;
    summarization: string;
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
    { id: 'world', label: '🌍 World', description: 'International news' },
    { id: 'bangladesh', label: '🇧🇩 Bangladesh', description: 'Bangladesh news' },
    { id: 'sports', label: '⚽ Sports', description: 'Sports updates' },
    { id: 'technology', label: '💻 Technology', description: 'Tech news' }
  ];

  return (
    <div className="space-y-4">
      {/* Topic Filters */}
      <div className="flex flex-wrap gap-2">
        {topics.map((topic) => (
          <button
            key={topic.id}
            onClick={() => onFilterChange(topic.id, currentLang)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
              currentTopic === topic.id
                ? 'bg-blue-600 text-white shadow-lg transform scale-105'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-300'
            }`}
            title={topic.description}
          >
            {topic.label}
          </button>
        ))}
      </div>

      {/* Language Toggle */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Language:</span>
        <div className="flex bg-gray-100 rounded-lg p-1">
          <button
            onClick={() => onFilterChange(currentTopic, 'en')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentLang === 'en'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            English
          </button>
          <button
            onClick={() => onFilterChange(currentTopic, 'bn')}
            className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              currentLang === 'bn'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            বাংলা
          </button>
        </div>
      </div>
    </div>
  );
}

// Search component
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
          <input
            type="text"
            value={localQuery}
            onChange={(e) => setLocalQuery(e.target.value)}
            placeholder="Search news headlines and content..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg shadow-sm"
          />
          {localQuery && (
            <button
              type="button"
              onClick={handleClear}
              className="absolute right-20 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              ✕
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

// News item component
function NewsCard({ item, index }: { item: NewsItem; index: number }) {
  const [imageError, setImageError] = useState(false);
  
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
    <article className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden border border-gray-100">
      <div className="p-6">
        <div className="flex justify-between items-start mb-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-bold text-gray-900 pr-4 leading-tight mb-2">
              <a 
                href={item.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="hover:text-blue-600 transition-colors duration-200 line-clamp-2"
              >
                {item.title}
              </a>
            </h2>
            
            <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
              <span className="font-semibold text-blue-600">{item.source}</span>
              <span className="capitalize px-2 py-1 bg-gray-100 rounded-full">{item.topic}</span>
              <span className={`px-2 py-1 rounded-full ${
                item.lang === 'bn' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-blue-100 text-blue-800'
              }`}>
                {item.lang.toUpperCase()}
              </span>
              {item.publishedAt && (
                <span className="text-gray-400">{formatDate(item.publishedAt)}</span>
              )}
            </div>
          </div>
          
          {item.imageUrl && !imageError && (
            <div className="ml-4 flex-shrink-0">
              <img 
                src={item.imageUrl} 
                alt={item.title}
                className="w-20 h-20 object-cover rounded-lg"
                onError={() => setImageError(true)}
              />
            </div>
          )}
        </div>
        
        <p className="text-gray-700 leading-relaxed line-clamp-3">
          {item.summary}
        </p>
        
        <div className="mt-4 pt-3 border-t border-gray-100">
          <a 
            href={item.url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors"
          >
            Read full article →
          </a>
        </div>
      </div>
    </article>
  );
}

// Provider stats component
function ProviderStats({ meta }: { meta: NewsResponse['meta'] }) {
  if (!meta.providerStats) return null;

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="font-semibold text-blue-800">Sources:</span>
        {meta.providerStats.newsapi > 0 && (
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
            NewsAPI: {meta.providerStats.newsapi}
          </span>
        )}
        {meta.providerStats.gnews > 0 && (
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
            GNews: {meta.providerStats.gnews}
          </span>
        )}
        {meta.providerStats.newsdata > 0 && (
          <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded">
            NewsData: {meta.providerStats.newsdata}
          </span>
        )}
        {meta.providerStats.rss > 0 && (
          <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded">
            RSS: {meta.providerStats.rss}
          </span>
        )}
        {meta.summarization !== 'none' && (
          <span className="bg-orange-100 text-orange-800 px-2 py-1 rounded">
            AI: {meta.summarization}
          </span>
        )}
        {meta.errorCount > 0 && (
          <span className="bg-red-100 text-red-800 px-2 py-1 rounded">
            {meta.errorCount} failed
          </span>
        )}
      </div>
    </div>
  );
}

// Loading skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-6">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="bg-white rounded-xl shadow-md p-6 animate-pulse border border-gray-100">
          <div className="flex justify-between items-start mb-3">
            <div className="flex-1 space-y-2">
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="flex gap-2">
                <div className="h-5 bg-gray-200 rounded w-20"></div>
                <div className="h-5 bg-gray-200 rounded w-16"></div>
                <div className="h-5 bg-gray-200 rounded w-12"></div>
              </div>
            </div>
            <div className="w-20 h-20 bg-gray-200 rounded-lg ml-4
