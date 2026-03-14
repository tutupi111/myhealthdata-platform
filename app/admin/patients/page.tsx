import { MOCK_ADMIN_PATIENTS } from "@/lib/mock/admin";
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

function statusVariant(
  status: "active" | "pending" | "disabled"
): "success" | "warning" | "secondary" {
  if (status === "active") return "success";
  if (status === "pending") return "warning";
  return "secondary";
}

function statusLabel(status: "active" | "pending" | "disabled"): string {
  if (status === "active") return "正常";
  if (status === "pending") return "待激活";
  return "已禁用";
}

export default function AdminPatientsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">患者管理</h1>
        <p className="text-muted-foreground mt-1">
          平台注册患者，仅展示脱敏信息
        </p>
      </div>

      <PageSection
        title="患者列表"
        description={`共 ${MOCK_ADMIN_PATIENTS.length} 名患者`}
      >
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>DID</TableHead>
                <TableHead>姓名（脱敏）</TableHead>
                <TableHead>疾病类型</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>注册时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_ADMIN_PATIENTS.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-mono text-sm">{p.did}</TableCell>
                  <TableCell>{p.nameMasked}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.diseaseType}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(p.status)}>
                      {statusLabel(p.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {p.registeredAt}
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
