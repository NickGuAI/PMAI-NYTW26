# Recommender Final QA And Drift Detection

Run date: 2026-05-31

## Deliverables

| Item | Status | Link |
| --- | --- | --- |
| Recommendation algorithm memo | Done | https://github.com/NickGuAI/PMAI-NYTW26/blob/main/docs/recommendation-algorithm.md |
| Recommender skill | Done | https://github.com/NickGuAI/PMAI-NYTW26/blob/main/skills/nytw26-event-recommender/SKILL.md |
| NYC map data directory | Done | https://github.com/NickGuAI/PMAI-NYTW26/tree/main/data/maps |
| NYC borough boundary GeoJSON | Done | https://github.com/NickGuAI/PMAI-NYTW26/blob/main/data/maps/nyc-borough-boundaries.geojson |
| Map source manifest | Done | https://github.com/NickGuAI/PMAI-NYTW26/blob/main/data/maps/source-manifest.json |
| Recommendation page spec | Done | https://github.com/NickGuAI/PMAI-NYTW26/blob/main/docs/recommendation-page-spec.md |
| Root recommendation template | Done | https://github.com/NickGuAI/PMAI-NYTW26/blob/main/recommendation.html |

## Verification

- Repo visibility: public.
- Event index still validates at 1,602 events.
- NYC map GeoJSON validates as a `FeatureCollection`.
- Map feature count: 5 boroughs.
- Borough names present: Bronx, Brooklyn, Manhattan, Queens, Staten Island.
- Recommender skill includes:
  - Broad retrieval to roughly 100 candidates.
  - 10-event batch ranking.
  - Subagent use when available.
  - Ensemble reassembly.
  - Explicit preference profile handling.
  - Ranked JSON output.
  - Root map-left/events-right HTML template.
  - `.cache` run-data reuse contract with a latest-run `current/` pointer.
  - Google Maps search links.
  - Date drift detection.
- Page spec includes:
  - Desktop map-left/events-right layout.
  - Mobile stacked layout.
  - Map data input.
  - No coordinate guessing.
  - Google Maps link behavior.
  - Top-picks and full-ranked-list views.

## Source Notes

- Map layer stored in repo: NYC Borough Boundaries from NYC Department of City Planning via NYC Open Data.
- DCM referenced but not mirrored: full Digital City Map data is heavier street-map data and changes often, so it is linked as source material rather than copied into this event-index repo.
- Current event data has location labels, not verified latitude/longitude. The recommendation page uses exact run coordinates when available and otherwise uses approximate NYC neighborhood/landmark markers plus Google Maps links.

## Drift Detection

Original request:

- Use `write-new-skill` to write a skill.
- Given a user query/interests, perform general search first to narrow to about 100 candidates.
- Send subagents to rank candidates in batches of 10.
- Use an ensemble to reassemble final recommendations.
- Produce a ranked result HTML page.
- Improve recommendation quality with a good algorithm.
- Store user preferences and provide customized recommendations.
- Use a New York map on the left and recommended events on the right.
- Put map data on GitHub.
- Optionally link event locations to Google Maps search.

Result:

- No correction-required drift found.
- Intentional scope decision: stored lightweight official NYC borough boundaries in GitHub rather than mirroring full DCM shapefiles/geodatabases. This satisfies the map-backed page need while avoiding large, frequently changing source-map dumps.
- Implementation boundary: this package writes the recommender skill and output/page contract. It does not implement a production web app or real-time geocoder.
- Privacy boundary: preference profiles are specified but not committed with personal data. The skill requires explicit confirmation before writing user preference data into the public repo.
- Output boundary: final viewable `recommendation.html` stays at repo root; `.cache` stores reusable run JSON and ranking traces.

Future continuation:

- Add verified event coordinates if a trusted geocoder/source is selected.
- Create a sample `.cache/nytw26-event-recommender/current/recommendations.json` for a specific user query after the user provides interests.
- If production UI is needed, hand off to engineering rather than expanding this ops/data repo into an app.
