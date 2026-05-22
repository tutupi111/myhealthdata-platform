# 历史：Supabase v0.2～v0.4（已 superseded）

> **勿按本文配置新环境。** 当前前端使用 App Data Hub API。本文仅保留迁移字段与排障参考。

## 阶段概览

| 版本 | 内容 | 原 setup 文档 |
|------|------|----------------|
| v0.2 | `health_records` 表 + Storage 桶 `health-files` | 已合并到本文 |
| v0.3 | `ai_models`、`ai_task_configs`、`ai_logs` | 已合并到本文 |
| v0.4 | 档案表 AI 字段 + Next 同步解析 | 已合并到本文 |

## v0.2 要点

- 环境变量：`NEXT_PUBLIC_SUPABASE_URL`、`SUPABASE_SERVICE_ROLE_KEY`、`MOCK_PATIENT_ID`
- SQL：`../sql/supabase-v0.2-health-records.sql`
- Next 路由：`app/api/upload`、`app/api/health-records`（仍可能在仓库中，页面已不再依赖）

## v0.3 要点

- SQL：`../sql/supabase-v0.3-ai-tables.sql`（含 5 条默认任务配置）
- 管理端曾走 `app/api/admin/ai-*`；现走 `/v1/ehf/admin/ai-*`

## v0.4 要点

- SQL：`../sql/supabase-v0.4-health-records-ai-fields.sql`
- 流程：`POST /api/upload` → 文本提取（pdf/mammoth）→ `structured_extract` → 写回 Supabase
- 图片：占位 `image_unparsed`，不做真实 OCR

## 完整原文（本目录）

- [`supabase-v0.2-setup.md`](supabase-v0.2-setup.md)
- [`v0.3-ai-config-setup.md`](v0.3-ai-config-setup.md)
- [`v0.4-ai-processing-setup.md`](v0.4-ai-processing-setup.md)

文内 SQL 路径已迁至 `docs/sql/`。
