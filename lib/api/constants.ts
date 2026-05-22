/** record_type / data_scope 与中文展示映射 */

export const TASK_TYPE_LABELS: Record<string, string> = {
  ocr_extract: "OCR 识别",
  doc_classify: "文档分类",
  structured_extract: "结构化抽取",
  tagging: "标签生成",
  summary: "摘要生成",
};

export const RECORD_TYPE_LABELS: Record<string, string> = {
  outpatient_note: "门诊记录",
  discharge_summary: "出院小结",
  exam_report: "检查报告",
  imaging: "影像资料",
  genetic_test: "基因检测",
  medication: "用药记录",
  questionnaire: "问卷",
  other: "其他",
};

export function recordTypeLabel(code: string | null | undefined): string {
  if (!code) return "—";
  return RECORD_TYPE_LABELS[code] ?? code;
}

export function recordTypeCodes(): string[] {
  return Object.keys(RECORD_TYPE_LABELS);
}

export function projectStatusLabel(status: string): string {
  if (status === "published") return "招募中";
  if (status === "closed") return "已结束";
  if (status === "draft") return "草稿";
  return status;
}

export function isProjectRecruiting(status: string): boolean {
  return status === "published";
}

export function consentStatusLabel(status: string): string {
  if (status === "active") return "有效";
  if (status === "expired") return "已到期";
  if (status === "revoked") return "已撤回";
  return status;
}

export function processingStatusLabel(status: string): string {
  if (status === "uploaded") return "已上传";
  if (status === "processing") return "解析中";
  if (status === "completed") return "已完成";
  if (status === "failed") return "失败";
  return "处理中";
}

export function fileTypeLabel(mime: string): string {
  if (mime.startsWith("image/")) return "图片";
  if (mime.includes("pdf")) return "PDF";
  if (mime.includes("word") || mime.includes("document")) return "Word";
  return mime || "文件";
}

/** 后端 Unix 秒或 ISO 字符串 → 本地化日期 */
export function formatEhfDate(
  ts: number | string | null | undefined,
  withTime = false
): string {
  if (ts == null || ts === "") return "—";
  try {
    const d =
      typeof ts === "number"
        ? new Date(ts * 1000)
        : new Date(ts);
    if (Number.isNaN(d.getTime())) return String(ts);
    if (withTime) {
      return d.toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    }
    return d.toLocaleDateString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    });
  } catch {
    return String(ts);
  }
}

export function parseApiErrorMessage(err: unknown): string {
  if (err instanceof Error) {
    const msg = err.message;
    try {
      const match = msg.match(/API \d+: (.+)/);
      if (match?.[1]) {
        const parsed = JSON.parse(match[1]) as { error?: string; detail?: string };
        return parsed.error ?? parsed.detail ?? msg;
      }
    } catch {
      // ignore
    }
    return msg;
  }
  return "请求失败";
}
