/**
 * EntitlementsContext — single source of truth for the user's active
 * subscription tier and feature access checks. Wraps the existing
 * SubscriptionProvider (RevenueCat) and adds:
 *
 *   • `tier`            — derived from RC customerInfo
 *   • `appUserId`       — anonymous RC device ID, used as the user key for
 *                         backend usage metering + subscription sync
 *   • `can(feature)`    — pure boolean gate check against TIER_DEFINITIONS
 *   • `requireFeature`  — imperative gate: returns true if allowed, else
 *                         opens the upgrade prompt and routes to /membership
 *   • `looksToday`      — server-tracked daily AI look usage (from /usage/today)
 *   • `lookCap`         — current cap (0 = uncapped, 3 = free tier)
 *   • `refreshUsage`    — invalidates the today-usage query
 *
 * Provider order matters: must mount INSIDE SubscriptionProvider (which
 * supplies appUserId + customerInfo) and INSIDE QueryClientProvider (which
 * supplies react-query). The lock-prompt modal is rendered here so
 * `requireFeature` can show it from anywhere in the tree without an
 * extra global modal-host context.
 *
 * Strictly additive: existing screens that never call `useEntitlements`
 * continue to work unchanged.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useRouter } from "expo-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { useSubscription } from "@/lib/revenuecat";
import { deriveTierFromCustomerInfo } from "@/lib/entitlements";
import {
  FREE_DAILY_LOOK_CAP,
  TIER_DEFINITIONS,
  minTierFor,
  tierIncludes,
  tierRank,
  type Feature,
  type TierId,
} from "@/lib/tiers";
import {
  clearPromoCode,
  getPromoState,
  loadPromoConfig,
  redeemPromoCode,
  subscribePromo,
  type RedeemResult,
} from "@/lib/promoSettings";
import { TierLockPrompt } from "@/components/TierLockPrompt";

interface RequireFeatureOptions {
  /** Override the upgrade target tier (defaults to `minTierFor(feature)`). */
  targetTier?: TierId;
  /** Skip the modal and route straight to /membership. */
  skipPrompt?: boolean;
}

interface EntitlementsValue {
  tier: TierId;
  tierDefinition: (typeof TIER_DEFINITIONS)[TierId];
  appUserId: string | null;
  can: (feature: Feature) => boolean;
  requireFeature: (feature: Feature, options?: RequireFeatureOptions) => boolean;
  looksToday: number;
  lookCap: number;
  capped: boolean;
  refreshUsage: () => Promise<unknown>;
  /**
   * Optimistically bump the local looks-today counter without waiting on
   * the server roundtrip. Call this right after a successful
   * `attemptLookGeneration` so the cap meter in the UI updates instantly;
   * the next `refreshUsage` (or 30s stale-time refetch) reconciles with
   * the server. No-op when the cache has no entry yet.
   */
  bumpLooksToday: () => void;
  /** Direct way to open the upgrade prompt for an explicit tier. */
  showUpgradePrompt: (target: TierId, reason?: string) => void;
  /** Active promo discount (0 when none). Applies to displayed prices. */
  discountPercent: number;
  /** Normalized active promo code, or null. */
  promoCode: string | null;
  /** Human-readable label for the active promo, or null. */
  promoLabel: string | null;
  /** Redeem a promo code. Grants tier + server-syncs when it's a comp code. */
  redeemPromo: (raw: string) => Promise<RedeemResult>;
  /** Remove the active promo (reverts discount / granted tier). */
  clearPromo: () => Promise<void>;
}

const Ctx = createContext<EntitlementsValue | null>(null);

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { customerInfo, appUserId } = useSubscription();

  // Promo state lives in an external store (AsyncStorage-backed) so it can be
  // read synchronously and shared with the membership screen. Hydrate once.
  const promo = useSyncExternalStore(subscribePromo, getPromoState, getPromoState);
  useEffect(() => {
    loadPromoConfig();
  }, []);

  // The RC entitlements are the base tier; a redeemed comp code can override
  // UP to a higher tier (never down). Highest of the two wins.
  const rcTier = useMemo(() => deriveTierFromCustomerInfo(customerInfo), [customerInfo]);
  const tier = useMemo<TierId>(() => {
    if (promo.grantedTier && tierRank(promo.grantedTier) > tierRank(rcTier)) {
      return promo.grantedTier;
    }
    return rcTier;
  }, [rcTier, promo.grantedTier]);

  // Server-tracked daily usage. Only queried when we have a stable appUserId
  // (RC anonymous ID hydrates on mount). Free tier needs this for the cap;
  // paid tiers query it too so the paywall can show "X looks today" copy
  // without an extra fetch.
  const usageQuery = useQuery({
    queryKey: ["usage", "today", appUserId],
    queryFn: async () => {
      if (!appUserId) throw new Error("appUserId not ready");
      // Use plain fetch here to avoid a hard dep on the generated client
      // base-URL config at this layer. The /api/usage routes are colocated
      // with the existing stylist route under the same proxy prefix.
      const res = await fetch(
        `/api/usage/today?userId=${encodeURIComponent(appUserId)}`,
      );
      if (!res.ok) throw new Error(`usage/today ${res.status}`);
      return (await res.json()) as {
        date: string;
        looksGenerated: number;
        capLimit: number;
        capped: boolean;
      };
    },
    enabled: !!appUserId,
    staleTime: 30 * 1000,
    // Failures are non-fatal — UI falls back to optimistic local state.
    retry: 1,
  });

  const looksToday = usageQuery.data?.looksGenerated ?? 0;
  const lookCap = tier === "basic" ? FREE_DAILY_LOOK_CAP : 0;
  const capped = lookCap > 0 && looksToday >= lookCap;

  // Lock prompt state — single modal lives here, opened by `requireFeature`.
  const [promptTier, setPromptTier] = useState<TierId | null>(null);
  const [promptReason, setPromptReason] = useState<string | undefined>(undefined);

  const can = useCallback((feature: Feature) => tierIncludes(tier, feature), [tier]);

  const showUpgradePrompt = useCallback((target: TierId, reason?: string) => {
    setPromptTier(target);
    setPromptReason(reason);
  }, []);

  const bumpLooksToday = useCallback(() => {
    if (!appUserId) return;
    queryClient.setQueryData(
      ["usage", "today", appUserId],
      (prev: { date: string; looksGenerated: number; capLimit: number; capped: boolean } | undefined) => {
        if (!prev) return prev;
        const next = prev.looksGenerated + 1;
        return { ...prev, looksGenerated: next, capped: prev.capLimit > 0 && next >= prev.capLimit };
      },
    );
  }, [appUserId, queryClient]);

  // Mirror a granted tier to the server so the daily-cap check honours it.
  const syncTier = useCallback(
    async (tierId: TierId) => {
      if (!appUserId) return;
      try {
        await fetch("/api/subscriptions/sync", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: appUserId, tier: tierId, status: "active" }),
        });
        usageQuery.refetch();
      } catch {
        /* non-fatal — RC + local override still gate the client */
      }
    },
    [appUserId, usageQuery],
  );

  const redeemPromo = useCallback(
    async (raw: string): Promise<RedeemResult> => {
      const result = await redeemPromoCode(raw);
      if (result.ok && result.state.grantedTier) {
        await syncTier(result.state.grantedTier);
      }
      return result;
    },
    [syncTier],
  );

  const clearPromo = useCallback(async () => {
    const hadGrant = promo.grantedTier;
    await clearPromoCode();
    // If a comp tier was active, revert the server mirror to the real RC tier
    // so the daily cap re-applies (basic users get capped again).
    if (hadGrant) await syncTier(rcTier);
  }, [promo.grantedTier, rcTier, syncTier]);

  const requireFeature = useCallback(
    (feature: Feature, options?: RequireFeatureOptions): boolean => {
      if (tierIncludes(tier, feature)) return true;
      const target = options?.targetTier ?? minTierFor(feature);
      if (options?.skipPrompt) {
        router.push(`/membership?required=${target}` as any);
      } else {
        showUpgradePrompt(target);
      }
      return false;
    },
    [tier, router, showUpgradePrompt],
  );

  const value = useMemo<EntitlementsValue>(
    () => ({
      tier,
      tierDefinition: TIER_DEFINITIONS[tier],
      appUserId,
      can,
      requireFeature,
      looksToday,
      lookCap,
      capped,
      refreshUsage: () => usageQuery.refetch(),
      bumpLooksToday,
      showUpgradePrompt,
      discountPercent: promo.discountPercent,
      promoCode: promo.code,
      promoLabel: promo.label,
      redeemPromo,
      clearPromo,
    }),
    [
      tier,
      appUserId,
      can,
      requireFeature,
      looksToday,
      lookCap,
      capped,
      usageQuery,
      bumpLooksToday,
      showUpgradePrompt,
      promo.discountPercent,
      promo.code,
      promo.label,
      redeemPromo,
      clearPromo,
    ],
  );

  return (
    <Ctx.Provider value={value}>
      {children}
      <TierLockPrompt
        visible={promptTier !== null}
        targetTier={promptTier}
        reason={promptReason}
        onClose={() => setPromptTier(null)}
        onUpgrade={() => {
          const t = promptTier;
          setPromptTier(null);
          if (t) router.push(`/membership?required=${t}` as any);
        }}
      />
    </Ctx.Provider>
  );
}

export function useEntitlements(): EntitlementsValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useEntitlements must be used within EntitlementsProvider");
  return ctx;
}
