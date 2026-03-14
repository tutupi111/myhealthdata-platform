"use client";

import { useState, useEffect, useCallback } from "react";
import { PageSection } from "@/components/layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Pencil, Loader2, Check } from "lucide-react";
import {
  AI_TASK_TYPES,
  TASK_TYPE_LABELS,
  type AiTaskConfig,
  type AiModel,
  type TaskType,
} from "@/lib/types/ai-config";

const CONFIGS_API = "/api/admin/ai-task-configs";
const MODELS_API = "/api/admin/ai-models";

type ConfigWithModels = Omit<AiTaskConfig, "preferred_model" | "fallback_model"> & {
  preferred_model?: { id: string; model_name: string } | null;
  fallback_model?: { id: string; model_name: string } | null;
};

export default function AdminAiTasksPage() {
  const [configs, setConfigs] = useState<ConfigWithModels[]>([]);
  const [models, setModels] = useState<AiModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<ConfigWithModels | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    preferred_model_id: "" as string | null,
    fallback_model_id: "" as string | null,
    prompt_template: "",
    timeout: 60,
    max_tokens: 4096,
    is_enabled: true,
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [configRes, modelRes] = await Promise.all([
        fetch(CONFIGS_API),
        fetch(MODELS_API),
      ]);
      const configData = await configRes.json();
      const modelData = await modelRes.json();
      if (!configRes.ok) throw new Error(configData.error || "加载任务配置失败");
      if (!modelRes.ok) throw new Error(modelData.error || "加载模型列表失败");
      setConfigs(configData.configs ?? []);
      setModels(modelData.models ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载失败");
      setConfigs([]);
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openEdit = (c: ConfigWithModels) => {
    setEditingConfig(c);
    setForm({
      preferred_model_id: c.preferred_model_id ?? "",
      fallback_model_id: c.fallback_model_id ?? "",
      prompt_template: c.prompt_template ?? "",
      timeout: c.timeout,
      max_tokens: c.max_tokens,
      is_enabled: c.is_enabled,
    });
    setSheetOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingConfig) return;
    setSaving(true);
    try {
      const res = await fetch(CONFIGS_API + "/" + editingConfig.id, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferred_model_id: form.preferred_model_id || null,
          fallback_model_id: form.fallback_model_id || null,
          prompt_template: form.prompt_template.trim() || null,
          timeout: form.timeout,
          max_tokens: form.max_tokens,
          is_enabled: form.is_enabled,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "保存失败");
      setSheetOpen(false);
      fetchData();
    } catch (e) {
      alert(e instanceof Error ? e.message : "保存失败");
    } finally {
      setSaving(false);
    }
  };

  const activeModels = models.filter((m) => m.is_active);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">AI 任务配置</h1>
        <p className="text-muted-foreground mt-1">
          按任务类型配置首选/备用模型与参数
        </p>
      </div>

      <PageSection
        title="任务路由"
        description="固定五种任务类型，可配置 preferred / fallback 模型"
      >
        <Card>
          {error && (
            <p className="p-4 text-destructive text-sm">{error}</p>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>任务类型</TableHead>
                  <TableHead>首选模型</TableHead>
                  <TableHead>备用模型</TableHead>
                  <TableHead>超时/Token</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead className="w-[100px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {configs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      暂无配置，请先在 Supabase 执行建表并插入默认任务类型
                    </TableCell>
                  </TableRow>
                ) : (
                  configs.map((c) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">
                        {TASK_TYPE_LABELS[c.task_type as TaskType] ?? c.task_type}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {c.preferred_model?.model_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {c.fallback_model?.model_name ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {c.timeout}s / {c.max_tokens}
                      </TableCell>
                      <TableCell>
                        <Badge variant={c.is_enabled ? "success" : "secondary"}>
                          {c.is_enabled ? "启用" : "禁用"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="outline" onClick={() => openEdit(c)}>
                          <Pencil className="h-4 w-4" />
                          编辑
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </Card>
      </PageSection>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full max-w-lg overflow-y-auto">
          {editingConfig && (
            <div className="p-4 space-y-4">
              <h2 className="text-lg font-semibold">
                {TASK_TYPE_LABELS[editingConfig.task_type as TaskType] ?? editingConfig.task_type}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label>首选模型</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.preferred_model_id ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        preferred_model_id: e.target.value || null,
                      }))
                    }
                  >
                    <option value="">— 未选 —</option>
                    {activeModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.provider} / {m.model_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>备用模型</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.fallback_model_id ?? ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        fallback_model_id: e.target.value || null,
                      }))
                    }
                  >
                    <option value="">— 未选 —</option>
                    {activeModels.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.provider} / {m.model_name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor="prompt_template">Prompt 模板（可选）</Label>
                  <textarea
                    id="prompt_template"
                    className="flex min-h-[100px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={form.prompt_template}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, prompt_template: e.target.value }))
                    }
                    placeholder="{{extracted_text}} 等占位符"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="timeout">超时（秒）</Label>
                    <Input
                      id="timeout"
                      type="number"
                      value={form.timeout}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          timeout: parseInt(e.target.value, 10) || 60,
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="max_tokens">Max Tokens</Label>
                    <Input
                      id="max_tokens"
                      type="number"
                      value={form.max_tokens}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          max_tokens: parseInt(e.target.value, 10) || 4096,
                        }))
                      }
                    />
                  </div>
                </div>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={form.is_enabled}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, is_enabled: e.target.checked }))
                    }
                  />
                  <span className="text-sm">启用该任务</span>
                </label>
                <div className="pt-4">
                  <Button type="submit" disabled={saving}>
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="h-4 w-4" />
                    )}
                    {saving ? "保存中…" : "保存"}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
