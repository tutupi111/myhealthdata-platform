"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ehfAdminReviewHealthRecord,
  ehfGetHealthRecord,
  ehfOpenHealthRecordDownload,
} from "@/lib/api/ehfClient";
import type { HealthRecord } from "@/lib/api/ehfTypes";
import {
  StructuredDataView,
  shouldUseStructuredDataView,
} from "@/components/healthRecord/StructuredDataView";
import {
  fileTypeLabel,
  formatEhfDate,
  parseApiErrorMessage,
} from "@/lib/api/constants";
import {
  getLlmConfigHint,
  getProcessingFailureKind,
  hasExtractedText,
  hasMeaningfulStructuredData,
  isPlaceholderProcessing,
} from "@/lib/healthRecord/processingDisplay";
import { PageSection } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { FileText, Loader2, ExternalLink, ArrowLeft } from "lucide-react";

function reviewLabel(status: string): string {
  if (status === "approved") return "已通过";
  if (status === "rejected") return "未通过";
  return "待审核";
}

function reviewVariant(status: string): "warning" | "success" | "destructive" {
  if (status === "approved") return "success";
  if (status === "rejected") return "destructive";
  return "warning";
}

function processingLabel(status: string): string {
  if (status === "completed") return "解析完成";
  if (status === "failed") return "解析失败";
  if (status === "processing") return "解析中";
  if (status === "uploaded") return "已上传";
  return status;
}

interface AdminRecordDetailClientProps {
  recordId: string;
}

export function AdminRecordDetailClient({ recordId }: AdminRecordDetailClientProps) {
  const [record, setRecord] = useState<HealthRecord | null | "loading">("loading");
  const [error, setError] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setError(null);
    try {
      const data = await ehfGetHealthRecord(recordId);
      setRecord(data);
      return data;
    } catch (e) {
      setRecord(null);
      setError(parseApiErrorMessage(e));
      return null;
    }
  }, [recordId]);

  useEffect(() => {
    setRecord("loading");
    load();
  }, [load]);

  const handleDownload = async () => {
    setDownloadError(null);
    try {
      await ehfOpenHealthRecordDownload(recordId);
    } catch (e) {
      setDownloadError(parseApiErrorMessage(e));
    }
  };

  const handleReview = async (review_status: "approved" | "rejected") => {
    setActing(true);
    setError(null);
    try {
      const updated = await ehfAdminReviewHealthRecord(recordId, {
        review_status,
        review_note: reviewNote.trim() || undefined,
      });
      setRecord(updated);
    } catch (e) {
      setError(parseApiErrorMessage(e));
    } finally {
      setActing(false);
    }
  };

  if (record === "loading") {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="space-y-4">
        <p className="text-destructive">{error ?? "记录不存在或无权查看"}</p>
        <Button variant="outline" asChild>
          <Link href="/admin/records">
            <ArrowLeft className="h-4 w-4 mr-2" />
            返回资料审核
          </Link>
        </Button>
      </div>
    );
  }

  const reviewStatus = record.review_status ?? "pending";
  const failureKind = getProcessingFailureKind(record);
  const llmHint = getLlmConfigHint(record.processing_error);
  const showStructured =
    hasMeaningfulStructuredData(record) && shouldUseStructuredDataView(record);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {record.title || record.file_name}
          </h1>
          <p className="text-muted-foreground mt-1">
            {fileTypeLabel(record.file_type)}
            {record.created_at && ` · ${formatEhfDate(record.created_at, true)}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={reviewVariant(reviewStatus)}>{reviewLabel(reviewStatus)}</Badge>
          <Badge variant="outline">{processingLabel(record.processing_status)}</Badge>
        </div>
      </div>

      {error && (
        <p className="text-sm text-destructive rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2">
          {error}
        </p>
      )}

      <PageSection title="审核操作" description="查看资料内容与 AI 解析结果后做出审核决定">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="review_note">审核备注（可选）</Label>
              <textarea
                id="review_note"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
                placeholder="通过或驳回原因，将随审核结果保存"
                disabled={reviewStatus !== "pending"}
              />
            </div>
            {reviewStatus === "pending" ? (
              <div className="flex flex-wrap gap-2">
                <Button disabled={acting} onClick={() => handleReview("approved")}>
                  {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  审核通过
                </Button>
                <Button
                  variant="destructive"
                  disabled={acting}
                  onClick={() => handleReview("rejected")}
                >
                  驳回
                </Button>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                该资料已{reviewLabel(reviewStatus)}。如需修改审核结果，请联系后端是否支持重新审核。
              </p>
            )}
          </CardContent>
        </Card>
      </PageSection>

      {failureKind === "structured_failed" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 px-4 py-3 text-sm space-y-2">
          <p>OCR 已成功，但 AI 结构化失败，审核时请结合下方原始识别文字。</p>
          {llmHint && <p className="text-xs opacity-90">{llmHint}</p>}
          {record.processing_error && (
            <p className="text-xs font-mono break-words text-muted-foreground">
              {record.processing_error}
            </p>
          )}
        </div>
      )}

      <PageSection title="记录信息">
        <Card>
          <CardContent className="pt-6">
            <dl className="grid gap-4 sm:grid-cols-2 text-sm">
              <div>
                <dt className="text-muted-foreground">文件名</dt>
                <dd className="font-medium">{record.file_name}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">文档类型</dt>
                <dd className="font-medium">{record.doc_type ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">资料类型</dt>
                <dd className="font-medium">{record.record_type ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">患者 ID</dt>
                <dd className="font-mono text-xs break-all">{record.patient_id}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">文件大小</dt>
                <dd className="font-medium">
                  {record.file_size != null
                    ? `${(record.file_size / 1024).toFixed(1)} KB`
                    : "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">来源机构</dt>
                <dd className="font-medium">{record.source_organization ?? "—"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </PageSection>

      {record.ai_summary && !isPlaceholderProcessing(record) && (
        <PageSection title="AI 摘要">
          <Card>
            <CardContent className="pt-6">
              <p className="text-sm whitespace-pre-wrap">{record.ai_summary}</p>
            </CardContent>
          </Card>
        </PageSection>
      )}

      {record.tags && record.tags.length > 0 && (
        <PageSection title="标签">
          <Card>
            <CardContent className="pt-6 flex flex-wrap gap-2">
              {record.tags.map((tag) => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </CardContent>
          </Card>
        </PageSection>
      )}

      {showStructured && record.structured_data && (
        <PageSection title="结构化数据">
          <Card>
            <CardContent className="pt-6">
              <StructuredDataView data={record.structured_data} />
            </CardContent>
          </Card>
        </PageSection>
      )}

      {hasExtractedText(record) && (
        <PageSection title="原始识别文字">
          <Card>
            <CardContent className="pt-6">
              <pre className="p-3 rounded-md bg-muted text-xs overflow-auto max-h-96 whitespace-pre-wrap">
                {record.extracted_text}
              </pre>
            </CardContent>
          </Card>
        </PageSection>
      )}

      <PageSection title="原始文件">
        <Card>
          <CardContent className="pt-6 flex items-center gap-3">
            <FileText className="h-10 w-10 text-muted-foreground shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="font-medium truncate">{record.file_name}</p>
              {downloadError && (
                <p className="text-sm text-destructive mt-1">{downloadError}</p>
              )}
            </div>
            <Button variant="outline" size="sm" type="button" onClick={handleDownload}>
              <ExternalLink className="h-4 w-4 mr-1" />
              打开 / 下载
            </Button>
          </CardContent>
        </Card>
      </PageSection>

      <Button variant="outline" asChild>
        <Link href="/admin/records">
          <ArrowLeft className="h-4 w-4 mr-2" />
          返回资料审核列表
        </Link>
      </Button>
    </div>
  );
}
