import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
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
import { useColors } from "@/hooks/useColors";
import { useSubscription } from "@/lib/revenuecat";

const PERKS = [
  { icon: "zap", label: "AI Style Engine", desc: "Unlimited personalised outfit recommendations" },
  { icon: "camera", label: "Live Try-On", desc: "Overlay any look on your live camera feed" },
  { icon: "star", label: "Exclusive Looks", desc: "Access the full celebrity & editorial look library" },
  { icon: "shopping-bag", label: "Shop the Look", desc: "One-tap purchase links for every piece" },
  { icon: "layers", label: "Unlimited Closet", desc: "Save and organise as many items as you like" },
  { icon: "bell", label: "Drop Alerts", desc: "First access to new collections and collabs" },
];

type PlanKey = "monthly" | "annual";

export default function MembershipScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const topPad = Platform.OS === "web" ? 56 : insets.top;

  const { offerings, isSubscribed, isLoading, purchase, restore, isPurchasing, isRestoring } =
    useSubscription();

  const [selectedPlan, setSelectedPlan] = useState<PlanKey>("annual");
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const currentOffering = offerings?.current;
  const monthlyPkg = currentOffering?.availablePackages.find(
    (p) => p.packageType === "MONTHLY" || p.identifier === "$rc_monthly"
  );
  const annualPkg = currentOffering?.availablePackages.find(
    (p) => p.packageType === "ANNUAL" || p.identifier === "$rc_annual"
  );

  const selectedPkg = selectedPlan === "monthly" ? monthlyPkg : annualPkg;

  const monthlyPrice = monthlyPkg?.product.priceString ?? "$2.99";
  const annualPrice = annualPkg?.product.priceString ?? "$25.00";
  const annualMonthly = annualPkg
    ? `$${(annualPkg.product.price / 12).toFixed(2)}/mo`
    : "$2.08/mo";

  const handleSubscribe = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setConfirmVisible(true);
  };

  const confirmPurchase = async (confirmed: boolean) => {
    setConfirmVisible(false);
    if (!confirmed || !selectedPkg) return;
    try {
      await purchase(selectedPkg);
      setStatusMsg("Welcome to Maison Simon membership!");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => router.back(), 1800);
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
      setStatusMsg("Purchases restored successfully.");
    } catch {
      setStatusMsg("No purchases found to restore.");
    }
  };

  if (isSubscribed) {
    return (
      <View style={[s.screen, { backgroundColor: colors.background }]}>
        <LinearGradient
          colors={["rgba(198,167,94,0.08)", "transparent"]}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={[s.topBar, { paddingTop: topPad + 8 }]}>
          <BrandWordmark />
          <Pressable onPress={() => router.back()} hitSlop={12} style={[s.closeBtn, { borderColor: colors.border }]}>
            <Feather name="x" size={16} color={colors.foreground} />
          </Pressable>
        </View>
        <View style={s.activeBody}>
          <View style={[s.activeIcon, { backgroundColor: `${colors.gold}18`, borderColor: `${colors.gold}50` }]}>
            <Feather name="check-circle" size={40} color={colors.gold} />
          </View>
          <Text style={[s.activeTitle, { color: colors.foreground }]}>You're a Member</Text>
          <Text style={[s.activeSub, { color: colors.mutedForeground }]}>
            Your Maison Simon membership is active. Enjoy unlimited access to every feature.
          </Text>
          <Pressable onPress={() => router.back()} style={[s.goldBtn, { backgroundColor: colors.gold }]}>
            <Text style={s.goldBtnText}>CONTINUE</Text>
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

      {/* Top bar */}
      <View style={[s.topBar, { paddingTop: topPad + 8 }]}>
        <BrandWordmark />
        <Pressable onPress={() => router.back()} hitSlop={12} style={[s.closeBtn, { borderColor: colors.border }]}>
          <Feather name="x" size={16} color={colors.foreground} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[s.content, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Hero */}
        <View style={s.hero}>
          <Text style={[s.eyebrow, { color: colors.gold }]}>MAISON SIMON</Text>
          <Text style={[s.headline, { color: colors.foreground }]}>
            Dress Like{"\n"}You Mean It
          </Text>
          <Text style={[s.sub, { color: colors.mutedForeground }]}>
            Unlock the full Maison Simon experience — AI styling, live try-on, and the world's most curated looks.
          </Text>
        </View>

        {/* Perks */}
        <View style={[s.perksCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {PERKS.map((perk, i) => (
            <View
              key={perk.icon}
              style={[
                s.perkRow,
                i < PERKS.length - 1 && { borderBottomWidth: 0.5, borderBottomColor: colors.border },
              ]}
            >
              <View style={[s.perkIcon, { backgroundColor: `${colors.gold}15` }]}>
                <Feather name={perk.icon as any} size={14} color={colors.gold} />
              </View>
              <View style={s.perkText}>
                <Text style={[s.perkLabel, { color: colors.foreground }]}>{perk.label}</Text>
                <Text style={[s.perkDesc, { color: colors.mutedForeground }]}>{perk.desc}</Text>
              </View>
              <Feather name="check" size={14} color={colors.gold} />
            </View>
          ))}
        </View>

        {/* Plan selector */}
        <View style={s.plans}>
          {/* Annual plan */}
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setSelectedPlan("annual"); }}
            style={[
              s.planCard,
              { borderColor: selectedPlan === "annual" ? colors.gold : colors.border, backgroundColor: colors.card },
              selectedPlan === "annual" && { borderWidth: 1.5 },
            ]}
          >
            {/* Best value badge */}
            <View style={[s.bestBadge, { backgroundColor: colors.gold }]}>
              <Text style={s.bestBadgeText}>BEST VALUE</Text>
            </View>
            <View style={s.planTop}>
              <View style={[s.planRadio, { borderColor: selectedPlan === "annual" ? colors.gold : colors.border }]}>
                {selectedPlan === "annual" && (
                  <View style={[s.planRadioFill, { backgroundColor: colors.gold }]} />
                )}
              </View>
              <View style={s.planInfo}>
                <Text style={[s.planName, { color: colors.foreground }]}>Annual</Text>
                <Text style={[s.planSavings, { color: colors.gold }]}>Save 30% vs monthly</Text>
              </View>
              <View style={s.planPricing}>
                <Text style={[s.planPrice, { color: colors.foreground }]}>{annualPrice}</Text>
                <Text style={[s.planPer, { color: colors.mutedForeground }]}>per year</Text>
              </View>
            </View>
            <Text style={[s.planBreakdown, { color: colors.mutedForeground }]}>
              Just {annualMonthly} — billed once annually
            </Text>
          </Pressable>

          {/* Monthly plan */}
          <Pressable
            onPress={() => { Haptics.selectionAsync(); setSelectedPlan("monthly"); }}
            style={[
              s.planCard,
              { borderColor: selectedPlan === "monthly" ? colors.gold : colors.border, backgroundColor: colors.card },
              selectedPlan === "monthly" && { borderWidth: 1.5 },
            ]}
          >
            <View style={s.planTop}>
              <View style={[s.planRadio, { borderColor: selectedPlan === "monthly" ? colors.gold : colors.border }]}>
                {selectedPlan === "monthly" && (
                  <View style={[s.planRadioFill, { backgroundColor: colors.gold }]} />
                )}
              </View>
              <View style={s.planInfo}>
                <Text style={[s.planName, { color: colors.foreground }]}>Monthly</Text>
                <Text style={[s.planSavings, { color: colors.mutedForeground }]}>Flexible, cancel anytime</Text>
              </View>
              <View style={s.planPricing}>
                <Text style={[s.planPrice, { color: colors.foreground }]}>{monthlyPrice}</Text>
                <Text style={[s.planPer, { color: colors.mutedForeground }]}>per month</Text>
              </View>
            </View>
          </Pressable>
        </View>

        {/* Status message */}
        {statusMsg && (
          <View style={[s.statusMsg, { backgroundColor: `${colors.gold}15`, borderColor: `${colors.gold}40` }]}>
            <Feather name="info" size={13} color={colors.gold} />
            <Text style={[s.statusMsgText, { color: colors.gold }]}>{statusMsg}</Text>
          </View>
        )}

        {/* CTA */}
        <Pressable
          onPress={handleSubscribe}
          disabled={isPurchasing || isLoading}
          style={[s.goldBtn, { backgroundColor: colors.gold, opacity: isPurchasing ? 0.7 : 1 }]}
        >
          {isPurchasing || isLoading ? (
            <ActivityIndicator size="small" color="#0B0B0C" />
          ) : (
            <Text style={s.goldBtnText}>
              {selectedPlan === "annual" ? `START FOR ${annualPrice}/YEAR` : `START FOR ${monthlyPrice}/MONTH`}
            </Text>
          )}
        </Pressable>

        {/* Restore + legal */}
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

      {/* Confirm modal */}
      <Modal visible={confirmVisible} transparent animationType="fade">
        <View style={s.modalOverlay}>
          <View style={[s.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Text style={[s.modalTitle, { color: colors.foreground }]}>Confirm Purchase</Text>
            <Text style={[s.modalSub, { color: colors.mutedForeground }]}>
              {selectedPlan === "annual"
                ? `Subscribe for ${annualPrice}/year (${annualMonthly})?`
                : `Subscribe for ${monthlyPrice}/month?`}
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

  content: { paddingHorizontal: 24, gap: 20, paddingTop: 8 },

  hero: { gap: 12 },
  eyebrow: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 3 },
  headline: {
    fontSize: 42,
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: -0.5,
    lineHeight: 48,
  },
  sub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    letterSpacing: 0.2,
  },

  perksCard: {
    borderWidth: 0.5,
    borderRadius: 2,
    overflow: "hidden",
  },
  perkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  perkIcon: {
    width: 32,
    height: 32,
    borderRadius: 2,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  perkText: { flex: 1, gap: 2 },
  perkLabel: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  perkDesc: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 16 },

  plans: { gap: 12 },
  planCard: {
    borderWidth: 0.5,
    borderRadius: 2,
    padding: 16,
    gap: 8,
    position: "relative",
  },
  bestBadge: {
    position: "absolute",
    top: -1,
    right: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderBottomLeftRadius: 4,
    borderBottomRightRadius: 4,
  },
  bestBadgeText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
    color: "#0B0B0C",
  },
  planTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  planRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  planRadioFill: { width: 10, height: 10, borderRadius: 5 },
  planInfo: { flex: 1, gap: 2 },
  planName: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  planSavings: { fontSize: 11, fontFamily: "Inter_400Regular" },
  planPricing: { alignItems: "flex-end", gap: 1 },
  planPrice: { fontSize: 20, fontFamily: "PlayfairDisplay_700Bold" },
  planPer: { fontSize: 10, fontFamily: "Inter_400Regular" },
  planBreakdown: { fontSize: 11, fontFamily: "Inter_400Regular", paddingLeft: 32 },

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
    letterSpacing: 2,
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

  // Active member screen
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

  // Confirm modal
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
