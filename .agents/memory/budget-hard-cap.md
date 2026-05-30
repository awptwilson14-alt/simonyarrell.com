---
name: Budget is a hard cap on the look TOTAL
description: On the budget page, the SUM of all pieces in any displayed look must never exceed the selected budget — not just each piece individually.
---

# Budget is a hard cap on the look TOTAL

**Rule:** Every look displayed on the budget page (`app/(tabs)/style.tsx`) must have `estimatedPrice <= budgetMax`, where `budgetMax` is the top of the user's selected budget range (`parseBudget` in `outfitEngine.ts`). This applies to the SUM of all pieces, not just per-item price.

**Why:** Budget filtering was originally per-item only (`item.price <= budgetMax`), so a look's pieces could each fit but their total blow past the budget. The user explicitly requires the total of a displayed look to stay within the selected amount. Budget is now a HARD product rule alongside gender — relax occasion/style to fill the grid, never the budget.

**How to apply:**
- Both look-builders enforce it: `generateLooks` (filters its final array; all passes keep `useBudget:true`) and `generateLookFromAIPlan` (returns `null` when `total > budgetMax`). The AI resolver matters because AI looks render on the SAME budget page.
- Do NOT reintroduce a `useBudget:false` pass to "always fill `count`" — that was the original bug. Showing fewer (or zero) looks for a too-tight budget is the intended, acceptable empty state.
- `budgetMax === 0` means "no budget selected" → no cap (keep the guard).
- A too-tight budget legitimately yields zero looks, so `style.tsx` needs an over-budget empty state for BOTH the brand-lock and the generic (no-brand) cases — otherwise the results grid renders blank.
