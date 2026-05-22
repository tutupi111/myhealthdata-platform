"use client";

import { useEffect, useState } from "react";
import {
  ehfAdminApproveResearcher,
  ehfAdminListResearchers,
  ehfAdminRejectResearcher,
} from "@/lib/api/ehfClient";
import type { AdminResearcher } from "@/lib/api/ehfTypes";
import { formatEhfDate, parseApiErrorMessage } from "@/lib/api/constants";
import { PageSection } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";

function reviewVariant(review: string): "warning" | "success" | "destructive" {
  if (review === "approved") return "success";
  if (review === "rejected") return "destructive";
  return "warning";
}

function reviewLabel(review: string): string {
  if (review === "approved") return "已通过";
  if (review === "rejected") return "已驳回";
  return "待审核";
}

export default function AdminResearchersPage() {
  const [researchers, setResearchers] = useState<AdminResearcher[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actingId, setActingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ehfAdminListResearchers({ page_size: 100 });
      setResearchers(data.items ?? []);
    } catch (err) {
      setError(parseApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleApprove = async (id: string) => {
    setActingId(id);
    try {
      await ehfAdminApproveResearcher(id);
      await load();
    } catch (err) {
      setError(parseApiErrorMessage(err));
    } finally {
      setActingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setActingId(id);
    try {
      await ehfAdminRejectResearcher(id);
      await load();
    } catch (err) {
      setError(parseApiErrorMessage(err));
    } finally {
      setActingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">研究者管理</h1>
        <p className="text-muted-foreground mt-1">研究者账号与审核状态</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <PageSection title="研究者列表" description={`共 ${researchers.length} 名研究者`}>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>姓名</TableHead>
                  <TableHead>机构</TableHead>
                  <TableHead>审核状态</TableHead>
                  <TableHead>注册时间</TableHead>
                  <TableHead className="w-[140px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {researchers.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">
                      {r.organization_name}
                    </TableCell>
                    <TableCell>
                      <Badge variant={reviewVariant(r.review_status)}>
                        {reviewLabel(r.review_status)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatEhfDate(r.registered_at ?? r.created_at)}
                    </TableCell>
                    <TableCell>
                      {r.review_status === "pending" && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            disabled={actingId === r.id}
                            onClick={() => handleApprove(r.id)}
                          >
                            通过
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            disabled={actingId === r.id}
                            onClick={() => handleReject(r.id)}
                          >
                            驳回
                          </Button>
                        </div>
                      )}
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
