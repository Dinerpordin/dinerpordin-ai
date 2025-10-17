import { NextRequest } from 'next/server';

// Curated news sources based on your requirements
const PROVIDERS = {
  // World News (Global Coverage)
  world: [
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://feeds.reuters.com/Reuters/worldNews',
    'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    'https://www.theguardian.com/world/rss',
    'https://www.aljazeera.com/xml/rss/all.xml'
  ],
  
  // Bangladesh News
  bangladesh: [
    'https://www.thedailystar.net/frontpage/rss.xml',
    'https://www.dhakatribune.com/articles/feed',
    'https://en.prothomalo.com/feed/',
    'https://bdnews24.com/rss',
    'https://www.tbsnews.net/feed'
  ],
  
  // Economy (World & Bangladesh Focus)
  economy: [
    'https://feeds.reuters.com/reuters/businessNews',
    'https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml',
    'https://www.ft.com/rss/world',
    'https://www.bloomberg.com/feeds/podcasts/odd_lots.xml',
    'https://www.thedailystar.net/business/rss.xml'
  ],
  
  // Sports: Football (Global & Bangladesh Focus)
  football: [
    'https://feeds.bbci.co.uk/sport/football/rss.xml',
    'https://www.theguardian.com/football/rss',
    'https://www.espn.com/espn/rss/soccer/news',
    'https://www.goal.com/feeds/en-us/news',
    'https://www.thedailystar.net/sports/football/rss.xml'
  ],
  
  // Sports: Cricket (Global & Bangladesh Focus)
  cricket: [
    'https://www.espncricinfo.com/rss/content/story/feeds/0.xml',
    'https://feeds.bbci.co.uk/sport/cricket/rss.xml',
    'https://www.cricbuzz.com/rss/news',
    'https://www.icc-cricket.com/news.rss',
    'https://www.thedailystar.net/sports/cricket/rss.xml'
  ]
};

// Source display names mapping
const SOURCE_DISPLAY_NAMES: { [key: string]: string } = {
  'bbci.co.uk': 'BBC News',
  'reuters.com': 'Reuters',
  'nytimes.com': 'The New York Times',
  'theguardian.com': 'The Guardian',
  'aljazeera.com': 'Al Jazeera',
  'thedailystar.net': 'The Daily Star',
  'dhakatribune.com': 'Dhaka Tribune',
  'prothomalo.com': 'Prothom Alo',
  'bdnews24.com': 'bdnews24.com',
  'tbsnews.net': 'The Business Standard',
  'ft.com': 'Financial Times',
  'bloomberg.com': 'Bloomberg',
  'espn.com': 'ESPN',
  'goal.com': 'Goal.com',
  'espncricinfo.com': 'ESPNcricinfo',
  'cricbuzz.com': 'Cricbuzz',
  'icc-cricket.com': 'ICC'
};

// Category metadata
const CATEGORY_METADATA = {
  world: {
    name: 'World News',
    description: 'Global politics, conflicts, and international affairs',
    icon: '🌍',
    color: 'blue'
  },
  bangladesh: {
    name: 'Bangladesh',
    description: 'Local politics, society, and national events',
    icon: '🇧🇩',
    color: 'green'
  },
  economy: {
    name: 'Economy',
    description: 'Global markets, trade, and financial news',
    icon: '💹',
    color: 'purple'
  },
  football: {
    name: 'Football',
    description: 'Global soccer news and Bangladesh football',
    icon: '⚽',
    color: 'orange'
  },
  cricket: {
    name: 'Cricket',
    description: 'International cricket and Bangladesh matches',
    icon: '🏏',
    color: 'red'
  }
};

// AI Summarization Providers
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
                max_length: 80, 
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
        throw error;
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
            text: text.slice(0, 2000),
            length: 'short',
            format: 'paragraph'
          }),
        });
        
        clearTimeout(timeout);
        
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        
        const result = await response.json();
        return result.summary || text;
      } catch (error) {
        throw error;
      }
    }
  }
];

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

// Enhanced RSS parser with better content extraction
function parseRSS(xml: string, category: string, lang: string): NewsItem[] {
  const items: NewsItem[] = [];
  
  try {
    const itemRegex = /<item>[\s\S]*?<\/item>/gi;
    const itemMatches = xml.match(itemRegex) || [];

    for (const itemXml of itemMatches.slice(0, 20)) {
      try {
        // Extract title
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
        let description = descMatch ? cleanText(descMatch[1]) : '';

        // Extract image
        const imageMatch = itemXml.match(/<media:content[^>]*url="([^"]*)"/i) ||
                          itemXml.match(/<enclosure[^>]*url="([^"]*)"/i) ||
                          itemXml.match(/<image>[\s\S]*?<url>([\s\S]*?)<\/url>/i) ||
                          itemXml.match(/<media:thumbnail[^>]*url="([^"]*)"/i);
        const imageUrl = imageMatch ? cleanText(imageMatch[1]) : undefined;

        // Extract publish date
        const dateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) ||
                         itemXml.match(/<dc:date>([\s\S]*?)<\/dc:date>/i);
        const publishedAt = dateMatch ? cleanText(dateMatch[1]) : undefined;

        if (title && url) {
          // Determine source from URL
          let source = 'Unknown';
          try {
            const domain = new URL(url).hostname.replace('www.', '');
            source = SOURCE_DISPLAY_NAMES[domain] || 
                    domain.split('.')[0]
                      .replace(/-/g, ' ')
                      .split(' ')
                      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
                      .join(' ');
          } catch {}

          // Calculate read time
          const content = title + ' ' + description;
          const readTime = Math.max(1, Math.ceil(content.split(/\s+/).length / 200));

          // Generate unique ID
          const id = Buffer.from(url).toString('base64').slice(0, 16);

          items.push({
            id,
            title,
            summary: description || 'No description available',
            url,
            source,
            topic: category,
            lang: determineLanguage(title + description, lang),
            publishedAt,
            imageUrl,
            category,
            readTime
          });
        }
      } catch (itemError) {
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
    .replace(/<[^>]*>/g, '')
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
  const bengaliRegex = /[\u0980-\u09FF]/;
  return bengaliRegex.test(text) ? 'bn' : defaultLang;
}

// Fetch from RSS feeds with better error handling
async function fetchFromRSS(category: string, lang: string): Promise<NewsItem[]> {
  const feeds = PROVIDERS[category as keyof typeof PROVIDERS] || [];
  const allItems: NewsItem[] = [];

  const feedPromises = feeds.map(async (feedUrl) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(feedUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; DinerPordinNews/2.0; +https://dinerpordin.com)',
          'Accept': 'application/rss+xml, application/xml, text/xml'
        }
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`RSS feed ${feedUrl} returned ${response.status}`);
        return [];
      }

      const xml = await response.text();
      return parseRSS(xml, category, lang);
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

  for (const provider of AI_PROVIDERS) {
    if (provider.enabled) {
      try {
        const summary = await provider.summarize(text);
        if (summary && summary !== text) {
          return { summary, provider: provider.name };
        }
      } catch (error) {
        continue;
      }
    }
  }

  // Fallback: truncate long text
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
  const category = searchParams.get('category') || 'world';
  const lang = searchParams.get('lang') || 'en';
  const searchQuery = searchParams.get('q') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '30'), 50);

  console.log(`Fetching ${category} news in ${lang}`);

  let allItems: NewsItem[] = [];
  let providerStats = {
    totalFeeds: PROVIDERS[category as keyof typeof PROVIDERS]?.length || 0,
    successfulFeeds: 0,
    failedFeeds: 0
  };

  try {
    const items = await fetchFromRSS(category, lang);
    allItems = items;
    providerStats.successfulFeeds = items.length > 0 ? 1 : 0;
    providerStats.failedFeeds = providerStats.totalFeeds - providerStats.successfulFeeds;

    // Remove duplicates based on URL and title
    const seenUrls = new Set();
    const seenTitles = new Set();
    
    allItems = allItems.filter(item => {
      if (!item.url || !item.title) return false;
      
      const normalizedUrl = item.url.toLowerCase().split('?')[0];
      const normalizedTitle = item.title.toLowerCase().replace(/[^\w\s]/g, '').substring(0, 60);
      
      if (seenUrls.has(normalizedUrl) || seenTitles.has(normalizedTitle)) return false;
      
      seenUrls.add(normalizedUrl);
      seenTitles.add(normalizedTitle);
      return true;
    });

    // Apply search filter if provided
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      allItems = allItems.filter(item => 
        item.title.toLowerCase().includes(query) || 
        (item.summary && item.summary.toLowerCase().includes(query)) ||
        item.source.toLowerCase().includes(query)
      );
    }

    // Apply AI summarization if available
    const hasAICapability = AI_PROVIDERS.some(provider => provider.enabled);
    let summarizationProvider = 'none';

    if (hasAICapability && allItems.length > 0) {
      console.log('Applying AI summarization...');
      
      // Summarize in smaller batches to avoid rate limits
      const batchSize = 3;
      for (let i = 0; i < allItems.length; i += batchSize) {
        const batch = allItems.slice(i, i + batchSize);
        const summaryPromises = batch.map(async (item) => {
          if (item.summary && item.summary !== 'No description available') {
            try {
              const { summary, provider } = await generateSummary(item.summary);
              if (provider !== 'none') {
                summarizationProvider = provider;
              }
              return { ...item, summary };
            } catch (error) {
              return item;
            }
          }
          return item;
        });

        const summarizedBatch = await Promise.all(summaryPromises);
        allItems.splice(i, batch.length, ...summarizedBatch);
        
        // Small delay between batches
        if (i + batchSize < allItems.length) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
    }

    // Sort by publish date (newest first)
    allItems.sort((a, b) => {
      if (a.publishedAt && b.publishedAt) {
        return new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime();
      }
      return 0;
    });

    const categoryMeta = CATEGORY_METADATA[category as keyof typeof CATEGORY_METADATA] || {
      name: category,
      description: 'Latest news',
      icon: '📰',
      color: 'gray'
    };

    const response = {
      items: allItems.slice(0, limit),
      meta: {
        category: categoryMeta.name,
        categoryIcon: categoryMeta.icon,
        categoryDescription: categoryMeta.description,
        categoryColor: categoryMeta.color,
        lang,
        provider: `rss${summarizationProvider !== 'none' ? `+${summarizationProvider}` : ''}`,
        totalItems: allItems.length,
        returnedItems: Math.min(allItems.length, limit),
        providerStats,
        summarization: summarizationProvider,
        sources: Array.from(new Set(allItems.map(item => item.source))).slice(0, 5),
        warning: providerStats.failedFeeds > 0 ? 
          `${providerStats.failedFeeds} feed(s) failed to load` : null
      }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=180, stale-while-revalidate=300'
      }
    });

  } catch (error) {
    console.error('Unexpected error in news API:', error);
    
    const categoryMeta = CATEGORY_METADATA[category as keyof typeof CATEGORY_METADATA] || {
      name: category,
      description: 'Latest news',
      icon: '📰',
      color: 'gray'
    };

    const errorResponse = {
      items: [],
      meta: {
        category: categoryMeta.name,
        categoryIcon: categoryMeta.icon,
        categoryDescription: categoryMeta.description,
        categoryColor: categoryMeta.color,
        lang,
        provider: 'rss',
        totalItems: 0,
        returnedItems: 0,
        providerStats,
        summarization: 'none',
        sources: [],
        warning: 'Service temporarily unavailable. Please try again shortly.'
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
