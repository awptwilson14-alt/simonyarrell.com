---
name: Promo codes — two independent sources merged at redeem
description: Built-in offline codes vs admin-created server codes; snapshot-at-redeem rule
---

# Promo codes — two sources, merged at redeem time

There are TWO promo-code sources and they must stay independent:

1. **Built-in codes** — `promoCodes.ts`, compiled into the bundle, work OFFLINE, cannot be edited at runtime. (`MAISON20/30/50`, `DIAMONDHOUSE`.)
2. **Admin-created codes** — `promo_codes` DB table, managed in `app/admin-promos.tsx` via `/api/promo/codes`, work for EVERY customer.

`redeemPromoCode` (in `promoSettings.ts`) checks built-ins FIRST (instant, offline), then falls back to `lookupServerPromo()`.

**Snapshot rule:** server codes persist an effect SNAPSHOT (`{discountPercent, grantedTier, label}`) into AsyncStorage at redeem time. Built-in codes persist only the code string and re-derive their effect on load.
**Why:** a customer who already redeemed a server code must NOT lose their grant if the owner later edits/deactivates that code — edits affect FUTURE redemptions only (normal promo semantics). Re-deriving server effects on load would retroactively revoke them.
**How to apply:** never change the snapshot-vs-rederive split. If you add fields to a server promo effect, add them to both `PromoSnapshot` and `snapshotOf()`.

**Admin gate:** CRUD is gated by `ADMIN_PROMO_KEY` server secret (`requireAdmin` → 503 if unset, 401 if mismatch). Owner types the same value into the in-app key gate once; it's stored DEVICE-ONLY in AsyncStorage (`promoAdmin.ts`), never synced. Public `/promo/lookup` returns ACTIVE codes only, so deactivating is a soft kill.
