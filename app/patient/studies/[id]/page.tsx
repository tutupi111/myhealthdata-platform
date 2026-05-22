"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ehfCreateConsent,
  ehfGetProject,
  ehfListConsents,
} from "@/lib/api/ehfClient";
import type { Consent, ResearchProject } from "@/lib/api/ehfTypes";
import {
  isProjectRecruiting,
  parseApiErrorMessage,
  projectStatusLabel,
  recordTypeLabel,
} from "@/lib/api/constants";
import { PageSection } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Loader2 } from "lucide-react";

export default function PatientStudyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params.id === "string" ? params.id : "";
  const [study, setStudy] = useState<ResearchProject | null>(null);
  const [existingConsent, setExistingConsent] = useState<Consent | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [project, consentsRes] = await Promise.all([
          ehfGetProject(id),
          ehfListConsents({ page_size: 100 }),
        ]);
        if (cancelled) return;
        setStudy(project);
        const active = (consentsRes.items ?? []).find(
          (c) => c.project_id === id && c.status === "active"
        );
        setExistingConsent(active ?? null);
      } catch {
        if (!cancelled) setStudy(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!study) notFound();

  const scopeTypes =
    study.required_record_types?.length ? study.required_record_types : study.data_scope ?? [];
  const canConsent = isProjectRecruiting(study.status) && !existingConsent;

  const handleConsent = async () => {
    if (!canConsent) return;
    setSubmitting(true);
    setError(null);
    try {
      await ehfCreateConsent({
        project_id: study.id,
        authorization_scope: scopeTypes.length ? scopeTypes : study.data_scope,
        allow_follow_up_contact: false,
      });
      router.push("/patient/consents");
    } catch (err) {
      setError(parseApiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{study.title}</h1>
          <p className="text-muted-foreground mt-1">
            {study.organization_name ?? "—"} · {study.disease_type ?? "—"}
          </p>
        </div>
        <Badge variant={isProjectRecruiting(study.status) ? "success" : "secondary"}>
          {projectStatusLabel(study.status)}
        </Badge>
      </div>

      <PageSection title="项目介绍" description="研究目标与所需资料">
        <Card>
          <CardContent className="pt-6 space-y-4">
            {study.description && (
              <p className="text-sm text-muted-foreground">{study.description}</p>
            )}
            <div>
              <h3 className="text-sm font-medium mb-1">所需资料类型</h3>
              <div className="flex flex-wrap gap-2">
                {scopeTypes.map((t) => (
                  <Badge key={t} variant="secondary">
                    {recordTypeLabel(t)}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      <PageSection title="授权参与">
        <Card>
          <CardContent className="pt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {error && <p className="text-sm text-destructive w-full">{error}</p>}
            {existingConsent ? (
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span className="text-sm">您已授权参与本项目</span>
              </div>
            ) : canConsent ? (
              <>
                <p className="text-sm text-muted-foreground">
                  授权范围：{scopeTypes.map(recordTypeLabel).join("、") || "项目默认范围"}
                </p>
                <Button onClick={handleConsent} disabled={submitting}>
                  <ShieldCheck className="h-4 w-4 mr-1" />
                  {submitting ? "提交中…" : "授权参与"}
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">本项目当前未开放招募</p>
            )}
          </CardContent>
        </Card>
      </PageSection>

      <Button variant="outline" asChild>
        <Link href="/patient/studies">返回研究项目列表</Link>
      </Button>
    </div>
  );
}
