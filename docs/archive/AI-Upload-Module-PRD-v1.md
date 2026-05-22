# 医疗资料上传 + AI 处理模块 · 产品需求文档 v1

**版本**：v1.0  
**基于**：EHF 患者数据钱包 v0.1-demo  
**日期**：2026-03  

---

## 一、模块目标

在现有 v0.1-demo（患者上传表单 + MockStore 写入健康档案）基础上，升级为**真实文件上传 + AI 自动处理**，实现：

1. **支持患者上传**
   - 图片（如 JPG、PNG）
   - Word（.doc / .docx）
   - PDF

2. **上传后进入处理流程**
   - 文件落盘（对象存储或本地），生成 `health_record` 草稿。
   - 触发异步处理流水线，前台可轮询或 WebSocket 获取状态。

3. **AI 自动完成**
   - **分类**：识别资料类型（门诊记录、出院小结、检查报告、影像资料、用药记录等）。
   - **结构化提取**：从正文中抽取关键字段（日期、诊断、用药、指标等）。
   - **标签生成**：为记录打标签，便于筛选与检索。
   - **摘要生成**：生成简短可读摘要，用于列表与研究者端展示。

本模块不改变现有「患者 → 授权 → 研究者 → 管理」业务流程，仅增强「上传 → 健康档案」这一段的数据来源与质量。

---

## 二、文件处理流程

整体流水线为**顺序 + 可重试**的步骤，上一步产出作为下一步输入：

| 步骤 | 说明 | 输入 | 输出 |
|------|------|------|------|
| 1. 上传 | 患者选择文件，上传至存储，创建 health_record 草稿 | 原始文件 | file_url, file_type, file_name |
| 2. 文本提取 | 从 PDF/Word 中提取纯文本；图片跳过（留给 OCR） | file_url, file_type | extracted_text（或进入 OCR） |
| 3. OCR | 对图片或 PDF 中的图像页进行文字识别 | 图片 / PDF 页 | extracted_text（追加或覆盖） |
| 4. 文档分类 | AI 判断 record_type / doc_type（门诊、出院小结、检查报告等） | extracted_text | doc_type, record_type |
| 5. 结构化提取 | 根据 doc_type 抽取结构化字段（日期、诊断、用药等） | extracted_text, doc_type | structured_data |
| 6. 标签生成 | 生成标签列表（如 #随访 #CT #用药） | extracted_text, structured_data | tags |
| 7. 摘要生成 | 生成短摘要 | extracted_text, structured_data | ai_summary |
| 8. 写入健康档案 | 更新 health_record，置 status 为已完成；若任一步失败则记录 processing_error | 上述全部 | 更新 health_records 表 |

- **processing_status** 用于标识当前处于哪一步（如 `text_extracting`、`ocr`、`classifying`、`extracting`、`tagging`、`summarizing`、`completed`、`failed`）。
- 任一步失败可写入 **processing_error**，并支持人工重试或跳过某步（如仅重跑 OCR）。

---

## 三、支持的文件类型

| 类型 | 扩展名 | 说明 |
|------|--------|------|
| 图片 | .jpg, .jpeg, .png | 需经 OCR 得到文本，再进入分类与后续步骤 |
| Word | .doc, .docx | 优先文本提取，无文字时可考虑 OCR |
| PDF | .pdf | 优先文本提取；若为扫描版或图片页则走 OCR |

- 前端上传前可做 MIME 与扩展名校验；后端建议限制单文件大小（如 20MB）与类型白名单。
- **file_type** 存 MIME 或统一枚举（如 `image/jpeg`、`application/pdf`、`application/vnd.openxmlformats-officedocument.wordprocessingml.document`），便于路由到「文本提取」或「OCR」。

---

## 四、数据结构设计：health_records 扩展字段

在现有 schema（EHF-China-POC-schema-v1）的 `health_records` 基础上，扩展以下字段，用于上传与 AI 处理：

| 字段 | 类型 | 说明 |
|------|------|------|
| file_type | varchar(100) | 文件 MIME 类型，如 image/jpeg、application/pdf |
| file_name | varchar(255) | 原始文件名（便于展示与下载） |
| extracted_text | text | 文本提取 + OCR 后的完整正文，供分类与抽取使用 |
| doc_type | varchar(50) | AI 分类得到的文档类型（可与 record_type 对齐或更细） |
| ai_summary | text | AI 生成的简短摘要 |
| structured_data | jsonb | 已有；存放结构化抽取结果（诊断、日期、用药、指标等） |
| tags | jsonb 或 text[] | 标签数组，如 ["随访","CT","用药"] |
| processing_status | varchar(50) | 处理状态：uploaded / text_extracting / ocr / classifying / extracting / tagging / summarizing / completed / failed |
| processing_error | text | 失败时的错误信息，便于排查与重试 |

- **record_type**：可继续由人工选择或由 AI 写入（与 doc_type 一致或映射）。
- **summary**：可保留人工填写，AI 完成后可写入 **ai_summary**，展示时优先 ai_summary 或与 summary 合并展示。

---

## 五、AI 任务拆分

将流水线拆成可单独配置、单独调用的 AI 任务类型，便于路由到不同模型与 prompt：

| 任务类型 | 说明 | 典型输入 | 典型输出 |
|----------|------|----------|----------|
| ocr_extract | 图片/扫描件文字识别 | 图片 URL 或 base64 | 文本 |
| doc_classify | 文档分类（门诊/出院小结/检查报告等） | extracted_text | doc_type / record_type |
| structured_extract | 按文档类型做结构化抽取 | extracted_text, doc_type | structured_data（JSON） |
| tagging | 标签生成 | extracted_text 或 structured_data | tags（数组） |
| summary | 摘要生成 | extracted_text 或 structured_data | ai_summary（短文本） |

- 每个任务类型对应**任务路由配置**（见第八节），包括 preferred_model、fallback_model、prompt_template、timeout、max_tokens 等。
- 实现时可以是独立服务（如 Node/Python  worker）或 API Route 内按步骤调用，建议**异步队列**（如 in-memory、Redis、DB 队列表）驱动，避免阻塞上传接口。

---

## 六、后台配置模块（管理端）

在现有 `/admin/*` 下新增三个子模块，用于配置 AI 模型、任务路由与查看执行日志：

| 路径 | 说明 |
|------|------|
| /admin/ai-models | AI 模型配置列表：增删改查 provider、model_name、base_url、api_key、能力开关、默认/启用、优先级、备注等 |
| /admin/ai-tasks | AI 任务路由配置：按任务类型（ocr_extract、doc_classify 等）配置 preferred_model、fallback_model、prompt_template、timeout、max_tokens 等 |
| /admin/ai-logs | AI 执行日志：按记录或按时间查看某次处理的各步骤状态、耗时、错误信息，便于排查与统计 |

- 三端导航需在管理端侧栏增加入口（如「AI 模型」「AI 任务」「AI 日志」）。
- 权限：仅 admin 角色可访问；API 需校验角色。

---

## 七、AI 模型配置

用于 **/admin/ai-models** 的配置项建议如下（可落库为 `ai_models` 表或配置 JSON）：

| 字段 | 类型 | 说明 |
|------|------|------|
| provider | varchar(50) | 提供商标识，如 openai、azure、local 等 |
| model_name | varchar(100) | 模型名称，如 gpt-4o、gpt-4o-mini、qwen-vl 等 |
| base_url | varchar(255) | API 基础 URL（可选，兼容自建或代理） |
| api_key | varchar(255) | API Key（存储需加密或环境变量引用） |
| supports_vision | boolean | 是否支持图像输入（用于 OCR 或图文理解） |
| supports_json | boolean | 是否支持 JSON 输出（用于 structured_extract） |
| is_default | boolean | 是否默认模型（同类型任务未指定时使用） |
| is_active | boolean | 是否启用 |
| priority | int | 优先级，数值越小越优先（用于多模型选主） |
| notes | text | 备注 |

- 任务路由（第八节）通过 **model_id** 或 **model_name** 引用此处配置。
- 敏感信息（api_key）建议仅后端使用，前端仅展示脱敏或「已配置」状态。

---

## 八、AI 任务路由

用于 **/admin/ai-tasks** 的配置项建议如下（可落库为 `ai_task_routes` 表）：

| 字段 | 类型 | 说明 |
|------|------|------|
| task_type | varchar(50) | 任务类型：ocr_extract、doc_classify、structured_extract、tagging、summary |
| preferred_model | varchar(100) 或 FK | 首选模型（名称或关联 ai_models.id） |
| fallback_model | varchar(100) 或 FK | 备用模型，首选失败时使用 |
| prompt_template | text | 提示词模板，可含占位符如 {{extracted_text}}、{{doc_type}} |
| timeout | int | 超时时间（秒） |
| max_tokens | int | 最大生成 token 数 |
| 其他 | — | 如 temperature、response_format 等可按需扩展 |

- 执行时根据 **task_type** 查路由，再根据 **preferred_model** 查模型配置，发起请求；失败则换 **fallback_model**。
- **prompt_template** 在运行时替换变量后传给对应模型。

---

## 九、前台界面状态

患者端「健康档案」与「上传」相关页面需展示处理进度，建议状态与展示方式如下：

| 状态 | 说明 | 前台展示建议 |
|------|------|--------------|
| 已上传 | 文件已落盘，记录已创建，待进入流水线或排队中 | 列表/详情显示「已上传」或「排队中」 |
| 处理中 | 流水线执行中（可细分到当前步骤，如「识别中」「分类中」） | 显示「处理中」+ 可选进度或步骤说明 |
| 已完成 | 所有步骤成功，health_record 已更新 | 显示「已完成」，可展示 ai_summary、tags、record_type |
| 失败 | 某步报错，已写 processing_error | 显示「处理失败」+ 简短错误提示，可选「重试」 |

- 列表页（/patient/records）每条记录需展示 **processing_status**（或映射为上述四类文案）。
- 详情页（/patient/records/[id]）可展示：extracted_text（可折叠）、doc_type、ai_summary、structured_data、tags、processing_error（若失败）。
- 上传页（/patient/upload）在提交后可将用户带到档案列表，并提示「正在处理，请稍后在档案中查看」；或提供「上传记录」列表仅显示最近上传及状态。

---

## 十、后续开发优先级

建议按以下顺序推进，在每步稳定后再做下一步：

1. **真实上传**
   - 患者端选择文件（图片/Word/PDF），上传至存储（本地或 S3 兼容）。
   - 创建 health_record 草稿（含 file_url、file_type、file_name、processing_status = uploaded）。
   - 不做 AI，仅展示「已上传」状态；可选：管理员或患者可手动填写 record_type、summary。

2. **AI Router**
   - 实现后台 **/admin/ai-models**、**/admin/ai-tasks** 的配置与存储。
   - 实现任务执行层：根据 task_type 查路由，调用对应模型（仅 mock 或简单 HTTP 调用），不要求真实解析效果。
   - 流水线驱动方式：可先同步串行调用，再改为队列 + worker。

3. **AI 解析**
   - 按第二节流程实现：文本提取（PDF/Word）→ OCR（图片/扫描 PDF）→ doc_classify → structured_extract。
   - 接入真实模型与 prompt，写入 extracted_text、doc_type、structured_data、processing_status、processing_error。
   - 前台展示「处理中」「已完成」「失败」及详情页的 AI 产出字段。

4. **标签与时间轴**
   - 实现 **tagging**、**summary** 任务，写入 **tags**、**ai_summary**。
   - 健康档案列表支持按 **tags** 筛选、排序；可选时间轴视图（按 record_date / created_at）。
   - 研究者端/管理端展示档案时展示 ai_summary、tags（若已授权或具备权限）。

---

## 附录：与 v0.1-demo 的衔接

- **患者端**：/patient/upload 从「仅表单 + MockStore」改为「表单 + 真实文件上传 + 创建带 processing_status 的记录」；/patient/records 及详情页读取真实 API/DB，并展示上述四类状态与 AI 字段。
- **数据层**：v0.1-demo 的 MockStore 仅用于未接后端的演示；本模块落地后，health_records 以数据库为准，并扩展本节所列字段；mock 数据可保留用于前端开发与联调。
- **认证与权限**：沿用现有登录与角色（patient / researcher / admin），不做变更。
- **管理端**：在现有侧栏增加「AI 模型」「AI 任务」「AI 日志」入口，对应第七、八、六节。

---

*文档结束。本文档仅作需求与设计说明，不包含具体代码实现；实现时以实际技术选型为准。*
