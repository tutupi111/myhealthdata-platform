"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const DASHBOARD_BY_ROLE = {
  patient: "/patient/dashboard",
  researcher: "/researcher/dashboard",
  admin: "/admin/dashboard",
} as const;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, hasChecked, login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const registered = searchParams.get("registered") === "1";

  // Already logged in: always redirect to current user's role dashboard
  if (hasChecked && user) {
    const to = DASHBOARD_BY_ROLE[user.role];
    router.replace(to);
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">正在跳转...</p>
      </div>
    );
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const result = login(email, password);
    setLoading(false);
    if (result.ok) {
      // Always go to dashboard of the logged-in user's role
      const to = DASHBOARD_BY_ROLE[result.user.role];
      router.push(to);
      return;
    }
    setError(result.error ?? "登录失败");
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4 bg-muted/30">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl">登录</CardTitle>
          <CardDescription>使用邮箱和密码登录 EHF 患者数据钱包</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {registered && (
              <p className="text-sm text-green-600 dark:text-green-400 text-center">注册成功，请登录</p>
            )}
            {error && (
              <p className="text-sm text-destructive text-center">{error}</p>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">邮箱</Label>
              <Input
                id="email"
                type="email"
                placeholder="your@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">密码</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "登录中..." : "登录"}
            </Button>
          </form>
          <p className="text-center text-sm text-muted-foreground mt-4">
            还没有账号？{" "}
            <Link href="/register" className="text-primary underline-offset-4 hover:underline">
              注册
            </Link>
          </p>
          <p className="text-center text-xs text-muted-foreground mt-2">
            演示账号：patient@example.com / researcher@example.com / admin@example.com，密码均为 password
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center p-4">
        <p className="text-muted-foreground">加载中...</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
