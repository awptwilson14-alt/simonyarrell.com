import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  onSeeAll?: () => void;
}

export function SectionHeader({ title, subtitle, onSeeAll }: SectionHeaderProps) {
  const colors = useColors();
  return (
    <View style={styles.container}>
      <View style={styles.left}>
        <Text style={[styles.title, { color: colors.foreground }]}>{title}</Text>
        {/* Editorial gold hairline rule under the title — classic luxury
            magazine section-header convention (Vogue, Bazaar, Hommes). 28px
            wide, hairline thin, gold-tinted, sits between title and subtitle
            so it reads as a deliberate flourish rather than divider noise.
            Single atom upgrade flows into every section header across home,
            explore, closet, shop, profile — ~20+ surfaces. */}
        <View style={[styles.rule, { backgroundColor: colors.gold }]} />
        {subtitle && (
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>{subtitle}</Text>
        )}
      </View>
      {onSeeAll && (
        <Pressable
          onPress={onSeeAll}
          hitSlop={8}
          style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
        >
          <Text style={[styles.seeAll, { color: colors.gold }]}>SEE ALL</Text>
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  left: {
    gap: 6,
    flex: 1,
    paddingRight: 12,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
  },
  rule: {
    width: 28,
    height: 1,
    opacity: 0.7,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.3,
    marginTop: -2,
  },
  seeAll: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 2,
  },
});
