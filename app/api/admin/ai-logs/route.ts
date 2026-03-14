import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase 未配置", code: "ENV_MISSING" },
      { status: 503 }
    );
  }
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(parseInt(searchParams.get("limit") ?? "50", 10), 1), 200);
  const offset = Math.max(parseInt(searchParams.get("offset") ?? "0", 10), 0);
  const status = searchParams.get("status");
  const task_type = searchParams.get("task_type");
  const q = supabaseAdmin
    .from("ai_logs")
    .select("id,record_id,task_type,model_name,status,error_message,duration_ms,created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(offset, offset + limit - 1);
  if (status) q.eq("status", status);
  if (task_type) q.eq("task_type", task_type);
  const { data, error, count } = await q;
  if (error) {
    return NextResponse.json({ error: error.message, code: "DB_ERROR" }, { status: 502 });
  }
  return NextResponse.json({ logs: data ?? [], total: count ?? 0 });
}
