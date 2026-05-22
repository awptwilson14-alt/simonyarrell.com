/**
 * TierLockPrompt — editorial upgrade modal shown by `requireFeature` when a
 * user taps a feature their current tier doesn't include. Brand-consistent
 * with the membership paywall (gold #C6A75E on dark, Playfair headline,
 * gold rule, dim backdrop). Cancel dismisses; Upgrade routes to
 * `/membership?required=<tier>` with the target tier preselected.
 *
 * Rendered once at the EntitlementsProvider level so any screen can trigger
 * it without owning modal state.
 */

import React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";

import { useColors } from "@/hooks/useColors";
import { TIER_DEFINITIONS, type TierId } from "@/lib/tiers";

interface Props {
  visible: boolean;
  targetTier: TierId | null;
  reason?: string;
  onClose: () => void;
  onUpgrade: () => void;
}

export function TierLockPrompt({
  visible,
  targetTier,
  reason,
  onClose,
  onUpgrade,
}: Props) {
  const colors = useColors();
  // Fall back to a sane default so the modal never reads "undefined" mid-
  // transition (target can be null right after onClose unsets it).
  const tier = targetTier ? TIER_DEFINITIONS[targetTier] : TIER_DEFINITIONS.premium;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.card,
            { backgroundColor: colors.card, borderColor: `${colors.gold}55` },
          ]}
        >
          <View
            style={[
              styles.lockBadge,
              { backgroundColor: `${colors.gold}18`, borderColor: `${colors.gold}55` },
            ]}
          >
            <Feather name="lock" size={20} color={colors.gold} />
          </View>

          <Text style={[styles.eyebrow, { color: colors.gold }]}>
            UNLOCK {tier.name.toUpperCase()}
          </Text>

          <Text style={[styles.title, { color: colors.foreground }]}>
            {tier.tagline}
          </Text>

          <View style={[styles.rule, { backgroundColor: colors.gold }]} />

          {reason ? (
            <Text style={[styles.reason, { color: colors.mutedForeground }]}>
              {reason}
            </Text>
          ) : null}

          <View style={styles.featureList}>
            {tier.features.map((f) => (
              <View key={f} style={styles.featureRow}>
                <Feather name="check" size={13} color={colors.gold} />
                <Text style={[styles.featureText, { color: colors.foreground }]}>{f}</Text>
              </View>
            ))}
          </View>

          <Text style={[styles.price, { color: colors.foreground }]}>
            {tier.priceLabel}
            <Text style={[styles.pricePer, { color: colors.mutedForeground }]}>
              {tier.priceUSD > 0 ? "/mo" : ""}
            </Text>
          </Text>

          <View style={styles.actions}>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                onClose();
              }}
              style={[styles.cancelBtn, { borderColor: colors.border }]}
            >
              <Text style={[styles.cancelText, { color: colors.mutedForeground }]}>
                NOT NOW
              </Text>
            </Pressable>
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                onUpgrade();
              }}
              style={[styles.upgradeBtn, { backgroundColor: colors.gold }]}
            >
              <Text style={styles.upgradeText}>UPGRADE</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(5,5,6,0.75)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
  },
  card: {
    width: "100%",
    borderWidth: 0.5,
    borderRadius: 2,
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  lockBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 4,
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 3,
  },
  title: {
    fontSize: 22,
    fontFamily: "PlayfairDisplay_700Bold",
    textAlign: "center",
    lineHeight: 28,
    letterSpacing: -0.2,
  },
  rule: {
    width: 32,
    height: 1,
    opacity: 0.7,
    marginVertical: 4,
  },
  reason: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 19,
    paddingHorizontal: 4,
  },
  featureList: {
    width: "100%",
    gap: 8,
    marginTop: 4,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  featureText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
  },
  price: {
    fontSize: 28,
    fontFamily: "PlayfairDisplay_700Bold",
    marginTop: 8,
    letterSpacing: -0.4,
  },
  pricePer: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0,
  },
  actions: {
    flexDirection: "row",
    gap: 10,
    marginTop: 12,
    width: "100%",
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderWidth: 0.5,
    borderRadius: 2,
    alignItems: "center",
  },
  cancelText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  upgradeBtn: {
    flex: 1.4,
    paddingVertical: 14,
    borderRadius: 2,
    alignItems: "center",
  },
  upgradeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    color: "#0B0B0C",
  },
});
