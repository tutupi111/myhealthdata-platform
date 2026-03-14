"use client";

import { MOCK_ADMIN_RESEARCHERS } from "@/lib/mock/admin";
import { PageSection } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function statusVariant(
  status: "active" | "pending" | "disabled"
): "success" | "warning" | "secondary" {
  if (status === "active") return "success";
  if (status === "pending") return "warning";
  return "secondary";
}

function statusLabel(status: "active" | "pending" | "disabled"): string {
  if (status === "active") return "正常";
  if (status === "pending") return "待激活";
  return "已禁用";
}

function reviewVariant(
  review: "pending" | "approved" | "rejected"
): "warning" | "success" | "destructive" {
  if (review === "approved") return "success";
  if (review === "rejected") return "destructive";
  return "warning";
}

function reviewLabel(review: "pending" | "approved" | "rejected"): string {
  if (review === "approved") return "已通过";
  if (review === "rejected") return "已驳回";
  return "待审核";
}

export default function AdminResearchersPage() {
  const handleApprove = (id: string) => {
    // Mock: no API
    console.log("approve", id);
  };
  const handleReject = (id: string) => {
    // Mock: no API
    console.log("reject", id);
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">研究者管理</h1>
        <p className="text-muted-foreground mt-1">
          研究者账号与审核状态
        </p>
      </div>

      <PageSection
        title="研究者列表"
        description={`共 ${MOCK_ADMIN_RESEARCHERS.length} 名研究者`}
      >
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>姓名</TableHead>
                <TableHead>机构</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>审核状态</TableHead>
                <TableHead>注册时间</TableHead>
                <TableHead className="w-[140px]">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_ADMIN_RESEARCHERS.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.fullName}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.organization}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(r.status)}>
                      {statusLabel(r.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={reviewVariant(r.reviewStatus)}>
                      {reviewLabel(r.reviewStatus)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {r.registeredAt}
                  </TableCell>
                  <TableCell>
                    {r.reviewStatus === "pending" && (
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApprove(r.id)}
                        >
                          通过
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleReject(r.id)}
                        >
                          驳回
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </PageSection>
    </div>
  );
}
