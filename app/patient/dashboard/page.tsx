"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import {
  ehfListConsents,
  ehfListProjects,
} from "@/lib/api/ehfClient";
import type { Consent, PatientProfile, ResearchProject } from "@/lib/api/ehfTypes";
import {
  consentStatusLabel,
  formatEhfDate,
  isProjectRecruiting,
  parseApiErrorMessage,
  projectStatusLabel,
} from "@/lib/api/constants";
import { PageSection } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, FlaskConical, ShieldCheck, Copy, Loader2 } from "lucide-react";

export default function PatientDashboardPage() {
  const { user } = useAuth();
  const profile = user?.profile as PatientProfile | null;
  const [recordCount, setRecordCount] = useState(0);
  const [consents, setConsents] = useState<Consent[]>([]);
  const [studies, setStudies] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const [summaryRes, consentsRes, projectsRes] = await Promise.all([
          import("@/lib/api/ehfClient").then((m) => m.ehfGetPatientSummary()),
          ehfListConsents({ page_size: 10 }),
          ehfListProjects({ page_size: 20 }),
        ]);
        if (cancelled) return;
        setRecordCount(summaryRes.health_record_count ?? 0);
        setConsents(consentsRes.items ?? []);
        setStudies(
          (projectsRes.items ?? []).filter((p) => isProjectRecruiting(p.status))
        );
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

  const did = profile?.did ?? "—";
  const recentConsents = consents.slice(0, 2);

  const copyDid = () => {
    if (profile?.did) navigator.clipboard.writeText(profile.did).catch(() => {});
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">欢迎回来</h1>
        <p className="text-muted-foreground mt-1">
          管理您的健康档案并参与医学研究
        </p>
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}

      <PageSection title="我的健康身份" description="您的去中心化身份标识，用于安全授权数据使用">
        <Card className="overflow-hidden">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-2">
              <CardTitle className="text-base font-medium">DID</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                aria-label="复制 DID"
                onClick={copyDid}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <p className="font-mono text-sm text-muted-foreground break-all">{did}</p>
          </CardContent>
        </Card>
      </PageSection>

      <div className="grid gap-6 md:grid-cols-2">
        <PageSection title="健康档案摘要" description="基于您上传的资料自动整理">
          <Card>
            <CardContent className="pt-6">
              <dl className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">疾病类型</dt>
                  <dd className="font-medium">{profile?.disease_type ?? "—"}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">确诊时间</dt>
                  <dd className="font-medium">{profile?.diagnosis_date ?? "—"}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </PageSection>

        <PageSection title="资料数量统计" description="已上传的健康档案">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{recordCount}</p>
                  <p className="text-sm text-muted-foreground">条健康记录</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </PageSection>
      </div>

      <PageSection title="快捷操作" description="常用功能入口">
        <div className="grid gap-3 sm:grid-cols-3">
          <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
            <Link href="/patient/upload">
              <Upload className="h-5 w-5" />
              <span>上传资料</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
            <Link href="/patient/records">
              <FileText className="h-5 w-5" />
              <span>查看档案</span>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto flex-col gap-2 py-4">
            <Link href="/patient/studies">
              <FlaskConical className="h-5 w-5" />
              <span>浏览研究</span>
            </Link>
          </Button>
        </div>
      </PageSection>

      <PageSection
        title="可参与研究项目"
        description={`${studies.length} 个项目正在招募`}
        action={
          <Button asChild variant="secondary" size="sm">
            <Link href="/patient/studies">查看全部</Link>
          </Button>
        }
      >
        <ul className="space-y-3">
          {studies.slice(0, 2).map((study) => (
            <li key={study.id}>
              <Link href={`/patient/studies/${study.id}`}>
                <Card className="transition-colors hover:bg-muted/50">
                  <CardContent className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="font-medium">{study.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {study.organization_name ?? "—"} · {study.disease_type ?? "—"}
                      </p>
                    </div>
                    <Badge variant="success">{projectStatusLabel(study.status)}</Badge>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
          {studies.length === 0 && (
            <li className="text-sm text-muted-foreground">暂无招募中的项目</li>
          )}
        </ul>
      </PageSection>

      <PageSection
        title="最近授权记录"
        description="您已授权的研究项目"
        action={
          <Button asChild variant="ghost" size="sm">
            <Link href="/patient/consents">查看全部</Link>
          </Button>
        }
      >
        <ul className="space-y-3">
          {recentConsents.map((c) => (
            <li key={c.id}>
              <Card>
                <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-2">
                    <ShieldCheck className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{c.project_title ?? c.project_id}</p>
                      <p className="text-sm text-muted-foreground">
                        授权于 {formatEhfDate(c.created_at)}
                        {c.expired_at != null && ` · 到期 ${formatEhfDate(c.expired_at)}`}
                      </p>
                    </div>
                  </div>
                  <Badge
                    variant={
                      c.status === "active" ? "success" : c.status === "expired" ? "secondary" : "outline"
                    }
                  >
                    {consentStatusLabel(c.status)}
                  </Badge>
                </CardContent>
              </Card>
            </li>
          ))}
          {recentConsents.length === 0 && (
            <li className="text-sm text-muted-foreground">暂无授权记录</li>
          )}
        </ul>
      </PageSection>
    </div>
  );
}
