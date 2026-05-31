# PMAI-NYTW26

Public event index for New York Tech Week 2026, curated by Pioneering Minds AI.

This repo is designed so a human or agent can quickly search New York Tech Week events by interest, role, track, keyword, date, and location. The first target coverage window is:

- **City:** New York City
- **Source:** https://www.tech-week.com/calendar/nyc
- **Dates:** 2026-06-01 through 2026-06-07
- **Status:** event data and keyword index published

Current snapshot:

- **Events indexed:** 1,602 events in the June 1-7 window
- **Descriptions fetched directly:** 1,426
- **Unavailable descriptions:** 176, all recorded in `data/description-failures.json`
- **Tavily fallback:** attempted for 12 URL-level failures, but the connected Tavily account is currently over plan limit

## What This Repo Will Contain

The event index will include one structured record per Tech Week event.

Required fields:

| Field | Description |
| --- | --- |
| `id` | Stable local event ID |
| `title` | Event title |
| `event_url` | Best actionable event URL: linked external page when available, otherwise Tech Week calendar fallback |
| `event_url_kind` | `external` or `tech_week_calendar_fallback` |
| `external_url` | Linked event page, such as Partiful, if available |
| `source_event_url` | Tech Week calendar URL with event ID |
| `date` | Local event date |
| `start_time` | Local event start time |
| `end_time` | Local event end time, if available |
| `timezone` | Expected to be America/New_York unless source says otherwise |
| `host` | Host or organizer |
| `location` | Venue/address or virtual location |
| `location_source` | `tech_week`, `external_page`, or `unavailable` |
| `tracks` | Tech Week track labels |
| `description` | Event description fetched from the linked event page |
| `description_source` | `direct_fetch`, `tavily_fallback`, or `unavailable` |
| `keywords` | Per-event keyword index for agent search |
| `source_checked_at` | UTC timestamp when the event was last checked |

## Track-Aware Search

The index should preserve Tech Week tracks and map events into practical PMAI search categories. Initial categories:

- AI + Infra
- Hackathons
- Fintech
- Students
- Engineers
- Founders
- GTM
- Investors

These categories should be treated as filters and ranking signals, not as the only searchable terms.

## Expected Files

```text
data/
  README.md
  events.jsonl              # one event per line
  events.json               # full pretty-printed event array
  events.schema.json        # machine-readable field contract
  keyword-index.json        # event ID -> keywords and ranking hints
  ingestion-report.json     # source/run summary
  description-failures.json # unresolved descriptions and fallback status
  maps/
    README.md
    nyc-borough-boundaries.geojson
    source-manifest.json

docs/
  ingestion-notes.md        # source/fetch notes and known gaps
  recommendation-algorithm.md
  recommendation-page-spec.md

recommendation.html          # reusable Sumi-e Leaflet recommender result page

skills/
  nytw26-event-query/
    SKILL.md                # agent instructions for querying this repo
  nytw26-event-recommender/
    SKILL.md                # personalized ranking, ensemble, and map-page guidance
```

## How An Agent Should Use This

An agent can download or search this repo, then answer user questions against the structured event data.

Example prompts:

- "Find AI infrastructure events for technical founders from June 1 to June 3."
- "What should a student attend if they want hackathons and recruiting?"
- "Show investor-facing fintech events with the event link and location."
- "Build me a June 4 evening plan near downtown Manhattan."
- "Find founder/investor breakfasts where the host looks relevant to AI startups."
- "Give me three GTM events and explain why each one matches a B2B founder."
- "Create a personalized ranked page for AI infra and founder events, with a map on the left and event cards on the right."

Expected answer shape:

```text
Recommended events

1. <Event title>
   Time: <date/time>
   Host: <host>
   Location: <location>
   Tracks: <tracks>
   Why it matches: <keywords/reason>
   Link: <event_url>
```

## Source Policy

For each event:

1. Start from the Tech Week NYC calendar.
2. Capture all visible metadata from the Tech Week listing.
3. Follow the event link.
4. Fetch the event description from the linked page directly first, especially Partiful links.
5. If direct fetch fails, use Tavily as fallback.
6. Record the method in `description_source`.
7. Do not silently drop events with missing descriptions; mark them as `unavailable`.

## Known Gaps

- Tech Week's API reports 1,605 NYC events. The normalized index includes 1,602 events dated 2026-06-01 through 2026-06-07; three API records were outside the requested date window.
- 164 events do not expose an external event URL in the Tech Week API, so `event_url` falls back to the Tech Week calendar and no linked page was available for description fetching.
- Four events did not expose a location in the Tech Week API; the index uses linked-page location fallback where available and otherwise marks the location status directly.
- 12 linked pages failed direct fetch; Tavily fallback was attempted but blocked by plan usage limit. Those records are marked in the data.
- `tracks` are source-backed Tech Week curated track memberships. `inferred_categories` are high-confidence derived hints from source tracks plus title, host, and location signals.

## PMAI Context

Pioneering Minds AI is using this index as a community utility for New York Tech Week 2026 and as source material for a June 1 newsletter. The repo should stay useful as a standalone public artifact: future readers should not need private PMAI context to query the events.

## Recommendation Layer

The repo now includes a recommendation design memo and a recommender skill:

- `docs/recommendation-algorithm.md`
- `docs/recommendation-page-spec.md`
- `skills/nytw26-event-recommender/SKILL.md`

The recommendation flow is broad retrieval to roughly 100 candidates, 10-event batch ranking, ensemble reassembly, and a ranked HTML result page with an interactive New York map on the left and event recommendation cards on the right. The root page uses the Sumi-e design system, renders event-location markers from exact coordinates when present or approximate neighborhood/landmark centers when coordinates are absent, and links out to Google Maps for exact venue navigation. Personal preference profiles should stay local/private unless a user explicitly asks to publish them.

`recommendation.html` is the reusable Sumi-e Leaflet result template at repo root. Recommender runs should write JSON under `.cache/nytw26-event-recommender/` and update `.cache/nytw26-event-recommender/current/recommendations.json`; the page can then show top picks or the full ranked list from that cached run data.
