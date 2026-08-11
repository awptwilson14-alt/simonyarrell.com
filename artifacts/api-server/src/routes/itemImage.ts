import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, generatedItemImages } from "@workspace/db";

/**
 * AI-generated product photos for catalog items with no usable retailer
 * image. Every look combination's pieces render a photo: when a piece lacks
 * a real product image, the client points its thumbnail at
 *   GET /api/item-image?brand=…&name=…&category=…&color=…
 * The first request generates a studio-style product shot (Gemini image
 * model) and caches it in `generated_item_images`; every later request for
 * the same item — from any look, any user — serves the cached bytes with
 * immutable cache headers. Generation failure returns 404 so the client's
 * editorial monogram fallback still renders (never a broken image).
 */

// Lazy + guarded Gemini client (same pattern as tryon.ts): the integration
// module throws at import time when AI env vars are missing, which would
// crash the whole API server boot.
type GeminiModule = typeof import("@workspace/integrations-gemini-ai");
let _geminiPromise: Promise<GeminiModule | null> | null = null;
function loadGemini(): Promise<GeminiModule | null> {
  if (_geminiPromise) return _geminiPromise;
  _geminiPromise = import("@workspace/integrations-gemini-ai").catch(() => null);
  return _geminiPromise;
}

const router: IRouter = Router();

// ── Abuse guards ─────────────────────────────────────────────────────
// Cache HITS are cheap and unlimited. Cache MISSES invoke a paid image
// generation and write a ~MB row, so they are gated two ways:
//  1. per-IP miss budget (sliding window) — one client can't farm the API;
//  2. global generation concurrency cap — a burst of distinct keys can't
//     saturate the provider or grow the in-flight map unboundedly.
// Over-limit requests return 404, so the app quietly shows its monogram
// tile instead of an error.
const MISS_WINDOW_MS = 5 * 60_000;
const MISS_LIMIT_PER_IP = 30;
const missWindow = new Map<string, { count: number; resetAt: number }>();
function generationAllowed(ip: string): boolean {
  const now = Date.now();
  const w = missWindow.get(ip);
  if (!w || now >= w.resetAt) {
    missWindow.set(ip, { count: 1, resetAt: now + MISS_WINDOW_MS });
    if (missWindow.size > 10_000) {
      for (const [k, v] of missWindow) if (now >= v.resetAt) missWindow.delete(k);
    }
    return true;
  }
  w.count += 1;
  return w.count <= MISS_LIMIT_PER_IP;
}

const MAX_CONCURRENT_GENERATIONS = 3;
let activeGenerations = 0;

/** Normalized cache key — mirrors the catalog productKey convention:
 *  brand|name (lowercased, collapsed whitespace) + colour, so the same
 *  piece reused across different looks maps to ONE generated photo. */
function itemKey(brand: string, name: string, color: string): string {
  const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  return `${norm(brand)}|${norm(name)}|${norm(color)}`;
}

function buildPrompt(brand: string, name: string, category: string, color: string): string {
  const piece = [color, name].filter(Boolean).join(" ");
  const cat = category ? ` (${category})` : "";
  return (
    `Professional luxury e-commerce product photograph of a single fashion item: ` +
    `${piece} by ${brand}${cat}. ` +
    `The item alone, elegantly presented on a dark charcoal studio background with soft ` +
    `dramatic lighting and subtle gold-toned rim light. No person, no mannequin head, ` +
    `no text, no logos overlaid, no watermark, no other objects. Centered composition, ` +
    `square format, high-end editorial catalog style.`
  );
}

// In-flight de-dup: a look detail screen requests several pieces at once and
// lists can re-mount; without this, N concurrent requests for the same item
// would each pay for a generation. Keyed by itemKey, cleared when settled.
const inFlight = new Map<string, Promise<{ mime: string; dataBase64: string } | null>>();

async function getOrGenerate(
  key: string,
  brand: string,
  name: string,
  category: string,
  color: string,
  ip: string,
): Promise<{ mime: string; dataBase64: string } | null> {
  const cached = await db
    .select({ mime: generatedItemImages.mime, dataBase64: generatedItemImages.dataBase64 })
    .from(generatedItemImages)
    .where(eq(generatedItemImages.itemKey, key))
    .limit(1);
  if (cached.length > 0) return cached[0];

  const existing = inFlight.get(key);
  if (existing) return existing;

  // Only cache MISSES are budgeted — see abuse guards above.
  if (!generationAllowed(ip) || activeGenerations >= MAX_CONCURRENT_GENERATIONS) {
    return null;
  }

  const job = (async () => {
    activeGenerations += 1;
    try {
      const gemini = await loadGemini();
      if (!gemini) return null;
      const img = await gemini.generateImage(buildPrompt(brand, name, category, color));
      const row = { mime: img.mimeType, dataBase64: img.b64_json };
      await db
        .insert(generatedItemImages)
        .values({ itemKey: key, brand, name, category: category || null, color: color || null, ...row })
        .onConflictDoNothing();
      return row;
    } catch {
      return null; // client falls back to the editorial monogram tile
    } finally {
      activeGenerations -= 1;
      inFlight.delete(key);
    }
  })();
  inFlight.set(key, job);
  return job;
}

router.get("/item-image", async (req, res) => {
  const brand = String(req.query.brand ?? "").trim();
  const name = String(req.query.name ?? "").trim();
  const category = String(req.query.category ?? "").trim();
  const color = String(req.query.color ?? "").trim();
  if (!brand || !name || brand.length > 120 || name.length > 200 || category.length > 60 || color.length > 60) {
    return res.status(400).json({ error: "brand and name are required" });
  }

  const result = await getOrGenerate(
    itemKey(brand, name, color),
    brand,
    name,
    category,
    color,
    req.ip ?? "unknown",
  );
  if (!result) return res.status(404).json({ error: "image unavailable" });

  res.set("Content-Type", result.mime);
  res.set("Cache-Control", "public, max-age=31536000, immutable");
  return res.send(Buffer.from(result.dataBase64, "base64"));
});

export default router;
