# Ingestion Notes

Event ingestion is pending.

Planned source order:

1. Tech Week NYC calendar: https://www.tech-week.com/calendar/nyc
2. Linked event page from each Tech Week event.
3. Direct web fetch for event descriptions.
4. Tavily fallback if direct fetch fails.

Each ingestion run should record:

- UTC run timestamp.
- Date range covered.
- Number of Tech Week calendar events found.
- Number of event descriptions fetched directly.
- Number of event descriptions recovered through Tavily fallback.
- Number of unavailable descriptions.
- Any skipped, duplicated, or malformed events.

