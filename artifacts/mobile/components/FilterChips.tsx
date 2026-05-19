import * as Haptics from "expo-haptics";
import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

interface FilterChipsProps {
  options: string[];
  selected: string;
  onSelect: (value: string) => void;
  label?: string;
}

export function FilterChips({ options, selected, onSelect, label }: FilterChipsProps) {
  const colors = useColors();

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      )}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scroll}>
        {options.map((option) => {
          const active = selected === option;
          return (
            <Pressable
              key={option}
              onPress={() => {
                Haptics.selectionAsync();
                onSelect(option);
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.gold : "transparent",
                  borderColor: active ? colors.gold : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: active ? "#080808" : colors.mutedForeground },
                ]}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

interface MultiFilterChipsProps {
  options: string[];
  selected: string[];
  onToggle: (value: string) => void;
  label?: string;
}

export function MultiFilterChips({ options, selected, onToggle, label }: MultiFilterChipsProps) {
  const colors = useColors();

  return (
    <View style={styles.wrapper}>
      {label && (
        <Text style={[styles.label, { color: colors.mutedForeground }]}>{label}</Text>
      )}
      <View style={styles.wrap}>
        {options.map((option) => {
          const active = selected.includes(option);
          return (
            <Pressable
              key={option}
              onPress={() => {
                Haptics.selectionAsync();
                onToggle(option);
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: active ? colors.gold : "transparent",
                  borderColor: active ? colors.gold : colors.border,
                },
              ]}
            >
              <Text
                style={[
                  styles.chipText,
                  { color: active ? "#080808" : colors.mutedForeground },
                ]}
              >
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 10,
  },
  label: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  scroll: {
    flexDirection: "row",
  },
  wrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    borderWidth: 0.5,
    borderRadius: 2,
    paddingHorizontal: 14,
    paddingVertical: 8,
    marginRight: 8,
  },
  chipText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.5,
  },
});
