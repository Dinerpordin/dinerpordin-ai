import { NextRequest } from 'next/server';

// Comprehensive news sources with verified RSS feeds
const NEWS_SOURCES = {
  world: [
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://feeds.reuters.com/reuters/worldNews',
    'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    'https://www.theguardian.com/world/rss',
    'https://www.aljazeera.com/xml/rss/all.xml'
  ],
  
  bangladesh: [
    'https://www.thedailystar.net/top-news/rss.xml',
    'https://en.prothomalo.com/feed/',
    'https://www.dhakatribune.com/feed',
    'https://bdnews24.com/rss',
    'https://www.newagebd.net/feed',
    'https://www.kalerkantho.com/feed/rss/online',
    'https://www.jagonews24.com/rss'
  ],
  
  economy: [
    'https://feeds.reuters.com/reuters/businessNews',
    'https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml',
    'https://www.ft.com/rss/world',
    'https://www.thedailystar.net/business/rss.xml',
    'https://www.dhakatribune.com/business/feed'
  ],
  
  sports: [
    'https://feeds.bbci.co.uk/sport/football/rss.xml',
    'https://www.espn.com/espn/rss/news',
    'https://www.theguardian.com/football/rss',
    'https://www.espncricinfo.com/rss/content/story/feeds/0.xml',
    'https://www.thedailystar.net/sports/rss.xml'
  ]
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
}

// Simple and robust RSS parser
function parseRSS(xml: string, topic: string): NewsItem[] {
  const items: NewsItem[] = [];
  
  try {
    // Extract items using regex
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    
    for (const itemXml of itemMatches.slice(0, 10)) {
      try {
        // Extract title
        const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
        const title = titleMatch ? cleanText(titleMatch[1]) : '';

        // Extract link
        const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i);
        const url = linkMatch ? cleanText(linkMatch[1]) : '';

        // Extract description
        const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/i);
        const description = descMatch ? cleanText(descMatch[1]) : '';

        // Extract image if available
        const imageMatch = itemXml.match(/<media:content[^>]*url="([^"]*)"/i) || 
                          itemXml.match(/<enclosure[^>]*url="([^"]*)"/i);
        const imageUrl = imageMatch ? imageMatch[1] : undefined;

        // Extract publish date
        const dateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
        const publishedAt = dateMatch ? cleanText(dateMatch[1]) : undefined;

        if (title && url) {
          // Determine source from URL
          let source = 'Unknown';
          try {
            const domain = new URL(url).hostname.replace('www.', '');
            source = domain.split('.')[0]
              .replace(/-/g, ' ')
              .split(' ')
              .map(word => word.charAt(0).toUpperCase() + word.slice(1))
              .join(' ');
          } catch {}

          // Determine language
          const lang = /[\u0980-\u09FF]/.test(title + description) ? 'bn' : 'en';

          items.push({
            id: Buffer.from(url).toString('base64').slice(0, 16),
            title,
            summary: description || 'No description available',
            url,
            source,
            topic,
            lang,
            publishedAt,
            imageUrl
          });
        }
      } catch (error) {
        // Skip invalid items
        continue;
      }
    }
  } catch (error) {
    console.error('RSS parsing error:', error);
  }
  
  return items;
}

function cleanText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// Fetch from RSS with timeout and error handling
async function fetchRSSFeed(feedUrl: string, topic: string): Promise<NewsItem[]> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const response = await fetch(feedUrl, {
      signal: controller.signal,
      headers: {
        'User-Agent': 'DinerPordinNews/1.0 (+https://dinerpordin.com)'
      }
    });

    clearTimeout(timeout);

    if (!response.ok) {
      console.warn(`Failed to fetch ${feedUrl}: ${response.status}`);
      return [];
    }

    const xml = await response.text();
    return parseRSS(xml, topic);
  } catch (error) {
    console.warn(`Error fetching ${feedUrl}:`, error);
    return [];
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const topic = searchParams.get('topic') || 'world';
  const lang = searchParams.get('lang') || 'en';
  const searchQuery = searchParams.get('q') || '';

  console.log(`Fetching ${topic} news in ${lang}`);

  try {
    const feeds = NEWS_SOURCES[topic as keyof typeof NEWS_SOURCES] || NEWS_SOURCES.world;
    let allItems: NewsItem[] = [];

    // Fetch from all feeds in parallel
    const feedPromises = feeds.map(feedUrl => fetchRSSFeed(feedUrl, topic));
    const results = await Promise.allSettled(feedPromises);

    // Combine all successful results
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        allItems.push(...result.value);
      }
    });

    // Remove duplicates based on URL
    const seenUrls = new Set();
    allItems = allItems.filter(item => {
      if (seenUrls.has(item.url)) return false;
      seenUrls.add(item.url);
      return true;
    });

    // Apply language filter if specified
    if (lang !== 'all') {
      allItems = allItems.filter(item => item.lang === lang);
    }

    // Apply search filter if provided
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      allItems = allItems.filter(item => 
        item.title.toLowerCase().includes(query) || 
        item.summary.toLowerCase().includes(query)
      );
    }

    // Sort by publish date (newest first)
    allItems.sort((a, b) => {
      const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
      const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
      return dateB - dateA;
    });

    const response = {
      items: allItems.slice(0, 30),
      meta: {
        topic,
        lang,
        totalItems: allItems.length,
        returnedItems: Math.min(allItems.length, 30),
        sources: Array.from(new Set(allItems.map(item => item.source))).slice(0, 5)
      }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=300, stale-while-revalidate=600'
      }
    });

  } catch (error) {
    console.error('News API error:', error);
    
    // Graceful fallback
    return new Response(JSON.stringify({
      items: [],
      meta: {
        topic,
        lang,
        totalItems: 0,
        returnedItems: 0,
        sources: [],
        error: 'Service temporarily unavailable'
      }
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
