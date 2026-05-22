# EHF 患者数据钱包：P0/P1/P2 前端接口对接总说明

> 更新日期：2026-05-22  
> 后端服务：App Data Hub / FastAPI / SQLite  
> 生产入口建议：`https://tuutpi.online`  
> 本机服务：`http://127.0.0.1:8080`  
> API 版本：`/v1/ehf/...`

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

---

## 2. P0/P1 已补齐接口

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

## 5. P2 健康记录处理 / OCR-LLM 占位管线

当前版本实现的是本地可测试的任务记录与状态流转。后端会把记录状态置为 `completed`，写入占位摘要、结构化字段和 AI 日志；后续可以把同一接口替换为真实 OCR/LLM worker。

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

## 8. 本轮验证结果

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
