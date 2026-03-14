import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id || !supabaseAdmin) {
    return NextResponse.json(
      { error: supabaseAdmin ? "缺少 id" : "Supabase 未配置" },
      { status: supabaseAdmin ? 400 : 503 }
    );
  }
  const { data, error } = await supabaseAdmin
    .from("ai_task_configs")
    .select(
      "id,task_type,preferred_model_id,fallback_model_id,prompt_template,timeout,max_tokens,is_enabled,created_at,updated_at"
    )
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  if (!data) return NextResponse.json({ error: "配置不存在" }, { status: 404 });
  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id || !supabaseAdmin) {
    return NextResponse.json(
      { error: supabaseAdmin ? "缺少 id" : "Supabase 未配置" },
      { status: supabaseAdmin ? 400 : 503 }
    );
  }
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "请求体无效" }, { status: 400 });
  }
  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (body.preferred_model_id !== undefined) updates.preferred_model_id = body.preferred_model_id || null;
  if (body.fallback_model_id !== undefined) updates.fallback_model_id = body.fallback_model_id || null;
  if (body.prompt_template !== undefined) updates.prompt_template = typeof body.prompt_template === "string" ? body.prompt_template.trim() || null : null;
  if (typeof body.timeout === "number") updates.timeout = body.timeout;
  if (typeof body.max_tokens === "number") updates.max_tokens = body.max_tokens;
  if (typeof body.is_enabled === "boolean") updates.is_enabled = body.is_enabled;
  const { data, error } = await supabaseAdmin
    .from("ai_task_configs")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}
