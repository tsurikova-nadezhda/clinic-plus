import { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Screen, Card, Loading, Empty, Badge, Button } from "../../components/ui";
import { api, type NewsItem } from "../../lib/api";
import { useAsync } from "../../lib/hooks";
import { formatDate } from "../../lib/format";
import { colors, space, typography } from "../../lib/theme";

const PAGE_SIZE = 10;

export default function NewsScreen() {
  const [page, setPage] = useState(1);
  const { data, loading, refreshing, refresh } = useAsync<{ items: NewsItem[]; total: number }>(
    () => api.news(1, page * PAGE_SIZE),
    [page],
  );

  if (loading && !data) return <Loading />;
  const items = (data?.items ?? []).sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
  const hasMore = (data?.total ?? 0) > items.length;

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      {items.length === 0 ? (
        <Empty text="Свежих новостей пока нет. Загляните позже." />
      ) : (
        <>
          {items.map((n) => (
            <Card key={n.id}>
              <View style={styles.metaRow}>
                {n.source ? <Badge text={n.source} color={colors.blue} /> : null}
                <Text style={typography.muted}>{formatDate(n.publishedAt)}</Text>
              </View>
              <Text style={typography.h3}>{n.title}</Text>
              <Text style={typography.body}>{n.content}</Text>
            </Card>
          ))}
          {hasMore ? (
            <Button title="Показать ещё" variant="ghost" onPress={() => setPage((p) => p + 1)} />
          ) : null}
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  metaRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
});
