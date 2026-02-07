import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { Colors, Typography, Spacing } from "../constants/colors";
import { Partner } from "../types";

interface MoneyPlantProps {
  partners: Partner[];
  totalLeaves: number; // Completed sessions = leaves
  growthStage: number; // 1-5 based on network/reputation
  totalEarned: number; // In cents
}

interface CoinLeafProps {
  amount: number; // In cents
  position: { x: number; y: number };
  delay: number;
  side: "left" | "right";
}

// Individual coin leaf component
const CoinLeaf: React.FC<CoinLeafProps> = ({
  amount,
  position,
  delay,
  side,
}) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.delay(delay),
      Animated.parallel([
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]),
    ]).start();
  }, [delay, rotateAnim, scaleAnim]);

  const rotation = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [side === "left" ? "-30deg" : "30deg", "0deg"],
  });

  const dollars = (amount / 100).toFixed(0);

  return (
    <Animated.View
      style={[
        styles.coinLeaf,
        {
          left: position.x,
          top: position.y,
          transform: [{ scale: scaleAnim }, { rotate: rotation }],
        },
      ]}
    >
      <Text style={styles.coinText}>${dollars}</Text>
    </Animated.View>
  );
};

// Partner node on the plant
const PartnerNode: React.FC<{
  partner: Partner;
  position: { x: number; y: number };
  index: number;
}> = ({ partner, position, index }) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 500,
      delay: index * 200,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, index]);

  return (
    <Animated.View
      style={[
        styles.partnerNode,
        {
          left: position.x,
          top: position.y,
          opacity: fadeAnim,
        },
      ]}
    >
      <View
        style={[
          styles.partnerAvatar,
          partner.isActive && styles.partnerAvatarActive,
        ]}
      >
        <Text style={styles.partnerInitial}>
          {partner.name.charAt(0).toUpperCase()}
        </Text>
      </View>
      <Text style={styles.partnerName} numberOfLines={1}>
        {partner.name.split(" ")[0]}
      </Text>
    </Animated.View>
  );
};

export const MoneyPlant: React.FC<MoneyPlantProps> = ({
  partners,
  totalLeaves,
  growthStage,
  totalEarned,
}) => {
  // Generate leaf positions based on growth stage
  const generateLeafPositions = () => {
    const leaves: {
      amount: number;
      position: { x: number; y: number };
      side: "left" | "right";
    }[] = [];
    const maxLeaves = Math.min(totalLeaves, 12); // Max 12 visible leaves

    for (let i = 0; i < maxLeaves; i++) {
      const side = i % 2 === 0 ? "left" : "right";
      const baseAmount = 500; // $5 base

      // Position leaves along the stem
      const yOffset = 180 - i * 25; // Start from bottom, go up
      const xOffset = side === "left" ? 60 : 140;

      leaves.push({
        amount: baseAmount,
        position: { x: xOffset, y: yOffset },
        side,
      });
    }

    return leaves;
  };

  // Generate partner positions around the plant
  const generatePartnerPositions = () => {
    const positions: { x: number; y: number }[] = [
      { x: 20, y: 220 }, // Bottom left
      { x: 160, y: 220 }, // Bottom right
      { x: 0, y: 140 }, // Middle left
      { x: 180, y: 140 }, // Middle right
      { x: 40, y: 60 }, // Top left
      { x: 160, y: 60 }, // Top right
    ];
    return positions;
  };

  const leaves = generateLeafPositions();
  const partnerPositions = generatePartnerPositions();

  // Growth stage determines plant height and thickness
  const getPlantHeight = () => {
    const heights = [80, 120, 160, 200, 240];
    return heights[Math.min(growthStage - 1, 4)];
  };

  const getStemWidth = () => {
    const widths = [4, 6, 8, 10, 12];
    return widths[Math.min(growthStage - 1, 4)];
  };

  return (
    <View style={styles.container}>
      {/* Tagline */}
      <Text style={styles.tagline}>Money does grow on trees</Text>

      {/* Plant Container */}
      <View style={styles.plantContainer}>
        {/* Stem */}
        <View
          style={[
            styles.stem,
            {
              height: getPlantHeight(),
              width: getStemWidth(),
            },
          ]}
        />

        {/* Pot */}
        <View style={styles.pot}>
          <View style={styles.potTop} />
          <View style={styles.potBody} />
        </View>

        {/* Leaves (coins) */}
        {leaves.map((leaf, index) => (
          <CoinLeaf
            key={index}
            amount={leaf.amount}
            position={leaf.position}
            delay={index * 100}
            side={leaf.side}
          />
        ))}

        {/* Partner nodes */}
        {partners.slice(0, 6).map((partner, index) => (
          <PartnerNode
            key={partner.id}
            partner={partner}
            position={partnerPositions[index]}
            index={index}
          />
        ))}
      </View>

      {/* Stats */}
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{partners.length}</Text>
          <Text style={styles.statLabel}>Partners</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{totalLeaves}</Text>
          <Text style={styles.statLabel}>Sessions</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={[styles.statValue, { color: Colors.gain }]}>
            ${(totalEarned / 100).toFixed(0)}
          </Text>
          <Text style={styles.statLabel}>Earned</Text>
        </View>
      </View>

      {/* Growth Stage */}
      <View style={styles.growthIndicator}>
        <Text style={styles.growthLabel}>Growth Stage {growthStage}/5</Text>
        <View style={styles.growthBar}>
          {[1, 2, 3, 4, 5].map((stage) => (
            <View
              key={stage}
              style={[
                styles.growthDot,
                stage <= growthStage && styles.growthDotActive,
              ]}
            />
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  tagline: {
    fontSize: Typography.titleSmall,
    fontWeight: "600",
    color: Colors.primary,
    marginBottom: Spacing.lg,
    fontStyle: "italic",
  },
  plantContainer: {
    width: 240,
    height: 300,
    position: "relative",
    alignItems: "center",
    justifyContent: "flex-end",
  },
  stem: {
    backgroundColor: Colors.gain,
    borderRadius: 4,
    position: "absolute",
    bottom: 50,
    zIndex: 1,
  },
  pot: {
    position: "absolute",
    bottom: 0,
    alignItems: "center",
    zIndex: 2,
  },
  potTop: {
    width: 70,
    height: 12,
    backgroundColor: "#8B4513",
    borderTopLeftRadius: 4,
    borderTopRightRadius: 4,
  },
  potBody: {
    width: 60,
    height: 40,
    backgroundColor: "#A0522D",
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  coinLeaf: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.warning,
    borderWidth: 3,
    borderColor: "#DAA520",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  coinText: {
    fontSize: Typography.labelSmall,
    fontWeight: "700",
    color: "#5D4E37",
  },
  partnerNode: {
    position: "absolute",
    alignItems: "center",
    width: 60,
  },
  partnerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.backgroundCard,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  partnerAvatarActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryMuted,
  },
  partnerInitial: {
    fontSize: Typography.labelMedium,
    fontWeight: "600",
    color: Colors.text,
  },
  partnerName: {
    fontSize: 10,
    color: Colors.textSecondary,
    marginTop: 2,
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statValue: {
    fontSize: Typography.titleLarge,
    fontWeight: "700",
    color: Colors.text,
  },
  statLabel: {
    fontSize: Typography.labelSmall,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.border,
  },
  growthIndicator: {
    alignItems: "center",
    marginTop: Spacing.lg,
  },
  growthLabel: {
    fontSize: Typography.labelSmall,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  growthBar: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  growthDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.border,
  },
  growthDotActive: {
    backgroundColor: Colors.gain,
  },
});
