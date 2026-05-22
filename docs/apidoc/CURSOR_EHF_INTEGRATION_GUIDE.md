# EHF 患者数据钱包 · Cursor 前端接入指南

> 适用范围：将 `ehf-patient-data-wallet` 前端从 Mock / Supabase / 本地临时存储迁移到自托管 App Data Hub。
>
> 服务端基地址：`https://tuutpi.online`
>
> API 命名空间：`/v1/ehf/...`

## 1. 安全边界

EHF 是患者健康数据场景，**不要沿用官网 contact-events 的公开前端 key 权限模型**。当前后端使用：

- 应用级凭据：`X-App-ID` + `X-API-Key`，用于识别 EHF app/租户；
- 用户登录态：`Authorization: Bearer <access_token>`；
- EHF 业务角色：`patient` / `researcher` / `admin`；
- 研究者审核：研究者注册后默认为 `pending`，管理员批准后才能创建研究项目、访问授权患者数据；
- Consent 授权：研究者只能按患者授权的项目与 scope 访问去标识化数据；
- 审计日志：注册、授权、研究访问、上传/处理/删除等关键操作写入 `ehf_audit_logs`。

> 前端仓库不得提交任何 `.env`、API key、admin token 或真实患者数据样例。

## 2. 环境变量

Vite / React 示例：

```env
VITE_DATA_HUB_BASE_URL=https://tuutpi.online
VITE_DATA_HUB_APP_ID=替换为EHF_APP_ID
VITE_DATA_HUB_API_KEY=替换为EHF_APP_API_KEY
```

说明：

- `BASE_URL` 不敏感；
- `APP_ID` 低敏感；
- `API_KEY` 建议在 Vercel 勾选 Sensitive，但因为 `VITE_` 变量会进入浏览器 bundle，不可赋予高权限；
- 后续正式生产版建议增加 BFF/Serverless API 层，将应用级 key 留在服务端。

## 3. 前端 API Client

```ts
const BASE_URL = import.meta.env.VITE_DATA_HUB_BASE_URL;
const APP_ID = import.meta.env.VITE_DATA_HUB_APP_ID;
const API_KEY = import.meta.env.VITE_DATA_HUB_API_KEY;

export function getAccessToken() {
  return localStorage.getItem('ehf_access_token');
}

export async function ehfFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getAccessToken();
  const headers = new Headers(options.headers || {});
  headers.set('X-App-ID', APP_ID);
  headers.set('X-API-Key', API_KEY);
  if (!(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    let detail = '';
    try { detail = JSON.stringify(await res.json()); } catch { detail = await res.text(); }
    throw new Error(`API ${res.status}: ${detail}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
```

## 4. TypeScript 类型建议

```ts
export type EhfRole = 'patient' | 'researcher' | 'admin';
export type ResearcherReviewStatus = 'pending' | 'approved' | 'rejected';
export type ConsentStatus = 'active' | 'revoked';

export interface PatientProfile {
  id: string;
  user_id: string;
  did: string;
  full_name: string;
  gender?: string | null;
  birth_date?: string | null;
  disease_type?: string | null;
  diagnosis_date?: string | null;
  phone?: string | null;
  contact_email: string;
  created_at: number;
  updated_at: number;
}

export interface ResearcherProfile {
  id: string;
  user_id: string;
  full_name: string;
  organization_name: string;
  title?: string | null;
  research_focus?: string | null;
  review_status: ResearcherReviewStatus;
  created_at: number;
  updated_at: number;
}

export interface HealthRecord {
  id: string;
  patient_id: string;
  record_type?: string | null;
  title: string;
  record_date?: string | null;
  source_type: string;
  source_organization?: string | null;
  summary?: string | null;
  review_status: string;
  file_url: string;
  file_type: string;
  file_name: string;
  file_size: number;
  doc_type?: string | null;
  ai_summary?: string | null;
  structured_data: Record<string, unknown>;
  tags: string[];
  processing_status: 'uploaded' | 'completed' | 'failed' | string;
  processing_error?: string | null;
  created_at: number;
  updated_at: number;
}

export interface ResearchProject {
  id: string;
  researcher_id: string;
  title: string;
  description?: string | null;
  data_scope: string[];
  status: string;
  created_at: number;
  updated_at: number;
}

export interface Consent {
  id: string;
  patient_id: string;
  project_id: string;
  researcher_id: string;
  authorization_scope: string[];
  allow_follow_up_contact: boolean;
  status: ConsentStatus;
  created_at: number;
  updated_at: number;
  revoked_at?: number | null;
}
```

## 5. Auth 接入

### 患者注册

```ts
const result = await ehfFetch<{
  access_token: string;
  token_type: 'bearer';
  user: { id: string; email: string; ehf_role: 'patient' };
  profile: PatientProfile;
}>('/v1/ehf/auth/register-patient', {
  method: 'POST',
  body: JSON.stringify({
    email,
    password,
    full_name,
    gender,
    birth_date,
    disease_type,
    diagnosis_date,
    phone,
  }),
});
localStorage.setItem('ehf_access_token', result.access_token);
```

### 研究者注册

```ts
await ehfFetch('/v1/ehf/auth/register-researcher', {
  method: 'POST',
  body: JSON.stringify({
    email,
    password,
    full_name,
    organization_name,
    title,
    research_focus,
  }),
});
// 返回 review_status=pending，前端应提示等待管理员审核。
```

### 当前用户

```ts
const me = await ehfFetch('/v1/ehf/auth/me');
```

## 6. 患者端功能替换清单

### 患者档案

- Mock/Supabase profile → `GET /v1/ehf/patients/me`
- 更新档案 → `PATCH /v1/ehf/patients/me`
- 首页统计 → `GET /v1/ehf/patients/me/summary`

### 健康档案上传

```ts
export async function uploadHealthRecord(file: File, meta: {
  record_type?: string;
  record_date?: string;
  source_organization?: string;
}) {
  const form = new FormData();
  form.append('file', file);
  if (meta.record_type) form.append('record_type', meta.record_type);
  if (meta.record_date) form.append('record_date', meta.record_date);
  if (meta.source_organization) form.append('source_organization', meta.source_organization);

  return ehfFetch<HealthRecord>('/v1/ehf/health-records/upload', {
    method: 'POST',
    body: form,
  });
}
```

支持文件类型：PDF、JPG/JPEG、PNG、DOC、DOCX；当前单文件上限 20MB。

### 健康档案列表/处理/删除

```ts
await ehfFetch<{ items: HealthRecord[] }>('/v1/ehf/health-records?type=exam_report&page=1&page_size=20');
await ehfFetch<HealthRecord>(`/v1/ehf/health-records/${id}/process`, { method: 'POST' });
await ehfFetch<void>(`/v1/ehf/health-records/${id}`, { method: 'DELETE' });
```

`/process` 目前是占位解析：会把 `processing_status` 标成 `completed`，并写入一条 AI log。后续可替换为 OCR/LLM Worker 异步队列。

## 7. 研究项目与患者授权

### 研究者创建项目

研究者必须先被管理员批准。

```ts
await ehfFetch<ResearchProject>('/v1/ehf/projects', {
  method: 'POST',
  body: JSON.stringify({
    title: '儿童视觉功能研究',
    description: '研究说明',
    data_scope: ['exam_report', 'questionnaire'],
  }),
});
```

### 患者授权项目

```ts
await ehfFetch<Consent>('/v1/ehf/consents', {
  method: 'POST',
  body: JSON.stringify({
    project_id,
    authorization_scope: ['exam_report'],
    allow_follow_up_contact: false,
  }),
});
```

### 撤销授权

```ts
await ehfFetch<Consent>(`/v1/ehf/consents/${consentId}/revoke`, { method: 'POST' });
```

## 8. 研究者端去标识化访问

患者通过 `did` 被研究者访问，默认不返回姓名、手机号等直接身份字段。

```ts
const patientData = await ehfFetch(`/v1/ehf/research/patients/${encodeURIComponent(did)}`);
const records = await ehfFetch<{ items: HealthRecord[] }>(`/v1/ehf/research/patients/${encodeURIComponent(did)}/records`);
```

只有存在 active consent 且研究者已 approved 时才可访问；否则返回 404/403。

## 9. 管理员端

- `POST /v1/ehf/auth/register-admin`：创建 EHF 管理员；
- `GET /v1/ehf/admin/researchers`：研究者列表；
- `POST /v1/ehf/admin/researchers/{researcher_id}/approve`：批准研究者；
- `POST /v1/ehf/admin/researchers/{researcher_id}/reject`：拒绝研究者；
- `GET /v1/ehf/admin/patients`：患者列表，姓名已简单脱敏、手机号不返回；
- `GET /v1/ehf/admin/dashboard/stats`：后台统计；
- `GET /v1/ehf/admin/audit-logs`：审计日志。

## 10. 错误处理

常见状态码：

- `401`：缺少/错误 token、API key；
- `403`：角色不匹配、研究者未审核、权限不足；
- `404`：资源不存在或无权访问；
- `409`：邮箱重复、授权重复；
- `413`：文件过大；
- `415`：文件类型不支持；
- `422`：请求字段格式错误。

前端建议统一捕获 `ehfFetch` 抛出的错误，展示中文 toast。

## 11. 从 Mock/Supabase 替换建议

优先替换顺序：

1. 登录/注册：先跑通 patient / researcher / admin 三类账号；
2. 患者 profile：替换本地 mock profile；
3. 健康档案上传与列表：替换 Supabase Storage / local mock；
4. 研究者审核与项目：替换 mock projects；
5. Consent 授权：替换 mock permission/authorization；
6. 研究者去标识化访问：替换 mock research dashboard；
7. Admin dashboard/audit：替换 mock admin 数据。

## 12. 本地与 Vercel 注意事项

- 本地开发 origin：如 `http://localhost:3000` 或 `http://localhost:5173`，需要加入 App Data Hub 该 EHF app 的 CORS allowed origins；
- Vercel preview / production 域名上线后，也需要逐个加入白名单；
- CORS origin 必须精确到 scheme + host，不要带路径，不要末尾 `/`；
- 不要把 token 打到 console/log；
- 上传真实患者文件前，先用虚拟/脱敏样例跑通链路。
