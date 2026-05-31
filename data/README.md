# Data

This directory will hold the New York Tech Week 2026 event data.

Target files:

- `events.jsonl`: one event record per line.
- `events.schema.json`: field contract for each event record.
- `keyword-index.json`: map from event ID to searchable keywords and ranking hints.

Coverage target:

- NYC events from 2026-06-01 through 2026-06-07.

Data should preserve source URLs and fetch status so later users can audit stale or incomplete event records.

