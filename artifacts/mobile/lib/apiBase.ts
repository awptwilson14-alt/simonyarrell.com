/**
 * Single source of truth for the API server base URL.
 *
 * Every client lib (aiStylist, tryOn, promoAdmin, shownLooks, newsletter,
 * affiliateTracking) MUST import API_BASE / apiUrl from here — duplicated
 * per-file resolvers are how the production 404 bug shipped: the published
 * static site (simonyarrell.com on Vercel) has no env vars and no same-origin
 * /api routes, so relative fetches hit the static host and 404.
 *
 * Resolution order:
 *   1. EXPO_PUBLIC_API_URL — explicit override (CI or build-time env).
 *   2. EXPO_PUBLIC_DOMAIN / EXPO_PUBLIC_REPLIT_DEV_DOMAIN — Replit dev
 *      preview + Expo Go (exported by the dev script).
 *   3. PROD_API_BASE — the committed production API URL (the published
 *      Replit API server). This is what the static Vercel build uses.
 *   4. "" — same-origin relative (never correct for the static prod host,
 *      but the last resort keeps dev-web working if all else is unset).
 */

// The published API server. Filled in when the API server is published on
// Replit; empty string means "no production API deployed yet".
export const PROD_API_BASE = "";

export function resolveApiBase(): string {
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit && explicit.length > 0) return explicit.replace(/\/+$/, "");
  const dev =
    process.env.EXPO_PUBLIC_DOMAIN ||
    process.env.EXPO_PUBLIC_REPLIT_DEV_DOMAIN;
  if (dev && dev.length > 0) return `https://${dev}`;
  if (PROD_API_BASE.length > 0) return PROD_API_BASE.replace(/\/+$/, "");
  return "";
}

export const API_BASE = resolveApiBase();

/** Build a full API URL from a path beginning with "/". */
export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
