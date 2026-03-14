/** 固定任务类型（与 PRD / 数据库一致） */
export const AI_TASK_TYPES = [
  "ocr_extract",
  "doc_classify",
  "structured_extract",
  "tagging",
  "summary",
] as const;

export type TaskType = (typeof AI_TASK_TYPES)[number];

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  ocr_extract: "OCR 识别",
  doc_classify: "文档分类",
  structured_extract: "结构化抽取",
  tagging: "标签生成",
  summary: "摘要生成",
};

/** AI 模型（列表/表单） */
export interface AiModel {
  id: string;
  provider: string;
  model_name: string;
  base_url: string | null;
  api_key?: string | null;
  supports_vision: boolean;
  supports_json: boolean;
  is_default: boolean;
  is_active: boolean;
  priority: number;
  notes: string | null;
  created_at: string;
}

/** 创建/更新模型时 api_key 可选传入，列表接口不返回明文 */
export interface AiModelForm {
  provider: string;
  model_name: string;
  base_url?: string | null;
  api_key?: string | null;
  supports_vision?: boolean;
  supports_json?: boolean;
  is_default?: boolean;
  is_active?: boolean;
  priority?: number;
  notes?: string | null;
}

/** AI 任务配置 */
export interface AiTaskConfig {
  id: string;
  task_type: TaskType;
  preferred_model_id: string | null;
  fallback_model_id: string | null;
  prompt_template: string | null;
  timeout: number;
  max_tokens: number;
  is_enabled: boolean;
  created_at: string;
  updated_at?: string;
  preferred_model?: AiModel | null;
  fallback_model?: AiModel | null;
}

export interface AiTaskConfigForm {
  preferred_model_id?: string | null;
  fallback_model_id?: string | null;
  prompt_template?: string | null;
  timeout?: number;
  max_tokens?: number;
  is_enabled?: boolean;
}

/** AI 执行日志 */
export type AiLogStatus = "pending" | "success" | "failed";

export interface AiLog {
  id: string;
  record_id: string | null;
  task_type: string;
  model_name: string | null;
  status: AiLogStatus;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
}
