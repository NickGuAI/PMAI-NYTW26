# Map Data

This directory stores lightweight public map data for PMAI-NYTW26 recommendation pages.

## Included Layer

| File | Purpose | Source |
| --- | --- | --- |
| `nyc-borough-boundaries.geojson` | Left-pane orientation map for ranked recommendation pages | NYC Open Data / NYC Department of City Planning Borough Boundaries |

The GeoJSON contains five borough boundary features with these properties:

- `borocode`
- `boroname`
- `shape_area`
- `shape_leng`

## Source And Provenance

- NYC Planning Borough Boundaries page: https://www.nyc.gov/content/planning/pages/resources/datasets/borough-boundaries
- NYC Open Data GeoJSON endpoint used: `https://data.cityofnewyork.us/resource/gthc-hcne.geojson?$limit=5000`
- Data provider: NYC Department of City Planning.
- Intended use in this repo: visual orientation only, not official geocoding or boundary adjudication.

NYC Planning's Borough Boundaries dataset is updated quarterly. The source page lists release information and access links for REST, GeoJSON, metadata, and download files.

## Why Not Store Full Digital City Map Here

Nick requested a New York map view and referenced the Digital City Map. The full DCM data represents official street-map features and is much heavier than this repo needs for event recommendations. It also changes often. For this public event-index repo:

- Store a small official borough boundary GeoJSON for the left-side map.
- Link to the DCM as source material for future engineering work.
- Do not mirror large DCM shapefiles or geodatabases into the repo unless there is a specific map-analysis requirement.

Digital City Map reference:

- NYC Planning DCM page: https://www.nyc.gov/content/planning/pages/resources/datasets/digital-city-map
- NYC Open Data DCM page: https://data.cityofnewyork.us/City-Government/Digital-City-Map-Shapefile/m2vu-mgzw

## Recommendation Page Use

The recommendation page should load `nyc-borough-boundaries.geojson` as a background/orientation layer. Event locations in the current PMAI-NYTW26 dataset are text labels, not verified coordinates, so the page should:

- Show borough boundaries.
- Show exact pins only if a future event record includes verified latitude/longitude.
- Otherwise link each event to a Google Maps search URL.

