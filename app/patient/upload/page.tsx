"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageSection } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Upload, FileUp, Loader2 } from "lucide-react";

const ACCEPT =
  "image/jpeg,image/jpg,image/png,.pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const MAX_MB = 20;

type UploadMessage = { type: "success" | "error"; text: string } | null;

export default function PatientUploadPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<UploadMessage>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFile(f ?? null);
    setMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setMessage({ type: "error", text: "请先选择要上传的文件" });
      return;
    }
    if (file.size > MAX_MB * 1024 * 1024) {
      setMessage({ type: "error", text: "文件大小不能超过 " + MAX_MB + "MB" });
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/patient/upload", { method: "POST", body: formData });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ type: "error", text: (data && data.error) || "上传失败" });
        return;
      }
      const recordId = data?.record?.id;
      setMessage({ type: "success", text: "上传成功，正在跳转到档案详情…" });
      if (recordId) {
        fetch(`/api/patient/records/${recordId}/process`, { method: "POST" }).catch(() => {});
        router.push(`/patient/records/${recordId}`);
      } else {
        setTimeout(() => router.push("/patient/records"), 800);
      }
    } catch (err) {
      setMessage({
        type: "error",
        text: err instanceof Error ? err.message : "网络错误，请稍后重试",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">上传资料</h1>
        <p className="text-muted-foreground mt-1">
          上传病历、检查报告等健康资料，支持图片、Word、PDF，单文件不超过 {MAX_MB}MB
        </p>
      </div>
      <PageSection title="选择文件" description="支持 JPG/PNG 图片、Word（.doc/.docx）、PDF">
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">文件上传</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {message ? (
                <p className={"text-sm " + (message.type === "success" ? "text-green-600" : "text-destructive")}>
                  {message.text}
                </p>
              ) : null}
              <div className="space-y-2">
                <Label>选择文件</Label>
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-input bg-muted/30 px-6 py-10 text-center">
                  <FileUp className="h-10 w-10 text-muted-foreground mb-2" />
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={ACCEPT}
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  {file ? (
                    <>
                      <p className="text-sm font-medium">{file.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {(file.size / 1024).toFixed(1)} KB
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-muted-foreground mb-1">
                      支持 PDF、JPG、PNG、Word，单文件不超过 {MAX_MB}MB
                    </p>
                  )}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    {file ? "重新选择" : "选择文件"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-between mt-6">
            <Button variant="outline" asChild type="button">
              <Link href="/patient/records">取消</Link>
            </Button>
            <Button type="submit" disabled={submitting || !file}>
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  上传中…
                </>
              ) : (
                "提交上传"
              )}
            </Button>
          </div>
        </form>
      </PageSection>
    </div>
  );
}
