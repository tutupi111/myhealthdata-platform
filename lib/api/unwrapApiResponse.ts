/** 解包 App Data Hub 常见响应：{ data: ... }、{ items: [...] }、裸数组等 */

export function unwrapApiPayload(body: unknown): unknown {
  if (!body || typeof body !== "object") return body;
  const o = body as Record<string, unknown>;
  if ("data" in o && o.data != null && o.data !== body) {
    return unwrapApiPayload(o.data);
  }
  return body;
}

const LIST_KEYS = ["items", "configs", "task_configs", "results", "list", "records"] as const;

export function extractApiList(body: unknown): unknown[] {
  const payload = unwrapApiPayload(body);
  if (Array.isArray(payload)) return payload;
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    for (const key of LIST_KEYS) {
      const arr = o[key];
      if (Array.isArray(arr)) return arr;
    }
  }
  return [];
}

export function extractPaginatedItems<T>(body: unknown): T[] {
  const payload = unwrapApiPayload(body);
  if (Array.isArray(payload)) return payload as T[];
  if (payload && typeof payload === "object") {
    const o = payload as Record<string, unknown>;
    if (Array.isArray(o.items)) return o.items as T[];
    for (const key of LIST_KEYS) {
      if (key === "items") continue;
      const arr = o[key];
      if (Array.isArray(arr)) return arr as T[];
    }
  }
  return [];
}
