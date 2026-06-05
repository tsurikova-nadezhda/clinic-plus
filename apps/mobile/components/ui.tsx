import { ReactNode } from "react";
import {
  View, Text, StyleSheet, Pressable, ActivityIndicator,
  ScrollView, RefreshControl, TextInput, type ViewStyle, type TextStyle,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, space, typography } from "../lib/theme";

export function Screen({
  children, scroll = true, onRefresh, refreshing = false, style,
}: {
  children: ReactNode; scroll?: boolean; onRefresh?: () => void;
  refreshing?: boolean; style?: ViewStyle;
}) {
  if (!scroll) {
    return (
      <SafeAreaView style={[styles.screen, style]} edges={["bottom"]}>
        {children}
      </SafeAreaView>
    );
  }
  return (
    <SafeAreaView style={styles.screen} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={[styles.scrollContent, style]}
        refreshControl={
          onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.plum} /> : undefined
        }
      >
        {children}
      </ScrollView>
    </SafeAreaView>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Button({
  title, onPress, variant = "primary", disabled, loading, style,
}: {
  title: string; onPress: () => void;
  variant?: "primary" | "secondary" | "ghost"; disabled?: boolean; loading?: boolean; style?: ViewStyle;
}) {
  const bg =
    variant === "primary" ? colors.orange :
    variant === "secondary" ? colors.plum : "transparent";
  const fg = variant === "ghost" ? colors.plum : colors.white;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.btn,
        { backgroundColor: bg, opacity: disabled ? 0.5 : pressed ? 0.85 : 1 },
        variant === "ghost" && styles.btnGhost,
        style,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : <Text style={[styles.btnText, { color: fg }]}>{title}</Text>}
    </Pressable>
  );
}

export function Field({
  label, value, onChangeText, placeholder, secureTextEntry, keyboardType, autoCapitalize, multiline,
}: {
  label?: string; value: string; onChangeText: (t: string) => void; placeholder?: string;
  secureTextEntry?: boolean; keyboardType?: "default" | "email-address"; autoCapitalize?: "none" | "sentences";
  multiline?: boolean;
}) {
  return (
    <View style={{ gap: space.xs }}>
      {label ? <Text style={typography.muted}>{label}</Text> : null}
      <TextInput
        style={[styles.input, multiline && { height: 96, textAlignVertical: "top" }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        multiline={multiline}
      />
    </View>
  );
}

export function Badge({ text, color = colors.plum }: { text: string; color?: string }) {
  return (
    <View style={[styles.badge, { backgroundColor: color + "22" }]}>
      <Text style={{ color, fontSize: 12, fontWeight: "700" }}>{text}</Text>
    </View>
  );
}

export function ProgressBar({ pct, color = colors.orange }: { pct: number; color?: string }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.max(0, Math.min(100, pct))}%`, backgroundColor: color }]} />
    </View>
  );
}

export function Loading() {
  return (
    <View style={styles.center}><ActivityIndicator size="large" color={colors.plum} /></View>
  );
}

export function Empty({ text }: { text: string }) {
  return <View style={styles.center}><Text style={[typography.muted, { textAlign: "center" }]}>{text}</Text></View>;
}

export function SectionTitle({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[typography.h2, { marginBottom: space.sm }, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.paper },
  scrollContent: { padding: space.lg, gap: space.md, paddingBottom: space.xxl },
  card: {
    backgroundColor: colors.white, borderRadius: radius.md, padding: space.lg,
    shadowColor: colors.plumDeep, shadowOpacity: 0.06, shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 }, elevation: 2, gap: space.sm,
  },
  btn: { height: 50, borderRadius: radius.pill, alignItems: "center", justifyContent: "center", paddingHorizontal: space.lg },
  btnGhost: { borderWidth: 1.5, borderColor: colors.plum },
  btnText: { fontSize: 16, fontWeight: "700" },
  input: {
    backgroundColor: colors.white, borderRadius: radius.sm, borderWidth: 1,
    borderColor: "#e7e0ee", paddingHorizontal: space.md, paddingVertical: space.md,
    fontSize: 15, color: colors.ink,
  },
  badge: { paddingHorizontal: space.sm, paddingVertical: 3, borderRadius: radius.pill, alignSelf: "flex-start" },
  center: { padding: space.xl, alignItems: "center", justifyContent: "center", gap: space.sm },
  progressTrack: { height: 10, borderRadius: radius.pill, backgroundColor: "#ece5f3", overflow: "hidden" },
  progressFill: { height: 10, borderRadius: radius.pill },
});
