import type { AiLog, AiModel, AiTaskConfig } from "@/lib/api/ehfTypes";
import { extractTaskConfigList } from "@/lib/api/unwrapApiResponse";

const TASK_CONFIG_DISPLAY_CACHE_KEY = "ehf_admin_task_config_display_v1";

export type TaskConfigDisplayCacheEntry = {
  task_type?: string;
  preferred_model_id?: string | null;
  fallback_model_id?: string | null;
  preferred_label?: string | null;
  fallback_label?: string | null;
};

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

  const bindings =
    raw.model_bindings && typeof raw.model_bindings === "object"
      ? (raw.model_bindings as Record<string, unknown>)
      : null;

  let modelId =
    pickId(raw, `${prefix}_model_id`, `${prefix}ModelId`, `${prefix}_ai_model_id`) ??
    (bindings ? pickId(bindings, prefix, `${prefix}_model_id`, `${prefix}ModelId`) : null) ??
    null;
  let modelName =
    pickString(raw, `${prefix}_model_name`, `${prefix}ModelName`) ??
    (bindings ? pickString(bindings, `${prefix}_model_name`, `${prefix}ModelName`) : null) ??
    null;
  let nested: AiModel | null = null;

  if (!modelId && prefix === "preferred") {
    modelId = pickId(raw, "model_id", "modelId", "default_model_id", "defaultModelId");
  }

  if (typeof ref === "string" && ref.trim()) {
    const s = ref.trim();
    if (
      /^aim_/i.test(s) ||
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)
    ) {
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
  const list = extractTaskConfigList(data);

  return list.map((item) => {
    const raw = item as Record<string, unknown>;
    const preferred = resolveModelRef(raw, "preferred");
    const fallback = resolveModelRef(raw, "fallback");

    return {
      ...(raw as unknown as AiTaskConfig),
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
    const byId = models.find(
      (m) =>
        m.id.toLowerCase() === lower ||
        m.id.endsWith(id) ||
        id.endsWith(m.id) ||
        m.id.replace(/^aim_/, "") === id.replace(/^aim_/, "")
    );
    if (byId) return byId;
    const byNameFromId = models.find(
      (m) =>
        m.model_name.toLowerCase() === lower ||
        `${m.provider}/${m.model_name}`.toLowerCase() === lower
    );
    if (byNameFromId) return byNameFromId;
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

export function formatTaskConfigModelLabelWithRecent(
  modelId: string | null | undefined,
  models: AiModel[],
  options?: {
    nested?: { model_name?: string; provider?: string } | null;
    flatName?: string | null;
    recentModelName?: string | null;
  }
): string {
  const primary = formatTaskConfigModelLabel(modelId, models, options);
  if (primary !== "—") return primary;
  const recent = options?.recentModelName?.trim();
  if (recent) return `${recent}（最近执行）`;
  return "—";
}

export function loadTaskConfigDisplayCache(): Record<string, TaskConfigDisplayCacheEntry> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(TASK_CONFIG_DISPLAY_CACHE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, TaskConfigDisplayCacheEntry>;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveTaskConfigDisplayCache(
  configId: string,
  entry: TaskConfigDisplayCacheEntry,
  taskType?: string
): void {
  if (typeof window === "undefined") return;
  const all = loadTaskConfigDisplayCache();
  all[configId] = entry;
  if (taskType) {
    all[`task:${taskType}`] = { ...entry, task_type: taskType };
  }
  localStorage.setItem(TASK_CONFIG_DISPLAY_CACHE_KEY, JSON.stringify(all));
}

/** 用模型列表补全 id / 展示名 */
export function enrichTaskConfigsWithModels(
  rows: AiTaskConfigRow[],
  models: AiModel[]
): AiTaskConfigRow[] {
  return rows.map((row) => {
    const pref = findAiModelByRef(
      models,
      row.preferred_model_id,
      row.preferred_model_name ?? row.preferred_model?.model_name
    );
    const fall = findAiModelByRef(
      models,
      row.fallback_model_id,
      row.fallback_model_name ?? row.fallback_model?.model_name
    );
    return {
      ...row,
      preferred_model_id: pref?.id ?? row.preferred_model_id,
      fallback_model_id: fall?.id ?? row.fallback_model_id,
      preferred_model: pref ?? row.preferred_model ?? null,
      fallback_model: fall ?? row.fallback_model ?? null,
      preferred_model_name: pref
        ? `${pref.provider} / ${pref.model_name}`
        : row.preferred_model_name,
      fallback_model_name: fall
        ? `${fall.provider} / ${fall.model_name}`
        : row.fallback_model_name,
    };
  });
}

export function applyTaskConfigDisplayCache(rows: AiTaskConfigRow[]): AiTaskConfigRow[] {
  const cache = loadTaskConfigDisplayCache();
  return rows.map((row) => {
    const c =
      cache[row.id] ??
      (row.task_type ? cache[`task:${row.task_type}`] : undefined);
    if (!c) return row;
    return {
      ...row,
      preferred_model_id: row.preferred_model_id ?? c.preferred_model_id ?? null,
      fallback_model_id: row.fallback_model_id ?? c.fallback_model_id ?? null,
      preferred_model_name: row.preferred_model_name ?? c.preferred_label ?? null,
      fallback_model_name: row.fallback_model_name ?? c.fallback_label ?? null,
    };
  });
}

/** 从 AI 日志推断各任务类型最近使用的模型名（GET 未返回绑定时用于展示） */
export function buildLatestModelNameByTaskType(logs: AiLog[]): Map<string, string> {
  const sorted = [...logs].sort((a, b) => (b.created_at ?? 0) - (a.created_at ?? 0));
  const map = new Map<string, string>();
  for (const log of sorted) {
    const name = log.model_name?.trim();
    if (name && !map.has(log.task_type)) {
      map.set(log.task_type, name);
    }
  }
  return map;
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

  const preferredLabel = preferredModel
    ? `${preferredModel.provider} / ${preferredModel.model_name}`
    : row.preferred_model_name ?? null;
  const fallbackLabel = fallbackModel
    ? `${fallbackModel.provider} / ${fallbackModel.model_name}`
    : row.fallback_model_name ?? null;

  const entry: TaskConfigDisplayCacheEntry = {
    task_type: row.task_type,
    preferred_model_id: preferredId,
    fallback_model_id: fallbackId,
    preferred_label: preferredLabel,
    fallback_label: fallbackLabel,
  };
  saveTaskConfigDisplayCache(row.id, entry, row.task_type);

  return {
    ...row,
    preferred_model_id: preferredId,
    fallback_model_id: fallbackId,
    preferred_model: preferredModel ?? row.preferred_model ?? null,
    fallback_model: fallbackModel ?? row.fallback_model ?? null,
    preferred_model_name: preferredLabel,
    fallback_model_name: fallbackLabel,
  };
}
