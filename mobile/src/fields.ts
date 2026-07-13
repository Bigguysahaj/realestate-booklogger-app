// src/fields.json is auto-copied from shared/fields.json (see scripts/sync-fields.js).
import fieldsJson from "./fields.json";

export interface FieldDef {
  name: string;
  label: string;
  type: "text" | "number" | "select";
  options?: string[];
  personal?: boolean;
  multiline?: boolean;
}

export const FIELDS = fieldsJson as FieldDef[];

export type RecordData = {
  id: number;
  created_at: string;
  created_by: string;
  consent_given: boolean;
  consent_timestamp: string | null;
} & { [key: string]: string | number | boolean | null };

/** Values as held by the form: everything is a string until save. */
export type FormValues = Record<string, string>;

export function recordToFormValues(record?: RecordData): FormValues {
  const values: FormValues = {};
  for (const f of FIELDS) {
    const v = record?.[f.name];
    values[f.name] = v === null || v === undefined ? "" : String(v);
  }
  return values;
}

export function formValuesToPayload(values: FormValues, consentGiven: boolean) {
  const payload: Record<string, unknown> = { consent_given: consentGiven };
  for (const f of FIELDS) {
    const raw = values[f.name]?.trim() ?? "";
    if (raw === "") {
      payload[f.name] = null;
    } else if (f.type === "number") {
      const n = Number(raw);
      payload[f.name] = Number.isFinite(n) ? n : null;
    } else {
      payload[f.name] = raw;
    }
  }
  return payload;
}
