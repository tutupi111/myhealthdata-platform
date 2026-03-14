"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useMockStore } from "@/context/MockStoreContext";
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
import { FileText } from "lucide-react";

export default function ResearcherPatientDetailPage() {
  const params = useParams();
  const patientDid = decodeURIComponent((params.patientId as string) ?? "");
  const { healthRecords, getPatientProfile } = useMockStore();
  const profile = getPatientProfile(patientDid);
  const records = healthRecords.filter((r) => r.patientDid === patientDid);

  if (!patientDid) notFound();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">患者资料摘要</h1>
        <p className="text-muted-foreground mt-1 font-mono text-sm">
          {patientDid}
        </p>
      </div>
      <PageSection title="疾病概况" description="脱敏信息">
        <Card>
          <CardContent className="pt-6">
            <dl className="grid gap-2 text-sm sm:grid-cols-2">
              <div>
                <dt className="text-muted-foreground">疾病类型</dt>
                <dd className="font-medium">{profile?.diseaseType ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">确诊时间</dt>
                <dd className="font-medium">{profile?.diagnosisDate ?? "—"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </PageSection>
      <PageSection
        title="已授权资料"
        description={`共 ${records.length} 条记录（仅显示您已授权范围内的类型）`}
      >
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
                      {r.recordType}
                    </TableCell>
                    <TableCell className="font-medium">{r.title}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {r.recordDate}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px] truncate">
                      {r.summary ?? "—"}
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
