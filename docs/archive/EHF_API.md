# EHF 患者数据钱包 API 说明

Base URL: `https://tuutpi.online`

Headers:

```http
X-App-ID: <EHF_APP_ID>
X-API-Key: <EHF_APP_API_KEY>
Authorization: Bearer <access_token>   # 除注册接口外需要
Content-Type: application/json         # 文件上传使用 multipart/form-data
```

## 数据模型概览

后端新增 SQLite 表：

- `ehf_user_roles`：用户到 EHF 角色映射；
- `ehf_patient_profiles`：患者档案与 DID；
- `ehf_researcher_profiles`：研究者档案与审核状态；
- `ehf_health_records`：健康档案文件记录、AI 处理状态与结构化字段；
- `ehf_research_projects`：研究项目；
- `ehf_consents`：患者对研究项目的数据授权；
- `ehf_supplementary_requests`：补充资料请求预留表；
- `ehf_audit_logs`：审计日志；
- `ehf_ai_models` / `ehf_ai_task_configs` / `ehf_ai_logs`：AI 模型配置与任务日志预留表。

## 1. Auth

### POST `/v1/ehf/auth/register-patient`

创建患者账号、患者档案、DID，并返回 access token。

Request:

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

Response `201`:

```json
{
  "access_token": "...",
  "token_type": "bearer",
  "user": { "id": "usr_...", "email": "patient@example.com", "ehf_role": "patient" },
  "profile": { "id": "pat_...", "did": "did:ehf:cn:patient:...", "full_name": "Patient One" }
}
```

### POST `/v1/ehf/auth/register-researcher`

创建研究者账号，默认 `review_status=pending`。

### POST `/v1/ehf/auth/register-admin`

创建 EHF 管理员账号。请求结构沿用 App Data Hub admin 注册：

```json
{ "email": "admin@example.com", "password": "Admin12345", "display_name": "Admin", "org_name": "EHF Admin" }
```

### GET `/v1/ehf/auth/me`

返回当前用户及其 EHF profile。

## 2. 患者接口

### GET `/v1/ehf/patients/me`

患者获取自己的档案。

### PATCH `/v1/ehf/patients/me`

可更新字段：`full_name`, `gender`, `birth_date`, `disease_type`, `diagnosis_date`, `phone`。

### GET `/v1/ehf/patients/me/summary`

返回患者 DID、健康档案数量、活跃授权数量。

## 3. 健康档案

### POST `/v1/ehf/health-records/upload`

患者上传健康档案文件。

Request: `multipart/form-data`

Fields:

- `file`: PDF/JPG/PNG/DOC/DOCX，最大 20MB；
- `record_type`: 可选，如 `exam_report`；
- `record_date`: 可选，如 `2026-05-21`；
- `source_organization`: 可选。

Response `201`: `HealthRecord`。

### GET `/v1/ehf/health-records`

查询患者自己的健康档案。

Query:

- `type`: 可选，按 record_type 过滤；
- `search`: 可选，搜索 title/file_name/summary/ai_summary；
- `page`: 默认 1；
- `page_size`: 默认 50，最大 200。

### GET `/v1/ehf/health-records/{record_id}`

患者或管理员查看健康档案元数据。

### GET `/v1/ehf/health-records/{record_id}/download`

患者、管理员，或已获 consent 的 approved 研究者下载文件。

### PATCH `/v1/ehf/health-records/{record_id}`

患者更新记录元数据：`record_type`, `title`, `record_date`, `source_organization`, `summary`。

### POST `/v1/ehf/health-records/{record_id}/process`

触发健康档案处理。当前为 MVP 占位处理：更新 `processing_status=completed`，写入 `ai_summary` 和 `ehf_ai_logs`。后续可替换为 OCR/LLM Worker 异步任务。

### DELETE `/v1/ehf/health-records/{record_id}`

患者删除自己的健康档案和本地文件。

## 4. 研究项目

### POST `/v1/ehf/projects`

已批准研究者创建研究项目。

Request:

```json
{
  "title": "Vision Study",
  "description": "demo",
  "data_scope": ["exam_report", "questionnaire"]
}
```

### GET `/v1/ehf/projects`

所有 EHF 登录用户可查看 published 项目列表。

### GET `/v1/ehf/projects/mine`

研究者查看自己创建的项目。

### GET `/v1/ehf/projects/{project_id}`

查看项目详情。

### PATCH `/v1/ehf/projects/{project_id}`

项目创建者更新项目。支持：`title`, `description`, `data_scope`, `status`。

## 5. Consent 授权

### POST `/v1/ehf/consents`

患者授权某研究项目访问指定数据 scope。

Request:

```json
{
  "project_id": "prj_...",
  "authorization_scope": ["exam_report"],
  "allow_follow_up_contact": false
}
```

### GET `/v1/ehf/consents`

患者查看自己的授权列表。

### POST `/v1/ehf/consents/{consent_id}/revoke`

患者撤销授权。

## 6. 研究者去标识化访问

### GET `/v1/ehf/research/patients/{did}`

已批准且已获得 active consent 的研究者可通过患者 DID 读取去标识化概要。

不会返回姓名、手机号、邮箱等直接身份字段。

### GET `/v1/ehf/research/patients/{did}/records`

返回授权 scope 范围内的健康档案元数据。默认不返回 `extracted_text`。

## 7. 管理员

### GET `/v1/ehf/admin/researchers`

研究者列表。

### POST `/v1/ehf/admin/researchers/{researcher_id}/approve`

批准研究者。

### POST `/v1/ehf/admin/researchers/{researcher_id}/reject`

拒绝研究者。

### GET `/v1/ehf/admin/patients`

患者列表。返回数据已做基础脱敏：姓名仅首字+`***`，手机号不返回。

### GET `/v1/ehf/admin/dashboard/stats`

返回患者、研究者、项目、授权、健康档案数量。

### GET `/v1/ehf/admin/audit-logs`

分页查看审计日志。

Query: `page`, `page_size`。

## 8. CORS

EHF app 需要将真实前端 origin 加入 App Data Hub allowed origins，例如：

- `http://localhost:3000`
- `http://localhost:5173`
- `https://<vercel-preview>.vercel.app`
- 未来正式域名

Origin 需精确匹配 scheme + host，不带路径、不带末尾 `/`。

## 9. 测试状态

新增测试文件：`tests/test_ehf_api.py`，覆盖：

- 患者注册、profile、summary、CORS preflight；
- 研究者注册、管理员审批、项目创建、患者授权、去标识化访问、审计日志；
- 健康档案上传、列表、下载、占位处理、删除。

验证命令：

```bash
pytest -q
python -m compileall app
```
