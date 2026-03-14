# Mock 数据说明（v0.1-demo）

本目录存放前端演示用 mock 数据，不接数据库与 API。

## 文件职责

| 文件 | 用途 | 使用方 |
|------|------|--------|
| `auth.ts` | 登录用 mock 用户（email/password/role）、localStorage key、StoredAuth 类型 | AuthContext、登录页 |
| `patient.ts` | 患者端静态数据：MOCK_DID、MOCK_PROFILE、健康记录类型、研究项目列表、资料类型选项；类型与初始记录供 MockStore 初始化 | MockStoreContext、患者端页面 |
| `researcher.ts` | 研究者端静态数据：项目列表（含详情）、项目活动、资料类型选项；患者列表由 MockStore 动态计算 | 研究者端页面、MockStoreContext |
| `admin.ts` | 管理端静态数据：患者/研究者/项目/资料/授权/审计列表及类型；Dashboard 统计部分来自 MockStore | 管理端页面 |

## 运行时状态（MockStoreContext）

- **healthRecords**：健康记录列表（初始来自 `patient.MOCK_HEALTH_RECORDS` + patientDid），患者上传会追加。
- **consents**：授权记录列表（v0.1-demo 初始为空），患者授权研究时追加。
- 患者端、研究者端、管理端的列表与统计均从 `context/MockStoreContext` 读取，保证三端数据一致、可演示完整流程。

## 类型与常量

- 各文件导出本端用到的类型（如 `RecordType`、`MockStudy`、`AppRole` 等）。
- `patient.RECORD_TYPE_OPTIONS`、`researcher.RECORD_TYPE_OPTIONS_FOR_PROJECT` 用于表单选项。

## 版本说明

- v0.1-demo：仅内存 + localStorage 登录态，无后端；演示「患者上传 → 患者授权 → 研究者看患者 → 管理员看授权」闭环。
