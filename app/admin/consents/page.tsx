"use client";

import { useEffect, useState } from "react";
import { ehfAdminListConsents } from "@/lib/api/ehfClient";
import type { Consent } from "@/lib/api/ehfTypes";
import {
  consentStatusLabel,
  formatEhfDate,
  parseApiErrorMessage,
  recordTypeLabel,
} from "@/lib/api/constants";
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
import { Loader2 } from "lucide-react";

export default function AdminConsentsPage() {
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await ehfAdminListConsents({ page_size: 100 });
        if (!cancelled) setConsents(data.items ?? []);
      } catch (err) {
        if (!cancelled) setError(parseApiErrorMessage(err));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">授权记录</h1>
        <p className="text-muted-foreground mt-1">患者对研究项目的授权记录</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <PageSection title="授权列表" description={`共 ${consents.length} 条`}>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>患者 DID</TableHead>
                  <TableHead>项目名称</TableHead>
                  <TableHead>授权范围</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>授权时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {consents.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono text-sm">
                      {c.patient_did ?? "—"}
                    </TableCell>
                    <TableCell className="font-medium">
                      {c.project_title ?? c.project_id}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.authorization_scope.map(recordTypeLabel).join("、")}
                    </TableCell>
                    <TableCell>
                      <Badge variant={c.status === "active" ? "success" : "secondary"}>
                        {consentStatusLabel(c.status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatEhfDate(c.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </PageSection>
    </div>
  );
}
