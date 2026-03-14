import { MOCK_AUDIT_LOGS } from "@/lib/mock/admin";
import { PageSection } from "@/components/layout";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function roleLabel(role: "patient" | "researcher" | "admin"): string {
  if (role === "patient") return "患者";
  if (role === "researcher") return "研究者";
  return "管理员";
}

export default function AdminAuditLogsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">审计日志</h1>
        <p className="text-muted-foreground mt-1">
          系统操作记录，便于追溯与合规
        </p>
      </div>

      <PageSection
        title="日志列表"
        description={`共 ${MOCK_AUDIT_LOGS.length} 条记录`}
      >
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>操作人</TableHead>
                <TableHead>角色</TableHead>
                <TableHead>动作</TableHead>
                <TableHead>对象</TableHead>
                <TableHead>时间</TableHead>
                <TableHead className="max-w-[120px]">元数据</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_AUDIT_LOGS.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="font-medium">{log.actorDisplay}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {roleLabel(log.actorRole)}
                  </TableCell>
                  <TableCell className="text-sm">{log.action}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {log.targetType}
                    {log.targetId ? ` #${log.targetId}` : ""}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm whitespace-nowrap">
                    {new Date(log.createdAt).toLocaleString("zh-CN")}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-xs max-w-[120px] truncate">
                    {log.metadata
                      ? JSON.stringify(log.metadata)
                      : "—"}
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
