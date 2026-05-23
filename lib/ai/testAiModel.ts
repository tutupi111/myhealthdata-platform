import { EhfApiError, ehfAdminTestAiModel, ehfAdminTestAiModelDraft } from "@/lib/api/ehfClient";
import type { AiModel } from "@/lib/api/ehfTypes";

export type AiModelTestOutcome = {
  ok: boolean;
  message: string;
  latencyMs?: number;
};

export async function testSavedAiModel(modelId: string): Promise<AiModelTestOutcome> {
  try {
    const res = await ehfAdminTestAiModel(modelId);
    return {
      ok: Boolean(res.ok),
      message: res.message || (res.ok ? "连通成功" : "连通失败"),
      latencyMs: res.latency_ms,
    };
  } catch (e) {
    if (e instanceof EhfApiError && e.status === 404) {
      return {
        ok: false,
        message:
          "服务器尚未提供模型测试接口（POST /v1/ehf/admin/ai-models/{id}/test）。请让后端按 docs/apidoc/EHF_ADMIN_AI_API_BACKEND_FIXES.md 实现。",
      };
    }
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export async function testDraftAiModel(input: {
  provider: string;
  model_name: string;
  base_url?: string | null;
  api_key: string;
}): Promise<AiModelTestOutcome> {
  if (!input.api_key.trim()) {
    return { ok: false, message: "请先填写 API Key 再测试" };
  }
  try {
    const res = await ehfAdminTestAiModelDraft({
      provider: input.provider.trim(),
      model_name: input.model_name.trim(),
      base_url: input.base_url?.trim() || null,
      api_key: input.api_key.trim(),
    });
    return {
      ok: Boolean(res.ok),
      message: res.message || (res.ok ? "连通成功" : "连通失败"),
      latencyMs: res.latency_ms,
    };
  } catch (e) {
    if (e instanceof EhfApiError && e.status === 404) {
      return {
        ok: false,
        message:
          "服务器尚未提供草稿测试接口。请保存模型后测试，或让后端实现 POST /v1/ehf/admin/ai-models/test。",
      };
    }
    return { ok: false, message: e instanceof Error ? e.message : String(e) };
  }
}

export function formatModelTestHint(m: AiModel): string {
  if (!m.api_key_set) {
    return "未配置 API Key，请编辑并保存密钥后再测试";
  }
  return "";
}
