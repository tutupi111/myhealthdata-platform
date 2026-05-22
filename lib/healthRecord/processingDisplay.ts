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
