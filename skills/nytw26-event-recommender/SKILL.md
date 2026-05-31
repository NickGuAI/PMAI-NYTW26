---
name: nytw26-event-recommender
description: Create personalized New York Tech Week 2026 event recommendations from PMAI-NYTW26 using broad retrieval, batched subagent ranking, ensemble reassembly, and a map-backed HTML results page.
---

# NYTW26 Event Recommender

Use this skill when a user asks for personalized New York Tech Week 2026 event recommendations from the PMAI-NYTW26 repo, especially when they want a ranked list, itinerary, map view, or recommendations based on stored interests.

## Goal

Produce a ranked recommendation list and viewable HTML results page from the PMAI-NYTW26 event index, grounded in source-backed event fields and explicit user preferences.

## Required Inputs

- User query or interest statement.
- Desired date range or time window, if any.
- Role/persona, if stated: founder, engineer, investor, student, GTM, AI infra builder, operator, or other.
- Location constraints, if any.
- Desired number of recommendations, default 10.
- Optional preference profile JSON.

If the request is too vague, ask one clarifying question only when ranking would be arbitrary. Otherwise make conservative assumptions and state them.

## Data Sources

Read these files first:

- `data/events.jsonl` or `data/events.json`
- `data/keyword-index.json`
- `data/events.schema.json`
- `docs/recommendation-algorithm.md`

Use map files when generating HTML:

- `data/maps/nyc-borough-boundaries.geojson`
- `data/maps/README.md`

If data files are missing, say exactly which file is missing and stop.

## Preference Profile

Preference data is private user context, not public repo data. Do not commit a user's personal preference file unless they explicitly ask.

Expected profile shape:

```json
{
  "positive_signals": {
    "tracks": [],
    "keywords": [],
    "hosts": [],
    "neighborhoods": [],
    "time_windows": []
  },
  "negative_signals": {
    "keywords": [],
    "hosts": [],
    "neighborhoods": []
  },
  "behavior": {
    "clicked_event_ids": [],
    "saved_event_ids": [],
    "dismissed_event_ids": [],
    "attended_event_ids": []
  }
}
```

Explicit user instructions override stored preferences. Use saved/clicked events as weak positive signals and dismissed events as weak negative signals.

## Workflow

### 1. Parse the request

Extract query terms, roles, tracks, hard constraints, soft preferences, schedule constraints, location constraints, and output size.

Verify date coverage before ranking. This repo currently targets 2026-06-01 through 2026-06-07.

### 2. General search to about 100 candidates

Run a broad retrieval pass across all events. Use hard filters first, then rank remaining events by:

- Source-backed `tracks`
- `title`, `host`, `location`, and `keywords`
- `description`, when available
- `inferred_categories` as derived hints
- Preference profile boosts/penalties
- Data quality and schedule/location fit

Keep roughly 100 candidates. If hard filters leave fewer than 100 eligible candidates, use all eligible candidates. Preserve score components so the final output can explain why each event matched.

### 3. Rank in batches of 10

Split the candidates into batches of 10.

For each batch, use a separate subagent when subagents are available. If subagents are unavailable, run independent ranking passes with the same output contract and note that the ranking was single-agent simulated.

Each batch judge must return:

- Event ID
- Local rank
- 0-100 relevance score
- Fit reasons grounded in event fields
- Caveats
- Map pin priority

Batch scoring axes:

| Axis | Weight |
| --- | ---: |
| Query fit | 35 |
| Preference fit | 20 |
| Event quality | 20 |
| Schedule/location fit | 15 |
| Diversity value | 10 |

### 4. Ensemble reassembly

Combine batch outputs with:

- Normalized batch relevance score
- Original candidate score
- Preference fit
- Data quality
- Diversity adjustment
- Reciprocal-rank-fusion style rank bonus

Then run a diversity pass:

- Cap the same host at two events unless the user requested that host.
- Avoid near-duplicate formats when a varied list better serves the query.
- Preserve very high-scoring must-attend events.

### 5. Generate outputs

Produce three outputs:

1. Plain-text summary for chat.
2. `recommendations.json` with full ranked data and score components.
3. `recommendations.html` with a map-left/events-right layout.

The HTML page must use:

- New York map on the left.
- Ranked event cards on the right.
- Event title, date, time, host, location, tracks, score, reasons, caveats, and event link.
- Google Maps search link for each event location.
- Source and data-quality note in the footer.

Google Maps search link format:

```text
https://www.google.com/maps/search/?api=1&query=<url-encoded title + location + New York NY>
```

Do not invent latitude/longitude. If coordinates are absent, show location text and the Google Maps search link instead of a precise pin.

## Output Schema

`recommendations.json`:

```json
{
  "query": "",
  "generated_at": "",
  "assumptions": [],
  "date_range_checked": {"start": "2026-06-01", "end": "2026-06-07"},
  "candidate_count": 0,
  "ranking_method": "broad-retrieval-batch-ranking-ensemble",
  "recommendations": [
    {
      "rank": 1,
      "event_id": "",
      "final_score": 0,
      "title": "",
      "date": "",
      "start_time": "",
      "host": "",
      "location": "",
      "tracks": [],
      "event_url": "",
      "google_maps_url": "",
      "reasons": [],
      "caveats": [],
      "score_components": {}
    }
  ]
}
```

## Acceptance Criteria

- The final list is ranked and every recommendation includes an event URL.
- Reasons cite actual event fields: tracks, title, host, location, keywords, or description.
- Preference use is explicit: state which stored preferences affected the ranking.
- Source-backed `tracks` are distinguished from derived `inferred_categories`.
- The HTML page has a left map area and right ranked-event area.
- Google Maps search links are included for event locations.
- Missing descriptions or calendar fallback URLs are marked as caveats, not hidden.
- Date drift is detected before output.

## Failure Modes

- **Out-of-range date:** say the repo only covers 2026-06-01 through 2026-06-07 unless the data has been expanded.
- **No coordinates:** use Google Maps search links; do not fabricate pins.
- **No subagents available:** perform independent local ranking passes and state the limitation.
- **Too few candidates:** use all eligible candidates and explain the hard filters.
- **Preference conflict:** explicit current query wins.
- **User asks for private profile storage in repo:** ask for confirmation before writing personal data to the public repository.

