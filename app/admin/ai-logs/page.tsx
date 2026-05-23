"use client";

import { useState, useEffect, useCallback } from "react";
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
import { TASK_TYPE_LABELS, formatEhfDate, parseApiErrorMessage } from "@/lib/api/constants";
import type { AiLog } from "@/lib/api/ehfTypes";
import { ehfAdminListAiLogs } from "@/lib/api/ehfClient";
import { extractPaginatedItems } from "@/lib/api/unwrapApiResponse";
import {
  AI_LOG_STATUS_FILTER_OPTIONS,
  getAiLogStatusLabel,
  getAiLogStatusVariant,
} from "@/lib/ai/aiLogDisplay";
import { normalizeAiLogRows } from "@/lib/ai/normalizeAiLogRow";

const PAGE_SIZE = 50;

export default function AdminAiLogsPage() {
  const [logs, setLogs] = useState<AiLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [taskTypeFilter, setTaskTypeFilter] = useState("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ehfAdminListAiLogs({
        page,
        page_size: PAGE_SIZE,
        status: statusFilter || undefined,
        task_type: taskTypeFilter || undefined,
      });
      const items = normalizeAiLogRows(data);
      setLogs(items);
      setTotal(
        typeof data === "object" && data !== null && "total" in data
          ? Number((data as { total?: number }).total) || items.length
          : items.length
      );
    } catch (e) {
      setError(parseApiErrorMessage(e));
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [page, statusFilter, taskTypeFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI 执行日志</h1>
        <p className="text-muted-foreground mt-1">
          查看 AI 任务执行记录（后端 status 多为 completed / failed / pending）
        </p>
      </div>

      <PageSection title="日志列表" description={`共 ${total} 条`}>
        <div className="flex gap-3 mb-4">
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
          >
            {AI_LOG_STATUS_FILTER_OPTIONS.map((opt) => (
              <option key={opt.value || "all"} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={taskTypeFilter}
            onChange={(e) => {
              setTaskTypeFilter(e.target.value);
              setPage(1);
            }}
          >
            <option value="">全部任务类型</option>
            {Object.entries(TASK_TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        </div>
        <Card>
          {error && <p className="p-4 text-destructive text-sm">{error}</p>}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>时间</TableHead>
                    <TableHead>任务类型</TableHead>
                    <TableHead>模型</TableHead>
                    <TableHead>状态</TableHead>
                    <TableHead>耗时</TableHead>
                    <TableHead>记录 ID</TableHead>
                    <TableHead>错误信息</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        暂无日志
                      </TableCell>
                    </TableRow>
                  ) : (
                    logs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                          {formatEhfDate(log.created_at, true)}
                        </TableCell>
                        <TableCell>
                          {TASK_TYPE_LABELS[log.task_type] ?? log.task_type}
                        </TableCell>
                        <TableCell className="text-sm">{log.model_name ?? "—"}</TableCell>
                        <TableCell>
                          <Badge variant={getAiLogStatusVariant(log.status, log)}>
                            {getAiLogStatusLabel(log.status, log)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.duration_ms != null ? `${log.duration_ms} ms` : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs truncate max-w-[120px]">
                          {log.record_id ?? "—"}
                        </TableCell>
                        <TableCell
                          className="text-sm text-muted-foreground max-w-[200px] truncate"
                          title={log.error_message ?? ""}
                        >
                          {log.error_message ?? "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t text-sm">
                  <span className="text-muted-foreground">
                    第 {page} / {totalPages} 页，共 {total} 条
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="rounded border px-3 py-1 disabled:opacity-50"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      上一页
                    </button>
                    <button
                      type="button"
                      className="rounded border px-3 py-1 disabled:opacity-50"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      下一页
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      </PageSection>
    </div>
  );
}
