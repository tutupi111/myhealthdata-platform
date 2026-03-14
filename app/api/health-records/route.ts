import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const MOCK_PATIENT_ID = process.env.MOCK_PATIENT_ID ?? "00000000-0000-4000-8000-000000000001";

export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase 未配置" },
      { status: 503 }
    );
  }

  const { searchParams } = new URL(request.url);
  const patientId = searchParams.get("patient_id") ?? MOCK_PATIENT_ID;

  const { data, error } = await supabaseAdmin
    .from("health_records")
    .select("id, patient_id, file_url, file_type, file_name, file_size, processing_status, created_at, extracted_text, doc_type, ai_summary, structured_data, tags, processing_error, updated_at")
    .eq("patient_id", patientId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("health_records select error:", error);
    return NextResponse.json(
      { error: "获取记录失败：" + error.message },
      { status: 502 }
    );
  }

  const records = data ?? [];
  records.forEach((r: { id: string; file_name?: string; processing_status?: string; updated_at?: string }) => {
    console.log("[list api record]", {
      id: r.id,
      file_name: r.file_name,
      processing_status: r.processing_status,
      updated_at: r.updated_at,
    });
  });

  return NextResponse.json({ records });
}
