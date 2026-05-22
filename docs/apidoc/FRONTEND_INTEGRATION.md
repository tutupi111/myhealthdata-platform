# EHF 前端 · App Data Hub 接入说明

> 代码真源：`lib/api/ehfClient.ts`、`lib/api/ehfTypes.ts`、`context/AuthContext.tsx`  
> 接口详情：[`EHF_API_REFERENCE.md`](EHF_API_REFERENCE.md)

## 1. 环境变量

复制项目根目录 `.env.local.example` 为 `.env.local`：

```env
NEXT_PUBLIC_DATA_HUB_BASE_URL=https://tuutpi.online
NEXT_PUBLIC_DATA_HUB_APP_ID=your_app_id_here
NEXT_PUBLIC_DATA_HUB_API_KEY=your_api_key_here
```

- `BASE_URL`：不敏感  
- `APP_ID`：低敏感  
- `API_KEY`：会进入浏览器 bundle（`NEXT_PUBLIC_`），勿赋予超出 EHF 应用的权限；生产可考虑 BFF 代理

## 2. 请求约定

所有 EHF 请求经 `ehfFetch`：

```http
X-App-Id: <APP_ID>
X-Api-Key: <API_KEY>
Authorization: Bearer <access_token>   # 除登录/注册/找回密码等公开接口
```

Token 存 `localStorage`，键名 `ehf_access_token`（`EHF_TOKEN_KEY`）。

## 3. 角色与路由

| `ehf_role` | 登录后默认跳转 |
|------------|----------------|
| `patient` | `/patient/dashboard` |
| `researcher` | `/researcher/dashboard` |
| `admin` | `/admin/dashboard` |

- 路由守卫：`components/auth/AuthGuard.tsx`
- 管理端登录：用户输入 `admin1` 等短账号 → `lib/auth/adminAccount.ts` 映射为 `admin1@ehf.admin`
- 管理员账号安全（改密、绑邮箱、找回密码）：见 [`ADMIN_AUTH_CHANGE_GUIDE.md`](ADMIN_AUTH_CHANGE_GUIDE.md)

## 4. 常用客户端函数

| 场景 | 函数 |
|------|------|
| 登录 | `ehfLogin` |
| 刷新用户 | `ehfGetMe` |
| 患者注册 | `ehfRegisterPatient` |
| 研究者注册 | `ehfRegisterResearcher` |
| 档案列表 | `ehfListHealthRecords` |
| 上传 | `ehfUploadHealthRecord` |
| 触发处理 | `ehfProcessHealthRecord` |
| 授权 | `ehfCreateConsent` / `ehfRevokeConsent` |
| 管理员资料 / 改密 / 绑邮箱 | `ehfGetAdminProfile` / `ehfChangePassword` / `ehfBindEmail` |
| 忘记 / 重置密码 | `ehfForgotPassword` / `ehfResetPassword` |

完整列表见 `lib/api/ehfClient.ts` 导出。勿调用已移除的 `register-admin`。

## 5. 联调检查清单

- [ ] `.env.local` 三项已填，且后端已为该 App 配置 CORS（含 `http://localhost:3000`）
- [ ] `npm run dev` 后患者注册/登录成功，`/v1/ehf/auth/me` 有 profile
- [ ] 上传 PDF → 档案列表出现记录 → `process` 后状态为 `completed` 或 `failed`（见详情页 `processing_error`）
- [ ] 患者授权 → 研究者「已授权患者」可见 DID
- [ ] 管理端 `admin1` 登录（需后端 seed，见 API 参考 §9）

## 6. 安全注意

- 勿将 `.env.local`、真实 API Key、患者样例数据提交 Git
- 列表/详情接口不展示 AI `api_key` 明文，仅 `api_key_set`
- EHF 与官网 contact-events **使用不同 App 凭证**
