"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  ehfGetHealthRecord,
  ehfOpenHealthRecordDownload,
  ehfProcessHealthRecord,
} from "@/lib/api/ehfClient";
import type { HealthRecord } from "@/lib/api/ehfTypes";
import {
  fileTypeLabel,
  formatEhfDate,
  parseApiErrorMessage,
  processingStatusLabel,
} from "@/lib/api/constants";
import { PageSection } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Loader2, ExternalLink } from "lucide-react";

interface RecordDetailClientProps {
  recordId: string;
}

export function RecordDetailClient({ recordId }: RecordDetailClientProps) {
  const [record, setRecord] = useState<HealthRecord | null | "loading">("loading");
  const [pollError, setPollError] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const processTriggeredRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await ehfGetHealthRecord(recordId);
      if (mountedRef.current) setRecord(data);
      return data;
    } catch {
      if (mountedRef.current) setRecord(null);
      return null;
    }
  }, [recordId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!record || record === "loading" || typeof record !== "object") return;
    const shouldTrigger =
      (record.processing_status === "uploaded" ||
        record.processing_status === "processing") &&
      !processTriggeredRef.current;
    if (!shouldTrigger) return;

    processTriggeredRef.current = true;
    ehfProcessHealthRecord(recordId)
      .then((updated) => {
        if (mountedRef.current) setRecord(updated);
      })
      .catch(() => {});
  }, [recordId, record]);

  const isProcessing =
    record &&
    record !== "loading" &&
    typeof record === "object" &&
    (record.processing_status === "processing" ||
      record.processing_status === "uploaded");

  useEffect(() => {
    if (!recordId || !isProcessing) return;
    const timer = setInterval(() => {
      load().then((data) => {
        if (data) setPollError(false);
        else setPollError(true);
      });
    }, 3000);
    return () => clearInterval(timer);
  }, [recordId, isProcessing, load]);

  const handleDownload = async () => {
    setDownloadError(null);
    try {
      await ehfOpenHealthRecordDownload(recordId);
    } catch (err) {
      setDownloadError(parseApiErrorMessage(err));
    }
  };

  if (record === "loading") {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">记录不存在或加载失败</p>
        <Button variant="outline" asChild>
          <Link href="/patient/records">返回健康档案</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{record.file_name}</h1>
          <p className="text-muted-foreground mt-1">
            {fileTypeLabel(record.file_type)}
            {record.created_at && ` · ${formatEhfDate(record.created_at, true)}`}
          </p>
        </div>
        <Badge variant="secondary">{processingStatusLabel(record.processing_status)}</Badge>
      </div>

      {pollError && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 px-4 py-2 text-sm text-amber-800 dark:text-amber-200">
          获取最新状态失败，正在自动重试…
        </div>
      )}

      {isProcessing && (
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
          <span>正在解析资料，约每 3 秒自动更新</span>
        </div>
      )}

      <PageSection title="记录信息" description="该条健康资料的完整信息">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <dl className="grid gap-4 sm:grid-cols-1 text-sm">
              <div>
                <dt className="text-muted-foreground mb-0.5">文件名</dt>
                <dd className="font-medium">{record.file_name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground mb-0.5">文档类型</dt>
                <dd className="font-medium">{record.doc_type ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground mb-0.5">文件大小</dt>
                <dd className="font-medium">
                  {record.file_size != null
                    ? `${(record.file_size / 1024).toFixed(1)} KB`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground mb-0.5">上传时间</dt>
                <dd className="font-medium">{formatEhfDate(record.created_at, true)}</dd>
              </div>
              {record.processing_error && (
                <div>
                  <dt className="text-muted-foreground mb-0.5">处理错误</dt>
                  <dd className="font-medium text-destructive text-xs break-words">
                    {record.processing_error}
                  </dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </PageSection>

      {record.ai_summary && (
        <PageSection title="AI 摘要" description="自动生成的文档摘要">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm">{record.ai_summary}</p>
            </CardContent>
          </Card>
        </PageSection>
      )}

      {record.tags && record.tags.length > 0 && (
        <PageSection title="标签">
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-2">
                {record.tags.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
        </PageSection>
      )}

      {record.structured_data && Object.keys(record.structured_data).length > 0 && (
        <PageSection title="结构化数据">
          <Card>
            <CardContent className="pt-6">
              <pre className="p-3 rounded-md bg-muted text-xs overflow-auto max-h-48">
                {JSON.stringify(record.structured_data, null, 2)}
              </pre>
            </CardContent>
          </Card>
        </PageSection>
      )}

      <PageSection title="文件" description="下载或查看已上传文件">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <FileText className="h-10 w-10 shrink-0 text-muted-foreground" />
              <div className="min-w-0 flex-1">
                <p className="font-medium truncate">{record.file_name}</p>
                {downloadError && (
                  <p className="text-sm text-destructive mt-1">{downloadError}</p>
                )}
              </div>
              <Button variant="outline" size="sm" type="button" onClick={handleDownload}>
                <ExternalLink className="h-4 w-4 mr-1" />
                打开
              </Button>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link href="/patient/records">返回健康档案</Link>
        </Button>
      </div>
    </div>
  );
}
