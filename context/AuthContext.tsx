"use client";

import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import {
  AUTH_STORAGE_KEY,
  findMockUser,
  type AppRole,
  type StoredAuth,
} from "@/lib/mock/auth";

interface AuthUser {
  email: string;
  role: AppRole;
  displayName: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  hasChecked: boolean;
  login: (email: string, password: string) =>
    | { ok: true; user: AuthUser }
    | { ok: false; error: string };
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const VALID_ROLES: AppRole[] = ["patient", "researcher", "admin"];
function isValidRole(r: unknown): r is AppRole {
  return typeof r === "string" && VALID_ROLES.includes(r as AppRole);
}

function loadStoredAuth(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredAuth;
    if (parsed?.email && parsed?.role && isValidRole(parsed.role)) {
      return {
        email: parsed.email,
        role: parsed.role,
        displayName: parsed.displayName ?? parsed.email,
      };
    }
  } catch {
    // ignore
  }
  return null;
}

function saveStoredAuth(user: AuthUser): void {
  if (typeof window === "undefined") return;
  const stored: StoredAuth = {
    email: user.email,
    role: user.role,
    displayName: user.displayName,
  };
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(stored));
}

function clearStoredAuth(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(AUTH_STORAGE_KEY);
  sessionStorage.removeItem(AUTH_STORAGE_KEY);
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  useEffect(() => {
    setUser(loadStoredAuth());
    setHasChecked(true);
  }, []);

  const login = useCallback((email: string, password: string) => {
    const found = findMockUser(email, password);
    if (!found) {
      return { ok: false as const, error: "邮箱或密码错误" };
    }
    const authUser: AuthUser = {
      email: found.email,
      role: found.role,
      displayName: found.displayName,
    };
    setUser(authUser);
    saveStoredAuth(authUser);
    return { ok: true as const, user: authUser };
  }, []);

  const logout = useCallback(() => {
    setUser(null);
    clearStoredAuth();
  }, []);

  const value: AuthContextValue = {
    user,
    hasChecked,
    login,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
