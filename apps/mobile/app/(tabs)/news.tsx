import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Screen, Loading, Empty, Button } from "../../components/ui";
import { api, type NewsItem } from "../../lib/api";
import { useAsync } from "../../lib/hooks";
import { formatDate } from "../../lib/format";
import { colors, diag, radius, space } from "../../lib/theme";

const PALETTE = [colors.orange, colors.plum, colors.blue, colors.green];
const PAGE = 10;

export default function NewsScreen() {
  const [limit, setLimit] = useState(PAGE);
  const { data, loading } = useAsync<{ items: NewsItem[]; total: number }>(() => api.news(1, limit), [limit]);

  if (loading && !data) return <Loading />;
  const items = (data?.items ?? []).slice().sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
  const hasMore = (data?.total ?? 0) > items.length;

  return (
    <Screen>
      <Text style={styles.h1}>Новости медицины</Text>
      <Text style={styles.sub}>За последние две недели</Text>

      {items.length === 0 ? <Empty text="Свежих новостей пока нет. Загляните позже." /> : items.map((n, i) => {
        const color = PALETTE[i % PALETTE.length];
        return (
          <View key={n.id} style={styles.card}>
            <LinearGradient colors={[color, color + "99"]} start={diag.start} end={diag.end} style={styles.banner}>
              <View style={styles.tag}><Text style={[styles.tagText, { color }]}>{n.source || "Новость"}</Text></View>
            </LinearGradient>
            <View style={{ padding: space.lg }}>
              <Text style={styles.title}>{n.title}</Text>
              <Text style={styles.content} numberOfLines={4}>{n.content}</Text>
              <View style={styles.rowBetween}>
                <Text style={styles.date}>{formatDate(n.publishedAt)}</Text>
                <View style={styles.read}><Text style={styles.readText}>Читать</Text><Ionicons name="chevron-forward" size={13} color={colors.orange} /></View>
              </View>
            </View>
          </View>
        );
      })}

      {hasMore ? <Button title="Показать ещё" variant="ghost" onPress={() => setLimit((l) => l + PAGE)} /> : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: 24, fontWeight: "800", color: colors.plumDeep },
  sub: { fontSize: 14, color: colors.muted, marginBottom: space.sm },
  card: { backgroundColor: colors.white, borderRadius: radius.xl, borderWidth: 1, borderColor: colors.line, overflow: "hidden" },
  banner: { height: 84, justifyContent: "flex-start" },
  tag: { position: "absolute", top: 12, left: 12, backgroundColor: colors.white, borderRadius: radius.pill, paddingHorizontal: 8, paddingVertical: 3 },
  tagText: { fontSize: 10, fontWeight: "700" },
  title: { fontSize: 15, fontWeight: "700", color: colors.plumDeep, lineHeight: 20, marginBottom: 6 },
  content: { fontSize: 13, color: colors.ink, lineHeight: 19, marginBottom: space.sm },
  rowBetween: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  date: { fontSize: 12, color: colors.muted },
  read: { flexDirection: "row", alignItems: "center", gap: 2 },
  readText: { fontSize: 12, fontWeight: "700", color: colors.orange },
});
