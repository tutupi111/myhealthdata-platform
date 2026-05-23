"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { ehfListHealthRecords } from "@/lib/api/ehfClient";
import type { HealthRecord } from "@/lib/api/ehfTypes";
import type { PatientProfile } from "@/lib/api/ehfTypes";
import {
  fileTypeLabel,
  formatEhfDate,
  parseApiErrorMessage,
} from "@/lib/api/constants";
import { useLocale } from "@/context/LocaleContext";
import { getMessages } from "@/lib/i18n";
import {
  getProcessingFailureKind,
  getProcessingStatusLabel,
} from "@/lib/healthRecord/processingDisplay";
import { PageSection } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { FileText, Upload, Search, Loader2 } from "lucide-react";

export default function PatientRecordsPage() {
  const { user } = useAuth();
  const profile = user?.profile as PatientProfile | null;
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setApiError(null);
      try {
        const data = await ehfListHealthRecords({ page_size: 200 });
        if (!cancelled) setRecords(data.items ?? []);
      } catch (err) {
        if (!cancelled) {
          setApiError(parseApiErrorMessage(err));
          setRecords([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = records;
    if (typeFilter !== "all") {
      list = list.filter((r) => fileTypeLabel(r.file_type) === typeFilter);
    }
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((r) => r.file_name.toLowerCase().includes(q));
    }
    return list;
  }, [records, typeFilter, search]);

  const latestDate =
    records.length > 0
      ? formatEhfDate(
          records.reduce(
            (a, r) => (r.created_at > a ? r.created_at : a),
            records[0].created_at
          )
        )
      : null;

  const typeOptions = useMemo(() => {
    const set = new Set(records.map((r) => fileTypeLabel(r.file_type)));
    return ["all", ...Array.from(set)];
  }, [records]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">健康档案</h1>
        <p className="text-muted-foreground mt-1">查看与管理您上传的健康资料</p>
      </div>

      <PageSection title="档案摘要" description="当前档案概览">
        <Card>
          <CardContent className="pt-6">
            <dl className="grid gap-4 sm:grid-cols-3 text-sm">
              <div>
                <dt className="text-muted-foreground">疾病类型</dt>
                <dd className="font-medium mt-0.5">{profile?.disease_type ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">资料总数</dt>
                <dd className="font-medium mt-0.5">{records.length} 条</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">最近更新</dt>
                <dd className="font-medium mt-0.5">{latestDate ?? "—"}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </PageSection>

      <PageSection
        title="记录列表"
        description="按类型筛选或搜索文件名"
        action={
          <Button asChild size="sm">
            <Link href="/patient/upload">
              <Upload className="h-4 w-4 mr-1" />
              上传新资料
            </Link>
          </Button>
        }
      >
        <div className="space-y-4">
          {apiError && <p className="text-sm text-destructive">{apiError}</p>}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="搜索文件名..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="all">全部类型</option>
              {typeOptions
                .filter((t) => t !== "all")
                .map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <ul className="space-y-3">
              {filtered.length === 0 ? (
                <li>
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      {records.length === 0 && !apiError
                        ? "暂无记录，请先上传资料"
                        : "暂无匹配记录"}
                    </CardContent>
                  </Card>
                </li>
              ) : (
                filtered.map((record) => <RecordListItem key={record.id} record={record} />)
              )}
            </ul>
          )}
        </div>
      </PageSection>
    </div>
  );
}

function RecordListItem({ record }: { record: HealthRecord }) {
  const { t, locale } = useLocale();
  const rp = getMessages(locale).recordProcessing;
  const statusLabel = getProcessingStatusLabel(record.processing_status, rp);
  const failureKind = getProcessingFailureKind(record);
  const statusVariant =
    record.processing_status === "completed"
      ? "default"
      : record.processing_status === "failed"
        ? "destructive"
        : "secondary";

  return (
    <li>
      <Link href={`/patient/records/${record.id}`}>
        <Card className="transition-colors hover:bg-muted/50">
          <CardContent className="flex flex-col gap-2 py-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex gap-3 min-w-0 flex-1">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted">
                <FileText className="h-5 w-5 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="font-medium truncate">{record.file_name}</p>
                <p className="text-sm text-muted-foreground">
                  {fileTypeLabel(record.file_type)}
                  {record.doc_type && record.doc_type !== "unknown" && ` · ${record.doc_type}`}
                  {record.created_at && ` · ${formatEhfDate(record.created_at)}`}
                </p>
                {record.ai_summary && (
                  <p className="text-sm text-muted-foreground mt-0.5 line-clamp-2">
                    {record.ai_summary}
                  </p>
                )}
                {failureKind === "structured_failed" && (
                  <p className="text-xs text-amber-700 dark:text-amber-400 mt-1 line-clamp-2">
                    {rp.structuredFailed}
                  </p>
                )}
                {failureKind === "ocr_failed" && (
                  <p className="text-xs text-destructive mt-1 line-clamp-2">{rp.ocrFailed}</p>
                )}
                {record.tags && record.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {record.tags.slice(0, 4).map((t) => (
                      <Badge key={t} variant="outline" className="text-xs">
                        {t}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
            <Badge variant={statusVariant} className="shrink-0">
              {statusLabel}
            </Badge>
          </CardContent>
        </Card>
      </Link>
    </li>
  );
}
