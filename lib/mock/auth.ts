/**
 * Mock auth: email + password, no database.
 */

export type AppRole = "patient" | "researcher" | "admin";

export interface MockUser {
  email: string;
  password: string;
  role: AppRole;
  displayName: string;
}

export const MOCK_USERS: MockUser[] = [
  { email: "patient@example.com", password: "password", role: "patient", displayName: "患者" },
  { email: "researcher@example.com", password: "password", role: "researcher", displayName: "研究者" },
  { email: "admin@example.com", password: "password", role: "admin", displayName: "管理员" },
];

export function findMockUser(email: string, password: string): MockUser | null {
  const normalized = email.trim().toLowerCase();
  return MOCK_USERS.find(
    (u) => u.email.toLowerCase() === normalized && u.password === password
  ) ?? null;
}

export const AUTH_STORAGE_KEY = "ehf-auth";

export interface StoredAuth {
  email: string;
  role: AppRole;
  displayName: string;
}
