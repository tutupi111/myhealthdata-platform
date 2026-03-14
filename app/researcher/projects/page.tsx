"use client";

import Link from "next/link";
import { MOCK_RESEARCHER_PROJECTS } from "@/lib/mock/researcher";
import { useMockStore } from "@/context/MockStoreContext";
import { PageSection } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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

export default function ResearcherProjectsPage() {
  const { consents } = useMockStore();

  const countByProject = consents.reduce<Record<string, number>>((acc, c) => {
    if (c.status !== "active") return acc;
    acc[c.projectId] = (acc[c.projectId] ?? 0) + 1;
    return acc;
  }, {});

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">我的项目</h1>
        <p className="text-muted-foreground mt-1">
          管理您创建的研究项目，查看已授权患者
        </p>
      </div>

      <PageSection
        title="项目列表"
        description={`共 ${MOCK_RESEARCHER_PROJECTS.length} 个项目`}
        action={
          <Button asChild size="sm">
            <Link href="/researcher/projects/new">创建研究项目</Link>
          </Button>
        }
      >
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名称</TableHead>
                <TableHead>疾病方向</TableHead>
                <TableHead>状态</TableHead>
                <TableHead className="text-right">已授权人数</TableHead>
                <TableHead>更新时间</TableHead>
                <TableHead className="w-[140px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_RESEARCHER_PROJECTS.map((project) => {
                const consentedCount = countByProject[project.id] ?? 0;
                return (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">{project.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {project.diseaseType}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(project.status)}>
                        {statusLabel(project.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      {consentedCount}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {project.updatedAt}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="sm" asChild>
                          <Link href={`/researcher/projects/${project.id}`}>
                            详情
                          </Link>
                        </Button>
                        {consentedCount > 0 && (
                          <Button variant="outline" size="sm" asChild>
                            <Link
                              href={`/researcher/projects/${project.id}/patients`}
                            >
                              患者列表
                            </Link>
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Card>
      </PageSection>
    </div>
  );
}
