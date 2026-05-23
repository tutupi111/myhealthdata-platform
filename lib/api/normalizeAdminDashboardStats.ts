import type { AdminDashboardStats } from "@/lib/api/ehfTypes";
import { unwrapApiPayload } from "@/lib/api/unwrapApiResponse";

function pickCount(obj: Record<string, unknown>, ...keys: string[]): number {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "number" && !Number.isNaN(v)) return Math.max(0, Math.round(v));
    if (typeof v === "string" && v.trim()) {
      const n = Number.parseInt(v, 10);
      if (!Number.isNaN(n)) return Math.max(0, n);
    }
  }
  return 0;
}

function resolveStatsObject(body: unknown): Record<string, unknown> {
  let payload = unwrapApiPayload(body);
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    const o = payload as Record<string, unknown>;
    const nested = o.stats ?? o.counts ?? o.totals ?? o.summary;
    if (nested && typeof nested === "object" && !Array.isArray(nested)) {
      payload = nested;
    }
  }
  if (payload && typeof payload === "object" && !Array.isArray(payload)) {
    return payload as Record<string, unknown>;
  }
  return {};
}

/** 解包 App Data Hub 的 data/stats 包装，并兼容多种计数字段名 */
export function normalizeAdminDashboardStats(body: unknown): AdminDashboardStats {
  const raw = resolveStatsObject(body);

  return {
    patient_count: pickCount(
      raw,
      "patient_count",
      "patientCount",
      "patients_count",
      "patients",
      "total_patients"
    ),
    researcher_count: pickCount(
      raw,
      "researcher_count",
      "researcherCount",
      "researchers_count",
      "researchers",
      "total_researchers"
    ),
    project_count: pickCount(
      raw,
      "project_count",
      "projectCount",
      "projects_count",
      "projects",
      "total_projects",
      "research_project_count"
    ),
    consent_count: pickCount(
      raw,
      "consent_count",
      "consentCount",
      "consents_count",
      "consents",
      "total_consents",
      "authorization_count"
    ),
    health_record_count: pickCount(
      raw,
      "health_record_count",
      "healthRecordCount",
      "health_records_count",
      "health_records",
      "records_count",
      "record_count",
      "total_health_records"
    ),
  };
}
