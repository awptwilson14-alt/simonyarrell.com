---
name: Item variety rotation
description: Soft cross-batch/within-batch article rotation in the outfit engine so generations draw from the whole catalog, not the same few items
---

# Item variety rotation (outfit engine)

**Rule:** Item selection in every generation path must be rotation-aware: a session-scoped FIFO of recently used articles (productKeys, soft) plus a within-batch used set steer pickers toward pieces not seen lately. Rotation is a SOFT preference only — when filtering would leave a pool below a minimum, the full gated pool is used, so completeness/budget/gender/season/coherence gates always outrank variety.

**Why:** Owner complaint (Aug 2026): "the same items are generating" — whole-look fingerprint dedup allowed the same individual items to headline look after look, and several deterministic fallbacks (ranked[0], .find() firsts, AI top-3 sampling) funneled a 3,000+ item / 22-store catalog through a handful of pieces.

**How to apply:**
- Never reintroduce deterministic first-candidate selection (`ranked[0]`, `.find()`, always-first-after-sort) in any look builder or backfill — pick randomly among a fresh top slice instead.
- AI slot ranking samples a wide top slice with rank-weighted randomness, not a tiny fixed top-N.
- Rotation memory is fed only by looks that PASSED every gate (return sites), plus a within-batch set committed per accepted look; dropped looks must not poison it.
- The hard TV/Remix per-item dedup sets are separate and stay HARD; rotation must remain soft and must never substitute for them.
