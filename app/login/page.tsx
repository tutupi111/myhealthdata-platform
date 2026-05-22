"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import { AuthPageFrame } from "@/components/layout/AuthPageFrame";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { AppRole } from "@/types/layout";

const DASHBOARD_BY_ROLE: Record<AppRole, string> = {
  patient: "/patient/dashboard",
  researcher: "/researcher/dashboard",
  admin: "/admin/dashboard",
};

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, hasChecked, login, logout } = useAuth();
  const { t } = useLocale();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [fieldsLocked, setFieldsLocked] = useState(true);

  /** 进入页面或切换三端入口时清空，避免浏览器自动填充上次账号 */
  useEffect(() => {
    setEmail("");
    setPassword("");
    setError("");
    setFieldsLocked(true);
  }, [roleParam]);

  const registered = searchParams.get("registered") === "1";
  const reset = searchParams.get("reset") === "1";
  const redirect = searchParams.get("redirect");
  const roleParam = searchParams.get("role");
  const isAdminLogin = roleParam === "admin";
  const isPortalLogin =
    roleParam === "patient" || roleParam === "researcher" || roleParam === "admin";
  const roleHint = isPortalLogin ? t(`roles.${roleParam}`) : null;
  const hasProtectedRedirect = Boolean(redirect && redirect.startsWith("/"));

  const portalRole = isPortalLogin ? (roleParam as AppRole) : null;
  const roleMismatch =
    isPortalLogin && user && portalRole && user.role !== portalRole;

  useEffect(() => {
    if (!hasChecked || !user || !isPortalLogin || hasProtectedRedirect) return;
    if (portalRole && user.role !== portalRole) {
      logout();
    }
  }, [hasChecked, user, isPortalLogin, hasProtectedRedirect, logout, portalRole]);

  if (hasChecked && user) {
    if (roleMismatch) {
      return (
        <AuthPageFrame>
          <div className="flex min-h-screen items-center justify-center p-4">
            <p className="text-muted-foreground">{t("common.switchingLogin")}</p>
          </div>
        </AuthPageFrame>
      );
    }

    if (isPortalLogin && !hasProtectedRedirect) {
      const to = DASHBOARD_BY_ROLE[user.role];
      router.replace(to);
      return (
        <AuthPageFrame>
          <div className="flex min-h-screen items-center justify-center p-4">
            <p className="text-muted-foreground">{t("common.redirecting")}</p>
          </div>
        </AuthPageFrame>
      );
    }

    const to = hasProtectedRedirect
      ? decodeURIComponent(redirect!)
      : DASHBOARD_BY_ROLE[user.role];
    router.replace(to);
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
    setLoading(true);
    const result = await login(email, password, {
      role: isPortalLogin ? (roleParam as AppRole) : undefined,
    });
    setLoading(false);
    if (result.ok) {
      const to =
        redirect && redirect.startsWith("/")
          ? decodeURIComponent(redirect)
          : DASHBOARD_BY_ROLE[result.user.role];
      router.push(to);
      return;
    }
    setError(result.error ?? t("common.loginFailed"));
  };

  const registerHref = isPortalLogin && !isAdminLogin ? `/register?role=${roleParam}` : "/register";

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
            <CardTitle className="text-2xl">{t("login.title")}</CardTitle>
            <CardDescription>
              {roleHint
                ? t("login.descriptionWithRole", { role: roleHint })
                : t("login.description")}
            </CardDescription>
            {isAdminLogin && (
              <p className="text-xs text-muted-foreground pt-1">{t("login.adminLoginHint")}</p>
            )}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
              <input
                type="text"
                name="ehf_prevent_autofill_user"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                autoComplete="off"
              />
              <input
                type="password"
                name="ehf_prevent_autofill_pass"
                className="sr-only"
                tabIndex={-1}
                aria-hidden
                autoComplete="off"
              />
              {reset && (
                <p className="text-sm text-green-600 dark:text-green-400 text-center">
                  {t("forgotPassword.resetSuccess")}
                </p>
              )}
              {registered && (
                <p className="text-sm text-green-600 dark:text-green-400 text-center">
                  {t("login.registeredSuccess")}
                </p>
              )}
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
              <div className="space-y-2">
                <Label htmlFor="email">
                  {isAdminLogin ? t("common.account") : t("common.email")}
                </Label>
                <Input
                  id="email"
                  name={isAdminLogin ? "ehf-admin-identifier" : "ehf-portal-email"}
                  type={isAdminLogin ? "text" : "email"}
                  placeholder={
                    isAdminLogin ? t("login.adminAccountPlaceholder") : t("login.emailPlaceholder")
                  }
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFieldsLocked(false)}
                  readOnly={fieldsLocked}
                  required
                  autoComplete="off"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t("common.password")}</Label>
                <Input
                  id="password"
                  name="ehf-portal-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onFocus={() => setFieldsLocked(false)}
                  readOnly={fieldsLocked}
                  required
                  autoComplete="off"
                />
              </div>
              {isAdminLogin && (
                <div className="text-right">
                  <Link
                    href="/forgot-password?role=admin"
                    className="text-sm text-primary underline-offset-4 hover:underline"
                  >
                    {t("login.forgotPassword")}
                  </Link>
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("common.loggingIn") : t("common.login")}
              </Button>
            </form>
            {!isAdminLogin && (
              <p className="text-center text-sm text-muted-foreground mt-4">
                {t("common.noAccount")}{" "}
                <Link href={registerHref} className="text-primary underline-offset-4 hover:underline">
                  {t("common.register")}
                </Link>
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </AuthPageFrame>
  );
}

function LoginPageFallback() {
  const { t } = useLocale();
  return (
    <AuthPageFrame>
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    </AuthPageFrame>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginForm />
    </Suspense>
  );
}
