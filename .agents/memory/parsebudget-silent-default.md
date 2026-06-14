---
name: parseBudget silent default starves the resolver
description: Unrecognized budget tokens (e.g. "$$$") silently fall back to the $500–$1500 cap, which can make the outfit resolver return zero complete looks.
---

`parseBudget(budget)` in `artifacts/mobile/lib/outfitEngine.ts` only recognizes a
fixed set of budget strings ("Under $…", "$6000+", and a "min–max" numeric range).
ANY other string — notably the `"$$$"` tier shorthand — silently returns the
DEFAULT `{ min: 500, max: 1500 }`.

**Why this bites:** the resolver enforces budget as a HARD cap on the look TOTAL.
A "Real Luxury" / couture surface that passes an unrecognized budget token gets
capped at $1500 total. Women need 4 pieces (incl. a required luxury bag), so the
sum routinely exceeds $1500 → `generateLookFromAIPlan` returns `null` every
attempt → `generateAILooks` throws `AIStylistError("didn't match enough catalog
items")` → a red error in the UI. Confirmed via a standalone resolver repro: at
`"$$$"` Women/Unisex resolved 0/40; at `"$6000+"` they resolved 40/40.

**How to apply:** never invent a new budget token. When a surface wants "luxury",
pass `"$6000+"` (the couture tier parseBudget understands → cap 40000). If a new
budget shorthand is ever genuinely needed app-wide, add it to `parseBudget`
explicitly rather than relying on the silent default — the default fallback is a
trap, not a feature. The Runway engine (`app/runway.tsx`) hit exactly this.

**Related — Runway hero images:** runway looks intentionally replace the editorial
hero PNG (`getLookImage`, perceived as generic/AI/duplicate) with a REAL remote
product photo (`piece.imageUrl`), deduped across the batch, never `piece.localImage`
(that field is bundled AI artwork). This swap is scoped to runway only —
`generateLookFromAIPlan` still returns editorial heroes for the normal AI flow,
which wants them.

**Related — broken product images / "no product image" placeholders:** a piece can
HAVE a `productImageUrl` and still render the brand-monogram placeholder tile if
the URL is hotlink-blocked. Resale CDNs (jolicloset → HTTP 403, also 1stdibs /
ebayimg) are the offenders AND aren't the brand's own site. ALL Shopify-feed items
(`catalogFeed.ts`) use `cdn.shopify.com` — brand-direct PDP photos that hotlink
fine. Fix: `ResolveAIPlanParams.requireBrandDirectImage` (+ `hasReliableProductImage`
host whitelist in `outfitEngine.ts`) makes the resolver pick ONLY items whose image
is on a brand-direct host. It's a HARD constraint threaded through EVERY candidate
filter incl. the budget-relaxed fallbacks (never relaxed like budget). Runway passes
it `true`; verified the feed alone resolves 40/40 complete looks per gender at
`$6000+`. **Why brand-direct, not a per-URL liveness probe:** can't HEAD-check
thousands of items at runtime, and resale CDNs aren't "from their website" anyway.
To add a host, extend `BRAND_DIRECT_IMAGE_HOSTS` (exact/sub-domain match).
