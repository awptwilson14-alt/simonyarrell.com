/**
 * Affiliate Settings — in-app toggle that activates / configures the
 * affiliate-link redirector at runtime. Until the master switch is ON, every
 * BUY tap goes to the raw retailer URL (no commission, no tracking).
 *
 * Persisted via `lib/affiliateSettings.ts` (AsyncStorage). Changes take
 * effect on the very next BUY tap — no app restart required.
 */
import { Feather } from "@expo/vector-icons";
import { safeBack } from "../lib/nav";
import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GoldButton } from "@/components/GoldButton";
import { OrnamentRule } from "@/components/OrnamentRule";
import { useColors } from "@/hooks/useColors";
import {
  AFFILIATE_NETWORKS,
  getAffiliateConfig,
  loadAffiliateConfig,
  setAffiliateConfig,
  type AffiliateNetwork,
} from "@/lib/affiliateSettings";

const NETWORK_LABELS: Record<AffiliateNetwork, string> = {
  skimlinks: "Skimlinks",
  rakuten: "Rakuten Advertising",
  impact: "Impact",
  awin: "Awin",
  cj: "CJ Affiliate",
  ltk: "LTK (LiketoKnow.it)",
  shareasale: "ShareASale",
  generic: "Generic (?ref=...)",
};

const NETWORK_HINTS: Record<AffiliateNetwork, string> = {
  skimlinks: "Publisher ID from go.skimresources.com.",
  rakuten: "Sub-ID (u1) attached to every retailer link.",
  impact: "Your Impact click ID / sub-ID.",
  awin: "Awin publisher ID (awc).",
  cj: "CJ sub-ID (sid). Configure per-advertiser deep links in CJ's dashboard.",
  ltk: "LTK creator sub-ID (subid).",
  shareasale: "ShareASale afftrack sub-ID.",
  generic: "Generic ?ref=… tag — works for any retailer that honours it.",
};

export default function AffiliateSettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 16 : insets.top;

  const [enabled, setEnabled] = useState(false);
  const [network, setNetwork] = useState<AffiliateNetwork | null>(null);
  const [publisherId, setPublisherId] = useState("");
  const [saved, setSaved] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadAffiliateConfig().then(() => {
      if (cancelled) return;
      const cfg = getAffiliateConfig();
      setEnabled(cfg.enabled);
      setNetwork(cfg.network);
      setPublisherId(cfg.publisherId);
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const canSave = hydrated && (!enabled || (network !== null && publisherId.trim().length > 0));

  const onSave = async () => {
    if (!canSave) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await setAffiliateConfig({
      enabled,
      network: enabled ? network : null,
      publisherId: enabled ? publisherId : "",
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 16, paddingBottom: 64 + insets.bottom },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => safeBack()}
            hitSlop={12}
            style={[styles.iconBtn, { borderColor: colors.border }]}
          >
            <Feather name="chevron-left" size={18} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.eyebrow, { color: colors.gold }]}>AFFILIATE SETTINGS</Text>
          <View style={{ width: 32 }} />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>
          Monetise{"\n"}Outbound Links
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Turn this on when your affiliate account is approved. Every BUY tap will then route
          through your publisher ID so eligible purchases earn commission. Off by default — no
          link mangling until you flip it. Saving here is authoritative — once saved, this
          toggle is the single source of truth for affiliate tagging.
        </Text>

        <OrnamentRule style={{ marginVertical: 22 }} />

        {/* ── Master toggle ── */}
        <View style={[styles.row, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.rowTitle, { color: colors.foreground }]}>
              Affiliate tracking
            </Text>
            <Text style={[styles.rowSub, { color: colors.mutedForeground }]}>
              {enabled
                ? "BUY taps are tagged with your publisher ID."
                : "BUY taps go to raw retailer URLs (no commission)."}
            </Text>
          </View>
          <Switch
            value={enabled}
            onValueChange={(v) => {
              Haptics.selectionAsync();
              setEnabled(v);
            }}
            trackColor={{ false: "#3a3a3a", true: colors.gold }}
            thumbColor={enabled ? "#0B0B0C" : "#888"}
          />
        </View>

        {/* ── Network picker ── */}
        <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 26 }]}>
          Network
        </Text>
        <View style={styles.networkGrid}>
          {AFFILIATE_NETWORKS.map((n) => {
            const active = network === n;
            return (
              <Pressable
                key={n}
                disabled={!enabled}
                onPress={() => {
                  Haptics.selectionAsync();
                  setNetwork(n);
                }}
                style={[
                  styles.networkChip,
                  {
                    borderColor: active ? colors.gold : colors.border,
                    backgroundColor: active ? "rgba(198,167,94,0.12)" : "transparent",
                    opacity: enabled ? 1 : 0.4,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.networkLabel,
                    { color: active ? colors.gold : colors.foreground },
                  ]}
                >
                  {NETWORK_LABELS[n]}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {network && enabled ? (
          <Text style={[styles.hint, { color: colors.mutedForeground }]}>
            {NETWORK_HINTS[network]}
          </Text>
        ) : null}

        {/* ── Publisher ID ── */}
        <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 22 }]}>
          Publisher / Sub-ID
        </Text>
        <TextInput
          value={publisherId}
          onChangeText={setPublisherId}
          editable={enabled}
          placeholder="e.g. simon-yarrell-001"
          placeholderTextColor={colors.mutedForeground}
          autoCapitalize="none"
          autoCorrect={false}
          style={[
            styles.input,
            {
              color: colors.foreground,
              borderColor: colors.border,
              backgroundColor: colors.card,
              opacity: enabled ? 1 : 0.4,
            },
          ]}
        />

        <GoldButton
          label={saved ? "SAVED" : "SAVE SETTINGS"}
          onPress={onSave}
          disabled={!canSave}
          style={{ marginTop: 26 }}
        />

        <Text style={[styles.footnote, { color: colors.mutedForeground }]}>
          Catalog URLs are stored raw and wrapped only at click time — so toggling networks
          here does not require regenerating any data, and saved products keep working
          forever even if you switch providers.
        </Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 20 },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  eyebrow: { fontSize: 10, letterSpacing: 2.2, fontWeight: "600" },
  title: { fontSize: 32, lineHeight: 36, fontWeight: "300", marginTop: 8 },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 12 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.8,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderRadius: 12,
    gap: 12,
  },
  rowTitle: { fontSize: 14, fontWeight: "600" },
  rowSub: { fontSize: 12, marginTop: 4, lineHeight: 16 },
  networkGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  networkChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  networkLabel: { fontSize: 12, letterSpacing: 0.3 },
  hint: { fontSize: 11, lineHeight: 16, marginTop: 10, fontStyle: "italic" },
  input: {
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  footnote: {
    fontSize: 11,
    lineHeight: 16,
    marginTop: 20,
    textAlign: "center",
    fontStyle: "italic",
  },
});
