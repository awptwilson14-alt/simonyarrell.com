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
  const filtered =
    activeVibe === "All"
      ? genderFiltered
      : genderFiltered.filter((c) =>
          c.vibes.some((v) =>
            v.toLowerCase().includes(activeVibe.toLowerCase().split(" ")[0].toLowerCase())
          )
        );

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
