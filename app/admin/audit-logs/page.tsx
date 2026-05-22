"use client";

import { useEffect, useState } from "react";
import { ehfAdminListAuditLogs } from "@/lib/api/ehfClient";
import type { AuditLog } from "@/lib/api/ehfTypes";
import { formatEhfDate, parseApiErrorMessage } from "@/lib/api/constants";
import { PageSection } from "@/components/layout";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";

export default function AdminAuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await ehfAdminListAuditLogs({ page_size: 100 });
        if (!cancelled) setLogs(data.items ?? []);
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
        <h1 className="text-2xl font-semibold tracking-tight">审计日志</h1>
        <p className="text-muted-foreground mt-1">系统关键操作记录</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <PageSection title="日志列表" description={`共 ${logs.length} 条`}>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
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
                {logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell className="font-medium">
                      {log.actor_display ?? log.actor_id ?? "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {log.actor_role ?? "—"}
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
        )}
      </PageSection>
    </div>
  );
}
