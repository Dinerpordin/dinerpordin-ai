// app/api/news/route.ts
import { NextResponse } from "next/server";

type Item = {
  title: string;
  summary: string;
  url: string;
  source: string;
  topic: string;
  lang: string;
};

async function fetchText(url: string): Promise<string> {
  const r = await fetch(url, { headers: { "user-agent": "Mozilla/5.0" } });
  if (!r.ok) throw new Error(`Fetch ${url} -> ${r.status}`);
  return await r.text();
}
function strip(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
function parseRSS(xml: string): { title: string; link: string; summary: string }[] {
  const items = xml.split(/<item>/i).slice(1);
  if (items.length) {
    return items
      .map((block) => {
        const title = strip(
          (block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/<!\[CDATA\[(.*?)\]\]>/gis, "$1")
        );
        const link = strip(block.match(/<link[^>]*>([\s\S]*?)<\/link>/i)?.[1] ?? "");
        const desc = strip(
          (block.match(/<description[^>]*>([\s\S]*?)<\/description>/i)?.[1] ?? "").replace(
            /<!\[CDATA\[(.*?)\]\]>/gis,
            "$1"
          )
        );
        const content = strip(
          (block.match(/<content:encoded[^>]*>([\s\S]*?)<\/content:encoded>/i)?.[1] ?? "").replace(
            /<!\[CDATA\[(.*?)\]\]>/gis,
            "$1"
          )
        );
        return { title, link, summary: content || desc };
      })
      .filter((x) => x.title && x.link);
  }
  const entries = xml.split(/<entry>/i).slice(1);
  if (entries.length) {
    return entries
      .map((block) => {
        const title = strip(
          (block.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "").replace(/<!\[CDATA\[(.*?)\]\]>/gis, "$1")
        );
        const link = (block.match(/<link[^>]*href="([^"]+)"/i)?.[1] ?? "").trim();
        const sum = strip(
          (block.match(/<summary[^>]*>([\s\S]*?)<\/summary>/i)?.[1] ?? "").replace(/<!\[CDATA\[(.*?)\]\]>/gis, "$1")
        );
        const content = strip(
          (block.match(/<content[^>]*>([\s\S]*?)<\/content>/i)?.[1] ?? "").replace(/<!\[CDATA\[(.*?)\]\]>/gis, "$1")
        );
        return { title, link, summary: content || sum };
      })
      .filter((x) => x.title && x.link);
  }
  return [];
}

const FEEDS: Record<string, string[]> = {
  world: [
    "https://feeds.bbci.co.uk/news/world/rss.xml",
    "https://rss.cnn.com/rss/edition_world.rss",
    "https://www.aljazeera.com/xml/rss/all.xml",
    "https://www.nytimes.com/services/xml/rss/nyt/World.xml",
  ],
  sports: ["https://www.espn.com/espn/rss/news", "https://www.theguardian.com/uk/sport/rss"],
  technology: ["https://www.theverge.com/rss/index.xml", "https://www.techmeme.com/feed.xml"],
  bangladesh: [
    "https://www.thedailystar.net/frontpage/rss.xml",
    "https://www.prothomalo.com/feed",
  ],
};
function selectFeeds(country: string, topic: string): string[] {
  if (country === "bd") return FEEDS.bangladesh;
  if (FEEDS[topic]) return FEEDS[topic];
  return FEEDS.world;
}

async function summarizeWithOpenAI(items: Item[], lang: string): Promise<Item[]> {
  if (process.env.FORCE_SIMPLE_SUMMARY === "1") return items;
  const key = process.env.OPENAI_API_KEY;
  if (!key) return items;

  const prompt = `Summarize each of the following news items into a short one-sentence summary in language code "${lang}".
Return JSON array of objects with keys: title, summary, url, source, topic, lang.
Input: ${JSON.stringify(items.slice(0, 12))}`;

  const r = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.3,
      max_tokens: 600,
    }),
  });
  if (!r.ok) return items;
  const data = await r.json();
  const text = data?.choices?.[0]?.message?.content?.trim();
  if (!text) return items;
  try {
    const parsed = JSON.parse(text);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((x: any) => x?.title && x?.url)
        .map((x: any) => ({
          title: String(x.title),
          summary: String(x.summary ?? ""),
          url: String(x.url),
          source: String(x.source ?? ""),
          topic: String(x.topic ?? ""),
          lang: String(x.lang ?? lang),
        }));
    }
  } catch {}
  return items;
}

export async function GET(req: Request) {
  const u = new URL(req.url);
  const country = (u.searchParams.get("country") ?? "gb").toLowerCase();
  const topic = (u.searchParams.get("topic") ?? "world").toLowerCase();
  const lang = (u.searchParams.get("lang") ?? "en").toLowerCase();
  const q = (u.searchParams.get("q") ?? "").trim();
  const count = Math.max(3, Math.min(20, Number(u.searchParams.get("count") ?? "10") || 10));

  const feedUrls = selectFeeds(country, topic);
  const out: Item[] = [];

  for (const feed of feedUrls) {
    try {
      const xml = await fetchText(feed);
      const rows = parseRSS(xml).slice(0, 10);
      for (const r of rows) {
        out.push({
          title: r.title,
          summary: r.summary || r.title,
          url: r.link,
          source: new URL(r.link).hostname.replace(/^www\./, ""),
          topic,
          lang,
        });
      }
    } catch {
      // ignore bad feeds
    }
  }

  let items = out;
  if (q) {
    const qq = q.toLowerCase();
    items = items.filter(
      (it) =>
        it.title.toLowerCase().includes(qq) ||
        it.summary.toLowerCase().includes(qq) ||
        it.source.toLowerCase().includes(qq)
    );
  }

  const seen = new Set<string>();
  const compact: Item[] = [];
  for (const it of items) {
    if (!seen.has(it.url)) {
      seen.add(it.url);
      compact.push(it);
    }
  }

  let finalItems = compact.slice(0, count);

  try {
    finalItems = await summarizeWithOpenAI(finalItems, lang);
  } catch {}

  return NextResponse.json({ items: finalItems }, { status: 200 });
}
