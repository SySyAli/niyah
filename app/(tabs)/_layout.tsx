import React from "react";
import { Tabs } from "expo-router";
import { ScrollProvider } from "../../src/context/ScrollContext";
import { AnimatedTabBar } from "../../src/components/AnimatedTabBar";

export default function TabsLayout() {
  return (
    <ScrollProvider>
      <Tabs
        screenOptions={{
          headerShown: false,
        }}
        tabBar={(props) => <AnimatedTabBar {...(props as any)} />}
      >
        <Tabs.Screen name="index" options={{ title: "Home" }} />
        <Tabs.Screen name="session" options={{ title: "Focus" }} />
        <Tabs.Screen name="profile" options={{ title: "Profile" }} />
      </Tabs>
    </ScrollProvider>
  );
}
