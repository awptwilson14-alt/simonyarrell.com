/**
 * Affiliate Analytics (Admin) — owner-only dashboard over the click log.
 *
 * Shows daily clicks, conversion rate, reported revenue, and top
 * brands / products / retailers / outfits for a selectable window.
 * Gated by the same ADMIN_PROMO_KEY the promo admin screen uses; the key is
 * stored once on this device (lib/promoAdmin.ts helpers are reused).
 */
import { Feather } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Stack } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { GoldButton } from "@/components/GoldButton";
import { OrnamentRule } from "@/components/OrnamentRule";
import { useColors } from "@/hooks/useColors";
import {
  fetchAffiliateStats,
  type AffiliateStats,
  type TopRow,
} from "@/lib/affiliateTracking";
import { safeBack } from "@/lib/nav";
import { loadAdminKey, saveAdminKey } from "@/lib/promoAdmin";

const WINDOWS = [7, 30, 90] as const;

export default function AdminAnalyticsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 16 : insets.top;

  const [adminKey, setAdminKey] = useState<string | null>(null);
  const [keyInput, setKeyInput] = useState("");
  const [authError, setAuthError] = useState<string | null>(null);
  const [days, setDays] = useState<number>(30);
  const [stats, setStats] = useState<AffiliateStats | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (key: string, window: number) => {
    setLoading(true);
    setAuthError(null);
    try {
      const s = await fetchAffiliateStats(key, window);
      setStats(s);
      setAdminKey(key);
      await saveAdminKey(key);
    } catch (err) {
      setStats(null);
      setAuthError(err instanceof Error ? err.message : "Couldn't reach the server.");
      if (err instanceof Error && err.message === "Invalid admin key") setAdminKey(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const saved = await loadAdminKey();
      if (saved) await load(saved, 30);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const changeWindow = (w: number) => {
    Haptics.selectionAsync();
    setDays(w);
    if (adminKey) load(adminKey, w);
  };

  const maxDaily = stats ? Math.max(1, ...stats.daily.map((d) => d.clicks)) : 1;

  const TopList = ({ title, rows }: { title: string; rows: TopRow[] }) => (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <Text style={[styles.cardTitle, { color: colors.gold }]}>{title}</Text>
      {rows.length === 0 ? (
        <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>No clicks yet</Text>
      ) : (
        rows.map((r, i) => (
          <View key={`${r.name}-${i}`} style={styles.topRow}>
            <Text style={[styles.topRank, { color: colors.mutedForeground }]}>{i + 1}</Text>
            <Text style={[styles.topName, { color: colors.foreground }]} numberOfLines={1}>
              {r.name ?? "—"}
            </Text>
            <Text style={[styles.topClicks, { color: colors.gold }]}>{r.clicks}</Text>
          </View>
        ))
      )}
    </View>
  );

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
          <Text style={[styles.eyebrow, { color: colors.gold }]}>AFFILIATE ANALYTICS</Text>
          <View style={{ width: 32 }} />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>
          Earnings{"\n"}Dashboard
        </Text>

        {!adminKey ? (
          <>
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Enter your admin key to see click and revenue analytics.
            </Text>
            <OrnamentRule style={{ marginVertical: 22 }} />
            <TextInput
              value={keyInput}
              onChangeText={(t) => {
                setKeyInput(t);
                if (authError) setAuthError(null);
              }}
              placeholder="Your private admin key"
              placeholderTextColor={colors.mutedForeground}
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              onSubmitEditing={() => keyInput.trim() && load(keyInput.trim(), days)}
              style={[
                styles.input,
                { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.card },
              ]}
            />
            {authError && <Text style={styles.errorText}>{authError}</Text>}
            <GoldButton
              label={loading ? "CHECKING…" : "UNLOCK"}
              onPress={() => keyInput.trim() && load(keyInput.trim(), days)}
              disabled={loading || keyInput.trim().length === 0}
              style={{ marginTop: 22 }}
            />
          </>
        ) : (
          <>
            {/* Window selector */}
            <View style={styles.windowRow}>
              {WINDOWS.map((w) => {
                const active = days === w;
                return (
                  <Pressable
                    key={w}
                    onPress={() => changeWindow(w)}
                    style={[
                      styles.windowChip,
                      {
                        borderColor: active ? colors.gold : colors.border,
                        backgroundColor: active ? "rgba(198,167,94,0.12)" : "transparent",
                      },
                    ]}
                  >
                    <Text style={[styles.windowLabel, { color: active ? colors.gold : colors.foreground }]}>
                      {w} DAYS
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {authError && <Text style={styles.errorText}>{authError}</Text>}
            {loading && <ActivityIndicator color={colors.gold} style={{ marginVertical: 24 }} />}

            {stats && (
              <>
                {/* Headline stats */}
                <View style={styles.statGrid}>
                  {[
                    { label: "CLICKS", value: String(stats.totalClicks) },
                    { label: "PURCHASES", value: String(stats.purchases) },
                    {
                      label: "CONVERSION",
                      value: `${(stats.conversionRate * 100).toFixed(1)}%`,
                    },
                    { label: "REVENUE", value: `$${Number(stats.revenue).toFixed(2)}` },
                  ].map((s) => (
                    <View
                      key={s.label}
                      style={[styles.statCard, { borderColor: colors.border, backgroundColor: colors.card }]}
                    >
                      <Text style={[styles.statValue, { color: colors.foreground }]}>{s.value}</Text>
                      <Text style={[styles.statLabel, { color: colors.mutedForeground }]}>{s.label}</Text>
                    </View>
                  ))}
                </View>
                <Text style={[styles.revenueNote, { color: colors.mutedForeground }]}>
                  Purchases and revenue appear once your affiliate network reports conversions.
                </Text>

                {/* Daily clicks bar strip */}
                <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
                  <Text style={[styles.cardTitle, { color: colors.gold }]}>DAILY CLICKS</Text>
                  {stats.daily.length === 0 ? (
                    <Text style={[styles.emptyText, { color: colors.mutedForeground }]}>
                      No clicks in this window yet — taps on any Buy button will appear here.
                    </Text>
                  ) : (
                    <View style={styles.barRow}>
                      {stats.daily.map((d) => (
                        <View key={d.day} style={styles.barCol}>
                          <View
                            style={[
                              styles.bar,
                              {
                                height: Math.max(3, (d.clicks / maxDaily) * 72),
                                backgroundColor: colors.gold,
                              },
                            ]}
                          />
                          <Text style={[styles.barLabel, { color: colors.mutedForeground }]}>
                            {d.day.slice(5)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>

                <TopList title="TOP BRANDS" rows={stats.topBrands} />
                <TopList title="TOP PRODUCTS" rows={stats.topProducts} />
                <TopList title="TOP RETAILERS" rows={stats.topRetailers} />
                <TopList title="TOP OUTFITS" rows={stats.topLooks} />
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 24 },
  headerRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 24 },
  iconBtn: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  eyebrow: { fontSize: 11, letterSpacing: 3, fontFamily: "Inter_600SemiBold" },
  title: { fontSize: 32, lineHeight: 38, fontFamily: "PlayfairDisplay_700Bold", marginBottom: 12 },
  subtitle: { fontSize: 14, lineHeight: 21, fontFamily: "Inter_400Regular" },
  input: { borderWidth: 1, borderRadius: 4, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 8 },
  errorText: { color: "#E07A7A", fontSize: 13, fontFamily: "Inter_500Medium", marginTop: 10 },
  windowRow: { flexDirection: "row", gap: 8, marginTop: 8, marginBottom: 16 },
  windowChip: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  windowLabel: { fontSize: 11, letterSpacing: 1.5, fontFamily: "Inter_600SemiBold" },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  statCard: { flexBasis: "47%", flexGrow: 1, borderWidth: 0.5, borderRadius: 6, paddingVertical: 16, paddingHorizontal: 14 },
  statValue: { fontSize: 24, fontFamily: "PlayfairDisplay_700Bold" },
  statLabel: { fontSize: 10, letterSpacing: 2, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  revenueNote: { fontSize: 11, lineHeight: 16, fontFamily: "Inter_400Regular", marginTop: 10, marginBottom: 4 },
  card: { borderWidth: 0.5, borderRadius: 6, padding: 16, marginTop: 14 },
  cardTitle: { fontSize: 11, letterSpacing: 2.5, fontFamily: "Inter_600SemiBold", marginBottom: 12 },
  emptyText: { fontSize: 13, lineHeight: 19, fontFamily: "Inter_400Regular" },
  barRow: { flexDirection: "row", alignItems: "flex-end", gap: 4, minHeight: 90 },
  barCol: { flex: 1, alignItems: "center", gap: 4 },
  bar: { width: "70%", borderRadius: 2 },
  barLabel: { fontSize: 8, fontFamily: "Inter_400Regular" },
  topRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 7 },
  topRank: { width: 16, fontSize: 12, fontFamily: "Inter_600SemiBold", textAlign: "right" },
  topName: { flex: 1, fontSize: 13, fontFamily: "Inter_500Medium" },
  topClicks: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
