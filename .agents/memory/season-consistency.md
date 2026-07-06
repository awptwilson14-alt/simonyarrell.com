---
name: Mandatory season consistency
description: Every generated outfit must be one season — no summer+winter mixing — enforced on all builders.
---

Every generated look MUST be seasonally consistent: a clearly-SUMMER piece (shorts, tank, sandals, flip-flops, linen shorts) must never share a look with a clearly-WINTER piece (sweater, hoodie, wool coat, parka, puffer, scarf, gloves, beanie, boots, heavy knit). Enforced on ALL occasions/flows, not only when a season is pinned. A violating look is dropped and the tiered retry loop assembles a clean one ("regenerate the outfit").

**The gate:** `isSeasonallyConsistent(pieces)` = `isSeasonCoherent(pieces)` (season-tag intersection) AND `!hasSeasonConflict(pieces)` (name-based summer/winter conflict). It is wired into every look-builder that can reach the grid: the main rule-based loop, BOTH fallback builders, AND the AI resolver `generateLookFromAIPlan`. Any NEW look-builder MUST call it too.

**Why the name-based `hasSeasonConflict` is separate from `isSeasonCoherent`:** `inferItemSeasons` returns EVERY_SEASON for accessories/bag/jewelry (season-neutral), so scarf/gloves/beanie do NOT shrink the coherence window — "tank top + scarf" would slip through `isSeasonCoherent` alone. `hasSeasonConflict` classifies by NAME regardless of category (`STRONG_SUMMER_RE` / `STRONG_WINTER_RE` → `nameSeasonBucket`), so accessory-driven violations are caught.

**How to apply / edge cases:**
- Neutral items (t-shirts, jeans, sneakers, loafers, blazers) intentionally stay flexible (bucket `null`) and pair with anything — the rule only bites on genuine summer↔winter conflicts. Do NOT hard-tag hoodie/boot as winter-only inside `inferItemSeasons`; that would strip them from spring/fall pools. Keep the surgical name-conflict approach instead.
- A name matching BOTH regexes → treated as neutral (trust neither signal) to avoid false conflicts.
- Regex boundaries chosen to avoid false positives: `\bboots?\b` skips "bootcut"; `\bslides?\b` skips "slider".
- Gating the ultra-fallback (last-resort) builder can yield fewer/zero looks in a thin catalog — that honest empty-state is acceptable and preferred over shipping a season-inconsistent outfit.
- Server `stylist.ts` SYSTEM_PROMPT mirrors the rule (forbids mixing even with no season selected); the client resolver gate is the hard guarantee.
