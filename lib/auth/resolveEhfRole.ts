import type { EhfRole, EhfUser } from "@/lib/api/ehfTypes";
import { ADMIN_EMAIL_DOMAIN } from "@/lib/auth/adminAccount";

/** 从 API 用户对象解析 EHF 业务角色（兼容仅返回 App Hub role 的情况） */
export function resolveEhfRole(user: EhfUser): EhfRole | null {
  const r = user.ehf_role;
  if (r === "patient" || r === "researcher" || r === "admin") return r;
  const email = user.email?.trim().toLowerCase() ?? "";
  if (email.endsWith(ADMIN_EMAIL_DOMAIN)) return "admin";
  return null;
}
