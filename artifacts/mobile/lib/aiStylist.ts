/**
 * AI Stylist client — calls POST /api/stylist/plan and feeds the structured
 * outfit plan into the local outfit engine, which resolves each slot to a
 * real catalog item under the same HARD gender + season + budget rules as
 * a normal generate. Returns a Look[] (currently 1 look per AI call).
 */
import type { Look } from "@/constants/data";
import {
  generateLookFromAIPlan,
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
