/** 管理端内置账号登录：用户名映射为后端 email（需后端 seed 对应账号） */
export const ADMIN_EMAIL_DOMAIN = "@ehf.admin";

export function adminUsernameToEmail(identifier: string): string {
  const value = identifier.trim().toLowerCase();
  if (!value) return value;
  if (value.includes("@")) return value;
  return `${value}${ADMIN_EMAIL_DOMAIN}`;
}

export function adminEmailToUsername(email: string): string {
  const lower = email.trim().toLowerCase();
  if (lower.endsWith(ADMIN_EMAIL_DOMAIN)) {
    return lower.slice(0, -ADMIN_EMAIL_DOMAIN.length);
  }
  return email;
}

export function isAdminPortalRole(role: string | null | undefined): boolean {
  return role === "admin";
}

export function normalizeLoginIdentifier(identifier: string, role?: string | null): string {
  const trimmed = identifier.trim();
  if (isAdminPortalRole(role) && !trimmed.includes("@")) {
    return adminUsernameToEmail(trimmed);
  }
  return trimmed;
}
