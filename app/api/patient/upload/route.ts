import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin, HEALTH_FILES_BUCKET } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MOCK_PATIENT_ID = process.env.MOCK_PATIENT_ID ?? "00000000-0000-4000-8000-000000000001";

const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20MB

function normalizeError(err: unknown): { code: string; message: string } {
  if (err instanceof Error) {
    const code = "code" in err ? String((err as NodeJS.ErrnoException).code) : "UNKNOWN";
    const message = err.message;
    if (code === "ECONNRESET" || code === "ETIMEDOUT" || code === "ENOTFOUND" || code === "ECONNREFUSED") {
      return { code: "CONNECTION_ERROR", message: "无法连接 Supabase：" + message };
    }
    return { code: code || "UNKNOWN", message };
  }
  return { code: "UNKNOWN", message: String(err) };
}

/**
 * 仅上传并创建 record，不执行 OCR/AI。
 * 返回 record id，解析由 POST /api/patient/records/[id]/process 负责。
 */
export async function POST(request: NextRequest) {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return NextResponse.json(
      { error: "Supabase 未配置", code: "ENV_MISSING" },
      { status: 503 }
    );
  }

  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase 客户端初始化失败", code: "CLIENT_INIT" },
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
      { error: "不支持的文件类型，仅支持图片（JPG/PNG）、Word、PDF", code: "INVALID_TYPE" },
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

  try {
    const uploadResult = await supabase.storage
      .from(HEALTH_FILES_BUCKET)
      .upload(storagePath, file, { contentType: mimeType, upsert: false });

    if (uploadResult.error) {
      console.error("Supabase storage upload error:", uploadResult.error);
      const isBucket = /bucket|not found/i.test(uploadResult.error.message);
      return NextResponse.json(
        {
          error: isBucket
            ? "存储桶不存在或不可用：" + uploadResult.error.message
            : "文件上传失败：" + uploadResult.error.message,
          code: isBucket ? "BUCKET_ERROR" : "STORAGE_ERROR",
        },
        { status: 502 }
      );
    }
  } catch (err: unknown) {
    const { code, message } = normalizeError(err);
    console.error("Storage upload exception:", err);
    return NextResponse.json({ error: message, code }, { status: 502 });
  }

  const { data: urlData } = supabase.storage
    .from(HEALTH_FILES_BUCKET)
    .getPublicUrl(storagePath);
  const fileUrl = urlData.publicUrl;

  const insertResult = await supabase
    .from("health_records")
    .insert({
      patient_id: MOCK_PATIENT_ID,
      file_url: fileUrl,
      file_type: mimeType,
      file_name: fileName,
      file_size: fileSize,
      processing_status: "uploaded",
    })
    .select("id, patient_id, file_url, file_type, file_name, file_size, processing_status, created_at")
    .single();

  if (insertResult.error) {
    console.error("health_records insert error:", insertResult.error);
    const isTable = /relation|does not exist|table/i.test(insertResult.error.message);
    return NextResponse.json(
      {
        error: isTable
          ? "健康记录表不存在，请先执行建表 SQL：" + insertResult.error.message
          : "记录写入失败：" + insertResult.error.message,
        code: isTable ? "TABLE_MISSING" : "DB_ERROR",
      },
      { status: 502 }
    );
  }

  const row = insertResult.data;
  if (!row) {
    return NextResponse.json(
      { error: "写入成功但未返回记录", code: "NO_RETURN" },
      { status: 502 }
    );
  }

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
    },
  });
}
