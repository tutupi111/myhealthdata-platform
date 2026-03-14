import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";
import { extractText, IMAGE_UNPARSED_DOC_TYPE } from "@/lib/files/extractText";
import { runStructuredExtract } from "@/lib/ai/tasks/structuredExtract";

export const dynamic = "force-dynamic";

/**
 * 后台解析：先原子认领（uploaded -> processing），认领成功后才执行 extractText / OCR / AI，最后回写 completed 或 failed。
 * 同一条记录不会被重复处理：completed/failed 直接返回；processing 返回 skipped。
 */
export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { ok: false, error: "Supabase 未配置", processing_status: "failed" },
      { status: 503 }
    );
  }

  const supabase = supabaseAdmin;
  const params = await context.params;
  const id = params.id;
  if (!id) {
    return NextResponse.json(
      { ok: false, error: "缺少记录 id", processing_status: null },
      { status: 400 }
    );
  }

  console.log("[process api start]", { id });

  let record: {
    id: string;
    patient_id?: string;
    file_url: string;
    file_type: string;
    file_name: string;
    processing_status: string;
  } | null = null;

  try {
    const { data, error } = await supabase
      .from("health_records")
      .select("id, patient_id, file_url, file_type, file_name, processing_status")
      .eq("id", id)
      .maybeSingle();

    if (error) {
      console.error("[process] select error:", error);
      return NextResponse.json(
        { ok: false, error: "获取记录失败", processing_status: null },
        { status: 502 }
      );
    }
    record = data;
  } catch (e) {
    console.error("[process] select exception:", e);
    return NextResponse.json(
      { ok: false, error: String(e instanceof Error ? e.message : e), processing_status: null },
      { status: 502 }
    );
  }

  if (!record) {
    return NextResponse.json(
      { ok: false, error: "记录不存在", processing_status: null },
      { status: 404 }
    );
  }

  console.log("[process current status]", {
    id,
    processing_status: record.processing_status,
  });

  if (record.processing_status === "completed" || record.processing_status === "failed") {
    const { data: fullRow } = await supabase
      .from("health_records")
      .select("*")
      .eq("id", id)
      .single();
    console.log("[process api completed]", { id, status: record.processing_status });
    return NextResponse.json({
      ok: true,
      status: record.processing_status,
      record: fullRow ?? record,
    });
  }

  if (record.processing_status === "processing") {
    console.log("[process skipped]", { id, reason: "already processing" });
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "already processing",
      status: "processing",
      record,
    });
  }

  // 仅当 uploaded 时认领：uploaded -> processing
  const claimPayload = {
    processing_status: "processing",
    processing_error: null,
    updated_at: new Date().toISOString(),
  };
  const { data: updatedRows, error: updateError } = await supabase
    .from("health_records")
    .update(claimPayload)
    .eq("id", id)
    .eq("processing_status", "uploaded")
    .select();

  console.log("[process claim result]", {
    id,
    updateError: updateError?.message ?? null,
    updatedRowsCount: updatedRows?.length ?? 0,
    updatedRows,
  });

  if (updateError) {
    console.error("[process] claim update error:", updateError);
    return NextResponse.json(
      { ok: false, error: `认领失败: ${updateError.message}`, processing_status: null },
      { status: 502 }
    );
  }

  if (!updatedRows || updatedRows.length === 0) {
    console.error("[process] claim affected 0 rows (maybe already processing?)", { id });
    return NextResponse.json({
      ok: true,
      skipped: true,
      reason: "claim affected 0 rows",
      status: "processing",
      record: null,
    });
  }

  // 认领成功，继续重任务
  let buffer: Buffer;
  try {
    const res = await fetch(record.file_url, { cache: "no-store" });
    if (!res.ok) {
      throw new Error(`拉取文件失败: ${res.status}`);
    }
    const ab = await res.arrayBuffer();
    buffer = Buffer.from(ab);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[process] fetch file error:", e);
    const failedPayload = {
      processing_status: "failed",
      processing_error: msg,
      updated_at: new Date().toISOString(),
    };
    const { data: failedRows, error: failUpdateError } = await supabase
      .from("health_records")
      .update(failedPayload)
      .eq("id", id)
      .select();
    console.log("[process failed update result]", {
      id,
      failUpdateError: failUpdateError?.message ?? null,
      failedRowsCount: failedRows?.length ?? 0,
      failedRows,
    });
    if (failUpdateError) {
      console.error("[process] failed update error:", failUpdateError);
    }
    if (!failedRows || failedRows.length === 0) {
      console.error("[process] failed update affected 0 rows", { id });
    }
    return NextResponse.json({
      ok: true,
      status: "failed",
      record: failedRows?.[0] ?? null,
      error: msg,
      processing_error: msg,
    });
  }

  try {
    const extracted = await extractText(buffer, record.file_type, record.file_name);

    if (extracted.error) {
      const failedPayload = {
        extracted_text: "",
        processing_status: "failed",
        processing_error: extracted.error,
        updated_at: new Date().toISOString(),
      };
      const { data: failedRows, error: failUpdateError } = await supabase
        .from("health_records")
        .update(failedPayload)
        .eq("id", id)
        .select();
      console.log("[process failed update result]", {
        id,
        failUpdateError: failUpdateError?.message ?? null,
        failedRowsCount: failedRows?.length ?? 0,
        failedRows,
      });
      if (failUpdateError) {
        console.error("[process] failed update error:", failUpdateError);
      }
      if (!failedRows || failedRows.length === 0) {
        console.error("[process] failed update affected 0 rows", { id });
      }
      return NextResponse.json({
        ok: true,
        status: "failed",
        record: failedRows?.[0] ?? null,
        error: extracted.error,
        processing_error: extracted.error,
      });
    }

    if (extracted.isPlaceholder) {
      const completedPayload = {
        processing_status: "completed",
        doc_type: IMAGE_UNPARSED_DOC_TYPE,
        ai_summary: "图片暂未解析",
        tags: [],
        structured_data: {},
        extracted_text: extracted.text,
        processing_error: null,
        updated_at: new Date().toISOString(),
      };
      const { data: updatedRows, error: updateError } = await supabase
        .from("health_records")
        .update(completedPayload)
        .eq("id", id)
        .select();
      console.log("[process completed update result]", {
        id,
        updateError: updateError?.message ?? null,
        updatedRowsCount: updatedRows?.length ?? 0,
        updatedRows,
      });
      if (updateError) {
        throw new Error(`completed update failed: ${updateError.message}`);
      }
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error("completed update affected 0 rows");
      }
      // 独立再查一次，避免 update+select 返回旧行（复制延迟等）
      const { data: freshRow } = await supabase
        .from("health_records")
        .select("*")
        .eq("id", id)
        .single();
      console.log("[process api completed]", {
        id,
        status: freshRow?.processing_status ?? updatedRows[0]?.processing_status,
        updated_at: freshRow?.updated_at ?? updatedRows[0]?.updated_at,
      });
      return NextResponse.json({
        ok: true,
        status: "completed",
        record: freshRow ?? updatedRows[0],
      });
    }

    const result = await runStructuredExtract(extracted.text);
    if (result.ok) {
      const completedPayload = {
        processing_status: "completed",
        doc_type: result.output.document_type,
        ai_summary: result.output.summary,
        tags: result.output.tags,
        structured_data: result.output.structured_data,
        extracted_text: extracted.text,
        processing_error: null,
        updated_at: new Date().toISOString(),
      };
      const { data: updatedRows, error: updateError } = await supabase
        .from("health_records")
        .update(completedPayload)
        .eq("id", id)
        .select();
      console.log("[process completed update result]", {
        id,
        updateError: updateError?.message ?? null,
        updatedRowsCount: updatedRows?.length ?? 0,
        updatedRows,
      });
      if (updateError) {
        throw new Error(`completed update failed: ${updateError.message}`);
      }
      if (!updatedRows || updatedRows.length === 0) {
        throw new Error("completed update affected 0 rows");
      }
      // 独立再查一次，避免 update+select 返回旧行
      const { data: freshRow } = await supabase
        .from("health_records")
        .select("*")
        .eq("id", id)
        .single();
      console.log("[process api completed]", {
        id,
        status: freshRow?.processing_status ?? updatedRows[0]?.processing_status,
        updated_at: freshRow?.updated_at ?? updatedRows[0]?.updated_at,
      });
      return NextResponse.json({
        ok: true,
        status: "completed",
        record: freshRow ?? updatedRows[0],
      });
    }

    const isAiTimeout = result.error === "ai timeout";
    const failedPayload = {
      extracted_text: extracted.text,
      processing_status: isAiTimeout ? "completed" : "failed",
      processing_error: isAiTimeout ? "ai timeout" : result.error,
      updated_at: new Date().toISOString(),
    };
    const { data: failedRows, error: failUpdateError } = await supabase
      .from("health_records")
      .update(failedPayload)
      .eq("id", id)
      .select();
    console.log("[process failed update result]", {
      id,
      failUpdateError: failUpdateError?.message ?? null,
      failedRowsCount: failedRows?.length ?? 0,
      failedRows,
    });
    if (failUpdateError) {
      console.error("[process] failed update error:", failUpdateError);
    }
    if (!failedRows || failedRows.length === 0) {
      console.error("[process] failed update affected 0 rows", { id });
    }
    return NextResponse.json({
      ok: true,
      status: isAiTimeout ? "completed" : "failed",
      record: failedRows?.[0] ?? null,
      error: isAiTimeout ? "ai timeout" : result.error,
      processing_error: isAiTimeout ? "ai timeout" : result.error,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[process] extract/AI error:", e);
    console.error("[process api failed]", { id, error: msg });
    const failedPayload = {
      processing_status: "failed",
      processing_error: msg,
      updated_at: new Date().toISOString(),
    };
    const { data: failedRows, error: failUpdateError } = await supabase
      .from("health_records")
      .update(failedPayload)
      .eq("id", id)
      .select();
    console.log("[process failed update result]", {
      id,
      failUpdateError: failUpdateError?.message ?? null,
      failedRowsCount: failedRows?.length ?? 0,
      failedRows,
    });
    if (failUpdateError) {
      console.error("[process] failed update error:", failUpdateError);
    }
    if (!failedRows || failedRows.length === 0) {
      console.error("[process] failed update affected 0 rows", { id });
    }
    return NextResponse.json({
      ok: true,
      status: "failed",
      record: failedRows?.[0] ?? null,
      error: msg,
      processing_error: msg,
    });
  }
}
