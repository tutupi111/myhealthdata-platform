# EHF 演示指南

> 当前栈：**App Data Hub API**（非 v0.1 Mock）。账号需在后端注册或使用运维提供的测试账号。

## 环境准备

1. 配置 `.env.local`（见 [`apidoc/FRONTEND_INTEGRATION.md`](apidoc/FRONTEND_INTEGRATION.md)）
2. `npm install && npm run dev` → `http://localhost:3000`

## 页面清单

### 公共

| 路径 | 说明 |
|------|------|
| `/` | 首页，三端入口 |
| `/login` | 登录（邮箱+密码；管理端可用 `admin1` 短账号） |
| `/register` | 患者/研究者注册 |
| `/forgot-password` | 忘记密码（管理员绑定邮箱后） |
| `/reset-password` | 邮件重置链接落地页 |

### 患者端 `/patient/*`

| 路径 | 说明 |
|------|------|
| `/patient/dashboard` | DID、摘要、快捷操作、可参与研究 |
| `/patient/records` | 健康档案列表 |
| `/patient/records/[id]` | 档案详情（含 AI 摘要/结构化数据） |
| `/patient/upload` | 上传资料 |
| `/patient/studies` | 研究项目列表 |
| `/patient/studies/[id]` | 项目详情 + 授权参与 |
| `/patient/consents` | 授权记录 |
| `/patient/consents/[id]` | 授权详情 |
| `/patient/settings` | 账户与隐私（占位） |

### 研究者端 `/researcher/*`

| 路径 | 说明 |
|------|------|
| `/researcher/dashboard` | 统计与快捷入口 |
| `/researcher/projects` | 我的项目 |
| `/researcher/projects/new` | 创建项目 |
| `/researcher/projects/[id]` | 项目详情 |
| `/researcher/projects/[id]/patients` | 已授权患者 |
| `/researcher/patients/[patientId]` | 脱敏资料摘要 |
| `/researcher/requests` | 补充资料请求（占位，API 已就绪） |

### 管理后台 `/admin/*`

| 路径 | 说明 |
|------|------|
| `/admin/dashboard` | 系统概览 |
| `/admin/patients` | 患者管理 |
| `/admin/researchers` | 研究者审核 |
| `/admin/projects` | 项目管理 |
| `/admin/records` | 资料审核 |
| `/admin/consents` | 授权记录 |
| `/admin/audit-logs` | 审计日志 |
| `/admin/ai-models` | AI 模型 |
| `/admin/ai-tasks` | AI 任务配置 |
| `/admin/ai-logs` | AI 日志 |
| `/admin/account` | 账号与安全 |

## 推荐演示顺序

1. **患者**：注册或登录 → 上传一份 PDF/图片 → 在健康档案中查看处理状态 → 浏览研究项目 → **授权参与** → 在授权记录中确认。
2. **研究者**：登录（需管理员已**批准**）→ 我的项目 → 已授权患者 → 查看脱敏资料摘要。
3. **管理员**：`admin1` 登录（需后端 seed，见 [`apidoc/ADMIN_AUTH_CHANGE_GUIDE.md`](apidoc/ADMIN_AUTH_CHANGE_GUIDE.md)）→ 账号与安全（改密/绑邮箱）→ 批准研究者 → 查看授权记录与系统统计。

## 历史说明（v0.1 Mock）

v0.1 使用 `patient@example.com` / `password` 等 Mock 账号与 `MockStoreContext`，已不再挂到根 layout。历史说明见 `archive/V0.1-DEMO.md`。
