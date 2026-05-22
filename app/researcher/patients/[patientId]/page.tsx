"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ehfGetResearchPatient,
  ehfListResearchPatientRecords,
} from "@/lib/api/ehfClient";
import type { HealthRecord } from "@/lib/api/ehfTypes";
import { formatEhfDate, parseApiErrorMessage, recordTypeLabel } from "@/lib/api/constants";
import { PageSection } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";

export default function ResearcherPatientDetailPage() {
  const params = useParams();
  const patientDid = decodeURIComponent((params.patientId as string) ?? "");
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!patientDid) return;
    let cancelled = false;
    (async () => {
      try {
        const [p, recs] = await Promise.all([
          ehfGetResearchPatient(patientDid),
          ehfListResearchPatientRecords(patientDid, { page_size: 100 }),
        ]);
        if (!cancelled) {
          setProfile(p);
          setRecords(recs.items ?? []);
        }
      } catch (err) {
        if (!cancelled) setError(parseApiErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [patientDid]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error}</p>
        <Button variant="outline" asChild>
          <Link href="/researcher/projects">返回</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">患者资料摘要</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm break-all">{patientDid}</p>
      </div>

      <PageSection title="疾病概况">
        <Card>
          <CardContent className="pt-6">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">疾病类型</dt>
                <dd className="font-medium">
                  {String(profile?.disease_type ?? "—")}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">确诊时间</dt>
                <dd className="font-medium">
                  {String(profile?.diagnosis_date ?? "—")}
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </PageSection>

      <PageSection title="已授权资料" description={`共 ${records.length} 条`}>
        <Card>
          {records.length === 0 ? (
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              暂无资料记录
            </CardContent>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>类型</TableHead>
                  <TableHead>标题</TableHead>
                  <TableHead>日期</TableHead>
                  <TableHead>摘要</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-muted-foreground">
                      {recordTypeLabel(r.record_type ?? r.doc_type)}
                    </TableCell>
                    <TableCell className="font-medium">{r.title || r.file_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {r.record_date ?? formatEhfDate(r.created_at)}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {r.ai_summary ?? r.summary ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </Card>
      </PageSection>

      <Button variant="outline" asChild>
        <Link href="/researcher/projects">返回项目列表</Link>
      </Button>
    </div>
  );
}
