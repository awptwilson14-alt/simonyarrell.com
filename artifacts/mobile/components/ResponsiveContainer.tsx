import React, { useState } from "react";
import {
  LayoutChangeEvent,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

import { useResponsive } from "@/hooks/useResponsive";

// Centered max-width container for desktop. On mobile/tablet it's a no-op
// wrapper (width:100% passthrough), so screens stay edge-to-edge as
// designed for native. On desktop (≥1024px web) it caps content at
// 1400px and centers it horizontally for the luxury-site feel.
export function ResponsiveContainer({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: ViewStyle;
}) {
  const { isDesktop, maxContentWidth } = useResponsive();
  return (
    <View
      style={[
        styles.base,
        isDesktop && {
          maxWidth: maxContentWidth,
          alignSelf: "center",
          paddingHorizontal: 32,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

// Responsive column grid. 1 col on mobile, 2 on tablet, 4 on desktop.
// Width math is measured (onLayout) so column widths are exact pixels and
// can never overflow the parent — percent math + pixel gap don't compose
// reliably (e.g. 49% + 49% + 16px gap > 100% at narrow tablet widths and
// causes the last cell to wrap). We render children with width:undefined
// until the first layout pass to avoid a single-tick flash of unstyled
// columns.
export function ResponsiveGrid({
  children,
  gap = 16,
  mobileColumns = 1,
  tabletColumns = 2,
  desktopColumns = 4,
  paddingHorizontal,
}: {
  children: React.ReactNode;
  gap?: number;
  mobileColumns?: number;
  tabletColumns?: number;
  desktopColumns?: number;
  paddingHorizontal?: number;
}) {
  const { isMobile, isTablet, isDesktop } = useResponsive();
  const columns = isDesktop
    ? desktopColumns
    : isTablet
    ? tabletColumns
    : mobileColumns;
  const horizontalPadding =
    paddingHorizontal ?? (isMobile ? 16 : 32);

  const [innerWidth, setInnerWidth] = useState<number | null>(null);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0 && w !== innerWidth) setInnerWidth(w);
  };

  // Deterministic column width: subtract every gap, divide by column count.
  // Floor to avoid sub-pixel rounding pushing the last cell to a new row.
  const itemWidth =
    innerWidth == null
      ? undefined
      : Math.floor((innerWidth - gap * (columns - 1)) / columns);

  const items = React.Children.toArray(children);

  return (
    <View
      onLayout={onLayout}
      style={[
        styles.grid,
        { gap, paddingHorizontal: horizontalPadding },
      ]}
    >
      {items.map((child, index) => (
        <View
          key={index}
          style={itemWidth == null ? styles.itemPending : { width: itemWidth }}
        >
          {child}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    width: "100%",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    width: "100%",
  },
  itemPending: {
    // Pre-measurement: render off-axis so children don't pop in at full
    // width for one frame before the layout pass calculates pixel widths.
    width: 0,
    height: 0,
    opacity: 0,
  },
});
