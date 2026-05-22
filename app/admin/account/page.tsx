"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useLocale } from "@/context/LocaleContext";
import {
  ehfBindEmail,
  ehfChangePassword,
  ehfGetAdminProfile,
} from "@/lib/api/ehfClient";
import type { AdminProfile } from "@/lib/api/ehfTypes";
import { adminEmailToUsername } from "@/lib/auth/adminAccount";
import { parseApiErrorMessage } from "@/lib/api/constants";
import { PageSection } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

export default function AdminAccountPage() {
  const { user, refreshUser } = useAuth();
  const { t } = useLocale();
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");
  const [passwordMsg, setPasswordMsg] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordLoading, setPasswordLoading] = useState(false);

  const [bindEmail, setBindEmail] = useState("");
  const [bindPassword, setBindPassword] = useState("");
  const [bindMsg, setBindMsg] = useState<string | null>(null);
  const [bindError, setBindError] = useState<string | null>(null);
  const [bindLoading, setBindLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingProfile(true);
      try {
        const data = await ehfGetAdminProfile();
        if (!cancelled) setProfile(data);
      } catch {
        if (!cancelled) setProfile(null);
      } finally {
        if (!cancelled) setLoadingProfile(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const username =
    profile?.username ??
    (user?.email ? adminEmailToUsername(user.email) : "—");

  const displayEmail =
    profile?.contact_email ??
    (user?.email && !user.email.endsWith("@ehf.admin") ? user.email : null);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg(null);
    setPasswordError(null);
    if (newPassword.length < 8) {
      setPasswordError(t("adminAccount.passwordMinLength"));
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError(t("adminAccount.passwordMismatch"));
      return;
    }
    setPasswordLoading(true);
    try {
      await ehfChangePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setPasswordMsg(t("adminAccount.passwordChanged"));
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");
    } catch (err) {
      const msg = parseApiErrorMessage(err);
      setPasswordError(msg.includes("404") ? t("adminAccount.apiPending") : msg);
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleBindEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setBindMsg(null);
    setBindError(null);
    if (!bindEmail.trim()) {
      setBindError(t("forgotPassword.emailRequired"));
      return;
    }
    setBindLoading(true);
    try {
      await ehfBindEmail({ email: bindEmail.trim(), password: bindPassword });
      setBindMsg(t("adminAccount.emailBound"));
      setBindEmail("");
      setBindPassword("");
      await refreshUser();
      try {
        const data = await ehfGetAdminProfile();
        setProfile(data);
      } catch {
        /* ignore */
      }
    } catch (err) {
      const msg = parseApiErrorMessage(err);
      setBindError(msg.includes("404") ? t("adminAccount.apiPending") : msg);
    } finally {
      setBindLoading(false);
    }
  };

  if (loadingProfile && !user) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{t("adminAccount.title")}</h1>
        <p className="text-muted-foreground mt-1">{t("adminAccount.subtitle")}</p>
      </div>

      <PageSection title={t("adminAccount.username")}>
        <Card>
          <CardContent className="pt-6 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm">{username}</span>
            </div>
            <div className="text-sm text-muted-foreground">
              {t("adminAccount.boundEmail")}:{" "}
              {displayEmail ? (
                <span className="text-foreground">{displayEmail}</span>
              ) : (
                <span>{t("adminAccount.noEmail")}</span>
              )}
              {profile?.email_verified && (
                <Badge variant="secondary" className="ml-2">
                  {t("adminAccount.emailVerified")}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      </PageSection>

      <PageSection title={t("adminAccount.changePassword")} description={t("adminAccount.changePasswordDesc")}>
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleChangePassword} className="space-y-4 max-w-md">
              {passwordError && <p className="text-sm text-destructive">{passwordError}</p>}
              {passwordMsg && (
                <p className="text-sm text-green-600 dark:text-green-400">{passwordMsg}</p>
              )}
              <div className="space-y-2">
                <Label htmlFor="currentPassword">{t("adminAccount.currentPassword")}</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">{t("adminAccount.newPassword")}</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmNewPassword">{t("adminAccount.confirmNewPassword")}</Label>
                <Input
                  id="confirmNewPassword"
                  type="password"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </div>
              <Button type="submit" disabled={passwordLoading}>
                {passwordLoading ? t("common.submitting") : t("common.save")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </PageSection>

      <PageSection title={t("adminAccount.bindEmail")} description={t("adminAccount.bindEmailDesc")}>
        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleBindEmail} className="space-y-4 max-w-md">
              {bindError && <p className="text-sm text-destructive">{bindError}</p>}
              {bindMsg && <p className="text-sm text-green-600 dark:text-green-400">{bindMsg}</p>}
              <div className="space-y-2">
                <Label htmlFor="bindEmail">{t("common.email")}</Label>
                <Input
                  id="bindEmail"
                  type="email"
                  value={bindEmail}
                  onChange={(e) => setBindEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bindPassword">{t("adminAccount.bindEmailPassword")}</Label>
                <Input
                  id="bindPassword"
                  type="password"
                  value={bindPassword}
                  onChange={(e) => setBindPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <Button type="submit" disabled={bindLoading}>
                {bindLoading ? t("common.submitting") : t("common.save")}
              </Button>
            </form>
          </CardContent>
        </Card>
      </PageSection>
    </div>
  );
}
