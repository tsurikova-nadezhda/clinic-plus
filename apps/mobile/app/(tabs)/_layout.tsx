import { useEffect } from "react";
import { Pressable } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../lib/theme";
import { useAuth } from "../../lib/auth";
import { registerForPush } from "../../lib/notifications";

export default function TabsLayout() {
  const { logout } = useAuth();

  // Регистрируем push-токен после входа (SPEC §6.2)
  useEffect(() => {
    registerForPush();
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.plum },
        headerTintColor: colors.white,
        headerTitleStyle: { fontWeight: "800" },
        tabBarActiveTintColor: colors.orange,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: "#eee", height: 60, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        headerRight: () => (
          <Pressable onPress={logout} hitSlop={12} style={{ paddingHorizontal: 16 }}>
            <Ionicons name="log-out-outline" size={22} color={colors.white} />
          </Pressable>
        ),
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Главная",
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="activities"
        options={{
          title: "Активности",
          tabBarIcon: ({ color, size }) => <Ionicons name="calendar" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="path"
        options={{
          title: "Мой путь",
          tabBarIcon: ({ color, size }) => <Ionicons name="compass" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="news"
        options={{
          title: "Новости",
          tabBarIcon: ({ color, size }) => <Ionicons name="newspaper" size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="cases"
        options={{
          title: "Практика",
          tabBarIcon: ({ color, size }) => <Ionicons name="medkit" size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
