import { NextRequest } from 'next/server';

// Curated news sources with verified RSS feeds
const PROVIDERS = {
  // World News (Global Coverage)
  world: [
    'https://feeds.bbci.co.uk/news/world/rss.xml',
    'https://feeds.reuters.com/reuters/worldNews',
    'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',
    'https://www.theguardian.com/international/rss',
    'https://www.aljazeera.com/xml/rss/all.xml'
  ],
  
  // Bangladesh News (Verified working RSS feeds)
  bangladesh: [
    'https://www.thedailystar.net/top-news/rss.xml', // Top news from Daily Star
    'https://www.newagebd.net/feed', // New Age Bangladesh
    'https://en.prothomalo.com/feed/', // Prothom Alo English
    'https://www.dhakatribune.com/feed', // Dhaka Tribune
    'https://bdnews24.com/rss', // BDNews24
    'https://www.jagonews24.com/rss', // Jagonews24
    'https://www.observerbd.com/rss.php', // Daily Observer
    'https://www.kalerkantho.com/feed/rss/online' // Kaler Kantho
  ],
  
  // Economy (World & Bangladesh Focus)
  economy: [
    'https://feeds.reuters.com/reuters/businessNews',
    'https://rss.nytimes.com/services/xml/rss/nyt/Economy.xml',
    'https://www.ft.com/rss/world',
    'https://www.bloomberg.com/markets/rss',
    'https://www.thedailystar.net/business/rss.xml', // Daily Star Business
    'https://www.dhakatribune.com/business/feed' // Dhaka Tribune Business
  ],
  
  // Sports: Football (Global & Bangladesh Focus)
  football: [
    'https://feeds.bbci.co.uk/sport/football/rss.xml',
    'https://www.theguardian.com/football/rss',
    'https://www.espn.com/espn/rss/soccer/news',
    'https://www.goal.com/feeds/en-us/news',
    'https://www.thedailystar.net/sports/football/rss.xml', // Daily Star Football
    'https://www.dhakatribune.com/sport/football/feed' // Dhaka Tribune Football
  ],
  
  // Sports: Cricket (Global & Bangladesh Focus)
  cricket: [
    'https://www.espncricinfo.com/rss/content/story/feeds/0.xml',
    'https://feeds.bbci.co.uk/sport/cricket/rss.xml',
    'https://www.cricbuzz.com/rss/news',
    'https://www.icc-cricket.com/rss/news',
    'https://www.thedailystar.net/sports/cricket/rss.xml', // Daily Star Cricket
    'https://www.dhakatribune.com/sport/cricket/feed' // Dhaka Tribune Cricket
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
  'newagebd.net': 'New Age Bangladesh',
  'prothomalo.com': 'Prothom Alo',
  'dhakatribune.com': 'Dhaka Tribune',
  'bdnews24.com': 'bdnews24.com',
  'jagonews24.com': 'Jagonews24',
  'observerbd.com': 'Daily Observer',
  'kalerkantho.com': 'Kaler Kantho',
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

// Enhanced RSS parser with better error handling and content extraction
function parseRSS(xml: string, category: string, lang: string): NewsItem[] {
  const items: NewsItem[] = [];
  
  try {
    // More robust item extraction
    const itemRegex = /<item>[\s\S]*?<\/item>/gi;
    const itemMatches = xml.match(itemRegex) || [];

    for (const itemXml of itemMatches.slice(0, 15)) {
      try {
        // Extract title with multiple fallbacks
        let title = '';
        const titleMatch = itemXml.match(/<title>([\s\S]*?)<\/title>/i) || 
                          itemXml.match(/<title[^>]*>([\s\S]*?)<\/title>/i) ||
                          itemXml.match(/<dc:title>([\s\S]*?)<\/dc:title>/i);
        if (titleMatch) {
          title = cleanText(titleMatch[1]);
        }

        // Extract link/URL with multiple fallbacks
        let url = '';
        const linkMatch = itemXml.match(/<link>([\s\S]*?)<\/link>/i) ||
                         itemXml.match(/<link[^>]*>([\s\S]*?)<\/link>/i) ||
                         itemXml.match(/<guid[^>]*>([\s\S]*?)<\/guid>/i);
        if (linkMatch) {
          url = cleanText(linkMatch[1]);
        }

        // Skip if no title or URL
        if (!title || !url) continue;

        // Extract description/summary with multiple fallbacks
        let description = '';
        const descMatch = itemXml.match(/<description>([\s\S]*?)<\/description>/i) || 
                         itemXml.match(/<content:encoded>([\s\S]*?)<\/content:encoded>/i) ||
                         itemXml.match(/<content>([\s\S]*?)<\/content>/i) ||
                         itemXml.match(/<dc:description>([\s\S]*?)<\/dc:description>/i);
        if (descMatch) {
          description = cleanText(descMatch[1]);
        }

        // Extract image with multiple fallbacks
        let imageUrl: string | undefined;
        const imageMatch = itemXml.match(/<media:content[^>]*url="([^"]*)"/i) ||
                          itemXml.match(/<enclosure[^>]*url="([^"]*)"/i) ||
                          itemXml.match(/<image>[\s\S]*?<url>([\s\S]*?)<\/url>/i) ||
                          itemXml.match(/<media:thumbnail[^>]*url="([^"]*)"/i) ||
                          itemXml.match(/<img[^>]*src="([^"]*)"/i);
        if (imageMatch) {
          imageUrl = cleanText(imageMatch[1]);
        }

        // Extract publish date with multiple fallbacks
        let publishedAt: string | undefined;
        const dateMatch = itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i) ||
                         itemXml.match(/<dc:date>([\s\S]*?)<\/dc:date>/i) ||
                         itemXml.match(/<published>([\s\S]*?)<\/published>/i);
        if (dateMatch) {
          publishedAt = cleanText(dateMatch[1]);
        }

        // Determine source from URL
        let source = 'Unknown Source';
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
        const id = Buffer.from(url + title).toString('base64').slice(0, 20);

        // Determine language
        const detectedLang = determineLanguage(title + description, lang);

        items.push({
          id,
          title,
          summary: description || 'Click to read full story',
          url,
          source,
          topic: category,
          lang: detectedLang,
          publishedAt,
          imageUrl,
          category,
          readTime
        });
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
    .replace(/\[\+]/g, '') // Remove [++] from some feeds
    .replace(/CDATA\[/g, '') // Remove CDATA
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

function determineLanguage(text: string, defaultLang: string): string {
  const bengaliRegex = /[\u0980-\u09FF]/;
  return bengaliRegex.test(text) ? 'bn' : defaultLang;
}

// Enhanced RSS fetcher with better error handling
async function fetchFromRSS(category: string, lang: string): Promise<NewsItem[]> {
  const feeds = PROVIDERS[category as keyof typeof PROVIDERS] || [];
  const allItems: NewsItem[] = [];

  console.log(`Fetching ${feeds.length} feeds for category: ${category}`);

  const feedPromises = feeds.map(async (feedUrl, index) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000); // 10 second timeout

      console.log(`Fetching feed ${index + 1}: ${feedUrl}`);
      
      const response = await fetch(feedUrl, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
          'Accept': 'application/rss+xml, application/xml, text/xml, application/atom+xml',
          'Accept-Encoding': 'gzip, deflate, br'
        }
      });

      clearTimeout(timeout);

      if (!response.ok) {
        console.warn(`Feed ${feedUrl} returned ${response.status}`);
        return [];
      }

      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('xml')) {
        console.warn(`Feed ${feedUrl} returned non-XML content: ${contentType}`);
        return [];
      }

      const xml = await response.text();
      
      // Check if we got valid XML content
      if (!xml.includes('<rss') && !xml.includes('<feed') && !xml.includes('<rdf')) {
        console.warn(`Feed ${feedUrl} returned invalid XML content`);
        return [];
      }

      const items = parseRSS(xml, category, lang);
      console.log(`Feed ${feedUrl} returned ${items.length} items`);
      
      return items;
    } catch (error) {
      console.warn(`Failed to fetch RSS feed ${feedUrl}:`, error);
      return [];
    }
  });

  try {
    const results = await Promise.allSettled(feedPromises);
    
    let successfulFeeds = 0;
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        const items = result.value;
        if (items.length > 0) {
          successfulFeeds++;
          allItems.push(...items);
          console.log(`Successfully processed feed ${index + 1} with ${items.length} items`);
        }
      }
    });
    
    console.log(`Successfully fetched from ${successfulFeeds}/${feeds.length} feeds for ${category}`);
  } catch (error) {
    console.error('RSS fetching error:', error);
  }

  return allItems;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category') || 'world';
  const lang = searchParams.get('lang') || 'en';
  const searchQuery = searchParams.get('q') || '';
  const limit = Math.min(parseInt(searchParams.get('limit') || '25'), 50);

  console.log(`API Request: category=${category}, lang=${lang}, search=${searchQuery}`);

  let allItems: NewsItem[] = [];
  const feeds = PROVIDERS[category as keyof typeof PROVIDERS] || [];
  let providerStats = {
    totalFeeds: feeds.length,
    successfulFeeds: 0,
    failedFeeds: 0
  };

  try {
    allItems = await fetchFromRSS(category, lang);
    
    // Count successful feeds (feeds that returned at least one item)
    const successfulCount = feeds.reduce((count, feed, index) => {
      // This is a simplified count - in reality we'd track which feeds succeeded
      return count + (allItems.some(item => item.source.toLowerCase().includes(feed.split('.')[1] || feed.split('.')[0])) ? 1 : 0);
    }, 0);
    
    providerStats.successfulFeeds = successfulCount;
    providerStats.failedFeeds = providerStats.totalFeeds - providerStats.successfulFeeds;

    console.log(`Total items fetched: ${allItems.length}`);

    // Remove duplicates based on URL and title similarity
    const seenUrls = new Set();
    const seenTitles = new Set();
    
    allItems = allItems.filter(item => {
      if (!item.url || !item.title || item.title.length < 10) return false;
      
      const normalizedUrl = item.url.toLowerCase().split('?')[0].split('#')[0];
      const normalizedTitle = item.title.toLowerCase()
        .replace(/[^\w\s]/g, '')
        .replace(/\s+/g, ' ')
        .substring(0, 80);
      
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

    // Sort by publish date (newest first)
    allItems.sort((a, b) => {
      try {
        const dateA = a.publishedAt ? new Date(a.publishedAt).getTime() : 0;
        const dateB = b.publishedAt ? new Date(b.publishedAt).getTime() : 0;
        return dateB - dateA;
      } catch {
        return 0;
      }
    });

    const categoryMeta = CATEGORY_METADATA[category as keyof typeof CATEGORY_METADATA] || {
      name: category,
      description: 'Latest news',
      icon: '📰',
      color: 'gray'
    };

    // Get unique sources
    const sources = Array.from(new Set(allItems.map(item => item.source))).slice(0, 8);

    const response = {
      items: allItems.slice(0, limit),
      meta: {
        category: categoryMeta.name,
        categoryIcon: categoryMeta.icon,
        categoryDescription: categoryMeta.description,
        categoryColor: categoryMeta.color,
        lang,
        provider: 'rss',
        totalItems: allItems.length,
        returnedItems: Math.min(allItems.length, limit),
        providerStats,
        summarization: 'none',
        sources,
        warning: providerStats.failedFeeds > 0 ? 
          `${providerStats.failedFeeds} feed(s) failed to load` : 
          (allItems.length === 0 ? 'No articles found in selected feeds' : null)
      }
    };

    console.log(`API Response: ${response.items.length} items, ${response.meta.sources.length} sources`);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 's-maxage=300, stale-while-revalidate=600' // 5 minute cache
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
