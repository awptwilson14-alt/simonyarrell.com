/**
 * AI Stylist client — calls POST /api/stylist/plan and feeds the structured
 * outfit plan into the local outfit engine, which resolves each slot to a
 * real catalog item under the same HARD gender + season + budget rules as
 * a normal generate. Returns a Look[] (currently 1 look per AI call).
 */
import type { Look } from "@/constants/data";
import {
  generateLookFromAIPlan,
  productKey,
  type AIStylistPlan,
  type ResolveAIPlanParams,
} from "./outfitEngine";

const API_BASE = resolveApiBase();

function resolveApiBase(): string {
  // 1. Explicit override (CI/prod).
  const explicit = process.env.EXPO_PUBLIC_API_URL;
  if (explicit && explicit.length > 0) return explicit.replace(/\/+$/, "");
  // 2. Replit dev preview — the mobile dev script exports EXPO_PUBLIC_DOMAIN
  //    (set to $REPLIT_DEV_DOMAIN). Use it for both web preview and native
  //    Expo Go so the API base resolves automatically.
  const dev =
    process.env.EXPO_PUBLIC_DOMAIN ||
    process.env.EXPO_PUBLIC_REPLIT_DEV_DOMAIN;
  if (dev && dev.length > 0) return `https://${dev}`;
  // 3. Last-resort relative — works on web same-origin; native will surface
  //    a clear network error via AIStylistError.
  return "";
}

export interface AIStylistRequest {
  gender: "Women" | "Men" | "Unisex";
  occasion: string;
  budget: string;
  season?: "Spring" | "Summer" | "Autumn" | "Winter" | "All Season";
  prompt?: string;
  favoriteStyles?: string[];
}

export class AIStylistError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
    this.name = "AIStylistError";
  }
}

/**
 * Thrown by `attemptLookGeneration` when the server's daily-cap check
 * denies the attempt (free tier exceeded). Call sites should catch this
 * specifically and route the user to the paywall — never to the
 * generic AIStylistError surface (different copy, different action).
 */
export class LookCapExceededError extends Error {
  readonly name = "LookCapExceededError";
  constructor(
    readonly looksGenerated: number,
    readonly capLimit: number,
  ) {
    super("Daily look limit reached for the free tier.");
  }
}

/**
 * Server-side metered look-attempt check. Increments the user's daily
 * counter when allowed; rejects with `LookCapExceededError` when the free
 * tier's cap is hit. Paid tiers are always allowed (server returns
 * capLimit=0). Failures other than 200 OK fall OPEN so a brief API outage
 * doesn't block paying customers from generating — server is the
 * authority, not us, and we'd rather be permissive on transient errors.
 */
export async function attemptLookGeneration(
  userId: string,
  tier: "basic" | "premium" | "pro" | "vip" | "diamond",
): Promise<{ looksGenerated: number; capLimit: number }> {
  const url = `${API_BASE}/api/usage/look-attempt`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId, tier }),
    });
  } catch {
    // Fail open on network errors — see rationale above.
    return { looksGenerated: 0, capLimit: tier === "basic" ? 3 : 0 };
  }
  if (!res.ok) {
    return { looksGenerated: 0, capLimit: tier === "basic" ? 3 : 0 };
  }
  const body = (await res.json()) as {
    allowed: boolean;
    looksGenerated: number;
    capLimit: number;
  };
  if (!body.allowed) {
    throw new LookCapExceededError(body.looksGenerated, body.capLimit);
  }
  return { looksGenerated: body.looksGenerated, capLimit: body.capLimit };
}

export async function fetchAIPlan(req: AIStylistRequest): Promise<AIStylistPlan> {
  const url = `${API_BASE}/api/stylist/plan`;
  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req),
    });
  } catch (err) {
    throw new AIStylistError(
      `Could not reach the AI stylist (${err instanceof Error ? err.message : "network error"})`,
    );
  }
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.error ?? "";
    } catch {
      /* ignore */
    }
    throw new AIStylistError(
      detail || `AI stylist returned ${res.status}`,
      res.status,
    );
  }
  return (await res.json()) as AIStylistPlan;
}

export async function generateAILook(
  req: AIStylistRequest,
  resolveParams: ResolveAIPlanParams,
): Promise<Look> {
  const plan = await fetchAIPlan(req);
  const look = generateLookFromAIPlan(plan, resolveParams);
  if (!look) {
    throw new AIStylistError(
      "The AI plan didn't match enough catalog items. Try a different brief.",
    );
  }
  return look;
}

/**
 * Generate N distinct AI-stylist looks from a single plan. Strategy: ONE
 * OpenAI call returns a plan; the local resolver is then invoked count×
 * with its built-in top-3 random pick per slot, producing different real-
 * catalog combinations of the same editorial concept. Dedup by piece-id
 * fingerprint; retries up to count×4 times before returning what we have.
 * Falls back to a single look if the plan only resolves one way.
 */
export async function generateAILooks(
  req: AIStylistRequest,
  resolveParams: ResolveAIPlanParams,
  count = 3,
): Promise<Look[]> {
  const plan = await fetchAIPlan(req);
  const out: Look[] = [];
  const seenFingerprints = new Set<string>();
  // TV Inspiration: share ONE used-ARTICLE-key set across every look in this
  // batch (normalized brand|name productKeys, not raw ids) so no catalog article
  // repeats anywhere in the grid — not even a color/variant row of the same
  // garment ("no duplicates, no two images of the same article, any gender").
  // Outside the TV flow this stays undefined and each look dedups only within
  // itself, preserving the prior behaviour.
  const usedAcross = resolveParams.tvInspiration ? new Set<string>() : undefined;
  const maxAttempts = count * 4;
  for (let i = 0; i < maxAttempts && out.length < count; i++) {
    const look = generateLookFromAIPlan(plan, resolveParams, usedAcross);
    if (!look) continue;
    const fp = look.pieces.map(productKey).sort().join("|");
    if (seenFingerprints.has(fp)) continue;
    seenFingerprints.add(fp);
    out.push(look);
  }
  if (out.length === 0) {
    throw new AIStylistError(
      "The AI plan didn't match enough catalog items. Try a different brief.",
    );
  }
  return out;
}
