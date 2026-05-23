# EHF 患者数据钱包 · 文档索引

本目录为 **EHF Patient Data Wallet**（中国 POC）产品与工程文档。当前前端已对接 **App Data Hub**（`https://tuutpi.online`，`/v1/ehf/...`），不再以 Mock / Supabase 为主路径。

## 先读什么

| 你想… | 读这份 |
|--------|--------|
| **当前开发进度与已知问题** | [`DEVELOPMENT_STATUS.md`](DEVELOPMENT_STATUS.md) |
| **管理端 AI 接口后端修复清单** | [`apidoc/EHF_ADMIN_AI_API_BACKEND_FIXES.md`](apidoc/EHF_ADMIN_AI_API_BACKEND_FIXES.md) |
| 了解产品目标与范围 | [`product/EHF-China-POC-PRD-v1.md`](product/EHF-China-POC-PRD-v1.md) |
| 查页面路由与字段 | [`product/EHF-China-POC-SiteMap-v1.md`](product/EHF-China-POC-SiteMap-v1.md) |
| 本地跑演示 | [`DEMO.md`](DEMO.md) |
| 前端接 API | [`apidoc/FRONTEND_INTEGRATION.md`](apidoc/FRONTEND_INTEGRATION.md) → [`apidoc/EHF_API_REFERENCE.md`](apidoc/EHF_API_REFERENCE.md) |
| 管理员账号 / 改密 / 找回密码 | [`apidoc/ADMIN_AUTH_CHANGE_GUIDE.md`](apidoc/ADMIN_AUTH_CHANGE_GUIDE.md) |
| 自建服务器 / 目标架构 | [`apidoc/Server-Development-Requirements-v1.md`](apidoc/Server-Development-Requirements-v1.md) |
| 在现有 App Data Hub 上落地 | [`apidoc/HERMES_BACKEND_IMPLEMENTATION_PLAN.md`](apidoc/HERMES_BACKEND_IMPLEMENTATION_PLAN.md) |
| AI 上传与解析模块 | [`AI-MODULE.md`](AI-MODULE.md) |
| **AI 处理后端需求（OCR/结构化）** | [`apidoc/EHF_AI_PROCESSING_BACKEND_REQUIREMENTS.md`](apidoc/EHF_AI_PROCESSING_BACKEND_REQUIREMENTS.md) |
| OCR 流水线（后端说明） | [`apidoc/EHF_OCR_DOCUMENT_PIPELINE_IMPLEMENTATION_NOTE.md`](apidoc/EHF_OCR_DOCUMENT_PIPELINE_IMPLEMENTATION_NOTE.md) |
| **前端 OCR/解析配合** | [`apidoc/FRONTEND_OCR_PROCESSING_CHANGE_GUIDE.md`](apidoc/FRONTEND_OCR_PROCESSING_CHANGE_GUIDE.md) |
| 数据库 DDL 参考 | [`sql/`](sql/) |

## 目录结构

```
docs/
├── README.md                 # 本索引
├── DEVELOPMENT_STATUS.md     # ★ 阶段进度 + 问题现状（2026-05）
├── DEMO.md                   # 演示流程与页面清单
├── AI-MODULE.md              # AI 模块（产品 + 架构 + 现网行为）
├── product/                  # PRD、SiteMap
├── apidoc/                   # API 与后端
│   ├── EHF_API_REFERENCE.md  # ★ 主 API 文档
│   ├── ADMIN_AUTH_CHANGE_GUIDE.md  # 管理员账号安全联调
│   ├── FRONTEND_INTEGRATION.md
│   ├── Server-Development-Requirements-v1.md
│   └── HERMES_BACKEND_IMPLEMENTATION_PLAN.md
├── sql/                      # DDL（POC + 历史 Supabase 迁移）
└── archive/                  # 已合并或过时的文档（仅供追溯）
```

## 版本演进（简表）

| 阶段 | 数据层 | 说明 |
|------|--------|------|
| v0.0 | — | 三端骨架 → 见 `archive/SKELETON.md` |
| v0.1 | Mock | 全站演示闭环 → 见 `DEMO.md` |
| v0.2～v0.4 | Supabase | 档案上传 + AI 配置/解析 → 见 `archive/LEGACY-SUPABASE.md` |
| **当前** | App Data Hub | 真实认证、持久化、三端 API |

## 维护约定

- **接口变更**：只更新 `apidoc/EHF_API_REFERENCE.md`，必要时在 Changelog 表追加一行。
- **前端接入**：环境变量与 `ehfClient` 以 `FRONTEND_INTEGRATION.md` 为准，代码以 `lib/api/` 为准。
- **归档**：合并后的旧文档移入 `archive/`，避免删除历史讨论上下文。
