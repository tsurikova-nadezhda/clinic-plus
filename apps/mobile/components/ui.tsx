import { ReactNode } from "react";
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator, ScrollView,
  RefreshControl, TextInput, type ViewStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { colors, gradients, horiz, radius, space } from "../lib/theme";

/** Обёртка экрана: цветная безопасная зона сверху + прокручиваемый контент. */
export function Screen({
  children, onRefresh, refreshing = false, topColor = colors.paper,
}: { children: ReactNode; onRefresh?: () => void; refreshing?: boolean; topColor?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: colors.paper }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: topColor }} />
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.plum} /> : undefined}
      >
        {children}
      </ScrollView>
    </View>
  );
}

export function Progress({ pct, height = 12 }: { pct: number; height?: number }) {
  return (
    <View style={[styles.track, { height, borderRadius: height }]}>
      <LinearGradient colors={gradients.progress} start={horiz.start} end={horiz.end}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%`, height, borderRadius: height }} />
    </View>
  );
}

export function Badge({ text, color = colors.plum, bg }: { text: string; color?: string; bg?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: bg ?? color + "22" }]}>
      <Text style={{ color, fontSize: 11, fontWeight: "700" }}>{text}</Text>
    </View>
  );
}

export function Button({
  title, onPress, variant = "primary", disabled, loading, style,
}: {
  title: string; onPress: () => void;
  variant?: "primary" | "secondary" | "ghost"; disabled?: boolean; loading?: boolean; style?: ViewStyle;
}) {
  const bg = variant === "primary" ? colors.orange : variant === "secondary" ? colors.plum : "transparent";
  const fg = variant === "ghost" ? colors.plum : colors.white;
  return (
    <Pressable onPress={onPress} disabled={disabled || loading}
      style={({ pressed }) => [styles.btn, { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === "ghost" && styles.btnGhost, style]}>
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.btnText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({
  label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize, multiline,
}: {
  label?: string; value: string; onChangeText: (t: string) => void; placeholder?: string;
  secureTextEntry?: boolean; keyboardType?: "default" | "email-address"; autoCapitalize?: "none" | "sentences"; multiline?: boolean;
}) {
  return (
    <View style={{ gap: space.xs }}>
      {label ? <Text style={styles.label}>{label}</Text> : null}
      <TextInput
        style={[styles.input, multiline && { height: 92, textAlignVertical: "top", paddingTop: 10 }]}
        value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry} keyboardType={keyboardType} autoCapitalize={autoCapitalize} multiline={multiline}
      />
    </View>
  );
}

export function Loading() {
  return <View style={styles.center}><ActivityIndicator size="large" color={colors.plum} /></View>;
}
export function Empty({ text }: { text: string }) {
  return <View style={styles.center}><Text style={styles.emptyText}>{text}</Text></View>;
}

const styles = StyleSheet.create({
  content: { padding: space.lg, paddingBottom: 90, gap: space.md },
  track: { backgroundColor: "rgba(82,62,122,0.1)", overflow: "hidden" },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: radius.pill, alignSelf: "flex-start" },
  btn: { height: 50, borderRadius: radius.md, alignItems: "center", justifyContent: "center", paddingHorizontal: space.lg },
  btnGhost: { borderWidth: 1.5, borderColor: colors.plum },
  btnText: { fontSize: 16, fontWeight: "700" },
  label: { fontSize: 13, color: colors.muted },
  input: { backgroundColor: colors.white, borderRadius: radius.sm, borderWidth: 1, borderColor: "#e7e0ee", paddingHorizontal: space.md, paddingVertical: 12, fontSize: 15, color: colors.ink },
  center: { padding: space.xxl, alignItems: "center", justifyContent: "center", gap: space.sm },
  emptyText: { color: colors.muted, textAlign: "center", fontSize: 14 },
});
