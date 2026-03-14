-- Supabase v0.3: AI 配置与日志表
-- Run in Supabase SQL Editor after v0.2 health_records.

-- AI 模型配置
create table if not exists ai_models (
  id uuid primary key default gen_random_uuid(),
  provider varchar(50) not null,
  model_name varchar(100) not null,
  base_url varchar(255),
  api_key varchar(255),
  supports_vision boolean not null default false,
  supports_json boolean not null default false,
  is_default boolean not null default false,
  is_active boolean not null default true,
  priority int not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_models_is_active on ai_models(is_active);
create index if not exists idx_ai_models_priority on ai_models(priority);

-- AI 任务路由配置（task_type 固定为 ocr_extract, doc_classify, structured_extract, tagging, summary）
create table if not exists ai_task_configs (
  id uuid primary key default gen_random_uuid(),
  task_type varchar(50) not null unique,
  preferred_model_id uuid references ai_models(id) on delete set null,
  fallback_model_id uuid references ai_models(id) on delete set null,
  prompt_template text,
  timeout int not null default 60,
  max_tokens int not null default 4096,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_ai_task_configs_task_type on ai_task_configs(task_type);

-- AI 执行日志（由后续 AI 引擎写入，本阶段仅展示）
create table if not exists ai_logs (
  id uuid primary key default gen_random_uuid(),
  record_id uuid,
  task_type varchar(50) not null,
  model_name varchar(100),
  status varchar(20) not null default 'pending',
  error_message text,
  duration_ms int,
  created_at timestamptz not null default now()
);

create index if not exists idx_ai_logs_record_id on ai_logs(record_id);
create index if not exists idx_ai_logs_task_type on ai_logs(task_type);
create index if not exists idx_ai_logs_created_at on ai_logs(created_at desc);
create index if not exists idx_ai_logs_status on ai_logs(status);

-- 插入默认任务类型配置（无关联模型，后续在后台选择）
insert into ai_task_configs (task_type, prompt_template, timeout, max_tokens, is_enabled)
values
  ('ocr_extract', null, 60, 4096, true),
  ('doc_classify', null, 30, 1024, true),
  ('structured_extract', null, 60, 4096, true),
  ('tagging', null, 30, 512, true),
  ('summary', null, 60, 1024, true)
on conflict (task_type) do nothing;
