import { Router, type IRouter } from "express";
import { sql } from "drizzle-orm";
import {
  SyncSubscriptionBody,
  SyncSubscriptionResponse,
} from "@workspace/api-zod";
import { db, userSubscriptions } from "@workspace/db";

const router: IRouter = Router();

router.post("/subscriptions/sync", async (req, res) => {
  const parsed = SyncSubscriptionBody.safeParse(req.body);
  if (!parsed.success) {
    res
      .status(400)
      .json({ error: "Invalid request body", details: parsed.error.flatten() });
    return;
  }
  const { userId, tier, status } = parsed.data;
  try {
    await db
      .insert(userSubscriptions)
      .values({ userId, tier, status })
      .onConflictDoUpdate({
        target: userSubscriptions.userId,
        set: {
          tier,
          status,
          updatedAt: sql`now()`,
        },
      });
    const body = SyncSubscriptionResponse.parse({ ok: true, tier });
    res.json(body);
  } catch (err) {
    req.log.error({ err }, "subscriptions/sync: db write failed");
    res.status(500).json({ error: "Failed to sync subscription" });
  }
});

export default router;
