import { MOCK_ADMIN_RECORDS } from "@/lib/mock/admin";
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

function reviewVariant(
  status: "pending" | "approved" | "rejected"
): "warning" | "success" | "destructive" {
  if (status === "approved") return "success";
  if (status === "rejected") return "destructive";
  return "warning";
}

function reviewLabel(status: "pending" | "approved" | "rejected"): string {
  if (status === "approved") return "已通过";
  if (status === "rejected") return "未通过";
  return "待审核";
}

export default function AdminRecordsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">资料审核</h1>
        <p className="text-muted-foreground mt-1">
          患者上传的健康资料审核
        </p>
      </div>

      <PageSection
        title="资料列表"
        description={`共 ${MOCK_ADMIN_RECORDS.length} 条记录`}
      >
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>患者 DID</TableHead>
                <TableHead>资料类型</TableHead>
                <TableHead>标题</TableHead>
                <TableHead>上传时间</TableHead>
                <TableHead>审核状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_ADMIN_RECORDS.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-mono text-sm">{r.patientDid}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {r.recordType}
                  </TableCell>
                  <TableCell className="font-medium">{r.title}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {r.uploadedAt}
                  </TableCell>
                  <TableCell>
                    <Badge variant={reviewVariant(r.reviewStatus)}>
                      {reviewLabel(r.reviewStatus)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      </PageSection>
    </div>
  );
}
