# EHF 数据服务器 OCR / 文档解析流水线实现说明

更新时间：2026-05-22  
项目归属：**EHF Patient Data Wallet / myhealthdata.foundation**  
服务：App Data Hub `0.3.0`

---

## 本次调整

按照“图片和文档识别尽量在数据服务器完成”的架构，后端已将健康记录处理改为：

```text
原始文件
→ 数据服务器本地文本提取/OCR
→ extracted_text 写入数据库
→ LLM 只做医学结构化
→ ai_summary / doc_type / structured_data / tags 写回
```

## 支持类型

| 类型 | 处理方式 |
|---|---|
| 图片 `image/*` | RapidOCR 本地 OCR |
| 文本 PDF | PyMuPDF 直接提取文本 |
| 扫描 PDF | PyMuPDF 渲染页面后 RapidOCR |
| DOCX | python-docx 读取段落和表格，失败时 fallback 解压 XML |
| TXT/其他文本 | UTF-8 容错读取 |

## 关键行为

1. 如果 OCR/文档解析提取到文本，先写入 `extracted_text`。
2. 再调用 `structured_extract` 绑定的 LLM 做结构化。
3. 如果 LLM 失败，但 OCR 成功，后端保留 `extracted_text`，便于前端提示“已识别文字但结构化失败”。
4. 如果模型不支持 `response_format: {type: json_object}` 并返回 400，后端会自动重试一次不带 `response_format` 的请求。
5. 如果模型支持视觉且 OCR 没提取到文本，后端仍可 fallback 发送 image_url data URL 给视觉模型。

## 依赖

已加入 `requirements.txt`：

```text
pillow>=10.0.0
pymupdf>=1.24.0
python-docx>=1.1.0
rapidocr-onnxruntime>=1.3.24
```

## 验证

```text
tests/test_ehf_ai_processing_worker.py: 4 passed
full test suite: 21 passed
health: {"status":"ok","service":"app-data-hub","version":"0.3.0"}
```

## 对当前血常规图片的验证结果

后端 OCR 已能从用户上传的血常规图片中提取文本，长度约 1000+ 字符，包含：

```text
西安市儿童医院经开院区检验科报告单
白细胞计数(WBC)
中性细胞计数
血红蛋白
血小板计数
...
```

目前若结构化仍失败，主要看 `structured_extract` 绑定的模型配置，例如模型名、base_url、API key、JSON 输出兼容性等。
