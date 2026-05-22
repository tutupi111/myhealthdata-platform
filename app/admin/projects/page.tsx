"use client";

import { useEffect, useState } from "react";
import { ehfAdminListProjects } from "@/lib/api/ehfClient";
import type { ResearchProject } from "@/lib/api/ehfTypes";
import { formatEhfDate, parseApiErrorMessage, projectStatusLabel } from "@/lib/api/constants";
import { PageSection } from "@/components/layout";
import { Card } from "@/components/ui/card";
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

export default function AdminProjectsPage() {
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await ehfAdminListProjects({ page_size: 100 });
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
        <h1 className="text-2xl font-semibold tracking-tight">项目管理</h1>
        <p className="text-muted-foreground mt-1">全平台研究项目</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <PageSection title="项目列表" description={`共 ${projects.length} 个项目`}>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>项目名称</TableHead>
                  <TableHead>机构</TableHead>
                  <TableHead>疾病方向</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>创建时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.title}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.organization_name ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.disease_type ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{projectStatusLabel(p.status)}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatEhfDate(p.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </PageSection>
    </div>
  );
}
