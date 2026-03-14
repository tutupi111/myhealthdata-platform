import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const MOCK_PATIENT_ID = process.env.MOCK_PATIENT_ID ?? "00000000-0000-4000-8000-000000000001";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  if (!supabaseAdmin) {
    return NextResponse.json({ error: "Supabase 未配置" }, { status: 503 });
  }

  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "缺少记录 id" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("health_records")
    .select("id, patient_id, file_url, file_type, file_name, file_size, processing_status, created_at, extracted_text, doc_type, ai_summary, structured_data, tags, processing_error, updated_at")
    .eq("id", id)
    .eq("patient_id", MOCK_PATIENT_ID)
    .maybeSingle();

  if (error) {
    console.error("health_records select one error:", error);
    return NextResponse.json({ error: "获取记录失败" }, { status: 502 });
  }
  if (!data) {
    return NextResponse.json({ error: "记录不存在" }, { status: 404 });
  }

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "no-store, max-age=0",
    },
  });
}
