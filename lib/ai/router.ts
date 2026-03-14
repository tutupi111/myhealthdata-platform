/**
 * 按任务类型从 ai_task_configs + ai_models 解析出 preferred 模型配置，供调用方使用。
 */

import { supabaseAdmin } from "@/lib/supabase/server";

export interface ModelConfig {
  modelName: string;
  baseUrl: string | null;
  apiKey: string | null;
  timeout: number;
  maxTokens: number;
  /** 经模型兼容处理后的 temperature，调用方直接使用即可 */
  temperature: number;
}

const TASK_STRUCTURED_EXTRACT = "structured_extract";

/** 仅允许 temperature=1 的模型（如 Moonshot / kimi-k2.5）*/
const TEMPERATURE_MUST_BE_ONE = [
  "kimi-k2.5",
  "moonshot",
  "moonshot-v1",
  "moonshot-v2",
  "moonshot-v3",
];

function normalizeModelName(name: string): string {
  return (name || "").toLowerCase().trim();
}

function modelRequiresTemperatureOne(modelName: string): boolean {
  const n = normalizeModelName(modelName);
  return TEMPERATURE_MUST_BE_ONE.some((m) => n.includes(m) || n === m);
}

/**
 * 按模型做 temperature 兼容：部分模型仅允许 temperature=1，否则使用配置值或默认 0.2。
 */
export function getEffectiveTemperature(
  modelName: string,
  configTemperature?: number | null
): number {
  if (modelRequiresTemperatureOne(modelName)) return 1;
  if (typeof configTemperature === "number" && configTemperature >= 0 && configTemperature <= 2) {
    return configTemperature;
  }
  return 0.2;
}

export async function getModelForStructuredExtract(): Promise<ModelConfig | null> {
  if (!supabaseAdmin) return null;

  const { data: config, error: configErr } = await supabaseAdmin
    .from("ai_task_configs")
    .select("preferred_model_id, timeout, max_tokens")
    .eq("task_type", TASK_STRUCTURED_EXTRACT)
    .eq("is_enabled", true)
    .maybeSingle();

  if (configErr || !config || !config.preferred_model_id) return null;

  const { data: model, error: modelErr } = await supabaseAdmin
    .from("ai_models")
    .select("model_name, base_url, api_key")
    .eq("id", config.preferred_model_id)
    .eq("is_active", true)
    .maybeSingle();

  if (modelErr || !model) return null;

  // 若 ai_task_configs 已增加 temperature 列，可在 select 中加入 "temperature"
  const configTemp = (config as { temperature?: number | null } | undefined)?.temperature;
  const temperature = getEffectiveTemperature(model.model_name, configTemp);

  return {
    modelName: model.model_name,
    baseUrl: model.base_url || null,
    apiKey: model.api_key || null,
    timeout: typeof config.timeout === "number" ? config.timeout : 60,
    maxTokens: typeof config.max_tokens === "number" ? config.max_tokens : 4096,
    temperature,
  };
}
