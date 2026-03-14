import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * 单条 record 详情。按 id 唯一查询（mock 阶段 id 即主键），与列表/process 对齐同一条记录。
 * 所有异常在内部捕获，返回结构化 JSON，不向 Node 抛未捕获异常。
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    if (!supabaseAdmin) {
      return NextResponse.json({ error: "Supabase 未配置" }, { status: 503 });
    }

    const params = await context.params;
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: "缺少记录 id" }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from("health_records")
      .select("*")
      .eq("id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "记录不存在" }, { status: 404 });
      }
      console.error("[record api error] query:", error);
      return NextResponse.json({ error: "获取记录失败" }, { status: 502 });
    }

    if (!data) {
      return NextResponse.json({ error: "记录不存在" }, { status: 404 });
    }

    console.log("[record api query result]", {
      id: data?.id,
      processing_status: data?.processing_status,
      updated_at: data?.updated_at,
      doc_type: data?.doc_type,
      ai_summary: data?.ai_summary,
    });

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
    });
  } catch (err) {
    console.error("[record api error]", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "服务器内部错误" },
      { status: 500 }
    );
  }
}
