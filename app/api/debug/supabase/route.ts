import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase/server";

/**
 * 最小诊断接口：仅测试服务端能否连接到 Supabase，不做任何写入。
 * GET /api/debug/supabase
 */
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const keyPresent = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  const env = {
    urlPresent: Boolean(url),
    keyPresent,
    envOk: Boolean(url && keyPresent),
  };

  // 脱敏展示 project URL（只显示 host，不暴露 path/key）
  let projectUrl = "";
  if (url) {
    try {
      const u = new URL(url);
      projectUrl = u.origin;
    } catch {
      projectUrl = url;
    }
  }

  if (!env.envOk) {
    return NextResponse.json({
      ok: false,
      env,
      projectUrl: projectUrl || null,
      reachable: false,
      error: {
        code: "ENV_MISSING",
        message: !url
          ? "缺少 NEXT_PUBLIC_SUPABASE_URL"
          : !keyPresent
            ? "缺少 SUPABASE_SERVICE_ROLE_KEY"
            : "环境变量未配置完整",
      },
    });
  }

  if (!supabaseAdmin) {
    return NextResponse.json({
      ok: false,
      env,
      projectUrl,
      reachable: false,
      error: {
        code: "CLIENT_INIT",
        message: "Supabase 客户端初始化失败",
      },
    });
  }

  try {
    // 仅做一次最小只读请求：查 health_records 最多 1 条，不写入
    const { error } = await supabaseAdmin
      .from("health_records")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({
        ok: false,
        env,
        projectUrl,
        reachable: true,
        error: {
          code: error.code ?? "SUPABASE_ERROR",
          message: error.message,
        },
      });
    }

    return NextResponse.json({
      ok: true,
      env,
      projectUrl,
      reachable: true,
      error: null,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    const code =
      err instanceof Error && "code" in err
        ? String((err as NodeJS.ErrnoException).code)
        : "UNKNOWN";

    return NextResponse.json({
      ok: false,
      env,
      projectUrl,
      reachable: false,
      error: {
        code: code || "NETWORK_ERROR",
        message,
      },
    });
  }
}
