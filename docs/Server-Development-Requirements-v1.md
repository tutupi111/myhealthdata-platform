# EHF 患者数据钱包 · 自建服务器开发需求文档 v1

**版本**：v1.0  
**日期**：2026-05  
**适用项目**：`ehf-patient-data-wallet`（Next.js 14 POC）  
**目标**：将当前 **Mock 内存数据 + Supabase 云端存储** 全部迁移至 **自托管服务器**，实现数据统一持久化、真实认证与完整业务闭环。

---

## 一、文档目的与读者

本文档供 **后端 / 运维 / 全栈开发人员** 在自建服务器上实施数据层与 API 层时使用，涵盖：

- 需要存储的全部数据域及统一数据库设计
- 文件对象存储要求
- REST API 接口清单与权限模型
- AI 处理流水线部署方式
- 从现有 POC 迁移的步骤与验收标准

前端（Next.js）在服务器就绪后，仅需将 API 基址与认证方式切换至自建服务，逐步移除 `MockStoreContext` 与 Supabase SDK 直连。

---

## 二、现状与迁移范围

### 2.1 当前数据分布（迁移前）

| 数据域 | 当前存储 | 持久化 | 需迁移 |
|--------|----------|--------|--------|
| 登录态 | 浏览器 `localStorage` + `lib/mock/auth.ts` | 仅登录态本地保留 | ✅ 改为服务端 Session/JWT |
| 用户账号 | Mock 硬编码 3 个账号 | 否 | ✅ |
| 患者档案 / DID | `lib/mock/patient.ts` | 否 | ✅ |
| 研究者档案 | `lib/mock/admin.ts` | 否 | ✅ |
| 健康档案（文件上传） | Supabase Storage + `health_records` 表 | 是（若已配置） | ✅ |
| 健康档案（表单 Mock） | `MockStoreContext` | 否 | ✅ 合并至统一表 |
| 研究项目 | `lib/mock/researcher.ts` | 否 | ✅ |
| 授权 Consent | `MockStoreContext` | 否 | ✅ |
| 补充资料请求 | 占位页，无数据 | 否 | ✅ |
| 资料审核 / 审计日志 | `lib/mock/admin.ts` | 否 | ✅ |
| AI 模型 / 任务 / 日志 | Supabase 表 | 是（若已配置） | ✅ |

### 2.2 迁移目标

1. **单一数据源**：PostgreSQL 承载全部结构化数据。  
2. **单一文件存储**：自建对象存储（推荐 MinIO）或挂载目录 + 统一访问 URL。  
3. **真实认证**：邮箱/手机号 + 密码，角色 `patient | researcher | admin`。  
4. **权限隔离**：患者只能访问自己的档案；研究者只能看已授权数据（DID 脱敏）；管理员全量管理。  
5. **AI 流水线**：上传触发异步解析，配置与日志入库，不依赖 Supabase。

---

## 三、推荐目标架构

```
                    ┌─────────────────────────────────────┐
                    │         Next.js 前端 (3000)          │
                    │  患者端 / 研究者端 / 管理后台         │
                    └─────────────────┬───────────────────┘
                                      │ HTTPS / REST
                    ┌─────────────────▼───────────────────┐
                    │     API 层（二选一或组合）           │
                    │  A) 保留 Next.js API Routes         │
                    │  B) 独立 Node/Fastify/Nest 服务     │
                    └──────┬──────────────┬───────────────┘
                           │              │
              ┌────────────▼──┐    ┌──────▼──────────┐
              │  PostgreSQL   │    │  对象存储        │
              │  (业务 + AI)  │    │  MinIO / 本地    │
              └───────────────┘    └─────────────────┘
                           │
              ┌────────────▼──────────────────────────┐
              │  可选：Redis + Worker（AI 异步队列）   │
              └─────────────────────────────────────────┘
                           │
              ┌────────────▼──────────────────────────┐
              │  外部 LLM API（OpenAI 兼容接口）       │
              └───────────────────────────────────────┘
```

### 3.1 最低硬件建议（POC / 小规模）

| 组件 | 建议配置 |
|------|----------|
| 应用 + API | 2 vCPU / 4 GB RAM |
| PostgreSQL | 2 vCPU / 4 GB RAM，SSD ≥ 50 GB |
| MinIO | 与 API 同机或独立，磁盘按文件量规划（建议 ≥ 100 GB） |
| Redis（可选） | 1 GB 内存 |

### 3.2 软件版本建议

- **OS**：Ubuntu 22.04 LTS 或同类 Linux  
- **PostgreSQL**：15+  
- **Node.js**：20 LTS（若 API 用 Node）  
- **MinIO**：最新稳定版，或 AWS S3 兼容存储  
- **Nginx**：反向代理 + TLS 终止  
- **Docker Compose**：推荐用于一键部署 PG + MinIO + Redis

---

## 四、数据库设计（统一 Schema）

在 POC 完整 schema（`docs/EHF-China-POC-schema-v1.sql`）基础上，**合并** Supabase v0.2～v0.4 对健康档案与 AI 的扩展。建议在自建库中 **一次性执行** 下列设计（可按章节拆成迁移脚本）。

### 4.1 枚举类型

与 POC 一致：`user_role`、`user_status`、`researcher_review_status`、`project_status`、`consent_status`、`request_status`、`record_review_status`。

另增处理状态（字符串或 enum）：

```sql
-- 健康档案 AI 处理状态
-- uploaded | processing | completed | failed
-- 可保留 varchar(50) 便于扩展
```

### 4.2 核心表清单

| 表名 | 说明 | 当前来源 |
|------|------|----------|
| `users` | 账号（邮箱/手机、密码哈希、角色、状态） | Mock auth → 真实表 |
| `patient_profiles` | 患者 DID、疾病信息、联系方式 | Mock patient |
| `researcher_profiles` | 机构、审核状态 | Mock admin/researcher |
| `health_records` | 健康档案 + 文件 + AI 字段 | Supabase + Mock 合并 |
| `research_projects` | 研究项目 | Mock researcher |
| `consents` | 患者授权 | MockStore |
| `supplementary_requests` | 补充资料请求 | PRD 占位 |
| `audit_logs` | 审计日志 | Mock admin |
| `ai_models` | AI 模型配置 | Supabase v0.3 |
| `ai_task_configs` | AI 任务路由 | Supabase v0.3 |
| `ai_logs` | AI 调用日志 | Supabase v0.3 |

### 4.3 `health_records` 统一字段（重点）

合并 POC 业务字段与 v0.4 AI 字段：

```sql
create table health_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null references patient_profiles(id) on delete cascade,

  -- 业务展示（POC）
  record_type varchar(50),              -- 门诊记录 / 检查报告等，可由 AI 或用户填写
  title varchar(255),                 -- 默认可用 file_name
  record_date date,
  source_type varchar(50) not null default 'patient_upload',
  source_organization varchar(255),
  summary text,                         -- 人工摘要，可与 ai_summary 并存
  review_status record_review_status not null default 'pending',

  -- 文件（v0.2）
  file_url text not null,
  file_type varchar(100) not null,      -- MIME，原 Supabase file_type
  file_name varchar(255) not null,
  file_size bigint,
  storage_key text,                     -- 对象存储内部路径，推荐新增

  -- AI 处理（v0.4）
  extracted_text text,
  doc_type text,
  ai_summary text,
  structured_data jsonb,
  tags text[],
  processing_status varchar(50) not null default 'uploaded',
  processing_error text,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_health_records_patient_id on health_records(patient_id);
create index idx_health_records_processing_status on health_records(processing_status);
create index idx_health_records_doc_type on health_records(doc_type);
create index idx_health_records_created_at on health_records(created_at desc);
```

**说明**：

- `patient_id` 必须关联 `patient_profiles.id`，不再使用环境变量 `MOCK_PATIENT_ID`。  
- `file_url` 对外访问地址；`storage_key` 供服务端读写对象（如 `health-files/{patient_id}/{uuid}.pdf`）。  
- 展示时优先 `ai_summary`，无则回退 `summary`。

### 4.4 AI 相关表

直接采用 `docs/supabase-v0.3-ai-tables.sql` 定义，建议补充：

```sql
-- ai_task_configs 可选增加 temperature
alter table ai_task_configs add column if not exists temperature numeric(3,2) default 0.2;

-- ai_logs 可选增加 request_id、token_usage 便于排障
alter table ai_logs add column if not exists token_usage jsonb;
```

`api_key` 字段：**禁止**通过列表 API 返回明文；写入时加密存储（见安全章节）。

### 4.5 初始数据

| 类型 | 要求 |
|------|------|
| 管理员账号 | 部署时 seed 至少 1 个 `admin` 用户 |
| AI 任务配置 | 插入 5 条默认 `task_type`（与 v0.3 SQL 一致） |
| 演示数据 | 可选：导入当前 mock 中的研究项目、患者 DID，便于联调 |

完整 POC DDL 见：`docs/EHF-China-POC-schema-v1.sql`  
AI 表 DDL 见：`docs/supabase-v0.3-ai-tables.sql`

---

## 五、对象存储需求

### 5.1 存储桶 / 目录

| 桶名 | 用途 | 访问策略 |
|------|------|----------|
| `health-files` | 患者上传的病历 PDF/Word/图片 | **私有**；通过签名 URL 或 API 代理下载 |
| `verification-files` | 研究者注册证明材料 | 私有，仅 admin 可读 |
| `exports`（可选） | 批量导出、报表 | 私有，短期有效 |

### 5.2 路径规范

```
health-files/{patient_profile_id}/{record_id}/{original_filename}
```

### 5.3 上传限制（与现网一致）

- 单文件最大：**20 MB**  
- 允许类型：`image/jpeg`、`image/png`、`application/pdf`、`.doc`、`.docx`  
- 服务端校验 MIME + 扩展名双重白名单  

### 5.4 接口要求

服务器需提供（可由 API 层封装 MinIO SDK / fs）：

- `PUT` 上传（multipart）  
- `GET` 签名下载 URL（有效期建议 15～60 分钟）  
- `DELETE` 删除（患者删档 / 管理员审核驳回时）  

**禁止**将 Service Role Key 或存储密钥暴露到浏览器；所有上传经服务端鉴权后写入。

---

## 六、认证与授权

### 6.1 认证方式（推荐）

**方案 A（推荐 POC）**：JWT Access Token + HttpOnly Refresh Token  

| 项目 | 要求 |
|------|------|
| 登录 | `POST /api/auth/login`，body: `{ email, password }` |
| 注册 | `POST /api/auth/register`，按角色区分字段 |
| 刷新 | `POST /api/auth/refresh` |
| 退出 | `POST /api/auth/logout`，吊销 refresh token |
| Access Token 有效期 | 15～60 分钟 |
| Refresh Token | 7～30 天，存 DB 或 Redis |

**方案 B**：Session Cookie + Redis Session Store（适合同域部署）

无论哪种方案，需替换前端 `AuthContext` 中的 mock 登录逻辑。

### 6.2 密码安全

- 使用 **bcrypt** 或 **argon2** 哈希，禁止明文  
- 注册密码强度：最少 8 位，含字母与数字  
- 登录失败限流：同一 IP / 账号 5 次/15 分钟  

### 6.3 角色与权限矩阵

| 资源 | patient | researcher | admin |
|------|---------|------------|-------|
| 自己的 `patient_profiles` | CRUD（DID 只读） | — | R |
| 自己的 `health_records` | CRUD | — | R + 审核 |
| 已授权项目的患者数据 | — | R（仅 DID + 授权范围） | R |
| `research_projects` | R（已发布） | CRUD（自己的） | RUD |
| `consents` | 创建/撤回自己的 | R（本项目） | R |
| `researcher_profiles` 审核 | — | R（自己的） | 审核 |
| `ai_models` / `ai_task_configs` | — | — | CRUD |
| `audit_logs` | — | — | R |

### 6.4 DID 规则

- 注册并完成 onboarding 后生成：`did:ehf:cn:patient:{随机 hex}`  
- 全局唯一，写入 `patient_profiles.did`  
- 研究者界面 **仅展示 DID**，不可见 `full_name`（除非患者主动授权扩展字段，POC 不做）

---

## 七、REST API 需求清单

基础路径建议：`https://{your-domain}/api/v1`  
响应格式：`{ "ok": true, "data": ... }` / `{ "ok": false, "error": "...", "code": "..." }`  
所有需登录接口：`Authorization: Bearer {access_token}`

下列接口与现有 Next.js Route 对齐，便于前端逐步替换。

### 7.1 认证 `/auth`

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/auth/register` | 注册（query/body: `role`） |
| POST | `/auth/login` | 登录，返回 token + 用户信息 |
| POST | `/auth/logout` | 退出 |
| POST | `/auth/refresh` | 刷新 token |
| GET | `/auth/me` | 当前用户 + profile 摘要 |

**注册字段**：

- 公共：`email`、`password`  
- patient onboarding：`full_name`、`gender`、`birth_date`、`disease_type`、`diagnosis_date` 等  
- researcher：`full_name`、`organization_name`、`title`、`research_focus`、证明材料文件  

### 7.2 患者档案 `/patients`

| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| GET | `/patients/me` | patient | 当前患者 profile + DID |
| PATCH | `/patients/me` | patient | 更新基本信息 |
| GET | `/patients/me/summary` | patient | 首页摘要（档案数、授权数） |

### 7.3 健康档案 `/health-records`

| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| GET | `/health-records` | patient | 列表，query: `type`、`search`、`page` |
| GET | `/health-records/:id` | patient, admin | 详情（含 AI 字段） |
| POST | `/health-records/upload` | patient | multipart 上传，返回 record + 触发处理 |
| POST | `/health-records/:id/process` | patient, admin | 手动重试 AI 解析 |
| PATCH | `/health-records/:id` | patient | 更新 title、record_date 等 |
| DELETE | `/health-records/:id` | patient | 删除记录及对象存储文件 |
| GET | `/health-records/:id/download` | patient, admin, researcher* | 签名 URL（*需 consent 校验） |

**与现有代码对应**：

- `GET /api/health-records` → 本接口  
- `POST /api/patient/upload` → `POST /health-records/upload`  
- `POST /api/patient/records/:id/process` → 本接口  

**列表返回字段**（与 `lib/types/health-record.ts` 一致）：

`id, patient_id, file_url, file_type, file_name, file_size, processing_status, created_at, extracted_text, doc_type, ai_summary, structured_data, tags, processing_error, updated_at`

### 7.4 研究项目 `/projects`

| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| GET | `/projects` | patient | 已发布项目，支持筛选 |
| GET | `/projects/:id` | patient, researcher, admin | 详情 |
| GET | `/projects/mine` | researcher | 我的项目列表 |
| POST | `/projects` | researcher | 创建（默认 draft） |
| PATCH | `/projects/:id` | researcher | 编辑 |
| POST | `/projects/:id/publish` | researcher | 提交发布 / 待 admin 审核（可选） |
| GET | `/projects/:id/consented-patients` | researcher | 已授权患者（DID 脱敏） |

### 7.5 授权 `/consents`

| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| GET | `/consents` | patient | 我的授权列表 |
| GET | `/consents/:id` | patient, admin | 详情 |
| POST | `/consents` | patient | 创建授权，body: `project_id`, `authorization_scope`, `allow_follow_up_contact` |
| POST | `/consents/:id/revoke` | patient | 撤回 |
| GET | `/admin/consents` | admin | 全量授权记录 |

**业务规则**：

- 同一 `patient_id + project_id` 唯一（DB 约束）  
- 授权范围 `authorization_scope`：资料类型字符串数组  
- 创建/撤回写 `audit_logs`  

### 7.6 研究者查看患者数据 `/research`

| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| GET | `/research/patients/:did` | researcher | 校验 consent 后返回脱敏 profile + 授权范围内 health_records 摘要 |
| GET | `/research/patients/:did/records` | researcher | 授权范围内档案列表 |
| GET | `/research/patients/:did/records/:recordId` | researcher | 单条详情（不含 extracted_text 全文可选） |

### 7.7 补充资料请求 `/requests`

| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| GET | `/requests` | researcher, patient | 各自可见列表 |
| POST | `/requests` | researcher | 发起请求 |
| PATCH | `/requests/:id` | patient | 接受/拒绝 |

### 7.8 管理后台 `/admin`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/admin/dashboard/stats` | 用户数、项目数、授权数、最近审计 |
| GET | `/admin/patients` | 患者列表（姓名脱敏） |
| GET | `/admin/researchers` | 研究者列表 |
| POST | `/admin/researchers/:id/approve` | 通过审核 |
| POST | `/admin/researchers/:id/reject` | 驳回 |
| GET | `/admin/projects` | 项目列表 |
| GET | `/admin/health-records` | 资料审核列表 |
| PATCH | `/admin/health-records/:id/review` | 通过/驳回 |
| GET | `/admin/audit-logs` | 审计日志 |

### 7.9 AI 配置 `/admin/ai`

| 方法 | 路径 | 说明 |
|------|------|------|
| GET/POST | `/admin/ai-models` | 列表 / 新增 |
| GET/PATCH/DELETE | `/admin/ai-models/:id` | 详情 / 更新 / 删除 |
| GET | `/admin/ai-task-configs` | 任务配置列表 |
| PATCH | `/admin/ai-task-configs/:id` | 更新 preferred/fallback 模型等 |
| GET | `/admin/ai-logs` | 日志，query: `record_id`, `task_type`, `status` |

与现有 `app/api/admin/ai-*` 行为保持一致；列表接口 **不返回 api_key 明文**。

---

## 八、AI 处理服务需求

### 8.1 处理流水线

上传完成后执行（与 `docs/v0.4-ai-processing-setup.md` 一致，建议改为 **异步 Worker**）：

```
upload → processing
  → extractText (PDF: unpdf, DOCX: mammoth, 图片: OCR 或占位)
  → structured_extract (LLM JSON)
  → 写回 health_records + ai_logs
  → completed | failed
```

### 8.2 任务类型

| task_type | 当前实现 | 优先级 |
|-----------|----------|--------|
| `structured_extract` | ✅ 已实现 | P0 |
| `ocr_extract` | 占位 | P1 |
| `doc_classify` | 合并在 structured_extract | P2 |
| `tagging` | 合并在 structured_extract | P2 |
| `summary` | 合并在 structured_extract | P2 |

### 8.3 Worker 部署要求

| 模式 | 说明 |
|------|------|
| **同步（现状）** | 上传 API 内 `processRecordInBackground()`，适合 POC |
| **异步（推荐生产）** | 上传后写入队列表或 Redis Queue，独立 Worker 消费 |

队列表建议字段：`id, record_id, status, attempts, created_at, started_at, finished_at, error`

### 8.4 模型调用

- 从 `ai_task_configs` + `ai_models` 读取配置（现有 `lib/ai/router.ts` 逻辑可复用）  
- 调用 **OpenAI 兼容** Chat Completions API  
- 超时、重试、fallback 模型与现网一致  
- 每次调用写 `ai_logs`（status、duration_ms、error_message）

### 8.5 并发与限流

- 单 Worker 并发建议 ≤ 3（视 LLM 配额）  
- 单患者同时 processing 记录 ≤ 2  
- 全局队列深度监控告警  

---

## 九、安全与合规

### 9.1 传输与网络

- 全站 **HTTPS**（Let's Encrypt 或企业证书）  
- 数据库、Redis、MinIO **不对公网开放**，仅内网或 VPN  
- 管理后台建议 IP 白名单或 VPN  

### 9.2 敏感数据

| 数据 | 要求 |
|------|------|
| 密码 | bcrypt/argon2 哈希 |
| AI `api_key` | 库内 AES 加密；环境变量存主密钥 `SECRETS_ENCRYPTION_KEY` |
| 健康档案文件 | 私有桶 + 鉴权下载 |
| 日志 | 禁止打印 api_key、密码、完整 extracted_text |

### 9.3 审计

以下操作 **必须** 写 `audit_logs`：

- 登录成功/失败（可仅记录失败）  
- 授权创建 / 撤回  
- 管理员审核研究者、审核资料  
- 研究者访问患者授权数据  
- AI 配置变更  

### 9.4 备份

| 对象 | 频率 | 保留 |
|------|------|------|
| PostgreSQL 全量 | 每日 | 30 天 |
| PostgreSQL WAL | 持续 | 7 天 |
| 对象存储 | 每日增量 | 90 天 |

定期做 **恢复演练**。

---

## 十、环境变量（自建服务器）

部署时在服务器或 `.env` 中配置：

```env
# ── 应用 ──
NODE_ENV=production
APP_URL=https://your-domain.com
API_BASE_URL=https://your-domain.com/api/v1
JWT_SECRET=                    # 随机 32+ 字节
JWT_ACCESS_EXPIRES=3600
JWT_REFRESH_EXPIRES=604800

# ── PostgreSQL ──
DATABASE_URL=postgresql://user:pass@localhost:5432/ehf_wallet

# ── 对象存储（MinIO 示例）──
S3_ENDPOINT=http://127.0.0.1:9000
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET_HEALTH=health-files
S3_REGION=us-east-1
S3_PUBLIC_BASE_URL=             # 若走 CDN/反代

# ── Redis（可选，队列/Session）──
REDIS_URL=redis://127.0.0.1:6379

# ── 加密 ──
SECRETS_ENCRYPTION_KEY=         # 加密 ai_models.api_key

# ── AI 默认（可被 DB 配置覆盖）──
# 无硬编码 API Key，全部走 ai_models 表

# ── 文件限制 ──
UPLOAD_MAX_BYTES=20971520
```

**移除**对以下 Supabase 变量的依赖：

- `NEXT_PUBLIC_SUPABASE_URL`  
- `SUPABASE_SERVICE_ROLE_KEY`  
- `MOCK_PATIENT_ID`  

---

## 十一、前端改造要点（供联调参考）

服务器 API 就绪后，前端需：

1. 删除或停用 `MockStoreContext` 中的业务写入，改为调用 REST API。  
2. `AuthContext` 改为调用 `/auth/login` 等，token 存 memory + HttpOnly cookie（勿再用 mock 用户表）。  
3. `/patient/records` 已接 API，仅需改 base URL 与鉴权头。  
4. `/patient/dashboard`、授权、研究项目等页面从 mock 改为 API。  
5. 移除 `@supabase/supabase-js` 直连，改由自建 API 访问 PG 与存储。  
6. 新建 `lib/api/client.ts` 统一 fetch 封装。

---

## 十二、迁移实施计划

### 阶段 0：基础设施（1～2 天）

- [ ] 部署 PostgreSQL、MinIO、Nginx  
- [ ] 执行统一 DDL + seed 管理员 + AI 默认任务  
- [ ] 配置备份与 HTTPS  

### 阶段 1：认证与用户（2～3 天）

- [ ] 实现 `/auth/*`、`users`、`patient_profiles`、`researcher_profiles`  
- [ ] 前端登录/注册对接  
- [ ] 替换 `MOCK_PATIENT_ID` 为 JWT 中的 patient_id  

### 阶段 2：健康档案与存储（2～3 天）

- [ ] 实现上传、列表、详情、下载  
- [ ] 迁移 Supabase 已有 `health_records` 与 Storage 文件（若有）  
- [ ] 接入 AI 处理（可先同步模式）  

### 阶段 3：科研业务（3～4 天）

- [ ] `research_projects`、`consents` CRUD  
- [ ] 研究者脱敏读接口  
- [ ] 管理后台列表与审核  

### 阶段 4：AI 后台与审计（1～2 天）

- [ ] 迁移 `ai_models`、`ai_task_configs`、`ai_logs` 管理 API  
- [ ] 审计日志全覆盖  
- [ ] 异步 Worker（可选）  

### 阶段 5：验收与下线 Mock（1 天）

- [ ] 跑通 Demo 脚本（`docs/Demo-Script-v0.1.md` 升级版）  
- [ ] 删除 mock 业务依赖  

---

## 十三、验收标准

### 13.1 功能验收

1. 三名角色可注册/登录，权限隔离正确。  
2. 患者上传 PDF → 列表可见 → 详情含 AI 摘要/标签/结构化 JSON。  
3. 患者授权研究项目 → 研究者可见 DID 与授权资料 → 管理员可见授权记录。  
4. 管理员可审核研究者、审核资料、配置 AI 模型。  
5. 服务重启后 **所有数据仍在**（无 Mock 内存丢失问题）。  

### 13.2 非功能验收

| 项 | 标准 |
|----|------|
| API P95 延迟 | 列表 < 500ms（不含 AI） |
| 上传 | 20MB 文件成功率 > 99% |
| 安全 | 未授权无法访问他人档案；api_key 不出现在前端 |
| 备份 | 可从一个备份恢复到新环境并登录 |

### 13.3 演示账号（seed 建议）

| 角色 | 邮箱 | 初始密码 |
|------|------|----------|
| 患者 | patient@example.com | （部署时设定，勿用弱密码） |
| 研究者 | researcher@example.com | 同上 |
| 管理员 | admin@example.com | 同上 |

---

## 十四、参考文档

| 文档 | 路径 |
|------|------|
| 产品 PRD | `docs/EHF-China-POC-PRD-v1 copy.md` |
| 完整 POC 数据库 | `docs/EHF-China-POC-schema-v1.sql` |
| Supabase 健康档案 v0.2 | `docs/supabase-v0.2-health-records.sql` |
| AI 表 v0.3 | `docs/supabase-v0.3-ai-tables.sql` |
| AI 字段 v0.4 | `docs/supabase-v0.4-health-records-ai-fields.sql` |
| AI 架构 | `docs/AI-Engine-Architecture.md` |
| AI 处理说明 | `docs/v0.4-ai-processing-setup.md` |
| 上传模块 PRD | `docs/AI-Upload-Module-PRD-v1.md` |
| v0.1 Demo 范围 | `docs/V0.1-DEMO.md` |

---

## 十五、待确认事项（实施前与产品/运维对齐）

1. **API 形态**：继续用 Next.js API Routes，还是独立后端服务？  
2. **对象存储**：MinIO 自建 vs 云 S3 vs 本地目录？  
3. **AI Worker**：同步够用还是必须上 Redis 队列？  
4. **研究者注册**：是否需要 admin 审核通过后才能创建项目？  
5. **数据驻留**：服务器物理位置与等保/个保合规要求？  
6. **历史 Supabase 数据**：是否需要迁移脚本从 Supabase 导出导入？

---

**文档维护**：后端 schema 或 API 变更时，请同步更新本文档版本号与变更记录。
