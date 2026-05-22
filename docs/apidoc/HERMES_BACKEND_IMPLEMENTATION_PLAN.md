# EHF 患者数据钱包迁移到 App Data Hub：Hermes 后端实施计划

日期：2026-05-21
来源需求：`Server-Development-Requirements-v1.md`

## 1. 我的实施判断

需求文档目标是将 `ehf-patient-data-wallet` 当前的 Mock 内存数据与 Supabase 存储迁移到自托管数据服务器，形成真实认证、持久化存储、权限隔离、文件管理与 AI 处理闭环。

当前服务器实际环境：

- 已运行 App Data Hub：FastAPI + SQLite + 本地文件存储，用户级 systemd 服务，监听 `127.0.0.1:8080`，通过 `https://tuutpi.online` 反代。
- 当前 App Data Hub 已有：应用级 API Key、动态 CORS、用户注册/登录、组织/角色、通用 `data_items`、文件上传下载、contact-events。
- 当前未安装/运行 PostgreSQL、MinIO、Redis；Docker 可用，但 sudo 不可免密。

因此建议采用两阶段实现：

### P0/P1：先在现有 App Data Hub 上完成可联调版本

- 保持当前 FastAPI 服务与 SQLite，不中断现有官网 contact-events 和已有 App Data Hub 功能。
- 新增 EHF 专用 API 命名空间：`/v1/ehf/...`。
- 新增 EHF 专用结构化表，而不是把患者健康数据塞进通用 `data_items`。
- 文件先走 App Data Hub 本地私有存储目录，服务端鉴权下载；路径与字段设计兼容未来 MinIO。
- AI 处理先支持 `uploaded/processing/completed/failed` 状态与手动/占位处理接口；真实 LLM/OCR worker 作为后续增强。

### P2：再升级 PostgreSQL + MinIO + Worker

- 当 POC 跑通并确定业务字段稳定后，再切换底层数据库/对象存储。
- PostgreSQL/MinIO/Redis 需要单独部署窗口、备份策略和恢复演练，不建议和第一轮 API 改造混在一起。

## 2. API 设计原则

- 官网 contact-events 的公开前端 key 不能用于患者健康数据。
- EHF 患者数据平台使用独立 App：`EHF Patient Data Wallet`。
- 登录后访问患者/研究/管理接口：`X-App-ID` + `X-API-Key` + `Authorization: Bearer ...`。
- 角色使用需求文档定义：`patient | researcher | admin`。
- 患者健康数据默认强隔离：患者只能访问自己的 profile/records；研究者只能按 consent 访问 DID 脱敏数据；admin 可审核与管理。
- 文件不公开，必须通过 API 鉴权后下载。
- 日志与接口返回不暴露密码、API Key、AI Key、完整敏感文本。

## 3. 第一轮开发范围（建议）

### 3.1 数据表

在现有 SQLite 中新增以下表，字段名尽量贴近需求文档，未来迁移 PostgreSQL 时可平移：

- `ehf_users_ext`：为现有 `users` 扩展 EHF 角色/状态映射。
- `ehf_patient_profiles`
- `ehf_researcher_profiles`
- `ehf_health_records`
- `ehf_research_projects`
- `ehf_consents`
- `ehf_supplementary_requests`
- `ehf_audit_logs`
- `ehf_ai_models`
- `ehf_ai_task_configs`
- `ehf_ai_logs`

> 注：现有 `users` 已经有 `role` 字段，但原值是 `admin/operator`，不能直接覆盖；EHF 角色建议放在 EHF 扩展表中，避免破坏 Tuutpi/众高 MCI 已有组织用户逻辑。

### 3.2 认证

短期复用现有 App Data Hub `/v1/auth/register`、`/v1/auth/login` token 机制，但新增 EHF 注册接口完成 profile 初始化：

- `POST /v1/ehf/auth/register-patient`
- `POST /v1/ehf/auth/register-researcher`
- `GET /v1/ehf/auth/me`

中期可再增加 refresh token/JWT 标准化。

### 3.3 患者档案

- `GET /v1/ehf/patients/me`
- `PATCH /v1/ehf/patients/me`
- `GET /v1/ehf/patients/me/summary`

### 3.4 健康档案

- `GET /v1/ehf/health-records`
- `GET /v1/ehf/health-records/{id}`
- `POST /v1/ehf/health-records/upload`
- `POST /v1/ehf/health-records/{id}/process`
- `PATCH /v1/ehf/health-records/{id}`
- `DELETE /v1/ehf/health-records/{id}`
- `GET /v1/ehf/health-records/{id}/download`

上传限制：20MB；允许 `jpg/png/pdf/doc/docx`；服务端双重校验 MIME + 扩展名。

### 3.5 科研与授权

第一轮支持最小闭环：

- `GET /v1/ehf/projects`
- `GET /v1/ehf/projects/{id}`
- `GET /v1/ehf/projects/mine`
- `POST /v1/ehf/projects`
- `PATCH /v1/ehf/projects/{id}`
- `POST /v1/ehf/consents`
- `GET /v1/ehf/consents`
- `POST /v1/ehf/consents/{id}/revoke`
- `GET /v1/ehf/research/patients/{did}/records`

### 3.6 管理后台

第一轮只做必要管理接口：

- `GET /v1/ehf/admin/dashboard/stats`
- `GET /v1/ehf/admin/patients`
- `GET /v1/ehf/admin/researchers`
- `POST /v1/ehf/admin/researchers/{id}/approve`
- `POST /v1/ehf/admin/researchers/{id}/reject`
- `GET /v1/ehf/admin/audit-logs`

AI 模型配置接口可作为第二批，先保留表结构。

## 4. 测试策略

严格按 TDD：先写失败测试，再实现。

第一批测试：

1. EHF app 可创建，CORS 可允许前端域名。
2. patient 注册后自动创建 DID，`/patients/me` 可读写。
3. researcher 注册后状态为 pending，未审核前不可创建项目。
4. admin 审核 researcher 后可创建项目。
5. patient 上传文件后 `health_records` 持久化，服务重启后仍可读。
6. patient 创建 consent 后 researcher 只能通过 DID 访问授权记录，不能看到姓名/联系方式。
7. 未授权 researcher 访问患者 DID 返回 404/403。
8. 删除健康档案同时删除/隔离文件。
9. 关键行为写 audit log。

## 5. Cursor 前端接入交付物

开发完成后生成：

- `EHF_CURSOR_INTEGRATION_GUIDE.md`
- `EHF_API_REFERENCE.md`
- `.env.example` 片段
- TypeScript 类型定义
- fetch client 示例
- 迁移 checklist：哪些 Mock/Supabase 文件要替换

## 6. 暂缓事项

以下事项不作为第一轮阻塞项：

- PostgreSQL/MinIO/Redis 生产化部署
- 完整 LLM OCR/结构化抽取 worker
- WAL/对象存储增量备份
- 管理后台 IP 白名单/VPN
- 历史 Supabase 数据自动迁移脚本

它们进入第二阶段，等第一轮业务 API 与前端跑通后再升级。

## 7. 待用户/前端确认

- 前端最终部署域名，用于加入 EHF App CORS 白名单。
- 是否已有 Supabase 历史数据需要导出。
- EHF 当前 Next.js 项目源码路径或 GitHub 仓库地址。
- 演示账号邮箱与初始密码策略。
- AI 处理是否第一轮必须真实调用模型，还是可先返回 processing/completed 占位数据。
