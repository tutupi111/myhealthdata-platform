"use client";

import type { HealthRecord } from "@/lib/api/ehfTypes";

function asString(v: unknown): string | null {
  if (v == null || v === "") return null;
  return String(v);
}

function asStringArray(v: unknown): string[] {
  if (!Array.isArray(v)) return [];
  return v.map((x) => String(x)).filter(Boolean);
}

interface StructuredDataViewProps {
  data: Record<string, unknown>;
}

/** 将 structured_data 中的常见医学字段友好展示 */
export function StructuredDataView({ data }: StructuredDataViewProps) {
  const hospital = asString(data.hospital);
  const date = asString(data.date);
  const diagnosis = asStringArray(data.diagnosis);
  const notes = asString(data.notes);
  const tests = Array.isArray(data.tests) ? data.tests : [];

  const hasFriendly =
    hospital ||
    date ||
    diagnosis.length > 0 ||
    notes ||
    tests.length > 0;

  if (!hasFriendly) {
    return (
      <pre className="p-3 rounded-md bg-muted text-xs overflow-auto max-h-64">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }

  return (
    <div className="space-y-4 text-sm">
      {hospital && (
        <div>
          <span className="text-muted-foreground">医院 / 机构</span>
          <p className="font-medium mt-0.5">{hospital}</p>
        </div>
      )}
      {date && (
        <div>
          <span className="text-muted-foreground">日期</span>
          <p className="font-medium mt-0.5">{date}</p>
        </div>
      )}
      {diagnosis.length > 0 && (
        <div>
          <span className="text-muted-foreground">诊断</span>
          <ul className="mt-1 list-disc list-inside">
            {diagnosis.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        </div>
      )}
      {tests.length > 0 && (
        <div>
          <span className="text-muted-foreground">检查项</span>
          <ul className="mt-2 space-y-2">
            {tests.map((item, i) => {
              const row =
                item && typeof item === "object"
                  ? (item as Record<string, unknown>)
                  : null;
              if (!row) return null;
              const name = asString(row.name) ?? asString(row.test_name) ?? "—";
              const value = asString(row.value) ?? "—";
              const unit = asString(row.unit);
              return (
                <li
                  key={i}
                  className="rounded-md border border-border px-3 py-2 text-sm"
                >
                  <span className="font-medium">{name}</span>
                  {value !== "—" && (
                    <span className="text-muted-foreground ml-2">
                      {value}
                      {unit ? ` ${unit}` : ""}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}
      {notes && (
        <div>
          <span className="text-muted-foreground">备注</span>
          <p className="mt-0.5 whitespace-pre-wrap">{notes}</p>
        </div>
      )}
    </div>
  );
}

export function shouldUseStructuredDataView(record: HealthRecord): boolean {
  return Boolean(record.structured_data && Object.keys(record.structured_data).length > 0);
}
