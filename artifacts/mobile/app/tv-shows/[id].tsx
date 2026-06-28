import * as Haptics from "expo-haptics";
import { safeBack } from "../../lib/nav";
import { LinearGradient } from "@/lib/safeWebShims";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo, useState } from "react";
import {
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import {
  CATEGORY_LABELS,
  type ShowCharacter,
  findShowById,
  makeCharMuseId,
} from "@/constants/tvShows";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { BrandWordmark } from "@/components/BrandWordmark";
import { TitleRule } from "@/components/TitleRule";

const { height } = Dimensions.get("window");

export default function TVShowDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { userProfile } = useApp();

  const show = findShowById(id);

  // Gender-filter the cast to the user's profile so a Men profile doesn't get
  // led to women's looks (and vice versa). Mirrors filterLooksForProfile's HARD
  // gender contract. Falls back to the full cast when the filter would leave
  // fewer than one match (e.g. an all-women show for a Men profile) — better to
  // show the cast than an empty screen.
  const cast = useMemo<ShowCharacter[]>(() => {
    if (!show) return [];
    const g = userProfile.gender;
    if (g === "Men" || g === "Women") {
      const want = g === "Men" ? "men" : "women";
      const matched = show.characters.filter((c) => c.gender === want);
      if (matched.length >= 1) return matched;
    }
    return show.characters;
  }, [show, userProfile.gender]);

  if (!show) {
    return (
      <View style={[styles.notFound, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.foreground, fontFamily: "Inter_600SemiBold" }}>
          Show not found
        </Text>
        <Pressable onPress={() => safeBack()}>
          <Text style={{ color: colors.gold, fontFamily: "Inter_500Medium" }}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const generate = (char: ShowCharacter, lookName?: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    router.push({
      pathname: "/(tabs)/style",
      params: {
        tvchar: makeCharMuseId(show.id, char.id),
        ...(lookName ? { museHint: lookName } : {}),
      },
    });
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 48 }}
      >
        {/* ── Editorial hero (accent gradient, no photo) ── */}
        <View style={styles.hero}>
          <LinearGradient
            colors={[show.accentColor + "66", show.accentColor + "1F", "#0B0B0C"]}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />

          {/* Top bar */}
          <View style={[styles.topBar, { paddingTop: insets.top + 8 }]}>
            <Pressable
              onPress={() => safeBack()}
              style={[styles.circleBtn, { backgroundColor: "rgba(11,11,12,0.6)" }]}
              hitSlop={12}
            >
              <Feather name="arrow-left" size={18} color="#F5F5F0" />
            </Pressable>
            <BrandWordmark style={{ opacity: 0.9 }} />
            <View style={styles.circleBtn}>
              <Feather name="tv" size={16} color="#F5F5F0" />
            </View>
          </View>

          {/* Hero info */}
          <View style={styles.heroInfo}>
            <View style={[styles.categoryBadge, { borderColor: show.accentColor }]}>
              <Text style={[styles.categoryBadgeText, { color: show.accentColor }]}>
                {CATEGORY_LABELS[show.category].toUpperCase()} · {show.network}
              </Text>
            </View>
            <Text style={styles.heroName}>{show.name}</Text>
            <TitleRule width={34} style={{ marginTop: -1 }} />
            <Text style={[styles.heroTagline, { color: show.accentColor }]}>
              {show.tagline}
            </Text>
          </View>
        </View>

        {/* ── Description ── */}
        <View style={styles.descSection}>
          <Text style={[styles.description, { color: colors.mutedForeground }]}>
            {show.description}
          </Text>
          <View style={styles.vibeRow}>
            {show.vibes.map((v) => (
              <View key={v} style={[styles.vibeTag, { borderColor: colors.border }]}>
                <Text style={[styles.vibeTagText, { color: colors.mutedForeground }]}>
                  {v.toUpperCase()}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Cast ── */}
        <View style={styles.castHeader}>
          <Text style={[styles.castTitle, { color: colors.foreground }]}>
            Main Characters
          </Text>
          <Text style={[styles.castSub, { color: colors.mutedForeground }]}>
            Pick a character — or one of their signature looks — to generate a real outfit
          </Text>
        </View>

        <View style={styles.castList}>
          {cast.map((char, i) => (
            <CharacterCard
              key={char.id}
              char={char}
              featured={i === 0}
              onGenerate={(lookName) => generate(char, lookName)}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

function CharacterCard({
  char,
  featured,
  onGenerate,
}: {
  char: ShowCharacter;
  featured: boolean;
  onGenerate: (lookName?: string) => void;
}) {
  const colors = useColors();
  const [expanded, setExpanded] = useState(featured);

  return (
    <View
      style={[
        styles.charCard,
        {
          backgroundColor: colors.card,
          borderColor: featured ? char.accentColor : colors.border,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.charHeader}>
        <View style={[styles.charAvatar, { backgroundColor: char.accentColor + "22", borderColor: char.accentColor }]}>
          <Text style={[styles.charInitial, { color: char.accentColor }]}>
            {char.name.charAt(0)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.charName, { color: colors.foreground }]} numberOfLines={1}>
            {char.name}
          </Text>
          <Text style={[styles.charActor, { color: colors.mutedForeground }]} numberOfLines={1}>
            {char.actor} · {char.role}
          </Text>
        </View>
        <View style={[styles.charStyleTag, { backgroundColor: char.accentColor + "1A", borderColor: char.accentColor }]}>
          <Text style={[styles.charStyleTagText, { color: char.accentColor }]} numberOfLines={1}>
            {char.style.toUpperCase()}
          </Text>
        </View>
      </View>

      <Text style={[styles.charDesc, { color: colors.mutedForeground }]}>
        {char.description}
      </Text>

      {/* Brands */}
      <View style={styles.brandRow}>
        {char.signatureBrands.slice(0, 4).map((b, idx) => (
          <View
            key={b}
            style={[
              styles.brandChip,
              { backgroundColor: colors.secondary, borderColor: idx === 0 ? char.accentColor : colors.border },
            ]}
          >
            <Text
              style={[styles.brandChipText, { color: idx === 0 ? char.accentColor : colors.foreground }]}
              numberOfLines={1}
            >
              {b}
            </Text>
          </View>
        ))}
      </View>

      {/* Signature looks (expandable) */}
      <Pressable
        onPress={() => {
          Haptics.selectionAsync();
          setExpanded((e) => !e);
        }}
        style={[styles.looksToggle, { borderTopColor: colors.border }]}
        hitSlop={6}
      >
        <Text style={[styles.looksToggleText, { color: colors.mutedForeground }]}>
          {char.looks.length} SIGNATURE LOOKS
        </Text>
        <Feather name={expanded ? "chevron-up" : "chevron-down"} size={14} color={colors.mutedForeground} />
      </Pressable>

      {expanded && (
        <View style={styles.lookList}>
          {char.looks.map((look) => (
            <Pressable
              key={look.name}
              onPress={() => onGenerate(look.name)}
              style={({ pressed }) => [
                styles.lookRow,
                { borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <View style={{ flex: 1 }}>
                <Text style={[styles.lookName, { color: colors.foreground }]} numberOfLines={1}>
                  {look.name}
                </Text>
                <Text style={[styles.lookPieces, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {look.pieces.map((p) => p.brand).join(" · ")}
                </Text>
              </View>
              <View style={styles.lookGenCue}>
                <Feather name="zap" size={11} color={char.accentColor} />
                <Feather name="arrow-right" size={11} color={char.accentColor} />
              </View>
            </Pressable>
          ))}
        </View>
      )}

      {/* Primary generate CTA */}
      <Pressable
        onPress={() => onGenerate()}
        style={[styles.genBtn, { backgroundColor: char.accentColor }]}
      >
        <Feather name="zap" size={14} color="#0B0B0C" />
        <Text style={styles.genBtnText}>
          GENERATE {char.name.split(" ")[0].toUpperCase()}'S LOOK
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12 },
  hero: {
    height: height * 0.38,
    position: "relative",
    justifyContent: "flex-end",
  },
  topBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  circleBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  heroInfo: {
    padding: 24,
    gap: 8,
  },
  categoryBadge: {
    alignSelf: "flex-start",
    borderWidth: 0.5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 2,
  },
  categoryBadgeText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  heroName: {
    fontSize: 36,
    fontFamily: "PlayfairDisplay_700Bold",
    color: "#F5F5F0",
    lineHeight: 40,
    letterSpacing: -0.5,
  },
  heroTagline: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.3,
    fontStyle: "italic",
  },
  descSection: {
    padding: 24,
    gap: 16,
  },
  description: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 23,
    letterSpacing: 0.2,
  },
  vibeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  vibeTag: {
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  vibeTagText: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  castHeader: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 4,
  },
  castTitle: {
    fontSize: 22,
    fontFamily: "PlayfairDisplay_700Bold",
    marginBottom: -2,
  },
  castSub: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  castList: {
    paddingHorizontal: 20,
    gap: 16,
  },
  charCard: {
    borderRadius: 6,
    borderWidth: 0.5,
    padding: 16,
    gap: 14,
  },
  charHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  charAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 0.5,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  charInitial: {
    fontSize: 20,
    fontFamily: "PlayfairDisplay_700Bold",
  },
  charName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
  },
  charActor: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  charStyleTag: {
    borderWidth: 0.5,
    borderRadius: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    maxWidth: 110,
    flexShrink: 0,
  },
  charStyleTagText: {
    fontSize: 8,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
  },
  charDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  brandRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  brandChip: {
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  brandChipText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.2,
  },
  looksToggle: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderTopWidth: 0.5,
    paddingTop: 12,
  },
  looksToggleText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.5,
  },
  lookList: {
    gap: 8,
  },
  lookRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 0.5,
    borderRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  lookName: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  lookPieces: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
  },
  lookGenCue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    flexShrink: 0,
  },
  genBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 4,
    paddingVertical: 13,
  },
  genBtnText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1,
    color: "#0B0B0C",
  },
});
