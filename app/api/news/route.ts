// app/api/news/route.ts
import { NextRequest } from 'next/server';

// Configuration for all free providers
const PROVIDERS = {
  // RSS Feeds (always free, primary fallback)
  rss: {
    world: [
      'https://feeds.bbci.co.uk/news/world/rss.xml',
      'https://rss.cnn.com/rss/edition.rss',
      'https://www.theguardian.com/world/rss'
    ],
    bangladesh: [
      'https://en.prothomalo.com/feed/',
      'https://www.prothomalo.com/feed',
      'https://www.thedailystar.net/frontpage/rss.xml'
    ],
    sports: [
      'https://www.espn.com/espn/rss/news',
      'https://feeds.bbci.co.uk/sport/rss.xml',
      'https://www.skysports.com/rss/12040'
    ],
    technology: [
      'https://www.theverge.com/rss/index.xml',
      'https://feeds.feedburner.com/TechCrunch/',
      'https://rss.nytimes.com/services/xml/rss/nyt/Technology.xml'
    ]
  },
  
  // NewsAPI.org (free tier - 100 requests/day)
  newsapi: (apiKey: string) => ({
    world: `https://newsapi.org/v2/top-headlines?category=general&pageSize=15&apiKey=${apiKey}`,
    bangladesh: `https://newsapi.org/v2/top-headlines?country=bd&pageSize=15&apiKey=${apiKey}`,
    sports: `https://newsapi.org/v2/top-headlines?category=sports&pageSize=15&apiKey=${apiKey}`,
    technology: `https://newsapi.org/v2/top-headlines?category=technology&pageSize=15&apiKey=${apiKey}`
  }),
  
  // GNews API (free tier - 100 requests/day)
  gnews: (apiKey: string) => ({
    world: `https://gnews.io/api/v4/top-headlines?category=general&lang=en&max=10&apikey=${apiKey}`,
    bangladesh: `https://gnews.io/api/v4/top-headlines?country=bd&lang=en&max=10&apikey=${apiKey}`,
    sports: `https://gnews.io/api/v4/top-headlines?category=sports&lang=en&max=10&apikey=${apiKey}`,
    technology: `https://gnews.io/api/v4/top-headlines?category=technology&lang=en&max=10&apikey=${apiKey}`
  }),
  
  // NewsData.io (free tier - 200 requests/day)
  newsdata: (apiKey: string) => ({
    world: `https://newsdata.io/api/1/news?apikey=${apiKey}&category=top&language=en`,
    bangladesh: `https://newsdata.io/api/1/news?apikey=${apiKey}&country=bd&language=en`,
    sports: `https://newsdata.io/api/1/news?apikey=${apiKey}&category=sports&language=en`,
    technology: `https://newsdata.io/api/1/news?apikey=${apiKey}&category=technology&language=en`
  })
};

// AI Summarization Providers with fallback order
const AI_PROVIDERS = [
  {
    name: 'huggingface',
    enabled: !!process.env.HUGGING_FACE_TOKEN,
    summarize: async (text: string): Promise<string> => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const response = await fetch(
          'https://api-inference.huggingface.co/models/facebook/bart-large-cnn',
          {
            method: 'POST',
            headers: { 
              'Authorization': `Bearer ${process.env.HUGGING_FACE_TOKEN}`,
              'Content-Type': 'application/json'
            },
            signal: controller.signal,
            body: JSON.stringify({
              inputs: text.slice(0, 1024),
              parameters: { 
                max_length: 100, 
                min_length: 40,
                do_sample: false 
              }
            }),
          }
        );
        
        clearTimeout(timeout);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        return result[0]?.summary_text || text;
      } catch (error) {
        console.warn('Hugging Face summarization failed:', error);
        throw error; // Let the fallback chain continue
      }
    }
  },
  {
    name: 'cohere',
    enabled: !!process.env.COHERE_API_KEY,
    summarize: async (text: string): Promise<string> => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);

        const response = await fetch('https://api.cohere.ai/v1/summarize', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.COHERE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          signal: controller.signal,
          body: JSON.stringify({
            text: text.slice(0, 2500),
            length: 'short',
            format: 'paragraph',
            model: 'summarize-xlarge'
          }),
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        return result.summary || text;
      } catch (error) {
        console.warn('Cohere summarization failed:', error);
        throw error;
      }
    }
  },
  {
    name: 'openai',
    enabled: !!process.env.OPENAI_API_KEY,
    summarize: async (text: string): Promise<string> => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
          },
          signal: controller.signal,
          body: JSON.stringify({
            model: 'gpt-3.5-turbo',
            messages: [
              {
                role: 'system',
                content: 'Summarize this news article in 40-60 words. Be concise, informative, and maintain key facts.'
              },
              { 
                role: 'user', 
                content: text.slice(0, 1800) 
              }
            ],
            max_tokens: 100,
            temperature: 0.3
          })
        });

        clearTimeout(timeout);

        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const data = await response.json();
        return data.choices[0]?.message?.content?.trim() || text;
      } catch (error) {
        console.warn('OpenAI summarization failed:', error);
        throw error;
      }
    }
  }
];

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

// Enhanced RSS parser with better error handling
function parseRSS(xml: string, topic: string, lang: string): NewsItem[] {
  const items: NewsItem[] = [];
  
  try {
    // More robust item extraction
    const itemRegex = /<item>[\s\S]*?<\/item>/gi;
    const itemMatches = xml.match(itemRegex) || [];

    for (const itemXml of itemMatches.slice(0, 15)) { // Limit per feed
      try {
        // Extract title with better handling
        const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i) || 
                          itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        const title = titleMatch ? cleanText(titleMatch[1]) : '';

        // Extract link/URL
        const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i) ||
                         itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i);
        const url = linkMatch ? cleanText(linkMatch[1]) : '';

        // Extract description/summary
        const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/i) || 
                         itemXml.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/i) ||
                         itemXml.match(/<content>([\s\S]*?)<\/content>/i);
        const description = descMatch ? cleanText(descMatch[1]) : '';

        // Extract image
        const imageMatch = itemXml.match(/<media:content[^>]*url="([^"]*)"/i) ||
                          itemXml.match(/<enclosure[^>]*url="([^"]*)"/i) ||
                          itemXml.match(/<image>[\s\S]*?<url>([\s\S]*?)<\/url>/i);
        const imageUrl = imageMatch ? cleanText(imageMatch[1]) : undefined;

        // Extract publish date
        const dateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) ||
                         itemXml.match(/<dc:date>([\s\S]*?)<\/dc:date>/i);
        const publishedAt = dateMatch ? cleanText(dateMatch[1]) : undefined;

        if (title && url) {
          // Determine source from URL or feed
          let source = 'RSS Feed';
          try {
            const domain = new URL(url).hostname.replace('www.', '');
            source = domain.split('.')[0]
              .replace(/-/g, ' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          } catch {
            // Keep default source name
          }

          items.push({
            title,
            summary: description || 'No description available',
            url,
            source,
            topic,
            lang: determineLanguage(title + description, lang),
            publishedAt,
            imageUrl
          });
        }
      } catch (itemError) {
        console.warn('Error parsing individual RSS item:', itemError);
        continue;
      }
    }
  } catch (error) {
    console.error('Error parsing RSS XML structure:', error);
  }
  
  return items;
}

function cleanText(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function determineLanguage(text: string, defaultLang: string): string {
  // Simple language detection based on Bengali characters
  const bengaliRegex = /[\u0980-\u09FF]/;
  return bengaliRegex.test(text) ? 'bn' : defaultLang;
}

// Fetch from NewsAPI.org
async function fetchFromNewsAPI(topic: string, lang: string): Promise<NewsItem[]> {
  if (!process.env.NEWS_API_KEY) return [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const url = PROVIDERS.newsapi(process.env.NEWS_API_KEY)[topic as keyof typeof PROVIDERS.rss];
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'DinerPordinNews/1.0'
      }
    });
    
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`NewsAPI returned ${response.status} for topic ${topic}`);
      return [];
    }
    
    const data = await response.json();
    
    if (data.status !== 'ok' || !Array.isArray(data.articles)) {
      return [];
    }

    return data.articles.slice(0, 10).map((article: any) => ({
      title: article.title || 'No title',
      summary: article.description || 'No description available',
      url: article.url || '',
      source: article.source?.name || 'Unknown Source',
      topic,
      lang,
      publishedAt: article.publishedAt,
      imageUrl: article.urlToImage
    })).filter((item: NewsItem) => item.title !== 'No title' && item.url);
    
  } catch (error) {
    console.warn('NewsAPI fetch failed:', error);
    return [];
  }
}

// Fetch from GNews
async function fetchFromGNews(topic: string, lang: string): Promise<NewsItem[]> {
  if (!process.env.GNEWS_API_KEY) return [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const url = PROVIDERS.gnews(process.env.GNEWS_API_KEY)[topic as keyof typeof PROVIDERS.rss];
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'DinerPordinNews/1.0'
      }
    });
    
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`GNews returned ${response.status} for topic ${topic}`);
      return [];
    }
    
    const data = await response.json();
    
    if (!Array.isArray(data.articles)) {
      return [];
    }

    return data.articles.slice(0, 10).map((article: any) => ({
      title: article.title || 'No title',
      summary: article.description || 'No content available',
      url: article.url || '',
      source: article.source?.name || 'Unknown Source',
      topic,
      lang,
      publishedAt: article.publishedAt,
      imageUrl: article.image
    })).filter((item: NewsItem) => item.title !== 'No title' && item.url);
    
  } catch (error) {
    console.warn('GNews fetch failed:', error);
    return [];
  }
}

// Fetch from NewsData.io
async function fetchFromNewsData(topic: string, lang: string): Promise<NewsItem[]> {
  if (!process.env.NEWSDATA_API_KEY) return [];

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const baseUrl = PROVIDERS.newsdata(process.env.NEWSDATA_API_KEY)[topic as keyof typeof PROVIDERS.rss];
    const url = `${baseUrl}&size=10`;
    
    const response = await fetch(url, { 
      signal: controller.signal,
      headers: {
        'User-Agent': 'DinerPordinNews/1.0'
      }
    });
    
    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`NewsData returned ${response.status} for topic ${topic}`);
      return [];
    }
    
    const data = await response.json();
    
    if (data.status !== 'success' || !Array.isArray(data.results)) {
      return [];
    }

    return data.results.slice(0, 10).map((article: any) => ({
      title: article.title || 'No title',
      summary: article.description || 'No description available',
      url: article.link || '',
      source: article.source_id || 'Unknown Source',
      topic,
      lang: article.language || lang,
      publishedAt: article.pubDate,
      imageUrl: article.image_url
    })).filter((item: NewsItem) => item.title !== 'No title' && item.url);
    
  } catch (error) {
    console.warn('NewsData fetch failed:', error);
    return [];
  }
}

// Fetch from RSS feeds
async function fetchFromRSS(topic: string, lang: string): Promise<NewsItem[]> {
  const feeds = PROVIDERS.rss[topic as keyof typeof PROVIDERS.rss] || [];
  const allItems: NewsItem[] = [];

  // Fetch RSS feeds in parallel with individual timeouts
  const feedPromises = feeds.map(async (feedUrl) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6000);

      const response = await fetch(feedUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DinerPordinNews/1.0; +https://github.com/diner-pordin)'
        }
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`RSS feed ${feedUrl} returned ${response.status}`);
        return [];
      }

      const xml = await response.text();
      return parseRSS(xml, topic, lang);
    } catch (error) {
      console.warn(`Failed to fetch RSS feed ${feedUrl}:`, error);
      return [];
    }
  });

  try {
    const results = await Promise.allSettled(feedPromises);
    
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        allItems.push(...result.value);
      }
    });
  } catch (error) {
    console.error('RSS fetching error:', error);
  }

  return allItems;
}

// Enhanced summarization with fallback chain
async function generateSummary(text: string): Promise<{ summary: string; provider: string }> {
  if (!text.trim() || text === 'No description available') {
    return { summary: text, provider: 'none' };
  }

  // Try each AI provider in order until one works
  for (const provider of AI_PROVIDERS) {
    if (provider.enabled) {
      try {
        const summary = await provider.summarize(text);
        if (summary && summary !== text) {
          return { summary, provider: provider.name };
        }
      } catch (error) {
        // Continue to next provider
        continue;
      }
    }
  }

  // Fallback: truncate long text if no AI available
  if (text.length > 200) {
    return { 
      summary: text.slice(0, 197) + '...', 
      provider: 'truncate' 
    };
  }

  return { summary: text, provider: 'none' };
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const topic = searchParams.get('topic') || 'world';
  const lang = searchParams.get('lang') || 'en';
  const searchQuery = searchParams.get('q') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 50);

  console.log(`Fetching news for topic: ${topic}, lang: ${lang}, search: ${searchQuery}`);

  // Build fetch promises for all available providers
  const fetchPromises = [];

  // Add API providers if configured
  if (process.env.NEWS_API_KEY) {
    fetchPromises.push(fetchFromNewsAPI(topic, lang));
  }
  
  if (process.env.GNEWS_API_KEY) {
    fetchPromises.push(fetchFromGNews(topic, lang));
  }
  
  if (process.env.NEWSDATA_API_KEY) {
    fetchPromises.push(fetchFromNewsData(topic, lang));
  }

  // Always include RSS as fallback
  fetchPromises.push(fetchFromRSS(topic, lang));

  let allItems: NewsItem[] = [];
  let providerStats = {
    newsapi: 0,
    gnews: 0,
    newsdata: 0,
    rss: 0,
    failed: 0
  };

  try {
    // Fetch from all providers in parallel
    const results = await Promise.allSettled(fetchPromises);
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const items = result.value;
        allItems.push(...items);
        
        // Track which providers succeeded
        if (index === 0 && process.env.NEWS_API_KEY) providerStats.newsapi = items.length;
        else if (index === 1 && process.env.GNEWS_API_KEY) providerStats.gnews = items.length;
        else if (index === 2 && process.env.NEWSDATA_API_KEY) providerStats.newsdata = items.length;
        else providerStats.rss += items.length;
      } else {
        providerStats.failed++;
      }
    });

    console.log(`Fetched ${allItems.length} items from providers:`, providerStats);

    // Remove duplicates based on URL and title similarity
    const seenUrls = new Set();
    const seenTitles = new Set();
    
    allItems = allItems.filter(item => {
      if (!item.url || !item.title) return false;
      
      // Normalize URL for comparison
      const normalizedUrl = item.url.toLowerCase().split('?')[0];
      if (seenUrls.has(normalizedUrl)) return false;
      
      // Normalize title for comparison (basic deduplication)
      const normalizedTitle = item.title.toLowerCase().replace(/[^\w\s]/g, '').substring(0, 50);
      if (seenTitles.has(normalizedTitle)) return false;
      
      seenUrls.add(normalizedUrl);
      seenTitles.add(normalizedTitle);
      return true;
    });

    // Apply search filter if provided
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      allItems = allItems.filter(item => 
        item.title.toLowerCase().includes(query) || 
        (item.summary && item.summary.toLowerCase().includes(query))
      );
    }

    // Apply summarization if any AI provider is available
    const hasAICapability = AI_PROVIDERS.some(provider => provider.enabled);
    let summarizationProvider = 'none';

    if (hasAICapability && allItems.length > 0) {
      console.log('Applying AI summarization...');
      
      // Summarize in batches to avoid rate limits
      const batchSize = 5;
      const batches = [];
      
      for (let i = 0; i < allItems.length; i += batchSize) {
        batches.push(allItems.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const summaryPromises = batch.map(async (item) => {
          if (item.summary && item.summary !== 'No description available') {
            try {
              const { summary, provider } = await generateSummary(item.summary);
              if (provider !== 'none') {
                summarizationProvider = provider;
              }
              return { ...item, summary };
            } catch (error) {
              return item; // Keep original summary on error
            }
          }
          return item;
        });

        const summarizedBatch = await Promise.all(summaryPromises);
        // Replace the batch in allItems
        const startIndex = allItems.indexOf(batch[0]);
        allItems.splice(startIndex, batch.length, ...summarizedBatch);
        
        // Small delay between batches to avoid rate limits
        if (batches.length > 1) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    // Sort by publish date if available, newest first
    allItems.sort((a, b) => {
      if (a.publishedAt && b.publishedAt) {
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }
      return 0;
    });

    // Build provider string for response
    const activeProviders = [];
    if (providerStats.newsapi > 0) activeProviders.push('newsapi');
    if (providerStats.gnews > 0) activeProviders.push('gnews');
    if (providerStats.newsdata > 0) activeProviders.push('newsdata');
    if (providerStats.rss > 0) activeProviders.push('rss');
    
    let provider = activeProviders.join('+');
    if (summarizationProvider !== 'none') {
      provider += `+${summarizationProvider}`;
    }
    if (provider === '') provider = 'rss';

    const response = {
      items: allItems.slice(0, limit),
      meta: {
        country: 'gb',
        topic,
        lang,
        provider,
        totalItems: allItems.length,
        returnedItems: Math.min(allItems.length, limit),
        providerStats,
        summarization: summarizationProvider,
        errorCount: providerStats.failed,
        warning: providerStats.failed > 0 ? `${providerStats.failed} provider(s) failed` : null
      }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=120, stale-while-revalidate=300'
      }
    });

  } catch (error) {
    console.error('Unexpected error in news API:', error);
    
    // Graceful fallback response
    const errorResponse = {
      items: [],
      meta: {
        country: 'gb',
        topic,
        lang,
        provider: 'rss',
        totalItems: 0,
        returnedItems: 0,
        providerStats,
        summarization: 'none',
        errorCount: 1,
        warning: 'Service temporarily unavailable, please try again shortly'
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-cache'
      }
    });
  }
}
