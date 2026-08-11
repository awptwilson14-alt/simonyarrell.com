---
name: Generated item photos
description: Every look piece must show a photo — AI-generated product shots fill catalog image gaps via a cached server endpoint
---

# Generated item photos

**Rule:** Every piece in every look must render a product photo. When a catalog item has no usable image (no localImage/imageUrl, or a denylisted URL), the client loads a server-side AI-generated studio product shot; the brand-monogram tile is only a loading state / last-resort fallback, never the intended presentation.

**Why:** Owner request (Aug 2026, screenshot of look details showing "DG"/"V" monogram tiles): "Every combination has to generate a photo of the item."

**How to apply:**
- One photo per unique item (normalized brand|name|color key), generated once and cached forever server-side — new combinations reusing a piece must reuse its photo, never regenerate.
- Client and any zoom/lightbox must resolve the SAME effective image (real → generated → fallback) via the shared resolver in the resilient-image component; don't hand-roll the fallback chain per screen.
- Generation is a paid call: cache misses are per-IP rate-limited and globally concurrency-capped; over-limit or failed generation returns 404 so the client degrades to the monogram silently.
- Prompt style: single item, dark charcoal studio background, gold rim light, no person/text/watermark — matches the app's luxury dark-gold visual language.
- Known accepted tradeoff: images stored as base64 rows in Postgres (~1MB each). Fine for a finite catalog; move to object storage if the catalog becomes unbounded.
