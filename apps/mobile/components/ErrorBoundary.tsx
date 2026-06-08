import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { colors, space, radius } from "../lib/theme";

/** Ловит ошибки рендера экрана и показывает их вместо «вечной загрузки». */
export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) { return { error }; }
  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      return (
        <View style={styles.wrap}>
          <Text style={styles.title}>Что-то пошло не так на этом экране</Text>
          <Text style={styles.msg}>{String(this.state.error?.message || this.state.error)}</Text>
          <Pressable onPress={this.reset} style={styles.btn}>
            <Text style={styles.btnText}>Попробовать снова</Text>
          </Pressable>
        </View>
      );
    }
    return this.props.children as React.ReactElement;
  }
}

const styles = StyleSheet.create({
  wrap: { flex: 1, padding: space.xl, justifyContent: "center", gap: space.md, backgroundColor: colors.paper },
  title: { fontSize: 18, fontWeight: "800", color: colors.plumDeep },
  msg: { fontSize: 13, color: colors.orange },
  btn: { alignSelf: "flex-start", borderWidth: 1.5, borderColor: colors.plum, borderRadius: radius.md, paddingHorizontal: space.lg, paddingVertical: 10 },
  btnText: { color: colors.plum, fontWeight: "700" },
});
