import { Router, type IRouter } from "express";
import { z } from "zod";
import { db, lookFingerprints } from "@workspace/db";

const router: IRouter = Router();

/**
 * GLOBAL look-combination registry.
 *
 * The product rule is: once a look combination has been generated for ANY
 * user, it must never be generated again for ANYONE. The mobile app keeps a
 * per-device fingerprint set (AsyncStorage) for offline dedup; these
 * endpoints add the cross-user layer:
 *
 *   GET  /api/looks/fingerprints  → every burned fingerprint (clients merge
 *                                   into their local set before generating)
 *   POST /api/looks/fingerprints  → register newly generated fingerprints
 *                                   (idempotent — conflicts are ignored)
 *
 * Fingerprints are sorted product-key combos (~60-90 bytes each), so even
 * tens of thousands transfer in a few hundred KB. If this ever grows beyond
 * that, switch the GET to delta-sync on `createdAt`.
 */

const RegisterBody = z.object({
  fingerprints: z.array(z.string().min(1).max(2000)).min(1).max(500),
});

router.get("/looks/fingerprints", async (_req, res) => {
  try {
    const rows = await db
      .select({ fingerprint: lookFingerprints.fingerprint })
      .from(lookFingerprints);
    res.json({ fingerprints: rows.map((r) => r.fingerprint) });
  } catch (err) {
    res.status(500).json({ error: "Failed to load fingerprints" });
  }
});

router.post("/looks/fingerprints", async (req, res) => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid body", details: parsed.error.flatten() });
    return;
  }
  try {
    // Deduplicate within the batch, then upsert; onConflictDoNothing makes
    // concurrent registrations from multiple clients race-safe.
    const unique = [...new Set(parsed.data.fingerprints)];
    await db
      .insert(lookFingerprints)
      .values(unique.map((fingerprint) => ({ fingerprint })))
      .onConflictDoNothing();
    res.json({ registered: unique.length });
  } catch (err) {
    res.status(500).json({ error: "Failed to register fingerprints" });
  }
});

export default router;
