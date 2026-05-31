# PMAI Newsletter Draft - June 1, 2026

Subject: NYC Tech Week, searchable by agent

Preview text: PMAI indexed 1,602 NYC Tech Week events so you can ask an agent what to attend by role, interest, date, and location.

## Draft

NYC Tech Week starts today, and the calendar is too large to browse manually.

Pioneering Minds AI built a public, agent-readable index of the June 1-7 NYC Tech Week calendar: 1,602 events with event links, times, hosts, locations, Tech Week tracks, descriptions where available, and per-event keywords.

Repo: https://github.com/NickGuAI/PMAI-NYTW26

Use it like this:

- Ask your agent: "Find AI infrastructure events for technical founders from June 1 to June 3."
- Ask your agent: "What should a student attend if they want hackathons and recruiting?"
- Ask your agent: "Show investor-facing fintech events with links and locations."
- Ask your agent: "Build me a June 4 evening plan near downtown Manhattan."

The index preserves Tech Week's source-backed tracks:

| Track | Source-backed events |
| --- | ---: |
| AI + Infra | 47 |
| Hackathons | 31 |
| Fintech | 26 |
| Students | 20 |
| Engineers | 51 |
| Founders | 118 |
| GTM | 25 |
| Investors | 44 |

Representative starting points:

- AI + Infra: Women Shaping the Future of AI, Generative Computing Masterclass, Beyond the Spec Masterclass.
- Hackathons: Proof of Concept Fest, ATTAP Vibeathon & Agentathon, Agentic Voice Hackathon.
- Fintech: The Builder's Table, AI Agents in Finance, Fintech CFO Office Hours.
- Students: The Next Gen of Latino Founders, Build for Humans Hackathon, Anti Career Fair.
- Engineers: Vonage AI Voice/API Lunch & Learn, Live Iron (AI) Chef Vibe-Coding, Beyond the Spec Masterclass.
- Founders: Mercury Vinyl House, How to Raise a Series A, Investment to Acquisition II.
- GTM: Future of Search: AI SEO/AEO Panel, IRL Hypergrowth in the Age of AI, Slack x Amplitude: AI at Work.
- Investors: ERA/RV Agentic AI Demo Showcase, Rebuilding American Manufacturing, Stripe x a16z Supper Club.

Data quality notes:

- The Tech Week API reported 1,605 NYC events; the PMAI index includes 1,602 events dated June 1-7, 2026.
- 1,426 descriptions were fetched directly from linked event pages.
- 176 descriptions remain unavailable, mostly because the source API did not expose an external event page. The repo records those gaps instead of silently dropping events.
- 164 events have no external event page, so the index falls back to a Tech Week calendar URL.

If you are attending Tech Week, use the repo as a planning layer. Search by track, role, neighborhood, day, or keywords, then open the event link from the result.

PMAI will keep using this kind of public, agent-ready infrastructure to make dense community moments easier to navigate.

