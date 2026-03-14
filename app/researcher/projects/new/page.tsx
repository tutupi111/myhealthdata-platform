"use client";

import { useState } from "react";
import Link from "next/link";
import { PageSection } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RECORD_TYPE_OPTIONS_FOR_PROJECT } from "@/lib/mock/researcher";

export default function ResearcherProjectsNewPage() {
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [diseaseType, setDiseaseType] = useState("");
  const [description, setDescription] = useState("");
  const [inclusionCriteria, setInclusionCriteria] = useState("");
  const [exclusionCriteria, setExclusionCriteria] = useState("");
  const [authorizationDurationDays, setAuthorizationDurationDays] = useState("180");
  const [contactEmail, setContactEmail] = useState("");
  const [selectedRecordTypes, setSelectedRecordTypes] = useState<string[]>([]);
  const [submitLabel, setSubmitLabel] = useState<string | null>(null);

  const toggleRecordType = (type: string) => {
    setSelectedRecordTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSaveDraft = () => {
    setSubmitLabel("草稿已保存");
  };

  const handleSubmit = () => {
    setSubmitLabel("已提交审核");
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">创建研究项目</h1>
        <p className="text-muted-foreground mt-1">
          填写项目信息后提交审核，通过后患者可看到并授权参与
        </p>
      </div>

      <PageSection title="基本信息" description="项目名称、机构与疾病方向">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">项目名称</Label>
                <Input
                  id="title"
                  placeholder="例如：特发性肺纤维化真实世界研究"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organization">研究机构</Label>
                <Input
                  id="organization"
                  placeholder="例如：北京协和医院"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="diseaseType">目标疾病</Label>
              <Input
                id="diseaseType"
                placeholder="例如：特发性肺纤维化"
                value={diseaseType}
                onChange={(e) => setDiseaseType(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">研究简介</Label>
              <Input
                id="description"
                placeholder="简要描述研究目的与设计"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </PageSection>

      <PageSection title="纳排标准" description="纳入与排除标准说明">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="inclusion">纳入标准</Label>
              <Input
                id="inclusion"
                placeholder="例如：经 HRCT 或病理确诊的 IPF 患者"
                value={inclusionCriteria}
                onChange={(e) => setInclusionCriteria(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exclusion">排除标准</Label>
              <Input
                id="exclusion"
                placeholder="例如：合并其他严重肺部疾病"
                value={exclusionCriteria}
                onChange={(e) => setExclusionCriteria(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </PageSection>

      <PageSection title="所需资料与授权" description="需要患者授权的资料类型及授权期限">
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="space-y-2">
              <Label>所需资料类型（可多选）</Label>
              <div className="flex flex-wrap gap-2">
                {RECORD_TYPE_OPTIONS_FOR_PROJECT.map((type) => (
                  <label
                    key={type}
                    className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm cursor-pointer hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedRecordTypes.includes(type)}
                      onChange={() => toggleRecordType(type)}
                      className="rounded border-input"
                    />
                    {type}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="duration">授权期限（天）</Label>
                <Input
                  id="duration"
                  type="number"
                  min={1}
                  value={authorizationDurationDays}
                  onChange={(e) => setAuthorizationDurationDays(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contact">联系方式</Label>
                <Input
                  id="contact"
                  type="email"
                  placeholder="研究负责人邮箱"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </PageSection>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={handleSaveDraft}>
          保存草稿
        </Button>
        <div className="flex gap-3">
          <Button variant="ghost" asChild>
            <Link href="/researcher/projects">取消</Link>
          </Button>
          <Button onClick={handleSubmit}>提交审核</Button>
        </div>
      </div>
      {submitLabel && (
        <p className="text-sm text-muted-foreground">{submitLabel}</p>
      )}
    </div>
  );
}
