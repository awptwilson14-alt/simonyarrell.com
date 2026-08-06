/**
 * Promo / comp code catalog for Maison Simon / Simon Yarrell.
 *
 * Two kinds of code:
 *   • `percent_off` — a marketing discount applied to the membership prices
 *     shown on the paywall (e.g. 20% / 30% / 50% off). Display + intent only:
 *     the real charge is governed by the App Store / Play offer the RevenueCat
 *     dashboard is configured with. Pre-launch this drives the in-app pricing
 *     copy so the discount is visible end-to-end.
 *   • `grant_tier` — a complimentary entitlement (e.g. a free Diamond pass).
 *     Redeeming overrides the user's derived tier UP to the granted tier (see
 *     `lib/promoSettings.ts` + `EntitlementsContext`) and mirrors it to the
 *     server so the daily-cap check honours it.
 *
 * Codes are matched case-insensitively after whitespace is stripped. The
 * persisted redemption only stores the normalized code string — the effect is
 * always re-derived from THIS list, so changing a code's effect here updates
 * every already-redeemed device on next load.
 */

import type { TierId } from "./tiers";

export type PromoEffect =
  | { kind: "percent_off"; percent: number }
  | { kind: "grant_tier"; tier: TierId };

export interface PromoCode {
  /** Normalized (uppercase, no spaces) code the user types. */
  code: string;
  /** Human-readable description shown in the active-promo banner + status. */
  label: string;
  effect: PromoEffect;
}

export const PROMO_CODES: PromoCode[] = [
  { code: "MAISON20", label: "20% off any membership", effect: { kind: "percent_off", percent: 20 } },
  { code: "MAISON30", label: "30% off any membership", effect: { kind: "percent_off", percent: 30 } },
  { code: "MAISON50", label: "50% off any membership", effect: { kind: "percent_off", percent: 50 } },
  { code: "PREMIUMHOUSE", label: "Complimentary Premium membership", effect: { kind: "grant_tier", tier: "premium" } },
  { code: "PROHOUSE", label: "Complimentary Pro membership", effect: { kind: "grant_tier", tier: "pro" } },
  { code: "VIPHOUSE", label: "Complimentary VIP membership", effect: { kind: "grant_tier", tier: "vip" } },
  { code: "DIAMONDHOUSE", label: "Complimentary Diamond membership", effect: { kind: "grant_tier", tier: "diamond" } },
];

/** Strip whitespace + uppercase so "maison 20" and "MAISON20" both match. */
export function normalizeCode(raw: string): string {
  return raw.replace(/\s+/g, "").toUpperCase();
}

/** Look up a code by its raw (un-normalized) user input. Null when unknown. */
export function lookupPromo(raw: string): PromoCode | null {
  const norm = normalizeCode(raw);
  if (!norm) return null;
  return PROMO_CODES.find((p) => p.code === norm) ?? null;
}
