"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ehfResetPassword } from "@/lib/api/ehfClient";
import { parseApiErrorMessage } from "@/lib/api/constants";
import { useLocale } from "@/context/LocaleContext";
import { AuthPageFrame } from "@/components/layout/AuthPageFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const token = searchParams.get("token") ?? "";
  const isAdmin = searchParams.get("role") === "admin";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loginHref = isAdmin ? "/login?role=admin" : "/login";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) {
      setError(t("forgotPassword.resetTokenMissing"));
      return;
    }
    if (password.length < 8) {
      setError(t("register.passwordMinLength"));
      return;
    }
    if (password !== confirmPassword) {
      setError(t("register.passwordMismatch"));
      return;
    }
    setLoading(true);
    try {
      await ehfResetPassword({ token, new_password: password });
      router.push(isAdmin ? "/login?role=admin&reset=1" : "/login?reset=1");
    } catch (err) {
      setError(parseApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <AuthPageFrame>
        <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
          <Card className="w-full max-w-md">
            <CardContent className="pt-6 space-y-4 text-center">
              <p className="text-destructive">{t("forgotPassword.resetTokenMissing")}</p>
              <Button variant="outline" asChild>
                <Link href={loginHref}>{t("forgotPassword.backToLogin")}</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </AuthPageFrame>
    );
  }

  return (
    <AuthPageFrame>
      <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">{t("forgotPassword.resetTitle")}</CardTitle>
            <CardDescription>{t("forgotPassword.resetDescription")}</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
              <div className="space-y-2">
                <Label htmlFor="password">{t("forgotPassword.newPassword")}</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t("forgotPassword.confirmPassword")}</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("common.submitting") : t("common.save")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthPageFrame>
  );
}

function ResetPasswordFallback() {
  const { t } = useLocale();
  return (
    <AuthPageFrame>
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    </AuthPageFrame>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<ResetPasswordFallback />}>
      <ResetPasswordForm />
    </Suspense>
  );
}
