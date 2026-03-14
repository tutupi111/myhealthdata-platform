import Link from "next/link";
import { PageSection } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function ResearcherRequestsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">资料请求</h1>
        <p className="text-muted-foreground mt-1">
          向已授权患者发起补充资料请求
        </p>
      </div>
      <PageSection title="功能说明" description="v0.1-demo 占位">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              资料请求功能将在后续版本中开放，当前为占位页。您可在「我的项目」→「患者列表」中查看已授权患者。
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/researcher/dashboard">返回首页</Link>
            </Button>
          </CardContent>
        </Card>
      </PageSection>
    </div>
  );
}
