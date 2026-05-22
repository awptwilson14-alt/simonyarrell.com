/**
 * 5-tier subscription matrix for Maison Simon / Simon Yarrell.
 *
 * Tiers are RANK-ORDERED — a higher tier ALWAYS includes every feature of
 * the lower tiers (no a-la-carte). Gating logic everywhere derives from
 * `tierRank()` + `tierIncludes()`, never hardcoded tier comparisons.
 *
 * `rcEntitlement` is the RevenueCat entitlement identifier configured per
 * tier in the RC dashboard. The active tier is derived client-side by
 * scanning `customerInfo.entitlements.active` for the HIGHEST-RANK
 * entitlement that resolves true (see `lib/entitlements.ts`).
 *
 * Strictly additive — does not replace `lib/runwayModes.ts`, the catalog,
 * outfit engine, or affiliate system. Read by `EntitlementsContext` and
 * the rebuilt `app/membership.tsx` paywall.
 */

export const TIER_IDS = [
  "basic",
  "premium",
  "pro",
  "vip",
  "diamond",
] as const;

export type TierId = (typeof TIER_IDS)[number];

export const FEATURES = [
  "AI_STYLE",
  "CELEBRITY",
  "RUNWAY",
  "CLOSET_INTEL",
  "SHOP_LUXURY",
  "UNLIMITED_LOOKS",
  "UNLIMITED_SAVES",
  "TREND_FORECAST",
  "CONCIERGE",
  "PRIORITY_AI",
  "EXCLUSIVE_DROPS",
] as const;

export type Feature = (typeof FEATURES)[number];

export interface TierDefinition {
  id: TierId;
  name: string;
  priceLabel: string;
  priceUSD: number;
  /** RevenueCat entitlement identifier (configure in RC dashboard). */
  rcEntitlement: string;
  /** Preferred RevenueCat package identifier when looking up purchase pkg. */
  rcPackageId: string;
  tagline: string;
  features: string[];
  /** New unlocks ABOVE the previous tier. Used by paywall to highlight. */
  unlocks: Feature[];
}

/** Free baseline cap on AI-generated looks per calendar day. */
export const FREE_DAILY_LOOK_CAP = 3;

export const TIER_DEFINITIONS: Record<TierId, TierDefinition> = {
  basic: {
    id: "basic",
    name: "Basic",
    priceLabel: "Free",
    priceUSD: 0,
    rcEntitlement: "basic",
    rcPackageId: "",
    tagline: "Get a taste of the house.",
    features: [
      "3 looks/day",
      "Limited celebrity styling",
      "Limited runway styling",
      "Save up to 5 outfits",
    ],
    unlocks: ["AI_STYLE", "SHOP_LUXURY"],
  },
  premium: {
    id: "premium",
    name: "Premium",
    priceLabel: "$12.99",
    priceUSD: 12.99,
    rcEntitlement: "premium",
    rcPackageId: "premium_monthly",
    tagline: "The full styling engine, no limits.",
    features: [
      "Unlimited AI styling",
      "Unlimited celebrity looks",
      "Full runway styling",
      "Unlimited saves",
    ],
    unlocks: ["UNLIMITED_LOOKS", "CELEBRITY", "RUNWAY", "UNLIMITED_SAVES"],
  },
  pro: {
    id: "pro",
    name: "Pro",
    priceLabel: "$24.99",
    priceUSD: 24.99,
    rcEntitlement: "pro",
    rcPackageId: "pro_monthly",
    tagline: "Intelligence layered on every outfit.",
    features: [
      "Closet Intelligence",
      "AI wardrobe matching",
      "Trend forecasting",
      "Smart outfit generation",
    ],
    unlocks: ["CLOSET_INTEL", "TREND_FORECAST"],
  },
  vip: {
    id: "vip",
    name: "VIP",
    priceLabel: "$49.99",
    priceUSD: 49.99,
    rcEntitlement: "vip",
    rcPackageId: "vip_monthly",
    tagline: "A personal stylist on retainer.",
    features: [
      "Luxury Concierge Styling",
      "Editorial runway collections",
      "Priority AI generation",
      "VIP styling modes",
    ],
    unlocks: ["CONCIERGE", "PRIORITY_AI"],
  },
  diamond: {
    id: "diamond",
    name: "Diamond",
    priceLabel: "$99.99",
    priceUSD: 99.99,
    rcEntitlement: "diamond",
    rcPackageId: "diamond_monthly",
    tagline: "The full house, white-glove.",
    features: [
      "Full platform access",
      "White-glove luxury styling",
      "Diamond concierge mode",
      "Exclusive future collections",
    ],
    unlocks: ["EXCLUSIVE_DROPS"],
  },
};

/** 0-indexed rank. basic=0, premium=1, pro=2, vip=3, diamond=4. */
export function tierRank(tier: TierId): number {
  return TIER_IDS.indexOf(tier);
}

/** True if the user's tier (or any higher) unlocks the feature. */
export function tierIncludes(userTier: TierId, feature: Feature): boolean {
  const userRank = tierRank(userTier);
  // Walk all tiers; if any tier at-or-below the user's rank lists the
  // feature in its unlocks, the user has access.
  for (let i = 0; i <= userRank; i++) {
    const t = TIER_IDS[i];
    if (TIER_DEFINITIONS[t].unlocks.includes(feature)) return true;
  }
  return false;
}

/** The lowest tier that unlocks the given feature (for upgrade prompts). */
export function minTierFor(feature: Feature): TierId {
  for (const t of TIER_IDS) {
    if (TIER_DEFINITIONS[t].unlocks.includes(feature)) return t;
  }
  // Unknown features default to diamond (most defensive).
  return "diamond";
}

/** Ordered list of paid tiers (basic excluded) for paywall rendering. */
export const PAID_TIER_IDS: TierId[] = TIER_IDS.filter((t) => t !== "basic");
