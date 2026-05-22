"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import {
  ehfRegisterPatient,
  ehfRegisterResearcher,
} from "@/lib/api/ehfClient";
import { parseApiErrorMessage } from "@/lib/api/constants";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { AuthPageFrame } from "@/components/layout/AuthPageFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppRole } from "@/types/layout";

const ROLE_OPTIONS: AppRole[] = ["patient", "researcher"];

function parsePortalRole(value: string | null): AppRole | null {
  if (value === "patient" || value === "researcher" || value === "admin") return value;
  return null;
}

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { logout } = useAuth();
  const { t } = useLocale();
  const portalRole = parsePortalRole(searchParams.get("role"));
  const [role, setRole] = useState<AppRole>(portalRole === "admin" ? "patient" : portalRole ?? "patient");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [organizationName, setOrganizationName] = useState("");
  const [diseaseType, setDiseaseType] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const activeRole = portalRole && portalRole !== "admin" ? portalRole : role;

  useEffect(() => {
    if (portalRole === "admin") {
      router.replace("/login?role=admin");
    }
  }, [portalRole, router]);

  if (portalRole === "admin") {
    return (
      <AuthPageFrame>
        <div className="flex min-h-screen items-center justify-center p-4">
          <p className="text-muted-foreground">{t("common.redirecting")}</p>
        </div>
      </AuthPageFrame>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError(t("register.passwordMismatch"));
      return;
    }
    if (password.length < 8) {
      setError(t("register.passwordMinLength"));
      return;
    }
    setLoading(true);
    try {
      if (activeRole === "patient") {
        if (!fullName.trim()) {
          setError(t("register.fillName"));
          setLoading(false);
          return;
        }
        await ehfRegisterPatient({
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          disease_type: diseaseType.trim() || undefined,
        });
      } else if (activeRole === "researcher") {
        if (!fullName.trim() || !organizationName.trim()) {
          setError(t("register.fillNameAndOrg"));
          setLoading(false);
          return;
        }
        await ehfRegisterResearcher({
          email: email.trim(),
          password,
          full_name: fullName.trim(),
          organization_name: organizationName.trim(),
        });
      }
      router.push(`/login?registered=1&role=${activeRole}`);
    } catch (err) {
      setError(parseApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const loginHref = portalRole ? `/login?role=${portalRole}` : "/login";
  const roleLabel = portalRole ? t(`roles.${portalRole}`) : null;

  return (
    <AuthPageFrame>
      <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mb-2 text-left">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2 gap-1"
                type="button"
                onClick={() => {
                  logout();
                  router.push("/");
                }}
              >
                <ArrowLeft className="h-4 w-4" />
                {t("common.backToRoleSelect")}
              </Button>
            </div>
            <CardTitle className="text-2xl">{t("register.title")}</CardTitle>
            <CardDescription>
              {roleLabel
                ? t("register.descriptionWithRole", { role: roleLabel })
                : t("register.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
              <div className="space-y-2">
                <Label htmlFor="email">{t("common.email")}</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              {!portalRole && (
                <div className="space-y-2">
                  <Label htmlFor="role">{t("register.role")}</Label>
                  <select
                    id="role"
                    value={role}
                    onChange={(e) => setRole(e.target.value as AppRole)}
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    {ROLE_OPTIONS.map((value) => (
                      <option key={value} value={value}>
                        {t(`register.roles.${value}`)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <div className="space-y-2">
                <Label htmlFor="fullName">{t("common.name")}</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              {activeRole === "patient" && (
                <div className="space-y-2">
                  <Label htmlFor="diseaseType">
                    {t("register.diseaseType")}
                    {t("common.optional")}
                  </Label>
                  <Input
                    id="diseaseType"
                    value={diseaseType}
                    onChange={(e) => setDiseaseType(e.target.value)}
                  />
                </div>
              )}
              {activeRole === "researcher" && (
                <div className="space-y-2">
                  <Label htmlFor="organizationName">{t("register.organization")}</Label>
                  <Input
                    id="organizationName"
                    value={organizationName}
                    onChange={(e) => setOrganizationName(e.target.value)}
                    required
                  />
                </div>
              )}
              {activeRole === "researcher" && (
                <p className="text-xs text-muted-foreground">{t("register.researcherPendingHint")}</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="password">{t("common.password")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("common.confirmPassword")}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("common.submitting") : t("common.submitRegister")}
              </Button>
            </form>
            <p className="text-center text-sm text-muted-foreground mt-4">
              {t("common.hasAccount")}{" "}
              <Link href={loginHref} className="text-primary underline-offset-4 hover:underline">
                {t("common.login")}
              </Link>
            </p>
          </CardContent>
        </Card>
      </div>
    </AuthPageFrame>
  );
}

function RegisterPageFallback() {
  const { t } = useLocale();
  return (
    <AuthPageFrame>
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    </AuthPageFrame>
  );
}

export default function RegisterPage() {
  return (
    <Suspense fallback={<RegisterPageFallback />}>
      <RegisterForm />
    </Suspense>
  );
}
