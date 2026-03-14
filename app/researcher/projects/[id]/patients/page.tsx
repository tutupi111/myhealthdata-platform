"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { notFound } from "next/navigation";
import { MOCK_RESEARCHER_PROJECTS } from "@/lib/mock/researcher";
import { useMockStore } from "@/context/MockStoreContext";
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
import { FileText, Send } from "lucide-react";

export default function ResearcherProjectPatientsPage() {
  const params = useParams();
  const { consents, healthRecords, getPatientProfile } = useMockStore();
  const project = MOCK_RESEARCHER_PROJECTS.find((p) => p.id === params.id);
  if (!project) notFound();

  const projectConsents = consents.filter(
    (c) => c.projectId === project.id && c.status === "active"
  );

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">已授权患者</h1>
          <p className="text-muted-foreground mt-1">
            {project.title} · 仅显示患者 DID，不显示真实身份
          </p>
        </div>
        <Button variant="outline" size="sm" asChild>
          <Link href={`/researcher/projects/${project.id}`}>返回项目详情</Link>
        </Button>
      </div>

      <PageSection
        title="患者列表"
        description={`共 ${projectConsents.length} 名患者已授权本项目的资料使用`}
      >
        <Card>
          {projectConsents.length === 0 ? (
            <div className="py-12 text-center text-muted-foreground text-sm">
              暂无已授权患者
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>患者 DID</TableHead>
                  <TableHead>疾病类型</TableHead>
                  <TableHead>确诊时间</TableHead>
                  <TableHead>已授权资料类型</TableHead>
                  <TableHead>资料摘要</TableHead>
                  <TableHead>授权时间</TableHead>
                  <TableHead className="w-[180px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectConsents.map((consent) => {
                  const profile = getPatientProfile(consent.patientDid);
                  const scopeRecords = healthRecords.filter(
                    (r) =>
                      r.patientDid === consent.patientDid &&
                      consent.authorizationScope.includes(r.recordType)
                  );
                  return (
                    <TableRow key={consent.id}>
                      <TableCell className="font-mono text-sm">
                        {consent.patientDid}
                      </TableCell>
                      <TableCell>
                        {profile?.diseaseType ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {profile?.diagnosisDate ?? "—"}
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">
                          {consent.authorizationScope.join("、")}
                        </span>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm max-w-[200px]">
                        {scopeRecords.length === 0 ? (
                          "暂无匹配资料"
                        ) : (
                          <span>
                            共 {scopeRecords.length} 条：
                            {scopeRecords.slice(0, 2).map((r) => r.title).join("；")}
                            {scopeRecords.length > 2 && "…"}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {consent.authorizedAt}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link
                              href={`/researcher/patients/${encodeURIComponent(consent.patientDid)}`}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              资料摘要
                            </Link>
                          </Button>
                          <Button variant="outline" size="sm">
                            <Send className="h-4 w-4 mr-1" />
                            补充请求
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </Card>
      </PageSection>
    </div>
  );
}
