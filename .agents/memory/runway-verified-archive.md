---
name: Runway verified-archive honesty rule
description: Original runway looks must come only from verified data; AI output is always a labeled recreation
---

The Runway surface has two strictly separated concepts:
1. **Original Runway Looks** — sourced ONLY from `lib/runwayArchive.ts` (`VERIFIED_RUNWAY_LOOKS`). The archive ships EMPTY and must never be populated programmatically, scraped, or inferred: every entry needs a real (licensed/permitted) runway photograph and a `source` naming the verified documentation. There is no public/licensable runway-data API (Vogue Runway etc. are not feeds). While empty/filtered-out, the UI shows the exact message "Verified runway looks are not currently available for this collection." House selection filters strictly — no fallback, no cross-brand results.
2. **Recreations** — the AI stylist flow, always labeled "Recreate a Runway Aesthetic" / "Your Recreations… not original runway looks". No generated look may ever be presented as an original runway look, look number, collection, or designer attribution.

**Why:** user spec (Aug 2026) — never invent runway look numbers, collections, seasons, garments, images, or attribution; honest empty state over fake looks.
**How to apply:** any feature touching runway content must route "original" claims through the archive and keep generated output visibly labeled as a recreation. Unlike AI looks, authentic runway looks are never permanently hidden by dedup — only rotated in discovery feeds.
