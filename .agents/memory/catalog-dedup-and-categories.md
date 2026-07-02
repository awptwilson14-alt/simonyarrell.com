---
name: Catalog dedup must be product-level; feed categories need sanitation
description: Why outfit dedup fingerprints on product identity (not variant id) and why the generated Shopify feed's categories are re-inferred at load time
---

# Outfit dedup is PRODUCT-level, not variant-id-level

The auto-generated `catalogFeed.ts` carries one row PER COLOR/SIZE VARIANT, each
with a distinct `id` (e.g. "Pique Logo Standard Tee" has ids `...-1/-2/-3`).
Fingerprinting a look by exact piece `id` therefore let the SAME product set
resurface as a "new" combination whenever a different variant id was picked —
this is the root of the recurring "same outfit keeps regenerating" complaint,
even though the persistent shown-set (`shownLooks.ts`) was working.

**Rule:** dedup on `productKey(piece)` = `brand.toLowerCase() | name.toLowerCase()`
with a trailing `" - <colour>"` segment stripped, NOT on `piece.id`. All look
fingerprints in `outfitEngine.ts` (main gen, brand fallback, generic fallback,
AI-plan resolver) plus the AI batch dedup in `aiStylist.ts` must use it.

**Why the suffix strip is safe here:** analysis of the feed showed trailing
`" - X"` segments are ~overwhelmingly colours/colourways; cut/silhouette
suffixes ("- Wide Leg", "- Cropped") effectively don't occur, so stripping does
not over-collapse distinct silhouettes. If a future feed introduces cut suffixes,
revisit (add a colour-token allowlist before stripping).

**Migration note:** changing the fingerprint format invalidates old id-based
entries already in AsyncStorage (`shownLookFingerprints`). That's a one-time,
harmless dedup-memory reset — acceptable, not a bug.

# Generated feed mislabels garment categories — sanitize at LOAD, never edit rows

The Shopify feed's category inference mislabels slots (observed: ~54 tees/
hoodies/sweaters tagged `"bottom"`, jackets/blazers tagged `"bag"`), which put a
tee into the outfit's bottom slot. `catalogFeed.ts` is GENERATED — do not hand-
edit rows (they're lost on regen). Instead a load-time `reinferFeedCategory()`
pass in `outfitEngine.ts` re-infers the slot from the product NAME for feed
items only (`id` prefix `sf_`), categories `{top,bottom,outerwear,shoes,bag}`.

**Precedence that avoids false positives:** SHOE → BAG → DRESS/GOWN (skip, leave
as-is) → TOP → OUTER → BOTTOM. Strong top head-nouns (shirt/tee/hoodie/…) MUST
be matched BEFORE ambiguous cut/fabric words, else "Short-Sleeve Shirt" and
"Cargo Shirt" wrongly become bottoms and "Jersey Skort" (jersey=fabric) wrongly
becomes a top. Validate any change by simulating over the whole feed and eyeing
the from→to transitions before shipping (~140 rows change, all improvements).
