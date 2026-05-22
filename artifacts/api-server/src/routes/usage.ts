import { Router, type IRouter } from "express";
import { and, eq, sql } from "drizzle-orm";
import {
  GetUsageTodayQueryParams,
  LookAttemptBody,
  GetUsageTodayResponse,
  LookAttemptResponse,
} from "@workspace/api-zod";
import { db, dailyLookUsage, userSubscriptions } from "@workspace/db";

const router: IRouter = Router();

/**
 * Free-tier daily cap on AI-generated looks. Mirrors
 * `FREE_DAILY_LOOK_CAP` in artifacts/mobile/lib/tiers.ts. Paid tiers report
 * capLimit=0 (uncapped) per the OpenAPI contract.
 */
const FREE_DAILY_CAP = 3;
const PAID_TIERS = new Set(["premium", "pro", "vip", "diamond"]);

function todayIso(): string {
  // Use UTC for stable cap rollover across timezones.
  return new Date().toISOString().slice(0, 10);
}

/**
 * SECURITY: NEVER trust the `tier` field from a client request body.
 * Look up the authoritative tier from `user_subscriptions` (synced from
 * RevenueCat on purchase via /subscriptions/sync). Falls back to "basic"
 * for unknown users (free tier — the safe default).
 *
 * Without this, a free user could POST `{ tier: "diamond" }` to
 * /usage/look-attempt and bypass the daily cap entirely.
 */
async function resolveServerTier(userId: string): Promise<string> {
  const rows = await db
    .select()
    .from(userSubscriptions)
    .where(eq(userSubscriptions.userId, userId))
    .limit(1);
  const sub = rows[0];
  if (!sub || sub.status !== "active") return "basic";
  return PAID_TIERS.has(sub.tier) ? sub.tier : "basic";
}

function capForTier(tier: string): number {
  return tier === "basic" ? FREE_DAILY_CAP : 0;
}

router.get("/usage/today", async (req, res) => {
  const parsed = GetUsageTodayQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid query params", details: parsed.error.flatten() });
    return;
  }
  const { userId } = parsed.data;
  const date = todayIso();
  try {
    const rows = await db
      .select()
      .from(dailyLookUsage)
      .where(
        and(eq(dailyLookUsage.userId, userId), eq(dailyLookUsage.date, date)),
      )
      .limit(1);
    const looksGenerated = rows[0]?.looksGenerated ?? 0;
    const body = GetUsageTodayResponse.parse({
      date,
      looksGenerated,
      capLimit: FREE_DAILY_CAP,
      capped: looksGenerated >= FREE_DAILY_CAP,
    });
    res.json(body);
  } catch (err) {
    req.log.error({ err }, "usage/today: db read failed");
    res.status(500).json({ error: "Failed to read usage" });
  }
});

router.post("/usage/look-attempt", async (req, res) => {
  const parsed = LookAttemptBody.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }
  const { userId } = parsed.data;
  const date = todayIso();

  try {
    // SECURITY: resolve the tier server-side from user_subscriptions, not
    // from the client request body. Client-supplied tier is ignored.
    const tier = await resolveServerTier(userId);
    const cap = capForTier(tier);

    // ATOMIC cap check + increment in a single SQL upsert. The conditional
    // `setWhere` clause means PostgreSQL only performs the UPDATE when the
    // existing count is strictly below the cap — so two concurrent requests
    // racing at the cap boundary can never both win. When the WHERE fails
    // (cap reached), `.returning()` yields zero rows.
    //
    // Paid tiers (cap === 0): no setWhere, always upserts + increments.
    const conflictUpdate =
      cap > 0
        ? {
            target: [dailyLookUsage.userId, dailyLookUsage.date],
            set: {
              looksGenerated: sql<number>`${dailyLookUsage.looksGenerated} + 1`,
              updatedAt: sql`now()`,
            },
            setWhere: sql`${dailyLookUsage.looksGenerated} < ${cap}`,
          }
        : {
            target: [dailyLookUsage.userId, dailyLookUsage.date],
            set: {
              looksGenerated: sql<number>`${dailyLookUsage.looksGenerated} + 1`,
              updatedAt: sql`now()`,
            },
          };

    const upserted = await db
      .insert(dailyLookUsage)
      .values({ userId, date, looksGenerated: 1 })
      .onConflictDoUpdate(conflictUpdate)
      .returning({ looksGenerated: dailyLookUsage.looksGenerated });

    if (upserted.length === 0) {
      // The setWhere predicate failed → user is at or above the cap.
      // Re-read to report the current authoritative count.
      const existing = await db
        .select()
        .from(dailyLookUsage)
        .where(
          and(
            eq(dailyLookUsage.userId, userId),
            eq(dailyLookUsage.date, date),
          ),
        )
        .limit(1);
      const current = existing[0]?.looksGenerated ?? cap;
      const body = LookAttemptResponse.parse({
        allowed: false,
        looksGenerated: current,
        capLimit: cap,
        reason: "Daily look limit reached for the free tier.",
      });
      res.json(body);
      return;
    }

    const newCount = upserted[0].looksGenerated;
    const body = LookAttemptResponse.parse({
      allowed: true,
      looksGenerated: newCount,
      capLimit: cap,
    });
    res.json(body);
  } catch (err) {
    req.log.error({ err }, "usage/look-attempt: db write failed");
    res.status(500).json({ error: "Failed to record look attempt" });
  }
});

export default router;
