import type { HealthRecord } from "@/lib/api/ehfTypes";
import type { Messages } from "@/lib/i18n/types";

export type ProcessingFailureKind = "ocr_failed" | "structured_failed";

/** 仍为旧版占位解析结果 */
export function isPlaceholderProcessing(record: HealthRecord): boolean {
  if (record.ai_summary?.includes("占位解析")) return true;
  const sd = record.structured_data;
  if (!sd || typeof sd !== "object") return false;
  const keys = Object.keys(sd);
  return keys.length > 0 && keys.every((k) => k === "file_name" || k === "file_type");
}

export function hasExtractedText(record: HealthRecord): boolean {
  return Boolean(record.extracted_text?.trim());
}

export function getProcessingFailureKind(record: HealthRecord): ProcessingFailureKind | null {
  if (record.processing_status !== "failed") return null;
  return hasExtractedText(record) ? "structured_failed" : "ocr_failed";
}

export function hasMeaningfulStructuredData(record: HealthRecord): boolean {
  const sd = record.structured_data;
  if (!sd || typeof sd !== "object") return false;
  return Object.keys(sd).some((k) => k !== "file_name" && k !== "file_type");
}

/** 患者详情：对 Moonshot/LLM 类错误给出管理端排查提示 */
export function getLlmConfigHint(processingError: string | null | undefined): string | null {
  if (!processingError?.trim()) return null;
  const lower = processingError.toLowerCase();
  if (lower.includes("deepseek")) {
    return "DeepSeek：Base URL 填 https://api.deepseek.com（官方无需 /v1）；模型名用 deepseek-v4-flash 或 deepseek-v4-pro。若 URL 已是 …/chat/completions 仍 400，多为模型名错误或后端请求参数不兼容，请到「AI 模型」核对 model_name 并查看 AI 日志中的完整错误体。";
  }
  if (
    lower.includes("moonshot") ||
    lower.includes("deepseek") ||
    lower.includes("minimax") ||
    lower.includes("chat/completions") ||
    lower.includes("400 bad request") ||
    lower.includes("401") ||
    lower.includes("404")
  ) {
    return "这通常表示 structured_extract 调用的模型配置有误（模型名、base_url 或 API Key）。Base URL 填到 /v1 为止，不要含 /chat/completions。请到管理后台「AI 模型 / AI 任务」检查，或查看 AI 日志。若已有「原始识别文字」，说明 OCR 已成功，仅需修正 LLM 后重试。";
  }
  return null;
}

export function getProcessingStatusLabel(
  status: string,
  labels: Messages["recordProcessing"]
): string {
  switch (status) {
    case "uploaded":
      return labels.statusUploaded;
    case "processing":
      return labels.statusProcessing;
    case "completed":
      return labels.statusCompleted;
    case "failed":
      return labels.statusFailed;
    default:
      return labels.statusUnknown;
  }
}
