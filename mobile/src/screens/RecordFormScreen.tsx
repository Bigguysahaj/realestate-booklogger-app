import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import type { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Button,
  Checkbox,
  Divider,
  HelperText,
  Text,
  TextInput,
} from "react-native-paper";
import { api } from "../api";
import SelectInput from "../components/SelectInput";
import {
  FIELDS,
  FieldDef,
  FormValues,
  RecordData,
  formValuesToPayload,
  recordToFormValues,
} from "../fields";
import type { RootStackParamList } from "../types";

type Nav = NativeStackNavigationProp<RootStackParamList>;
type Route = RouteProp<RootStackParamList, "RecordForm">;

export default function RecordFormScreen() {
  const navigation = useNavigation<Nav>();
  const { params } = useRoute<Route>();
  const editingId = params?.id;

  const [values, setValues] = useState<FormValues>(recordToFormValues());
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(!!editingId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!editingId) return;
    api<RecordData>(`/records/${editingId}`)
      .then((record) => {
        setValues(recordToFormValues(record));
        setConsent(record.consent_given);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, [editingId]);

  const set = (name: string) => (value: string) =>
    setValues((prev) => ({ ...prev, [name]: value }));

  async function save() {
    setSaving(true);
    setError("");
    try {
      const payload = formValuesToPayload(values, consent);
      if (editingId) {
        await api(`/records/${editingId}`, { method: "PUT", body: JSON.stringify(payload) });
      } else {
        await api("/records", { method: "POST", body: JSON.stringify(payload) });
      }
      navigation.goBack();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function renderField(f: FieldDef) {
    const disabled = !!f.personal && !consent;
    if (f.type === "select") {
      return (
        <SelectInput
          key={f.name}
          label={f.label}
          value={values[f.name]}
          options={f.options ?? []}
          disabled={disabled}
          onChange={set(f.name)}
        />
      );
    }
    return (
      <TextInput
        key={f.name}
        mode="outlined"
        label={f.label}
        value={values[f.name]}
        onChangeText={set(f.name)}
        disabled={disabled}
        keyboardType={f.type === "number" ? "numeric" : "default"}
        multiline={!!f.multiline}
        numberOfLines={f.multiline ? 4 : 1}
      />
    );
  }

  const publicFields = FIELDS.filter((f) => !f.personal);
  const personalFields = FIELDS.filter((f) => f.personal);

  return (
    <View style={styles.root}>
      <Appbar.Header>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={editingId ? "Edit record" : "New record"} />
      </Appbar.Header>
      {loading ? (
        <ActivityIndicator style={styles.spinner} />
      ) : (
        <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled">
          {publicFields.map(renderField)}

          <Divider style={styles.divider} />
          <Checkbox.Item
            label="Owner gave consent to record personal details"
            status={consent ? "checked" : "unchecked"}
            onPress={() => setConsent((c) => !c)}
            position="leading"
            labelStyle={styles.consentLabel}
          />
          {!consent && (
            <Text variant="bodySmall" style={styles.consentHint}>
              Personal fields are locked until consent is given. They are not saved without it.
            </Text>
          )}
          {personalFields.map(renderField)}

          <HelperText type="error" visible={!!error}>
            {error}
          </HelperText>
          <Button mode="contained" onPress={save} loading={saving} disabled={saving}>
            {editingId ? "Save changes" : "Add record"}
          </Button>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  spinner: { marginTop: 48 },
  form: { padding: 16, gap: 10, paddingBottom: 48 },
  divider: { marginVertical: 8 },
  consentLabel: { textAlign: "left" },
  consentHint: { opacity: 0.6, marginBottom: 4, marginHorizontal: 8 },
});
