import type { AiModel, AiTaskConfig } from "@/lib/api/ehfTypes";

/** 后端 GET 可能返回的扩展字段（仅 id 或扁平 model_name） */
export type AiTaskConfigRow = AiTaskConfig & {
  preferred_model_name?: string | null;
  fallback_model_name?: string | null;
};

function pickString(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function pickNestedModelName(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const name = (value as { model_name?: string }).model_name;
  return typeof name === "string" && name.trim() ? name.trim() : null;
}

/** 将列表接口各种形态归一为前端使用的配置行 */
export function normalizeAiTaskConfigRows(
  data: unknown
): AiTaskConfigRow[] {
  let list: unknown[] = [];
  if (Array.isArray(data)) {
    list = data;
  } else if (data && typeof data === "object") {
    const o = data as Record<string, unknown>;
    if (Array.isArray(o.items)) list = o.items;
    else if (Array.isArray(o.configs)) list = o.configs;
  }

  return list.map((item) => {
    const raw = item as Record<string, unknown>;
    const preferred_model_id = pickString(raw, "preferred_model_id", "preferredModelId");
    const fallback_model_id = pickString(raw, "fallback_model_id", "fallbackModelId");

    const preferredFlat =
      typeof raw.preferred_model === "string" ? raw.preferred_model.trim() : null;
    const fallbackFlat =
      typeof raw.fallback_model === "string" ? raw.fallback_model.trim() : null;

    return {
      ...(raw as AiTaskConfig),
      id: String(raw.id ?? ""),
      task_type: String(raw.task_type ?? ""),
      preferred_model_id,
      fallback_model_id,
      preferred_model_name:
        preferredFlat ??
        pickNestedModelName(raw.preferred_model) ??
        pickString(raw, "preferred_model_name", "preferredModelName"),
      fallback_model_name:
        fallbackFlat ??
        pickNestedModelName(raw.fallback_model) ??
        pickString(raw, "fallback_model_name", "fallbackModelName"),
      preferred_model:
        raw.preferred_model && typeof raw.preferred_model === "object"
          ? (raw.preferred_model as AiModel)
          : null,
      fallback_model:
        raw.fallback_model && typeof raw.fallback_model === "object"
          ? (raw.fallback_model as AiModel)
          : null,
    } as AiTaskConfigRow;
  });
}

/** 表格/摘要：首选或备用模型展示文案 */
export function formatTaskConfigModelLabel(
  modelId: string | null | undefined,
  models: AiModel[],
  options?: {
    nested?: { model_name?: string; provider?: string } | null;
    flatName?: string | null;
  }
): string {
  const flat = options?.flatName?.trim();
  if (flat) return flat;

  const nestedName = options?.nested?.model_name?.trim();
  const nestedProvider = options?.nested?.provider?.trim();
  if (nestedName) {
    return nestedProvider ? `${nestedProvider} / ${nestedName}` : nestedName;
  }

  if (!modelId) return "—";

  const found = models.find((m) => m.id === modelId);
  if (found) {
    return `${found.provider} / ${found.model_name}`;
  }

  return `已配置（${modelId.slice(0, 12)}…）`;
}
