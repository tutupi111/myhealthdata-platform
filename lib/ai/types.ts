/**
 * AI 解析输出结构（structured_extract 任务）
 */

export interface StructuredExtractOutput {
  document_type: string;
  summary: string;
  tags: string[];
  structured_data: {
    hospital?: string;
    date?: string;
    diagnosis?: string[];
    tests?: string[];
    notes?: string;
    [key: string]: unknown;
  };
}

export function parseStructuredExtractOutput(raw: string): StructuredExtractOutput | null {
  try {
    const trimmed = raw.trim();
    const jsonStr = trimmed.startsWith("```") ? trimmed.replace(/^```(?:json)?\s*/, "").replace(/\s*```$/, "") : trimmed;
    const parsed = JSON.parse(jsonStr) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const o = parsed as Record<string, unknown>;
    return {
      document_type: typeof o.document_type === "string" ? o.document_type : "unknown",
      summary: typeof o.summary === "string" ? o.summary : "",
      tags: Array.isArray(o.tags) ? (o.tags as unknown[]).filter((t): t is string => typeof t === "string") : [],
      structured_data: o.structured_data && typeof o.structured_data === "object"
        ? (o.structured_data as StructuredExtractOutput["structured_data"])
        : {},
    };
  } catch {
    return null;
  }
}
