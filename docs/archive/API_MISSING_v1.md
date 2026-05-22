# EHF 患者数据钱包 · 缺失接口与补齐说明

**版本**：v1.0  
**日期**：2026-05-21  
**读者**：App Data Hub / Hermes 后端开发  
**对照文档**：`EHF_API.md`（已实现接口）、`CURSOR_EHF_INTEGRATION_GUIDE.md`（前端接入指南）  
**Base URL**：`https://tuutpi.online`  
**命名空间**：`/v1/ehf/...`

---

## 一、文档目的

`EHF_API.md` 已覆盖 MVP 主链路（注册、档案、项目、授权、研究者脱敏访问、部分管理接口）。  
前端 Next.js 项目要 **完全替换 Mock / Supabase**，仍缺少若干接口或字段。本文档列出 **待补齐项**，按优先级划分，便于后端排期。

**统一请求头**（与现网一致）：

```http
X-App-ID: <EHF_APP_ID>
X-API-Key: <EHF_APP_API_KEY>
Authorization: Bearer <access_token>
Content-Type: application/json
```

文件上传使用 `multipart/form-data`，不传 `Content-Type` 或由客户端自动带 boundary。

---

## 二、优先级说明

| 级别 | 含义 | 前端影响 |
|------|------|----------|
| **P0** | 前端联调阻塞项 | 无此接口无法完成登录闭环或核心页面 |
| **P1** | 管理端 / 研究者端完整页面 | 可先隐藏菜单，但正式演示需要 |
| **P2** | 增强能力 | AI 真实解析、补充请求、架构升级 |

---

## 三、P0 — 必须先补齐

### 3.1 用户登录

**现状**：仅有 `register-patient` / `register-researcher` / `register-admin`，**无登录接口文档**。老用户、退出后重新进入无法走通。

**建议新增**（推荐 EHF 专用命名空间，便于返回 `ehf_role`）：

#### `POST /v1/ehf/auth/login`

**Request**

```json
{
  "email": "patient@example.com",
  "password": "Patient123"
}
```

**Response `200`**

```json
{
  "access_token": "eyJ...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "usr_...",
    "email": "patient@example.com",
    "ehf_role": "patient"
  },
  "profile": {}
}
```

**说明**

- `profile` 按角色返回 `PatientProfile` / `ResearcherProfile` / `null`（admin 可无 profile 或返回 `{ display_name }`）。
- 密码错误返回 `401`；账号被禁用返回 `403`。
- 若复用 App Data Hub 现有 `POST /v1/auth/login`，请在 `EHF_API.md` **明确写出**：请求路径、是否需额外 header、响应是否含 `ehf_role`，避免前端猜路径。

**可选（P0.5，不阻塞首轮）**

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/v1/ehf/auth/logout` | 吊销 token（若使用 refresh token） |
| POST | `/v1/ehf/auth/refresh` | 用 refresh token 换新 access token |

---

### 3.2 CORS 白名单（运维项，联调阻塞）

**现状**：文档有说明，需确认已配置。

**要求**：将以下 origin **精确**加入 EHF App 的 allowed origins（scheme + host，无路径、无末尾 `/`）：

- `http://localhost:3000`（Next.js 本地）
- 前端正式域名（部署后由产品提供）

**验收**：浏览器从上述 origin 发起 `OPTIONS` + `POST /v1/ehf/auth/login` 无 CORS 错误。

---

### 3.3 完善已有接口的响应文档与字段

以下接口 **已存在但文档不完整**，请补全 Request/Response 示例，并保证实际返回与文档一致。

#### `POST /v1/ehf/auth/register-researcher`

**Request 示例**

```json
{
  "email": "researcher@example.com",
  "password": "Researcher123",
  "full_name": "王医生",
  "organization_name": "某某研究所",
  "title": "副研究员",
  "research_focus": "呼吸疾病"
}
```

**Response `201`**

```json
{
  "access_token": "...",
  "token_type": "bearer",
  "user": { "id": "usr_...", "email": "...", "ehf_role": "researcher" },
  "profile": {
    "id": "res_...",
    "review_status": "pending",
    "full_name": "王医生",
    "organization_name": "某某研究所"
  }
}
```

#### `GET /v1/ehf/auth/me`

**Response `200` 示例**

```json
{
  "user": {
    "id": "usr_...",
    "email": "patient@example.com",
    "ehf_role": "patient"
  },
  "profile": {
    "id": "pat_...",
    "did": "did:ehf:cn:patient:abc123",
    "full_name": "Patient One",
    "gender": "female",
    "birth_date": "2010-01-02",
    "disease_type": "visual learning disorder",
    "diagnosis_date": "2025-05-01",
    "phone": null,
    "contact_email": "patient@example.com",
    "created_at": 1710000000,
    "updated_at": 1710000000
  }
}
```

研究者 / 管理员角色同理，`profile` 结构不同。

---

### 3.4 列表响应格式统一

**现状**：部分接口返回 `{ items: [...] }`，前端 mock 与 Supabase 习惯字段名不统一。

**要求**：所有列表接口统一为：

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "page_size": 50
}
```

**涉及接口**：

- `GET /v1/ehf/health-records`
- `GET /v1/ehf/projects`
- `GET /v1/ehf/projects/mine`
- `GET /v1/ehf/consents`
- `GET /v1/ehf/research/patients/{did}/records`
- `GET /v1/ehf/admin/*` 列表类

---

### 3.5 Consent 列表增加关联展示字段

**现状**：`GET /v1/ehf/consents` 仅有 `project_id`，前端授权列表/详情需要 **项目名称**。

**要求**：患者端 consent 列表/详情响应增加：

```json
{
  "id": "cst_...",
  "project_id": "prj_...",
  "project_title": "Vision Study",
  "authorization_scope": ["exam_report"],
  "allow_follow_up_contact": false,
  "status": "active",
  "created_at": 1710000000,
  "updated_at": 1710000000,
  "revoked_at": null,
  "expired_at": null
}
```

#### 新增：`GET /v1/ehf/consents/{consent_id}`

- **角色**：patient（本人）、admin  
- **用途**：患者端 `/patient/consents/[id]` 授权详情页  
- **Response**：单条 Consent（含 `project_title`）

---

### 3.6 研究项目列表增加前端展示字段

**现状**：`ResearchProject` 仅有 `title`、`description`、`data_scope`、`status`。  
患者端 `/patient/studies` 需要：

| 字段 | 说明 | 建议 |
|------|------|------|
| `organization_name` | 研究机构 | 创建项目时写入，或从 researcher profile 冗余 |
| `disease_type` | 疾病方向 | 创建/更新时可填 |
| `required_record_types` 或沿用 `data_scope` | 所需资料类型 | 与前端枚举对齐，见 §7.1 |
| `consented_count` | 已授权人数 | 列表可选，研究者「我的项目」需要 |
| `updated_at` | 更新时间 | 已有 |

**要求**：扩展 `POST/PATCH /v1/ehf/projects` 与 `GET` 响应字段；或在文档中明确 **`data_scope` 与前端中文资料类型的映射表**。

---

### 3.7 研究者：项目下已授权患者列表

**现状**：仅有按 DID 单查 `/research/patients/{did}`，无「某项目下所有已授权患者」列表。  
前端页面：`/researcher/projects/[id]/patients`

#### 新增：`GET /v1/ehf/projects/{project_id}/consented-patients`

- **角色**：researcher（项目创建者）、admin  
- **前置**：研究者 `review_status=approved`  
- **Response**

```json
{
  "items": [
    {
      "patient_did": "did:ehf:cn:patient:abc123",
      "disease_type": "visual learning disorder",
      "diagnosis_date": "2025-05-01",
      "authorization_scope": ["exam_report"],
      "authorized_at": 1710000000,
      "consent_id": "cst_...",
      "record_count_in_scope": 2
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 50
}
```

**说明**：不得返回姓名、手机号、邮箱；`record_count_in_scope` 为授权 scope 内档案数量（可选）。

---

### 3.8 测试账号 Seed

**现状**：无文档化测试账号，前端联调成本高。

**要求**：提供以下之一：

1. 部署脚本 / SQL seed 创建固定账号；或  
2. 文档写明测试邮箱与初始密码（仅测试环境）。

| 角色 | 建议邮箱 | 状态 |
|------|----------|------|
| patient | patient@example.com | 已注册，有 DID |
| researcher | researcher@example.com | review_status=**approved** |
| researcher（待审） | researcher-pending@example.com | review_status=**pending** |
| admin | admin@example.com | 可登录管理端 |

---

## 四、P1 — 管理端与完整业务页

### 4.1 管理员 — 授权记录列表

**前端页面**：`/admin/consents`  
**现状**：无 admin 侧 consent 列表接口（患者仅有 `GET /consents` 查自己）。

#### 新增：`GET /v1/ehf/admin/consents`

- **角色**：admin  
- **Query**：`page`, `page_size`, `status`, `project_id`, `patient_did`（可选）  
- **Response items 字段**

```json
{
  "id": "cst_...",
  "patient_did": "did:ehf:cn:patient:...",
  "project_id": "prj_...",
  "project_title": "...",
  "authorization_scope": ["exam_report"],
  "status": "active",
  "created_at": 1710000000,
  "revoked_at": null
}
```

---

### 4.2 管理员 — 项目列表

**前端页面**：`/admin/projects`  
**现状**：无 `GET /v1/ehf/admin/projects`。

#### 新增：`GET /v1/ehf/admin/projects`

- **Query**：`page`, `page_size`, `status`, `search`  
- **Response items**

```json
{
  "id": "prj_...",
  "title": "...",
  "organization_name": "...",
  "disease_type": "...",
  "status": "published",
  "researcher_id": "res_...",
  "researcher_name_masked": "王**",
  "consent_count": 3,
  "created_at": 1710000000,
  "updated_at": 1710000000
}
```

---

### 4.3 管理员 — 健康档案审核

**前端页面**：`/admin/records`  
**现状**：健康档案有 `review_status` 字段设计，但 **无 admin 列表与审核接口**。

#### 新增：`GET /v1/ehf/admin/health-records`

- **Query**：`page`, `page_size`, `review_status`, `patient_did`, `search`  
- **Response items**

```json
{
  "id": "rec_...",
  "patient_did": "did:ehf:cn:patient:...",
  "record_type": "exam_report",
  "title": "检查报告.pdf",
  "file_name": "report.pdf",
  "review_status": "pending",
  "processing_status": "completed",
  "created_at": 1710000000
}
```

#### 新增：`PATCH /v1/ehf/admin/health-records/{record_id}/review`

**Request**

```json
{
  "review_status": "approved",
  "review_note": "可选备注"
}
```

- `review_status`：`pending` | `approved` | `rejected`  
- 写 `ehf_audit_logs`

---

### 4.4 研究者工作台统计

**前端页面**：`/researcher/dashboard`  
**现状**：前端从 mock 聚合项目数、授权患者数、待处理请求数。

#### 新增：`GET /v1/ehf/researchers/me/summary`

- **角色**：researcher（approved）  
- **Response**

```json
{
  "project_count": 2,
  "published_project_count": 1,
  "consented_patient_count": 5,
  "pending_request_count": 0,
  "review_status": "approved"
}
```

`pending_request_count` 在补充请求 API 未实现前可固定返回 `0`。

---

### 4.5 研究者 — 单条授权档案详情

**前端页面**：`/researcher/patients/[patientId]`（patientId 实为 DID）

#### 新增：`GET /v1/ehf/research/patients/{did}/records/{record_id}`

- **前置**：active consent + scope 包含该 record  
- **Response**：`HealthRecord` 元数据，**默认不含** `extracted_text`  
- **Query**：`include_extracted_text=true`（可选，admin 或显式授权场景）

---

### 4.6 研究项目 — 发布/关闭

**前端**：创建项目后需「发布」供患者可见；mock 有 `draft` / `published` / `closed`。

**要求**（二选一）：

1. 已有 `PATCH /projects/{id}` 支持 `status`，则文档明确状态机：

   ```
   draft → published → closed
   ```

2. 或新增便捷接口：

   | 方法 | 路径 |
   |------|------|
   | POST | `/v1/ehf/projects/{project_id}/publish` |
   | POST | `/v1/ehf/projects/{project_id}/close` |

**规则**：仅 `published` 项目出现在患者 `GET /projects` 列表。

---

### 4.7 审计日志响应 enrich

**现状**：`GET /v1/ehf/admin/audit-logs` 已有，前端表格需要可读字段。

**要求** items 增加（若尚未返回）：

```json
{
  "id": "log_...",
  "actor_id": "usr_...",
  "actor_role": "patient",
  "actor_display": "patient@example.com",
  "action": "consent.created",
  "target_type": "consent",
  "target_id": "cst_...",
  "metadata": {},
  "created_at": 1710000000
}
```

---

## 五、P2 — AI 与异步处理

### 5.1 真实 AI 处理（替换占位 `/process`）

**现状**：`POST /v1/ehf/health-records/{record_id}/process` 为占位，直接 `completed` + 写假 summary。

**目标**：与前端原 v0.4 能力对齐（PDF/DOCX 文本提取 + LLM 结构化）。

#### 行为要求

1. 上传后 `processing_status` 初始为 `uploaded` 或 `processing`。  
2. `POST .../process` 或 **上传后自动触发** 异步任务。  
3. 状态流转：`uploaded` → `processing` → `completed` | `failed`。  
4. 成功写回：`extracted_text`, `doc_type`, `ai_summary`, `structured_data`, `tags`, `processing_error=null`。  
5. 失败写回：`processing_status=failed`, `processing_error` 可读中文/英文信息。  
6. 图片：可 OCR 或暂保持 `doc_type=image_unparsed`（需文档说明）。  
7. 每次 LLM 调用写 `ehf_ai_logs`（`task_type`, `model_name`, `status`, `duration_ms`, `error_message`）。

#### 新增（推荐）：`GET /v1/ehf/health-records/{record_id}/processing-status`

- 供前端轮询，避免长时间阻塞 `POST /process`。  
- **Response**

```json
{
  "id": "rec_...",
  "processing_status": "processing",
  "processing_error": null,
  "updated_at": 1710000000
}
```

#### 并发与幂等

- 同一条 record 处理中再次 `POST /process` 返回 `409` 或 `{ "skipped": true, "processing_status": "processing" }`。  
- 已完成记录重复 process 返回当前状态，不重复扣费/调模型。

---

### 5.2 AI 管理后台 API

**前端页面**：`/admin/ai-models`、`/admin/ai-tasks`、`/admin/ai-logs`  
**现状**：表 `ehf_ai_models` / `ehf_ai_task_configs` / `ehf_ai_logs` 已预留，**无 HTTP API**。

以下接口与前端现有 Next.js `/api/admin/ai-*` 行为对齐（路径改为 EHF 命名空间）：

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/v1/ehf/admin/ai-models` | 列表，**不返回 api_key 明文** |
| POST | `/v1/ehf/admin/ai-models` | 新增 |
| GET | `/v1/ehf/admin/ai-models/{id}` | 详情 |
| PATCH | `/v1/ehf/admin/ai-models/{id}` | 更新 |
| DELETE | `/v1/ehf/admin/ai-models/{id}` | 删除 |
| GET | `/v1/ehf/admin/ai-task-configs` | 5 种 task_type 配置 |
| PATCH | `/v1/ehf/admin/ai-task-configs/{id}` | 更新 preferred/fallback 模型等 |
| GET | `/v1/ehf/admin/ai-logs` | 分页，query: `record_id`, `task_type`, `status` |

**AiModel 字段**（与前端 `lib/types/ai-config.ts` 一致）：

`id, provider, model_name, base_url, supports_vision, supports_json, is_default, is_active, priority, notes, created_at`  
写入时接受 `api_key`；读取列表时返回 `api_key_set: true` 或掩码 `****`。

**Task types**：`ocr_extract`, `doc_classify`, `structured_extract`, `tagging`, `summary`

---

## 六、P2 — 补充资料请求

**前端页面**：`/researcher/requests`（当前占位）  
**表**：`ehf_supplementary_requests` 已预留

| 方法 | 路径 | 角色 | 说明 |
|------|------|------|------|
| GET | `/v1/ehf/requests` | researcher, patient | 各自可见列表 |
| POST | `/v1/ehf/requests` | researcher | 发起请求 |
| GET | `/v1/ehf/requests/{id}` | researcher, patient | 详情 |
| PATCH | `/v1/ehf/requests/{id}` | patient | 接受 `fulfilled` / 拒绝 `declined` |

**POST Request 示例**

```json
{
  "project_id": "prj_...",
  "patient_did": "did:ehf:cn:patient:...",
  "title": "请补充近期 CT 报告",
  "reason": "纳入分析需要",
  "requested_record_types": ["exam_report", "imaging"]
}
```

**前置**：researcher 对该 DID 已有 active consent。

---

## 七、数据与枚举约定

### 7.1 资料类型（record_type / data_scope）

前端 mock 使用中文，后端当前示例为英文 code。请 **固定一套枚举** 并在文档中给出中英文映射，例如：

| code | 中文（前端展示） |
|------|------------------|
| `outpatient_note` | 门诊记录 |
| `discharge_summary` | 出院小结 |
| `exam_report` | 检查报告 |
| `imaging` | 影像资料 |
| `genetic_test` | 基因检测 |
| `medication` | 用药记录 |
| `questionnaire` | 问卷 |
| `other` | 其他 |

**要求**：`authorization_scope`、`data_scope`、上传表单的 `record_type` **使用同一套 code**。

### 7.2 HealthRecord 完整 Schema（建议在 EHF_API.md 附录）

```json
{
  "id": "rec_...",
  "patient_id": "pat_...",
  "record_type": "exam_report",
  "title": "血常规报告",
  "record_date": "2026-05-21",
  "source_type": "patient_upload",
  "source_organization": "某某医院",
  "summary": null,
  "review_status": "pending",
  "file_url": "https://tuutpi.online/v1/ehf/health-records/rec_.../download",
  "file_type": "application/pdf",
  "file_name": "report.pdf",
  "file_size": 102400,
  "extracted_text": null,
  "doc_type": "lab_report",
  "ai_summary": "血常规检查结果摘要...",
  "structured_data": { "hospital": "...", "date": "...", "diagnosis": [] },
  "tags": ["blood_test"],
  "processing_status": "completed",
  "processing_error": null,
  "created_at": 1710000000,
  "updated_at": 1710000000
}
```

### 7.3 时间戳格式

**现状**：示例混用 Unix 秒级整数。  
**要求**：全 API **统一**为 Unix 秒（integer）或 ISO8601 字符串，任选一种并在 `EHF_API.md` 声明。

### 7.4 错误响应格式

**建议统一**：

```json
{
  "error": "human readable message",
  "code": "VALIDATION_ERROR",
  "details": {}
}
```

常见 `code`：`UNAUTHORIZED`, `FORBIDDEN`, `NOT_FOUND`, `CONFLICT`, `VALIDATION_ERROR`, `FILE_TOO_LARGE`, `UNSUPPORTED_MEDIA_TYPE`

---

## 八、与现有接口的差异修正（非新增，但需确认）

| 项 | 现状 | 建议 |
|----|------|------|
| 注册即登录 | register 返回 token | 保持；同时必须有 login |
| `GET /projects` 权限 | 所有登录用户 | 患者只看 `published`；研究者可看自己的 draft |
| 研究者 pending | 不能创建项目 | 返回 `403` + code `RESEARCHER_NOT_APPROVED` |
| Consent 重复 | — | 同一 patient+project 重复授权返回 `409` |
| 文件 download URL | 可能为 API 路径 | 文档说明是否需带 token 或短期签名 |
| admin 注册 | 开放 register-admin | 生产环境应限制或仅内网；测试环境可开放 |

---

## 九、验收清单（后端自测）

完成 P0 后，应能通过以下脚本（可写入 `tests/test_ehf_api_missing.py`）：

- [ ] `POST /auth/login` 三种角色均可登录并拿到 token  
- [ ] 登录后 `GET /auth/me` 返回正确 profile  
- [ ] CORS：`Origin: http://localhost:3000` 预检通过  
- [ ] `GET /consents` 含 `project_title`；`GET /consents/{id}` 可访问  
- [ ] `GET /projects/{id}/consented-patients` 仅返回已授权 DID，无 PII  
- [ ] 列表接口均含 `items` + `total` + `page`  
- [ ] Seed 测试账号文档可用  

完成 P1 后：

- [ ] admin 可列表 consents / projects / health-records 并审核资料  
- [ ] researcher dashboard summary 数字正确  
- [ ] `GET /research/patients/{did}/records/{record_id}` 权限与 scope 校验  

完成 P2 后：

- [ ] PDF 上传 → process → `structured_data` 非空（或明确失败原因）  
- [ ] AI 模型 CRUD 与 task config 可管理  
- [ ] 补充资料请求闭环  

---

## 十、建议实施顺序

```
Week 1  P0：login + CORS + seed + 响应字段/列表格式 + consents 详情 + consented-patients
Week 2  P1：admin 列表/审核 + researcher summary + 项目 status 文档化
Week 3  P2：真实 AI process + ai admin API
Week 4  P2：补充资料请求（可选）
```

---

## 十一、前端对接说明

P0 完成后通知前端开始：

1. 替换 `AuthContext` → `/auth/login` + `/auth/me`  
2. 替换健康档案 → `/health-records/*`  
3. 替换项目/授权 → `/projects` + `/consents`  
4. P1 完成后替换管理端页面  

参考：`CURSOR_EHF_INTEGRATION_GUIDE.md`

---

## 十二、变更记录

| 版本 | 日期 | 说明 |
|------|------|------|
| v1.0 | 2026-05-21 | 初版：基于 EHF_API.md 与 Next.js 前端页面差距整理 |
