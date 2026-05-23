import { normalizeAdminDashboardStats } from "./normalizeAdminDashboardStats";
import type {
  AdminDashboardStats,
  AdminPatient,
  AdminProfile,
  AdminResearcher,
  AiLog,
  AiModel,
  AiTaskConfig,
  AuditLog,
  AuthLoginResponse,
  AuthMeResponse,
  Consent,
  ConsentedPatient,
  EhfRole,
  EhfUser,
  HealthRecord,
  Paginated,
  PatientProfile,
  PatientSummary,
  ProcessingStatus,
  ResearcherProfile,
  ResearcherSummary,
  ResearchProject,
  SupplementaryRequest,
} from "./ehfTypes";

export const EHF_TOKEN_KEY = "ehf_access_token";

function getBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_DATA_HUB_BASE_URL;
  if (!url) {
    throw new Error("未配置 NEXT_PUBLIC_DATA_HUB_BASE_URL，请复制 .env.local.example 为 .env.local");
  }
  return url.replace(/\/$/, "");
}

function getAppId(): string {
  const id = process.env.NEXT_PUBLIC_DATA_HUB_APP_ID;
  if (!id) throw new Error("未配置 NEXT_PUBLIC_DATA_HUB_APP_ID");
  return id;
}

function getApiKey(): string {
  const key = process.env.NEXT_PUBLIC_DATA_HUB_API_KEY;
  if (!key) throw new Error("未配置 NEXT_PUBLIC_DATA_HUB_API_KEY");
  return key;
}

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(EHF_TOKEN_KEY);
}

export function setAccessToken(token: string | null): void {
  if (typeof window === "undefined") return;
  if (token) localStorage.setItem(EHF_TOKEN_KEY, token);
  else localStorage.removeItem(EHF_TOKEN_KEY);
}

function formatApiErrorMessage(body: unknown, status: number): string {
  if (typeof body === "string" && body.trim()) return body.trim();
  if (typeof body === "object" && body !== null) {
    const o = body as Record<string, unknown>;
    if (typeof o.error === "string" && o.error) return o.error;
    if (typeof o.message === "string" && o.message) return o.message;
    if (o.detail != null) {
      if (typeof o.detail === "string") return o.detail;
      if (Array.isArray(o.detail)) {
        const parts = o.detail
          .map((item) => {
            if (typeof item === "string") return item;
            if (item && typeof item === "object" && "msg" in item) {
              return String((item as { msg: string }).msg);
            }
            return null;
          })
          .filter(Boolean);
        if (parts.length) return parts.join("；");
      }
    }
  }
  if (status === 401) {
    return "认证失败：请检查账号密码，或确认应用 API 凭证已正确配置";
  }
  return `请求失败 (${status})`;
}

export class EhfApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown
  ) {
    super(message);
    this.name = "EhfApiError";
  }
}

export async function ehfFetch<T>(
  path: string,
  options: RequestInit = {},
  auth = true
): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  headers.set("X-App-Id", getAppId());
  headers.set("X-Api-Key", getApiKey());

  if (!(options.body instanceof FormData)) {
    if (!headers.has("Content-Type")) {
      headers.set("Content-Type", "application/json");
    }
  }

  if (auth) {
    const token = getAccessToken();
    if (token) headers.set("Authorization", `Bearer ${token}`);
  }

  const res = await fetch(`${getBaseUrl()}${path}`, { ...options, headers });

  if (!res.ok) {
    let body: unknown;
    try {
      body = await res.json();
    } catch {
      body = await res.text();
    }
    throw new EhfApiError(formatApiErrorMessage(body, res.status), res.status, body);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function qs(params: Record<string, string | number | undefined | null>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== "") sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

// ── Auth ──

export async function ehfLogin(email: string, password: string): Promise<AuthLoginResponse> {
  const result = await ehfFetch<AuthLoginResponse>(
    "/v1/ehf/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
    false
  );
  setAccessToken(result.access_token);
  return result;
}

export async function ehfRegisterPatient(body: {
  email: string;
  password: string;
  full_name: string;
  gender?: string;
  birth_date?: string;
  disease_type?: string;
  diagnosis_date?: string;
  phone?: string;
}): Promise<AuthLoginResponse> {
  const result = await ehfFetch<AuthLoginResponse>(
    "/v1/ehf/auth/register-patient",
    { method: "POST", body: JSON.stringify(body) },
    false
  );
  setAccessToken(result.access_token);
  return result;
}

export async function ehfRegisterResearcher(body: {
  email: string;
  password: string;
  full_name: string;
  organization_name: string;
  title?: string;
  research_focus?: string;
}): Promise<AuthLoginResponse> {
  const result = await ehfFetch<AuthLoginResponse>(
    "/v1/ehf/auth/register-researcher",
    { method: "POST", body: JSON.stringify(body) },
    false
  );
  setAccessToken(result.access_token);
  return result;
}

export async function ehfGetMe(): Promise<AuthMeResponse> {
  return ehfFetch<AuthMeResponse>("/v1/ehf/auth/me");
}

export async function ehfGetAdminProfile(): Promise<AdminProfile> {
  return ehfFetch<AdminProfile>("/v1/ehf/admin/me");
}

export async function ehfChangePassword(body: {
  current_password: string;
  new_password: string;
}): Promise<{ message?: string }> {
  return ehfFetch("/v1/ehf/auth/change-password", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function ehfBindEmail(body: {
  email: string;
  password: string;
}): Promise<{ message?: string; user?: EhfUser }> {
  return ehfFetch("/v1/ehf/auth/bind-email", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function ehfForgotPassword(body: {
  email: string;
}): Promise<{ message?: string }> {
  return ehfFetch(
    "/v1/ehf/auth/forgot-password",
    { method: "POST", body: JSON.stringify(body) },
    false
  );
}

export async function ehfResetPassword(body: {
  token: string;
  new_password: string;
}): Promise<{ message?: string }> {
  return ehfFetch(
    "/v1/ehf/auth/reset-password",
    { method: "POST", body: JSON.stringify(body) },
    false
  );
}

// ── Patient ──

export async function ehfGetPatientProfile(): Promise<PatientProfile> {
  return ehfFetch<PatientProfile>("/v1/ehf/patients/me");
}

export async function ehfGetPatientSummary(): Promise<PatientSummary> {
  return ehfFetch<PatientSummary>("/v1/ehf/patients/me/summary");
}

export async function ehfPatchPatientProfile(
  body: Partial<Pick<PatientProfile, "full_name" | "gender" | "birth_date" | "disease_type" | "diagnosis_date" | "phone">>
): Promise<PatientProfile> {
  return ehfFetch<PatientProfile>("/v1/ehf/patients/me", {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// ── Health Records ──

export async function ehfUploadHealthRecord(
  file: File,
  meta?: { record_type?: string; record_date?: string; source_organization?: string }
): Promise<HealthRecord> {
  const form = new FormData();
  form.append("file", file);
  if (meta?.record_type) form.append("record_type", meta.record_type);
  if (meta?.record_date) form.append("record_date", meta.record_date);
  if (meta?.source_organization) form.append("source_organization", meta.source_organization);
  return ehfFetch<HealthRecord>("/v1/ehf/health-records/upload", {
    method: "POST",
    body: form,
  });
}

export async function ehfListHealthRecords(params?: {
  type?: string;
  search?: string;
  page?: number;
  page_size?: number;
}): Promise<Paginated<HealthRecord>> {
  return ehfFetch<Paginated<HealthRecord>>(
    `/v1/ehf/health-records${qs(params ?? {})}`
  );
}

export async function ehfGetHealthRecord(id: string): Promise<HealthRecord> {
  return ehfFetch<HealthRecord>(`/v1/ehf/health-records/${id}`);
}

export async function ehfProcessHealthRecord(id: string): Promise<HealthRecord> {
  return ehfFetch<HealthRecord>(`/v1/ehf/health-records/${id}/process`, {
    method: "POST",
  });
}

export async function ehfGetProcessingStatus(id: string): Promise<ProcessingStatus> {
  return ehfFetch<ProcessingStatus>(`/v1/ehf/health-records/${id}/processing-status`);
}

export async function ehfDeleteHealthRecord(id: string): Promise<void> {
  await ehfFetch<void>(`/v1/ehf/health-records/${id}`, { method: "DELETE" });
}

/** 鉴权下载：fetch blob 后打开新窗口（file_url 直连可能缺 header） */
export async function ehfOpenHealthRecordDownload(recordId: string): Promise<void> {
  const headers = new Headers();
  headers.set("X-App-Id", getAppId());
  headers.set("X-Api-Key", getApiKey());
  const token = getAccessToken();
  if (token) headers.set("Authorization", `Bearer ${token}`);

  const res = await fetch(
    `${getBaseUrl()}/v1/ehf/health-records/${recordId}/download`,
    { headers }
  );
  if (!res.ok) throw new EhfApiError("下载失败", res.status);
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  window.open(url, "_blank", "noopener,noreferrer");
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// ── Projects ──

export async function ehfListProjects(params?: {
  page?: number;
  page_size?: number;
}): Promise<Paginated<ResearchProject>> {
  return ehfFetch<Paginated<ResearchProject>>(`/v1/ehf/projects${qs(params ?? {})}`);
}

export async function ehfListMyProjects(params?: {
  page?: number;
  page_size?: number;
}): Promise<Paginated<ResearchProject>> {
  return ehfFetch<Paginated<ResearchProject>>(`/v1/ehf/projects/mine${qs(params ?? {})}`);
}

export async function ehfGetProject(id: string): Promise<ResearchProject> {
  return ehfFetch<ResearchProject>(`/v1/ehf/projects/${id}`);
}

export async function ehfCreateProject(body: {
  title: string;
  description?: string;
  data_scope?: string[];
  organization_name?: string;
  disease_type?: string;
  required_record_types?: string[];
  status?: string;
}): Promise<ResearchProject> {
  return ehfFetch<ResearchProject>("/v1/ehf/projects", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function ehfPatchProject(
  id: string,
  body: Partial<{
    title: string;
    description: string;
    data_scope: string[];
    organization_name: string;
    disease_type: string;
    required_record_types: string[];
    status: string;
  }>
): Promise<ResearchProject> {
  return ehfFetch<ResearchProject>(`/v1/ehf/projects/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function ehfListConsentedPatients(
  projectId: string,
  params?: { page?: number; page_size?: number }
): Promise<Paginated<ConsentedPatient>> {
  return ehfFetch<Paginated<ConsentedPatient>>(
    `/v1/ehf/projects/${projectId}/consented-patients${qs(params ?? {})}`
  );
}

// ── Consents ──

export async function ehfListConsents(params?: {
  page?: number;
  page_size?: number;
}): Promise<Paginated<Consent>> {
  return ehfFetch<Paginated<Consent>>(`/v1/ehf/consents${qs(params ?? {})}`);
}

export async function ehfGetConsent(id: string): Promise<Consent> {
  return ehfFetch<Consent>(`/v1/ehf/consents/${id}`);
}

export async function ehfCreateConsent(body: {
  project_id: string;
  authorization_scope: string[];
  allow_follow_up_contact?: boolean;
}): Promise<Consent> {
  return ehfFetch<Consent>("/v1/ehf/consents", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function ehfRevokeConsent(id: string): Promise<Consent> {
  return ehfFetch<Consent>(`/v1/ehf/consents/${id}/revoke`, { method: "POST" });
}

// ── Researcher ──

export async function ehfGetResearcherSummary(): Promise<ResearcherSummary> {
  return ehfFetch<ResearcherSummary>("/v1/ehf/researchers/me/summary");
}

export async function ehfGetResearchPatient(did: string): Promise<Record<string, unknown>> {
  return ehfFetch<Record<string, unknown>>(
    `/v1/ehf/research/patients/${encodeURIComponent(did)}`
  );
}

export async function ehfListResearchPatientRecords(
  did: string,
  params?: { page?: number; page_size?: number }
): Promise<Paginated<HealthRecord>> {
  return ehfFetch<Paginated<HealthRecord>>(
    `/v1/ehf/research/patients/${encodeURIComponent(did)}/records${qs(params ?? {})}`
  );
}

export async function ehfGetResearchPatientRecord(
  did: string,
  recordId: string
): Promise<HealthRecord> {
  return ehfFetch<HealthRecord>(
    `/v1/ehf/research/patients/${encodeURIComponent(did)}/records/${recordId}`
  );
}

// ── Supplementary Requests ──

export async function ehfListRequests(params?: {
  status?: string;
  page?: number;
  page_size?: number;
}): Promise<Paginated<SupplementaryRequest>> {
  return ehfFetch<Paginated<SupplementaryRequest>>(`/v1/ehf/requests${qs(params ?? {})}`);
}

export async function ehfCreateRequest(body: {
  project_id: string;
  patient_did: string;
  title: string;
  reason?: string;
  requested_record_types: string[];
}): Promise<SupplementaryRequest> {
  return ehfFetch<SupplementaryRequest>("/v1/ehf/requests", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function ehfPatchRequest(
  id: string,
  body: { status: string; response_note?: string }
): Promise<SupplementaryRequest> {
  return ehfFetch<SupplementaryRequest>(`/v1/ehf/requests/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

// ── Admin ──

export async function ehfAdminDashboardStats(): Promise<AdminDashboardStats> {
  const raw = await ehfFetch<unknown>("/v1/ehf/admin/dashboard/stats");
  return normalizeAdminDashboardStats(raw);
}

export async function ehfAdminListPatients(params?: {
  page?: number;
  page_size?: number;
}): Promise<Paginated<AdminPatient>> {
  return ehfFetch<Paginated<AdminPatient>>(`/v1/ehf/admin/patients${qs(params ?? {})}`);
}

export async function ehfAdminListResearchers(params?: {
  page?: number;
  page_size?: number;
}): Promise<Paginated<AdminResearcher>> {
  return ehfFetch<Paginated<AdminResearcher>>(`/v1/ehf/admin/researchers${qs(params ?? {})}`);
}

export async function ehfAdminApproveResearcher(id: string): Promise<unknown> {
  return ehfFetch(`/v1/ehf/admin/researchers/${id}/approve`, { method: "POST" });
}

export async function ehfAdminRejectResearcher(id: string): Promise<unknown> {
  return ehfFetch(`/v1/ehf/admin/researchers/${id}/reject`, { method: "POST" });
}

export async function ehfAdminListProjects(params?: {
  page?: number;
  page_size?: number;
}): Promise<Paginated<ResearchProject>> {
  return ehfFetch<Paginated<ResearchProject>>(`/v1/ehf/admin/projects${qs(params ?? {})}`);
}

export async function ehfAdminListConsents(params?: {
  page?: number;
  page_size?: number;
}): Promise<Paginated<Consent>> {
  return ehfFetch<Paginated<Consent>>(`/v1/ehf/admin/consents${qs(params ?? {})}`);
}

export async function ehfAdminListHealthRecords(params?: {
  page?: number;
  page_size?: number;
  review_status?: string;
  patient_did?: string;
  search?: string;
}): Promise<Paginated<HealthRecord>> {
  return ehfFetch<Paginated<HealthRecord>>(
    `/v1/ehf/admin/health-records${qs(params ?? {})}`
  );
}

export async function ehfAdminReviewHealthRecord(
  id: string,
  body: { review_status: string; review_note?: string }
): Promise<HealthRecord> {
  return ehfFetch<HealthRecord>(`/v1/ehf/admin/health-records/${id}/review`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function ehfAdminListAuditLogs(params?: {
  page?: number;
  page_size?: number;
}): Promise<Paginated<AuditLog>> {
  return ehfFetch<Paginated<AuditLog>>(`/v1/ehf/admin/audit-logs${qs(params ?? {})}`);
}

// ── Admin AI ──

export async function ehfAdminListAiModels(params?: {
  page?: number;
  page_size?: number;
}): Promise<Paginated<AiModel>> {
  return ehfFetch<Paginated<AiModel>>(`/v1/ehf/admin/ai-models${qs(params ?? {})}`);
}

export async function ehfAdminCreateAiModel(body: Record<string, unknown>): Promise<AiModel> {
  return ehfFetch<AiModel>("/v1/ehf/admin/ai-models", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function ehfAdminUpdateAiModel(
  id: string,
  body: Record<string, unknown>
): Promise<AiModel> {
  return ehfFetch<AiModel>(`/v1/ehf/admin/ai-models/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function ehfAdminDeleteAiModel(id: string): Promise<void> {
  await ehfFetch<void>(`/v1/ehf/admin/ai-models/${id}`, { method: "DELETE" });
}

export interface AiModelTestResult {
  ok: boolean;
  message: string;
  latency_ms?: number;
  model_id?: string;
}

/** 使用服务端已保存的 api_key 测试模型连通性 */
export async function ehfAdminTestAiModel(modelId: string): Promise<AiModelTestResult> {
  return ehfFetch<AiModelTestResult>(`/v1/ehf/admin/ai-models/${modelId}/test`, {
    method: "POST",
    body: JSON.stringify({}),
  });
}

/** 保存前用表单中的密钥测试（可选，需后端实现） */
export async function ehfAdminTestAiModelDraft(body: {
  provider: string;
  model_name: string;
  base_url?: string | null;
  api_key: string;
}): Promise<AiModelTestResult> {
  return ehfFetch<AiModelTestResult>("/v1/ehf/admin/ai-models/test", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

export async function ehfAdminListAiTaskConfigs(): Promise<unknown> {
  return ehfFetch<unknown>("/v1/ehf/admin/ai-task-configs");
}

export async function ehfAdminUpdateAiTaskConfig(
  id: string,
  body: Record<string, unknown>
): Promise<AiTaskConfig> {
  return ehfFetch<AiTaskConfig>(`/v1/ehf/admin/ai-task-configs/${id}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export async function ehfAdminListAiLogs(params?: {
  record_id?: string;
  task_type?: string;
  status?: string;
  page?: number;
  page_size?: number;
}): Promise<Paginated<AiLog>> {
  return ehfFetch<Paginated<AiLog>>(`/v1/ehf/admin/ai-logs${qs(params ?? {})}`);
}

export type { EhfRole, ResearcherProfile };
