# Supabase v0.2 配置说明

v0.2 使用 Supabase 作为文件存储与健康记录表存储。按以下步骤配置后，患者端上传与档案列表将使用真实数据。

## 1. 创建项目

在 [Supabase Dashboard](https://supabase.com/dashboard) 创建新项目，记下：

- **Project URL**（如 `https://xxxx.supabase.co`）
- **Service Role Key**（Project Settings → API → `service_role`，仅服务端使用，勿暴露到前端）

## 2. 创建表

在 Supabase SQL Editor 中执行：

- 文件：`docs/supabase-v0.2-health-records.sql`

或直接执行：

```sql
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
```

## 3. 创建 Storage 桶

1. 进入 **Storage** → **New bucket**
2. 名称：`health-files`
3. 建议勾选 **Public bucket**，以便上传后通过 `getPublicUrl()` 得到的链接可直接访问文件。若使用私有桶，后续需改为使用签名 URL。

## 4. 环境变量

复制 `.env.local.example` 为 `.env.local`，填写：

```env
NEXT_PUBLIC_SUPABASE_URL=https://你的项目.supabase.co
SUPABASE_SERVICE_ROLE_KEY=你的 service_role key
MOCK_PATIENT_ID=00000000-0000-4000-8000-000000000001
```

- `MOCK_PATIENT_ID`：v0.2 无真实登录，所有上传与查询使用该 UUID 作为患者标识；后续接入真实鉴权后可改为从 session 读取。

## 5. 验证

1. 启动应用：`npm run dev`
2. 患者端登录后进入「上传资料」，选择一张图片或 PDF 上传
3. 在「健康档案」中应看到新记录，且 Supabase Dashboard → Table Editor → `health_records` 中有对应行，Storage → `health-files` 中有文件

## 未配置时行为

若未设置 `NEXT_PUBLIC_SUPABASE_URL` 或 `SUPABASE_SERVICE_ROLE_KEY`：

- `POST /api/upload` 返回 503，提示 Supabase 未配置
- `GET /api/health-records` 返回 503
- 患者端档案列表会显示「加载失败」或「暂无记录」
