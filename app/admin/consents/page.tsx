"use client";

import { useMockStore } from "@/context/MockStoreContext";
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

function statusVariant(
  status: "active" | "expired" | "revoked"
): "success" | "secondary" | "outline" {
  if (status === "active") return "success";
  if (status === "expired") return "secondary";
  return "outline";
}

function statusLabel(status: "active" | "expired" | "revoked"): string {
  if (status === "active") return "有效";
  if (status === "expired") return "已到期";
  return "已撤回";
}

export default function AdminConsentsPage() {
  const { consents } = useMockStore();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">授权记录</h1>
        <p className="text-muted-foreground mt-1">
          患者对研究项目的授权记录
        </p>
      </div>

      <PageSection
        title="授权列表"
        description={`共 ${consents.length} 条授权`}
      >
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>患者 DID</TableHead>
                <TableHead>项目名称</TableHead>
                <TableHead>授权范围</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>授权时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {consents.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground text-sm">
                    暂无授权记录
                  </TableCell>
                </TableRow>
              ) : (
                consents.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm">{c.patientDid}</TableCell>
                    <TableCell className="font-medium">{c.projectTitle}</TableCell>
                    <TableCell className="text-muted-foreground text-sm max-w-[200px]">
                      {c.authorizationScope.join("、")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(c.status)}>
                        {statusLabel(c.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {c.authorizedAt}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Card>
      </PageSection>
    </div>
  );
}
