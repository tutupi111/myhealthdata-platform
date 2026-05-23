"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ehfAdminListHealthRecords } from "@/lib/api/ehfClient";
import type { HealthRecord } from "@/lib/api/ehfTypes";
import { formatEhfDate, parseApiErrorMessage } from "@/lib/api/constants";
import { extractPaginatedItems } from "@/lib/api/unwrapApiResponse";
import { PageSection } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Eye } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Loader2 } from "lucide-react";

function reviewLabel(status: string): string {
  if (status === "approved") return "已通过";
  if (status === "rejected") return "未通过";
  return "待审核";
}

function reviewVariant(status: string): "warning" | "success" | "destructive" {
  if (status === "approved") return "success";
  if (status === "rejected") return "destructive";
  return "warning";
}

export default function AdminRecordsPage() {
  const [records, setRecords] = useState<HealthRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ehfAdminListHealthRecords({ page_size: 100 });
      setRecords(extractPaginatedItems<HealthRecord>(data));
    } catch (err) {
      setError(parseApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">资料审核</h1>
        <p className="text-muted-foreground mt-1">患者上传的健康资料审核</p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <PageSection title="资料列表" description={`共 ${records.length} 条`}>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>标题</TableHead>
                  <TableHead>文件名</TableHead>
                  <TableHead>上传时间</TableHead>
                  <TableHead>审核状态</TableHead>
                  <TableHead className="w-[120px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      暂无资料
                    </TableCell>
                  </TableRow>
                ) : (
                records.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">
                      <Link
                        href={`/admin/records/${r.id}`}
                        className="text-primary hover:underline"
                      >
                        {r.title || r.file_name}
                      </Link>
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">{r.file_name}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatEhfDate(r.created_at)}
                    </TableCell>
                    <TableCell>
                      <Badge variant={reviewVariant(r.review_status ?? "pending")}>
                        {reviewLabel(r.review_status ?? "pending")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/admin/records/${r.id}`}>
                          <Eye className="h-4 w-4 mr-1" />
                          查看审核
                        </Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
                )}
              </TableBody>
            </Table>
          </Card>
        )}
      </PageSection>
    </div>
  );
}
