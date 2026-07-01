---
name: Gender filtering surfaces
description: Where gender is (and isn't) enforced so men's items don't leak into a Women profile
---

"Men's clothes when Women selected" almost always means the **generated** (Style/AI) flow. That flow is gender-safe: every catalog pool AND the AI-plan resolver route through the strict `itemMatchesGender` predicate in `outfitEngine.ts`, and static lists use `filterLooksForProfile`. Catalog DATA gender tags (`genders: [...]`) are correct. If a user still reports the leak after a code fix, suspect a **stale bundle / old published build**, not the engine — restart the Expo workflow and/or re-publish before re-debugging.

**Data gap:** the `Product` type behind the **Shop tab** (`constants/data.ts`, `PRODUCTS`) has NO gender field at all. The Shop grid therefore cannot be truthfully gender-filtered without first adding `genders` to the Product model + data. Do not fake it. This is separate from the generation flow the user usually means by "generated."

**Why:** repeated "still not fixed" reports on gender were driven by build staleness + conflating Shop-browse with generated looks, not by an engine defect.
