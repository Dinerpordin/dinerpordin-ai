import { NextRequest } from 'next/server';

// Working news sources with multiple fallbacks
const PROVIDERS = {
  world: {
    type: 'rss',
    feeds: [
      'https://feeds.bbci.co.uk/news/world/rss.xml',
      'https://feeds.reuters.com/reuters/worldNews',
      'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
      'https://www.theguardian.com/world/rss',
      'https://www.aljazeera.com/xml/rss/all.xml'
    ]
  },
  
  bangladesh: {
    type: 'mixed',
    sources: [
      // Working RSS feeds
      {
        type: 'rss',
        url: 'https://www.thedailystar.net/top-news/rss.xml',
        name: 'The Daily Star'
      },
      {
        type: 'rss', 
        url: 'https://www.newagebd.net/feed',
        name: 'New Age Bangladesh'
      },
      {
        type: 'rss',
        url: 'https://en.prothomalo.com/feed/',
        name: 'Prothom Alo English'
      },
      {
        type: 'rss',
        url: 'https://www.dhakatribune.com/feed',
        name: 'Dhaka Tribune'
      },
      // Bangla news sources with working feeds
      {
        type: 'rss',
        url: 'https://www.kalerkantho.com/feed/rss/online',
        name: 'Kaler Kantho'
      },
      {
        type: 'rss',
        url: 'https://www.jugantor.com/feed',
        name: 'Jugantor'
      },
      {
        type: 'rss',
        url: 'https://www.ittefaq.com.bd/feed',
        name: 'Ittefaq'
      },
      {
        type: 'rss',
        url: 'https://www.bd-journal.com/feed',
        name: 'Bangladesh Journal'
      }
    ]
  },
  
  economy: {
    type: 'rss',
    feeds: [
      'https://feeds.reuters.com/reuters/businessNews',
      'https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml',
      'https://www.ft.com/rss/world',
      'https://www.thedailystar.net/business/rss.xml',
      'https://www.dhakatribune.com/business/feed'
    ]
  },
  
  football: {
    type: 'rss', 
    feeds: [
      'https://feeds.bbci.co.uk/sport/football/rss.xml',
      'https://www.theguardian.com/football/rss',
      'https://www.espn.com/espn/rss/soccer/news',
      'https://www.thedailystar.net/sports/football/rss.xml'
    ]
  },
  
  cricket: {
    type: 'rss',
    feeds: [
      'https://www.espncricinfo.com/rss/content/story/feeds/0.xml',
      'https://feeds.bbci.co.uk/sport/cricket/rss.xml',
      'https://www.cricbuzz.com/rss/news',
      'https://www.thedailystar.net/sports/cricket/rss.xml'
    ]
  }
};

// Alternative: GNews API for reliable Bangladeshi news
const GNEWS_CONFIG = {
  bangladesh: 'https://gnews.io/api/v4/top-headlines?country=bd&lang=en&max=10&apikey=',
  world: 'https://gnews.io/api/v4/top-headlines?category=general&lang=en&max=10&apikey=',
  economy: 'https://gnews.io/api/v4/top-headlines?category=business&lang=en&max=10&apikey=',
  sports: 'https://gnews.io/api/v4/top-headlines?category=sports&lang=en&max=10&apikey='
};

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

// Enhanced RSS parser with better error handling
async function parseRSS(xml: string, category: string, sourceName: string): Promise<NewsItem[]> {
  const items: NewsItem[] = [];
  
  try {
    // Multiple methods to extract items
    let itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi);
    if (!itemMatches) {
      itemMatches = xml.match(/<entry>[\s\S]*?<\/entry>/gi); // Atom feed
    }
    
    itemMatches = itemMatches || [];

    for (const itemXml of itemMatches.slice(0, 10)) {
      try {
        // Extract title
        let title = extractText(itemXml, ['title', 'dc:title']);
        
        // Extract URL
        let url = extractText(itemXml, ['link', 'guid']);
        
        // Extract description
        let description = extractText(itemXml, ['description', 'content:encoded', 'content', 'summary']);
        
        // Extract image
        let imageUrl = extractImage(itemXml);
        
        // Extract date
        let publishedAt = extractText(itemXml, ['pubDate', 'dc:date', 'published', 'updated']);

        if (title && url) {
          // Clean and validate data
          title = cleanText(title);
          url = cleanText(url);
          description = cleanText(description) || 'Click to read full story';
          
          // Calculate read time
          const content = title + ' ' + description;
          const readTime = Math.max(1, Math.ceil(content.split(/\s+/).length / 200));

          // Generate unique ID
          const id = Buffer.from(url + title).toString('base64').slice(0, 20);

          // Determine language
          const lang = /[\u0980-\u09FF]/.test(title + description) ? 'bn' : 'en';

          items.push({
            id,
            title,
            summary: description,
            url,
            source: sourceName,
            topic: category,
            lang,
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
    console.error('Error parsing RSS:', error);
  }
  
  return items;
}

function extractText(xml: string, tags: string[]): string {
  for (const tag of tags) {
    const regex = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`, 'i');
    const match = xml.match(regex);
    if (match && match[1]) {
      return match[1];
    }
  }
  return '';
}

function extractImage(xml: string): string | undefined {
  const patterns = [
    /<media:content[^>]*url="([^"]*)"/i,
    /<enclosure[^>]*url="([^"]*)"/i,
    /<image>[\s\S]*?<url>([\s\S]*?)<\/url>/i,
    /<media:thumbnail[^>]*url="([^"]*)"/i,
    /<img[^>]*src="([^"]*)"/i
  ];
  
  for (const pattern of patterns) {
    const match = xml.match(pattern);
    if (match && match[1]) {
      return cleanText(match[1]);
    }
  }
  return undefined;
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
    .replace(/\[\+]/g, '')
    .replace(/CDATA\[/g, '')
    .replace(/\]\]>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// Fetch from GNews API as fallback
async function fetchFromGNews(category: string): Promise<NewsItem[]> {
  if (!process.env.GNEWS_API_KEY) {
    console.log('GNews API key not configured');
    return [];
  }

  try {
    let url = '';
    switch(category) {
      case 'bangladesh':
        url = `${GNEWS_CONFIG.bangladesh}${process.env.GNEWS_API_KEY}`;
        break;
      case 'world':
        url = `${GNEWS_CONFIG.world}${process.env.GNEWS_API_KEY}`;
        break;
      case 'economy':
        url = `${GNEWS_CONFIG.economy}${process.env.GNEWS_API_KEY}`;
        break;
      case 'football':
      case 'cricket':
        url = `${GNEWS_CONFIG.sports}${process.env.GNEWS_API_KEY}`;
        break;
      default:
        url = `${GNEWS_CONFIG.world}${process.env.GNEWS_API_KEY}`;
    }

    console.log(`Fetching from GNews: ${url.replace(process.env.GNEWS_API_KEY, 'API_KEY')}`);
    
    const response = await fetch(url, { 
      timeout: 8000,
      headers: {
        'User-Agent': 'DinerPordinNews/1.0'
      }
    } as any);

    if (!response.ok) {
      console.warn(`GNews API returned ${response.status}`);
      return [];
    }

    const data = await response.json();
    
    if (!data.articles || !Array.isArray(data.articles)) {
      return [];
    }

    return data.articles.slice(0, 15).map((article: any, index: number) => ({
      id: `gnews-${category}-${index}`,
      title: article.title || 'No title',
      summary: article.description || 'No description available',
      url: article.url || '',
      source: article.source?.name || 'GNews',
      topic: category,
      lang: 'en',
      publishedAt: article.publishedAt,
      imageUrl: article.image,
      category,
      readTime: Math.max(1, Math.ceil((article.title?.length || 0 + article.description?.length || 0) / 200))
    })).filter((item: NewsItem) => item.title !== 'No title' && item.url);

  } catch (error) {
    console.warn('GNews API fetch failed:', error);
    return [];
  }
}

// Enhanced RSS fetcher
async function fetchFromRSS(category: string): Promise<NewsItem[]> {
  const categoryConfig = PROVIDERS[category as keyof typeof PROVIDERS];
  if (!categoryConfig) return [];

  const allItems: NewsItem[] = [];

  if (categoryConfig.type === 'rss') {
    // Standard RSS feeds
    const feedPromises = categoryConfig.feeds.map(async (feedUrl) => {
      try {
        const sourceName = new URL(feedUrl).hostname.replace('www.', '').split('.')[0];
        const response = await fetch(feedUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; DinerPordinNews/1.0)',
            'Accept': 'application/rss+xml, application/xml, text/xml'
          }
        } as any);

        if (!response.ok) {
          console.warn(`RSS feed ${feedUrl} failed: ${response.status}`);
          return [];
        }

        const xml = await response.text();
        const items = await parseRSS(xml, category, sourceName);
        console.log(`RSS ${feedUrl} returned ${items.length} items`);
        return items;
      } catch (error) {
        console.warn(`RSS feed ${feedUrl} error:`, error);
        return [];
      }
    });

    const results = await Promise.allSettled(feedPromises);
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        allItems.push(...result.value);
      }
    });
  } else if (categoryConfig.type === 'mixed') {
    // Mixed sources (for Bangladesh)
    const sourcePromises = categoryConfig.sources.map(async (source) => {
      if (source.type === 'rss') {
        try {
          const response = await fetch(source.url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; DinerPordinNews/1.0)',
              'Accept': 'application/rss+xml, application/xml, text/xml'
            }
          } as any);

          if (!response.ok) {
            console.warn(`RSS source ${source.url} failed: ${response.status}`);
            return [];
          }

          const xml = await response.text();
          const items = await parseRSS(xml, category, source.name);
          console.log(`RSS source ${source.name} returned ${items.length} items`);
          return items;
        } catch (error) {
          console.warn(`RSS source ${source.name} error:`, error);
          return [];
        }
      }
      return [];
    });

    const results = await Promise.allSettled(sourcePromises);
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        allItems.push(...result.value);
      }
    });
  }

  return allItems;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'bangladesh'; // Default to Bangladesh
  const lang = searchParams.get('lang') || 'en';
  const searchQuery = searchParams.get('q') || '';

  console.log(`Fetching news for category: ${category}`);

  let allItems: NewsItem[] = [];
  const sourcesUsed: string[] = [];

  try {
    // Try RSS feeds first
    const rssItems = await fetchFromRSS(category);
    allItems.push(...rssItems);
    
    if (rssItems.length > 0) {
      sourcesUsed.push('RSS Feeds');
      console.log(`RSS provided ${rssItems.length} items`);
    }

    // If RSS fails or provides few items, try GNews API
    if (allItems.length < 5 && process.env.GNEWS_API_KEY) {
      console.log('Falling back to GNews API...');
      const gnewsItems = await fetchFromGNews(category);
      allItems.push(...gnewsItems);
      
      if (gnewsItems.length > 0) {
        sourcesUsed.push('GNews API');
        console.log(`GNews provided ${gnewsItems.length} items`);
      }
    }

    // If still no items, provide sample Bangladeshi news
    if (allItems.length === 0) {
      console.log('Providing sample news data');
      allItems = getSampleNews(category);
      sourcesUsed.push('Sample Data');
    }

    // Remove duplicates
    const seen = new Set();
    allItems = allItems.filter(item => {
      const key = item.title.toLowerCase().replace(/[^\w]/g, '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      allItems = allItems.filter(item => 
        item.title.toLowerCase().includes(query) || 
        item.summary.toLowerCase().includes(query) ||
        item.source.toLowerCase().includes(query)
      );
    }

    // Sort by date
    allItems.sort((a, b) => {
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return dateB - dateA;
    });

    const response = {
      items: allItems.slice(0, 30),
      meta: {
        category: getCategoryName(category),
        totalItems: allItems.length,
        returnedItems: Math.min(allItems.length, 30),
        sources: sourcesUsed,
        providers: sourcesUsed.join(' + '),
        warning: allItems.length === 0 ? 'No news available. Try a different category.' : null
      }
    };

    console.log(`Final response: ${response.items.length} items from ${sourcesUsed.join(', ')}`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=300, stale-while-revalidate=600'
      }
    });

  } catch (error) {
    console.error('Error in news API:', error);
    
    // Return sample data as fallback
    const sampleItems = getSampleNews(category);
    
    const errorResponse = {
      items: sampleItems,
      meta: {
        category: getCategoryName(category),
        totalItems: sampleItems.length,
        returnedItems: sampleItems.length,
        sources: ['Sample Data'],
        providers: 'Sample',
        warning: 'Using sample data due to service issues'
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}

function getCategoryName(category: string): string {
  const names: { [key: string]: string } = {
    world: 'World News',
    bangladesh: 'Bangladesh News',
    economy: 'Economy',
    football: 'Football',
    cricket: 'Cricket'
  };
  return names[category] || 'News';
}

function getSampleNews(category: string): NewsItem[] {
  const sampleNews = {
    bangladesh: [
      {
        id: 'sample-1',
        title: 'Bangladesh Economy Shows Strong Growth in Q4 2024',
        summary: 'Bangladesh economy continues to show resilience with strong export performance and remittance growth driving economic expansion.',
        url: 'https://www.thedailystar.net/business/news',
        source: 'The Daily Star',
        topic: 'economy',
        lang: 'en',
        publishedAt: new Date().toISOString(),
        category: 'bangladesh',
        readTime: 2
      },
      {
        id: 'sample-2',
        title: 'ঢাকায় নতুন মেট্রোরেল পরিষেবা চালু',
        summary: 'রাজধানী ঢাকায় মেট্রোরেলের সম্প্রসারিত রুট চালু হয়েছে, যা যানজট নিরসনে গুরুত্বপূর্ণ ভূমিকা রাখবে।',
        url: 'https://www.prothomalo.com/bangladesh',
        source: 'প্রথম আলো',
        topic: 'local',
        lang: 'bn',
        publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
        category: 'bangladesh',
        readTime: 3
      },
      {
        id: 'sample-3',
        title: 'Bangladesh Cricket Team Prepares for Asia Cup',
        summary: 'The Bangladesh national cricket team has begun intensive training for the upcoming Asia Cup tournament.',
        url: 'https://www.espncricinfo.com/bangladesh',
        source: 'ESPNcricinfo',
        topic: 'cricket',
        lang: 'en',
        publishedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
        category: 'bangladesh',
        readTime: 2
      },
      {
        id: 'sample-4',
        title: 'গার্মেন্টস শিল্পে রপ্তানি আয় বৃদ্ধি',
        summary: 'গত মাসে পোশাক শিল্প থেকে রপ্তানি আয় ১৫% বৃদ্ধি পেয়েছে, যা অর্থনীতির জন্য ইতিবাচক সংকেত।',
        url: 'https://www.kalerkantho.com/business',
        source: 'কালের কণ্ঠ',
        topic: 'economy',
        lang: 'bn',
        publishedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
        category: 'bangladesh',
        readTime: 3
      }
    ],
    world: [
      {
        id: 'sample-5',
        title: 'Global Climate Summit Reaches New Agreement',
        summary: 'World leaders have agreed on new climate targets at the international summit held in Paris.',
        url: 'https://www.bbc.com/news/world',
        source: 'BBC News',
        topic: 'environment',
        lang: 'en',
        publishedAt: new Date().toISOString(),
        category: 'world',
        readTime: 4
      }
    ]
  };

  return sampleNews[category as keyof typeof sampleNews] || sampleNews.bangladesh;
}
