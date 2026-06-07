import { useEffect } from "react";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../lib/theme";
import { registerForPush } from "../../lib/notifications";

export default function TabsLayout() {
  // Регистрируем push-токен (SPEC §6.2). .catch — чтобы Expo Go не падал.
  useEffect(() => {
    registerForPush().catch(() => {});
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.white,
          borderTopColor: colors.line,
          height: 64,
          paddingBottom: 10,
          paddingTop: 8,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "600" },
      }}
    >
      <Tabs.Screen name="index" options={{ title: "Главная", tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "home" : "home-outline"} size={size} color={color} /> }} />
      <Tabs.Screen name="activities" options={{ title: "Активности", tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "calendar" : "calendar-outline"} size={size} color={color} /> }} />
      <Tabs.Screen name="path" options={{ title: "Мой путь", tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "compass" : "compass-outline"} size={size} color={color} /> }} />
      <Tabs.Screen name="news" options={{ title: "Новости", tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "newspaper" : "newspaper-outline"} size={size} color={color} /> }} />
      <Tabs.Screen name="cases" options={{ title: "Практика", tabBarIcon: ({ color, size, focused }) => <Ionicons name={focused ? "medkit" : "medkit-outline"} size={size} color={color} /> }} />
    </Tabs>
  );
}
