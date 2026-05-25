import { Feather } from "@expo/vector-icons";
import { Link, usePathname } from "expo-router";
import React from "react";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";
import { useResponsive } from "@/hooks/useResponsive";

// Desktop top-nav (≥1024px web only). Renders nothing on mobile/tablet or
// native — the existing bottom tab bar continues to own those breakpoints.
// Acts as a peer to the tab bar, not a replacement: this is appended above
// the screen content via the (tabs) layout, and the bottom tab bar is
// hidden via tabBarStyle:{display:"none"} on the same breakpoint.

type NavItem = {
  href:
    | "/"
    | "/explore"
    | "/style"
    | "/shop"
    | "/closet"
    | "/profile";
  label: string;
};

const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Home" },
  { href: "/explore", label: "Explore" },
  { href: "/style", label: "Style AI" },
  { href: "/shop", label: "Shop" },
  { href: "/closet", label: "Closet" },
  { href: "/profile", label: "Profile" },
];

export function DesktopNav() {
  const { isDesktop, maxContentWidth } = useResponsive();
  const colors = useColors();
  const pathname = usePathname();

  if (!isDesktop || Platform.OS !== "web") return null;

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: "#050505",
          borderBottomColor: colors.gold,
        },
      ]}
    >
      <View style={[styles.inner, { maxWidth: maxContentWidth }]}>
        <Link href="/" asChild>
          <Pressable style={styles.brand} hitSlop={6}>
            <Feather name="award" size={16} color={colors.gold} />
            <Text style={[styles.brandText, { color: colors.gold }]}>
              SIMON YARRELL
            </Text>
          </Pressable>
        </Link>

        <View style={styles.links}>
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/" || pathname === "/index"
                : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href} asChild>
                <Pressable hitSlop={6}>
                  <Text
                    style={[
                      styles.linkText,
                      {
                        color: isActive ? colors.gold : colors.foreground,
                        opacity: isActive ? 1 : 0.78,
                      },
                    ]}
                  >
                    {item.label.toUpperCase()}
                  </Text>
                </Pressable>
              </Link>
            );
          })}
        </View>

        <Link href="/membership" asChild>
          <Pressable
            style={[styles.cta, { borderColor: colors.gold }]}
            hitSlop={6}
          >
            <Text style={[styles.ctaText, { color: colors.gold }]}>
              MEMBERSHIP
            </Text>
          </Pressable>
        </Link>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    width: "100%",
    height: 72,
    borderBottomWidth: 1,
    alignItems: "center",
  },
  inner: {
    flex: 1,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 40,
    alignSelf: "center",
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  brandText: {
    fontFamily: "PlayfairDisplay_600SemiBold",
    fontSize: 18,
    letterSpacing: 3,
  },
  links: {
    flexDirection: "row",
    alignItems: "center",
    gap: 32,
  },
  linkText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
    letterSpacing: 2,
  },
  cta: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderWidth: 1,
    borderRadius: 2,
  },
  ctaText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
    letterSpacing: 2,
  },
});
