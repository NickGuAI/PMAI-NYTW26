# PMAI-NYTW26

Public event index for New York Tech Week 2026, curated by Pioneering Minds AI.

This repo is designed so a human or agent can quickly search New York Tech Week events by interest, role, track, keyword, date, and location. The first target coverage window is:

- **City:** New York City
- **Source:** https://www.tech-week.com/calendar/nyc
- **Dates:** 2026-06-01 through 2026-06-07
- **Status:** repo skeleton ready; event ingestion pending

## What This Repo Will Contain

The event index will include one structured record per Tech Week event.

Required fields:

| Field | Description |
| --- | --- |
| `id` | Stable local event ID |
| `title` | Event title |
| `event_url` | Tech Week event URL |
| `external_url` | Linked event page, such as Partiful, if available |
| `date` | Local event date |
| `start_time` | Local event start time |
| `end_time` | Local event end time, if available |
| `timezone` | Expected to be America/New_York unless source says otherwise |
| `host` | Host or organizer |
| `location` | Venue/address or virtual location |
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
  events.jsonl              # one event per line, pending ingestion
  events.schema.json        # machine-readable field contract
  keyword-index.json        # event ID -> keywords, pending ingestion

docs/
  ingestion-notes.md        # source/fetch notes and known gaps

skills/
  nytw26-event-query/
    SKILL.md                # agent instructions for querying this repo
```

## How An Agent Should Use This

An agent can download or search this repo, then answer user questions against the structured event data.

Example prompts:

- "Find AI infrastructure events for technical founders from June 1 to June 3."
- "What should a student attend if they want hackathons and recruiting?"
- "Show investor-facing fintech events with the event link and location."
- "Build me a June 4 evening plan near downtown Manhattan."

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

## PMAI Context

Pioneering Minds AI is using this index as a community utility for New York Tech Week 2026 and as source material for a June 1 newsletter. The repo should stay useful as a standalone public artifact: future readers should not need private PMAI context to query the events.

