import Link from "next/link";
import { PageSection } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function PatientSettingsPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">账户与隐私</h1>
        <p className="text-muted-foreground mt-1">
          管理基本信息、登录与安全、隐私设置
        </p>
      </div>
      <PageSection title="功能说明" description="v0.1-demo 占位">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              账户与隐私设置页面将在后续版本中开放，当前为占位页。
            </p>
            <Button variant="outline" className="mt-4" asChild>
              <Link href="/patient/dashboard">返回首页</Link>
            </Button>
          </CardContent>
        </Card>
      </PageSection>
    </div>
  );
}
