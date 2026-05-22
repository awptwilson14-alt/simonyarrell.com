/**
 * Derive the user's active subscription tier from a RevenueCat CustomerInfo
 * snapshot. Pure function — no side effects, no React, no hooks. Imported
 * by `EntitlementsContext` to compute the live tier, and reused on the
 * server-sync path after a successful purchase.
 *
 * Rule: scan TIER_DEFINITIONS in HIGHEST-FIRST rank order; the first tier
 * whose `rcEntitlement` resolves true in `customerInfo.entitlements.active`
 * wins. Falls back to `basic` (free) when nothing is active.
 *
 * NOTE: We never compare RC product IDs here — only entitlement IDs. The
 * RC dashboard owns the mapping from purchasable packages to entitlements,
 * which means launching new SKUs (e.g. annual variants per tier) requires
 * zero client code changes.
 */

import type { CustomerInfo } from "react-native-purchases";
import { TIER_IDS, TIER_DEFINITIONS, type TierId } from "./tiers";

export function deriveTierFromCustomerInfo(
  info: CustomerInfo | null | undefined,
): TierId {
  if (!info) return "basic";
  const active = info.entitlements?.active ?? {};
  // Walk highest → lowest. `basic` has no entitlement to check, so it's
  // the implicit fallback after the loop.
  for (let i = TIER_IDS.length - 1; i >= 0; i--) {
    const t = TIER_IDS[i];
    if (t === "basic") continue;
    const ent = TIER_DEFINITIONS[t].rcEntitlement;
    if (ent && active[ent]) return t;
  }
  return "basic";
}

/** True if customerInfo grants ANY paid tier. */
export function isPaidTier(tier: TierId): boolean {
  return tier !== "basic";
}
