---
name: Promo code grant-tier UX trap
description: Why promo controls must live in BOTH branches of membership.tsx
---

# Promo codes — grant-tier UX trap

`app/membership.tsx` has an early `return` for paid members: `if (currentTier !== "basic") { ...member splash... }`. A `grant_tier` promo (e.g. `DIAMONDHOUSE`) flips `currentTier` to non-basic the instant it's redeemed, so the screen immediately swaps to the member-splash branch.

**Rule:** any promo affordance (especially the Remove/clear control) must be rendered in BOTH the splash branch AND the main paywall branch — otherwise a granted-tier user can never reach it to revoke the comp tier.

**Why:** the architect caught that the first implementation only put the clear control in the paywall body, leaving granted users unable to remove the promo (they only ever see the splash).

**How to apply:** when adding any promo/entitlement-override UI to membership.tsx, check it's reachable from the member-splash early-return, not just the default render path.
