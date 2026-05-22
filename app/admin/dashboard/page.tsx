"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ehfAdminDashboardStats,
  ehfAdminListAuditLogs,
} from "@/lib/api/ehfClient";
import type { AdminDashboardStats, AuditLog } from "@/lib/api/ehfTypes";
import { formatEhfDate, parseApiErrorMessage } from "@/lib/api/constants";
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
import { Users, UserCheck, FlaskConical, ShieldCheck, Loader2 } from "lucide-react";

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<AdminDashboardStats | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [s, l] = await Promise.all([
          ehfAdminDashboardStats(),
          ehfAdminListAuditLogs({ page: 1, page_size: 5 }),
        ]);
        if (!cancelled) {
          setStats(s);
          setLogs(l.items ?? []);
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
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">系统概览</h1>
        <p className="text-muted-foreground mt-1">平台用户、项目与授权统计</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <PageSection title="统计">
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Users} value={stats?.patient_count ?? 0} label="患者数" />
            <StatCard icon={UserCheck} value={stats?.researcher_count ?? 0} label="研究者数" />
            <StatCard icon={FlaskConical} value={stats?.project_count ?? 0} label="研究项目数" />
            <StatCard icon={ShieldCheck} value={stats?.consent_count ?? 0} label="授权数" />
          </div>
        )}
      </PageSection>

      <PageSection
        title="最近操作日志"
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
                <TableHead>动作</TableHead>
                <TableHead>对象</TableHead>
                <TableHead>时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">
                    {log.actor_display ?? log.actor_id ?? "—"}
                  </TableCell>
                  <TableCell className="text-sm">{log.action}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {log.target_type}
                    {log.target_id ? ` #${log.target_id}` : ""}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {formatEhfDate(log.created_at, true)}
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

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof Users;
  value: number;
  label: string;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Icon className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-2xl font-semibold">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
