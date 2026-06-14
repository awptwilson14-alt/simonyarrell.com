/**
 * Real Luxury Runway Styling Engine — entry surface for editorial / fashion-
 * week-inflected AI looks.
 *
 * Flow: user picks a Runway Mode + (optional) Fashion Week + (optional) free-
 * text brief → `composeRunwayBrief()` packs it into the existing AI stylist
 * request → server returns a structured plan → local resolver builds 3 looks
 * from REAL CATALOG products (no fake clothing, no invented links).
 *
 * Strictly ADDITIVE: shares the gender + season + budget HARD constraints
 * already enforced by the stylist route, reuses LookCard, and never touches
 * the catalog or outfit-engine internals.
 */
import { Feather } from "@expo/vector-icons";
import { safeBack } from "../lib/nav";
import * as Haptics from "expo-haptics";
import { router, Stack } from "expo-router";
import React, { useState } from "react";
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
import { LookCard } from "@/components/LookCard";
import { OrnamentRule } from "@/components/OrnamentRule";
import { useColors } from "@/hooks/useColors";
import { useApp } from "@/context/AppContext";
import { useEntitlements } from "@/context/EntitlementsContext";
import { useSubscription } from "@/lib/revenuecat";
import {
  AIStylistError,
  LookCapExceededError,
  attemptLookGeneration,
  generateAILooks,
} from "@/lib/aiStylist";
import {
  FASHION_WEEK_MODES,
  RUNWAY_MODES,
  composeRunwayBrief,
  fashionWeekBlurb,
  runwayBlurb,
  type FashionWeekMode,
  type RunwayMode,
} from "@/lib/runwayModes";
import type { Look } from "@/constants/data";

/**
 * Runway looks must show REAL designer product photography (no AI-rendered
 * editorial heroes, no duplicates). Each resolved look already carries real
 * catalog pieces; pick the most look-defining piece that has a genuine remote
 * product image (`imageUrl`) — never `localImage`, which is bundled AI artwork.
 * Dedupe across the batch so no two runway cards share a hero. Falls back to
 * the look's editorial hero only when a look has no real product image at all.
 */
const RUNWAY_HERO_PRIORITY = ["dress", "outerwear", "top", "bottom", "shoes", "bag"];

function pickRunwayHeroImage(look: Look, used: Set<string>): Look["image"] {
  const ordered = [...look.pieces].sort(
    (a, b) =>
      (RUNWAY_HERO_PRIORITY.indexOf(a.category) + 1 || 99) -
      (RUNWAY_HERO_PRIORITY.indexOf(b.category) + 1 || 99),
  );
  // First pass: a real product image not already used by another card.
  for (const piece of ordered) {
    if (piece.imageUrl && !used.has(piece.imageUrl)) {
      used.add(piece.imageUrl);
      return { uri: piece.imageUrl };
    }
  }
  // Second pass: allow reuse rather than fall back to an AI hero.
  for (const piece of ordered) {
    if (piece.imageUrl) return { uri: piece.imageUrl };
  }
  // No real product image on any piece — keep the existing editorial hero.
  return look.image;
}

export default function RunwayScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { userProfile, registerGeneratedLooks } = useApp();
  const { tier, requireFeature, showUpgradePrompt, refreshUsage, bumpLooksToday } = useEntitlements();
  const { appUserId } = useSubscription();

  const [runwayMode, setRunwayMode] = useState<RunwayMode | null>("Quiet Luxury");
  const [fashionWeek, setFashionWeek] = useState<FashionWeekMode | null>(null);
  const [brief, setBrief] = useState("");
  const [looks, setLooks] = useState<Look[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const topPad = Platform.OS === "web" ? 16 : insets.top;

  const onGenerate = async () => {
    if (loading) return;
    // Runway entry itself is gated to Premium+ on the home CTA, but defend
    // in depth: anyone who navigates here directly still gets the same
    // gate enforced before we burn an AI call.
    if (!requireFeature("RUNWAY")) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setError(null);
    setLoading(true);
    try {
      // Server-side daily-cap check. Free tier (basic) is blocked at 3/day;
      // paid tiers always pass. Failures fall open inside the helper.
      if (appUserId) {
        await attemptLookGeneration(appUserId, tier);
        bumpLooksToday();
      }
      const genderForReq =
        userProfile.gender === "Women" || userProfile.gender === "Men"
          ? userProfile.gender
          : "Unisex";
      const seasonForReq =
        userProfile.season &&
        ["Spring", "Summer", "Autumn", "Winter", "All Season"].includes(userProfile.season)
          ? (userProfile.season as "Spring" | "Summer" | "Autumn" | "Winter" | "All Season")
          : undefined;
      const composedPrompt = composeRunwayBrief({
        freeText: brief,
        runwayMode: runwayMode ?? undefined,
        fashionWeek: fashionWeek ?? undefined,
      });
      const generated = await generateAILooks(
        {
          gender: genderForReq,
          // Runway is its own occasion vocabulary — pin to "Editorial" so the
          // server's brand picker leans atelier/runway rather than weekend.
          occasion: "Editorial",
          // Runway is "Real Luxury" couture — use the top budget tier. NB:
          // "$$$" is NOT a tier parseBudget() understands; it silently fell back
          // to the $500–$1500 cap, which couture looks can't fit, so the
          // resolver returned zero complete looks → the red error. "$6000+" is
          // the couture tier and resolves reliably across all genders.
          budget: "$6000+",
          season: seasonForReq,
          prompt: composedPrompt,
          favoriteStyles: userProfile.favoriteStyles,
        },
        {
          gender: userProfile.gender,
          budget: "$6000+",
          season: userProfile.season,
        },
        3,
      );
      // Swap each look's hero to a REAL designer product photo (deduped across
      // the batch, AI-rendered heroes avoided) so the runway reflects the
      // selected city's actual fashion, not generic editorial artwork.
      const usedHeroes = new Set<string>();
      const withRealHeroes = generated.map((look) => ({
        ...look,
        image: pickRunwayHeroImage(look, usedHeroes),
      }));
      registerGeneratedLooks(withRealHeroes);
      setLooks(withRealHeroes);
      refreshUsage();
    } catch (err) {
      if (err instanceof LookCapExceededError) {
        showUpgradePrompt("premium", "You've used your 3 free runway looks today. Upgrade for unlimited generations.");
      } else {
        setError(
          err instanceof AIStylistError
            ? err.message
            : "The runway stylist is unavailable right now. Try again in a moment.",
        );
      }
    } finally {
      setLoading(false);
    }
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
        showsVerticalScrollIndicator={false}
      >
        {/* ── Header ── */}
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => safeBack()}
            hitSlop={12}
            style={[styles.iconBtn, { borderColor: colors.border }]}
          >
            <Feather name="chevron-left" size={18} color={colors.foreground} />
          </Pressable>
          <Text style={[styles.eyebrow, { color: colors.gold }]}>RUNWAY STYLING ENGINE</Text>
          <View style={{ width: 32 }} />
        </View>

        <Text style={[styles.title, { color: colors.foreground }]}>
          Real Luxury{"\n"}Runway Looks
        </Text>
        <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
          Editorial outfit compositions from real designer pieces — no AI clothing renders, no
          invented products, every link shoppable.
        </Text>

        <OrnamentRule style={{ marginVertical: 20 }} />

        {/* ── Runway Mode chips ── */}
        <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Runway Mode</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {RUNWAY_MODES.map((m) => {
            const active = runwayMode === m;
            return (
              <Pressable
                key={m}
                onPress={() => {
                  Haptics.selectionAsync();
                  setRunwayMode(active ? null : m);
                }}
                style={[
                  styles.chip,
                  {
                    borderColor: active ? colors.gold : colors.border,
                    backgroundColor: active ? "rgba(198,167,94,0.12)" : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? colors.gold : colors.foreground },
                  ]}
                >
                  {m}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {runwayMode ? (
          <Text style={[styles.blurb, { color: colors.mutedForeground }]}>
            {runwayBlurb(runwayMode)}
          </Text>
        ) : null}

        {/* ── Fashion Week chips ── */}
        <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 22 }]}>
          Fashion Week Inspiration
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {FASHION_WEEK_MODES.map((m) => {
            const active = fashionWeek === m;
            return (
              <Pressable
                key={m}
                onPress={() => {
                  Haptics.selectionAsync();
                  setFashionWeek(active ? null : m);
                }}
                style={[
                  styles.chip,
                  {
                    borderColor: active ? colors.gold : colors.border,
                    backgroundColor: active ? "rgba(198,167,94,0.12)" : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.chipText,
                    { color: active ? colors.gold : colors.foreground },
                  ]}
                >
                  {m.replace(" Fashion Week", "").replace("Avant-Garde", "Avant-Garde")}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        {fashionWeek ? (
          <Text style={[styles.blurb, { color: colors.mutedForeground }]}>
            {fashionWeekBlurb(fashionWeek)}
          </Text>
        ) : null}

        {/* ── Free-text brief ── */}
        <Text style={[styles.sectionLabel, { color: colors.foreground, marginTop: 22 }]}>
          Stylist Brief (optional)
        </Text>
        <TextInput
          value={brief}
          onChangeText={setBrief}
          placeholder="e.g. Luxury monochrome Paris runway outfit"
          placeholderTextColor={colors.mutedForeground}
          multiline
          style={[
            styles.input,
            {
              color: colors.foreground,
              borderColor: colors.border,
              backgroundColor: colors.card,
            },
          ]}
        />

        <GoldButton
          label={loading ? "STYLING…" : "GENERATE RUNWAY LOOKS"}
          onPress={onGenerate}
          disabled={loading}
          style={{ marginTop: 22 }}
        />

        {error ? (
          <Text style={[styles.errorText, { color: "#E66" }]}>{error}</Text>
        ) : null}

        {/* ── Results ── */}
        {loading && looks.length === 0 ? (
          <View style={{ paddingVertical: 36, alignItems: "center" }}>
            <ActivityIndicator color={colors.gold} />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
              Composing editorial looks from real designer pieces…
            </Text>
          </View>
        ) : null}

        {looks.length > 0 ? (
          <>
            <OrnamentRule style={{ marginVertical: 24 }} />
            <Text style={[styles.sectionLabel, { color: colors.foreground }]}>Your Runway</Text>
            <View style={{ marginTop: 10 }}>
              {looks.map((look) => (
                <View key={look.id} style={{ marginBottom: 18 }}>
                  <LookCard look={look} />
                  {look.description ? (
                    <Text style={[styles.commentary, { color: colors.mutedForeground }]}>
                      <Text style={{ color: colors.gold, fontWeight: "600" }}>
                        Stylist note ·{" "}
                      </Text>
                      {look.description}
                    </Text>
                  ) : null}
                </View>
              ))}
            </View>
          </>
        ) : null}
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
    marginBottom: 16,
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
  title: { fontSize: 34, lineHeight: 38, fontWeight: "300", marginTop: 8 },
  subtitle: { fontSize: 13, lineHeight: 19, marginTop: 12 },
  sectionLabel: {
    fontSize: 11,
    letterSpacing: 1.8,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 12,
  },
  chipRow: { gap: 8, paddingRight: 12 },
  chip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipText: { fontSize: 12, letterSpacing: 0.4 },
  blurb: { fontSize: 12, lineHeight: 17, marginTop: 10, fontStyle: "italic" },
  input: {
    minHeight: 84,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    textAlignVertical: "top",
  },
  errorText: { marginTop: 14, fontSize: 13, textAlign: "center" },
  loadingText: { marginTop: 12, fontSize: 12, letterSpacing: 0.6 },
  commentary: {
    marginTop: 10,
    paddingHorizontal: 4,
    fontSize: 12,
    lineHeight: 18,
    fontStyle: "italic",
  },
});
