import type { AiLog } from "@/lib/api/ehfTypes";
import { extractApiList } from "@/lib/api/unwrapApiResponse";

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function pickDurationMs(obj: Record<string, unknown>): number | null {
  for (const key of ["duration_ms", "durationMs", "elapsed_ms", "elapsedMs", "duration"]) {
    const v = obj[key];
    if (typeof v === "number" && !Number.isNaN(v)) {
      if (key === "duration" && v > 0 && v < 600) return Math.round(v * 1000);
      return Math.round(v);
    }
    if (typeof v === "string" && v.trim()) {
      const n = parseFloat(v);
      if (!Number.isNaN(n)) {
        if (key === "duration" && n > 0 && n < 600) return Math.round(n * 1000);
        return Math.round(n);
      }
    }
  }
  return null;
}

function normalizeStatusValue(raw: unknown): string {
  if (raw == null) return "";
  if (typeof raw === "boolean") return raw ? "completed" : "pending";
  if (typeof raw === "number") {
    if (raw === 1 || raw === 2) return "completed";
    if (raw === 3 || raw < 0) return "failed";
    return "pending";
  }
  const s = String(raw).trim();
  const lower = s.toLowerCase();
  if (lower === "成功" || s === "已完成" || s === "完成") return "completed";
  if (lower === "失败" || s === "错误") return "failed";
  if (lower === "待处理" || lower === "处理中") return "pending";
  return lower;
}

/** 将 ai-logs 列表项归一为 AiLog */
export function normalizeAiLogRow(item: unknown): AiLog {
  const raw = (item && typeof item === "object" ? item : {}) as Record<string, unknown>;
  const duration_ms = pickDurationMs(raw);
  const error_message =
    pickString(raw, "error_message", "errorMessage", "error", "message") ?? null;

  let status = normalizeStatusValue(
    raw.status ?? raw.state ?? raw.log_status ?? raw.logStatus
  );

  if (
    !status ||
    status === "pending" ||
    status === "processing" ||
    status === "running"
  ) {
    if (error_message) {
      status = "failed";
    } else if (duration_ms != null && duration_ms > 0) {
      status = "completed";
    }
  }

  return {
    id: String(raw.id ?? ""),
    record_id: pickString(raw, "record_id", "recordId") ?? null,
    task_type: String(raw.task_type ?? raw.taskType ?? ""),
    model_name:
      pickString(raw, "model_name", "modelName", "model") ?? null,
    status,
    duration_ms,
    error_message,
    token_usage:
      raw.token_usage && typeof raw.token_usage === "object"
        ? (raw.token_usage as Record<string, unknown>)
        : raw.tokenUsage && typeof raw.tokenUsage === "object"
          ? (raw.tokenUsage as Record<string, unknown>)
          : null,
    created_at:
      typeof raw.created_at === "number"
        ? raw.created_at
        : typeof raw.createdAt === "number"
          ? raw.createdAt
          : 0,
  };
}

export function normalizeAiLogRows(data: unknown): AiLog[] {
  return extractApiList(data).map(normalizeAiLogRow);
}
