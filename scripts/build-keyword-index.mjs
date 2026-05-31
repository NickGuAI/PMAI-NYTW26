import { readFile, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(__dirname);

const STOPWORDS = new Set([
  "about", "after", "again", "all", "also", "and", "are", "around", "but", "can",
  "for", "from", "has", "have", "how", "into", "its", "new", "not", "nyc", "our",
  "out", "the", "their", "this", "through", "to", "week", "with", "you", "your",
  "tech", "event", "events", "hosted", "part", "join", "learn", "more", "will",
  "bring", "together",
]);

const CATEGORY_RULES = {
  "AI + Infra": [
    "ai", "agent", "agents", "artificial intelligence", "automation", "data", "developer tools",
    "genai", "gpu", "inference", "infra", "infrastructure", "llm", "machine learning",
    "model", "models", "rag", "robotics", "voice ai",
  ],
  Hackathons: ["agentathon", "buildathon", "hack", "hackathon", "hackathons", "vibeathon"],
  Fintech: [
    "banking", "crypto", "fintech", "payments", "private equity", "token",
  ],
  Students: ["college", "intern", "internship", "recruiting", "student", "students"],
  Engineers: [
    "api", "coding", "developer", "developers", "engineering",
    "engineer", "engineers", "founding engineer", "software", "technical",
  ],
  Founders: [
    "co-founder", "cofounder", "entrepreneur", "founder", "founders", "operator", "pitch",
    "pre-seed", "seed", "startup", "startups",
  ],
  GTM: [
    "brand", "community", "content", "customer", "demand", "growth", "gtm", "marketing",
    "pr", "sales", "seo", "storytelling",
  ],
  Investors: [
    "angel", "capital", "fund", "funder", "funders", "fundraising", "investor", "investors",
    "lp", "vc", "venture",
  ],
};

function normalizeText(value) {
  return String(value ?? "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9+#./ -]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenize(text) {
  const normalized = normalizeText(text);
  const tokens = normalized
    .split(/[\s,/|:;()[\]{}]+/)
    .map((token) => token.replace(/^[.-]+|[.-]+$/g, ""))
    .filter((token) => token.length >= 3 || ["ai", "vc", "ar", "vr"].includes(token))
    .filter((token) => !STOPWORDS.has(token));
  return tokens;
}

function uniqueWeighted(items) {
  const scores = new Map();
  for (const [item, weight] of items) {
    if (!item) continue;
    const key = normalizeText(item);
    if (!key || STOPWORDS.has(key)) continue;
    scores.set(key, (scores.get(key) ?? 0) + weight);
  }
  return [...scores.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([keyword]) => keyword);
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasExactPhrase(haystack, needle) {
  const normalizedNeedle = normalizeText(needle);
  if (!normalizedNeedle) return false;
  const pattern = new RegExp(`(^|[^a-z0-9+#./-])${escapeRegExp(normalizedNeedle)}($|[^a-z0-9+#./-])`);
  return pattern.test(haystack);
}

function inferCategories(event, categoryText) {
  const categories = new Set(event.tracks ?? []);
  for (const [category, needles] of Object.entries(CATEGORY_RULES)) {
    if (needles.some((needle) => hasExactPhrase(categoryText, needle))) {
      categories.add(category);
    }
  }
  return [...categories].sort();
}

function keywordsForEvent(event) {
  const weighted = [];
  const titleTokens = tokenize(event.title);
  const hostTokens = tokenize(event.hosts?.join(" ") || event.host);
  const locationTokens = tokenize(event.location);
  const trackTokens = tokenize((event.tracks ?? []).join(" "));
  const descriptionTokens = tokenize(event.description).slice(0, 160);
  const categoryText = normalizeText([
    event.title,
    event.host,
    event.location,
    (event.tracks ?? []).join(" "),
  ].join(" "));
  const categories = inferCategories(event, categoryText);

  for (const category of categories) weighted.push([category, 10]);
  for (const track of event.tracks ?? []) weighted.push([track, 9]);
  for (const token of titleTokens) weighted.push([token, 6]);
  for (const token of hostTokens) weighted.push([token, 4]);
  for (const token of locationTokens) weighted.push([token, 3]);
  for (const token of trackTokens) weighted.push([token, 5]);
  for (const token of descriptionTokens) weighted.push([token, 1]);

  return {
    keywords: uniqueWeighted(weighted).slice(0, 80),
    inferred_categories: categories,
  };
}

async function main() {
  const eventsPath = join(repoRoot, "data", "events.json");
  const events = JSON.parse(await readFile(eventsPath, "utf8"));
  const entries = {};
  const categoryCounts = {};

  for (const event of events) {
    const { keywords, inferred_categories } = keywordsForEvent(event);
    event.keywords = keywords;
    event.inferred_categories = inferred_categories;
    for (const category of inferred_categories) {
      categoryCounts[category] = (categoryCounts[category] ?? 0) + 1;
    }
    entries[event.id] = {
      title: event.title,
      date: event.date,
      start_time: event.start_time,
      timezone: event.timezone,
      host: event.host,
      location: event.location,
      tracks: event.tracks,
      inferred_categories,
      keywords,
      event_url: event.event_url,
      description_source: event.description_source,
    };
  }

  const index = {
    generated_at: new Date().toISOString(),
    source: "data/events.json",
    event_count: events.length,
    category_counts: Object.fromEntries(Object.entries(categoryCounts).sort((a, b) => a[0].localeCompare(b[0]))),
    query_guidance: {
      strong_signals: ["tracks", "inferred_categories", "title", "keywords"],
      tie_breakers: ["date", "start_time", "location", "description_source"],
      required_output_fields: ["title", "date", "start_time", "host", "location", "tracks", "event_url"],
    },
    events: entries,
  };

  await writeFile(eventsPath, JSON.stringify(events, null, 2) + "\n");
  await writeFile(join(repoRoot, "data", "events.jsonl"), events.map((event) => JSON.stringify(event)).join("\n") + "\n");
  await writeFile(join(repoRoot, "data", "keyword-index.json"), JSON.stringify(index, null, 2) + "\n");
  console.log(JSON.stringify({
    event_count: events.length,
    keyword_index_path: "data/keyword-index.json",
    category_counts: index.category_counts,
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
