# Ranked Recommendation Page Spec

This spec defines the HTML page produced by `skills/nytw26-event-recommender/SKILL.md`.

## Page Goal

Give a user a scannable ranked recommendation page: New York map on the left, recommended Tech Week events on the right.

## Layout

Desktop:

```text
┌──────────────────────────────┬────────────────────────────────────┐
│ Map pane                     │ Ranked recommendations             │
│ - NYC borough boundaries     │ - Query summary                    │
│ - Event pins when verified   │ - Preference assumptions           │
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
- generated `recommendations.json`

## Recommendation Card Fields

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

- Render `data/maps/nyc-borough-boundaries.geojson` as the base layer.
- Render event pins only when the recommendation record has verified coordinates.
- If coordinates are missing, keep the event in the right pane and include the Google Maps search link.
- Highlight a map pin when the matching event card is selected.
- Avoid geocoding or coordinate guessing inside the page.

Current PMAI-NYTW26 event records contain location labels, not verified lat/lon coordinates. Therefore the first version of recommendation HTML should rely primarily on the borough boundary map plus Google Maps search links.

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
- Data caveat: event locations are source labels unless future records include verified coordinates.

## Output Contract

Generate two sibling files:

- `recommendations.json`
- `recommendations.html`

The HTML may be standalone and self-contained except for loading local `data/maps/nyc-borough-boundaries.geojson`, or it may inline the map GeoJSON when a single-file artifact is required.

