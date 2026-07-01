---
name: TV Inspiration completeness + strict dedup
description: How the TV-inspiration outfit flow relaxes the women's-bag rule and enforces zero duplicate items across the grid — and every place the flag must be threaded.
---

# TV Inspiration flow — completeness & no-duplicates contract

The TV Show Inspirations flow (active when the muse is a synthetic TV character,
`isTvMuseId(activeCeleb.id)` in `constants/tvShows.ts`) has TWO deviations from
the app's default styling contract. Both are gated on a `tvInspiration` boolean
that must be threaded end-to-end.

## Rule 1 — no required handbag in TV mode
Default contract: a women's look is only COMPLETE with a coordinating bag
(`isCompleteOutfit`). In TV mode the core alone is complete: dress+shoes or
top+bottom+shoes for women; men/unisex unchanged. A bag may still be added if
one is naturally selected, but it is never required and never drops a look.

## Rule 2 — zero duplicate catalog items across the whole grid ("any gender")
No catalog item id may repeat anywhere in the generated grid. This is STRICTER
than the default: normal dedup (`filterByUnique`, only active for Formal Remix
otherwise) relaxes to reusing item ids when the pool is exhausted. In TV mode it
must NOT relax — it returns empty and the look is dropped. Fewer looks is the
accepted, honest outcome (matches the app-wide empty-state philosophy).

## Why
The user explicitly asked for complete TV looks WITHOUT a bag requirement and
"no duplicates in any gender." The starvation fallbacks that make normal
generation resilient (reuse-an-item, fill-the-slot-from-full-pool) directly
violate the no-duplicates promise, so they must be suppressed in TV mode only.

## How to apply — the flag must reach EVERY completeness gate and EVERY dedup path
Miss any one and you reintroduce a bag-required rejection or a duplicate:
- `GenerateParams.tvInspiration` + `ResolveAIPlanParams.tvInspiration` carry it.
- `isCompleteOutfit(pieces, gender, { requireBag })` — pass `requireBag:!tvInspiration` at ALL call sites: main gate, brand-lock fallback, ultra-fallback, and the AI resolver (`generateLookFromAIPlan`).
- `generateLooks` local path: `enforceUniquePerLook = occasion==="Formal Remix" || tvInspiration`; `filterByUnique` returns empty (not `pool_`) when `tvInspiration`; `filterAux` (aux categories: outerwear/bag/accessories/jewelry) is strict-empty in TV, no `pool_` fallback.
- BOTH deterministic fallback builders (brand-lock `looks.length===0 && brandLock`, and ultra `looks.length===0 && !brandLock`) must clear a bagless women's core only when `!tvInspiration` AND gate with `{ requireBag:!tvInspiration }`. These are easy to miss — architect flagged them as the gap on first pass.
- AI batch path: `generateAILooks` creates ONE shared `usedAcross` Set only when `tvInspiration`, threaded into each `generateLookFromAIPlan`; the resolver seeds `usedIds` from it and commits piece ids only AFTER all gates pass (so a rejected/dropped look never poisons the pool for siblings).
- `style.tsx` computes `tvInspiration = !!activeCeleb && isTvMuseId(activeCeleb.id)` and threads it into both `generate()` (→ generateLooks) and `generateWithAI()` (→ resolveParams).

**Scope guard:** this is TV-only. The documented women's-bag-required contract
still holds for celebrity/budget/runway/brand-lock flows. Formal Remix keeps its
relaxed (reuse-on-starvation) dedup — only TV forces strict-empty.
