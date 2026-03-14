import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, HEALTH_FILES_BUCKET } from "@/lib/supabase/server";
import { extractText, IMAGE_UNPARSED_DOC_TYPE } from "@/lib/files/extractText";
import { runStructuredExtract } from "@/lib/ai/tasks/structuredExtract";

const MOCK_PATIENT_ID = process.env.MOCK_PATIENT_ID ?? "00000000-0000-4000-8000-000000000001";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
  "application/msword", // .doc
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // .docx
];

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

/** 从异常中提取错误码与可读信息 */
function normalizeError(err: unknown): { code: string; message: string } {
  if (err instanceof Error) {
    const code = "code" in err ? String((err as NodeJS.ErrnoException).code) : "UNKNOWN";
    const message = err.message;
    if (code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ENOTFOUND" || code === "ECONNREFUSED") {
      return {
        code: "CONNECTION_ERROR",
        message: "无法连接 Supabase（网络/TLS 错误）：" + message,
      };
    }
    return { code: code || "UNKNOWN", message };
  }
  return { code: "UNKNOWN", message: String(err) };
}

export async function POST(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const keyPresent = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url || !keyPresent) {
    return NextResponse.json(
      {
        error: "Supabase 未配置，请设置 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY",
        code: "ENV_MISSING",
      },
      { status: 503 }
    );
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      {
        error: "Supabase 客户端初始化失败",
        code: "CLIENT_INIT",
      },
      { status: 503 }
    );
  }
  const supabase = supabaseAdmin;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "请求体解析失败", code: "BAD_REQUEST" },
      { status: 400 }
    );
  }

  const file = formData.get("file");
  if (!file || !(file instanceof Blob) || !("name" in file)) {
    return NextResponse.json(
      { error: "请选择要上传的文件", code: "NO_FILE" },
      { status: 400 }
    );
  }

  const fileName = (file as File).name;
  const mimeType = (file as File).type || "application/octet-stream";
  const fileSize = (file as File).size;

  const ext = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")).toLowerCase() : "";
  const allowedByExt = [".pdf", ".doc", ".docx", ".jpg", ".jpeg", ".png"].includes(ext);
  const allowedByMime = ALLOWED_TYPES.includes(mimeType);
  const mimeUnknown = !mimeType || mimeType === "application/octet-stream";
  if (!allowedByMime && !(mimeUnknown && allowedByExt)) {
    return NextResponse.json(
      {
        error: "不支持的文件类型，仅支持图片（JPG/PNG）、Word（.doc/.docx）、PDF",
        code: "INVALID_TYPE",
      },
      { status: 400 }
    );
  }
  if (fileSize > MAX_SIZE_BYTES) {
    return NextResponse.json(
      { error: "文件大小不能超过 20MB", code: "FILE_TOO_LARGE" },
      { status: 400 }
    );
  }
  if (fileSize === 0) {
    return NextResponse.json(
      { error: "文件为空", code: "FILE_EMPTY" },
      { status: 400 }
    );
  }

  const extForName = fileName.includes(".") ? fileName.slice(fileName.lastIndexOf(".")) : "";
  const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}${extForName}`;
  const storagePath = `${MOCK_PATIENT_ID}/${safeName}`;

  let uploadError: { message: string } | null = null;
  try {
    const result = await supabase.storage
      .from(HEALTH_FILES_BUCKET)
      .upload(storagePath, file, {
        contentType: mimeType,
        upsert: false,
      });
    uploadError = result.error;
  } catch (err: unknown) {
    const { code, message } = normalizeError(err);
    console.error("Supabase storage upload exception:", err);
    return NextResponse.json(
      { error: message, code },
      { status: 502 }
    );
  }

  if (uploadError) {
    console.error("Supabase storage upload error:", uploadError);
    const isBucketError =
      uploadError.message.includes("Bucket") ||
      uploadError.message.includes("bucket") ||
      uploadError.message.includes("not found");
    return NextResponse.json(
      {
        error: isBucketError
          ? "存储桶不存在或不可用，请检查 Supabase Storage 中是否已创建 health-files 桶：" + uploadError.message
          : "文件上传失败：" + uploadError.message,
        code: isBucketError ? "BUCKET_ERROR" : "STORAGE_ERROR",
      },
      { status: 502 }
    );
  }

  const { data: urlData } = supabase.storage
    .from(HEALTH_FILES_BUCKET)
    .getPublicUrl(storagePath);
  const fileUrl = urlData.publicUrl;

  let arrayBuffer: ArrayBuffer;
  try {
    arrayBuffer = await (file as File).arrayBuffer();
  } catch (err) {
    console.error("[upload] arrayBuffer error:", err);
    return NextResponse.json(
      { error: "读取文件内容失败", code: "READ_FILE" },
      { status: 400 }
    );
  }
  const buffer = Buffer.from(arrayBuffer);

  let row: {
    id: string;
    patient_id: string;
    file_url: string;
    file_type: string;
    file_name: string;
    file_size: number | null;
    processing_status: string;
    created_at: string;
  } | null = null;
  let insertError: { message: string } | null = null;
  try {
    const result = await supabase
      .from("health_records")
      .insert({
        patient_id: MOCK_PATIENT_ID,
        file_url: fileUrl,
        file_type: mimeType,
        file_name: fileName,
        file_size: fileSize,
        processing_status: "processing",
      })
      .select("id, patient_id, file_url, file_type, file_name, file_size, processing_status, created_at")
      .single();
    row = result.data;
    insertError = result.error;
  } catch (err: unknown) {
    const { code, message } = normalizeError(err);
    console.error("health_records insert exception:", err);
    return NextResponse.json(
      { error: message, code },
      { status: 502 }
    );
  }

  if (insertError) {
    console.error("health_records insert error:", insertError);
    const isTableError =
      insertError.message.includes("relation") ||
      insertError.message.includes("does not exist") ||
      insertError.message.includes("table");
    return NextResponse.json(
      {
        error: isTableError
          ? "健康记录表不存在，请先在 Supabase 中执行建表 SQL：" + insertError.message
          : "记录写入失败：" + insertError.message,
        code: isTableError ? "TABLE_MISSING" : "DB_ERROR",
      },
      { status: 502 }
    );
  }

  if (!row) {
    return NextResponse.json(
      { error: "写入成功但未返回记录", code: "NO_RETURN" },
      { status: 502 }
    );
  }

  const recordId = row.id;

  /** 后台异步执行：extractText → 更新 health_records（不阻塞响应） */
  async function processRecordInBackground(
    id: string,
    buf: Buffer,
    mime: string,
    name: string
  ): Promise<void> {
    try {
      const extracted = await extractText(buf, mime, name);
      const textLen = (extracted.text || "").length;
      if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
        console.log("[upload:background] recordId:", id, "extracted_text length:", textLen, "isPlaceholder:", extracted.isPlaceholder, "error:", extracted.error ?? "(none)");
      }

      if (extracted.error) {
        await supabase
          .from("health_records")
          .update({
            extracted_text: "",
            processing_status: "failed",
            processing_error: extracted.error,
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
      } else if (extracted.isPlaceholder) {
        await supabase
          .from("health_records")
          .update({
            extracted_text: extracted.text,
            doc_type: IMAGE_UNPARSED_DOC_TYPE,
            ai_summary: "图片暂未解析",
            structured_data: {},
            tags: [],
            processing_status: "completed",
            updated_at: new Date().toISOString(),
          })
          .eq("id", id);
      } else {
        const result = await runStructuredExtract(extracted.text);
        if (result.ok) {
          await supabase
            .from("health_records")
            .update({
              extracted_text: extracted.text,
              doc_type: result.output.document_type,
              ai_summary: result.output.summary,
              structured_data: result.output.structured_data,
              tags: result.output.tags,
              processing_status: "completed",
              processing_error: null,
              updated_at: new Date().toISOString(),
            })
            .eq("id", id);
        } else {
          await supabase
            .from("health_records")
            .update({
              extracted_text: extracted.text,
              processing_status: "failed",
              processing_error: result.error,
              updated_at: new Date().toISOString(),
            })
            .eq("id", id);
        }
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
        console.error("[upload:background] AI processing error:", err);
      }
      await supabase
        .from("health_records")
        .update({
          processing_status: "failed",
          processing_error: msg,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id);
    }
  }

  processRecordInBackground(recordId, buffer, mimeType, fileName).catch((err) => {
    if (typeof process !== "undefined" && process.env?.NODE_ENV !== "test") {
      console.error("[upload:background] unhandled:", err);
    }
  });

  return NextResponse.json({
    ok: true,
    record: {
      id: row.id,
      patient_id: row.patient_id,
      file_url: row.file_url,
      file_type: row.file_type,
      file_name: row.file_name,
      file_size: row.file_size,
      processing_status: row.processing_status,
      created_at: row.created_at,
      extracted_text: null,
      doc_type: null,
      ai_summary: null,
      structured_data: null,
      tags: null,
      processing_error: null,
      updated_at: null,
    },
  });
}
