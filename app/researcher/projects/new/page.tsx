"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ehfCreateProject, ehfPatchProject } from "@/lib/api/ehfClient";
import { RECORD_TYPE_LABELS, parseApiErrorMessage } from "@/lib/api/constants";
import { PageSection } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const RECORD_CODES = Object.entries(RECORD_TYPE_LABELS);

export default function ResearcherProjectsNewPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [organization, setOrganization] = useState("");
  const [diseaseType, setDiseaseType] = useState("");
  const [description, setDescription] = useState("");
  const [selectedRecordTypes, setSelectedRecordTypes] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleRecordType = (code: string) => {
    setSelectedRecordTypes((prev) =>
      prev.includes(code) ? prev.filter((t) => t !== code) : [...prev, code]
    );
  };

  const handleCreate = async (status: "draft" | "published") => {
    if (!title.trim()) {
      setError("请填写项目名称");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const project = await ehfCreateProject({
        title: title.trim(),
        description: description.trim() || undefined,
        organization_name: organization.trim() || undefined,
        disease_type: diseaseType.trim() || undefined,
        data_scope: selectedRecordTypes,
        required_record_types: selectedRecordTypes,
      });
      if (status === "published") {
        await ehfPatchProject(project.id, { status: "published" });
      }
      router.push(`/researcher/projects/${project.id}`);
    } catch (err) {
      setError(parseApiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">创建研究项目</h1>
        <p className="text-muted-foreground mt-1">
          填写项目信息后发布，患者可浏览并授权参与
        </p>
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <PageSection title="基本信息">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">基本信息</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">项目名称</Label>
                <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="organization">研究机构</Label>
                <Input
                  id="organization"
                  value={organization}
                  onChange={(e) => setOrganization(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="diseaseType">目标疾病</Label>
              <Input
                id="diseaseType"
                value={diseaseType}
                onChange={(e) => setDiseaseType(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">研究简介</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </CardContent>
        </Card>
      </PageSection>

      <PageSection title="所需资料类型">
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-2">
              {RECORD_CODES.map(([code, label]) => (
                <label
                  key={code}
                  className="inline-flex items-center gap-2 rounded-md border border-input px-3 py-2 text-sm cursor-pointer hover:bg-muted/50"
                >
                  <input
                    type="checkbox"
                    checked={selectedRecordTypes.includes(code)}
                    onChange={() => toggleRecordType(code)}
                    className="rounded border-input"
                  />
                  {label}
                </label>
              ))}
            </div>
          </CardContent>
        </Card>
      </PageSection>

      <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
        <Button variant="outline" disabled={loading} onClick={() => handleCreate("draft")}>
          保存草稿
        </Button>
        <div className="flex gap-3">
          <Button variant="ghost" asChild>
            <Link href="/researcher/projects">取消</Link>
          </Button>
          <Button disabled={loading} onClick={() => handleCreate("published")}>
            {loading ? "提交中…" : "发布项目"}
          </Button>
        </div>
      </div>
    </div>
  );
}
