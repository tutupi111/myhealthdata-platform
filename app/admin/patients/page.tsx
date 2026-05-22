"use client";

import { useEffect, useState } from "react";
import { ehfAdminListPatients } from "@/lib/api/ehfClient";
import type { AdminPatient } from "@/lib/api/ehfTypes";
import { formatEhfDate, parseApiErrorMessage } from "@/lib/api/constants";
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

export default function AdminPatientsPage() {
  const [patients, setPatients] = useState<AdminPatient[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await ehfAdminListPatients({ page_size: 100 });
        if (!cancelled) setPatients(data.items ?? []);
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
        <h1 className="text-2xl font-semibold tracking-tight">患者管理</h1>
        <p className="text-muted-foreground mt-1">患者账号与 DID（脱敏展示）</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <PageSection title="患者列表" description={`共 ${patients.length} 名患者`}>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>DID</TableHead>
                  <TableHead>姓名</TableHead>
                  <TableHead>疾病类型</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>注册时间</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {patients.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-sm">{p.did}</TableCell>
                    <TableCell>{p.name_masked}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {p.disease_type ?? "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{p.status ?? "active"}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatEhfDate(p.registered_at ?? p.created_at)}
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
