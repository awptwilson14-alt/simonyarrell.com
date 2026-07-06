---
name: Formal Remix rules (garment whitelist, color cohesion, sneaker alt)
description: How Formal Remix restricts garments to formalwear, enforces one cohesive color scheme, and the additive sneaker-alternative scope/budget/ranking.
---

## Formal Remix = formalwear-only + one cohesive color scheme

**Formalwear-only garment whitelist.** Catalog items have no garment-subtype field, so `isFormalRemixGarment(item, genderKey)` gates by NAME regex, per gender. It only gates clothing categories (top/bottom/dress/outerwear); shoes/bags/jewelry/accessories return true (pass through). MEN allow: suits, tuxedos, sport(s) jackets/blazers, trench/overcoats/pea/dress/top coats, button-up & dress shirts, dress/tailored trousers, sweaters/knit/cashmere/turtleneck/cardigan. WOMEN allow: pant(s) suits, gowns (ball/evening), dresses, skirts, tailored trousers, blouses/shirts, suit jackets/blazers. Shared DENY regex kills casualwear (tee, hoodie, denim, jeans, cargo, jogger, polo, shorts, bomber, puffer, parka, etc.) even if an allow term also matched. **Why HARD, not soft:** the whole point is only-formalwear; a thin pool → fewer looks (honest empty-state) is acceptable. Catalog supply is ample (~1000+ formal terms/gender), so no real starvation.
- **Applied on EVERY branch:** main `pool()` (`let base` filtered when `occasion === "Formal Remix"`), brand-lock fallback (`brandPoolFR`), ultra fallback (`gPoolFR`). Fallbacks also keep sneaker-only shoe selection.

**One cohesive color scheme per look.** A look may carry at most ONE non-neutral accent color family + unlimited neutrals (reads tonal/monochrome). Two mechanisms: (1) SOFT `narrow` in `stylePick` (runs even though Formal Remix is `editorial`) biases each pick toward the placed accent family or neutrals; (2) HARD `isFormalRemixColorCohesive(pieces)` drop-and-retry gate on ALL branches — main loop (`continue`), both fallbacks (guard on the push). The hard gate is what actually GUARANTEES cohesion; the soft narrow only biases and reverts when its filter empties. Neutrals detected via `NEUTRAL_COLOR_RE`; accents must all fuzzy-match (substring either direction) the first accent.
- **Why both layers:** a prior review flagged that the soft narrow alone + palette-biased fallback colors (`pickPaletteColor`) could still ship a clashing look. The hard invariant closes that on the fallback + thin-pool paths.

**Sneaker pairing (pre-existing, keep):** `preferredShoeTypes("Formal Remix") = ["sneakers"]`; `coherentShoeTypes` bypasses for Formal Remix; `pickShoe` returns null (drops look) if no sneaker; fallbacks pick sneaker-only. Dedup pre-existing (fingerprints + per-batch unique ids).

## Sneaker alternative (additive)

Every Formal Remix look carries an OPTIONAL `sneakerAlt` (a colour + budget-matched sneaker the user can swap in for the look's existing shoe). Lives on the `Look` type; attached only in `generateLooks` (rule-based) under `occasion === "Formal Remix"`, in a post-loop right before the final `shuffle(withinBudget)` return.

**Additive, never structural.** `sneakerAlt` is NOT part of `look.pieces` and NOT added to `estimatedPrice`. It is a suggestion only. Do not fold it into totals or completeness gates.

**Budget invariant = SWAP headroom, not full budget.** The alt replaces the shoe, so `headroom = budgetMax - (sum of NON-shoe pieces)`; candidate `price <= headroom`. This guarantees `nonShoeTotal + altPrice <= budgetMax` — the swapped look stays within the same budget. Never use full-budget or per-item caps here.

**Why prestige+price ranking:** score = `price + sneakerPrestige*500` (prestige = +2 high-end brand substring match, +3 limited-edition name regex). Satisfies BOTH product rules at once — "higher budget ⇒ more expensive" (bigger headroom lets pricier pairs in and priciest wins) AND "include high-end/limited edition" (fixed bonus surfaces them whenever affordable).

**How to apply / gotchas:**
- Scope is rule-based Formal Remix ONLY. The AI-stylist path (`generateAILooks`) stamps occasion `"AI Stylist"`, so it never enters this gate — intentional. Don't try to add it there without a separate design.
- Colour match is fuzzy bucket overlap with the look's piece colours; NEUTRAL sneakers (black/white/grey/cream/etc.) always match. If no colour-coherent pair fits budget, colour is relaxed rather than returning nothing.
- Grid-deduped via a shared `usedAltKeys` Set of `productKey`s so each card suggests a distinct pair; also excludes the look's own articles.
- Empty pool / no headroom → returns `undefined`; UI renders `look.sneakerAlt ? ... : null` (honest omission, no crash).
