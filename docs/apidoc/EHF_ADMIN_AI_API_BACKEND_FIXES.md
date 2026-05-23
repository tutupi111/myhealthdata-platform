# 管理端 AI 接口 · 后端修复与新增需求

> **读者**：App Data Hub / Hermes 后端  
> **前端**：`myhealthdata-platform` 管理端 `/admin/ai-models`、`/admin/ai-tasks`、`/admin/ai-logs`  
> **日期**：2026-05-22  

本文档针对管理端 **已暴露的前端问题**，列出需后端对齐的接口契约。前端已做字段归一化与兜底，**根治仍依赖下列 API 行为**。

---

## 1. 新增：模型连通性测试（P1）

### 1.1 已保存模型

```http
POST /v1/ehf/admin/ai-models/{model_id}/test
Authorization: Bearer <admin_token>
X-App-Id / X-Api-Key: 同其它 EHF 接口
```

**行为**：

1. 从 `ehf_ai_models` 读取该行的 `provider`、`model_name`、`base_url`、解密后的 `api_key`。  
2. 发起一次最小 **Chat Completions**（或厂商等价）请求，例如 1 条 user 消息 `"ping"`，`max_tokens: 16`。  
3. **禁止**在响应中返回 `api_key` 明文。

**成功 `200`**：

```json
{
  "ok": true,
  "message": "连通成功",
  "latency_ms": 842,
  "model_id": "aim_xxx"
}
```

**失败 `200` 或 `502`**（建议仍 200，用 `ok: false` 便于前端展示）：

```json
{
  "ok": false,
  "message": "API 400: invalid model deepseek-xxx",
  "latency_ms": 1203,
  "model_id": "aim_xxx"
}
```

**未实现时**：前端会收到 `404`，提示后端实现本接口。

### 1.2 保存前草稿测试（可选 P2）

```http
POST /v1/ehf/admin/ai-models/test
Content-Type: application/json
```

```json
{
  "provider": "deepseek",
  "model_name": "deepseek-v4-flash",
  "base_url": "https://api.deepseek.com",
  "api_key": "sk-..."
}
```

响应形态同 §1.1。未实现时前端提示「请先保存再测试」。

### 1.3 实现注意

| 项 | 说明 |
|----|------|
| Base URL | 拼 `{base_url}/chat/completions`，勿要求管理端填写 `/chat/completions` |
| DeepSeek | 勿传 `frequency_penalty` / `presence_penalty` |
| 超时 | 建议 15～30s，超时返回 `ok: false` + 可读 message |

---

## 2. 修复：GET 任务配置返回模型绑定（P0）

### 2.1 接口

```http
GET /v1/ehf/admin/ai-task-configs
```

### 2.2 问题

前端 PATCH `preferred_model_id` 后，**process Worker 能读到配置**，但 GET 列表 **不返回** 绑定字段，导致管理端「首选/备用模型」列恒为 `—`。

### 2.3 要求响应形态（二选一或同时提供）

**形态 A（推荐）**：数组 + 外键 ID

```json
{
  "items": [
    {
      "id": "aitc_xxx",
      "task_type": "structured_extract",
      "preferred_model_id": "aim_xxx",
      "fallback_model_id": null,
      "timeout": 60,
      "max_tokens": 2000,
      "is_enabled": true
    }
  ]
}
```

**形态 B**：嵌套模型摘要

```json
{
  "preferred_model_id": "aim_xxx",
  "preferred_model": {
    "id": "aim_xxx",
    "provider": "deepseek",
    "model_name": "deepseek-v4-flash"
  }
}
```

**形态 C（若用 map）**：按 `task_type` 为 key 的对象也可，前端已兼容：

```json
{
  "structured_extract": {
    "id": "aitc_xxx",
    "preferred_model_id": "aim_xxx",
    ...
  }
}
```

### 2.4 PATCH 一致性

`PATCH /v1/ehf/admin/ai-task-configs/{id}` 请求体：

```json
{
  "preferred_model_id": "aim_xxx",
  "fallback_model_id": null
}
```

PATCH 成功后，**GET 必须能读到相同 ID**。

---

## 3. 修复：AI 日志 status 枚举（P0）

### 3.1 接口

```http
GET /v1/ehf/admin/ai-logs?page=1&page_size=50
```

### 3.2 问题

Worker 已完成调用（有 `duration_ms`、无 `error_message`），但 `status` 仍为 `pending` 或未更新，管理端显示「待处理」。

### 3.3 要求

| 时机 | `status` 建议值 |
|------|-----------------|
| 调用成功结束 | **`completed`**（或 `success`，二选一，文档写死） |
| 调用失败 | **`failed`** |
| 进行中 | `pending` / `running` |

**成功示例**：

```json
{
  "id": "ailog_xxx",
  "record_id": "rec_xxx",
  "task_type": "structured_extract",
  "model_name": "deepseek-v4-flash",
  "status": "completed",
  "duration_ms": 16277,
  "error_message": null,
  "created_at": 1779400000
}
```

### 3.4 字段命名

请统一使用 **snake_case**：

- `duration_ms`（勿仅用 `duration` 秒级且不落库 ms）
- `error_message`
- `model_name`
- `task_type`

### 3.5 筛选参数

`GET .../ai-logs?status=completed` 应能筛出成功记录（与写入值一致）。

---

## 4. 验收清单

- [ ] `POST .../ai-models/{id}/test` 对有效 DeepSeek 配置返回 `ok: true`  
- [ ] `GET ai-task-configs` 在绑定模型后返回 `preferred_model_id`  
- [ ] `structured_extract` 跑完后，对应 `ai_logs.status === completed` 且 `duration_ms > 0`  
- [ ] 管理端刷新后：任务列表显示模型名、日志显示「成功」  

---

## 5. 前端已做兜底（后端修好后可简化）

| 项 | 前端兜底 |
|----|----------|
| 任务模型列 | localStorage 缓存、日志「最近执行」推断、map 形态 configs |
| 日志状态 | `completed`/中文「成功」映射；`duration_ms>0` 且无错误时视为成功 |

---

**关联文档**：[`EHF_API_REFERENCE.md`](EHF_API_REFERENCE.md) §4、§5.3 · [`DEVELOPMENT_STATUS.md`](../DEVELOPMENT_STATUS.md)
