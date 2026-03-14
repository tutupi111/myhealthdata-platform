"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useMockStore } from "@/context/MockStoreContext";
import { PageSection } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

export default function PatientConsentDetailPage() {
  const params = useParams();
  const { consents, currentPatientDid } = useMockStore();
  const consent = consents.find(
    (c) => c.id === params.id && c.patientDid === currentPatientDid
  );
  if (!consent) notFound();

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{consent.projectTitle}</h1>
        <p className="text-muted-foreground mt-1">授权详情</p>
      </div>
      <PageSection title="授权信息" description="本授权记录详情">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">项目名称</dt>
                <dd className="font-medium">{consent.projectTitle}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">授权范围</dt>
                <dd className="font-medium">{consent.authorizationScope.join("、")}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">授权时间</dt>
                <dd className="font-medium">{consent.authorizedAt}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">到期时间</dt>
                <dd className="font-medium">{consent.expiredAt ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">状态</dt>
                <dd>
                  <Badge
                    variant={
                      consent.status === "active"
                        ? "success"
                        : consent.status === "expired"
                          ? "secondary"
                          : "outline"
                    }
                  >
                    {consent.status === "active"
                      ? "有效"
                      : consent.status === "expired"
                        ? "已到期"
                        : "已撤回"}
                  </Badge>
                </dd>
              </div>
            </dl>
          </CardContent>
        </Card>
      </PageSection>
      <div className="flex gap-3">
        <Button variant="outline" asChild>
          <Link href="/patient/consents">返回授权记录</Link>
        </Button>
      </div>
    </div>
  );
}
