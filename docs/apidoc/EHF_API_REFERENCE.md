# EHF 患者数据钱包 · API 参考

> **主文档**（合并自 `EHF_API.md`、`EHF_FRONTEND_API_GUIDE`、`EHF_ADMIN_AUTH`）  
> 更新日期：2026-05-22（接口）/ 2026-05-23（管理员账号）  
> 后端：App Data Hub / FastAPI / SQLite  
> Base URL：`https://tuutpi.online`（本机：`http://127.0.0.1:8080`）  
> 命名空间：`/v1/ehf/...`  
> 前端实现：`lib/api/ehfClient.ts`、`lib/api/ehfTypes.ts`

## Changelog

| 日期 | 说明 |
|------|------|
| 2026-05-21 | 初版 `EHF_API.md` + `EHF_API_MISSING.md` 缺口清单 |
| 2026-05-22 | P0/P1/P2 接口补齐（登录、管理列表、AI、补充请求等） |
| 2026-05-23 | 管理员预置账号、改密、绑定邮箱、找回密码（后端已实现，见 ADMIN_AUTH_CHANGE_GUIDE） |

历史缺口清单见 `docs/archive/API_MISSING_v1.md`。

## 0. 结论

本文件是给前端开发使用的总版说明，覆盖：

- P0/P1：登录身份、患者/研究者/管理员核心流程、项目、授权、健康记录、审核、统计、审计等接口补齐。
- P2：AI 模型管理、AI 任务配置、健康记录 OCR/LLM 占位处理管线、AI 日志、补充资料请求工作流。

本轮改造对原 App Data Hub 最早的数据存储和接口采取兼容策略：

- 数据库迁移为追加式：`CREATE TABLE IF NOT EXISTS`、缺字段才 `ALTER TABLE ADD COLUMN`。
- 未删除旧表、未重命名旧字段、未改变原 `/v1/data...`、`/v1/files...` 等基础接口路径。
- 已运行全量测试：`python -m pytest -q` → `14 passed`。
- 已重启服务并健康检查通过：`GET /health` → `{"status":"ok","service":"app-data-hub","version":"0.3.0"}`。

---

## 1. 通用约定

### 1.1 请求头

所有 EHF 业务接口均需要 App 凭证：

```http
X-App-Id: <app_id>
X-Api-Key: <app_api_key>
```

登录后的用户接口还需要：

```http
Authorization: Bearer <access_token>
```

### 1.2 角色

- `patient`：患者端。
- `researcher`：研究者端。
- `admin`：管理端。

### 1.3 分页格式

分页接口统一使用：

```http
?page=1&page_size=50
```

返回：

```json
{
  "items": [],
  "total": 0,
  "page": 1,
  "page_size": 50,
  "total_pages": 0
}
```

### 1.4 错误码

- `401`：缺少或错误的 App 凭证 / Bearer token。
- `403`：角色不匹配、账号状态不可用、研究者未通过审核。
- `404`：资源不存在，或当前用户无权访问该资源时按 404 处理。
- `422`：请求体字段格式错误。

### 1.5 数据模型（SQLite 表）

- `ehf_user_roles`：用户 → EHF 角色映射
- `ehf_patient_profiles`：患者档案与 DID
- `ehf_researcher_profiles`：研究者档案与审核状态
- `ehf_health_records`：健康档案、AI 处理状态与结构化字段
- `ehf_research_projects`：研究项目
- `ehf_consents`：患者对项目的授权
- `ehf_supplementary_requests`：补充资料请求
- `ehf_audit_logs`：审计日志
- `ehf_ai_models` / `ehf_ai_task_configs` / `ehf_ai_logs`：AI 配置与日志

DDL 参考：`docs/sql/EHF-China-POC-schema-v1.sql` 及后端迁移脚本。

---

## 2. 认证与账号

### 2.0 注册（MVP 基线）

#### `POST /v1/ehf/auth/register-patient`

创建患者账号、档案、DID，返回 `access_token` 与 `profile`。

```json
{
  "email": "patient@example.com",
  "password": "Patient123",
  "full_name": "Patient One",
  "gender": "female",
  "birth_date": "2010-01-02",
  "disease_type": "visual learning disorder",
  "diagnosis_date": "2025-05-01",
  "phone": "13800000000"
}
```

#### `POST /v1/ehf/auth/register-researcher`

创建研究者账号，默认 `review_status=pending`。

#### `POST /v1/ehf/auth/register-admin`

生产环境应 **禁用**（`403`）；仅测试环境可选保留。前端已不再暴露管理端注册入口。

---

### 2.1 P0/P1 已补齐接口

### 2.1 Auth / Identity

#### 登录

```http
POST /v1/ehf/auth/login
```

请求：

```json
{
  "email": "user@example.com",
  "password": "password"
}
```

响应包含：

```json
{
  "access_token": "...",
  "token_type": "bearer",
  "expires_in": 2592000,
  "user": {
    "id": "usr_xxx",
    "email": "user@example.com",
    "role": "operator",
    "ehf_role": "patient"
  }
}
```

#### 患者档案

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/v1/ehf/patients/me` | 当前患者档案 |
| PATCH | `/v1/ehf/patients/me` | 更新 `full_name`, `gender`, `birth_date`, `disease_type`, `diagnosis_date`, `phone` |
| GET | `/v1/ehf/patients/me/summary` | DID、档案数、活跃授权数 |

#### 健康档案（患者）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/v1/ehf/health-records/upload` | multipart：`file`（≤20MB，pdf/jpg/png/doc/docx）、`record_type`、`record_date`、`source_organization` |
| GET | `/v1/ehf/health-records` | Query：`type`, `search`, `page`, `page_size` |
| GET | `/v1/ehf/health-records/{id}` | 元数据 |
| GET | `/v1/ehf/health-records/{id}/download` | 鉴权下载 |
| PATCH | `/v1/ehf/health-records/{id}` | 更新元数据 |
| DELETE | `/v1/ehf/health-records/{id}` | 删除记录与文件 |

#### 研究项目与授权

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/v1/ehf/projects` | 已批准研究者创建项目 |
| GET | `/v1/ehf/projects` | 已发布项目列表 |
| GET | `/v1/ehf/projects/mine` | 研究者自己的项目 |
| GET/PATCH | `/v1/ehf/projects/{id}` | 详情 / 更新 |
| POST | `/v1/ehf/consents` | 患者授权（`project_id`, `authorization_scope`, `allow_follow_up_contact`） |
| POST | `/v1/ehf/consents/{id}/revoke` | 撤销授权 |
| GET | `/v1/ehf/research/patients/{did}` | 研究者：去标识化患者概要 |

#### 当前用户信息

```http
GET /v1/ehf/auth/me
```

返回：

```json
{
  "user": { "id": "usr_xxx", "email": "user@example.com", "ehf_role": "patient" },
  "profile": { "id": "pat_xxx", "did": "did:ehf:cn:patient:xxx" }
}
```

---

### 2.2 Research Projects / Consent

#### 研究项目字段增强

项目创建/更新已支持：

- `organization_name`
- `disease_type`
- `required_record_types`
- `data_scope`
- `status`

#### 项目已授权患者列表

```http
GET /v1/ehf/projects/{project_id}/consented-patients?page=1&page_size=50
```

权限：`researcher` / `admin`

#### 患者授权列表

```http
GET /v1/ehf/consents?page=1&page_size=50
```

权限：`patient`

响应包含兼容字段：

- `project_title`
- `expired_at`

#### 授权详情

```http
GET /v1/ehf/consents/{consent_id}
```

权限：`patient` / `researcher` / `admin`

---

### 2.3 Researcher Data Access

#### 查看患者授权记录列表

```http
GET /v1/ehf/research/patients/{did}/records?page=1&page_size=50
```

权限：`researcher`

约束：只能访问已授权到该研究者项目的患者数据。

#### 查看患者授权记录详情

```http
GET /v1/ehf/research/patients/{did}/records/{record_id}
```

权限：`researcher`

---

### 2.4 Health Record Review / Processing

#### 健康记录处理状态

```http
GET /v1/ehf/health-records/{record_id}/processing-status
```

权限：`patient` / `admin`

响应：

```json
{
  "id": "rec_xxx",
  "processing_status": "uploaded|processing|completed|failed",
  "processing_error": null,
  "updated_at": 1779400000
}
```

#### 管理员审核健康记录

```http
PATCH /v1/ehf/admin/health-records/{record_id}/review
```

权限：`admin`

请求：

```json
{
  "review_status": "approved",
  "review_note": "审核通过"
}
```

---

### 2.5 Admin Dashboard

#### 管理员查看授权列表

```http
GET /v1/ehf/admin/consents?page=1&page_size=50
```

#### 管理员查看项目列表

```http
GET /v1/ehf/admin/projects?page=1&page_size=50
```

#### 管理员查看健康记录列表

```http
GET /v1/ehf/admin/health-records?page=1&page_size=50&review_status=pending&patient_did=did:xxx&search=keyword
```

#### 管理员查看研究者列表

```http
GET /v1/ehf/admin/researchers?page=1&page_size=50
```

#### 管理员查看患者列表

```http
GET /v1/ehf/admin/patients?page=1&page_size=50
```

#### 审计日志

```http
GET /v1/ehf/admin/audit-logs?page=1&page_size=50
```

响应中增加前端兼容别名：

- `actor_id`
- `actor_display`
- `target_type`
- `target_id`

---

### 2.6 Researcher Dashboard

```http
GET /v1/ehf/researchers/me/summary
```

响应：

```json
{
  "project_count": 1,
  "published_project_count": 1,
  "consented_patient_count": 1,
  "pending_request_count": 0,
  "review_status": "approved"
}
```

---

## 3. P2 AI 模型管理 API（Admin）

### 3.1 创建 AI 模型

```http
POST /v1/ehf/admin/ai-models
```

权限：`admin`

请求：

```json
{
  "provider": "openai-compatible",
  "model_name": "gpt-test",
  "base_url": "https://llm.example.test/v1",
  "api_key": "[REDACTED]",
  "supports_vision": true,
  "supports_json": true,
  "is_default": true,
  "priority": 5,
  "notes": "用于病历结构化抽取"
}
```

响应：

```json
{
  "id": "aim_xxx",
  "provider": "openai-compatible",
  "model_name": "gpt-test",
  "base_url": "https://llm.example.test/v1",
  "api_key_set": true,
  "supports_vision": true,
  "supports_json": true,
  "is_default": true,
  "priority": 5,
  "is_active": true,
  "status": "active",
  "notes": "用于病历结构化抽取",
  "created_at": 1779400000,
  "updated_at": 1779400000
}
```

> 注意：`api_key` 只写入，不会在任何响应中返回明文。

### 3.2 AI 模型列表

```http
GET /v1/ehf/admin/ai-models?page=1&page_size=50
```

### 3.3 AI 模型详情

```http
GET /v1/ehf/admin/ai-models/{model_id}
```

### 3.4 更新 AI 模型

```http
PATCH /v1/ehf/admin/ai-models/{model_id}
```

可更新字段：

- `provider`
- `model_name`
- `base_url`
- `api_key`
- `supports_vision`
- `supports_json`
- `is_default`
- `is_active`
- `priority`
- `notes`

### 3.5 删除 AI 模型

```http
DELETE /v1/ehf/admin/ai-models/{model_id}
```

成功返回：`204 No Content`

---

## 4. P2 AI 任务配置 API（Admin）

### 4.1 查看任务配置

```http
GET /v1/ehf/admin/ai-task-configs
```

后端会自动初始化以下任务类型：

- `ocr_extract`
- `doc_classify`
- `structured_extract`
- `tagging`
- `summary`

### 4.2 更新任务配置

```http
PATCH /v1/ehf/admin/ai-task-configs/{config_id}
```

请求：

```json
{
  "preferred_model_id": "aim_xxx",
  "fallback_model_id": null,
  "temperature": 0.1
}
```

---

## 5. P2 健康记录处理 / OCR-LLM

> **现状（2026-05-22）**：`POST .../process` 为 **占位实现**（摘要含「占位解析」）。  
> **真实 OCR + 结构化**：见 [`EHF_AI_PROCESSING_BACKEND_REQUIREMENTS.md`](EHF_AI_PROCESSING_BACKEND_REQUIREMENTS.md)（后端开发清单）。前端已接线，无需改路径。

占位时期行为：状态置 `completed`，写入占位摘要与最小 `structured_data`；管理端 `ai_models` 配置**尚未**被 process 读取。

### 5.1 上传健康记录

```http
POST /v1/ehf/health-records/upload
Content-Type: multipart/form-data
```

权限：`patient`

表单字段：

- `file`
- `record_type`
- `record_date`：可选
- `source_organization`：可选

### 5.2 触发处理

```http
POST /v1/ehf/health-records/{record_id}/process
```

权限：`patient` / `admin`

响应关键字段：

```json
{
  "id": "rec_xxx",
  "processing_status": "completed",
  "processing_error": null,
  "doc_type": "exam_report",
  "ai_summary": "已接收并完成占位解析：report.pdf。后续可接入 OCR/LLM Worker 生成结构化摘要。",
  "structured_data": {
    "file_name": "report.pdf",
    "file_type": "application/pdf"
  },
  "tags": ["exam_report"]
}
```

### 5.3 AI 日志查询

```http
GET /v1/ehf/admin/ai-logs?record_id={record_id}&task_type=structured_extract&status=completed&page=1&page_size=50
```

权限：`admin`

响应：

```json
{
  "items": [
    {
      "id": "ailog_xxx",
      "record_id": "rec_xxx",
      "task_type": "structured_extract",
      "status": "completed",
      "duration_ms": 0,
      "error_message": null,
      "token_usage": {},
      "created_at": 1779400000
    }
  ],
  "total": 1,
  "page": 1,
  "page_size": 50,
  "total_pages": 1
}
```

---

## 6. P2 补充资料请求 API

### 6.1 创建补充资料请求

```http
POST /v1/ehf/requests
```

权限：`researcher`

前置条件：

1. 研究者账号已审核通过。
2. 患者已授权该研究者的项目。

请求：

```json
{
  "project_id": "proj_xxx",
  "patient_did": "did:ehf:cn:patient:xxx",
  "title": "请补充近期 CT 报告",
  "reason": "纳入分析需要",
  "requested_record_types": ["exam_report", "imaging"]
}
```

响应：

```json
{
  "id": "req_xxx",
  "patient_id": "pat_xxx",
  "patient_did": "did:ehf:cn:patient:xxx",
  "researcher_id": "res_xxx",
  "project_id": "proj_xxx",
  "project_title": "Request Study",
  "title": "请补充近期 CT 报告",
  "reason": "纳入分析需要",
  "requested_record_types": ["exam_report", "imaging"],
  "status": "pending",
  "response_note": null,
  "created_at": 1779400000,
  "updated_at": 1779400000,
  "fulfilled_at": null
}
```

### 6.2 请求列表

```http
GET /v1/ehf/requests?status=pending&page=1&page_size=50
```

权限：`patient` / `researcher` / `admin`

过滤规则：

- 患者只能看到自己的请求。
- 研究者只能看到自己发出的请求。
- 管理员可看到本 app 下全部请求。

### 6.3 请求详情

```http
GET /v1/ehf/requests/{request_id}
```

权限：`patient` / `researcher` / `admin`

### 6.4 更新请求状态

```http
PATCH /v1/ehf/requests/{request_id}
```

请求：

```json
{
  "status": "fulfilled",
  "response_note": "已上传报告"
}
```

状态枚举：

- `pending`
- `fulfilled`
- `cancelled`

患者端约束：患者只能把自己收到的请求更新为 `fulfilled` 或 `cancelled`。

---

## 7. 数据兼容与对原数据服务器影响

### 7.1 数据库改动方式

本次 EHF 改造使用兼容迁移方式：

- 新增 EHF 专用表和 AI/请求相关表。
- 对已有 EHF 表只追加字段。
- 不删除原表。
- 不重命名原字段。
- 不迁移/覆盖原业务数据。

新增/增强字段包括：

- `ehf_research_projects.organization_name`
- `ehf_research_projects.disease_type`
- `ehf_research_projects.required_record_types_json`
- `ehf_health_records.review_note`
- `ehf_ai_models.model_name`
- `ehf_ai_models.supports_vision`
- `ehf_ai_models.supports_json`
- `ehf_ai_models.is_default`
- `ehf_ai_models.priority`
- `ehf_ai_models.notes`
- `ehf_ai_models.is_active`
- `ehf_supplementary_requests.title`
- `ehf_supplementary_requests.reason`
- `ehf_supplementary_requests.fulfilled_at`
- `ehf_supplementary_requests.response_note`

### 7.2 对最早数据存储/API 的影响判断

当前判断：没有破坏性影响。

依据：

1. 代码层面为追加式接口和表结构扩展。
2. 原有基础接口未改路径、未删除。
3. 已运行全量测试覆盖旧接口与 EHF 新接口：`14 passed`。
4. 服务重启后 `/health` 正常。

### 7.3 建议前端注意

- EHF 新接口走 `/v1/ehf/...` 命名空间。
- 原 App Data Hub 数据接口继续按原方式调用。
- 前端不要保存或展示 AI provider 密钥明文，只展示 `api_key_set`。
- 当前 OCR/LLM 处理为占位管线，适合前端先打通流程；真实 OCR/LLM worker 后续可在不改前端主流程的情况下替换。

---

## 9. 管理员账号与安全（2026-05-22）

> **后端已实现**（`17 passed`）。前端已实现：`/admin/account`、`/forgot-password`、`/reset-password`。  
> 联调步骤与验收清单：[`ADMIN_AUTH_CHANGE_GUIDE.md`](ADMIN_AUTH_CHANGE_GUIDE.md)

### 9.1 预置管理员登录

管理端 UI 输入 `admin1` / `admin2` / `admin3` → 前端映射为 `admin1@ehf.admin` 等 → `POST /v1/ehf/auth/login`。

绑定邮箱仅更新 `profile.contact_email`，**不修改** `user.email`（登录仍用短账号 + `@ehf.admin`）。

生产环境 `POST /v1/ehf/auth/register-admin` 返回 `403`。

### 9.2 账号接口

| 方法 | 路径 | 权限 | 说明 |
|------|------|------|------|
| GET | `/v1/ehf/auth/me` | 已登录 | admin 含 `AdminProfile` |
| GET | `/v1/ehf/admin/me` | admin | 账号与安全页 |
| POST | `/v1/ehf/auth/change-password` | 已登录 | `current_password`, `new_password`（≥8） |
| POST | `/v1/ehf/auth/bind-email` | admin | `email`, `password` |
| POST | `/v1/ehf/auth/forgot-password` | 公开 | 统一成功文案，防邮箱枚举 |
| POST | `/v1/ehf/auth/reset-password` | 公开 | `token`, `new_password`；成功后 token 失效 |

---

## 10. CORS

将前端 origin **精确**加入 EHF App 白名单（无路径、无末尾 `/`）：

- `http://localhost:3000`
- `http://localhost:5173`
- 正式 / 预览域名

---

## 11. 本轮验证结果

```bash
python -m pytest tests/test_ehf_api_p2.py -q
# 2 passed

python -m pytest tests/test_ehf_api.py tests/test_ehf_api_missing.py tests/test_ehf_api_p2.py -q
# 8 passed

python -m pytest -q
# 14 passed

systemctl --user is-active app-data-hub.service
# active

curl -sS -f http://127.0.0.1:8080/health
# {"status":"ok","service":"app-data-hub","version":"0.3.0"}
```
