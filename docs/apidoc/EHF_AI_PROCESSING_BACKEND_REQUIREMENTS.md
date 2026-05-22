# EHF 健康档案 AI 处理 · 后端开发需求（替换占位管线）

**版本**：v1.0  
**日期**：2026-05-22  
**读者**：App Data Hub / Hermes 后端  
**前端仓库**：本 Next.js 项目（**不再使用 Supabase 做 AI**）  
**关联文档**：[`EHF_API_REFERENCE.md`](EHF_API_REFERENCE.md) §5、[`AI-MODULE.md`](../AI-MODULE.md)

---

## 一、背景与现状

### 1.1 产品方向（已确认）

- 数据与认证：**App Data Hub**（`https://tuutpi.online`，`/v1/ehf/...`）
- **弃用** Supabase 存储与健康档案 AI 处理（本仓库 `app/api/patient/*`、`app/api/upload` 等为遗留，前端已不调用）
- 管理端在 **EHF 后台** 配置的 `ai_models` / `ai_task_configs` 应被 **同一后端** 的 process Worker 读取并执行

### 1.2 用户侧现象

患者上传检查报告后，档案详情 **AI 摘要** 显示类似：

> 已接收并完成占位解析：xxx.pdf。后续可接入 OCR/LLM Worker…

`structured_data` 仅有 `file_name`、`file_type`，**无** 医院、诊断、检查项等 —— 说明当前 `POST /v1/ehf/health-records/{id}/process` 为 **占位实现**，未调用管理端配置的模型。

### 1.3 前端已完成（无需改接口路径）

| 步骤 | 前端行为 | 后端接口 |
|------|----------|----------|
| 上传 | `ehfUploadHealthRecord` | `POST /v1/ehf/health-records/upload` |
| 触发处理 | 上传成功后 `ehfProcessHealthRecord(id)`；详情页对 `uploaded`/`processing` 自动再触发 | `POST /v1/ehf/health-records/{id}/process` |
| 轮询 | 详情页每 3s `GET /v1/ehf/health-records/{id}` | 已存在 |
| 展示 | `ai_summary`、`tags`、`structured_data`、`processing_error` | 字段已对齐 |
| 管理配置 | `/admin/ai-models`、`/admin/ai-tasks` | `GET/PATCH /v1/ehf/admin/ai-*` |
| 日志排查 | `/admin/ai-logs` | `GET /v1/ehf/admin/ai-logs` |

**结论**：缺的不是前端接线，而是 **`/process` 内部要换成真实 OCR + LLM 流水线**，并 **读取 `ehf_ai_models` / `ehf_ai_task_configs`**。

---

## 二、目标

将 `POST /v1/ehf/health-records/{record_id}/process` 从占位改为：

1. 从私有存储读取患者上传的文件  
2. 按 MIME 做文本提取或 OCR（图片、扫描 PDF）  
3. 对 **图片/多模态** 支持走 `supports_vision=true` 的模型（管理端已配置的多模态模型）  
4. 按任务配置调用 LLM，产出结构化 JSON  
5. 写回 `ehf_health_records` 与 `ehf_ai_logs`  
6. 状态：`uploaded` → `processing` → `completed` | `failed`

对外 **HTTP 路径与响应字段不变**，前端零改动即可生效。

---

## 三、处理流水线（建议实现顺序）

```
POST /process
  │
  ├─ 1. 鉴权 + 认领记录（仅 uploaded → processing，防并发重复）
  ├─ 2. 读取文件 bytes + MIME
  ├─ 3. 文本层
  │     ├─ PDF（文字版）→ 提取正文
  │     ├─ DOCX/DOC → 提取正文
  │     ├─ 图片 / 扫描 PDF → ocr_extract 任务（或 vision 模型，见 §5）
  │     └─ 写入 extracted_text（可截断，建议单条 ≤ 120k 字符）
  ├─ 4. AI 任务链（读 ai_task_configs，is_enabled=true）
  │     ├─ doc_classify（可选，可合并进步骤 5）
  │     ├─ structured_extract（必须，P0）
  │     ├─ tagging（可选，可合并进步骤 5）
  │     └─ summary（可选，可合并进步骤 5）
  ├─ 5. 写回 health_record
  └─ 6. processing_status = completed | failed
```

**P0（必须）**：步骤 1～3 + `structured_extract` + 写库 + `ai_logs`  
**P1**：独立 `ocr_extract` 任务配置、扫描 PDF 多页 OCR  
**P2**：拆分 `doc_classify` / `tagging` / `summary` 为独立任务（或继续合并进 structured_extract 的 JSON）

---

## 四、数据表与配置读取

### 4.1 健康档案 `ehf_health_records`（写回字段）

| 字段 | 说明 |
|------|------|
| `extracted_text` | OCR/提取后的正文 |
| `doc_type` | 如 `exam_report`、`discharge_summary`、`lab_report` |
| `ai_summary` | 中文短摘要（**勿再写占位文案**） |
| `structured_data` | JSON 对象，见 §6 |
| `tags` | 字符串数组 |
| `processing_status` | `uploaded` / `processing` / `completed` / `failed` |
| `processing_error` | 失败原因，成功时为 `null` |
| `updated_at` | 更新时间 |

### 4.2 模型表 `ehf_ai_models`（读）

管理端已写入，处理时读取：

| 字段 | 用途 |
|------|------|
| `provider`, `model_name`, `base_url` | 拼 OpenAI 兼容 `POST {base_url}/chat/completions` |
| `api_key` | 解密后调用，**禁止**在 API 响应或日志明文输出 |
| `supports_vision` | `true` 时允许图片 base64 / URL 进多模态消息 |
| `supports_json` | 建议 structured_extract 选用 `true` 的模型 |
| `is_active`, `is_default`, `priority` | 路由与 fallback |

### 4.3 任务表 `ehf_ai_task_configs`（读）

固定 `task_type`（管理端已 seed）：

- `ocr_extract`
- `doc_classify`
- `structured_extract`
- `tagging`
- `summary`

每行：`preferred_model_id`、`fallback_model_id`、`prompt_template`（可空则用默认）、`timeout`、`max_tokens`、`is_enabled`。

**路由逻辑**（与前端遗留 `lib/ai/router.ts` 一致）：

1. 取 `task_type` + `is_enabled=true` 的配置  
2. 加载 `preferred_model_id` 对应模型且 `is_active=true`  
3. 调用失败（超时/5xx/解析失败）时尝试 `fallback_model_id`  
4. 每次调用写一条 `ehf_ai_logs`

---

## 五、文件类型与 OCR / 多模态

| MIME / 扩展名 | P0 处理 |
|---------------|---------|
| `application/pdf` | 先尝试文字提取；若无文本或极少，走 OCR 或 **vision 模型** 读首页/逐页 |
| `application/vnd...wordprocessingml.document`、`.doc` | mammoth 类库提取正文 → structured_extract |
| `image/jpeg`、`image/png` | **优先**：`supports_vision=true` 的 preferred 模型，user 消息带 image；**备选**：`ocr_extract` 配置的传统 OCR |

### 5.1 多模态（管理端「支持视觉」）

当文件为图片，或 PDF 判定为扫描件时：

1. 查 `structured_extract` 或单独 `ocr_extract` 的 preferred 模型  
2. 若 `supports_vision=true`，使用 Chat Completions **vision** 格式（OpenAI 兼容）：  
   - `messages[].content` 为数组，含 `type: text` + `type: image_url`（base64 或短时签名 URL）  
3. 系统 prompt 要求输出 §6 的 JSON（可复用 `prompt_template` 占位符 `{{extracted_text}}`，图片场景可为空）

### 5.2 纯文本路径

PDF/DOCX 提取到 `extracted_text` 后：

- 调用 `structured_extract` 的文本模型  
- `prompt_template` 支持占位符：`{{extracted_text}}`、`{{doc_type}}`、`{{file_name}}`

---

## 六、structured_extract 输出契约（前后端对齐）

LLM 必须返回 **单一 JSON 对象**（可无 markdown 包裹），建议 schema：

```json
{
  "document_type": "exam_report",
  "summary": "患儿视力检查提示双眼屈光不正，建议随访。",
  "tags": ["眼科", "屈光", "检查报告"],
  "structured_data": {
    "hospital": "某某医院",
    "date": "2026-03-15",
    "diagnosis": ["屈光不正"],
    "tests": [
      { "name": "裸眼视力", "value": "0.6", "unit": "" }
    ],
    "notes": "建议三月复查"
  }
}
```

**写库映射**：

| JSON 字段 | DB 字段 |
|-----------|---------|
| `document_type` | `doc_type` |
| `summary` | `ai_summary` |
| `tags` | `tags` |
| `structured_data` | `structured_data` |

解析失败：`processing_status=failed`，`processing_error` 写明原因，并写 `ai_logs.status=failed`。

**默认 system prompt**（`prompt_template` 为空时使用，可与前端 `lib/ai/tasks/structuredExtract.ts` 对齐）：

```text
你是一个医疗文档结构化解析助手。根据用户提供的文档原文或图片，输出唯一一段合法的 JSON，不要包含其他说明或代码块标记。
JSON 必须包含以下字段（均为英文 key）：
- document_type: 文档类型，如 lab_report, discharge_summary, outpatient_note, exam_report 等
- summary: 简短中文摘要（一两句话）
- tags: 字符串数组
- structured_data: 对象，包含 hospital, date, diagnosis, tests, notes 等
```

---

## 七、接口行为细则

### 7.1 `POST /v1/ehf/health-records/{record_id}/process`

**权限**：`patient`（本人记录）或 `admin`。

**并发**：

- 若已是 `completed` / `failed`：返回当前记录（幂等，不重复跑）  
- 若已是 `processing`：返回 200 + 当前状态（或 409，需在 `EHF_API_REFERENCE` 注明一种并保持一致）  
- 若 `uploaded`：原子更新为 `processing` 后开始流水线  

**成功响应 `200`**：`HealthRecord` 全量字段（含 `extracted_text`、`ai_summary`、`structured_data` 等）。

**失败**：

- 模型未配置 / api_key 缺失：`failed` + `processing_error` 可读中文，如「未配置 structured_extract 首选模型」  
- 不要返回占位摘要；**禁止**再写「占位解析」类文案  

### 7.2 `GET /v1/ehf/health-records/{id}/processing-status`

保持现有字段；处理中应返回 `processing`。

### 7.3 `GET /v1/ehf/admin/ai-logs`

每条处理步骤写日志，建议字段：

| 字段 | 示例 |
|------|------|
| `record_id` | `rec_xxx` |
| `task_type` | `ocr_extract` / `structured_extract` |
| `model_name` | 实际调用的 `model_name`（非 id） |
| `status` | `completed` / `failed` |
| `duration_ms` | 耗时 |
| `error_message` | 失败时 |
| `token_usage` | 可选 JSON |

便于管理端按 `record_id` 筛选（前端已支持 query）。

---

## 八、实现参考（前端仓库，仅供移植逻辑）

以下文件为 **Supabase 时代** 的 Node 实现，**逻辑可移植到 Python/FastAPI Worker**，但 **不要** 再依赖 Supabase：

| 文件 | 可参考内容 |
|------|------------|
| `lib/files/extractText.ts` | PDF/DOCX/图片分支 |
| `lib/files/ocr.ts` | Tesseract / PDF 渲染 OCR |
| `lib/ai/tasks/structuredExtract.ts` | OpenAI 兼容调用、JSON 解析、超时 |
| `lib/ai/router.ts` | 任务→模型、temperature 兼容（如 kimi 仅允许 temperature=1） |
| `lib/ai/types.ts` | 输出 JSON 校验 |

后端语言不限；建议使用与 App Data Hub 一致的 **Python 3.11+** + `httpx` + `pymupdf` / `mammoth` / `pytesseract` 或云 OCR。

---

## 九、异步与性能（推荐）

| 模式 | 说明 |
|------|------|
| **同步（POC）** | `POST /process` 内跑完全部步骤再返回；大图可能 30～120s，前端已轮询 |
| **异步（生产）** | `POST /process` 仅认领并入队，202 + `processing`；Worker 消费队列写回 |

队列表（可选 `ehf_health_record_jobs`）：`id, record_id, status, attempts, error, created_at, started_at, finished_at`。

**限流建议**：单 Worker 并发 ≤3；单患者同时 `processing` ≤2。

---

## 十、安全

- `api_key` 库内加密存储，日志与接口 **禁止** 明文  
- `extracted_text` 不写入公开日志；审计日志不包含全文  
- 文件仅通过鉴权下载接口读取，process 在内网读存储  

---

## 十一、验收标准（后端自测 + 联调）

### 11.1 配置

- [ ] 管理端创建模型：`supports_vision=true`、`supports_json=true`，填写有效 `api_key`、`base_url`（如 OpenAI 兼容网关）  
- [ ] `structured_extract` 任务启用并绑定该模型为 preferred  

### 11.2 PDF 检查报告

- [ ] 患者上传 PDF → 触发 process → 状态 `completed`  
- [ ] `ai_summary` 为真实中文摘要，**不含**「占位解析」  
- [ ] `structured_data` 含 `hospital` 或 `tests` 等至少 2 类业务字段（视报告内容）  
- [ ] `ehf_ai_logs` 有 `structured_extract` 且 `status=completed`  

### 11.3 图片检查报告（多模态）

- [ ] 上传 JPG/PNG → 使用 vision 模型或 ocr_extract → `extracted_text` 或结构化结果非空  
- [ ] 管理端所选多模态模型名称出现在 `ai_logs.model_name`  

### 11.4 失败路径

- [ ] 关闭任务或错误 api_key → `failed` + 明确 `processing_error`  
- [ ] 前端详情页展示 `processing_error`（前端已实现）  

### 11.5 幂等

- [ ] 对 `completed` 记录重复 `POST /process` 不破坏数据、不重复计费爆炸（可 no-op 返回）  

---

## 十二、与占位实现的差异（务必替换）

| 项目 | 当前占位 | 目标 |
|------|----------|------|
| `ai_summary` | 「已接收并完成占位解析…」 | 真实 LLM 摘要 |
| `structured_data` | 仅 `file_name` / `file_type` | 含诊断、检查项等 |
| `extracted_text` | 常为空 | 有 OCR/提取正文 |
| `ai_logs` | 占位 duration=0 | 真实耗时与模型名 |
| 配置来源 | 忽略 `ehf_ai_*` 表 | 必须读取 |

---

## 十三、排期建议

| 阶段 | 内容 | 预估 |
|------|------|------|
| **P0** | 认领 + 文件读取 + PDF/DOCX 文本提取 + structured_extract + 写库 + ai_logs | 3～5 人日 |
| **P1** | 图片 vision + 扫描 PDF OCR + fallback 模型 | 2～3 人日 |
| **P2** | 异步队列 + 独立 doc_classify/tagging/summary | 2～4 人日 |

完成后请在 `EHF_API_REFERENCE.md` §5 更新：去掉「占位管线」描述，注明已上线真实 Worker 及版本号。

---

## 十四、前端联调联系人

- 环境变量：`NEXT_PUBLIC_DATA_HUB_*`（Vercel 已配置）  
- 无需改上传/详情代码；部署后端后患者重新上传或对 `uploaded` 记录再点「处理」即可验证  

**文档维护**：后端 process 行为变更时请同步更新本节与 `EHF_API_REFERENCE.md` Changelog。
