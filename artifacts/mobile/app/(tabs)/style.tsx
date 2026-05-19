import * as Haptics from "expo-haptics";
import React, { useRef, useState } from "react";
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
import { Feather } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";

import { FilterChips } from "@/components/FilterChips";
import { GoldButton } from "@/components/GoldButton";
import { LookCard } from "@/components/LookCard";
import { BUDGETS, GENDERS, LOOKS, OCCASIONS, SEASONS } from "@/constants/data";
import { useColors } from "@/hooks/useColors";

const PROMPTS = [
  "A day at the Louvre followed by dinner at Costes",
  "Yacht party off the Amalfi Coast",
  "Opening night at the Met Gala",
  "Brooklyn art opening on a Saturday",
  "Business lunch in Tokyo's Roppongi Hills",
];

export default function StyleScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const inputRef = useRef<TextInput>(null);
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const [prompt, setPrompt] = useState("");
  const [occasion, setOccasion] = useState(OCCASIONS[0]);
  const [season, setSeason] = useState(SEASONS[0]);
  const [budget, setBudget] = useState(BUDGETS[1]);
  const [gender, setGender] = useState(GENDERS[0]);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<typeof LOOKS>([]);
  const [generated, setGenerated] = useState(false);

  const generate = async () => {
    if (!prompt.trim() && !generated) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setLoading(true);
    setResults([]);
    inputRef.current?.blur();

    await new Promise((r) => setTimeout(r, 2200));

    const filtered = LOOKS.filter(
      (l) =>
        l.occasion.toLowerCase() === occasion.toLowerCase() ||
        l.style.toLowerCase().includes("luxe") ||
        true
    ).slice(0, 3);

    setResults(filtered.length > 0 ? filtered : LOOKS.slice(0, 3));
    setGenerated(true);
    setLoading(false);
  };

  const examplePress = (p: string) => {
    setPrompt(p);
    Haptics.selectionAsync();
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingTop: topPad + 16, paddingBottom: 100 + (Platform.OS === "web" ? 34 : insets.bottom) },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.headerSection}>
          <Text style={[styles.eyebrow, { color: colors.gold }]}>AI STYLIST</Text>
          <Text style={[styles.title, { color: colors.foreground }]}>
            What are you{"\n"}dressing for?
          </Text>
          <Text style={[styles.subtitle, { color: colors.mutedForeground }]}>
            Describe your moment and we'll build the perfect look.
          </Text>
        </View>

        {/* Prompt Input */}
        <View style={styles.inputSection}>
          <View
            style={[
              styles.inputWrapper,
              { borderColor: prompt.length > 0 ? colors.gold : colors.border, backgroundColor: colors.input },
            ]}
          >
            <Feather name="edit-2" size={16} color={colors.mutedForeground} style={styles.inputIcon} />
            <TextInput
              ref={inputRef}
              value={prompt}
              onChangeText={setPrompt}
              placeholder="Describe your style moment..."
              placeholderTextColor={colors.mutedForeground}
              style={[styles.input, { color: colors.foreground }]}
              multiline
              returnKeyType="done"
            />
            {prompt.length > 0 && (
              <Pressable onPress={() => setPrompt("")} hitSlop={12}>
                <Feather name="x" size={16} color={colors.mutedForeground} />
              </Pressable>
            )}
          </View>

          {/* Example Prompts */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.examples}>
            {PROMPTS.map((p) => (
              <Pressable
                key={p}
                onPress={() => examplePress(p)}
                style={[styles.exampleChip, { borderColor: colors.border }]}
              >
                <Text style={[styles.exampleText, { color: colors.mutedForeground }]} numberOfLines={1}>
                  {p}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>

        {/* Filters */}
        <View style={[styles.filtersCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <FilterChips options={GENDERS} selected={gender} onSelect={setGender} label="FOR" />
          <FilterChips options={OCCASIONS} selected={occasion} onSelect={setOccasion} label="OCCASION" />
          <FilterChips options={SEASONS} selected={season} onSelect={setSeason} label="SEASON" />
          <FilterChips options={BUDGETS} selected={budget} onSelect={setBudget} label="BUDGET" />
        </View>

        {/* Generate Button */}
        <GoldButton
          label={loading ? "Styling..." : generated ? "Regenerate Look" : "Generate Look"}
          onPress={generate}
          loading={loading}
          disabled={!prompt.trim() && !generated}
        />

        {/* Results */}
        {loading && (
          <View style={styles.loadingSection}>
            <ActivityIndicator color={colors.gold} size="large" />
            <Text style={[styles.loadingText, { color: colors.mutedForeground }]}>
              Curating your perfect look...
            </Text>
          </View>
        )}

        {results.length > 0 && !loading && (
          <View style={styles.resultsSection}>
            <View style={styles.resultsHeader}>
              <Text style={[styles.resultsTitle, { color: colors.foreground }]}>
                Your Curated Looks
              </Text>
              <View style={[styles.resultsBadge, { backgroundColor: "rgba(201,168,76,0.12)", borderColor: colors.gold }]}>
                <Text style={[styles.resultsBadgeText, { color: colors.gold }]}>
                  {results.length} LOOKS
                </Text>
              </View>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.resultsList}>
              {results.map((look) => (
                <LookCard key={look.id} look={look} />
              ))}
            </ScrollView>
          </View>
        )}

        {generated && results.length > 0 && !loading && (
          <View style={styles.actions}>
            <GoldButton label="See All Results" onPress={() => {}} variant="outline" />
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: {
    paddingHorizontal: 20,
    gap: 28,
  },
  headerSection: {
    gap: 8,
  },
  eyebrow: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 4,
  },
  title: {
    fontSize: 34,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 21,
  },
  inputSection: {
    gap: 12,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "flex-start",
    borderWidth: 0.5,
    borderRadius: 2,
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 10,
  },
  inputIcon: {
    marginTop: 2,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    lineHeight: 22,
    minHeight: 44,
  },
  examples: {
    flexDirection: "row",
  },
  exampleChip: {
    borderWidth: 0.5,
    borderRadius: 2,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
    maxWidth: 220,
  },
  exampleText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.2,
  },
  filtersCard: {
    borderWidth: 0.5,
    borderRadius: 2,
    padding: 16,
    gap: 20,
  },
  loadingSection: {
    alignItems: "center",
    paddingVertical: 32,
    gap: 16,
  },
  loadingText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.5,
  },
  resultsSection: {
    gap: 16,
  },
  resultsHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  resultsTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  resultsBadge: {
    borderWidth: 0.5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 2,
  },
  resultsBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  resultsList: {
    paddingRight: 8,
  },
  actions: {
    gap: 12,
  },
});
