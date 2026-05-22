"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ehfListProjects } from "@/lib/api/ehfClient";
import type { ResearchProject } from "@/lib/api/ehfTypes";
import {
  formatEhfDate,
  isProjectRecruiting,
  parseApiErrorMessage,
  projectStatusLabel,
  recordTypeLabel,
} from "@/lib/api/constants";
import { PageSection } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FlaskConical, Loader2 } from "lucide-react";

export default function PatientStudiesPage() {
  const [studies, setStudies] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [diseaseFilter, setDiseaseFilter] = useState("all");
  const [orgFilter, setOrgFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "recruiting" | "closed">("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await ehfListProjects({ page_size: 100 });
        if (!cancelled) setStudies(data.items ?? []);
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

  const orgs = useMemo(
    () => Array.from(new Set(studies.map((s) => s.organization_name).filter(Boolean))).sort(),
    [studies]
  );
  const diseases = useMemo(
    () => Array.from(new Set(studies.map((s) => s.disease_type).filter(Boolean))).sort(),
    [studies]
  );

  const filtered = studies.filter((s) => {
    if (diseaseFilter !== "all" && s.disease_type !== diseaseFilter) return false;
    if (orgFilter !== "all" && s.organization_name !== orgFilter) return false;
    if (statusFilter === "recruiting" && !isProjectRecruiting(s.status)) return false;
    if (statusFilter === "closed" && s.status !== "closed") return false;
    return true;
  });

  const scopeTypes = (s: ResearchProject) =>
    s.required_record_types?.length ? s.required_record_types : s.data_scope ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">研究项目</h1>
        <p className="text-muted-foreground mt-1">
          浏览可参与的医学研究，授权后研究者可在约定范围内使用您的脱敏数据
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <PageSection title="筛选" description="按疾病类型、机构或招募状态筛选">
        <div className="flex flex-wrap gap-3">
          <select
            value={diseaseFilter}
            onChange={(e) => setDiseaseFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">全部疾病类型</option>
            {diseases.map((d) => (
              <option key={d} value={d!}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={orgFilter}
            onChange={(e) => setOrgFilter(e.target.value)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">全部机构</option>
            {orgs.map((o) => (
              <option key={o} value={o!}>
                {o}
              </option>
            ))}
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            <option value="all">全部状态</option>
            <option value="recruiting">招募中</option>
            <option value="closed">已结束</option>
          </select>
        </div>
      </PageSection>

      <PageSection title="项目列表" description={`共 ${filtered.length} 个项目`}>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ul className="space-y-4">
            {filtered.length === 0 ? (
              <li>
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    暂无匹配项目
                  </CardContent>
                </Card>
              </li>
            ) : (
              filtered.map((study) => (
                <li key={study.id}>
                  <Link href={`/patient/studies/${study.id}`}>
                    <Card className="transition-colors hover:bg-muted/50">
                      <CardContent className="py-5">
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                          <div className="flex gap-3 min-w-0">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                              <FlaskConical className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold">{study.title}</p>
                              <p className="text-sm text-muted-foreground mt-0.5">
                                {study.organization_name ?? "—"}
                              </p>
                              <p className="text-sm text-muted-foreground">
                                {study.disease_type ?? "—"}
                              </p>
                              <div className="flex flex-wrap gap-1 mt-2">
                                {scopeTypes(study).slice(0, 3).map((t) => (
                                  <Badge key={t} variant="secondary" className="text-xs">
                                    {recordTypeLabel(t)}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge variant={isProjectRecruiting(study.status) ? "success" : "secondary"}>
                              {projectStatusLabel(study.status)}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              更新于 {formatEhfDate(study.updated_at)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </li>
              ))
            )}
          </ul>
        )}
      </PageSection>
    </div>
  );
}
