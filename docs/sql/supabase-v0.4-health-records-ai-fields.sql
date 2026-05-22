-- Supabase v0.4: 扩展 health_records 表，支持 AI 解析结果与处理状态
-- 在已有 health_records（v0.2）上执行，逐列添加（IF NOT EXISTS 避免重复执行报错）

alter table health_records add column if not exists extracted_text text;
alter table health_records add column if not exists doc_type text;
alter table health_records add column if not exists ai_summary text;
alter table health_records add column if not exists structured_data jsonb;
alter table health_records add column if not exists tags text[];
alter table health_records add column if not exists processing_error text;
alter table health_records add column if not exists updated_at timestamptz default now();

-- 可选：为 doc_type、processing_status 建索引便于筛选
create index if not exists idx_health_records_doc_type on health_records(doc_type);
create index if not exists idx_health_records_processing_status on health_records(processing_status);
