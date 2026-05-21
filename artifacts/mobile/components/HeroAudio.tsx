import * as Haptics from "expo-haptics";
import { useAudioPlayer } from "expo-audio";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useEffect, useState } from "react";
import { Platform, Pressable, StyleSheet, View } from "react-native";
import { Feather } from "@expo/vector-icons";

const MUTE_PREF_KEY = "maisonSimon:heroAudioMuted";

/**
 * Ambient hero audio with a floating speaker toggle. Loops a short bed track
 * behind the home hero. Starts MUTED — browser/native autoplay policies
 * reject auto-playing sound without a user gesture, and unsolicited audio is
 * intrusive on a luxury surface. The user taps the speaker once to unmute;
 * the player keeps looping silently in the meantime so unmuting is instant.
 *
 * Position is absolute (top-right of the hero by default). Parent supplies
 * the `top` offset so it can clear the safe-area / floating header.
 */
interface HeroAudioProps {
  top: number;
}

const AUDIO_SRC = require("../assets/audio/hero.mp4");

export function HeroAudio({ top }: HeroAudioProps) {
  const player = useAudioPlayer(AUDIO_SRC);
  const [muted, setMuted] = useState(true);

  // Configure loop + warm playback on mount, then restore the user's last
  // mute preference from AsyncStorage. We always START muted to satisfy web
  // autoplay policy (which rejects unsolicited sound), then — if the user
  // previously chose to unmute — flip muted=false. On native, this results
  // in seamless ambient sound on cold-start for returning users. On web, the
  // browser will keep playback paused until the next user gesture even if
  // muted=false; the speaker icon still reflects the saved preference so
  // returning users see the correct state.
  useEffect(() => {
    let cancelled = false;
    try {
      player.loop = true;
      player.muted = true;
      player.volume = 0.6;
      player.play();
    } catch {
      // Defensive — autoplay rejection or platform quirk shouldn't crash
      // the home screen. The toggle still works on subsequent user taps.
    }
    AsyncStorage.getItem(MUTE_PREF_KEY)
      .then((raw) => {
        if (cancelled) return;
        // Default to muted (raw === null on first launch). Only explicit
        // "false" string flips it. Keeps cold-start respectful.
        if (raw === "false") {
          setMuted(false);
          try {
            player.muted = false;
            player.play();
          } catch {
            /* swallow — see above */
          }
        }
      })
      .catch(() => {
        // Storage read failure is non-fatal; default muted state stands.
      });
    return () => {
      cancelled = true;
    };
  }, [player]);

  const toggle = () => {
    if (Platform.OS !== "web") {
      Haptics.selectionAsync();
    }
    const next = !muted;
    setMuted(next);
    try {
      player.muted = next;
      // Re-issue play() on every unmute — a user gesture is what web
      // autoplay policies require, and replay is idempotent if already
      // playing on native.
      if (!next) player.play();
    } catch {
      // Same defensive swallow — UI state still flips so the user sees feedback.
    }
    // Persist preference (fire-and-forget). String form so a future v2 of
    // the key can encode richer state (volume, last track) without breaking.
    AsyncStorage.setItem(MUTE_PREF_KEY, next ? "true" : "false").catch(() => {
      // Storage write failure is non-fatal — UI/audio already updated.
    });
  };

  return (
    <View style={[styles.wrap, { top }]} pointerEvents="box-none">
      <Pressable
        onPress={toggle}
        hitSlop={10}
        style={({ pressed }) => [
          styles.btn,
          { opacity: pressed ? 0.7 : 0.9 },
        ]}
        accessibilityLabel={muted ? "Unmute hero audio" : "Mute hero audio"}
        accessibilityRole="button"
      >
        <Feather
          name={muted ? "volume-x" : "volume-2"}
          size={14}
          color="#F5F5F0"
        />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: "absolute",
    right: 20,
    zIndex: 10,
  },
  btn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(11,11,12,0.55)",
    borderWidth: 0.5,
    borderColor: "rgba(198,167,94,0.5)",
    alignItems: "center",
    justifyContent: "center",
  },
});
