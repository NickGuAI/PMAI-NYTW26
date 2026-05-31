# Ingestion Notes

Last ingestion run: 2026-05-31T02:34:42.961Z

Source: https://www.tech-week.com/calendar/nyc

Coverage:

- City: New York City
- Date range: 2026-06-01 through 2026-06-07
- Tech Week events reported by API: 1605
- Events normalized in target range: 1602

Description fetch:

- Direct fetch descriptions: 1426
- Unavailable descriptions requiring fallback/review: 176
- Fallback file: `data/description-failures.json`

Track counts:

- AI + Infra: 47
- Hackathons: 31
- Fintech: 26
- Students: 20
- Engineers: 51
- Founders: 118
- GTM: 25
- Investors: 44

Source order used:

1. Tech Week NYC TRPC calendar endpoint behind https://www.tech-week.com/calendar/nyc
2. Linked event page from each event record.
3. Direct web fetch from each linked event page, primarily Partiful.
4. Any unresolved descriptions are recorded in `data/description-failures.json` for Tavily fallback or manual review.

Notes:

- Event URLs are the linked external event URLs exposed by the Tech Week calendar.
- Times are local New York event times and stored with timezone `America/New_York`.
- Track membership is based on Tech Week curated track filters.

Tavily fallback:

- Attempted after direct fetch for the 12 events that had an external URL but no direct description.
- Tavily extract failed with status 432 because the connected plan's usage limit is exceeded.
- Those 12 records are marked with `description_fallback_attempted: true`, `description_fallback_source: "tavily"`, and the fallback error.
- The 164 remaining unavailable descriptions had no external event URL exposed by the Tech Week calendar, so there was no linked page to fetch.
