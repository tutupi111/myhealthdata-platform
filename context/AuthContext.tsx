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
import type { AdminProfile, PatientProfile, ResearcherProfile } from "@/lib/api/ehfTypes";
import { adminEmailToUsername, normalizeLoginIdentifier } from "@/lib/auth/adminAccount";
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
  user: { id: string; email: string; ehf_role: EhfRole; display_name?: string | null },
  profile: PatientProfile | ResearcherProfile | AdminProfile | null
): AuthUser {
  return {
    id: user.id,
    email: user.email,
    role: user.ehf_role,
    displayName: profileDisplayName(
      profile,
      user.email,
      user.ehf_role,
      user.display_name
    ),
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
      setUser(buildAuthUser(me.user, me.profile));
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
      await ehfLogin(email, password);
      const me = await ehfGetMe();
      const authUser = buildAuthUser(me.user, me.profile);
      setUser(authUser);
      return { ok: true as const, user: authUser };
    } catch (err) {
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
