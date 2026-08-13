---
name: Locked-items generation contract
description: How "Keep This Item" / Change This Item / closet styling seed pieces into generateLooks safely
---

The engine accepts `lockedItems?: OutfitPiece[]` — pieces seeded VERBATIM into their category slot (dress forces dress-branch; top/bottom force separates; locked dress deletes top/bottom locks). Palette is softly re-rolled toward locked colors.

**Rules (all enforced in generateLooks, do not weaken):**
- Catalog-backed locks still pass `itemMatchesGender` + `isBagAppropriateForGender`; non-catalog ids (closet items, `closet_` prefix, price 0) are user-owned and trusted.
- Every requested lock must be present in the final pieces or the candidate is dropped (lock-integrity check) — all 8 categories are seeded, including outerwear/jewelry/accessories in BOTH branches.
- A FINAL `total > cap → continue` gate runs BEFORE `markShown`, because locked pieces bypass pool affordability filters and an over-budget look must never poison dedup memory.

**Why:** architect review found locked pieces could smuggle over-budget/cross-gender items past pool-level filters; pool filters alone are not a hard gate once verbatim seeding exists.

**How to apply:** any new lock-driven flow (Change This Item in lib/remix.ts, closet seeds in lib/closetStyling.ts) should pass lockedItems and rely on these gates rather than pre-validating; `changeItem` additionally retries until the swapped piece satisfies the user's mode.
