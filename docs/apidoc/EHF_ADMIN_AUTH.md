# EHF 管理后台 · 预置账号与账号安全接口说明

**版本**：v1.0  
**日期**：2026-05-23  
**读者**：App Data Hub / Hermes 后端开发  
**前端状态**：Next.js 已实现 UI 与 API 调用（`lib/api/ehfClient.ts`、`app/admin/account`、`app/forgot-password`、`app/reset-password`）  
**Base URL**：`https://tuutpi.online`  
**命名空间**：`/v1/ehf/...`

---

## 一、背景与目标

前端已完成以下改造，**等待后端配合**：

1. **关闭管理端自助注册**：不再调用 `POST /v1/ehf/auth/register-admin`（生产环境应禁用或仅内网可用）。
2. **预置 3 个管理员账号**：`admin1` / `admin2` / `admin3`，初始密码由运维 seed，不支持前端注册。
3. **登录后账号安全**：修改密码、绑定邮箱、通过邮箱找回密码。

**统一请求头**（与现网 EHF 一致）：

```http
X-App-Id: <EHF_APP_ID>
X-Api-Key: <EHF_APP_API_KEY>
Authorization: Bearer <access_token>   # 除 login / forgot-password / reset-password 外需要
Content-Type: application/json
```

**前端联调现状（2026-05-23）**：

| 接口 | 现网探测 |
|------|----------|
| `POST /v1/ehf/auth/login`（admin1@ehf.admin） | `401`（账号未 seed） |
| `POST /v1/ehf/auth/change-password` 等 | `404`（路由未实现） |
| `OPTIONS` 上述路径 | `204`（CORS 预检已注册） |

---

## 二、管理员登录约定（P0 — 阻塞联调）

### 2.1 前端行为

管理端登录页（`/login?role=admin`）用户输入的是 **账号**（如 `admin1`），不是邮箱。

前端会将不含 `@` 的账号映射为内部 email 再调用现有 login 接口：

| 用户输入 | 实际请求 login 的 email |
|----------|-------------------------|
| `admin1` | `admin1@ehf.admin` |
| `admin2` | `admin2@ehf.admin` |
| `admin3` | `admin3@ehf.admin` |
| `user@company.com`（已含 @） | 原样发送 |

映射常量（前端代码）：`ADMIN_EMAIL_DOMAIN = "@ehf.admin"`  
见：`lib/auth/adminAccount.ts`

**后端要求**：

- 按 **email 字段** 存储/校验上述 `@ehf.admin` 账号即可，**无需新增 `username` 登录字段**。
- `POST /v1/ehf/auth/login` 请求体保持现有格式：

```json
{
  "email": "admin1@ehf.admin",
  "password": "<初始或修改后的密码>"
}
```

- 响应 `user.ehf_role` 必须为 `"admin"`。

### 2.2 预置账号 Seed（P0）

部署或迁移脚本中 **必须** 创建以下 3 个账号（一次性 seed，禁止前端注册补充）：

| 登录账号（UI） | 后端 `users.email` | 初始密码 | `ehf_role` |
|----------------|-------------------|----------|------------|
| admin1 | `admin1@ehf.admin` | `hfx81082` | admin |
| admin2 | `admin2@ehf.admin` | `hfx81082` | admin |
| admin3 | `admin3@ehf.admin` | `hfx81082` | admin |

**安全说明**：

- 初始密码仅供首次登录与 POC；上线后应强制首次登录改密。
- 密码在库中 **bcrypt/argon2 等哈希存储**，禁止明文。
- 本文档含初始密码，**勿提交到公开仓库**；生产环境由运维单独保管。

**建议扩展表字段**（若尚无 admin profile 表）：

```sql
-- 示例，字段名可平移现有 ehf 扩展表
-- ehf_admin_profiles 或扩展现有 admin 结构
-- user_id, username (admin1), display_name, org_name,
-- contact_email (nullable), email_verified (bool),
-- created_at, updated_at
```

Seed 后建议写入：

- `username`: `admin1` / `admin2` / `admin3`（与 email 前缀一致）
- `display_name`: 如 `Administrator 1`
- `contact_email`: `NULL`（待用户绑定）
- `email_verified`: `false`

### 2.3 关闭管理端注册（P0）

| 环境 | `POST /v1/ehf/auth/register-admin` |
|------|-------------------------------------|
| 生产 | **禁用**（返回 `403` 或移除路由） |
| 测试 | 可选保留，但前端已不再暴露入口 |

前端已不再调用该接口。

---

## 三、账号信息接口（P0）

### 3.1 当前用户（已有，需增强 admin profile）

#### `GET /v1/ehf/auth/me`

权限：任意已登录 EHF 用户。

**admin 登录后响应示例**（`profile` 不应为 null）：

```json
{
  "user": {
    "id": "usr_xxx",
    "email": "admin1@ehf.admin",
    "ehf_role": "admin"
  },
  "profile": {
    "id": "adm_xxx",
    "user_id": "usr_xxx",
    "username": "admin1",
    "display_name": "Administrator 1",
    "org_name": "EHF Admin",
    "contact_email": null,
    "email_verified": false,
    "created_at": 1779400000,
    "updated_at": 1779400000
  }
}
```

**字段说明**：

| 字段 | 说明 |
|------|------|
| `user.email` | 内部登录标识，预置账号为 `{username}@ehf.admin`；绑定邮箱后 **可保持不变**（推荐） |
| `profile.username` | 展示用短账号，如 `admin1` |
| `profile.contact_email` | 用户绑定的真实邮箱，用于找回密码；未绑定时 `null` |
| `profile.email_verified` | 绑定邮箱是否已验证 |

### 3.2 管理员详情（P0）

#### `GET /v1/ehf/admin/me`

权限：`admin`

响应体：与上一节 `profile`（`AdminProfile`）相同；也可与 `/auth/me` 合并，但前端 **已调用** 此路径。

```json
{
  "id": "adm_xxx",
  "user_id": "usr_xxx",
  "username": "admin1",
  "display_name": "Administrator 1",
  "org_name": "EHF Admin",
  "contact_email": null,
  "email_verified": false,
  "created_at": 1779400000,
  "updated_at": 1779400000
}
```

---

## 四、修改密码（P0）

### `POST /v1/ehf/auth/change-password`

权限：已登录用户（admin / patient / researcher 均可复用；前端当前仅在管理端账号页调用）。

**Request**

```json
{
  "current_password": "hfx81082",
  "new_password": "NewSecurePass123"
}
```

**Response `200`**

```json
{
  "message": "password updated"
}
```

**校验**：

- `current_password` 错误 → `401`
- `new_password` 长度 ≥ 8 → 否则 `422`
- 成功后 **立即生效**；旧 token 可保留或强制失效（二选一，请在 `EHF_API.md` 写明）

**审计**：写入 `ehf_audit_logs`，action 如 `admin.password_changed`。

---

## 五、绑定邮箱（P0）

### `POST /v1/ehf/auth/bind-email`

权限：已登录 **admin**（后续可扩展其他角色）。

**Request**

```json
{
  "email": "ops@hospital.example.com",
  "password": "当前登录密码"
}
```

**Response `200`**

```json
{
  "message": "email bound",
  "user": {
    "id": "usr_xxx",
    "email": "admin1@ehf.admin",
    "ehf_role": "admin"
  }
}
```

**业务规则**：

1. `password` 用于确认身份，错误 → `401`。
2. `email` 须为合法邮箱且未被其他账号占用 → 冲突 `409`。
3. 写入 `profile.contact_email`；**不要**把 `users.email` 改成绑定邮箱（否则破坏 `admin1@ehf.admin` 登录映射）。  
   - 绑定后登录仍使用 `admin1` + 密码（前端映射为 `admin1@ehf.admin`）。  
   - 可选增强：同时允许用 `contact_email` + 密码登录（非必须）。
4. 建议发送验证邮件；验证成功后 `email_verified = true`。POC 阶段可跳过验证，直接置 `true`。

**审计**：`admin.email_bound`。

---

## 六、忘记密码 / 重置密码（P0）

仅支持 **已绑定 `contact_email` 的管理员**（未绑定则无法自助找回，需运维重置）。

### 6.1 发起重置

#### `POST /v1/ehf/auth/forgot-password`

权限：**无需** Bearer token（前端 `ehfFetch(..., auth=false)`）。

**Request**

```json
{
  "email": "ops@hospital.example.com"
}
```

**Response `200`**（无论邮箱是否存在，统一返回，防枚举）：

```json
{
  "message": "If the email is registered, a reset link has been sent"
}
```

**后端逻辑**：

1. 查找 `contact_email = email` 且 `ehf_role = admin` 的账号。
2. 生成一次性 token（随机、哈希存库、过期时间建议 30–60 分钟）。
3. 发送邮件，链接格式：

```
{FRONTEND_BASE_URL}/reset-password?token={RAW_TOKEN}&role=admin
```

示例：

```
https://your-frontend.example.com/reset-password?token=abc123...&role=admin
```

`FRONTEND_BASE_URL` 由运维配置（本地：`http://localhost:3000`）。

### 6.2 提交新密码

#### `POST /v1/ehf/auth/reset-password`

权限：无需 Bearer token。

**Request**

```json
{
  "token": "邮件中的 raw token",
  "new_password": "NewSecurePass123"
}
```

**Response `200`**

```json
{
  "message": "password reset"
}
```

**错误**：

- token 无效或过期 → `400` 或 `404`
- `new_password` 不合规 → `422`

成功后使 token 失效；可选使该用户所有旧 session 失效。

**审计**：`admin.password_reset`.

---

## 七、与现有接口的关系

| 接口 | 变更 |
|------|------|
| `POST /v1/ehf/auth/login` | 无路径变更；需能校验 seed 的 `@ehf.admin` 账号 |
| `POST /v1/ehf/auth/register-admin` | 生产 **禁用** |
| `GET /v1/ehf/auth/me` | admin 返回 `AdminProfile` |
| 新增 5 个路由 | 见第三～六节 |

**CORS**：除现有 origin 外，确保上述新路由同样允许 `OPTIONS` 与跨域 POST。

---

## 八、邮件服务（P0 依赖）

若 App Data Hub 尚无 SMTP / 邮件 API，需至少满足：

- 模板：重置密码（含 `{reset_link}`、`{username}`、过期时间）
- 发件人：可识别为 EHF 管理后台
- 失败日志：不向前端暴露 SMTP 细节

POC 临时方案（仅开发环境）：将 reset link 打日志到服务端，人工复制到浏览器。**生产禁止使用。**

---

## 九、验收清单

后端完成后，请按序自测：

- [ ] Seed：`admin1@ehf.admin` / `admin2@ehf.admin` / `admin3@ehf.admin`，密码 `hfx81082`，`ehf_role=admin`
- [ ] `POST /v1/ehf/auth/login` 使用上述 email + 密码 → `200` + token
- [ ] 前端管理端输入 `admin1` + 密码 → 登录成功
- [ ] `GET /v1/ehf/auth/me`、`GET /v1/ehf/admin/me` → 返回 `AdminProfile`
- [ ] `POST /v1/ehf/auth/change-password` → 新密码可登录，旧密码不可
- [ ] `POST /v1/ehf/auth/bind-email` → `contact_email` 更新
- [ ] `POST /v1/ehf/auth/forgot-password`（已绑定邮箱）→ 收到邮件 / 开发环境日志含 reset link
- [ ] 打开 reset link → `POST /v1/ehf/auth/reset-password` → 新密码可登录
- [ ] `POST /v1/ehf/auth/register-admin` 生产返回 `403`
- [ ] 关键操作写入 `ehf_audit_logs`

**前端联调路径**：

| 页面 | 路径 |
|------|------|
| 管理端登录 | `/login?role=admin` |
| 账号与安全 | `/admin/account` |
| 忘记密码 | `/forgot-password?role=admin` |
| 重置密码 | `/reset-password?token=...&role=admin` |

---

## 十、前端 API 封装对照

供后端核对路径与字段名（已与实现对齐）：

| 前端函数 | Method | Path |
|----------|--------|------|
| `ehfLogin` | POST | `/v1/ehf/auth/login` |
| `ehfGetMe` | GET | `/v1/ehf/auth/me` |
| `ehfGetAdminProfile` | GET | `/v1/ehf/admin/me` |
| `ehfChangePassword` | POST | `/v1/ehf/auth/change-password` |
| `ehfBindEmail` | POST | `/v1/ehf/auth/bind-email` |
| `ehfForgotPassword` | POST | `/v1/ehf/auth/forgot-password` |
| `ehfResetPassword` | POST | `/v1/ehf/auth/reset-password` |

TypeScript 类型：`lib/api/ehfTypes.ts` → `AdminProfile`

---

## 十一、排期建议

| 优先级 | 内容 | 预估 |
|--------|------|------|
| **P0** | Seed 三账号 + login 可通 + 禁用 register-admin | 0.5d |
| **P0** | `/admin/me` + `/auth/me` admin profile | 0.5d |
| **P0** | change-password + bind-email | 1d |
| **P0** | forgot-password + reset-password + 邮件 | 1–2d |

完成后请同步更新 `EHF_API.md` 或在 `EHF_FRONTEND_API_GUIDE` 中追加本节链接。

---

**文档维护**：接口或 seed 策略变更时，请更新版本号并通知前端（本仓库 `lib/auth/adminAccount.ts` 域名常量需与后端一致）。
