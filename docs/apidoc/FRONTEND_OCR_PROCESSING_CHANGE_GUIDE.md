# EHF 前端配合说明：数据服务器 OCR / 文档解析流水线

更新时间：2026-05-22  
项目归属：**EHF Patient Data Wallet / myhealthdata.foundation**  
后端服务：App Data Hub `0.3.0`  
Base URL：`https://tuutpi.online`

---

## 1. 背景

后端已把健康记录文件处理从“直接让 LLM 看图/读文档”调整为更稳的服务器端流水线：

```text
用户上传图片 / PDF / DOCX / TXT
        ↓
数据服务器本地解析
  - 图片：RapidOCR 本地 OCR
  - PDF：优先 PyMuPDF 直接提取文本；扫描 PDF 自动渲染页面后 OCR
  - DOCX：python-docx 解析段落和表格
  - 纯文本：直接读取
        ↓
写入 extracted_text
        ↓
调用配置的 LLM 做医学结构化 JSON
        ↓
写回 ai_summary / doc_type / structured_data / tags / processing_status
```

前端不需要自己做 OCR，也不需要把图片转 base64 给模型。

---

## 2. 前端需要保持/调整的接口调用

### 2.1 上传健康记录文件

继续使用现有接口：

```http
POST /v1/ehf/health-records/upload
Content-Type: multipart/form-data
```

请求字段：

| 字段 | 类型 | 必填 | 说明 |
|---|---:|---:|---|
| `record_type` | string | 否 | 建议传，如 `lab_report`、`exam_report` |
| `record_date` | string | 否 | `YYYY-MM-DD` |
| `source_organization` | string | 否 | 医院/机构名称 |
| `file` | file | 是 | 图片、PDF、DOCX、TXT 等 |

上传成功后返回 `processing_status = uploaded`。

### 2.2 触发服务器处理

上传后调用：

```http
POST /v1/ehf/health-records/{record_id}/process
```

前端不要在本地等待很复杂的识别流程，只需要展示 loading，然后根据返回结果渲染状态。

### 2.3 查询处理状态

如果前端希望轮询，可调用：

```http
GET /v1/ehf/health-records/{record_id}/processing-status
```

当前后端处理是同步返回，但前端建议仍按“可轮询”方式设计，为后续异步队列预留空间。

---

## 3. 前端需要展示的新/关键字段

健康记录对象中重点关注：

```ts
type HealthRecord = {
  id: string;
  file_name: string;
  file_type: string;
  processing_status: 'uploaded' | 'completed' | 'failed' | string;
  processing_error?: string | null;
  extracted_text?: string | null;
  ai_summary?: string | null;
  doc_type?: string | null;
  structured_data?: Record<string, any>;
  tags?: string[];
};
```

建议展示逻辑：

| processing_status | 前端展示 |
|---|---|
| `uploaded` | “已上传，待识别” |
| `completed` | “识别完成”并展示摘要/结构化数据 |
| `failed` | “识别失败”，展示 `processing_error`，如有 `extracted_text` 可展示“已完成 OCR，但结构化失败” |

---

## 4. 重要交互建议

### 4.1 OCR 成功但 LLM 结构化失败

后端现在即使 LLM 失败，也会尽量保留 `extracted_text`。

所以前端可区分：

```ts
if (record.processing_status === 'failed' && record.extracted_text) {
  // 展示：文字已识别，结构化失败，可稍后重试或更换模型
}
```

推荐文案：

```text
已提取到文档文字，但 AI 结构化失败。请稍后重试或联系管理员检查模型配置。
```

### 4.2 OCR 也失败

```ts
if (record.processing_status === 'failed' && !record.extracted_text) {
  // 展示：文档文字识别失败
}
```

推荐文案：

```text
未能从文件中识别到有效文字，请尝试上传更清晰的图片或 PDF。
```

### 4.3 completed 状态

`completed` 时建议展示：

1. `ai_summary`：一句话摘要；
2. `tags`：标签；
3. `structured_data`：结构化检验/检查指标；
4. 可折叠展示 `extracted_text` 作为“原始识别文字”。

---

## 5. 前端不需要做的事情

前端不需要：

- 不需要调用 OCR 服务；
- 不需要把图片转 base64；
- 不需要判断图片是否应该走视觉模型；
- 不需要区分 PDF 是文本 PDF 还是扫描 PDF；
- 不需要直接调用 Kimi/MiniMax/GPT 等模型。

这些由数据服务器负责。

---

## 6. 管理端/运营端注意事项

管理员仍需正确配置 AI 模型：

```http
POST /v1/ehf/admin/ai-models
PATCH /v1/ehf/admin/ai-task-configs/{id}
```

对于 `structured_extract` 任务：

- 可接 Kimi / MiniMax / DeepSeek / Qwen 等文本模型；
- 因后端已做 OCR，模型不一定需要视觉能力；
- 若模型不支持 `response_format: json_object`，后端会自动重试不带 `response_format` 的请求。

注意：模型名、base_url、API key 必须由管理员在后端配置，前端不保存密钥。

---

## 7. 验收用例

前端可按以下流程验收：

1. 上传血常规图片；
2. 调用 `/process`；
3. 若成功：应看到 `processing_status = completed`，且有 `ai_summary` / `structured_data`；
4. 若结构化失败：应看到 `processing_status = failed`，但可能已有 `extracted_text`；
5. 前端要把“未 OCR”和“已 OCR 但 LLM 失败”区分展示。

---

## 8. 当前已知说明

后端 OCR 已能从用户上传的血常规图片中提取到文本，例如：

```text
西安市儿童医院经开院区检验科报告单
白细胞计数(WBC)
血红蛋白
血小板计数
...
```

如果后续仍失败，优先检查：

1. `structured_extract` 绑定的模型名是否正确；
2. base_url 是否对应该模型服务；
3. API key 是否有效；
4. 模型是否支持中文医学文本结构化和 JSON 输出。
