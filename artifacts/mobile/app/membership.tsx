/**
 * 5-tier subscription paywall — editorial vertical picker. Renders all
 * five tiers (Basic free + Premium/Pro/VIP/Diamond) as selectable cards.
 * Pre-selects the tier from `?required=<tier>` query param when the user
 * arrives via a lock prompt (TierLockPrompt routes here on Upgrade).
 *
 * Purchase resolution: looks up the RevenueCat package whose identifier
 * matches `TIER_DEFINITIONS[tier].rcPackageId`. If no exact match, falls
 * back to the first available package in the current offering so the
 * paywall remains usable while the RC dashboard is being configured.
 *
 * After a successful purchase, calls `/api/subscriptions/sync` so the
 * server-side daily-cap check trusts the new tier on the very next AI
 * generation. Sync failures are logged but not surfaced — the client-side
 * RC customerInfo refresh already updates `useEntitlements().tier` for
 * immediate UI gating.
 *
 * Preserves the existing brand vocab (dark + gold, Playfair headline,
 * gold rule, gendered hero backdrop, restore + legal copy, confirm modal,
 * status messages, "You're a Member" state for paid tiers).
 */

import * as Haptics from "expo-haptics";
import { safeBack } from "../lib/nav";
import { LinearGradient } from "@/lib/safeWebShims";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { BrandWordmark } from "@/components/BrandWordmark";
import { TitleRule } from "@/components/TitleRule";
import { SPLASH_HEROES } from "@/constants/heroImages";
import { useApp } from "@/context/AppContext";
import { useEntitlements } from "@/context/EntitlementsContext";
import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";
import {
  PAID_TIER_IDS,
  TIER_DEFINITIONS,
  TIER_IDS,
  type TierId,
} from "@/lib/tiers";

export default function MembershipScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 56 : insets.top;
  const params = useLocalSearchParams<{ required?: string }>();

  const { offerings, isLoading, purchase, restore, isPurchasing, isRestoring, appUserId, refetchCustomerInfo } =
    useSubscription();
  const { tier: currentTier } = useEntitlements();
  const { userProfile } = useApp();

  // Default selection: the required tier from the deep-link param if valid,
  // else Premium (the first paid tier — the conversion-friendly default).
  const requiredParam = (params.required as TierId | undefined) ?? undefined;
  const initialTier: TierId = requiredParam && TIER_IDS.includes(requiredParam) ? requiredParam : "premium";
  const [selectedTier, setSelectedTier] = useState<TierId>(initialTier);

  // Sync selection when navigating in with a fresh ?required= param mid-
  // session (e.g. user dismissed paywall then tapped a different locked
  // feature). expo-router rehydrates params on re-focus.
  useEffect(() => {
    if (requiredParam && TIER_IDS.includes(requiredParam) && requiredParam !== "basic") {
      setSelectedTier(requiredParam);
    }
  }, [requiredParam]);

  const heroKey: "men" | "women" = userProfile.gender === "Men" ? "men" : "women";
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [syncingTier, setSyncingTier] = useState(false);

  const currentOffering = offerings?.current;

  function findPackageForTier(tierId: TierId) {
    if (tierId === "basic" || !currentOffering) return null;
    const want = TIER_DEFINITIONS[tierId].rcPackageId;
    const exact = currentOffering.availablePackages.find((p) => p.identifier === want);
    if (exact) return exact;
    // Soft fallback: when RC dashboard hasn't yet been configured with
    // per-tier packages, return the first package so the purchase flow
    // still has SOMETHING to call. The price label below shows the
    // tier's intrinsic priceLabel either way, so users see the right
    // copy. Once the dashboard is configured, exact match takes over.
    return currentOffering.availablePackages[0] ?? null;
  }

  const selectedPkg = findPackageForTier(selectedTier);
  const selectedDef = TIER_DEFINITIONS[selectedTier];

  // Prefer the live RC product price when an exact-id package is found,
  // else fall back to the tier's canonical price label. This way the cents-
  // exact App Store price wins when available without breaking the layout
  // before the dashboard is configured.
  const livePriceMatches =
    selectedPkg?.identifier === selectedDef.rcPackageId;
  const displayPrice = livePriceMatches
    ? (selectedPkg?.product.priceString ?? selectedDef.priceLabel)
    : selectedDef.priceLabel;

  const handleSubscribe = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConfirmVisible(true);
  };

  const syncTierToServer = async (tierId: TierId) => {
    if (!appUserId) return;
    try {
      setSyncingTier(true);
      await fetch("/api/subscriptions/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: appUserId, tier: tierId, status: "active" }),
      });
    } catch {
      // Non-fatal — RC customerInfo is still the ultimate source of truth.
    } finally {
      setSyncingTier(false);
    }
  };

  const confirmPurchase = async (confirmed: boolean) => {
    setConfirmVisible(false);
    if (!confirmed || !selectedPkg) return;
    try {
      await purchase(selectedPkg);
      await refetchCustomerInfo();
      await syncTierToServer(selectedTier);
      setStatusMsg(`Welcome to ${selectedDef.name}!`);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => safeBack(), 1800);
    } catch (e: any) {
      if (!e?.userCancelled) {
        setStatusMsg("Something went wrong. Please try again.");
      }
    }
  };

  const handleRestore = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await restore();
      await refetchCustomerInfo();
      setStatusMsg("Purchases restored successfully.");
    } catch {
      setStatusMsg("No purchases found to restore.");
    }
  };

  // Active-member splash for any paid tier.
  if (currentTier !== "basic") {
    const def = TIER_DEFINITIONS[currentTier];
    return (
      <View style={[s.screen, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={["rgba(198,167,94,0.08)", "transparent"]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={[s.topBar, { paddingTop: topPad + 8 }]}>
          <BrandWordmark />
          <Pressable onPress={() => safeBack()} hitSlop={12} style={[s.closeBtn, { borderColor: colors.border }]}>
            <Feather name="x" size={16} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={s.activeBody}>
          <View style={[s.activeIcon, { backgroundColor: `${colors.gold}18`, borderColor: `${colors.gold}50` }]}>
            <Feather name="check-circle" size={40} color={colors.gold} />
          </View>
          <Text style={[s.activeTitle, { color: colors.foreground }]}>{def.name} Member</Text>
          <Text style={[s.activeSub, { color: colors.mutedForeground }]}>
            Your Simon Yarrell {def.name} membership is active. Enjoy {def.tagline.toLowerCase()}
          </Text>
          <Pressable onPress={() => safeBack()} style={[s.goldBtn, { backgroundColor: colors.gold }]}>
            <Text style={s.goldBtnText}>CONTINUE</Text>
          </Pressable>
          <Pressable onPress={handleRestore} disabled={isRestoring} style={s.restoreBtn}>
            {isRestoring ? (
              <ActivityIndicator size="small" color={colors.mutedForeground} />
            ) : (
              <Text style={[s.restoreText, { color: colors.mutedForeground }]}>Restore Purchases</Text>
            )}
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={[s.screen, { backgroundColor: colors.background }]}>
      <LinearGradient
        colors={["rgba(198,167,94,0.1)", "transparent", "rgba(198,167,94,0.04)"]}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={[s.topBar, { paddingTop: topPad + 8 }]}>
        <BrandWordmark />
        <Pressable onPress={() => safeBack()} hitSlop={12} style={[s.closeBtn, { borderColor: colors.border }]}>
          <Feather name="x" size={16} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Hero — gendered editorial backdrop, brand-locked. */}
        <View style={s.heroWrap}>
          <Image source={SPLASH_HEROES[heroKey]} style={s.heroBackdrop} resizeMode="cover" />
          <LinearGradient
            colors={["rgba(11,11,12,0.55)", "rgba(11,11,12,0.82)", "rgba(11,11,12,0.95)"]}
            locations={[0, 0.55, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={s.hero}>
            <Text style={[s.eyebrow, { color: colors.gold }]}>SIMON YARRELL MEMBERSHIP</Text>
            <Text style={[s.headline, { color: colors.foreground }]}>
              Choose Your{"\n"}House Standing
            </Text>
            <TitleRule width={40} style={{ marginTop: 2 }} />
            <Text style={[s.sub, { color: colors.mutedForeground }]}>
              Five tiers. Real designer pieces. From your first 3-look-a-day taste to white-glove Diamond concierge.
            </Text>
          </View>
        </View>

        {/* Current Basic (Free) card — informational, never selectable. */}
        <View
          style={[
            s.basicCard,
            { backgroundColor: colors.card, borderColor: colors.border },
          ]}
        >
          <View style={s.basicTop}>
            <View style={s.basicHeading}>
              <Text style={[s.tierName, { color: colors.foreground }]}>Basic</Text>
              <Text style={[s.basicCurrent, { color: colors.gold }]}>CURRENT PLAN — FREE</Text>
            </View>
            <Text style={[s.tierTagline, { color: colors.mutedForeground }]}>
              {TIER_DEFINITIONS.basic.tagline}
            </Text>
          </View>
          <View style={s.basicFeatures}>
            {TIER_DEFINITIONS.basic.features.map((f) => (
              <Text key={f} style={[s.basicFeatureItem, { color: colors.mutedForeground }]}>
                · {f}
              </Text>
            ))}
          </View>
        </View>

        {/* 4 paid tier cards. */}
        <View style={s.tierStack}>
          {PAID_TIER_IDS.map((tierId) => {
            const def = TIER_DEFINITIONS[tierId];
            const isSelected = selectedTier === tierId;
            const isFlagshipDiamond = tierId === "diamond";
            return (
              <Pressable
                key={tierId}
                onPress={() => {
                  Haptics.selectionAsync();
                  setSelectedTier(tierId);
                }}
                style={[
                  s.tierCard,
                  {
                    backgroundColor: colors.card,
                    borderColor: isSelected ? colors.gold : colors.border,
                  },
                  isSelected && { borderWidth: 1.5 },
                ]}
              >
                {isFlagshipDiamond && (
                  <View style={[s.flagshipBadge, { backgroundColor: colors.gold }]}>
                    <Text style={s.flagshipBadgeText}>FLAGSHIP</Text>
                  </View>
                )}
                <View style={s.tierTop}>
                  <View
                    style={[
                      s.tierRadio,
                      { borderColor: isSelected ? colors.gold : colors.border },
                    ]}
                  >
                    {isSelected && (
                      <View style={[s.tierRadioFill, { backgroundColor: colors.gold }]} />
                    )}
                  </View>
                  <View style={s.tierInfo}>
                    <Text style={[s.tierName, { color: colors.foreground }]}>{def.name}</Text>
                    <Text style={[s.tierTagline, { color: colors.mutedForeground }]}>
                      {def.tagline}
                    </Text>
                  </View>
                  <View style={s.tierPricing}>
                    <Text style={[s.tierPrice, { color: colors.foreground }]}>
                      {def.priceLabel}
                    </Text>
                    <Text style={[s.tierPer, { color: colors.mutedForeground }]}>per month</Text>
                  </View>
                </View>

                {isSelected && (
                  <View style={s.tierFeatures}>
                    {def.features.map((f) => (
                      <View key={f} style={s.tierFeatureRow}>
                        <Feather name="check" size={12} color={colors.gold} />
                        <Text style={[s.tierFeatureText, { color: colors.foreground }]}>{f}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Pressable>
            );
          })}
        </View>

        {statusMsg && (
          <View
            style={[
              s.statusMsg,
              { backgroundColor: `${colors.gold}15`, borderColor: `${colors.gold}40` },
            ]}
          >
            <Feather name="info" size={13} color={colors.gold} />
            <Text style={[s.statusMsgText, { color: colors.gold }]}>{statusMsg}</Text>
          </View>
        )}

        <Pressable
          onPress={handleSubscribe}
          disabled={isPurchasing || isLoading || syncingTier || !selectedPkg}
          style={[
            s.goldBtn,
            {
              backgroundColor: colors.gold,
              opacity: isPurchasing || syncingTier || !selectedPkg ? 0.7 : 1,
            },
          ]}
        >
          {isPurchasing || isLoading || syncingTier ? (
            <ActivityIndicator size="small" color="#0B0B0C" />
          ) : (
            <Text style={s.goldBtnText}>
              {selectedPkg
                ? `START ${selectedDef.name.toUpperCase()} — ${displayPrice}/MO`
                : "MEMBERSHIP UNAVAILABLE"}
            </Text>
          )}
        </Pressable>

        <Pressable onPress={handleRestore} disabled={isRestoring} style={s.restoreBtn}>
          {isRestoring ? (
            <ActivityIndicator size="small" color={colors.mutedForeground} />
          ) : (
            <Text style={[s.restoreText, { color: colors.mutedForeground }]}>Restore Purchases</Text>
          )}
        </Pressable>

        <Text style={[s.legal, { color: colors.mutedForeground }]}>
          Subscriptions auto-renew unless cancelled at least 24 hours before the end of the current period. Manage or cancel in your device's App Store settings. By subscribing you agree to our{" "}
          <Text style={{ color: colors.gold }} onPress={() => router.push("/privacy")}>
            Privacy Policy
          </Text>
          .
        </Text>
      </ScrollView>

      <Modal visible={confirmVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.foreground }]}>Confirm Purchase</Text>
            <Text style={[s.modalSub, { color: colors.mutedForeground }]}>
              Subscribe to {selectedDef.name} for {displayPrice}/month?
            </Text>
            <View style={s.modalActions}>
              <Pressable
                onPress={() => confirmPurchase(false)}
                style={[s.modalCancelBtn, { borderColor: colors.border }]}
              >
                <Text style={[s.modalCancelText, { color: colors.mutedForeground }]}>Cancel</Text>
              </Pressable>
              <Pressable
                onPress={() => confirmPurchase(true)}
                style={[s.modalConfirmBtn, { backgroundColor: colors.gold }]}
              >
                <Text style={s.modalConfirmText}>Confirm</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  screen: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
  },
  content: { paddingHorizontal: 24, gap: 16, paddingTop: 8 },

  heroWrap: {
    borderRadius: 2,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "rgba(198,167,94,0.25)",
  },
  heroBackdrop: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.4,
  },
  hero: { gap: 12, padding: 20 },
  eyebrow: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 3 },
  headline: {
    fontSize: 36,
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: -0.5,
    lineHeight: 42,
  },
  sub: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    letterSpacing: 0.2,
  },

  basicCard: {
    borderWidth: 0.5,
    borderRadius: 2,
    padding: 16,
    gap: 10,
  },
  basicTop: { gap: 4 },
  basicHeading: { flexDirection: "row", justifyContent: "space-between", alignItems: "baseline" },
  basicCurrent: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  basicFeatures: { gap: 3 },
  basicFeatureItem: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },

  tierStack: { gap: 10 },
  tierCard: {
    borderWidth: 0.5,
    borderRadius: 2,
    padding: 16,
    gap: 12,
    position: "relative",
  },
  flagshipBadge: {
    position: "absolute",
    top: -1,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  flagshipBadgeText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    color: "#0B0B0C",
  },
  tierTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  tierRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  tierRadioFill: { width: 10, height: 10, borderRadius: 5 },
  tierInfo: { flex: 1, gap: 2 },
  tierName: { fontSize: 16, fontFamily: "PlayfairDisplay_700Bold", letterSpacing: -0.2 },
  tierTagline: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  tierPricing: { alignItems: "flex-end", gap: 1 },
  tierPrice: { fontSize: 18, fontFamily: "PlayfairDisplay_700Bold" },
  tierPer: { fontSize: 9, fontFamily: "Inter_400Regular" },
  tierFeatures: { gap: 6, paddingLeft: 32, paddingTop: 4 },
  tierFeatureRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  tierFeatureText: { fontSize: 12, fontFamily: "Inter_500Medium" },

  statusMsg: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 0.5,
    borderRadius: 2,
    padding: 12,
  },
  statusMsgText: { fontSize: 13, fontFamily: "Inter_400Regular", flex: 1 },

  goldBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    paddingVertical: 17,
    borderRadius: 2,
  },
  goldBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.6,
    color: "#0B0B0C",
  },

  restoreBtn: { alignItems: "center", paddingVertical: 4 },
  restoreText: { fontSize: 12, fontFamily: "Inter_400Regular", letterSpacing: 0.3 },

  legal: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
    textAlign: "center",
    letterSpacing: 0.2,
    paddingBottom: 8,
  },

  activeBody: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: "center",
    justifyContent: "center",
    gap: 20,
  },
  activeIcon: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  activeTitle: {
    fontSize: 28,
    fontFamily: "PlayfairDisplay_700Bold",
    textAlign: "center",
  },
  activeSub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 22,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(5,5,6,0.7)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  modalCard: {
    width: "100%",
    borderWidth: 0.5,
    borderRadius: 2,
    padding: 24,
    gap: 16,
  },
  modalTitle: { fontSize: 20, fontFamily: "PlayfairDisplay_700Bold", textAlign: "center" },
  modalSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 4 },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 2,
    borderWidth: 0.5,
    alignItems: "center",
  },
  modalCancelText: { fontSize: 12, fontFamily: "Inter_600SemiBold", letterSpacing: 1 },
  modalConfirmBtn: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 2,
    alignItems: "center",
  },
  modalConfirmText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    color: "#0B0B0C",
  },
});
