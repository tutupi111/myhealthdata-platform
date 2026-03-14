"use client";

import Link from "next/link";
import {
  MOCK_ADMIN_STATS,
  MOCK_AUDIT_LOGS,
} from "@/lib/mock/admin";
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
import { Users, UserCheck, FlaskConical, ShieldCheck } from "lucide-react";

function roleLabel(role: "patient" | "researcher" | "admin"): string {
  if (role === "patient") return "患者";
  if (role === "researcher") return "研究者";
  return "管理员";
}

export default function AdminDashboardPage() {
  const { consents } = useMockStore();
  const recentLogs = MOCK_AUDIT_LOGS.slice(0, 5);
  const consentCount = consents.length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">系统概览</h1>
        <p className="text-muted-foreground mt-1">
          平台用户、项目与授权统计
        </p>
      </div>

      <PageSection title="统计" description="用户与业务数据概览">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{MOCK_ADMIN_STATS.patientCount}</p>
                  <p className="text-sm text-muted-foreground">患者数</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <UserCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{MOCK_ADMIN_STATS.researcherCount}</p>
                  <p className="text-sm text-muted-foreground">研究者数</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FlaskConical className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{MOCK_ADMIN_STATS.projectCount}</p>
                  <p className="text-sm text-muted-foreground">研究项目数</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <ShieldCheck className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{consentCount}</p>
                  <p className="text-sm text-muted-foreground">授权数</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageSection>

      <PageSection
        title="最近操作日志"
        description="系统审计记录"
        action={
          <Button asChild variant="outline" size="sm">
            <Link href="/admin/audit-logs">查看全部</Link>
          </Button>
        }
      >
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>操作人</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>动作</TableHead>
                <TableHead>对象</TableHead>
                <TableHead>时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLogs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.actorDisplay}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {roleLabel(log.actorRole)}
                  </TableCell>
                  <TableCell className="text-sm">{log.action}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {log.targetType}
                    {log.targetId ? ` #${log.targetId}` : ""}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {new Date(log.createdAt).toLocaleString("zh-CN")}
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
