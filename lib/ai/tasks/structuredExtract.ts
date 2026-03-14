/**
 * structured_extract：将提取的文本交给兼容 OpenAI Chat Completions 的模型，要求返回 JSON。
 * 真实 HTTP 请求在此文件内 fetch() 发出。含 30 秒超时，步骤日志 [AI STEP 1-4] 与 [AI REAL CALL]。
 */

import { getModelForStructuredExtract } from "../router";
import {
  parseStructuredExtractOutput,
  type StructuredExtractOutput,
} from "../types";

const FETCH_TIMEOUT_MS = 30000; // 30 秒

const DEFAULT_SYSTEM = `你是一个医疗文档结构化解析助手。根据用户提供的文档原文，输出唯一一段合法的 JSON，不要包含其他说明或代码块标记。
JSON 必须包含以下字段（均为英文 key）：
- document_type: 文档类型，如 lab_report, discharge_summary, outpatient_note, prescription, image_unparsed 等
- summary: 简短中文摘要（一两句话）
- tags: 字符串数组，如 ["vision", "pediatric", "assessment"]
- structured_data: 对象，包含 hospital(医院), date(日期), diagnosis(诊断数组), tests(检查项), notes(备注) 等，可留空字符串或空数组`;

export type StructuredExtractResult =
  | { ok: true; output: StructuredExtractOutput }
  | { ok: false; error: string };

export async function runStructuredExtract(
  extractedText: string
): Promise<StructuredExtractResult> {
  const model = await getModelForStructuredExtract();
  console.log("[AI STEP 1] got model config", {
    hasModel: Boolean(model),
    modelName: model?.modelName,
  });

  if (!model) {
    return { ok: false, error: "未配置 structured_extract 的 preferred 模型或模型未启用" };
  }
  if (!model.apiKey) {
    return { ok: false, error: "模型 api_key 未配置" };
  }

  const baseUrl = (model.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
  const url = baseUrl + "/chat/completions";

  const body = {
    model: model.modelName,
    messages: [
      { role: "system" as const, content: DEFAULT_SYSTEM },
      { role: "user" as const, content: "请解析以下医疗文档并输出 JSON：\n\n" + (extractedText.slice(0, 12000) || "[无正文]") },
    ],
    max_tokens: model.maxTokens,
    temperature: model.temperature,
  };

  console.log("[AI STEP 2] built prompt and body", {
    model: body.model,
    baseUrl,
    max_tokens: body.max_tokens,
    temperature: body.temperature,
  });

  console.log("[AI STEP 3] about to call provider (fetch with 30s timeout)");

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  console.log("[AI REAL CALL] start", {
    model: model.modelName,
    baseUrl,
    url,
    hasApiKey: Boolean(model.apiKey),
  });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer " + model.apiKey,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    console.log("[AI STEP 4] provider returned");
    console.log("[AI REAL CALL] response", {
      ok: res.ok,
      status: res.status,
    });

    if (!res.ok) {
      const errText = await res.text();
      const errMsg = `API ${res.status}: ${errText.slice(0, 300)}`;
      console.error("[AI REAL CALL] failed", errMsg);
      return { ok: false, error: errMsg };
    }

    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = data?.choices?.[0]?.message?.content;
    if (!content) {
      const errMsg = "API 未返回 content";
      console.error("[AI REAL CALL] failed", errMsg);
      return { ok: false, error: errMsg };
    }

    const output = parseStructuredExtractOutput(content);
    if (!output) {
      const errMsg = "解析 JSON 失败：" + content.slice(0, 200);
      console.error("[AI REAL CALL] failed", errMsg);
      return { ok: false, error: errMsg };
    }

    console.log("[AI REAL CALL] success");
    return { ok: true, output };
  } catch (e) {
    clearTimeout(timeoutId);
    const isAbort = e instanceof Error && e.name === "AbortError";
    const errorMessage = isAbort ? "ai timeout" : (e instanceof Error ? e.message : String(e));
    console.error("[AI REAL CALL] failed", e);
    return { ok: false, error: errorMessage };
  }
}
