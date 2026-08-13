---
name: Feed gender sanitation
description: Load-time gender re-inference for imported Shopify feed items; blanket tags are untrustworthy.
---

The scraped Shopify feed blanket-tags items `genders:["men","women","unisex"]`, which defeats `itemMatchesGender` — never trust feed gender tags directly.

**Rule:** a load-time pass (lib/feedSanitize.ts, called by the outfit engine; regression check `pnpm run check:genders`) re-derives genders for `sf_` items: explicit "Unisex" marker → verified shared; Women's/WMNS/W's vs Men's/M's markers win; then women-garment keywords (lookahead so "dress shirt/pant" stays menswear) and known women's third-party lines; then single-gender brand defaults — applied ONLY when the row carries the exact three-value blanket tag. Any other authored gender set is preserved. Ambiguous blanket APPAREL is REMOVED from the catalog (never guessed, never unisex); only ambiguous non-apparel (sneakers/caps/bags/jewelry) collapses to `["unisex"]`.

**Dual-gender stores must NOT get a house default:** Kith (sells women's third-party lines), Nanushka, Alo Yoga, Alex Mill, Bandit Running.

Swimwear (`bikini|swim|trunks|one-piece|...`) is spliced out of the generation catalog entirely; locked-items handling rejects `sf_` ids missing from CATALOG (removed swim) instead of trusting them as closet items.

**Why:** a men's Norse Projects pant appeared in a women's look; a bikini top anchored an everyday look — both passed the gate "legitimately" because of blanket tags.

**How to apply:** on any feed refresh, keep the normalization pass; never hand-edit feed rows; re-check that brand defaults still match each store's assortment.
