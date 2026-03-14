import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

const SELECT_COLS =
  "id,provider,model_name,base_url,supports_vision,supports_json,is_default,is_active,priority,notes,created_at";

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
    .from("ai_models")
    .select(SELECT_COLS)
    .eq("id", id)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  if (!data) return NextResponse.json({ error: "模型不存在" }, { status: 404 });
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
  const updates: Record<string, unknown> = {};
  if (typeof body.provider === "string") updates.provider = body.provider.trim();
  if (typeof body.model_name === "string") updates.model_name = body.model_name.trim();
  if (body.base_url !== undefined) updates.base_url = typeof body.base_url === "string" ? body.base_url.trim() || null : null;
  if (body.api_key !== undefined) updates.api_key = typeof body.api_key === "string" ? body.api_key.trim() || null : null;
  if (typeof body.supports_vision === "boolean") updates.supports_vision = body.supports_vision;
  if (typeof body.supports_json === "boolean") updates.supports_json = body.supports_json;
  if (typeof body.is_active === "boolean") updates.is_active = body.is_active;
  if (typeof body.priority === "number") updates.priority = body.priority;
  if (body.notes !== undefined) updates.notes = typeof body.notes === "string" ? body.notes.trim() || null : null;
  if (body.is_default === true) {
    await supabaseAdmin.from("ai_models").update({ is_default: false }).neq("id", id);
    updates.is_default = true;
  } else if (body.is_default === false) {
    updates.is_default = false;
  }
  if (Object.keys(updates).length === 0) {
    const { data } = await supabaseAdmin.from("ai_models").select(SELECT_COLS).eq("id", id).single();
    return NextResponse.json(data ?? {});
  }
  const { data, error } = await supabaseAdmin
    .from("ai_models")
    .update(updates)
    .eq("id", id)
    .select(SELECT_COLS)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return NextResponse.json(data);
}

export async function DELETE(
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
  const { error } = await supabaseAdmin.from("ai_models").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 502 });
  return new NextResponse(null, { status: 204 });
}
