"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ehfGetResearcherSummary } from "@/lib/api/ehfClient";
import type { ResearcherProfile } from "@/lib/api/ehfTypes";
import { parseApiErrorMessage } from "@/lib/api/constants";
import { PageSection } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Users, FileQuestion, Loader2 } from "lucide-react";

export default function ResearcherDashboardPage() {
  const { user } = useAuth();
  const profile = user?.profile as ResearcherProfile | null;
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof ehfGetResearcherSummary>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await ehfGetResearcherSummary();
        if (!cancelled) setSummary(data);
      } catch (err) {
        if (!cancelled) setError(parseApiErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">研究者工作台</h1>
        <p className="text-muted-foreground mt-1">管理研究项目与已授权患者数据</p>
      </div>

      {profile?.review_status === "pending" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 px-4 py-3 text-sm">
          您的账号正在等待管理员审核，审核通过后可创建研究项目。
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      <PageSection title="概览" description="项目与授权统计">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={FlaskConical} value={summary?.project_count ?? 0} label="我的项目" />
            <StatCard icon={Users} value={summary?.consented_patient_count ?? 0} label="已授权患者数" />
            <StatCard
              icon={FileQuestion}
              value={summary?.pending_request_count ?? 0}
              label="待处理资料请求"
            />
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground mb-1">审核状态</p>
                <Badge variant={profile?.review_status === "approved" ? "success" : "secondary"}>
                  {profile?.review_status === "approved"
                    ? "已通过"
                    : profile?.review_status === "rejected"
                      ? "已拒绝"
                      : "待审核"}
                </Badge>
              </CardContent>
            </Card>
          </div>
        )}
      </PageSection>

      <PageSection
        title="快捷操作"
        action={
          <Button asChild size="sm" disabled={profile?.review_status !== "approved"}>
            <Link href="/researcher/projects/new">创建研究项目</Link>
          </Button>
        }
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline" disabled={profile?.review_status !== "approved"}>
            <Link href="/researcher/projects/new">创建研究项目</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/researcher/projects">查看我的项目</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/researcher/requests">资料请求</Link>
          </Button>
        </div>
      </PageSection>
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof FlaskConical;
  value: number;
  label: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
