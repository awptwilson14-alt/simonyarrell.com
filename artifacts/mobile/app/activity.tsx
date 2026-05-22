import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React from "react";
import {
  Image,
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
import { LookCard } from "@/components/LookCard";
import { GoldButton } from "@/components/GoldButton";
import { SPLASH_HEROES } from "@/constants/heroImages";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { findCelebByName } from "@/lib/celebLookup";
import { LinearGradient } from "expo-linear-gradient";

/**
 * Activity inbox — the destination for the home header bell. Surfaces signals
 * already in state (savedLooks, attribution via inspiredBy) — no fake data,
 * no backend dependency. Three editorial blocks:
 *   1. RECENT SAVES — last 5 savedLooks (horizontal LookCard scroll). savedLooks
 *      is already newest-first (saveLook prepends in AppContext — confirmed by
 *      architect in batch 33).
 *   2. SIGNATURE ICON — top channeled celeb resolved via findCelebByName
 *      (helper from batch 36). Tap routes to /celebrity/[id]. Same source-of-
 *      truth as the profile MOST CHANNELED chip from batch 34, so the user
 *      sees the same icon in both surfaces — never a contradiction.
 *   3. CHANNEL CTA — when a top icon exists, prominent gold button routes
 *      to /style with the celeb param pre-applied, jumping the user straight
 *      into generation. Hidden when no attribution data yet.
 * Empty state (no savedLooks at all) is honest editorial copy + CTA to explore.
 */
export default function ActivityScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { savedLooks, userProfile } = useApp();

  const topPad = Platform.OS === "web" ? 56 : insets.top;

  // Recent saves — already newest-first thanks to AppContext prepend pattern.
  const recent = savedLooks.slice(0, 5);

  // Top channeled celeb — same logic as profile MOST CHANNELED chip (batch 34),
  // intentionally duplicated as a small inline reduce rather than extracted
  // because two surfaces using the same 6-line transform doesn't justify a
  // hook yet. If a third surface emerges, lift into a useMemo hook.
  const topName = (() => {
    const counts = new Map<string, number>();
    for (const l of savedLooks) {
      if (!l.inspiredBy) continue;
      counts.set(l.inspiredBy, (counts.get(l.inspiredBy) ?? 0) + 1);
    }
    let topEntry: { name: string; count: number } | undefined;
    for (const [name, count] of counts) {
      if (!topEntry || count > topEntry.count) topEntry = { name, count };
    }
    return topEntry;
  })();
  const topCeleb = findCelebByName(topName?.name);

  const empty = savedLooks.length === 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          paddingTop: topPad + 16,
          paddingBottom: insets.bottom + 40,
        }}
      >
        <View style={styles.topBar}>
          <Pressable onPress={() => router.back()} hitSlop={12} style={styles.backBtn}>
            <Feather name="chevron-left" size={22} color={colors.foreground} />
          </Pressable>
          <BrandWordmark style={{ flex: 1 }} />
          <View style={{ width: 22 }} />
        </View>

        <View style={styles.titleBlock}>
          <Text style={[styles.eyebrow, { color: colors.gold }]}>INBOX</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>Activity</Text>
          {/* Shared TitleRule atom (batch 119). */}
          <TitleRule style={{ marginVertical: 2 }} />
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            {empty
              ? "Quiet for now. Save a look to start your feed."
              : `${savedLooks.length} ${savedLooks.length === 1 ? "look" : "looks"} in your wardrobe`}
          </Text>
        </View>

        {/* ── Recent saves ── */}
        {recent.length > 0 && (
          <View style={styles.block}>
            <Text style={[styles.blockLabel, { color: colors.mutedForeground }]}>
              RECENT SAVES
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.recentScroll}
            >
              {recent.map((look) => (
                <LookCard key={look.id} look={look} width={170} />
              ))}
            </ScrollView>
          </View>
        )}

        {/* ── Signature icon ── */}
        {topCeleb && topName && (
          <View style={styles.block}>
            <Text style={[styles.blockLabel, { color: colors.mutedForeground }]}>
              YOUR SIGNATURE ICON
            </Text>
            <Pressable
              onPress={() => {
                Haptics.selectionAsync();
                router.push(`/celebrity/${topCeleb.id}`);
              }}
              style={({ pressed }) => [
                styles.signatureCard,
                {
                  backgroundColor: colors.card,
                  borderColor: `${topCeleb.accentColor}80`,
                  opacity: pressed ? 0.92 : 1,
                },
              ]}
            >
              {/* Celeb portrait — bundled local asset from constants/celebrities.ts.
                  Square 56pt thumbnail with a thin accent-tinted border so the
                  card reads as a personal signature, not a generic chip. */}
              <Image
                source={topCeleb.image}
                style={[styles.signaturePortrait, { borderColor: `${topCeleb.accentColor}cc` }]}
                resizeMode="cover"
              />
              <View style={[styles.signatureAccent, { backgroundColor: topCeleb.accentColor }]} />
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.signatureName, { color: colors.foreground }]}>
                  {topCeleb.name}
                </Text>
                <Text style={[styles.signatureMeta, { color: colors.mutedForeground }]}>
                  {topName.count} {topName.count === 1 ? "look" : "looks"} channeled · tap for profile
                </Text>
              </View>
              <Feather name="chevron-right" size={16} color={topCeleb.accentColor} />
            </Pressable>

            <GoldButton
              label={`Channel ${topCeleb.name.split(" ")[0]} again`}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                router.push({
                  pathname: "/(tabs)/style",
                  params: { celebrity: topCeleb.id, celebName: topCeleb.name },
                });
              }}
            />
          </View>
        )}

        {/* ── Empty state CTA ── Editorial hero backdrop using gendered
            SPLASH_HEROES (same pattern as onboarding batch 104). Heavily
            dimmed via 3-stop gradient so the gold bookmark icon, title,
            body copy, and CTA remain perfectly legible. Replaces the
            previous solid `colors.card` background which read as flat. */}
        {empty && (() => {
          const heroKey: "men" | "women" =
            userProfile.gender === "Men" ? "men" : "women";
          return (
            <View style={[styles.emptyBlock, { borderColor: colors.border }]}>
              <Image
                source={SPLASH_HEROES[heroKey]}
                style={styles.emptyBackdrop}
                resizeMode="cover"
              />
              <LinearGradient
                colors={["rgba(11,11,12,0.55)", "rgba(11,11,12,0.88)", "rgba(11,11,12,0.96)"]}
                locations={[0, 0.5, 1]}
                style={StyleSheet.absoluteFill}
              />
              <View style={styles.emptyContent}>
                <Feather name="bookmark" size={28} color={colors.gold} />
                <Text style={[styles.emptyTitle, { color: colors.foreground }]}>
                  No activity yet
                </Text>
                <Text style={[styles.emptyBody, { color: colors.mutedForeground }]}>
                  Generate looks and save the ones you love. They'll appear here so you
                  can pick up where you left off.
                </Text>
                <GoldButton
                  label="Explore Styles"
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    router.replace("/(tabs)/explore");
                  }}
                />
              </View>
            </View>
          );
        })()}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  backBtn: {
    width: 22,
    height: 22,
    justifyContent: "center",
  },
  titleBlock: {
    paddingHorizontal: 20,
    marginBottom: 24,
    gap: 6,
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  title: {
    fontSize: 32,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 19,
  },
  block: {
    marginBottom: 28,
    gap: 12,
  },
  blockLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
    paddingHorizontal: 20,
  },
  recentScroll: {
    gap: 10,
    paddingHorizontal: 20,
    paddingRight: 30,
  },
  signatureCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    marginHorizontal: 20,
    paddingHorizontal: 14,
    paddingVertical: 16,
    borderWidth: 0.5,
    borderRadius: 2,
  },
  signaturePortrait: {
    width: 56,
    height: 56,
    borderRadius: 2,
    borderWidth: 0.5,
  },
  signatureAccent: {
    width: 4,
    height: 36,
    borderRadius: 2,
  },
  signatureName: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  signatureMeta: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  emptyBlock: {
    marginHorizontal: 20,
    borderWidth: 0.5,
    borderRadius: 2,
    overflow: "hidden",
  },
  emptyBackdrop: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
    opacity: 0.55,
  },
  emptyContent: {
    padding: 24,
    alignItems: "center",
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
  },
  emptyBody: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 4,
  },
});
