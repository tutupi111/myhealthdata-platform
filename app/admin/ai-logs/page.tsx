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
import { TASK_TYPE_LABELS } from "@/lib/types/ai-config";
import type { AiLog, TaskType } from "@/lib/types/ai-config";
import { Loader2 } from "lucide-react";

const API = "/api/admin/ai-logs";
const PAGE_SIZE = 50;

function statusVariant(s: string): "success" | "destructive" | "secondary" {
  if (s === "success") return "success";
  if (s === "failed") return "destructive";
  return "secondary";
}

function statusLabel(s: string): string {
  if (s === "success") return "成功";
  if (s === "failed") return "失败";
  return "待处理";
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AdminAiLogsPage() {
  const [logs, setLogs] = useState<AiLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [taskTypeFilter, setTaskTypeFilter] = useState<string>("");

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("limit", String(PAGE_SIZE));
      params.set("offset", String(offset));
      if (statusFilter) params.set("status", statusFilter);
      if (taskTypeFilter) params.set("task_type", taskTypeFilter);
      const res = await fetch(API + "?" + params.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "加载失败");
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
      setLogs([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, [offset, statusFilter, taskTypeFilter]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const totalPages = Math.ceil(total / PAGE_SIZE);
  const currentPage = Math.floor(offset / PAGE_SIZE) + 1;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI 执行日志</h1>
        <p className="text-muted-foreground mt-1">
          查看 AI 任务执行记录，本阶段多为空，后续接入解析后自动写入
        </p>
      </div>

      <PageSection
        title="日志列表"
        description={`共 ${total} 条，支持按状态与任务类型筛选`}
      >
        <div className="flex gap-3 mb-4">
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">全部状态</option>
            <option value="success">成功</option>
            <option value="failed">失败</option>
            <option value="pending">待处理</option>
          </select>
          <select
            className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
            value={taskTypeFilter}
            onChange={(e) => {
              setTaskTypeFilter(e.target.value);
              setOffset(0);
            }}
          >
            <option value="">全部任务类型</option>
            <option value="ocr_extract">OCR 识别</option>
            <option value="doc_classify">文档分类</option>
            <option value="structured_extract">结构化抽取</option>
            <option value="tagging">标签生成</option>
            <option value="summary">摘要生成</option>
          </select>
        </div>
        <Card>
          {error && (
            <p className="p-4 text-destructive text-sm">{error}</p>
          )}
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
                          {formatDate(log.created_at)}
                        </TableCell>
                        <TableCell>
                          {TASK_TYPE_LABELS[log.task_type as TaskType] ?? log.task_type}
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.model_name ?? "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(log.status)}>
                            {statusLabel(log.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {log.duration_ms != null ? log.duration_ms + " ms" : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs truncate max-w-[120px]">
                          {log.record_id ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-[200px] truncate" title={log.error_message ?? ""}>
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
                    第 {currentPage} / {totalPages} 页，共 {total} 条
                  </span>
                  <div className="flex gap-2">
                    <button
                      className="rounded border px-3 py-1 disabled:opacity-50"
                      disabled={offset === 0}
                      onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
                    >
                      上一页
                    </button>
                    <button
                      className="rounded border px-3 py-1 disabled:opacity-50"
                      disabled={offset + PAGE_SIZE >= total}
                      onClick={() => setOffset((o) => o + PAGE_SIZE)}
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
