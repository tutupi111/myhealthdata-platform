/** EHF App Data Hub API 类型（与 docs/apidoc/EHF_API_REFERENCE.md 对齐） */

export type EhfRole = "patient" | "researcher" | "admin";

export type ResearcherReviewStatus = "pending" | "approved" | "rejected";
export type ConsentStatus = "active" | "revoked" | "expired";
export type RequestStatus = "pending" | "fulfilled" | "cancelled";

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface EhfUser {
  id: string;
  email: string;
  ehf_role: EhfRole;
  role?: string;
  display_name?: string | null;
}

export interface PatientProfile {
  id: string;
  user_id?: string;
  did: string;
  full_name: string;
  gender?: string | null;
  birth_date?: string | null;
  disease_type?: string | null;
  diagnosis_date?: string | null;
  phone?: string | null;
  contact_email?: string;
  hospital_name?: string | null;
  created_at?: number;
  updated_at?: number;
}

export interface ResearcherProfile {
  id: string;
  user_id?: string;
  full_name: string;
  organization_name: string;
  title?: string | null;
  research_focus?: string | null;
  review_status: ResearcherReviewStatus;
  created_at?: number;
  updated_at?: number;
}

export interface AdminProfile {
  id: string;
  user_id?: string;
  username?: string;
  display_name?: string | null;
  org_name?: string | null;
  contact_email?: string | null;
  email_verified?: boolean;
  created_at?: number;
  updated_at?: number;
}

export interface AuthLoginResponse {
  access_token: string;
  token_type: "bearer";
  expires_in?: number;
  user: EhfUser;
  profile?: PatientProfile | ResearcherProfile | AdminProfile | null;
}

export interface AuthMeResponse {
  user: EhfUser;
  profile: PatientProfile | ResearcherProfile | AdminProfile | null;
}

export interface PatientSummary {
  did: string;
  health_record_count: number;
  active_consent_count: number;
}

export interface HealthRecord {
  id: string;
  patient_id: string;
  record_type?: string | null;
  title: string;
  record_date?: string | null;
  source_type?: string;
  source_organization?: string | null;
  summary?: string | null;
  review_status?: string;
  file_url: string;
  file_type: string;
  file_name: string;
  file_size: number | null;
  extracted_text?: string | null;
  doc_type?: string | null;
  ai_summary?: string | null;
  structured_data?: Record<string, unknown> | null;
  tags?: string[] | null;
  processing_status: string;
  processing_error?: string | null;
  created_at: number;
  updated_at?: number | null;
}

export interface ProcessingStatus {
  id: string;
  processing_status: string;
  processing_error?: string | null;
  updated_at: number;
}

export interface ResearchProject {
  id: string;
  researcher_id: string;
  title: string;
  description?: string | null;
  organization_name?: string | null;
  disease_type?: string | null;
  required_record_types?: string[];
  data_scope: string[];
  status: string;
  consented_count?: number;
  created_at: number;
  updated_at: number;
}

export interface Consent {
  id: string;
  patient_id?: string;
  patient_did?: string;
  project_id: string;
  project_title?: string;
  researcher_id?: string;
  authorization_scope: string[];
  allow_follow_up_contact?: boolean;
  status: ConsentStatus | string;
  created_at: number;
  updated_at?: number;
  revoked_at?: number | null;
  expired_at?: number | null;
}

export interface ConsentedPatient {
  patient_did: string;
  disease_type?: string | null;
  diagnosis_date?: string | null;
  authorization_scope: string[];
  authorized_at: number;
  consent_id: string;
  record_count_in_scope?: number;
}

export interface ResearcherSummary {
  project_count: number;
  published_project_count: number;
  consented_patient_count: number;
  pending_request_count: number;
  review_status: ResearcherReviewStatus;
}

export interface AdminDashboardStats {
  patient_count: number;
  researcher_count: number;
  project_count: number;
  consent_count: number;
  health_record_count: number;
}

export interface AdminPatient {
  id: string;
  did: string;
  name_masked: string;
  disease_type?: string | null;
  status?: string;
  registered_at?: number;
  created_at?: number;
}

export interface AdminResearcher {
  id: string;
  full_name: string;
  organization_name: string;
  status?: string;
  review_status: ResearcherReviewStatus;
  registered_at?: number;
  created_at?: number;
}

export interface AuditLog {
  id: string;
  actor_id?: string | null;
  actor_role?: string | null;
  actor_display?: string | null;
  action: string;
  target_type: string;
  target_id?: string | null;
  metadata?: Record<string, unknown> | null;
  created_at: number;
}

export interface SupplementaryRequest {
  id: string;
  patient_id?: string;
  patient_did: string;
  researcher_id?: string;
  project_id: string;
  project_title?: string;
  title: string;
  reason?: string | null;
  requested_record_types: string[];
  status: RequestStatus | string;
  response_note?: string | null;
  created_at: number;
  updated_at: number;
  fulfilled_at?: number | null;
}

export type AiTaskType =
  | "ocr_extract"
  | "doc_classify"
  | "structured_extract"
  | "tagging"
  | "summary";

export interface AiModel {
  id: string;
  provider: string;
  model_name: string;
  base_url?: string | null;
  api_key_set?: boolean;
  supports_vision: boolean;
  supports_json: boolean;
  is_default: boolean;
  is_active: boolean;
  priority: number;
  notes?: string | null;
  status?: string;
  created_at: number;
  updated_at?: number;
}

export interface AiTaskConfig {
  id: string;
  task_type: AiTaskType | string;
  preferred_model_id?: string | null;
  fallback_model_id?: string | null;
  prompt_template?: string | null;
  timeout?: number;
  max_tokens?: number;
  temperature?: number | null;
  is_enabled?: boolean;
  created_at?: number;
  updated_at?: number;
  preferred_model?: AiModel | null;
  fallback_model?: AiModel | null;
}

export interface AiLog {
  id: string;
  record_id?: string | null;
  task_type: string;
  model_name?: string | null;
  status: string;
  duration_ms?: number | null;
  error_message?: string | null;
  token_usage?: Record<string, unknown> | null;
  created_at: number;
}
