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
  const task_type = searchParams.get("task_type");
  const q = supabaseAdmin
    .from("ai_task_configs")
    .select(
      "id,task_type,preferred_model_id,fallback_model_id,prompt_template,timeout,max_tokens,is_enabled,created_at,updated_at"
    )
    .order("task_type", { ascending: true });
  if (task_type) q.eq("task_type", task_type);
  const { data, error } = await q;
  if (error) {
    return NextResponse.json({ error: error.message, code: "DB_ERROR" }, { status: 502 });
  }
  const configs = data ?? [];
  const modelIds = new Set<string>();
  configs.forEach((c: { preferred_model_id?: string | null; fallback_model_id?: string | null }) => {
    if (c.preferred_model_id) modelIds.add(c.preferred_model_id);
    if (c.fallback_model_id) modelIds.add(c.fallback_model_id);
  });
  let models: { id: string; model_name: string }[] = [];
  if (modelIds.size > 0) {
    const { data: modelData } = await supabaseAdmin
      .from("ai_models")
      .select("id,model_name")
      .in("id", Array.from(modelIds));
    models = (modelData ?? []) as { id: string; model_name: string }[];
  }
  const byId = Object.fromEntries(models.map((m) => [m.id, m]));
  const list = configs.map((c: Record<string, unknown>) => ({
    ...c,
    preferred_model: c.preferred_model_id ? byId[c.preferred_model_id as string] ?? null : null,
    fallback_model: c.fallback_model_id ? byId[c.fallback_model_id as string] ?? null : null,
  }));
  return NextResponse.json({ configs: list });
}
