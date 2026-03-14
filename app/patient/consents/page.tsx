"use client";

import Link from "next/link";
import { useMockStore } from "@/context/MockStoreContext";
import { PageSection } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";

export default function PatientConsentsPage() {
  const { consents, currentPatientDid } = useMockStore();
  const myConsents = consents.filter((c) => c.patientDid === currentPatientDid);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">授权记录</h1>
        <p className="text-muted-foreground mt-1">
          您已授权的研究项目及数据使用范围，可随时查看或撤回
        </p>
      </div>

      <PageSection
        title="授权列表"
        description={`共 ${myConsents.length} 条授权记录`}
      >
        <ul className="space-y-4">
          {myConsents.length === 0 ? (
            <li>
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground text-sm">
                  暂无授权记录，您可在「研究项目」中授权参与
                </CardContent>
              </Card>
            </li>
          ) : (
            myConsents.map((c) => (
              <li key={c.id}>
                <Card>
                  <CardContent className="py-5">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex gap-3 min-w-0">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                          <ShieldCheck className="h-5 w-5 text-primary" />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold">{c.projectTitle}</p>
                          <dl className="mt-2 space-y-1 text-sm text-muted-foreground">
                            <div className="flex flex-wrap gap-x-2">
                              <dt className="sr-only">授权范围</dt>
                              <dd>授权范围：{c.authorizationScope.join("、")}</dd>
                            </div>
                            <div>
                              <dt className="sr-only">授权时间</dt>
                              <dd>授权时间：{c.authorizedAt}</dd>
                            </div>
                            {c.expiredAt && (
                              <div>
                                <dt className="sr-only">到期时间</dt>
                                <dd>到期时间：{c.expiredAt}</dd>
                              </div>
                            )}
                          </dl>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 shrink-0 sm:items-end">
                        <Badge
                          variant={
                            c.status === "active"
                              ? "success"
                              : c.status === "expired"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {c.status === "active"
                            ? "有效"
                            : c.status === "expired"
                              ? "已到期"
                              : "已撤回"}
                        </Badge>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" asChild>
                            <Link href={`/patient/consents/${c.id}`}>
                              查看详情
                            </Link>
                          </Button>
                          {c.status === "active" && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                            >
                              撤回授权
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))
          )}
        </ul>
      </PageSection>
    </div>
  );
}
