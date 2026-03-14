"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useMockStore } from "@/context/MockStoreContext";
import { PageSection } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText } from "lucide-react";
import { RecordDetailClient } from "./RecordDetailClient";

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function reviewLabel(status: "pending" | "approved" | "rejected"): string {
  if (status === "approved") return "已通过";
  if (status === "rejected") return "未通过";
  return "待审核";
}

export default function PatientRecordDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const { healthRecords, currentPatientDid } = useMockStore();
  const isUuid = UUID_REGEX.test(id);

  if (isUuid) {
    return <RecordDetailClient recordId={id} />;
  }

  const record = healthRecords.find(
    (r) => r.id === id && r.patientDid === currentPatientDid
  );
  if (!record) notFound();

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{record.title}</h1>
          <p className="text-muted-foreground mt-1">
            {record.recordType}
            {record.recordDate && ` · ${record.recordDate}`}
          </p>
        </div>
        <Badge
          variant={
            record.reviewStatus === "approved"
              ? "success"
              : record.reviewStatus === "rejected"
                ? "destructive"
                : "warning"
          }
        >
          {reviewLabel(record.reviewStatus)}
        </Badge>
      </div>

      <PageSection title="记录信息" description="该条健康资料的完整信息">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <dl className="grid gap-4 sm:grid-cols-1 text-sm">
              <div>
                <dt className="text-muted-foreground mb-0.5">标题</dt>
                <dd className="font-medium">{record.title}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground mb-0.5">资料类型</dt>
                <dd className="font-medium">{record.recordType}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground mb-0.5">资料日期</dt>
                <dd className="font-medium">{record.recordDate || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground mb-0.5">医院 / 来源</dt>
                <dd className="font-medium">{record.sourceOrganization || "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground mb-0.5">摘要 / 备注</dt>
                <dd className="font-medium whitespace-pre-wrap">
                  {record.summary || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground mb-0.5">上传时间</dt>
                <dd className="font-medium">{record.createdAt}</dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </PageSection>

      <PageSection title="文件信息" description="关联的附件或影像">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3 text-sm text-muted-foreground">
              <FileText className="h-10 w-10 shrink-0 text-muted-foreground" />
              <div>
                <p>演示阶段仅保存表单信息，未存储实际文件。</p>
                <p className="mt-1">正式环境将显示文件名称、格式与预览入口。</p>
              </div>
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
