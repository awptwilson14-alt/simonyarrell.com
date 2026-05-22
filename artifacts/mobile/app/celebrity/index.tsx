import * as Haptics from "expo-haptics";
import { Image } from "expo-image";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { CELEBS } from "@/constants/celebrities";
import { filterCelebsByGender } from "@/constants/heroImages";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { BrandWordmark } from "@/components/BrandWordmark";

const { width } = Dimensions.get("window");
const CARD_W = (width - 52) / 2;

const VIBES = ["All", "Luxury Streetwear", "Avant-garde", "Old Money", "Classic", "Minimal", "Y2K / Vintage"];

export default function CelebrityPickerScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userProfile, savedLooks } = useApp();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const [activeVibe, setActiveVibe] = useState("All");

  // Saved-look counts per celeb NAME (inspiredBy stores the name, not the id —
  // see batch 18). Powers the "★ N SAVED" badge on each card to close the loop
  // between profile saves and celeb discovery.
  const savedCountByCeleb = (() => {
    const counts = new Map<string, number>();
    for (const l of savedLooks) {
      if (!l.inspiredBy) continue;
      counts.set(l.inspiredBy, (counts.get(l.inspiredBy) ?? 0) + 1);
    }
    return counts;
  })();

  const genderFiltered = filterCelebsByGender(CELEBS, userProfile.gender);
  // Shared fuzzy match predicate — kept as ONE function so the per-vibe
  // counts in the chip row can never drift from the actual filter below.
  // "All" passes everything; otherwise we compare against the first word of
  // the vibe label (e.g. "Y2K / Vintage" → "y2k") against each of the
  // celeb's vibes via .includes. Lossy by design — vibes overlap and the
  // chip ordering already encodes which match wins visually.
  const matchesVibe = (celeb: typeof CELEBS[number], vibe: string) =>
    vibe === "All" ||
    celeb.vibes.some((v) =>
      v.toLowerCase().includes(vibe.toLowerCase().split(" ")[0].toLowerCase()),
    );
  // Per-vibe counts derived from the SAME predicate the filter uses below.
  // Pre-computed once per render so chip mapping doesn't re-filter per pill.
  // 7 vibes × ~50 celebs is cheap — no need to memoize. Same distribution-
  // awareness language shipped to closet (batch 47) and shop tiers (48).
  const vibeCounts = VIBES.reduce<Record<string, number>>((acc, v) => {
    acc[v] = genderFiltered.filter((c) => matchesVibe(c, v)).length;
    return acc;
  }, {});
  const filtered = genderFiltered.filter((c) => matchesVibe(c, activeVibe));

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* ── Header ── */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <BrandWordmark style={{ marginBottom: 10 }} />
        <View style={styles.headerRow}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { borderColor: colors.border }]}
            hitSlop={12}
          >
            <Feather name="arrow-left" size={16} color={colors.foreground} />
          </Pressable>
          <View style={styles.headerText}>
            <Text style={[styles.screenTitle, { color: colors.foreground }]}>
              Celebrity Inspired
            </Text>
            {/* Gold hairline rule — unifies screen-title motif (batches 115-117). */}
            <View style={[styles.titleRule, { backgroundColor: colors.gold }]} />
            <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
              Choose your style icon
            </Text>
          </View>
        </View>

        {/* Vibe filter pills */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterList}
        >
          {VIBES.map((vibe) => {
            const active = activeVibe === vibe;
            return (
              <Pressable
                key={vibe}
                onPress={() => {
                  Haptics.selectionAsync();
                  setActiveVibe(vibe);
                }}
                style={[
                  styles.filterPill,
                  {
                    backgroundColor: active ? colors.gold : "transparent",
                    borderColor: active ? colors.gold : colors.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    { color: active ? "#0B0B0C" : colors.mutedForeground },
                  ]}
                >
                  {vibe.toUpperCase()}
                  <Text
                    style={[
                      styles.filterCount,
                      {
                        color: active ? "#0B0B0C" : colors.mutedForeground,
                        opacity: active ? 0.7 : 0.55,
                      },
                    ]}
                  >
                    {"  "}{vibeCounts[vibe] ?? 0}
                  </Text>
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* ── Grid ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.grid,
          { paddingBottom: 120 + (Platform.OS === "web" ? 34 : insets.bottom) },
        ]}
      >
        <Text style={[styles.gridCount, { color: colors.mutedForeground }]}>
          {filtered.length} ICONS
        </Text>

        <View style={styles.row}>
          {filtered.map((celeb, idx) => {
            const savedCount = savedCountByCeleb.get(celeb.name) ?? 0;
            return (
            <Pressable
              key={celeb.id}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push(`/celebrity/${celeb.id}`);
              }}
              style={({ pressed }) => [
                styles.card,
                {
                  width: CARD_W,
                  backgroundColor: colors.card,
                  borderColor: savedCount > 0 ? celeb.accentColor : colors.border,
                  opacity: pressed ? 0.82 : 1,
                },
              ]}
            >
              {/* Photo */}
              <View style={styles.photoWrapper}>
                <Image
                  source={celeb.image}
                  style={styles.photo}
                  contentFit="cover"
                  transition={300}
                />
                {/* Gradient overlay */}
                <View style={styles.photoOverlay} />
                {/* Style vibe badge */}
                <View
                  style={[
                    styles.vibeBadge,
                    { backgroundColor: celeb.accentColor + "CC" },
                  ]}
                >
                  <Text style={styles.vibeBadgeText}>
                    {celeb.vibes[0].toUpperCase()}
                  </Text>
                </View>
                {/* Saved-looks count — only when user has saves from this icon. */}
                {savedCount > 0 && (
                  <View style={[styles.savedBadge, { backgroundColor: celeb.accentColor }]}>
                    <Feather name="star" size={9} color="#0B0B0C" />
                    <Text style={styles.savedBadgeText}>
                      {savedCount} SAVED
                    </Text>
                  </View>
                )}
              </View>

              {/* Info */}
              <View style={styles.cardInfo}>
                <Text
                  style={[styles.celebName, { color: colors.foreground }]}
                  numberOfLines={1}
                >
                  {celeb.name}
                </Text>
                <Text
                  style={[styles.celebStyle, { color: celeb.accentColor }]}
                  numberOfLines={1}
                >
                  {celeb.style}
                </Text>
              </View>
            </Pressable>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingTop: 16,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  headerText: { flex: 1 },
  screenTitle: {
    fontSize: 24,
    fontFamily: "PlayfairDisplay_700Bold",
    letterSpacing: -0.2,
  },
  titleRule: { width: 28, height: 1, opacity: 0.7, marginTop: 6, marginBottom: 2 },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.5,
    marginTop: 1,
  },
  filterList: {
    paddingBottom: 4,
    gap: 8,
  },
  filterPill: {
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  filterText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  filterCount: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.5,
  },
  grid: {
    paddingHorizontal: 20,
    paddingTop: 8,
    gap: 4,
  },
  gridCount: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 2,
    marginBottom: 14,
  },
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    borderRadius: 4,
    borderWidth: 0.5,
    overflow: "hidden",
  },
  photoWrapper: {
    height: 190,
    position: "relative",
  },
  photo: {
    width: "100%",
    height: "100%",
  },
  photoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "transparent",
  },
  vibeBadge: {
    position: "absolute",
    bottom: 8,
    left: 8,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 2,
  },
  vibeBadgeText: {
    fontSize: 7,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    color: "#0B0B0C",
  },
  savedBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 2,
  },
  savedBadgeText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
    color: "#0B0B0C",
  },
  cardInfo: {
    padding: 12,
    gap: 3,
  },
  celebName: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  celebStyle: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1,
  },
});
