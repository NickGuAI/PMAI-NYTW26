# Data

This directory will hold the New York Tech Week 2026 event data.

Target files:

- `events.jsonl`: one event record per line.
- `events.json`: pretty-printed event array.
- `events.schema.json`: field contract for each event record.
- `keyword-index.json`: map from event ID to searchable keywords and ranking hints.
- `ingestion-report.json`: source run summary.
- `description-failures.json`: events whose descriptions could not be recovered.

Coverage target:

- NYC events from 2026-06-01 through 2026-06-07.

Data preserves source URLs and fetch status so later users can audit stale or incomplete event records.
`event_url` is always populated: it uses the linked external event page when available and falls back to the Tech Week calendar URL when the source API does not expose an external page.
`location_source` records whether the location came from Tech Week, the linked event page, or could not be recovered.
