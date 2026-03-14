import { MOCK_ADMIN_PROJECTS } from "@/lib/mock/admin";
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
  status: "draft" | "published" | "closed"
): "outline" | "success" | "secondary" {
  if (status === "published") return "success";
  if (status === "closed") return "secondary";
  return "outline";
}

function statusLabel(status: "draft" | "published" | "closed"): string {
  if (status === "draft") return "草稿";
  if (status === "published") return "已发布";
  return "已结束";
}

export default function AdminProjectsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">项目管理</h1>
        <p className="text-muted-foreground mt-1">
          平台研究项目列表
        </p>
      </div>

      <PageSection
        title="项目列表"
        description={`共 ${MOCK_ADMIN_PROJECTS.length} 个项目`}
      >
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>项目名称</TableHead>
                <TableHead>研究机构</TableHead>
                <TableHead>疾病方向</TableHead>
                <TableHead>状态</TableHead>
                <TableHead>创建时间</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_ADMIN_PROJECTS.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.title}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.organization}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {p.diseaseType}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(p.status)}>
                      {statusLabel(p.status)}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {p.createdAt}
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
