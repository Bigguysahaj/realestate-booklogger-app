import { useNavigation } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, RefreshControl, StyleSheet, View } from "react-native";
import { Appbar, FAB, List, Searchbar, Text } from "react-native-paper";
import { api } from "../api";
import { useAuth } from "../auth";
import { RecordData } from "../fields";
import type { RootStackParamList } from "../types";

type Nav = NativeStackNavigationProp<RootStackParamList>;

function subtitle(r: RecordData): string {
  const parts = [r.property_type, r.area_sqyd ? `${r.area_sqyd} sq.yd` : null, r.willing_to_sell ? `Sell: ${r.willing_to_sell}` : null];
  return parts.filter(Boolean).join(" · ") || "—";
}

export default function RecordListScreen() {
  const navigation = useNavigation<Nav>();
  const { logout, email } = useAuth();
  const [records, setRecords] = useState<RecordData[]>([]);
  const [query, setQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const load = useCallback(async (q: string) => {
    setError("");
    try {
      const params = q ? `?q=${encodeURIComponent(q)}` : "";
      setRecords(await api<RecordData[]>(`/records${params}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load records");
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(query), query ? 300 : 0);
    return () => clearTimeout(t);
  }, [query, load]);

  useEffect(() => {
    const unsub = navigation.addListener("focus", () => load(query));
    return unsub;
  }, [navigation, load, query]);

  return (
    <View style={styles.root}>
      <Appbar.Header>
        <Appbar.Content title="Records" />
        <Appbar.Action icon="logout" onPress={logout} accessibilityLabel={`Log out ${email}`} />
      </Appbar.Header>
      <Searchbar
        placeholder="Search address, owner, notes…"
        value={query}
        onChangeText={setQuery}
        style={styles.search}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <FlatList
        data={records}
        keyExtractor={(r) => String(r.id)}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={async () => {
              setRefreshing(true);
              await load(query);
              setRefreshing(false);
            }}
          />
        }
        renderItem={({ item }) => (
          <List.Item
            title={String(item.address || `Record #${item.id}`)}
            description={subtitle(item)}
            left={(props) => <List.Icon {...props} icon={item.consent_given ? "account-check" : "home-outline"} />}
            onPress={() => navigation.navigate("RecordDetail", { id: item.id })}
          />
        )}
        ListEmptyComponent={<Text style={styles.empty}>No records yet — tap + to add one.</Text>}
      />
      <FAB icon="plus" style={styles.fab} onPress={() => navigation.navigate("RecordForm", {})} />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  search: { margin: 12 },
  error: { color: "#b3261e", textAlign: "center", margin: 8 },
  empty: { textAlign: "center", marginTop: 48, opacity: 0.6 },
  fab: { position: "absolute", right: 16, bottom: 24 },
});
