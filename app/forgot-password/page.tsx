"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { ehfForgotPassword } from "@/lib/api/ehfClient";
import { parseApiErrorMessage } from "@/lib/api/constants";
import { useLocale } from "@/context/LocaleContext";
import { AuthPageFrame } from "@/components/layout/AuthPageFrame";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const { t } = useLocale();
  const isAdmin = searchParams.get("role") === "admin";
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loginHref = isAdmin ? "/login?role=admin" : "/login";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!email.trim()) {
      setError(t("forgotPassword.emailRequired"));
      return;
    }
    setLoading(true);
    try {
      await ehfForgotPassword({ email: email.trim() });
      setSuccess(t("forgotPassword.sent"));
    } catch (err) {
      const msg = parseApiErrorMessage(err);
      if (msg.includes("404") || msg.toLowerCase().includes("not found")) {
        setError(t("adminAccount.apiPending"));
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthPageFrame>
      <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
        <Card className="w-full max-w-md">
          <CardHeader className="space-y-1 text-center">
            <div className="mb-2 text-left">
              <Button variant="ghost" size="sm" className="-ml-2 gap-1" asChild>
                <Link href={loginHref}>
                  <ArrowLeft className="h-4 w-4" />
                  {t("forgotPassword.backToLogin")}
                </Link>
              </Button>
            </div>
            <CardTitle className="text-2xl">{t("forgotPassword.title")}</CardTitle>
            <CardDescription>
              {isAdmin ? t("forgotPassword.adminDescription") : t("forgotPassword.description")}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && <p className="text-sm text-destructive text-center">{error}</p>}
              {success && (
                <p className="text-sm text-green-600 dark:text-green-400 text-center">{success}</p>
              )}
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t("common.sending") : t("common.send")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AuthPageFrame>
  );
}

function ForgotPasswordFallback() {
  const { t } = useLocale();
  return (
    <AuthPageFrame>
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">{t("common.loading")}</p>
      </div>
    </AuthPageFrame>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordFallback />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
