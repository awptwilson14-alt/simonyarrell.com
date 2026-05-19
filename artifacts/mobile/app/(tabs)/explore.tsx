import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { CelebrityCard } from "@/components/CelebrityCard";
import { TrendCard } from "@/components/TrendCard";
import { CELEBRITIES, TRENDS } from "@/constants/data";
import { useColors } from "@/hooks/useColors";

type Tab = "trends" | "celebrities";

export default function ExploreScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>("trends");
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topPad }]}>
        <View style={styles.headerContent}>
          <Text style={[styles.screenTitle, { color: colors.foreground }]}>Explore</Text>
          <View style={[styles.tabBar, { borderColor: colors.border }]}>
            {(["trends", "celebrities"] as Tab[]).map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[
                  styles.tabItem,
                  {
                    backgroundColor: activeTab === tab ? colors.gold : "transparent",
                  },
                ]}
              >
                <Text
                  style={[
                    styles.tabText,
                    { color: activeTab === tab ? "#080808" : colors.mutedForeground },
                  ]}
                >
                  {tab === "trends" ? "TRENDS" : "CELEBRITIES"}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.content,
          { paddingBottom: 100 + (Platform.OS === "web" ? 34 : insets.bottom) },
        ]}
      >
        {activeTab === "trends" && (
          <View style={styles.trendsGrid}>
            {TRENDS.map((trend, i) => (
              <View
                key={trend.id}
                style={i % 2 === 0 ? styles.trendLeft : styles.trendRight}
              >
                <TrendCard
                  trend={trend}
                  onPress={() => router.push("/(tabs)/style")}
                  size={i < 2 ? "large" : "small"}
                />
              </View>
            ))}
          </View>
        )}

        {activeTab === "celebrities" && (
          <View style={styles.celebList}>
            <Text style={[styles.sectionNote, { color: colors.mutedForeground }]}>
              TAP ANY CELEBRITY TO GENERATE LOOKS INSPIRED BY THEIR STYLE
            </Text>
            {CELEBRITIES.map((celeb) => (
              <CelebrityCard
                key={celeb.id}
                celebrity={celeb}
                onPress={() =>
                  router.push({ pathname: "/(tabs)/style", params: { celebrity: celeb.id } })
                }
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingBottom: 0,
  },
  headerContent: {
    paddingHorizontal: 20,
    paddingBottom: 16,
    gap: 16,
  },
  screenTitle: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.3,
    paddingTop: 16,
  },
  tabBar: {
    flexDirection: "row",
    borderWidth: 0.5,
    borderRadius: 2,
    overflow: "hidden",
  },
  tabItem: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
  },
  tabText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 1.5,
  },
  content: {
    padding: 20,
    gap: 12,
  },
  trendsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  trendLeft: {
    width: "48%",
  },
  trendRight: {
    width: "48%",
  },
  celebList: {
    gap: 4,
  },
  sectionNote: {
    fontSize: 9,
    fontFamily: "Inter_500Medium",
    letterSpacing: 1.5,
    marginBottom: 8,
  },
});
