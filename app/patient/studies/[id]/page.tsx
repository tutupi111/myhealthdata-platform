"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
import { MOCK_STUDIES } from "@/lib/mock/patient";
import { useMockStore } from "@/context/MockStoreContext";
import { PageSection } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, FlaskConical } from "lucide-react";

export default function PatientStudyDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { consents, addConsent, currentPatientDid } = useMockStore();
  const study = MOCK_STUDIES.find((s) => s.id === params.id);
  if (!study) notFound();

  const existingConsent = consents.find(
    (c) => c.patientDid === currentPatientDid && c.projectId === study.id
  );
  const canConsent = study.status === "recruiting" && !existingConsent;

  const handleConsent = () => {
    if (!canConsent) return;
    addConsent({
      patientDid: currentPatientDid,
      projectId: study.id,
      projectTitle: study.title,
      authorizationScope: [...study.requiredRecordTypes],
    });
    router.push("/patient/consents");
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{study.title}</h1>
          <p className="text-muted-foreground mt-1">
            {study.organization} · {study.diseaseType}
          </p>
        </div>
        <Badge variant={study.status === "recruiting" ? "success" : "secondary"}>
          {study.status === "recruiting" ? "招募中" : "已结束"}
        </Badge>
      </div>

      <PageSection title="项目介绍" description="研究目标与所需资料">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              参与本研究即表示您授权研究方在约定范围内使用您的脱敏健康资料，仅用于科研目的。
            </p>
            <div>
              <h3 className="text-sm font-medium mb-1">所需资料类型</h3>
              <div className="flex flex-wrap gap-2">
                {study.requiredRecordTypes.map((t) => (
                  <Badge key={t} variant="secondary">
                    {t}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      <PageSection title="授权参与" description="确认后将在您的授权记录中生成一条授权">
        <Card>
          <CardContent className="pt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {existingConsent ? (
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <span className="text-sm">您已授权参与本项目</span>
              </div>
            ) : canConsent ? (
              <>
                <p className="text-sm text-muted-foreground">
                  授权范围：{study.requiredRecordTypes.join("、")}
                </p>
                <Button onClick={handleConsent}>
                  <ShieldCheck className="h-4 w-4 mr-1" />
                  授权参与
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">本项目当前未开放招募</p>
            )}
          </CardContent>
        </Card>
      </PageSection>

      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link href="/patient/studies">返回研究项目列表</Link>
        </Button>
      </div>
    </div>
  );
}
