import { Image } from "expo-image";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
  useWindowDimensions,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { Feather } from "@expo/vector-icons";

export type ZoomSource = number | { uri: string };

interface ZoomableImageProps {
  /** Full-res image revealed enlarged. When null the tap is a no-op (e.g. a
   *  piece with no photo that renders the editorial fallback tile) so we never
   *  present a false "tap to enlarge" affordance over a placeholder. */
  source: ZoomSource | null;
  /** The normal-size thumbnail rendered inline. */
  children: React.ReactNode;
  /** Optional style forwarded to the inline trigger Pressable. */
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

/**
 * Tap-to-enlarge lightbox. Tapping the thumbnail opens the image full-screen
 * over a dim backdrop; tapping the enlarged image again (or the ✕) shrinks it
 * back. Wired into generated look pieces so users can inspect each item up
 * close. No-op when `source` is null so fallback tiles keep no false
 * affordance. Modal + expo-image both render correctly on web and native, and
 * only Pressable/View/Image array styles are used (never a DOM-host style
 * array), so this is safe on the web preview too.
 */
export function ZoomableImage({ source, children, style, accessibilityLabel }: ZoomableImageProps) {
  const [open, setOpen] = useState(false);
  const { width: screenW, height: screenH } = useWindowDimensions();

  const show = () => {
    if (!source) return;
    if (Platform.OS !== "web") Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setOpen(true);
  };
  const hide = () => setOpen(false);

  return (
    <>
      <Pressable
        onPress={show}
        disabled={!source}
        accessibilityLabel={accessibilityLabel}
        accessibilityRole={source ? "imagebutton" : undefined}
        accessibilityHint={source ? "Enlarge image" : undefined}
        style={({ pressed }) => [style, pressed && source ? { opacity: 0.85 } : null]}
      >
        {children}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={hide}
        statusBarTranslucent
      >
        {/* Tapping anywhere on the backdrop (including the image) closes it —
            "tap again to make it smaller". */}
        <Pressable style={styles.backdrop} onPress={hide} accessibilityLabel="Close enlarged image">
          {source ? (
            <Image
              source={source}
              style={{ width: screenW - 32, height: screenH - 160 }}
              contentFit="contain"
              transition={150}
            />
          ) : null}
          {/* Visual close hint only — the backdrop Pressable handles the tap. */}
          <View style={styles.closeBtn} pointerEvents="none">
            <Feather name="x" size={22} color="#F5F5F0" />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(11,11,12,0.94)",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  closeBtn: {
    position: "absolute",
    top: 48,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.14)",
    alignItems: "center",
    justifyContent: "center",
  },
});
