import React, { useState, useMemo, useCallback } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView } from "react-native";
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
import { useAuthStore } from "../../src/store/authStore";
import { logger } from "../../src/utils/logger";

// ─── Questions ────────────────────────────────────────────────────────────────

const GOAL_OPTIONS: { value: number; label: string }[] = [
  { value: 1, label: "1 hour" },
  { value: 2, label: "2 hours" },
  { value: 3, label: "3 hours" },
  { value: 4, label: "4 hours" },
  { value: 6, label: "6+ hours" },
];

const DISTRACTION_OPTIONS = [
  "Endless scrolling on social media",
  "Notifications pulling me in",
  "Can't control myself",
  "Apps I've tried aren't serious enough",
  "Boredom",
  "Stress or anxiety",
];

const TRIED_APPS = [
  { id: "opal", label: "Opal" },
  { id: "brick", label: "Brick" },
  { id: "present", label: "Present" },
  { id: "screentime", label: "Apple Screen Time" },
  { id: "delete", label: "Deleting apps" },
  { id: "none", label: "Never tried anything" },
];

type Step = 0 | 1 | 2;

function IntakeScreenInner() {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const router = useRouter();
  const updateUser = useAuthStore((s) => s.updateUser);

  const [step, setStep] = useState<Step>(0);
  const [goalHours, setGoalHours] = useState<number | null>(null);
  const [distractions, setDistractions] = useState<string[]>([]);
  const [triedApps, setTriedApps] = useState<string[]>([]);

  const toggleDistraction = useCallback((item: string) => {
    Haptics.selectionAsync();
    setDistractions((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  }, []);

  const toggleTriedApp = useCallback((id: string) => {
    Haptics.selectionAsync();
    setTriedApps((prev) => {
      // "none" is exclusive
      if (id === "none") return prev.includes("none") ? [] : ["none"];
      const next = prev.filter((i) => i !== "none");
      return next.includes(id) ? next.filter((i) => i !== id) : [...next, id];
    });
  }, []);

  const canAdvance =
    (step === 0 && goalHours !== null) ||
    (step === 1 && distractions.length > 0) ||
    (step === 2 && triedApps.length > 0);

  const handleNext = useCallback(() => {
    if (!canAdvance) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (step < 2) {
      setStep((s) => (s + 1) as Step);
    } else {
      // Persist intake and advance
      try {
        updateUser({
          intake: {
            focusGoalHoursPerDay: goalHours ?? undefined,
            distractionReasons: distractions,
            triedApps,
            completedAt: new Date(),
          },
        });
      } catch (err) {
        logger.warn("Failed to persist intake:", err);
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(auth)/how-it-works" as never);
    }
  }, [
    canAdvance,
    step,
    goalHours,
    distractions,
    triedApps,
    updateUser,
    router,
  ]);

  const handleBack = useCallback(() => {
    if (step === 0) return;
    setStep((s) => (s - 1) as Step);
  }, [step]);

  const progressPct = ((step + 1) / 3) * 100;

  const renderStep = () => {
    if (step === 0) {
      return (
        <View style={styles.stepContent}>
          <Text style={styles.questionLabel}>Question 1 of 3</Text>
          <Text style={styles.questionTitle}>
            How much focus time do you want a day?
          </Text>
          <Text style={styles.questionSub}>
            We'll use this to personalize your sessions.
          </Text>
          <View style={styles.optionList}>
            {GOAL_OPTIONS.map((opt) => {
              const selected = goalHours === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  onPress={() => {
                    Haptics.selectionAsync();
                    setGoalHours(opt.value);
                  }}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selected && styles.optionTextSelected,
                    ]}
                  >
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    if (step === 1) {
      return (
        <View style={styles.stepContent}>
          <Text style={styles.questionLabel}>Question 2 of 3</Text>
          <Text style={styles.questionTitle}>What pulls you off track?</Text>
          <Text style={styles.questionSub}>Pick all that apply.</Text>
          <View style={styles.optionList}>
            {DISTRACTION_OPTIONS.map((opt) => {
              const selected = distractions.includes(opt);
              return (
                <Pressable
                  key={opt}
                  onPress={() => toggleDistraction(opt)}
                  style={[styles.option, selected && styles.optionSelected]}
                >
                  <Text
                    style={[
                      styles.optionText,
                      selected && styles.optionTextSelected,
                    ]}
                  >
                    {opt}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </View>
      );
    }

    return (
      <View style={styles.stepContent}>
        <Text style={styles.questionLabel}>Question 3 of 3</Text>
        <Text style={styles.questionTitle}>Tried anything before?</Text>
        <Text style={styles.questionSub}>
          We're different because your money is actually on the line.
        </Text>
        <View style={styles.optionList}>
          {TRIED_APPS.map((opt) => {
            const selected = triedApps.includes(opt.id);
            return (
              <Pressable
                key={opt.id}
                onPress={() => toggleTriedApp(opt.id)}
                style={[styles.option, selected && styles.optionSelected]}
              >
                <Text
                  style={[
                    styles.optionText,
                    selected && styles.optionTextSelected,
                  ]}
                >
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <AuthScreenScaffold
      showBack={step > 0}
      onBack={handleBack}
      scrollable
      keyboardAware={false}
    >
      <View style={styles.progressBar}>
        <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
      </View>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {renderStep()}
      </ScrollView>
      <View style={styles.footer}>
        <Button
          title={step === 2 ? "Continue" : "Next"}
          onPress={handleNext}
          disabled={!canAdvance}
          size="large"
        />
      </View>
    </AuthScreenScaffold>
  );
}

const IntakeScreen = withErrorBoundary(IntakeScreenInner, "intake");
export default IntakeScreen;

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    progressBar: {
      height: 4,
      backgroundColor: Colors.backgroundTertiary,
      borderRadius: Radius.full,
      marginTop: Spacing.md,
      marginBottom: Spacing.lg,
      overflow: "hidden",
    },
    progressFill: {
      height: "100%",
      backgroundColor: Colors.primary,
      borderRadius: Radius.full,
    },
    scrollContent: {
      flexGrow: 1,
      paddingBottom: Spacing.xl,
    },
    stepContent: {
      gap: Spacing.md,
    },
    questionLabel: {
      fontSize: Typography.labelMedium,
      ...Font.semibold,
      color: Colors.primary,
      letterSpacing: 0.5,
      textTransform: "uppercase",
    },
    questionTitle: {
      fontSize: Typography.headlineSmall,
      ...Font.bold,
      color: Colors.text,
      lineHeight: Typography.headlineSmall * 1.2,
    },
    questionSub: {
      fontSize: Typography.bodyMedium,
      color: Colors.textSecondary,
      marginBottom: Spacing.md,
    },
    optionList: {
      gap: Spacing.sm,
    },
    option: {
      padding: Spacing.md,
      borderRadius: Radius.lg,
      borderWidth: 1.5,
      borderColor: Colors.border,
      backgroundColor: Colors.backgroundCard,
    },
    optionSelected: {
      borderColor: Colors.primary,
      backgroundColor: Colors.primaryMuted,
    },
    optionText: {
      fontSize: Typography.bodyMedium,
      ...Font.medium,
      color: Colors.text,
    },
    optionTextSelected: {
      color: Colors.primary,
      ...Font.semibold,
    },
    footer: {
      paddingVertical: Spacing.lg,
    },
  });
