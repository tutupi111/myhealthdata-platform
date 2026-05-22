"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ehfListMyProjects } from "@/lib/api/ehfClient";
import type { ResearchProject } from "@/lib/api/ehfTypes";
import { formatEhfDate, parseApiErrorMessage, projectStatusLabel } from "@/lib/api/constants";
import { PageSection } from "@/components/layout";
import { Card } from "@/components/ui/card";
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
import { Loader2 } from "lucide-react";

function statusVariant(status: string): "secondary" | "success" | "outline" {
  if (status === "published") return "success";
  if (status === "closed") return "secondary";
  return "outline";
}

export default function ResearcherProjectsPage() {
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await ehfListMyProjects({ page_size: 100 });
        if (!cancelled) setProjects(data.items ?? []);
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

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">我的项目</h1>
        <p className="text-muted-foreground mt-1">管理您创建的研究项目，查看已授权患者</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <PageSection
        title="项目列表"
        description={`共 ${projects.length} 个项目`}
        action={
          <Button asChild size="sm">
            <Link href="/researcher/projects/new">创建研究项目</Link>
          </Button>
        }
      >
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
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
                {projects.map((project) => {
                  const consentedCount = project.consented_count ?? 0;
                  return (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.title}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {project.disease_type ?? "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(project.status)}>
                          {projectStatusLabel(project.status)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{consentedCount}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatEhfDate(project.updated_at)}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/researcher/projects/${project.id}`}>详情</Link>
                          </Button>
                          {consentedCount > 0 && (
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/researcher/projects/${project.id}/patients`}>
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
        )}
      </PageSection>
    </div>
  );
}
