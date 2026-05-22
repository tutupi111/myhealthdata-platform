"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  ehfGetMe,
  ehfLogin,
  setAccessToken,
  getAccessToken,
  type EhfRole,
} from "@/lib/api/ehfClient";
import type {
  AdminProfile,
  EhfUser,
  PatientProfile,
  ResearcherProfile,
} from "@/lib/api/ehfTypes";
import { adminEmailToUsername, normalizeLoginIdentifier } from "@/lib/auth/adminAccount";
import { resolveEhfRole } from "@/lib/auth/resolveEhfRole";
import { parseApiErrorMessage } from "@/lib/api/constants";

export type { EhfRole as AppRole };

interface AuthUser {
  id: string;
  email: string;
  role: EhfRole;
  displayName: string;
  profile: PatientProfile | ResearcherProfile | AdminProfile | null;
}

interface AuthContextValue {
  user: AuthUser | null;
  hasChecked: boolean;
  login: (
    identifier: string,
    password: string,
    options?: { role?: EhfRole }
  ) => Promise<{ ok: true; user: AuthUser } | { ok: false; error: string }>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function profileDisplayName(
  profile: PatientProfile | ResearcherProfile | AdminProfile | null,
  email: string,
  role: EhfRole,
  userDisplayName?: string | null
): string {
  if (role === "admin") {
    const adminProfile = profile as AdminProfile | null;
    if (adminProfile?.display_name) return adminProfile.display_name;
    if (userDisplayName) return userDisplayName;
    if (adminProfile?.username) return adminProfile.username;
    return adminEmailToUsername(email);
  }
  if (!profile) return email;
  if ("full_name" in profile && profile.full_name) return profile.full_name;
  return email;
}

function buildAuthUser(
  user: EhfUser,
  profile: PatientProfile | ResearcherProfile | AdminProfile | null
): AuthUser | null {
  const role = resolveEhfRole(user);
  if (!role) return null;
  return {
    id: user.id,
    email: user.email,
    role,
    displayName: profileDisplayName(profile, user.email, role, user.display_name),
    profile,
  };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [hasChecked, setHasChecked] = useState(false);

  const refreshUser = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setUser(null);
      return;
    }
    try {
      const me = await ehfGetMe();
      const authUser = buildAuthUser(me.user, me.profile);
      if (!authUser) {
        setAccessToken(null);
        setUser(null);
        return;
      }
      setUser(authUser);
    } catch {
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      await refreshUser();
      if (!cancelled) setHasChecked(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshUser]);

  const login = useCallback(async (identifier: string, password: string, options?: { role?: EhfRole }) => {
    try {
      const email = normalizeLoginIdentifier(identifier, options?.role ?? null);
      const loginRes = await ehfLogin(email, password);

      let meUser = loginRes.user;
      let meProfile = loginRes.profile ?? null;
      try {
        const me = await ehfGetMe();
        meUser = me.user;
        meProfile = me.profile ?? meProfile;
      } catch {
        /* 登录响应已含 token，/me 失败时仍用 login 返回的用户信息 */
      }

      const authUser = buildAuthUser(meUser, meProfile);
      if (!authUser) {
        setAccessToken(null);
        return { ok: false as const, error: "无法识别账号角色，请联系管理员" };
      }

      if (options?.role && authUser.role !== options.role) {
        setAccessToken(null);
        setUser(null);
        return {
          ok: false as const,
          error:
            options.role === "admin"
              ? "该账号不是管理员，请从患者端或研究者端入口登录"
              : "该账号不能从当前入口登录，请选择正确的登录入口",
        };
      }

      setUser(authUser);
      return { ok: true as const, user: authUser };
    } catch (err) {
      setAccessToken(null);
      setUser(null);
      return { ok: false as const, error: parseApiErrorMessage(err) };
    }
  }, []);

  const logout = useCallback(() => {
    setAccessToken(null);
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, hasChecked, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

/** 患者 DID，供授权/研究者页使用 */
export function usePatientDid(): string | null {
  const { user } = useAuth();
  if (user?.role !== "patient") return null;
  const p = user.profile as PatientProfile | null;
  return p?.did ?? null;
}
