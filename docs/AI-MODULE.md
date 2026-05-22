# 医疗资料上传 + AI 处理模块

> 合并自 AI 产品 PRD、引擎架构说明与 v0.3/v0.4 运维文档。  
> **当前实现**：患者上传与处理走 App Data Hub `POST /v1/ehf/health-records/upload` 与 `.../process`；管理端 AI 配置走 `/v1/ehf/admin/ai-*`。  
> 历史 Supabase + Next `app/api/*` 路线见 [`archive/LEGACY-SUPABASE.md`](archive/LEGACY-SUPABASE.md)。

## 1. 目标

在「患者上传 → 健康档案」环节增加：

1. 真实文件上传（PDF / 图片 / Word）
2. 文本提取与（可选）OCR
3. AI 分类、结构化抽取、标签、摘要
4. 后台可配置模型与任务路由，可审计（`ai_logs`）

不改变「授权 → 研究者脱敏访问」主流程。

## 2. 处理流水线

```
上传 → 文本提取/OCR → 文档分类 → 结构化抽取 → 标签 → 摘要 → 写入 health_record
```

| 任务类型 | 说明 |
|----------|------|
| `ocr_extract` | 图片/扫描件 OCR |
| `doc_classify` | 文档类型 |
| `structured_extract` | 结构化 JSON |
| `tagging` | 标签 |
| `summary` | 短摘要 |

`processing_status`：`uploaded` → `processing` → `completed` | `failed`；失败时写 `processing_error`。

## 3. 后台页面

| 路径 | 说明 |
|------|------|
| `/admin/ai-models` | 模型增删改、默认/启用、`api_key_set`（不回显密钥） |
| `/admin/ai-tasks` | 五类任务的首选/备用模型、prompt、超时 |
| `/admin/ai-logs` | 按记录/任务/状态查日志 |

前端调用：`ehfAdminListAiModels` 等，见 `lib/api/ehfClient.ts`。

## 4. 健康档案扩展字段

| 字段 | 说明 |
|------|------|
| `extracted_text` | 提取正文 |
| `doc_type` | AI 分类 |
| `ai_summary` | 摘要 |
| `structured_data` | JSON 结构化结果 |
| `tags` | 标签数组 |
| `processing_status` / `processing_error` | 状态与错误 |

DDL 参考：`sql/supabase-v0.4-health-records-ai-fields.sql`（字段名与后端 `ehf_health_records` 对齐）。

## 5. 现网行为（App Data Hub）

- 上传：`POST /v1/ehf/health-records/upload`（multipart，≤20MB）— **已接通**
- 处理：`POST /v1/ehf/health-records/{id}/process` — 服务端 **RapidOCR + 文档解析 + LLM 结构化**（见 [`apidoc/FRONTEND_OCR_PROCESSING_CHANGE_GUIDE.md`](apidoc/FRONTEND_OCR_PROCESSING_CHANGE_GUIDE.md)）
- 状态查询：`GET /v1/ehf/health-records/{id}/processing-status`
- **不再使用** Supabase / Next `app/api/patient/*/process` 做生产解析

接口细节：[`apidoc/EHF_API_REFERENCE.md`](apidoc/EHF_API_REFERENCE.md) §5。

## 6. 解析输出（structured_extract）

模型 JSON 建议包含：

- `document_type`：如 `lab_report`、`discharge_summary`
- `summary`：中文短摘要
- `tags`：字符串数组
- `structured_data`：如 `hospital`、`date`、`diagnosis`、`tests`

## 7. 故障排查

| 现象 | 排查 |
|------|------|
| 上传成功但一直 `uploaded` | 是否调用 `process`；后端日志 |
| `failed` | 详情页 `processing_error`；AI 模型是否启用、`api_key_set` |
| 图片无结构化 | 设计如此（占位 `image_unparsed`），待 OCR 接入 |

## 8. 延伸阅读

- 产品细节（历史 PRD）：`archive/AI-Upload-Module-PRD-v1.md`
- 架构草图：`archive/AI-Engine-Architecture.md`
- 目标服务器 AI Worker：`apidoc/Server-Development-Requirements-v1.md`
