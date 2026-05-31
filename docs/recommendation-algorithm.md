# PMAI-NYTW26 Recommendation Algorithm

This memo defines the recommendation method for turning a user's Tech Week interests into a ranked event list and an HTML results page.

## Internal Knowledge Takeaways

Internal knowledge search surfaced three useful patterns:

- **Cross-agent consensus filter:** for corpus-to-recommendation tasks, split a large corpus across agents, collect top nominations, keep items named by more than one judge where possible, then re-rank.
- **Reciprocal rank fusion / weighted score combination:** combine independent rankers instead of trusting one scoring pass. This is useful when lexical match, semantic match, and human-style judgement disagree.
- **Deliberate overlap for validation:** some overlap between evaluators helps catch false positives and missing context.

For this repo, the practical version is: broad search first, batch ranking second, ensemble reassembly third.

## Cache And Reuse

The recommender should persist generated state under:

```text
.cache/nytw26-event-recommender/
```

This cache is local working state and should not be committed to the public repo by default. It exists so repeated runs can reuse generated indexes and expensive ranking work.

Minimum cache structure:

```text
.cache/nytw26-event-recommender/
  manifest.json
  indexes/event-search-index.json
  profiles/<profile-id>.json
  current/
    run-manifest.json
    recommendations.json
  runs/<run-id>/
    run-manifest.json
    query.json
    candidates.json
    batches/
      batch-001-input.json
      batch-001-ranking.json
    ensemble.json
    recommendations.json
```

The viewable recommendation page is not part of the cache. It lives at repo root as `recommendation.html` and reads the cached `recommendations.json` output.

Reuse rules:

- Reuse the event search index when its `data_version` matches the current event files and recommender skill.
- Reuse a completed run when normalized query, hard filters, requested output size, data version, and active profile hash match.
- Reuse a batch ranking when the batch event IDs, scoring rubric version, data version, query, and profile hash match.
- Recompute candidate scoring, batches, and ensemble output when the preference profile changes.
- Record cache hits and misses in each `run-manifest.json`.
- Update `.cache/nytw26-event-recommender/current/` after each successful run so root `recommendation.html` can open the latest result.

## Recommendation Pipeline

### 1. Parse the request

Extract:

- Query text and stated interests.
- Role or persona, such as founder, engineer, student, investor, GTM, or AI infra builder.
- Required dates, time windows, neighborhoods, location constraints, and virtual/in-person preference.
- Hard exclusions, such as no breakfasts, no invite-only events, or no unavailable descriptions.
- Desired output size, defaulting to 10 final recommendations.
- Optional stored preference profile.

Write the normalized query to `runs/<run-id>/query.json`.

### 2. Build a preference profile

Use an explicit, inspectable JSON profile. Never hide preference assumptions.

```json
{
  "profile_id": "local-user-or-session-id",
  "updated_at": "2026-05-31T00:00:00Z",
  "positive_signals": {
    "tracks": ["AI + Infra", "Founders"],
    "keywords": ["agents", "infrastructure", "technical founders"],
    "hosts": ["IBM", "Stripe"],
    "neighborhoods": ["Flatiron", "SoHo"],
    "time_windows": ["morning", "evening"]
  },
  "negative_signals": {
    "keywords": ["wellness", "generic mixer"],
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

Preference updates should be additive and reversible:

- Saved/clicked events add weak positive signals from their tracks, host, keywords, time, and neighborhood.
- Dismissed events add weak negative signals.
- Explicit user statements override inferred behavior.
- Profiles should be local-first under `.cache/nytw26-event-recommender/profiles/`. Do not publish personal preference files to the public repo.

### 3. Build or reuse the event search index

Create `.cache/nytw26-event-recommender/indexes/event-search-index.json` from the event files. It should include normalized searchable fields, track labels, derived categories, keywords, date/time fields, and data-quality flags. Rebuild it when `data_version` changes.

### 4. Retrieve broad candidates

Retrieve about 100 candidates before any expensive judgement. If fewer than 100 match hard filters, use all eligible events.

Candidate retrieval should combine:

- Source-backed tracks: strong boosts.
- `inferred_categories`: medium boosts.
- Title, host, location, and keywords: lexical match.
- Description: semantic/context match, when available.
- Date/time/location filters: hard filters if the user made them hard constraints.
- Preference profile: boosts and penalties.

Recommended first-pass score:

```text
candidate_score =
  4.0 * source_track_match
+ 2.5 * title_host_keyword_match
+ 2.0 * inferred_category_match
+ 1.5 * description_match
+ 1.5 * preference_positive_match
- 2.0 * preference_negative_match
+ 0.5 * data_quality_bonus
+ 0.5 * schedule_fit
```

Keep the top ~100 by `candidate_score`. Preserve the score components for later explanation.

Write the candidate set and first-pass score components to `runs/<run-id>/candidates.json`.

### 5. Rank in batches of 10

Split candidates into batches of 10. Each batch judge returns:

- Local rank from 1 to 10.
- A 0-100 relevance score.
- Fit reasons grounded in event fields.
- Risks or caveats, such as missing description, weak location, invite-only status, or generic relevance.
- Suggested map pin priority.

Write every batch input and output to `runs/<run-id>/batches/`. Reuse prior matching batch rankings instead of reranking.

Each judge should evaluate the event against five axes:

| Axis | Weight | Notes |
| --- | ---: | --- |
| Query fit | 35 | Direct match to stated interests and role. |
| Preference fit | 20 | Stored preferences and explicit user history. |
| Event quality | 20 | Specificity, host relevance, description completeness, and source-backed track fit. |
| Schedule/location fit | 15 | Date, time, neighborhood, and geographic practicality. |
| Diversity value | 10 | Avoid ten near-duplicate mixers when a varied list is better. |

### 6. Ensemble and reassemble

Use two aggregation passes:

1. **Reciprocal rank fusion:** combine each batch's local ranking into a global score.
2. **Consensus / validation filter:** boost events that appear strong under multiple signals, such as high first-pass score plus high batch rank plus preference fit.

Recommended aggregation:

```text
rrf_score = sum(1 / (60 + rank_from_each_ranker))
final_score =
  0.40 * normalized_batch_relevance
+ 0.25 * normalized_candidate_score
+ 0.20 * preference_fit
+ 0.10 * data_quality
+ 0.05 * diversity_adjustment
+ rrf_score
```

Apply a final diversity pass:

- Cap exact same host at two events unless the user requested that host.
- Avoid consecutive recommendations with the same generic format unless the match is clearly strong.
- Preserve must-attend high-score events even if they reduce diversity.

Write fused results to `runs/<run-id>/ensemble.json`.

### 7. Produce ranked outputs

Return both machine-readable and human-readable output:

- `runs/<run-id>/recommendations.json`: ranked events with score components, reasons, caveats, map fields, and cache metadata.
- `.cache/nytw26-event-recommender/current/recommendations.json`: latest-run pointer for the root page template.
- `recommendation.html`: committed root template with a New York map on the left, ranked events on the right, Sumi-e light-theme event cards, event-location markers, and a top-picks/full-list toggle.
- Plain-text summary with the top recommendations and repo/source caveats.

Each recommendation should include:

- Rank and final score.
- Title, date, time, host, location, tracks, and event URL.
- Why it matches, grounded in source-backed fields and keywords.
- Caveats, especially unavailable descriptions or calendar fallback links.
- Google Maps search URL for the event location.

## Map And Location Handling

The page should show:

- A real interactive Leaflet map with CARTO/OpenStreetMap light tiles so users can pan, zoom, and orient events against recognizable geography.
- Event pins where latitude/longitude exists.
- For events without coordinates, use a clearly approximate NYC neighborhood/landmark center when the source location can be matched.
- Google Maps search links for exact venue navigation.

Do not replace the map with a static SVG or image. Static maps fail the recommendation UI because they cannot support zoom, pan, or event-location exploration.

Google Maps search URL format:

```text
https://www.google.com/maps/search/?api=1&query=<url-encoded event title + location + New York NY>
```

Do not present approximate pins as exact venue coordinates. If coordinates are absent, approximate pins are acceptable only as labeled neighborhood/landmark orientation markers.

## Failure Modes

- **Too few candidates:** relax soft filters, not hard filters, and say what changed.
- **No coordinates:** still rank the event; use a Google Maps search link instead of a pin.
- **Preference conflict:** explicit query wins over stored profile.
- **Missing descriptions:** do not discard; mark as lower data confidence.
- **Date drift:** if user asks outside 2026-06-01 through 2026-06-07, say the repo only covers the current indexed window.
