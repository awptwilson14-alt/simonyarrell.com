---
name: TV-inspiration look constraints
description: The hard rules every TV-inspiration generated outfit must satisfy, and the non-obvious dedup-commit trap in the AI path.
---

TV-inspiration outfit generation (`generateLooks` rule-based + `generateLookFromAIPlan` AI, both in `outfitEngine.ts`, flagged by `tvInspiration`) must guarantee, per user spec:

1. **One item per category** — never two tops / bottoms / shoes / outerwear. A jacket AND a coat are BOTH `outerwear`, so only one outerwear piece may land. Enforced by fixed slots (rule-based) + `usedCategories` (AI) and a defensive `hasDuplicateCategory()` drop guard in both paths.
2. **Season coherence within a look** — every clothing/outerwear/shoe piece must share ≥1 common season (never a wool/winter piece with a linen/summer piece). When a specific season is selected the pool filter already pins it; the extra check only bites in "All Season" mode. Rule-based: `isSeasonCoherent()` post-assembly drop+retry. AI: running intersection `lookSeasons` via `seasonCoherentOk`/`noteSeasons`. Season-neutral items (accessories/bag/jewelry → EVERY_SEASON) never shrink the window.
3. **No duplicate ARTICLE across the grid** — dedup by `productKey(item)` (normalized brand|name, variant suffix stripped), NOT just `item.id`. Same id ⇒ same productKey, so productKey dedup is strictly stronger and also blocks a color/variant row of the same garment appearing as "a different image of the same article" in a sibling look. Wired into `filterByUnique`+`filterAux` (rule-based) and `articleUsed()` on the slot-loop + `ensureCategory` pools (AI). The shared cross-look set (`usedAcross` from `generateAILooks`) now carries productKeys.

**Why season-neutral matters:** `inferItemSeasons` returns EVERY_SEASON for accessories/bag/jewelry (and for no-signal items), so intersecting over all pieces lets those pass without starving pools.

**The dedup-commit trap (AI path):** cross-look article keys must be committed to the shared `usedAcross` set ONLY at the very end, after the look passes EVERY gate (completeness, budget, isShown). `addResolved` records into a LOCAL `usedArticles` seed (`new Set(usedAcross ?? [])`), never the shared set directly. If you let selection-time recording mutate the shared set, a look that gets assembled then dropped (returns null) poisons the batch and wrongly blocks future looks. This mirrors the original id-based design's end-of-function commit.

**How to apply:** any new constraint on TV looks goes in BOTH paths, gated on `tvInspiration`, and any cross-look reservation commits post-gate. Non-TV flows and Formal Remix must stay unchanged (all new checks are `tvInspiration`-gated).
