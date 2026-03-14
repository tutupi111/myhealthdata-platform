import Link from "next/link";
import { notFound } from "next/navigation";
import {
  MOCK_RESEARCHER_PROJECTS,
  MOCK_PROJECT_PATIENTS,
} from "@/lib/mock/researcher";
import { PageSection } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Users, FileText } from "lucide-react";

function statusVariant(
  status: "draft" | "published" | "closed"
): "secondary" | "success" | "outline" {
  if (status === "published") return "success";
  if (status === "closed") return "secondary";
  return "outline";
}

function statusLabel(status: "draft" | "published" | "closed"): string {
  if (status === "draft") return "草稿";
  if (status === "published") return "已发布";
  return "已结束";
}

export default function ResearcherProjectDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const project = MOCK_RESEARCHER_PROJECTS.find((p) => p.id === params.id);
  if (!project) notFound();

  const patients = MOCK_PROJECT_PATIENTS[project.id] ?? [];
  const patientCount = patients.length;

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {project.title}
          </h1>
          <p className="text-muted-foreground mt-1">
            {project.organization} · {project.diseaseType}
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant={statusVariant(project.status)} className="text-sm">
            {statusLabel(project.status)}
          </Badge>
          <Button variant="outline" size="sm" asChild>
            <Link href={`/researcher/projects/${project.id}/patients`}>
              <Users className="h-4 w-4 mr-1" />
              患者列表 ({patientCount})
            </Link>
          </Button>
        </div>
      </div>

      <PageSection title="基本信息" description="项目描述与联系方式">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                研究简介
              </h3>
              <p className="text-sm">{project.description}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-2 text-sm">
              <div>
                <span className="text-muted-foreground">授权期限：</span>
                <span>{project.authorizationDurationDays} 天</span>
              </div>
              <div>
                <span className="text-muted-foreground">联系方式：</span>
                <span>{project.contactEmail || "—"}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      <PageSection title="纳排标准" description="纳入与排除标准">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                纳入标准
              </h3>
              <p className="text-sm">{project.inclusionCriteria}</p>
            </div>
            <div>
              <h3 className="text-sm font-medium text-muted-foreground mb-1">
                排除标准
              </h3>
              <p className="text-sm">{project.exclusionCriteria}</p>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      <PageSection title="所需资料" description="患者授权后可访问的资料类型">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              {project.requiredRecordTypes.map((type) => (
                <Badge key={type} variant="secondary">
                  {type}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      </PageSection>

      <PageSection
        title="已授权患者"
        description={`共 ${patientCount} 名患者授权参与（仅显示 DID，不显示真实身份）`}
        action={
          patientCount > 0 ? (
            <Button asChild size="sm">
              <Link href={`/researcher/projects/${project.id}/patients`}>
                查看患者列表
              </Link>
            </Button>
          ) : null
        }
      >
        <Card>
          <CardContent className="pt-6">
            {patientCount === 0 ? (
              <p className="text-sm text-muted-foreground">
                暂无患者授权，项目发布后患者可在患者端浏览并授权参与。
              </p>
            ) : (
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-muted-foreground" />
                <p className="text-sm">
                  已授权 {patientCount} 名患者，可在患者列表中查看 DID 及授权范围。
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </PageSection>

      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link href="/researcher/projects">返回项目列表</Link>
        </Button>
      </div>
    </div>
  );
}
