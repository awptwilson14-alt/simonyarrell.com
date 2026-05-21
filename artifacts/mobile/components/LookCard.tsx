import * as Haptics from "expo-haptics";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
  type ImageSourcePropType,
} from "react-native";
import { Feather } from "@expo/vector-icons";

import { Look, TRENDS } from "@/constants/data";
import { useApp } from "@/context/AppContext";
import { useColors } from "@/hooks/useColors";
import { pickStyleHero } from "@/constants/heroImages";
import { findCelebByName } from "@/lib/celebLookup";

// Last-resort fallbacks if the look's image source ever fails to load.
// All current pools are local PNGs so this should be unreachable in practice,
// but the safety net guarantees a card can never render as a black rectangle.
// Both gender variants supplied so the fallback respects the user's profile —
// a female user must never see a male editorial as a fallback, and vice versa.
type GenderedSource = { men: ImageSourcePropType; women: ImageSourcePropType };
const STYLE_FALLBACK: Record<string, GenderedSource> = {
  "Old Money":         { men: require("../assets/images/looks/old_money_weekend_men.png"),    women: require("../assets/images/looks/old_money_weekend_women.png") },
  "Luxury Streetwear": { men: require("../assets/images/looks/luxury_streetwear_icon_men.png"), women: require("../assets/images/looks/luxury_streetwear_icon_women.png") },
  "Vacation Luxe":     { men: require("../assets/images/looks/resort_billionaire_men.png"),   women: require("../assets/images/looks/resort_billionaire_women.png") },
  Techwear:            { men: require("../assets/images/looks/urban_architect_men.png"),      women: require("../assets/images/looks/urban_architect_women.png") },
  "Clean Minimal":     { men: require("../assets/images/looks/urban_minimalist_men.png"),     women: require("../assets/images/looks/urban_minimalist_women.png") },
  "Y2K Revival":       { men: require("../assets/images/looks/y2k_soiree_men.png"),           women: require("../assets/images/looks/y2k_soiree_women.png") },
  Business:            { men: require("../assets/images/looks/power_dressing_men.png"),       women: require("../assets/images/looks/power_dressing_women.png") },
  Evening:             { men: require("../assets/images/looks/gala_glamour_men.png"),         women: require("../assets/images/looks/gala_glamour_women.png") },
  Formal:              { men: require("../assets/images/looks/gala_glamour_men.png"),         women: require("../assets/images/looks/gala_glamour_women.png") },
  "Avant-garde":       { men: require("../assets/images/looks/gala_glamour_men.png"),         women: require("../assets/images/looks/gala_glamour_women.png") },
};
const UNIVERSAL_FALLBACK: GenderedSource = {
  men:   require("../assets/images/looks/parisian_chic_men.png"),
  women: require("../assets/images/looks/parisian_chic_women.png"),
};

const { width } = Dimensions.get("window");

interface LookCardProps {
  look: Look;
  width?: number;
  showSave?: boolean;
}

export function LookCard({ look, width: cardWidth, showSave = true }: LookCardProps) {
  const colors = useColors();
  const { isLookSaved, saveLook, unsaveLook, userProfile } = useApp();
  const router = useRouter();
  const saved = isLookSaved(look.id);
  const w = cardWidth ?? width * 0.62;
  const [imgFailed, setImgFailed] = useState(false);
  const g: "men" | "women" =
    (userProfile.gender ?? "").toLowerCase() === "men" ? "men" : "women";
  const fallback =
    pickStyleHero(look.style, userProfile.gender, look.id) ??
    (STYLE_FALLBACK[look.style]?.[g]) ??
    UNIVERSAL_FALLBACK[g];
  const source = imgFailed ? fallback : look.image;

  const toggleSave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    if (saved) unsaveLook(look.id);
    else saveLook(look);
  };

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/look/[id]", params: { id: look.id } })}
      style={({ pressed }) => [
        styles.card,
        { width: w, backgroundColor: colors.card, opacity: pressed ? 0.92 : 1 },
      ]}
    >
      <View style={styles.imageContainer}>
        <Image
          source={source}
          style={[styles.image, { width: w, backgroundColor: colors.secondary }]}
          resizeMode="cover"
          onError={() => setImgFailed(true)}
        />
        {showSave && (
          <Pressable onPress={toggleSave} style={styles.saveBtn} hitSlop={12}>
            <Feather name={saved ? "heart" : "heart"} size={18} color={saved ? colors.gold : "#fff"} />
          </Pressable>
        )}
        {/* Batch 68: styleTag is tappable when look.style is a TREND →
            /(tabs)/style with trendHint pre-loaded (mirrors look-detail
            style pill from batch 45). Nested Pressable inside the outer
            card Pressable is the same proven pattern as the saveBtn at
            line 89 — RN doesn't bubble when the inner handles the tap.
            Non-trend styles render the existing plain View (fail-closed,
            no false affordance). chevron size 9 matches the tag's tight
            10pt typography. */}
        {TRENDS.some((t) => t.name === look.style) ? (
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.push({ pathname: "/(tabs)/style", params: { trendHint: look.style } });
            }}
            hitSlop={6}
            style={({ pressed }) => [styles.styleTag, { opacity: pressed ? 0.7 : 1 }]}
          >
            <Text style={styles.styleTagText}>{look.style}</Text>
            <Feather name="chevron-right" size={9} color="#080808" />
          </Pressable>
        ) : (
          <View style={styles.styleTag}>
            <Text style={styles.styleTagText}>{look.style}</Text>
          </View>
        )}
        {look.inspiredBy ? (() => {
          // Resolve celeb record to tint the INSPIRED BY tag in the icon's
          // accentColor — visual continuity with batches 22/26/28/32/33/34.
          // Falls back to gold when the inspiredBy name isn't a CELEBS entry
          // (legacy / removed icons). Single-sourced via findCelebByName.
          // Batch 68: also gates tappability — when linked resolves, the
          // tag becomes a Pressable → /celebrity/[id] (mirrors look-detail
          // INSPIRED BY chip from batch 26). When linked is null (legacy
          // celeb removed from CELEBS), renders the existing plain View
          // — fail-closed, no false affordance. Same outer-card nested-
          // Pressable pattern as styleTag above and saveBtn at line 89.
          const linked = findCelebByName(look.inspiredBy);
          const tint = linked?.accentColor ?? colors.gold;
          const inner = (
            <>
              <Feather name="star" size={9} color={tint} />
              <Text style={[styles.inspiredTagText, { color: tint }]} numberOfLines={1}>
                {look.inspiredBy.split(" ")[0].toUpperCase()}
              </Text>
              {linked && <Feather name="chevron-right" size={9} color={tint} />}
            </>
          );
          return linked ? (
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                router.push(`/celebrity/${linked.id}`);
              }}
              hitSlop={6}
              style={({ pressed }) => [
                styles.inspiredTag,
                { borderColor: `${tint}80`, opacity: pressed ? 0.7 : 1 },
              ]}
            >
              {inner}
            </Pressable>
          ) : (
            <View style={[styles.inspiredTag, { borderColor: `${tint}80` }]}>
              {inner}
            </View>
          );
        })() : null}
      </View>
      <View style={[styles.info, { borderTopColor: colors.border }]}>
        <Text style={[styles.name, { color: colors.foreground }]} numberOfLines={1}>
          {look.name}
        </Text>
        <View style={styles.meta}>
          <Text style={[styles.occasion, { color: colors.mutedForeground }]}>{look.occasion}</Text>
          <Text style={[styles.price, { color: colors.gold }]}>
            ${look.estimatedPrice.toLocaleString()}
          </Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 2,
    overflow: "hidden",
    marginRight: 12,
  },
  imageContainer: {
    position: "relative",
  },
  image: {
    height: 320,
  },
  saveBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
    padding: 8,
  },
  styleTag: {
    position: "absolute",
    bottom: 12,
    left: 12,
    backgroundColor: "rgba(201,168,76,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    // flexDirection added in batch 68 so the optional chevron sits inline
    // with the style name on tappable (TREND-matching) tags. No-op for
    // single-child non-trend tags.
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  styleTagText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#080808",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  inspiredTag: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(11,11,12,0.78)",
    borderWidth: 0.5,
    paddingHorizontal: 7,
    paddingVertical: 3,
    maxWidth: 130,
  },
  inspiredTagText: {
    fontSize: 9,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  info: {
    padding: 12,
    borderTopWidth: 0.5,
    gap: 4,
  },
  name: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
  meta: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  occasion: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    letterSpacing: 1,
    textTransform: "uppercase",
  },
  price: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
  },
});
