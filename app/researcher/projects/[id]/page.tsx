"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { ehfGetProject, ehfListConsentedPatients } from "@/lib/api/ehfClient";
import type { ResearchProject } from "@/lib/api/ehfTypes";
import { formatEhfDate, parseApiErrorMessage, projectStatusLabel, recordTypeLabel } from "@/lib/api/constants";
import { PageSection } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, FileText, Loader2 } from "lucide-react";

function statusVariant(status: string): "secondary" | "success" | "outline" {
  if (status === "published") return "success";
  if (status === "closed") return "secondary";
  return "outline";
}

export default function ResearcherProjectDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [project, setProject] = useState<ResearchProject | null>(null);
  const [patientCount, setPatientCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [proj, patients] = await Promise.all([
          ehfGetProject(id),
          ehfListConsentedPatients(id, { page_size: 1 }),
        ]);
        if (cancelled) return;
        setProject(proj);
        setPatientCount(patients.total ?? patients.items?.length ?? 0);
      } catch {
        if (!cancelled) setProject(null);
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

  if (!project) notFound();

  const scopeTypes =
    project.required_record_types?.length ? project.required_record_types : project.data_scope ?? [];

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>
          <p className="text-muted-foreground mt-1">
            {project.organization_name ?? "—"} · {project.disease_type ?? "—"}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={statusVariant(project.status)} className="text-sm">
            {projectStatusLabel(project.status)}
          </Badge>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/researcher/projects/${project.id}/patients`}>
              <Users className="h-4 w-4 mr-1" />
              患者列表 ({patientCount})
            </Link>
          </Button>
        </div>
      </div>

      <PageSection title="基本信息">
        <Card>
          <CardContent className="pt-6 space-y-4">
            {project.description && <p className="text-sm">{project.description}</p>}
            <p className="text-sm text-muted-foreground">
              更新时间：{formatEhfDate(project.updated_at)}
            </p>
          </CardContent>
        </Card>
      </PageSection>

      <PageSection title="所需资料">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              {scopeTypes.map((type) => (
                <Badge key={type} variant="secondary">
                  {recordTypeLabel(type)}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </PageSection>

      <PageSection title="已授权患者" description={`共 ${patientCount} 名患者`}>
        <Card>
          <CardContent className="pt-6">
            {patientCount === 0 ? (
              <p className="text-sm text-muted-foreground">暂无患者授权</p>
            ) : (
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm">可在患者列表中查看 DID 及授权范围</p>
              </div>
            )}
          </CardContent>
        </Card>
      </PageSection>

      <Button variant="outline" asChild>
        <Link href="/researcher/projects">返回项目列表</Link>
      </Button>
    </div>
  );
}
