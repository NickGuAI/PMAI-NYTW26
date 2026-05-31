---
name: nytw26-event-query
description: Query the PMAI New York Tech Week 2026 event index by interest, role, track, keyword, date, and location.
---

# NYTW26 Event Query

Use this skill when a user asks for New York Tech Week 2026 event recommendations from the PMAI-NYTW26 repo.

## Data Sources

Read these repo files first:

- `data/events.jsonl`
- `data/keyword-index.json`
- `data/events.schema.json`

If `events.jsonl` is missing or empty, say that event ingestion has not been completed yet.

## Query Method

1. Parse the user's interest, role, date range, time constraints, location preferences, and desired track.
2. Match against event fields:
   - `title`
   - `host`
   - `location`
   - `tracks`
   - `description`
   - `keywords`
3. Treat tracks as strong ranking signals.
4. Treat keywords as recall aids, not as the only evidence.
5. Prefer events with complete time, host, location, and source link.
6. Always include the event URL in recommendations.

## Track Categories

Use these as first-class filters when present:

- AI + Infra
- Hackathons
- Fintech
- Students
- Engineers
- Founders
- GTM
- Investors

## Response Shape

Return concise recommendations:

```text
Recommended events

1. <Event title>
   Time: <date/time>
   Host: <host>
   Location: <location>
   Tracks: <tracks>
   Why it matches: <reason grounded in tracks/keywords/description>
   Link: <event_url>
```

If the user asks for a plan, group by date and time. If they ask for search results, sort by match quality first, then time.

## Drift Check

Before answering, verify that the loaded data covers the user's requested date range. If the user asks outside 2026-06-01 through 2026-06-07, say the repo only targets that initial New York Tech Week window unless the data has been expanded.

