import { writeFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = dirname(__dirname);

const API_URL = "https://www.tech-week.com/calendar/api/trpc/calendar.events";
const CALENDAR_URL = "https://www.tech-week.com/calendar/nyc";
const TIMEZONE = "America/New_York";
const START_DATE = "2026-06-01";
const END_DATE = "2026-06-07";
const CONCURRENCY = Number(process.env.PMAI_NYTW26_CONCURRENCY || 10);

const TRACKS = [
  ["ai-infra", "AI + Infra"],
  ["hackathons", "Hackathons"],
  ["fintech", "Fintech"],
  ["students", "Students"],
  ["engineers", "Engineers"],
  ["founders", "Founders"],
  ["gtm", "GTM"],
  ["investors", "Investors"],
];

function calendarInput({ cursor = 1, track = [] } = {}) {
  return {
    city: "nyc",
    q: "",
    featured: false,
    day: "all",
    track,
    sponsor: [],
    theme: [],
    format: [],
    location: [],
    time: [],
    host: [],
    sortBy: "time",
    sortOrder: "asc",
    cursor,
  };
}

function trpcUrl(input) {
  return `${API_URL}?input=${encodeURIComponent(JSON.stringify(input))}`;
}

async function fetchJson(url) {
  const response = await fetch(url, {
    headers: {
      accept: "application/json",
      "user-agent": "PMAI-NYTW26 event indexer (+https://github.com/NickGuAI/PMAI-NYTW26)",
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    throw new Error(`HTTP ${response.status} ${response.statusText}: ${body.slice(0, 240)}`);
  }
  return response.json();
}

async function fetchEventPage(cursor, track = []) {
  const data = await fetchJson(trpcUrl(calendarInput({ cursor, track })));
  const page = data?.result?.data;
  if (!page || !Array.isArray(page.results)) {
    throw new Error(`Unexpected TRPC response for cursor ${cursor}`);
  }
  return page;
}

async function fetchAllForTrack(track = []) {
  const first = await fetchEventPage(1, track);
  const pages = Math.ceil(first.total / first.perPage);
  const results = [...first.results];
  for (let cursor = 2; cursor <= pages; cursor += 1) {
    const page = await fetchEventPage(cursor, track);
    results.push(...page.results);
  }
  return { total: first.total, perPage: first.perPage, results };
}

function decodeHtml(value) {
  if (!value) return "";
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return value
    .replace(/&#(x?[0-9a-fA-F]+);/g, (_, code) => {
      const n = code.toLowerCase().startsWith("x")
        ? Number.parseInt(code.slice(1), 16)
        : Number.parseInt(code, 10);
      return Number.isFinite(n) ? String.fromCodePoint(n) : "";
    })
    .replace(/&([a-zA-Z]+);/g, (_, key) => named[key] ?? `&${key};`)
    .replace(/\r\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function firstMetaContent(html, names) {
  for (const name of names) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const patterns = [
      new RegExp(`<meta[^>]+(?:property|name)=["']${escaped}["'][^>]+content=["']([^"']*)["'][^>]*>`, "i"),
      new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${escaped}["'][^>]*>`, "i"),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return decodeHtml(match[1]);
    }
  }
  return "";
}

async function fetchDescription(url) {
  if (!url) {
    return {
      description: "",
      description_source: "unavailable",
      description_source_url: null,
      description_fetch_error: "Missing external URL",
    };
  }

  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        accept: "text/html,application/xhtml+xml",
        "user-agent": "PMAI-NYTW26 event indexer (+https://github.com/NickGuAI/PMAI-NYTW26)",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText}`);
    }
    const html = await response.text();
    const description = firstMetaContent(html, [
      "og:description",
      "description",
      "twitter:description",
    ]);
    if (!description) {
      return {
        description: "",
        description_source: "unavailable",
        description_source_url: response.url || url,
        description_fetch_error: "Direct fetch succeeded but no description meta tag was found",
      };
    }
    return {
      description,
      description_source: "direct_fetch",
      description_source_url: response.url || url,
      description_fetch_error: null,
    };
  } catch (error) {
    return {
      description: "",
      description_source: "unavailable",
      description_source_url: url,
      description_fetch_error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function mapLimit(items, limit, fn) {
  const results = new Array(items.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next;
      next += 1;
      results[index] = await fn(items[index], index);
      if ((index + 1) % 100 === 0) {
        console.error(`Fetched descriptions for ${index + 1}/${items.length}`);
      }
    }
  });
  await Promise.all(workers);
  return results;
}

function hostLabels(event) {
  const labels = event.facets?.hosts?.map((host) => host.label).filter(Boolean) ?? [];
  const deduped = [...new Set(labels)];
  return deduped.length ? deduped : [event.company].filter(Boolean);
}

function isoTime(date, time) {
  if (!date || !time) return null;
  return `${date}T${time}`;
}

function normalizeEvent(event, tracks, descriptionResult, checkedAt) {
  const hosts = hostLabels(event);
  return {
    id: `techweek-nyc-2026-${event.id}`,
    tech_week_id: event.id,
    city: event.city,
    title: event.name,
    event_url: event.externalHref,
    external_url: event.externalHref,
    source_calendar_url: CALENDAR_URL,
    date: event.date,
    start_time: event.time,
    start_datetime_local: isoTime(event.date, event.time),
    end_time: null,
    timezone: TIMEZONE,
    host: hosts.join(", "),
    hosts,
    location: event.location,
    tracks,
    is_invite_only: Boolean(event.isInviteOnly),
    sponsor_tier: event.sponsorTier ?? null,
    description: descriptionResult.description,
    description_source: descriptionResult.description_source,
    description_source_url: descriptionResult.description_source_url,
    description_fetch_error: descriptionResult.description_fetch_error,
    keywords: [],
    raw_facets: event.facets ?? {},
    source_checked_at: checkedAt,
  };
}

async function main() {
  await mkdir(join(repoRoot, "data"), { recursive: true });
  await mkdir(join(repoRoot, "docs"), { recursive: true });

  const checkedAt = new Date().toISOString();
  console.error("Fetching full NYC calendar...");
  const full = await fetchAllForTrack();
  const rawEvents = full.results.filter((event) => event.date >= START_DATE && event.date <= END_DATE);
  const byId = new Map(rawEvents.map((event) => [event.id, event]));

  console.error(`Fetched ${rawEvents.length}/${full.total} calendar events in target range.`);
  console.error("Fetching track memberships...");
  const trackMap = new Map();
  const trackCounts = {};
  for (const [slug, label] of TRACKS) {
    const trackData = await fetchAllForTrack([slug]);
    trackCounts[label] = trackData.total;
    for (const event of trackData.results) {
      if (!trackMap.has(event.id)) trackMap.set(event.id, []);
      trackMap.get(event.id).push(label);
    }
  }

  console.error(`Fetching descriptions with concurrency ${CONCURRENCY}...`);
  const descriptions = await mapLimit(rawEvents, CONCURRENCY, (event) => fetchDescription(event.externalHref));
  const normalized = rawEvents.map((event, index) =>
    normalizeEvent(event, trackMap.get(event.id) ?? [], descriptions[index], checkedAt),
  );

  const failures = normalized.filter((event) => event.description_source !== "direct_fetch");
  const eventsJsonl = normalized.map((event) => JSON.stringify(event)).join("\n") + "\n";
  const eventsJson = JSON.stringify(normalized, null, 2) + "\n";
  const rawJson = JSON.stringify(rawEvents, null, 2) + "\n";
  const failureJson = JSON.stringify(failures, null, 2) + "\n";
  const report = {
    source: CALENDAR_URL,
    date_range: { start: START_DATE, end: END_DATE },
    source_checked_at: checkedAt,
    calendar_total_reported: full.total,
    events_in_target_range: normalized.length,
    per_page: full.perPage,
    track_counts: trackCounts,
    direct_fetch_descriptions: normalized.length - failures.length,
    unavailable_descriptions: failures.length,
    description_failures_path: "data/description-failures.json",
  };

  await writeFile(join(repoRoot, "data", "events.jsonl"), eventsJsonl);
  await writeFile(join(repoRoot, "data", "events.json"), eventsJson);
  await writeFile(join(repoRoot, "data", "events-raw-techweek.json"), rawJson);
  await writeFile(join(repoRoot, "data", "description-failures.json"), failureJson);
  await writeFile(join(repoRoot, "data", "ingestion-report.json"), JSON.stringify(report, null, 2) + "\n");

  const notes = `# Ingestion Notes

Last ingestion run: ${checkedAt}

Source: ${CALENDAR_URL}

Coverage:

- City: New York City
- Date range: ${START_DATE} through ${END_DATE}
- Tech Week events reported by API: ${full.total}
- Events normalized in target range: ${normalized.length}

Description fetch:

- Direct fetch descriptions: ${report.direct_fetch_descriptions}
- Unavailable descriptions requiring fallback/review: ${report.unavailable_descriptions}
- Fallback file: \`data/description-failures.json\`

Track counts:

${Object.entries(trackCounts).map(([track, count]) => `- ${track}: ${count}`).join("\n")}

Source order used:

1. Tech Week NYC TRPC calendar endpoint behind https://www.tech-week.com/calendar/nyc
2. Linked event page from each event record.
3. Direct web fetch from each linked event page, primarily Partiful.
4. Any unresolved descriptions are recorded in \`data/description-failures.json\` for Tavily fallback or manual review.

Notes:

- Event URLs are the linked external event URLs exposed by the Tech Week calendar.
- Times are local New York event times and stored with timezone \`${TIMEZONE}\`.
- Track membership is based on Tech Week curated track filters.
`;
  await writeFile(join(repoRoot, "docs", "ingestion-notes.md"), notes);

  console.log(JSON.stringify(report, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
