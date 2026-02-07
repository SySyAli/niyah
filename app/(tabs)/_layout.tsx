import { Tabs } from "expo-router";
import { View, StyleSheet, Animated } from "react-native";
import { useRef, useEffect } from "react";
import { Ionicons } from "@expo/vector-icons";
import { Colors, Typography, Spacing } from "../../src/constants/colors";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: Colors.primary,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: styles.tabBarLabel,
        tabBarShowLabel: true,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: ({
            color,
            focused,
          }: {
            color: string;
            focused: boolean;
          }) => (
            <AnimatedTabIcon
              name={focused ? "home" : "home-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="session"
        options={{
          title: "Focus",
          tabBarIcon: ({
            color,
            focused,
          }: {
            color: string;
            focused: boolean;
          }) => (
            <AnimatedTabIcon
              name={focused ? "timer" : "timer-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({
            color,
            focused,
          }: {
            color: string;
            focused: boolean;
          }) => (
            <AnimatedTabIcon
              name={focused ? "person" : "person-outline"}
              color={color}
              focused={focused}
            />
          ),
        }}
      />
    </Tabs>
  );
}

interface AnimatedTabIconProps {
  name: keyof typeof Ionicons.glyphMap;
  color: string;
  focused: boolean;
}

const AnimatedTabIcon: React.FC<AnimatedTabIconProps> = ({
  name,
  color,
  focused,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    if (focused) {
      // Bounce animation when tab becomes active
      Animated.sequence([
        Animated.timing(scaleAnim, {
          toValue: 1.2,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 4,
          useNativeDriver: true,
        }),
      ]).start();

      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [focused, opacityAnim, scaleAnim]);

  return (
    <View style={styles.iconWrapper}>
      <Animated.View
        style={[
          styles.iconBackground,
          {
            opacity: opacityAnim,
            transform: [{ scale: scaleAnim }],
          },
        ]}
      />
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Ionicons name={name} size={24} color={color} />
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.backgroundElevated,
    borderTopColor: Colors.border,
    borderTopWidth: 1,
    height: 85,
    paddingTop: Spacing.sm,
    paddingBottom: 25,
  },
  tabBarLabel: {
    fontSize: Typography.labelSmall,
    fontWeight: "600",
  },
  iconWrapper: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBackground: {
    position: "absolute",
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.primaryMuted,
  },
});
