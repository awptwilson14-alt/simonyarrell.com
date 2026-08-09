---
name: Fashion Remix structure (formal shoe + mandatory sneaker swap)
description: Hard structural rules for the Fashion Remix occasion (renamed from Formal Remix Aug 2026)
---

Occasion string is now **"Fashion Remix"** everywhere in mobile (global rename; old saved looks may still carry "Formal Remix" as a cosmetic tag). Generated API schema docstrings still say "Formal Remix" — free-text examples only, harmless.

Structure (user spec, Aug 2026 — INVERTED from the original design):
- The displayed outfit is a complete FORMAL look: garment whitelist (`isFormalRemixGarment`, per-gender) + primary shoe HARD-locked to dress footwear (loafer/oxford/derby/monk; `preferredShoeTypes` → `["dress"]`, pickShoe returns null rather than fall back). The sneaker is NEVER the primary shoe.
- Every look MUST also carry `sneakerAlt` — a clean/luxury sneaker swap (athletic names denied via `ATHLETIC_SNEAKER_RE`), color-matched, budget-headroom-capped, and re-gated through `isStyleCoherent` with the swap applied. Looks with no valid alternative are DROPPED, never shown incomplete.
- Dual dedup: the formal combination AND the swapped combination (non-shoe pieces + sneaker) each get their own fingerprint through the same global `isShown`/`markShown` registry (server `look_fingerprints` unique index). Neither version may ever repeat globally.
- Single-accent color invariant (`isFormalRemixColorCohesive`) still applies to the formal look; the coherence gate runs with `skipColor` for this occasion so the two color rules never double-apply.
- All three emission paths (main loop, brand-lock fallback, ultra-fallback) lock shoes to dress type AND flow through the final mandatory-alt block; `brandCoverage` availability check counts dress shoes.

**Why:** user mandate — remix = formal outfit + intentional sneaker swap option, not tailoring styled around a sneaker; running shoes under tailoring were explicitly banned.
**How to apply:** any new Fashion Remix path must ship formal primary shoe + validated sneakerAlt + both fingerprints, or drop the look.
