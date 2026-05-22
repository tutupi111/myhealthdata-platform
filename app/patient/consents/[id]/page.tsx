"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ehfGetConsent } from "@/lib/api/ehfClient";
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

export default function PatientConsentDetailPage() {
  const params = useParams();
  const id = typeof params.id === "string" ? params.id : "";
  const [consent, setConsent] = useState<Consent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await ehfGetConsent(id);
        if (!cancelled) setConsent(data);
      } catch (err) {
        if (!cancelled) {
          setError(parseApiErrorMessage(err));
          setConsent(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!consent) {
    if (error) {
      return (
        <div className="space-y-4">
          <p className="text-destructive">{error}</p>
          <Button variant="outline" asChild>
            <Link href="/patient/consents">返回授权列表</Link>
          </Button>
        </div>
      );
    }
    notFound();
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          {consent.project_title ?? consent.project_id}
        </h1>
        <p className="text-muted-foreground mt-1">授权详情</p>
      </div>

      <PageSection title="授权信息">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <Badge
                variant={
                  consent.status === "active"
                    ? "success"
                    : consent.status === "expired"
                      ? "secondary"
                      : "outline"
                }
              >
                {consentStatusLabel(consent.status)}
              </Badge>
            </div>
            <dl className="grid gap-3 text-sm">
              <div>
                <dt className="text-muted-foreground">项目名称</dt>
                <dd className="font-medium">{consent.project_title ?? consent.project_id}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">授权范围</dt>
                <dd className="font-medium">
                  {consent.authorization_scope.map(recordTypeLabel).join("、") || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">授权时间</dt>
                <dd className="font-medium">{formatEhfDate(consent.created_at)}</dd>
              </div>
              {consent.expired_at != null && (
                <div>
                  <dt className="text-muted-foreground">到期时间</dt>
                  <dd className="font-medium">{formatEhfDate(consent.expired_at)}</dd>
                </div>
              )}
            </dl>
          </CardContent>
        </Card>
      </PageSection>

      <Button variant="outline" asChild>
        <Link href="/patient/consents">返回授权列表</Link>
      </Button>
    </div>
  );
}
