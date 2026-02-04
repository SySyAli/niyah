import { Tabs } from "expo-router";
import { View, Text, StyleSheet } from "react-native";
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
          }) => <TabIcon label="H" color={color} focused={focused} />,
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
          }) => <TabIcon label="F" color={color} focused={focused} />,
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
          }) => <TabIcon label="P" color={color} focused={focused} />,
        }}
      />
    </Tabs>
  );
}

interface TabIconProps {
  label: string;
  color: string;
  focused: boolean;
}

const TabIcon: React.FC<TabIconProps> = ({ label, color, focused }) => {
  return (
    <View style={[styles.iconContainer, focused && styles.iconContainerActive]}>
      <Text style={[styles.iconText, { color }]}>{label}</Text>
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
    fontWeight: "500",
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  iconContainerActive: {
    backgroundColor: Colors.primaryMuted,
  },
  iconText: {
    fontSize: Typography.bodyMedium,
    fontWeight: "600",
  },
});
