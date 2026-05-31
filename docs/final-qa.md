# Final QA - PMAI-NYTW26

Run date: 2026-05-31

## Deliverables

| Item | Status | Link |
| --- | --- | --- |
| Public GitHub repo | Done | https://github.com/NickGuAI/PMAI-NYTW26 |
| README | Done | https://github.com/NickGuAI/PMAI-NYTW26/blob/main/README.md |
| Event JSONL | Done | https://github.com/NickGuAI/PMAI-NYTW26/blob/main/data/events.jsonl |
| Event JSON | Done | https://github.com/NickGuAI/PMAI-NYTW26/blob/main/data/events.json |
| Keyword index | Done | https://github.com/NickGuAI/PMAI-NYTW26/blob/main/data/keyword-index.json |
| Query skill | Done | https://github.com/NickGuAI/PMAI-NYTW26/blob/main/skills/nytw26-event-query/SKILL.md |
| Ingestion notes | Done | https://github.com/NickGuAI/PMAI-NYTW26/blob/main/docs/ingestion-notes.md |
| Newsletter markdown draft | Done | https://github.com/NickGuAI/PMAI-NYTW26/blob/main/docs/newsletter-june-1-draft.md |
| Newsletter visual HTML | Done | https://github.com/NickGuAI/PMAI-NYTW26/blob/main/docs/newsletter-june-1.html |

## Verification Summary

- Repo visibility: public.
- Default branch: `main`.
- Event count: 1,602.
- Date range: 2026-06-01 through 2026-06-07.
- Source: https://www.tech-week.com/calendar/nyc.
- Required field completeness: zero missing `title`, `event_url`, `host`, `location`, `tracks`, or `keywords`.
- Keyword index count: 1,602 events.
- Newsletter HTML size: 7,920 bytes, self-contained, no scripts, no images, no external CSS.

## Data Notes

- Tech Week API reported 1,605 NYC events; 1,602 were inside the requested June 1-7 date window.
- 1,426 event descriptions were fetched directly from linked event pages.
- 176 descriptions remain unavailable and are recorded in `data/description-failures.json`.
- 164 events did not expose an external event URL in the Tech Week API. For those, `event_url` falls back to a Tech Week calendar URL and `external_url` remains `null`.
- Four events did not expose location in the Tech Week API. Linked-page fallback recovered a usable location status/value for all four.
- Tavily fallback was attempted for 12 URL-level direct-fetch failures, but the connected Tavily account returned usage-limit status 432. The failure is recorded in `data/ingestion-report.json` and the affected records.

## Drift Detection

Original scope:

- Public GitHub repo named `PMAI-NYTW26`.
- Index NYC Tech Week events from June 1 through June 7.
- Include event link, time, title, host, location, track, and description where obtainable.
- Fetch descriptions from linked event pages first, especially Partiful; use Tavily fallback if direct fetch fails.
- Preserve Tech Week tracks and add per-event keywords.
- Add a query skill/instructions so users can ask an agent for events by interest.
- Draft the June 1 PMAI newsletter around the index.

Result:

- No scope drift requiring correction found.
- Source limitation: Tavily fallback could not recover the 12 direct-fetch failures because the connected Tavily account was over plan limit. This is an external blocker, not a silent omission.
- Source limitation: events without `externalHref` cannot be fetched from Partiful or another linked event page because the Tech Week API does not expose one. These records are retained, marked, and given calendar fallback URLs.
- Data-contract correction made during QA: `event_url` and `location` are now always populated, with `event_url_kind`, `external_url`, `source_event_url`, and `location_source` preserving provenance.

Future continuation:

- If Tavily quota is restored, rerun fallback for records in `data/description-failures.json` where `description_fetch_error` is not `Missing external URL`.
- If Tech Week adds external links later, rerun `scripts/ingest-techweek.mjs` and then `scripts/build-keyword-index.mjs`.
- Keep `tracks` treated as source-backed and `keywords` / `inferred_categories` treated as derived search aids.

