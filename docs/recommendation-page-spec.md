# Ranked Recommendation Page Spec

This spec defines the root HTML page used by `skills/nytw26-event-recommender/SKILL.md`.

## Page Goal

Give a user a scannable ranked recommendation page: New York map on the left, recommended Tech Week events on the right, with a switch between top picks and the full ranked list.

The reusable page template is committed at repo root:

```text
recommendation.html
```

It should use the local Sumi-e design system from `/home/ec2-user/App/docs/design-systems/sumi-e/`: warm paper surfaces, ink-density hierarchy, asymmetric cards, Cormorant Garamond headings, Source Sans 3 body copy, and restrained vermillion/moss accents. Keep the page simple: one recommendation per card, with enough metadata to scan quickly.

## Layout

Desktop:

```text
┌──────────────────────────────┬────────────────────────────────────┐
│ Map pane                     │ Ranked recommendations             │
│ - Leaflet street map         │ - Query summary                    │
│ - Event pins                 │ - Preference assumptions           │
│ - Selected event highlight   │ - Ranked event cards               │
│                              │ - Data/source caveats              │
└──────────────────────────────┴────────────────────────────────────┘
```

Mobile:

```text
┌──────────────────────────────┐
│ Map pane                     │
├──────────────────────────────┤
│ Ranked recommendations       │
└──────────────────────────────┘
```

## Data Inputs

- `data/events.json` or `data/events.jsonl`
- `data/keyword-index.json`
- `data/maps/nyc-borough-boundaries.geojson`
- generated `.cache/nytw26-event-recommender/current/recommendations.json`
- generated `.cache/nytw26-event-recommender/runs/<run-id>/recommendations.json`

The page should load the current run by default and support:

- `recommendation.html?run=<run-id>`
- `recommendation.html?data=<path-to-recommendations-json>`
- `recommendation.html?mode=all` to open the full ranked list by default.
- manual JSON file upload when browser file loading blocks local fetch.

## Recommendation Card Fields

Each event must be rendered as its own card. Do not compress the list into tables or dense rows.

Each event card should show:

- Rank and final score.
- Event title.
- Date and start time.
- Host.
- Location.
- Source-backed tracks.
- Why it matches.
- Caveats, such as unavailable description or calendar fallback URL.
- Event link.
- Google Maps search link.

## Map Behavior

The left pane should:

- Use a real interactive map engine with pan and zoom, currently Leaflet with CARTO/OpenStreetMap light tiles.
- Render event pins when the recommendation record has verified coordinates or the source location matches the built-in NYC neighborhood/landmark lookup.
- If coordinates are missing, place the event using a clearly approximate NYC neighborhood or landmark center when the source location can be matched, and include the Google Maps search link for exact venue navigation.
- Highlight a map pin when the matching event card is selected.
- Avoid presenting approximate pins as exact venue coordinates.

Do not replace the interactive map with a static SVG, flat image, or borough-outline-only drawing. The map must preserve zoom, pan, visible geography, and recognizable event placement.

Current PMAI-NYTW26 event records contain location labels, not verified lat/lon coordinates. Therefore the recommendation HTML uses exact coordinates when a run provides them, otherwise it uses a small built-in NYC neighborhood/landmark lookup for approximate orientation.

## Google Maps Link

For each event, generate:

```text
https://www.google.com/maps/search/?api=1&query=<url-encoded title + location + New York NY>
```

Example source fields:

```json
{
  "title": "Beyond the Spec Masterclass: Engineering in the Age of Agents",
  "location": "Flatiron"
}
```

Example query string:

```text
Beyond the Spec Masterclass Engineering in the Age of Agents Flatiron New York NY
```

## Required Footer

The page footer must include:

- Source repo: `https://github.com/NickGuAI/PMAI-NYTW26`
- Event source: `https://www.tech-week.com/calendar/nyc`
- Map source: NYC Department of City Planning / NYC Open Data Borough Boundaries.
- Data caveat: pins are exact only when run data provides coordinates; otherwise they are approximate neighborhood/landmark markers.

## Output Contract

Keep the page template and run data separate:

- `recommendation.html` lives at repo root, next to `.cache/`, and is committed.
- `.cache/nytw26-event-recommender/runs/<run-id>/recommendations.json` stores full ranked run output.
- `.cache/nytw26-event-recommender/current/recommendations.json` points the template at the latest completed run.
- `.cache/nytw26-event-recommender/current/run-manifest.json` records the latest run metadata.

Do not write the final viewable `recommendation.html` inside `.cache`. If a user explicitly asks for a single-file snapshot, write `recommendation-<run-id>.html` at repo root and warn before embedding private preference/profile data.

The root template must:

- Top picks: compact default view.
- Full ranked list: every recommendation in `recommendations.json`.
- Load data from the current cache, a run-specific cache path, a custom JSON path, embedded `window.NYTW26_RECOMMENDATIONS`, or manual JSON upload.
