// app/api/news/route.ts
import { NextRequest } from 'next/server';

// Feed configuration
const FEED_CONFIG = {
  world: [
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://www.theguardian.com/world/rss'
  ],
  bangladesh: [
    'https://en.prothomalo.com/feed/',
    'https://www.prothomalo.com/feed'
  ],
  sports: [
    'https://www.espn.com/espn/rss/news',
    'http://feeds.bbci.co.uk/sport/rss.xml?edition=uk'
  ],
  technology: [
    'https://www.theverge.com/rss/index.xml',
    'http://feeds.feedburner.com/TechCrunch/'
  ]
};

// Source mapping for display names
const SOURCE_NAMES: { [key: string]: string } = {
  'bbci.co.uk': 'BBC',
  'theguardian.com': 'The Guardian',
  'prothomalo.com': 'Prothom Alo',
  'espn.com': 'ESPN',
  'theverge.com': 'The Verge',
  'feedburner.com': 'TechCrunch'
};

interface NewsItem {
  title: string;
  summary: string;
  url: string;
  source: string;
  topic: string;
  lang: string;
}

interface ApiResponse {
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

// Simple XML parser (no external dependencies)
function parseRSS(xml: string, topic: string, lang: string): NewsItem[] {
  const items: NewsItem[] = [];
  
  try {
    // Extract items between <item> tags
    const itemMatches = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
    
    for (const itemXml of itemMatches) {
      try {
        // Extract title
        const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i);
        const title = titleMatch ? cleanText(titleMatch[1]) : '';

        // Extract link/URL
        const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i);
        const url = linkMatch ? cleanText(linkMatch[1]) : '';

        // Extract description/summary
        const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/i) || 
                         itemXml.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/i);
        const description = descMatch ? cleanText(descMatch[1]) : '';

        if (title && url) {
          // Determine source from URL
          let source = 'Unknown';
          try {
            const domain = new URL(url).hostname.replace('www.', '');
            source = SOURCE_NAMES[domain] || domain.split('.')[0];
          } catch {
            source = 'Unknown';
          }

          items.push({
            title,
            summary: description,
            url,
            source,
            topic,
            lang: determineLanguage(title + description, lang)
          });
        }
      } catch (error) {
        console.warn('Error parsing individual RSS item:', error);
      }
    }
  } catch (error) {
    console.error('Error parsing RSS XML:', error);
  }
  
  return items;
}

function cleanText(text: string): string {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

function determineLanguage(text: string, defaultLang: string): string {
  // Simple language detection based on Bengali characters
  const bengaliRegex = /[\u0980-\u09FF]/;
  return bengaliRegex.test(text) ? 'bn' : defaultLang;
}

// Optional OpenAI summarization
async function generateSummary(text: string): Promise<string> {
  if (!process.env.OPENAI_API_KEY || process.env.FORCE_RSS === '1') {
    return text;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2000);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'Summarize the following news content in 30-60 words. Keep it concise and informative.'
          },
          {
            role: 'user',
            content: text.slice(0, 2000) // Truncate long content
          }
        ],
        max_tokens: 100
      })
    });

    clearTimeout(timeout);

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content?.trim() || text;
  } catch (error) {
    console.warn('OpenAI summarization failed, falling back to RSS description:', error);
    return text;
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  
  // Get query parameters with defaults
  const country = searchParams.get('country') || 'gb';
  const topic = searchParams.get('topic') || 'world';
  const lang = searchParams.get('lang') || 'en';
  const searchQuery = searchParams.get('q') || '';

  const feeds = FEED_CONFIG[topic as keyof typeof FEED_CONFIG] || FEED_CONFIG.world;
  let allItems: NewsItem[] = [];
  let errorCount = 0;
  let provider: string = 'rss';

  // Fetch and parse all feeds in parallel
  const feedPromises = feeds.map(async (feedUrl) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(feedUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; NewsAggregator/1.0)'
        }
      });

      clearTimeout(timeout);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const xml = await response.text();
      const items = parseRSS(xml, topic, lang);
      
      return items;
    } catch (error) {
      console.warn(`Failed to fetch feed ${feedUrl}:`, error);
      errorCount++;
      return [];
    }
  });

  try {
    const results = await Promise.allSettled(feedPromises);
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allItems.push(...result.value);
      }
    }

    // Remove duplicates based on URL
    const seenUrls = new Set();
    allItems = allItems.filter(item => {
      if (seenUrls.has(item.url)) return false;
      seenUrls.add(item.url);
      return true;
    });

    // Apply search filter if provided
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      allItems = allItems.filter(item => 
        item.title.toLowerCase().includes(query) || 
        item.summary.toLowerCase().includes(query)
      );
    }

    // Apply OpenAI summarization if available
    if (process.env.OPENAI_API_KEY && process.env.FORCE_RSS !== '1') {
      provider = 'rss+openai';
      const summaryPromises = allItems.map(async (item) => {
        if (item.summary) {
          try {
            const summary = await generateSummary(item.summary);
            return { ...item, summary };
          } catch (error) {
            return item; // Fallback to original summary
          }
        }
        return item;
      });

      allItems = await Promise.all(summaryPromises);
    }

    // Limit to top 20 items
    allItems = allItems.slice(0, 20);

    const response: ApiResponse = {
      items: allItems,
      meta: {
        country,
        topic,
        lang,
        provider,
        errorCount,
        warning: errorCount > 0 ? `Failed to fetch ${errorCount} feed(s)` : null
      }
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=60, stale-while-revalidate'
      }
    });

  } catch (error) {
    console.error('Unexpected error in news API:', error);
    
    const errorResponse: ApiResponse = {
      items: [],
      meta: {
        country,
        topic,
        lang,
        provider: 'rss',
        errorCount: 1,
        warning: 'Service temporarily unavailable'
      }
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 200, // Always return 200 even on error
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
}
