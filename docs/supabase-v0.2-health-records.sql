-- Supabase v0.2: health_records (upload-only, no FK to patient_profiles).
-- Run in Supabase SQL Editor. Then create bucket "health-files" in Storage and set public or use signed URLs.

create table if not exists health_records (
  id uuid primary key default gen_random_uuid(),
  patient_id uuid not null,
  file_url text not null,
  file_type varchar(100) not null,
  file_name varchar(255) not null,
  file_size bigint,
  processing_status varchar(50) not null default 'uploaded',
  created_at timestamptz not null default now()
);

create index if not exists idx_health_records_patient_id on health_records(patient_id);
create index if not exists idx_health_records_created_at on health_records(created_at desc);

-- Storage: create bucket "health-files" in Dashboard → Storage → New bucket.
-- Option A: make bucket public for simple file_url access (get public URL after upload).
-- Option B: keep private and use signed URLs when serving (requires getSignedUrl in app).
