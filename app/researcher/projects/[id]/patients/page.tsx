"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, notFound } from "next/navigation";
import { ehfGetProject, ehfListConsentedPatients } from "@/lib/api/ehfClient";
import type { ConsentedPatient, ResearchProject } from "@/lib/api/ehfTypes";
import { formatEhfDate, recordTypeLabel } from "@/lib/api/constants";
import { PageSection } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { FileText, Loader2 } from "lucide-react";

export default function ResearcherProjectPatientsPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [project, setProject] = useState<ResearchProject | null>(null);
  const [patients, setPatients] = useState<ConsentedPatient[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [proj, list] = await Promise.all([
          ehfGetProject(id),
          ehfListConsentedPatients(id, { page_size: 100 }),
        ]);
        if (cancelled) return;
        setProject(proj);
        setPatients(list.items ?? []);
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">已授权患者</h1>
          <p className="text-muted-foreground mt-1">
            {project.title} · 仅显示患者 DID
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/researcher/projects/${project.id}`}>返回项目详情</Link>
        </Button>
      </div>

      <PageSection title="患者列表" description={`共 ${patients.length} 名患者`}>
        <Card>
          {patients.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">暂无已授权患者</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>患者 DID</TableHead>
                  <TableHead>疾病类型</TableHead>
                  <TableHead>确诊时间</TableHead>
                  <TableHead>授权范围</TableHead>
                  <TableHead>授权时间</TableHead>
                  <TableHead>操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((p) => (
                  <TableRow key={p.consent_id}>
                    <TableCell className="font-mono text-sm">{p.patient_did}</TableCell>
                    <TableCell>{p.disease_type ?? "—"}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {p.diagnosis_date ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {p.authorization_scope.map(recordTypeLabel).join("、")}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatEhfDate(p.authorized_at)}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <Link
                          href={`/researcher/patients/${encodeURIComponent(p.patient_did)}?project=${project.id}`}
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          资料摘要
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </PageSection>
    </div>
  );
}
