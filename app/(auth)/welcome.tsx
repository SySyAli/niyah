import React, { useRef, useEffect } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Colors,
  Typography,
  Spacing,
  Radius,
} from "../../src/constants/colors";
import { Button } from "../../src/components";
import { GoogleSignInButton } from "../../src/components/GoogleSignInButton";

interface FeatureItemProps {
  number: number;
  title: string;
  description: string;
  delay: number;
}

const FeatureItem: React.FC<FeatureItemProps> = ({
  number,
  title,
  description,
  delay,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 400,
        delay,
        useNativeDriver: true,
      }),
    ]).start();
  }, [delay]);

  return (
    <Animated.View
      style={[styles.featureItem, { opacity, transform: [{ translateY }] }]}
    >
      <View style={styles.featureNumber}>
        <Text style={styles.featureNumberText}>{number}</Text>
      </View>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureDescription}>{description}</Text>
      </View>
    </Animated.View>
  );
};

export default function WelcomeScreen() {
  const router = useRouter();
  const headerOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(headerOpacity, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <Animated.View style={[styles.header, { opacity: headerOpacity }]}>
          <Text style={styles.logo}>NIYAH</Text>
          <Text style={styles.tagline}>Focus with real stakes</Text>
        </Animated.View>

        {/* Features */}
        <View style={styles.features}>
          <FeatureItem
            number={1}
            title="Stake Your Money"
            description="Put real money on the line to stay focused"
            delay={200}
          />
          <FeatureItem
            number={2}
            title="Apps Get Blocked"
            description="Distracting apps are locked during sessions"
            delay={300}
          />
          <FeatureItem
            number={3}
            title="Earn Your Payout"
            description="Complete sessions to earn up to 2x your stake"
            delay={400}
          />
          <FeatureItem
            number={4}
            title="Build Streaks"
            description="Consecutive sessions unlock bonus multipliers"
            delay={500}
          />
        </View>

        {/* Value Prop */}
        <View style={styles.valueProp}>
          <Text style={styles.valueText}>
            When checking Instagram costs you $5, behavior changes in ways
            willpower alone cannot achieve.
          </Text>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <GoogleSignInButton onSuccess={() => router.replace("/(tabs)")} />

          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          <Button
            title="Get Started with Email"
            onPress={() => router.push("/(auth)/signup")}
            size="large"
            variant="secondary"
          />
          <Button
            title="I already have an account"
            onPress={() => router.push("/(auth)/login")}
            variant="ghost"
            size="large"
          />
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flex: 1,
    padding: Spacing.lg,
    justifyContent: "space-between",
  },
  header: {
    alignItems: "center",
    marginTop: Spacing.xxl,
  },
  logo: {
    fontSize: 52,
    fontWeight: "800",
    color: Colors.primary,
    letterSpacing: 6,
  },
  tagline: {
    fontSize: Typography.bodyLarge,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  features: {
    gap: Spacing.lg,
  },
  featureItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.md,
  },
  featureNumber: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  featureNumberText: {
    fontSize: Typography.bodyMedium,
    fontWeight: "600",
    color: Colors.primary,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: Typography.titleSmall,
    fontWeight: "600",
    color: Colors.text,
  },
  featureDescription: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    marginTop: 2,
    lineHeight: 20,
  },
  valueProp: {
    backgroundColor: Colors.backgroundCard,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderLeftWidth: 3,
    borderLeftColor: Colors.primary,
  },
  valueText: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    fontStyle: "italic",
    lineHeight: 22,
  },
  actions: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.border,
  },
  dividerText: {
    fontSize: Typography.bodySmall,
    color: Colors.textSecondary,
    marginHorizontal: Spacing.md,
  },
});
