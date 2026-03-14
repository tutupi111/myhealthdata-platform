import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const SELECT_COLS =
  "id,provider,model_name,base_url,supports_vision,supports_json,is_default,is_active,priority,notes,created_at";

export async function GET() {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase 未配置", code: "ENV_MISSING" },
      { status: 503 }
    );
  }
  const { data, error } = await supabaseAdmin
    .from("ai_models")
    .select(SELECT_COLS)
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) {
    return NextResponse.json(
      { error: error.message, code: "DB_ERROR" },
      { status: 502 }
    );
  }
  return NextResponse.json({ models: data ?? [] });
}

export async function POST(request: NextRequest) {
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Supabase 未配置", code: "ENV_MISSING" },
      { status: 503 }
    );
  }
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "请求体无效", code: "BAD_REQUEST" }, { status: 400 });
  }
  const p = body as Record<string, unknown>;
  const provider = typeof p.provider === "string" ? p.provider.trim() : "";
  const model_name = typeof p.model_name === "string" ? p.model_name.trim() : "";
  if (!provider || !model_name) {
    return NextResponse.json(
      { error: "provider 和 model_name 必填", code: "VALIDATION" },
      { status: 400 }
    );
  }
  const row = {
    provider,
    model_name,
    base_url: typeof p.base_url === "string" ? p.base_url.trim() || null : null,
    api_key: typeof p.api_key === "string" ? p.api_key.trim() || null : null,
    supports_vision: Boolean(p.supports_vision),
    supports_json: Boolean(p.supports_json),
    is_default: Boolean(p.is_default),
    is_active: p.is_active !== false,
    priority: typeof p.priority === "number" ? p.priority : 0,
    notes: typeof p.notes === "string" ? p.notes.trim() || null : null,
  };
  if (row.is_default) {
    await supabaseAdmin.from("ai_models").update({ is_default: false }).neq("id", "00000000-0000-0000-0000-000000000000");
  }
  const { data, error } = await supabaseAdmin
    .from("ai_models")
    .insert(row)
    .select(SELECT_COLS)
    .single();
  if (error) {
    return NextResponse.json({ error: error.message, code: "DB_ERROR" }, { status: 502 });
  }
  return NextResponse.json(data);
}
