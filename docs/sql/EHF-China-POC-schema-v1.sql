-- EHF China POC MVP schema v1
-- PostgreSQL

create extension if not exists "pgcrypto";

create type user_role as enum ('patient', 'researcher', 'admin');
create type user_status as enum ('active', 'pending', 'disabled');
create type researcher_review_status as enum ('pending', 'approved', 'rejected');
create type project_status as enum ('draft', 'published', 'closed', 'archived');
create type consent_status as enum ('active', 'expired', 'revoked');
create type request_status as enum ('pending', 'fulfilled', 'declined', 'cancelled');
create type record_review_status as enum ('pending', 'approved', 'rejected');

create table users (
    id uuid primary key default gen_random_uuid(),
    role user_role not null,
    phone varchar(32),
    email varchar(255),
    password_hash varchar(255) not null,
    status user_status not null default 'active',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uq_users_phone unique (phone),
    constraint uq_users_email unique (email)
);

create table patient_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references users(id) on delete cascade,
    did varchar(128) not null unique,
    full_name varchar(100),
    gender varchar(20),
    birth_date date,
    region varchar(100),
    contact_phone varchar(32),
    disease_type varchar(100),
    diagnosis_date date,
    hospital_name varchar(255),
    emergency_contact_name varchar(100),
    emergency_contact_phone varchar(32),
    willing_for_research boolean not null default true,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table researcher_profiles (
    id uuid primary key default gen_random_uuid(),
    user_id uuid not null unique references users(id) on delete cascade,
    full_name varchar(100) not null,
    organization_name varchar(255) not null,
    title varchar(100),
    research_focus varchar(255),
    verification_file_url text,
    review_status researcher_review_status not null default 'pending',
    reviewed_by uuid references users(id),
    reviewed_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table health_records (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references patient_profiles(id) on delete cascade,
    record_type varchar(50) not null,
    title varchar(255) not null,
    record_date date,
    source_type varchar(50) not null default 'patient_upload',
    source_organization varchar(255),
    summary text,
    structured_data jsonb,
    file_url text not null,
    mime_type varchar(100),
    file_size bigint,
    review_status record_review_status not null default 'pending',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_health_records_patient_id on health_records(patient_id);
create index idx_health_records_record_type on health_records(record_type);

create table research_projects (
    id uuid primary key default gen_random_uuid(),
    researcher_id uuid not null references researcher_profiles(id) on delete cascade,
    title varchar(255) not null,
    disease_type varchar(100) not null,
    description text not null,
    inclusion_criteria text,
    exclusion_criteria text,
    required_record_types jsonb not null default '[]'::jsonb,
    authorization_duration_days integer not null default 180,
    contact_email varchar(255),
    status project_status not null default 'draft',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index idx_research_projects_disease_type on research_projects(disease_type);
create index idx_research_projects_status on research_projects(status);

create table consents (
    id uuid primary key default gen_random_uuid(),
    patient_id uuid not null references patient_profiles(id) on delete cascade,
    patient_did varchar(128) not null,
    project_id uuid not null references research_projects(id) on delete cascade,
    authorization_scope jsonb not null default '[]'::jsonb,
    status consent_status not null default 'active',
    consent_version varchar(20) not null default 'v1',
    allow_follow_up_contact boolean not null default false,
    authorized_at timestamptz not null default now(),
    expired_at timestamptz,
    revoked_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    constraint uq_patient_project_consent unique (patient_id, project_id)
);

create index idx_consents_project_id on consents(project_id);
create index idx_consents_status on consents(status);

create table supplementary_requests (
    id uuid primary key default gen_random_uuid(),
    project_id uuid not null references research_projects(id) on delete cascade,
    patient_id uuid not null references patient_profiles(id) on delete cascade,
    researcher_id uuid not null references researcher_profiles(id) on delete cascade,
    title varchar(255) not null,
    reason text,
    requested_record_types jsonb not null default '[]'::jsonb,
    status request_status not null default 'pending',
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create table audit_logs (
    id uuid primary key default gen_random_uuid(),
    actor_id uuid references users(id),
    actor_role user_role,
    action varchar(100) not null,
    target_type varchar(100) not null,
    target_id uuid,
    metadata jsonb,
    created_at timestamptz not null default now()
);

create index idx_audit_logs_actor_id on audit_logs(actor_id);
create index idx_audit_logs_target_type on audit_logs(target_type);
create index idx_audit_logs_created_at on audit_logs(created_at);
