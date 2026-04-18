import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Modal,
  StyleSheet,
  Pressable,
  Animated,
} from "react-native";
import * as Haptics from "expo-haptics";
import {
  Typography,
  Spacing,
  Radius,
  Font,
  type ThemeColors,
} from "../constants/colors";
import { useColors } from "../hooks/useColors";
import { Button } from "./Button";

interface HoldToConfirmModalProps {
  visible: boolean;
  title: string;
  body: string;
  holdLabel: string;
  cancelLabel?: string;
  holdMs?: number;
  onCancel: () => void;
  onConfirm: () => void;
}

// Replaces a destructive Alert.alert with a deliberate hold-to-confirm gesture.
// User must press and hold for `holdMs` (default 2000ms) for onConfirm to fire.
// Releasing early resets progress. Used on the surrender flow so users don't
// lose money via a quick accidental tap.
export function HoldToConfirmModal({
  visible,
  title,
  body,
  holdLabel,
  cancelLabel = "Keep Going",
  holdMs = 2000,
  onCancel,
  onConfirm,
}: HoldToConfirmModalProps) {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const [isHolding, setIsHolding] = useState(false);
  const progress = useRef(new Animated.Value(0)).current;
  const animationRef = useRef<Animated.CompositeAnimation | null>(null);
  const confirmedRef = useRef(false);

  // Reset when modal is hidden
  useEffect(() => {
    if (!visible) {
      confirmedRef.current = false;
      setIsHolding(false);
      animationRef.current?.stop();
      animationRef.current = null;
      progress.setValue(0);
    }
  }, [visible, progress]);

  const startHold = () => {
    if (confirmedRef.current) return;
    setIsHolding(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    progress.setValue(0);
    const anim = Animated.timing(progress, {
      toValue: 1,
      duration: holdMs,
      useNativeDriver: false,
    });
    animationRef.current = anim;
    anim.start(({ finished }) => {
      if (finished && !confirmedRef.current) {
        confirmedRef.current = true;
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        onConfirm();
      }
    });
  };

  const stopHold = () => {
    if (confirmedRef.current) return;
    setIsHolding(false);
    animationRef.current?.stop();
    animationRef.current = null;
    Animated.timing(progress, {
      toValue: 0,
      duration: 200,
      useNativeDriver: false,
    }).start();
  };

  const progressWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.body}>{body}</Text>

          <Pressable
            onPressIn={startHold}
            onPressOut={stopHold}
            style={({ pressed }) => [
              styles.holdButton,
              pressed && styles.holdButtonPressed,
            ]}
          >
            <Animated.View
              style={[styles.holdProgress, { width: progressWidth }]}
            />
            <Text style={styles.holdLabel}>
              {isHolding ? "Keep holding…" : holdLabel}
            </Text>
          </Pressable>

          <Text style={styles.hint}>Press and hold for 2 seconds.</Text>

          <Button
            title={cancelLabel}
            onPress={onCancel}
            variant="outline"
            size="medium"
          />
        </View>
      </View>
    </Modal>
  );
}

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    backdrop: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      paddingHorizontal: Spacing.lg,
    },
    card: {
      backgroundColor: Colors.background,
      borderRadius: Radius.xl,
      padding: Spacing.lg,
      gap: Spacing.md,
    },
    title: {
      fontSize: Typography.titleLarge,
      ...Font.bold,
      color: Colors.text,
    },
    body: {
      fontSize: Typography.bodyMedium,
      color: Colors.textSecondary,
      lineHeight: 22,
    },
    holdButton: {
      position: "relative",
      overflow: "hidden",
      backgroundColor: Colors.lossLight,
      borderWidth: 1,
      borderColor: Colors.loss,
      borderRadius: Radius.lg,
      paddingVertical: Spacing.md,
      alignItems: "center",
      justifyContent: "center",
      minHeight: 56,
    },
    holdButtonPressed: {
      opacity: 0.9,
    },
    holdProgress: {
      position: "absolute",
      left: 0,
      top: 0,
      bottom: 0,
      backgroundColor: Colors.loss,
      opacity: 0.35,
    },
    holdLabel: {
      fontSize: Typography.titleSmall,
      ...Font.semibold,
      color: Colors.loss,
      zIndex: 1,
    },
    hint: {
      fontSize: Typography.labelSmall,
      color: Colors.textMuted,
      textAlign: "center",
    },
  });
