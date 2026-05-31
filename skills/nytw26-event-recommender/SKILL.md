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

## Local Cache Contract

Store generated recommendation state under:

```text
.cache/nytw26-event-recommender/
```

This cache is part of the recommender workflow and should be reused across runs. It is local working state, not public repo content. Do not commit `.cache` unless the user explicitly asks after seeing the privacy warning.

Required cache layout:

```text
.cache/nytw26-event-recommender/
  manifest.json
  indexes/
    event-search-index.json
  profiles/
    <profile-id>.json
  current/
    run-manifest.json
    recommendations.json
  runs/
    <run-id>/
      run-manifest.json
      query.json
      candidates.json
      batches/
        batch-001-input.json
        batch-001-ranking.json
      ensemble.json
      recommendations.json
```

The public page template lives at repo root as `recommendation.html`, next to `.cache/`. Do not generate the final viewable page inside `.cache` by default. The template reads run data from `.cache/nytw26-event-recommender/current/recommendations.json`, from `recommendation.html?run=<run-id>`, from `recommendation.html?data=<path>`, or from a manually loaded JSON file. Use `recommendation.html?mode=all` when the user wants the full ranked list opened by default.

Use stable hashes:

- `data_version`: hash of `data/events.jsonl`, `data/keyword-index.json`, `data/events.schema.json`, and this skill file.
- `profile_hash`: hash of the active preference profile, or `none`.
- `query_key`: hash of normalized query, hard filters, requested output size, `data_version`, and `profile_hash`.
- `candidate_hash`: hash of ordered candidate event IDs plus their first-pass score components.
- `batch_hash`: hash of batch event IDs, normalized query, scoring rubric version, `data_version`, and `profile_hash`.

Reuse policy:

- Before search, load `indexes/event-search-index.json` if its `data_version` matches. Rebuild it if missing or stale.
- If a completed run exists for the same `query_key`, reuse its `recommendations.json` unless the user asks for a fresh run.
- If candidate retrieval matches a prior `candidate_hash`, reuse existing batch rankings whose `batch_hash` still matches.
- If only the preference profile changed, reuse the raw event search index but recompute candidate scores, batch rankings, and ensemble output.
- If event data or this skill changed, invalidate candidate, batch, and ensemble caches by changing `data_version`.
- Always record cache hits/misses in `run-manifest.json`.
- After every completed run, update `current/run-manifest.json` and `current/recommendations.json` to point the root `recommendation.html` page at the latest result.

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

Store reusable preference profiles in `.cache/nytw26-event-recommender/profiles/`. When a user clicks, saves, dismisses, or marks attendance, update the local profile and record the update in the next run manifest. Never silently publish behavioral data.

## Workflow

### 1. Parse the request

Extract query terms, roles, tracks, hard constraints, soft preferences, schedule constraints, location constraints, and output size.

Verify date coverage before ranking. This repo currently targets 2026-06-01 through 2026-06-07.

Normalize the parsed request into `query.json` and compute `query_key`.

### 2. Load or build reusable search index

Create or reuse `.cache/nytw26-event-recommender/indexes/event-search-index.json`.

The index should contain enough precomputed fields to make repeated recommendations cheap:

- Event ID.
- Normalized title, host, location, tracks, inferred categories, keywords, and description tokens.
- Data-quality flags.
- Date/time/location fields.
- Source-backed track labels separated from derived fields.

If the index is reused, record the cache hit in `run-manifest.json`. If rebuilt, record the old/new `data_version`.

### 3. General search to about 100 candidates

Run a broad retrieval pass across all events. Use hard filters first, then rank remaining events by:

- Source-backed `tracks`
- `title`, `host`, `location`, and `keywords`
- `description`, when available
- `inferred_categories` as derived hints
- Preference profile boosts/penalties
- Data quality and schedule/location fit

Keep roughly 100 candidates. If hard filters leave fewer than 100 eligible candidates, use all eligible candidates. Preserve score components so the final output can explain why each event matched.

Write the result to `candidates.json`. If an existing completed run has the same `query_key`, reuse its final outputs instead of recomputing.

### 4. Rank in batches of 10

Split the candidates into batches of 10.

For each batch, use a separate subagent when subagents are available. If subagents are unavailable, run independent ranking passes with the same output contract and note that the ranking was single-agent simulated.

Each batch judge must return:

- Event ID
- Local rank
- 0-100 relevance score
- Fit reasons grounded in event fields
- Caveats
- Map pin priority

Write every batch input and ranking output under `runs/<run-id>/batches/`. Reuse a prior batch ranking when its `batch_hash` still matches; otherwise rerank the batch.

Batch scoring axes:

| Axis | Weight |
| --- | ---: |
| Query fit | 35 |
| Preference fit | 20 |
| Event quality | 20 |
| Schedule/location fit | 15 |
| Diversity value | 10 |

### 5. Ensemble reassembly

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

Write the fused output to `ensemble.json`.

### 6. Generate outputs

Produce three outputs:

1. Plain-text summary for chat.
2. `runs/<run-id>/recommendations.json` with full ranked data and score components.
3. Update `.cache/nytw26-event-recommender/current/recommendations.json` and `current/run-manifest.json` so root `recommendation.html` loads the latest run.

The committed root `recommendation.html` page must use:

- New York map on the left using a real interactive map engine with pan, zoom, visible geography, and event markers. The current template uses Leaflet with CARTO/OpenStreetMap light tiles.
- Ranked event cards on the right, one event per card.
- The Sumi-e design system in `/home/ec2-user/App/docs/design-systems/sumi-e/`: warm paper surfaces, ink-density hierarchy, asymmetric cards, Cormorant Garamond headings, Source Sans 3 body copy, and restrained accents.
- A "Top picks" view and a "Full ranked list" view so users can inspect all ranked candidates, not only the top recommendations.
- Event title, date, time, host, location, tracks, score, reasons, caveats, and event link.
- Google Maps search link for each event location.
- Source and data-quality note in the footer.
- Data loading from `.cache/nytw26-event-recommender/current/recommendations.json`, `?run=<run-id>`, `?data=<path>`, embedded `window.NYTW26_RECOMMENDATIONS`, or manual JSON upload.

Do not replace the map with a static SVG, flat image, or borough-outline-only drawing. A static drawing fails the page contract because users cannot pan, zoom, or understand event placement against streets and neighborhoods.

Google Maps search link format:

```text
https://www.google.com/maps/search/?api=1&query=<url-encoded title + location + New York NY>
```

Do not present approximate latitude/longitude as exact venue coordinates. If exact coordinates are absent, the root page may use a built-in NYC neighborhood/landmark center for map orientation, and must keep the Google Maps link for exact venue navigation.

If the user explicitly asks for a single-file snapshot, write it as `recommendation-<run-id>.html` at repo root and warn before committing any embedded private preference data. Do not place snapshot HTML under `.cache`.

## Output Schema

`recommendations.json`:

```json
{
  "query": "",
  "generated_at": "",
  "assumptions": [],
  "cache": {
    "run_id": "",
    "query_key": "",
    "data_version": "",
    "profile_hash": "",
    "cache_hits": [],
    "cache_misses": []
  },
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

- `.cache/nytw26-event-recommender/` contains the run trace: query, candidates, batch rankings, ensemble, final JSON, and `current/` pointers.
- Root `recommendation.html` exists next to `.cache` and is the default viewable page.
- Repeated identical query/profile/data runs reuse cached final outputs unless the user asks for a fresh run.
- Stale caches are invalidated by `data_version`, `query_key`, `candidate_hash`, `batch_hash`, or `profile_hash`.
- The final list is ranked and every recommendation includes an event URL.
- Reasons cite actual event fields: tracks, title, host, location, keywords, or description.
- Preference use is explicit: state which stored preferences affected the ranking.
- Source-backed `tracks` are distinguished from derived `inferred_categories`.
- The HTML page has a left map area and right ranked-event area.
- The HTML page lets the user switch between top picks and the full ranked list.
- The HTML page follows the Sumi-e design system and renders each event as a simplified card.
- The HTML page uses an interactive map with pan/zoom and visible event markers.
- Map pins are shown from exact coordinates when available or clearly approximate NYC neighborhood/landmark centers when coordinates are absent.
- Google Maps search links are included for exact event-location navigation.
- Missing descriptions or calendar fallback URLs are marked as caveats, not hidden.
- Date drift is detected before output.

## Failure Modes

- **Out-of-range date:** say the repo only covers 2026-06-01 through 2026-06-07 unless the data has been expanded.
- **No coordinates:** use Google Maps search links; do not fabricate pins.
- **No subagents available:** perform independent local ranking passes and state the limitation.
- **Too few candidates:** use all eligible candidates and explain the hard filters.
- **Preference conflict:** explicit current query wins.
- **User asks for private profile storage in repo:** ask for confirmation before writing personal data to the public repository.
- **Cache conflict or corrupt JSON:** ignore the corrupt cache file, rebuild the affected stage, and record the rebuild reason in `run-manifest.json`.
