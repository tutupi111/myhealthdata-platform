# EHF 管理员账号与安全 · 前端联调说明

> 代码真源：`lib/api/ehfClient.ts`、`lib/auth/adminAccount.ts`、`app/admin/account`  
> API 速查：[`EHF_API_REFERENCE.md`](EHF_API_REFERENCE.md) §9

更新时间：2026-05-22  
后端服务：App Data Hub / EHF Patient Data Wallet  
后端版本：`0.3.0`  
Base URL：生产建议 `https://tuutpi.online`；本地/内网调试为 `http://127.0.0.1:8080`

---

## 1. 本次后端变更背景

继 P0-P2 接口后，后端新增了一组 **管理员账号安全与权限控制** 相关改动：

1. 管理员不再开放自注册。
2. 系统预置 3 个管理员账号。
3. 管理员登录后会返回管理员 profile。
4. 新增管理员资料、修改密码、绑定邮箱、忘记密码、重置密码接口。
5. 管理员真实邮箱不再作为登录账号，而是作为 `contact_email` 绑定到管理员 profile。

本次变更主要影响 **管理员登录、账号安全页、找回密码页**，不影响患者端/研究者端主业务接口。

---

## 2. 前端需要修改的范围

前端需要重点检查/修改以下模块：

- 登录页 / 管理员登录页
- 管理员注册入口，如已有
- 管理员个人资料页 / 我的账号页
- 修改密码页
- 绑定邮箱页
- 忘记密码页
- 重置密码页
- 登录后角色跳转逻辑
- API 封装层中的 auth 相关接口

---

## 3. 管理员登录逻辑调整

### 3.1 管理员可见登录账号

前端页面上管理员可以继续输入短账号：

```text
admin1
admin2
admin3
```

但后端实际登录接口仍然接收 email 字段，因此前端调用接口前需要转换：

```ts
const email = username.includes('@') ? username : `${username}@ehf.admin`
```

例如：

| 前端输入 | 后端实际提交 |
|---|---|
| `admin1` | `admin1@ehf.admin` |
| `admin2` | `admin2@ehf.admin` |
| `admin3` | `admin3@ehf.admin` |

### 3.2 登录接口

```http
POST /v1/ehf/auth/login
```

Headers：

```http
X-App-Id: <app_id>
X-Api-Key: <api_key>
Content-Type: application/json
```

Request：

```json
{
  "email": "admin1@ehf.admin",
  "password": "<password>"
}
```

Response 示例：

```json
{
  "access_token": "...",
  "token_type": "bearer",
  "expires_in": 3600,
  "user": {
    "id": "usr_xxx",
    "email": "admin1@ehf.admin",
    "display_name": "Administrator 1",
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

### 3.3 前端跳转规则

登录后仍然以 `user.ehf_role` 判断角色：

```ts
switch (user.ehf_role) {
  case 'admin':
    navigate('/admin/dashboard')
    break
  case 'patient':
    navigate('/patient/dashboard')
    break
  case 'researcher':
    navigate('/researcher/dashboard')
    break
}
```

不要只根据邮箱或 username 判断角色。

---

## 4. 移除或隐藏管理员注册入口

后端现在默认禁用管理员自注册：

```http
POST /v1/ehf/auth/register-admin
```

生产环境会返回：

```json
{
  "detail": "admin self registration disabled"
}
```

前端要求：

1. 删除或隐藏“管理员注册”入口。
2. 不要再通过 `/v1/ehf/auth/register-admin` 创建管理员。
3. 如测试环境仍有旧流程，需要切换成使用预置管理员账号登录。

---

## 5. 获取当前登录用户信息

原接口仍然可用：

```http
GET /v1/ehf/auth/me
```

Headers：

```http
X-App-Id: <app_id>
X-Api-Key: <api_key>
Authorization: Bearer <access_token>
```

管理员调用时，现在也会返回管理员 profile。

Response 示例：

```json
{
  "user": {
    "id": "usr_xxx",
    "email": "admin1@ehf.admin",
    "display_name": "Administrator 1",
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

---

## 6. 新增管理员资料接口

### 6.1 获取管理员资料

```http
GET /v1/ehf/admin/me
```

权限：仅 `admin`。

Headers：

```http
X-App-Id: <app_id>
X-Api-Key: <api_key>
Authorization: Bearer <admin_access_token>
```

Response：

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

前端建议：

- 管理员个人中心 / 我的账号页使用该接口。
- 如果 `contact_email` 为空，提示管理员绑定邮箱。
- 如果 `email_verified=false`，可展示“邮箱未绑定/未验证”状态。

---

## 7. 修改密码接口

### 7.1 接口说明

```http
POST /v1/ehf/auth/change-password
```

权限：已登录用户。管理员、患者、研究者均可使用。

Headers：

```http
X-App-Id: <app_id>
X-Api-Key: <api_key>
Authorization: Bearer <access_token>
Content-Type: application/json
```

Request：

```json
{
  "current_password": "<current_password>",
  "new_password": "NewSecurePass123"
}
```

Response：

```json
{
  "message": "password updated"
}
```

错误：

| 状态码 | 场景 |
|---|---|
| `401` | 当前密码错误 |
| `422` | 新密码格式不合法，如长度不足 |

### 7.2 前端页面建议

修改密码页建议字段：

- 当前密码
- 新密码
- 确认新密码

前端校验：

- 新密码至少 8 位。
- 新密码和确认密码一致。
- 成功后提示“密码已修改”。
- 可选择让用户重新登录，也可以继续保留当前登录状态；当前后端不强制使当前 token 失效。

---

## 8. 管理员绑定真实邮箱

### 8.1 接口说明

```http
POST /v1/ehf/auth/bind-email
```

权限：仅 `admin`。

Headers：

```http
X-App-Id: <app_id>
X-Api-Key: <api_key>
Authorization: Bearer <admin_access_token>
Content-Type: application/json
```

Request：

```json
{
  "email": "real-email@example.com",
  "password": "<current_password>"
}
```

Response：

```json
{
  "message": "email bound",
  "user": {
    "id": "usr_xxx",
    "email": "admin1@ehf.admin",
    "display_name": "Administrator 1",
    "ehf_role": "admin"
  }
}
```

错误：

| 状态码 | 场景 |
|---|---|
| `401` | 当前密码错误 |
| `409` | 该邮箱已被其他管理员绑定 |
| `422` | 邮箱格式错误 |

### 8.2 重要说明

绑定邮箱只会更新管理员 profile 的：

```json
{
  "contact_email": "real-email@example.com",
  "email_verified": true
}
```

不会改变：

```json
{
  "user.email": "admin1@ehf.admin"
}
```

也就是说：

- 管理员登录仍然使用 `admin1/admin2/admin3`。
- 真实邮箱只用于找回密码。

### 8.3 前端建议

管理员首次登录后，如果 `contact_email` 为空，可以提示：

> 建议绑定邮箱，用于后续找回密码。

---

## 9. 忘记密码接口

### 9.1 发送找回密码请求

```http
POST /v1/ehf/auth/forgot-password
```

权限：无需 Bearer token。

Headers：

```http
X-App-Id: <app_id>
X-Api-Key: <api_key>
Content-Type: application/json
```

Request：

```json
{
  "email": "real-email@example.com"
}
```

Response：

```json
{
  "message": "If the email is registered, a reset link has been sent"
}
```

### 9.2 前端注意

为了防止邮箱枚举，无论邮箱是否存在，后端都会返回统一成功提示。

前端展示建议：

> 如果该邮箱已绑定管理员账号，我们会发送密码重置链接，请检查邮箱。

不要根据接口响应判断邮箱是否存在。

---

## 10. 重置密码接口

### 10.1 页面路由建议

重置密码链接格式建议：

```text
/reset-password?token=<token>&role=admin
```

前端从 URL query 中读取 token。

### 10.2 接口说明

```http
POST /v1/ehf/auth/reset-password
```

权限：无需 Bearer token。

Headers：

```http
X-App-Id: <app_id>
X-Api-Key: <api_key>
Content-Type: application/json
```

Request：

```json
{
  "token": "rst_xxx",
  "new_password": "ResetSecure123"
}
```

Response：

```json
{
  "message": "password reset"
}
```

错误：

| 状态码 | 场景 |
|---|---|
| `400` | token 无效、已使用或过期 |
| `422` | 新密码格式不合法 |

成功后：

- 重置 token 会失效。
- 后端会清除该用户旧 session。
- 前端应跳转登录页，让用户使用新密码重新登录。

---

## 11. 前端 API 封装（本仓库已实现）

请直接使用 `lib/api/ehfClient.ts`，勿重复实现 fetch：

| 函数 | 路径 |
|------|------|
| `ehfLogin` | `POST /v1/ehf/auth/login`（管理端登录前用 `normalizeLoginIdentifier` / `adminUsernameToEmail`） |
| `ehfGetMe` | `GET /v1/ehf/auth/me` |
| `ehfGetAdminProfile` | `GET /v1/ehf/admin/me` |
| `ehfChangePassword` | `POST /v1/ehf/auth/change-password` |
| `ehfBindEmail` | `POST /v1/ehf/auth/bind-email` |
| `ehfForgotPassword` | `POST /v1/ehf/auth/forgot-password` |
| `ehfResetPassword` | `POST /v1/ehf/auth/reset-password` |

类型见 `lib/api/ehfTypes.ts` → `AdminProfile`。

---

## 12. 前端验收清单

请前端完成后按以下清单自测：

### 管理员登录

- [ ] 输入 `admin1` 能正常登录。
- [ ] 前端实际提交的是 `admin1@ehf.admin`。
- [ ] 登录成功后 `user.ehf_role === 'admin'`。
- [ ] 登录成功后跳转管理员后台。
- [ ] 登录响应中能拿到 `profile.username`。

### 管理员注册

- [ ] 页面上没有管理员注册入口。
- [ ] 前端不再调用 `/v1/ehf/auth/register-admin`。

### 管理员资料

- [ ] 管理员后台能调用 `/v1/ehf/admin/me`。
- [ ] 能展示 username、display_name、org_name、contact_email。
- [ ] contact_email 为空时能提示绑定邮箱。

### 修改密码

- [ ] 当前密码错误时提示失败。
- [ ] 两次新密码不一致时前端阻止提交。
- [ ] 新密码太短时前端阻止或正确展示后端错误。
- [ ] 修改成功后可用新密码重新登录。

### 绑定邮箱

- [ ] 管理员可以绑定真实邮箱。
- [ ] 密码错误时提示失败。
- [ ] 绑定成功后刷新资料能看到 contact_email。
- [ ] 绑定真实邮箱后，管理员登录账号仍然是 `admin1/admin2/admin3`。

### 忘记/重置密码

- [ ] 忘记密码页面调用 `/v1/ehf/auth/forgot-password`。
- [ ] 页面不泄露邮箱是否存在。
- [ ] 重置密码页面能读取 URL token。
- [ ] token 无效/过期时提示重新发起找回密码。
- [ ] 重置成功后跳转登录页。

### 角色权限

- [ ] 患者仍进入患者端。
- [ ] 研究者仍进入研究者端。
- [ ] 管理员仍进入管理员后台。
- [ ] 不用邮箱后缀硬编码判断角色，而是使用 `user.ehf_role`。

---

## 13. 后端当前状态

后端已完成：

- 全量测试通过：`17 passed`
- 服务健康检查通过：`/health` 返回 `ok`
- OpenAPI 路径数：`65`
- 完整接口文档见 App Data Hub 服务端仓库中的 `APP_DATA_HUB_API_GUIDE_FULL_2026-05-22.md`（不在本前端仓库）

---

## 14. 给前端的一句话总结

后端已完成管理员账号安全改造。前端主要需要：管理员登录时将 `admin1/admin2/admin3` 转成 `admin1@ehf.admin` 等再调用 `/v1/ehf/auth/login`；移除管理员注册入口；接入 `/v1/ehf/admin/me`、`/v1/ehf/auth/change-password`、`/v1/ehf/auth/bind-email`、`/v1/ehf/auth/forgot-password`、`/v1/ehf/auth/reset-password`；登录后继续以 `user.ehf_role` 做角色跳转。