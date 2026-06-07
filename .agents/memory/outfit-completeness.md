---
name: Outfit completeness contract
description: Every generated outfit must be complete (no partial outfits); women require a bag — how it's enforced and the tradeoffs.
---

# Outfit completeness contract

**Rule:** No partial outfits ever reach the grid. `isCompleteOutfit(pieces, genderKey)` in `outfitEngine.ts` is the single gate, run as the FINAL check by every look-builder.
- Men / unisex: top + bottom + shoes (outerwear optional, bag recommended).
- Women: (dress OR top+bottom) + shoes + **bag REQUIRED** (handbag).

**Why:** Product owner spec ("Outfit Generation Rules") — every look must read as professionally styled and complete; women's looks must include a coordinating handbag. Previously the only check was `pieces.length < 2`, which let through top+shoes (no bottom), dress-only+bag, or any bagless women's look.

**How to apply / where it's enforced:**
- `generateLooks`: dress branch + separates branch both `continue` (drop the look) when no in-budget bag fits for women; men/unisex keep bag best-effort. Final `isCompleteOutfit` gate replaced `pieces.length < 2`.
- Brand-lock fallback + ultra-fallback: only assemble a complete core (dress|top+bottom)+shoes, add the required bag for women, gated by `isCompleteOutfit`. Removed the old partial 2-piece combos (top+shoe, bottom+shoe, outer+bottom).
- `generateLookFromAIPlan`: after resolving AI slots, a backfill (`ensureCategory`) pulls any MISSING required category from `CATALOG` (HARD gender+season respected, prefers in-budget on-style, dedups by id), then the same `isCompleteOutfit` gate. So an under-specified AI plan still yields a complete look or `null`.
- Server `stylist.ts`: prompt instructs complete outfits per gender; `slots` schema `minItems` raised 2→3. Belt-and-suspenders — the client backfill is the real guarantee.

**Composes WITH the budget hard-cap, doesn't fight it:** a required bag that can't fit budget drops the look (honest empty-state), never shows a partial OR over-budget outfit. The final total-budget filter still runs after backfill.

**Accepted tradeoff:** requiring a women's bag means a thinly-stocked brand-lock with NO bag in catalog now yields zero women's looks — intended honest empty-state, consistent with the budget-hard-cap philosophy. This is in tension with the "show looks for sparse brand-locks" safety net; completeness wins because it's the explicit spec. Do NOT reintroduce partial-outfit fallbacks to "fill the grid."

## Men's bag silhouette whitelist (no totes for men)

**Rule:** a men's look may only carry a backpack / crossbody (sling, messenger) / briefcase / duffel (holdall, weekender). Totes — and market/shopper/pouch bags — are excluded from MEN's looks. Women & unisex unaffected. Bags stay OPTIONAL for men.

**Why:** product owner styling spec — a tote reads as a women's/utility carry and looks wrong on a men's outfit. Catalog tags everything just `category:"bag"`, so the only signal for bag silhouette is the item NAME.

**How to apply:** `isBagAppropriateForGender(item, genderKey)` in `outfitEngine.ts` — non-bag categories and non-men genders pass through; for men it DENYs `/tote|market bag|shopper/` first (so "crossbody tote" correctly denies) then requires an ALLOW-list name match. Because catalog bags are name-only, this is intentionally a NAME regex, not a structured type field. Applied at EVERY men's bag path: `generateLooks` separates-branch extras pool, `generateLookFromAIPlan` `slotPool` (both budget passes), and `ensureCategory` backfill. Men's deterministic fallbacks (brand-lock + ultra) never add a bag, so they need no filter. Over-filtering is safe: bags are optional for men, so the look just ends bagless-but-complete (never partial). Server `stylist.ts` SYSTEM_PROMPT mirrors the rule as belt-and-suspenders, but the client resolver is the real guarantee.
