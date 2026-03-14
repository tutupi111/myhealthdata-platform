/** 健康记录（v0.2/v0.4，对应 Supabase health_records 表） */
export interface ApiHealthRecord {
  id: string;
  patient_id: string;
  file_url: string;
  file_type: string;
  file_name: string;
  file_size: number | null;
  processing_status: string;
  created_at: string;
  /** v0.4 AI 解析 */
  extracted_text?: string | null;
  doc_type?: string | null;
  ai_summary?: string | null;
  structured_data?: Record<string, unknown> | null;
  tags?: string[] | null;
  processing_error?: string | null;
  updated_at?: string | null;
}
