import { useNavigation, useRoute, RouteProp, useIsFocused } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import { ActivityIndicator, Appbar, Chip, Divider, List, Text } from "react-native-paper";
import { api } from "../api";
import { FIELDS, RecordData } from "../fields";
import type { RootStackParamList } from "../types";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, "RecordDetail">;

function display(record: RecordData, name: string): string {
  const value = record[name];
  if (value === null || value === undefined || value === "") return "—";
  if (name === "expected_price") return "₹" + Number(value).toLocaleString("en-IN");
  return String(value);
}

export default function RecordDetailScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const isFocused = useIsFocused();
  const [record, setRecord] = useState<RecordData | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isFocused) return;
    api<RecordData>(`/records/${params.id}`)
      .then(setRecord)
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"));
  }, [params.id, isFocused]);

  function confirmDelete() {
    Alert.alert("Delete record", "This cannot be undone. Delete this record?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api(`/records/${params.id}`, { method: "DELETE" });
            navigation.goBack();
          } catch (e) {
            setError(e instanceof Error ? e.message : "Failed to delete");
          }
        },
      },
    ]);
  }

  const publicFields = FIELDS.filter((f) => !f.personal);
  const personalFields = FIELDS.filter((f) => f.personal);

  return (
    <View style={styles.root}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={record ? String(record.address || `Record #${record.id}`) : "Record"} />
        <Appbar.Action icon="pencil" onPress={() => navigation.navigate("RecordForm", { id: params.id })} />
        <Appbar.Action icon="delete" onPress={confirmDelete} />
      </Appbar.Header>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {!record ? (
        !error && <ActivityIndicator style={styles.spinner} />
      ) : (
        <ScrollView>
          <View style={styles.meta}>
            <Chip icon={record.consent_given ? "check" : "close"} compact>
              {record.consent_given ? "Consent given" : "No consent"}
            </Chip>
            <Text variant="bodySmall" style={styles.metaText}>
              #{record.id} · by {record.created_by} · {String(record.created_at).slice(0, 16).replace("T", " ")}
            </Text>
          </View>
          <List.Section>
            <List.Subheader>Property & legal</List.Subheader>
            {publicFields.map((f) => (
              <List.Item key={f.name} title={display(record, f.name)} description={f.label} />
            ))}
            <Divider />
            <List.Subheader>Owner & intent {record.consent_given ? "" : "(consent not given)"}</List.Subheader>
            {personalFields.map((f) => (
              <List.Item key={f.name} title={display(record, f.name)} description={f.label} />
            ))}
          </List.Section>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  spinner: { marginTop: 48 },
  error: { color: "#b3261e", textAlign: "center", margin: 8 },
  meta: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16, paddingBottom: 0 },
  metaText: { opacity: 0.6, flexShrink: 1 },
});
