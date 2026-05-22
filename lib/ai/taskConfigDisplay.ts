import type { AiModel, AiTaskConfig } from "@/lib/api/ehfTypes";
import { extractApiList } from "@/lib/api/unwrapApiResponse";

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

function pickId(obj: Record<string, unknown>, ...keys: string[]): string | null {
  for (const key of keys) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (typeof v === "number" && !Number.isNaN(v)) return String(v);
  }
  return null;
}

function pickNestedModelName(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const o = value as Record<string, unknown>;
  return (
    pickString(o, "model_name", "modelName", "name", "display_name", "displayName") ??
    null
  );
}

function pickNestedModelId(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  return pickId(value as Record<string, unknown>, "id", "model_id", "modelId");
}

function resolveModelRef(
  raw: Record<string, unknown>,
  prefix: "preferred" | "fallback"
): {
  modelId: string | null;
  modelName: string | null;
  nested: AiModel | null;
} {
  const modelKey = `${prefix}_model`;
  const ref = raw[modelKey];

  let modelId =
    pickId(raw, `${prefix}_model_id`, `${prefix}ModelId`, `${prefix}_ai_model_id`) ??
    null;
  let modelName =
    pickString(raw, `${prefix}_model_name`, `${prefix}ModelName`) ?? null;
  let nested: AiModel | null = null;

  if (typeof ref === "string" && ref.trim()) {
    const s = ref.trim();
    if (/^aim_|^[0-9a-f-]{8}-[0-9a-f-]{4}-/i.test(s)) {
      modelId = modelId ?? s;
    } else {
      modelName = modelName ?? s;
    }
  } else if (ref && typeof ref === "object") {
    nested = ref as AiModel;
    modelId = modelId ?? pickNestedModelId(ref);
    modelName = modelName ?? pickNestedModelName(ref);
  }

  return { modelId, modelName, nested };
}

/** 将列表接口各种形态归一为前端使用的配置行 */
export function normalizeAiTaskConfigRows(data: unknown): AiTaskConfigRow[] {
  const list = extractApiList(data);

  return list.map((item) => {
    const raw = item as Record<string, unknown>;
    const preferred = resolveModelRef(raw, "preferred");
    const fallback = resolveModelRef(raw, "fallback");

    return {
      ...(raw as AiTaskConfig),
      id: String(raw.id ?? ""),
      task_type: String(raw.task_type ?? raw.taskType ?? ""),
      preferred_model_id: preferred.modelId,
      fallback_model_id: fallback.modelId,
      preferred_model_name: preferred.modelName,
      fallback_model_name: fallback.modelName,
      preferred_model: preferred.nested,
      fallback_model: fallback.nested,
    } as AiTaskConfigRow;
  });
}

export function findAiModelByRef(
  models: AiModel[],
  modelId?: string | null,
  modelName?: string | null
): AiModel | undefined {
  if (modelId) {
    const id = modelId.trim();
    const exact = models.find((m) => m.id === id);
    if (exact) return exact;
    const lower = id.toLowerCase();
    return models.find(
      (m) =>
        m.id.toLowerCase() === lower ||
        m.id.endsWith(id) ||
        id.endsWith(m.id) ||
        m.id.replace(/^aim_/, "") === id.replace(/^aim_/, "")
    );
  }
  if (modelName) {
    const n = modelName.trim().toLowerCase();
    return models.find((m) => {
      const name = m.model_name.toLowerCase();
      const full = `${m.provider} / ${m.model_name}`.toLowerCase();
      const slash = `${m.provider}/${m.model_name}`.toLowerCase();
      return name === n || full === n || slash === n || n.includes(name);
    });
  }
  return undefined;
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
  const nestedName = options?.nested?.model_name?.trim();
  const nestedProvider = options?.nested?.provider?.trim();

  const matched = findAiModelByRef(models, modelId, flat ?? nestedName ?? null);
  if (matched) {
    return `${matched.provider} / ${matched.model_name}`;
  }

  if (flat) return flat;
  if (nestedName) {
    return nestedProvider ? `${nestedProvider} / ${nestedName}` : nestedName;
  }

  if (!modelId) return "—";

  return `已配置（${modelId.length > 16 ? `${modelId.slice(0, 16)}…` : modelId}）`;
}

/** 保存后合并表单与模型列表，保证表格即时显示 */
export function mergeTaskConfigAfterSave(
  row: AiTaskConfigRow,
  patch: {
    preferred_model_id?: string | null;
    fallback_model_id?: string | null;
  },
  models: AiModel[]
): AiTaskConfigRow {
  const preferredId = patch.preferred_model_id ?? row.preferred_model_id ?? null;
  const fallbackId = patch.fallback_model_id ?? row.fallback_model_id ?? null;
  const preferredModel = findAiModelByRef(models, preferredId);
  const fallbackModel = findAiModelByRef(models, fallbackId);

  return {
    ...row,
    preferred_model_id: preferredId,
    fallback_model_id: fallbackId,
    preferred_model: preferredModel ?? row.preferred_model ?? null,
    fallback_model: fallbackModel ?? row.fallback_model ?? null,
    preferred_model_name: preferredModel
      ? `${preferredModel.provider} / ${preferredModel.model_name}`
      : row.preferred_model_name ?? null,
    fallback_model_name: fallbackModel
      ? `${fallbackModel.provider} / ${fallbackModel.model_name}`
      : row.fallback_model_name ?? null,
  };
}
