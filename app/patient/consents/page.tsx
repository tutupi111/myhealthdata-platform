"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ehfListConsents, ehfRevokeConsent } from "@/lib/api/ehfClient";
import type { Consent } from "@/lib/api/ehfTypes";
import {
  consentStatusLabel,
  formatEhfDate,
  parseApiErrorMessage,
  recordTypeLabel,
} from "@/lib/api/constants";
import { PageSection } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Loader2 } from "lucide-react";

export default function PatientConsentsPage() {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ehfListConsents({ page_size: 100 });
      setConsents(data.items ?? []);
    } catch (err) {
      setError(parseApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleRevoke = async (id: string) => {
    setRevokingId(id);
    try {
      await ehfRevokeConsent(id);
      await load();
    } catch (err) {
      setError(parseApiErrorMessage(err));
    } finally {
      setRevokingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">授权记录</h1>
        <p className="text-muted-foreground mt-1">
          您已授权的研究项目及数据使用范围，可随时查看或撤回
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <PageSection title="授权列表" description={`共 ${consents.length} 条授权记录`}>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <ul className="space-y-4">
            {consents.length === 0 ? (
              <li>
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground text-sm">
                    暂无授权记录，您可在「研究项目」中授权参与
                  </CardContent>
                </Card>
              </li>
            ) : (
              consents.map((c) => (
                <li key={c.id}>
                  <Card>
                    <CardContent className="py-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex gap-3 min-w-0">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                            <ShieldCheck className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold">{c.project_title ?? c.project_id}</p>
                            <dl className="mt-2 space-y-1 text-sm text-muted-foreground">
                              <dd>
                                授权范围：
                                {c.authorization_scope.map(recordTypeLabel).join("、") || "—"}
                              </dd>
                              <dd>授权时间：{formatEhfDate(c.created_at)}</dd>
                              {c.expired_at != null && (
                                <dd>到期时间：{formatEhfDate(c.expired_at)}</dd>
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
                            {consentStatusLabel(c.status)}
                          </Badge>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" asChild>
                              <Link href={`/patient/consents/${c.id}`}>查看详情</Link>
                            </Button>
                            {c.status === "active" && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-destructive hover:text-destructive"
                                disabled={revokingId === c.id}
                                onClick={() => handleRevoke(c.id)}
                              >
                                {revokingId === c.id ? "撤回中…" : "撤回授权"}
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
        )}
      </PageSection>
    </div>
  );
}
