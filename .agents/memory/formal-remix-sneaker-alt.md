---
name: Formal Remix sneaker alternative
description: How the additive sneaker-alternative on Formal Remix looks is scoped, budgeted, and ranked.
---

Every Formal Remix look carries an OPTIONAL `sneakerAlt` (a colour + budget-matched sneaker the user can swap in for the look's existing shoe). Lives on the `Look` type; attached only in `generateLooks` (rule-based) under `occasion === "Formal Remix"`, in a post-loop right before the final `shuffle(withinBudget)` return.

**Additive, never structural.** `sneakerAlt` is NOT part of `look.pieces` and NOT added to `estimatedPrice`. It is a suggestion only. Do not fold it into totals or completeness gates.

**Budget invariant = SWAP headroom, not full budget.** The alt replaces the shoe, so `headroom = budgetMax - (sum of NON-shoe pieces)`; candidate `price <= headroom`. This guarantees `nonShoeTotal + altPrice <= budgetMax` — the swapped look stays within the same budget. Never use full-budget or per-item caps here.

**Why prestige+price ranking:** score = `price + sneakerPrestige*500` (prestige = +2 high-end brand substring match, +3 limited-edition name regex). Satisfies BOTH product rules at once — "higher budget ⇒ more expensive" (bigger headroom lets pricier pairs in and priciest wins) AND "include high-end/limited edition" (fixed bonus surfaces them whenever affordable).

**How to apply / gotchas:**
- Scope is rule-based Formal Remix ONLY. The AI-stylist path (`generateAILooks`) stamps occasion `"AI Stylist"`, so it never enters this gate — intentional. Don't try to add it there without a separate design.
- Colour match is fuzzy bucket overlap with the look's piece colours; NEUTRAL sneakers (black/white/grey/cream/etc.) always match. If no colour-coherent pair fits budget, colour is relaxed rather than returning nothing.
- Grid-deduped via a shared `usedAltKeys` Set of `productKey`s so each card suggests a distinct pair; also excludes the look's own articles.
- Empty pool / no headroom → returns `undefined`; UI renders `look.sneakerAlt ? ... : null` (honest omission, no crash).
