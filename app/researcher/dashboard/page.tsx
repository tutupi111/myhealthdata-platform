"use client";

import Link from "next/link";
import {
  MOCK_RESEARCHER_PROJECTS,
  MOCK_PENDING_REQUESTS_COUNT,
  MOCK_RECENT_ACTIVITIES,
} from "@/lib/mock/researcher";
import { useMockStore } from "@/context/MockStoreContext";
import { PageSection } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FlaskConical, Users, FileQuestion, Activity } from "lucide-react";

export default function ResearcherDashboardPage() {
  const { consents } = useMockStore();
  const totalConsentedPatients = consents.filter((c) => c.status === "active").length;
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">研究者工作台</h1>
        <p className="text-muted-foreground mt-1">
          管理研究项目与已授权患者数据
        </p>
      </div>

      <PageSection title="概览" description="项目与授权统计">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FlaskConical className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">
                    {MOCK_RESEARCHER_PROJECTS.length}
                  </p>
                  <p className="text-sm text-muted-foreground">我的项目</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{totalConsentedPatients}</p>
                  <p className="text-sm text-muted-foreground">已授权患者数</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                  <FileQuestion className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">
                    {MOCK_PENDING_REQUESTS_COUNT}
                  </p>
                  <p className="text-sm text-muted-foreground">待处理资料请求</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageSection>

      <PageSection
        title="快捷操作"
        description="创建项目或查看患者授权"
        action={
          <Button asChild size="sm">
            <Link href="/researcher/projects/new">创建研究项目</Link>
          </Button>
        }
      >
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="outline">
            <Link href="/researcher/projects/new">创建研究项目</Link>
          </Button>
          <Button asChild variant="outline">
            <Link href="/researcher/projects">查看我的项目</Link>
          </Button>
        </div>
      </PageSection>

      <PageSection
        title="最近项目动态"
        description="授权与项目更新"
      >
        <ul className="space-y-3">
          {MOCK_RECENT_ACTIVITIES.map((activity, i) => (
            <li key={i}>
              <Card>
                <CardContent className="flex flex-col gap-1 py-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-start gap-2">
                    <Activity className="h-5 w-5 shrink-0 text-muted-foreground mt-0.5" />
                    <div>
                      <p className="font-medium">{activity.projectTitle}</p>
                      <p className="text-sm text-muted-foreground">
                        {activity.description} · {activity.at}
                      </p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" asChild>
                    <Link href={`/researcher/projects/${activity.projectId}`}>
                      查看项目
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      </PageSection>
    </div>
  );
}
