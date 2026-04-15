import React, { useState, useMemo, useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Typography,
  Spacing,
  Radius,
  Font,
  type ThemeColors,
} from "../../src/constants/colors";
import { useColors } from "../../src/hooks/useColors";
import {
  AuthScreenScaffold,
  Button,
  withErrorBoundary,
} from "../../src/components";

const DAILY_OPTIONS = [
  { label: "< 2 hrs", hoursPerDay: 1.5 },
  { label: "2–3 hrs", hoursPerDay: 2.5 },
  { label: "3–5 hrs", hoursPerDay: 4 },
  { label: "5–7 hrs", hoursPerDay: 6 },
  { label: "7+ hrs", hoursPerDay: 8 },
];

const YEARS_REMAINING = 60; // rough avg life-span remaining for a college-age user
const NIYAH_RECLAIM_FACTOR = 0.5; // claim we help recover 50% of screen time

function ScreenTimeMathScreenInner() {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const router = useRouter();

  const [selected, setSelected] = useState<number | null>(null);

  const handleNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    router.replace("/(auth)/screentime-setup" as never);
  }, [router]);

  const pick = useCallback((hours: number) => {
    Haptics.selectionAsync();
    setSelected(hours);
  }, []);

  const totalYearsLost = selected
    ? Math.round((selected * 365 * YEARS_REMAINING) / 24 / 365)
    : null;
  const reclaimed = totalYearsLost
    ? Math.round(totalYearsLost * NIYAH_RECLAIM_FACTOR)
    : null;

  return (
    <AuthScreenScaffold
      showBack={false}
      scrollable={false}
      keyboardAware={false}
      title="How much do you use your phone?"
      subtitle="Ballpark is fine."
    >
      <View style={styles.progressBar}>
        <View style={styles.progressFill} />
      </View>

      <View style={styles.options}>
        {DAILY_OPTIONS.map((opt) => {
          const isSelected = selected === opt.hoursPerDay;
          return (
            <Pressable
              key={opt.label}
              onPress={() => pick(opt.hoursPerDay)}
              style={[styles.option, isSelected && styles.optionSelected]}
            >
              <Text
                style={[
                  styles.optionText,
                  isSelected && styles.optionTextSelected,
                ]}
              >
                {opt.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {selected !== null && totalYearsLost !== null && reclaimed !== null && (
        <View style={styles.projection}>
          <Text style={styles.projHeadline}>
            That's about{" "}
            <Text style={styles.projBig}>{totalYearsLost} years</Text> of your
            life on a screen.
          </Text>
          <Text style={styles.projSub}>
            Niyah can help you reclaim up to{" "}
            <Text style={styles.projBigReclaim}>{reclaimed} years</Text>.
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Button
          title="Let's fix that"
          onPress={handleNext}
          disabled={selected === null}
          size="large"
        />
      </View>
    </AuthScreenScaffold>
  );
}

const ScreenTimeMathScreen = withErrorBoundary(
  ScreenTimeMathScreenInner,
  "screen-time-math",
);
export default ScreenTimeMathScreen;

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    progressBar: {
      height: 4,
      backgroundColor: Colors.backgroundTertiary,
      borderRadius: Radius.full,
      marginTop: Spacing.sm,
      marginBottom: Spacing.lg,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      width: "50%",
      backgroundColor: Colors.primary,
      borderRadius: Radius.full,
    },
    options: {
      gap: Spacing.sm,
      marginBottom: Spacing.lg,
    },
    option: {
      padding: Spacing.md,
      borderRadius: Radius.lg,
      borderWidth: 1.5,
      borderColor: Colors.border,
      backgroundColor: Colors.backgroundCard,
      alignItems: "center",
    },
    optionSelected: {
      borderColor: Colors.primary,
      backgroundColor: Colors.primaryMuted,
    },
    optionText: {
      fontSize: Typography.bodyLarge,
      ...Font.semibold,
      color: Colors.text,
    },
    optionTextSelected: {
      color: Colors.primary,
    },
    projection: {
      padding: Spacing.lg,
      borderRadius: Radius.lg,
      backgroundColor: Colors.backgroundCard,
      borderWidth: 1,
      borderColor: Colors.primary,
      gap: Spacing.sm,
    },
    projHeadline: {
      fontSize: Typography.bodyLarge,
      color: Colors.text,
      lineHeight: Typography.bodyLarge * 1.4,
    },
    projBig: {
      ...Font.bold,
      color: Colors.loss,
      fontSize: Typography.titleMedium,
    },
    projSub: {
      fontSize: Typography.bodyMedium,
      color: Colors.textSecondary,
      lineHeight: Typography.bodyMedium * 1.4,
    },
    projBigReclaim: {
      ...Font.bold,
      color: Colors.gain,
      fontSize: Typography.bodyLarge,
    },
    footer: {
      marginTop: "auto",
      paddingVertical: Spacing.lg,
    },
  });
