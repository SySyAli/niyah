import React from "react";
import { Tabs } from "../../src/components/bottom-tabs";
import { useColors } from "../../src/hooks/useColors";
import { useThemeStore } from "../../src/store/themeStore";

export default function TabsLayout() {
  const Colors = useColors();
  const _hasHydrated = useThemeStore((s) => s._hasHydrated);

  // Don't mount the native UITabBarController until we know the persisted
  // theme.  Mounting it once with the correct barTintColor avoids the race
  // where it is first created with the default "dark" color and then asked
  // to update — an update that the SwiftUI/UITabBar layer may miss.
  if (!_hasHydrated) return null;

  return (
    <Tabs
      hapticFeedbackEnabled
      // scrollEdgeAppearance="opaque" forces UITabBarAppearance to use
      // configureWithOpaqueBackground() instead of the default glass
      // material.  The opaque path reliably applies backgroundColor
      // (barTintColor) on iOS 26's floating-pill tab bar; the glass path
      // sometimes ignores it for lighter theme colors.
      scrollEdgeAppearance="opaque"
      tabBarActiveTintColor={Colors.primary}
      tabBarInactiveTintColor={Colors.textSecondary}
      tabBarStyle={{ backgroundColor: Colors.background }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Home",
          tabBarIcon: () => ({ sfSymbol: "house" }),
        }}
      />
      <Tabs.Screen
        name="session"
        options={{
          title: "Focus",
          tabBarIcon: () => ({ sfSymbol: "timer" }),
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          title: "Friends",
          tabBarIcon: () => ({ sfSymbol: "person.2" }),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: () => ({ sfSymbol: "person" }),
        }}
      />
    </Tabs>
  );
}
