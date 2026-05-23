import type { AiLog } from "@/lib/api/ehfTypes";

export type AiLogDisplayStatus = "pending" | "success" | "failed";

/** 将后端多种 status 归一为展示用状态 */
export function normalizeAiLogStatus(
  status: string,
  log?: Pick<AiLog, "duration_ms" | "error_message">
): AiLogDisplayStatus {
  const raw = (status ?? "").trim();
  const s = raw.toLowerCase();
  if (
    ["success", "completed", "ok", "done", "succeeded", "complete"].includes(s) ||
    raw === "成功" ||
    raw === "已完成" ||
    raw === "完成"
  ) {
    return "success";
  }
  if (
    ["failed", "error", "failure", "cancelled", "canceled"].includes(s) ||
    raw === "失败" ||
    raw === "错误"
  ) {
    return "failed";
  }
  if (
    log &&
    log.duration_ms != null &&
    log.duration_ms > 0 &&
    !log.error_message?.trim()
  ) {
    return "success";
  }
  return "pending";
}

export function getAiLogStatusLabel(status: string, log?: Pick<AiLog, "duration_ms" | "error_message">): string {
  switch (normalizeAiLogStatus(status, log)) {
    case "success":
      return "成功";
    case "failed":
      return "失败";
    default:
      return "待处理";
  }
}

export function getAiLogStatusVariant(
  status: string,
  log?: Pick<AiLog, "duration_ms" | "error_message">
): "success" | "destructive" | "secondary" {
  switch (normalizeAiLogStatus(status, log)) {
    case "success":
      return "success";
    case "failed":
      return "destructive";
    default:
      return "secondary";
  }
}

/** 筛选下拉：后端文档使用 completed 表示成功 */
export const AI_LOG_STATUS_FILTER_OPTIONS = [
  { value: "", label: "全部状态" },
  { value: "completed", label: "成功" },
  { value: "failed", label: "失败" },
  { value: "pending", label: "待处理" },
] as const;
