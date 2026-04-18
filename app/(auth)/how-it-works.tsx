import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { useRouter } from "expo-router";
import * as Haptics from "expo-haptics";
import {
  Typography,
  Spacing,
  Font,
  type ThemeColors,
} from "../../src/constants/colors";
import { useColors } from "../../src/hooks/useColors";
import {
  AuthScreenScaffold,
  Button,
  withErrorBoundary,
} from "../../src/components";

const STEPS = [
  {
    emoji: "💸",
    title: "Stake your money",
    body: "Pick any dollar amount. That's your commitment — real skin in the game.",
  },
  {
    emoji: "🔒",
    title: "Distracting apps get blocked",
    body: "During your session, the apps you choose are locked behind a Niyah shield.",
  },
  {
    emoji: "🏆",
    title: "Finish, and the pool is yours",
    body: "Complete the session and keep your stake. Quit early and you forfeit to everyone still in.",
  },
];

function HowItWorksScreenInner() {
  const Colors = useColors();
  const styles = useMemo(() => makeStyles(Colors), [Colors]);
  const router = useRouter();

  const [index, setIndex] = useState(0);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    fadeAnim.setValue(0);
    slideAnim.setValue(20);
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 350,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 350,
        useNativeDriver: true,
      }),
    ]).start();
  }, [index, fadeAnim, slideAnim]);

  const handleNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (index < STEPS.length - 1) {
      setIndex((i) => i + 1);
    } else {
      router.replace("/(auth)/screen-time-math" as never);
    }
  }, [index, router]);

  const step = STEPS[index];

  return (
    <AuthScreenScaffold
      showBack={false}
      scrollable={false}
      keyboardAware={false}
    >
      <View style={styles.dots}>
        {STEPS.map((_, i) => (
          <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
        ))}
      </View>

      <View style={styles.content}>
        <Animated.View
          style={[
            styles.card,
            {
              opacity: fadeAnim,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <Text style={styles.emoji}>{step.emoji}</Text>
          <Text style={styles.title}>{step.title}</Text>
          <Text style={styles.body}>{step.body}</Text>
        </Animated.View>
      </View>

      <View style={styles.footer}>
        <Button
          title={index < STEPS.length - 1 ? "Next" : "Got it — let's set it up"}
          onPress={handleNext}
          size="large"
        />
      </View>
    </AuthScreenScaffold>
  );
}

const HowItWorksScreen = withErrorBoundary(
  HowItWorksScreenInner,
  "how-it-works",
);
export default HowItWorksScreen;

const makeStyles = (Colors: ThemeColors) =>
  StyleSheet.create({
    dots: {
      flexDirection: "row",
      justifyContent: "center",
      gap: Spacing.sm,
      marginTop: Spacing.md,
      marginBottom: Spacing.xl,
    },
    dot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: Colors.backgroundTertiary,
    },
    dotActive: {
      backgroundColor: Colors.primary,
      width: 24,
    },
    content: {
      flex: 1,
      justifyContent: "center",
    },
    card: {
      alignItems: "center",
      padding: Spacing.xl,
      gap: Spacing.lg,
    },
    emoji: {
      fontSize: 72,
    },
    title: {
      fontSize: Typography.headlineMedium,
      ...Font.bold,
      color: Colors.text,
      textAlign: "center",
    },
    body: {
      fontSize: Typography.bodyLarge,
      color: Colors.textSecondary,
      textAlign: "center",
      lineHeight: Typography.bodyLarge * 1.5,
      paddingHorizontal: Spacing.md,
    },
    footer: {
      paddingVertical: Spacing.lg,
      gap: Spacing.md,
    },
  });
