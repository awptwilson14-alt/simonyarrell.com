---
name: Whole-look style coherence gate
description: Mandatory formality/pattern/palette coherence rules for every generated outfit
---

Every generation path (rule-based main loop, both deterministic fallbacks, AI resolver, and the sneaker-alternative candidate filter) must pass the `isStyleCoherent` gate from `lib/outfitCoherence.ts` BEFORE `markShown` (a rejected combo must never be burned into the no-repeat registry).

Rules enforced:
- **Formality**: keyword-marked garments (tuxedo/suit=formal/business … rugby/hoodie=streetwear, jogger/track=athletic) must sit within a span of 2 levels; unmarked items (plain tee, polo, loafer) are versatile and pin nothing. Bags/jewelry/accessories exempt.
- **Pattern**: max ONE loud-patterned garment per look; bags/accessories exempt.
- **Palette**: neutrals unlimited (navy/brown/olive count as neutrals here), ≤2 accent color families. Formal Remix skips this looser rule — it keeps its stricter single-accent `isFormalRemixColorCohesive` invariant; the two must never both apply.

**Why:** user mandate (Aug 2026) after a BODE suit jacket + NOAH rugby shirt look; explicitly forbade brand hard-coding — the fix must be catalog-wide inference.

**How to apply:** any new generation path or post-processing that adds/swaps a piece must rerun the gate on the resulting whole look. User override (rule 11): only explicit cross-style prompts (narrow regex in `lib/aiStylist.ts`, `wantsMixedStyles`) set `allowMixedStyles` — generic words like "mix"/"contrast" must NOT disable the gate.
