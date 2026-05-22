一、系统整体结构（AI层）

未来系统会多出一层：

用户上传资料
        │
        ▼
文件处理层
(PDF / 图片 / Word)
        │
        ▼
AI任务路由层
(task router)
        │
        ▼
AI模型调用层
(model gateway)
        │
        ▼
结果处理层
(JSON / 标签 / 摘要)
        │
        ▼
写入健康档案

这一层就是 AI Engine。

二、后台新增模块

在管理员后台新增：

AI模型管理
AI任务配置
AI处理日志
三、AI模型管理（后台页面）

路径建议：

/admin/ai-models

页面功能：

新增模型
编辑模型
启用/禁用
设置默认模型

配置字段：

provider
model_name
base_url
api_key
supports_vision
supports_json
is_default
is_active
priority
notes

示例：

Provider	Model	Vision	JSON	Status
OpenAI	GPT-4o	✓	✓	default
Claude	Claude 3.5	✓	✓	active
Qwen	Qwen-VL	✓	✓	active
DeepSeek	DeepSeek-V3	✗	✓	active
四、AI任务配置

路径：

/admin/ai-tasks

任务类型：

ocr_extract
doc_classify
structured_extract
tagging
summary

配置字段：

task_type
preferred_model
fallback_model
prompt_template
temperature
max_tokens
timeout
is_enabled

示例：

Task	Model
OCR	GPT-4o
分类	DeepSeek
结构化提取	Claude
标签	GPT-4o
摘要	Qwen
五、AI任务路由逻辑

系统调用 AI 时，不直接写死模型，而是：

AI Router

伪逻辑：

task = "structured_extract"

model = getPreferredModel(task)

try:
    result = callModel(model)
except:
    fallback = getFallbackModel(task)
    result = callModel(fallback)
六、文档处理流程

上传后触发：

processing_status = uploaded

进入队列：

processing_status = processing

执行任务：

1 OCR / 文本提取
2 文档分类
3 结构化提取
4 标签生成
5 摘要生成

完成后：

processing_status = completed
七、数据库字段设计

health_records 表扩展：

id
patient_id

file_url
file_type
file_name

extracted_text

doc_type
ai_summary

structured_data (JSON)

tags (array)

processing_status
processing_error
created_at
八、AI输出结构建议

AI必须输出：

JSON

例如：

{
  "document_type": "lab_report",
  "hospital": "上海瑞金医院",
  "date": "2024-06-12",
  "diagnosis": ["DMD"],
  "tests": [
    {
      "name": "CK",
      "value": "12000",
      "flag": "high"
    }
  ],
  "treatments": [],
  "genes": ["DMD exon 51 deletion"],
  "tags": ["rare_disease", "genetic_test"]
}
九、AI处理日志

后台新增：

/admin/ai-logs

记录：

document_id
task_type
model
tokens
duration
status
error
created_at

这样你可以：

看成本

看失败率

重试任务

十、系统默认推荐模型

系统可以预设推荐：

OCR / Vision
→ GPT-4o / Claude Vision

分类
→ DeepSeek / Qwen

结构化提取
→ Claude

标签
→ GPT-4o

摘要
→ Qwen

但管理员可以随时切换。

十一、失败保护

如果 AI 出错：

status = failed

管理员后台可以：

重新处理

按钮：

Retry AI Processing
十二、产品界面表现

患者端：

处理中
解析完成
解析失败

研究者端：

只看到：

标签
结构化数据
摘要

不会看到 AI。

十三、开发优先级

不要一次全做。

推荐顺序：

第一阶段
AI模型配置后台

第二阶段
AI Router

第三阶段
文档解析

第四阶段
标签系统

十四、非常关键的一件事

现在你已经有：

患者端
研究者端
管理员后台
登录系统
授权流程

再加上：

AI解析

你的产品就会从：

数据收集平台

升级为：

AI医疗数据平台

这是完全不同的级别。