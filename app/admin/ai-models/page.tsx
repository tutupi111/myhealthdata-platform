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
import { Plus, Pencil, Loader2, Check, X } from "lucide-react";
import type { AiModel } from "@/lib/api/ehfTypes";
import {
  ehfAdminCreateAiModel,
  ehfAdminDeleteAiModel,
  ehfAdminListAiModels,
  ehfAdminUpdateAiModel,
} from "@/lib/api/ehfClient";
import { parseApiErrorMessage } from "@/lib/api/constants";
import { useLocale } from "@/context/LocaleContext";
import { AdminAiConfigHints } from "@/components/admin/AdminAiConfigHints";

export default function AdminAiModelsPage() {
  const { t } = useLocale();
  const [models, setModels] = useState<AiModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    provider: "",
    model_name: "",
    base_url: "",
    api_key: "",
    supports_vision: false,
    supports_json: false,
    is_default: false,
    is_active: true,
    priority: 0,
    notes: "",
  });

  const fetchModels = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await ehfAdminListAiModels({ page_size: 100 });
      setModels(data.items ?? []);
    } catch (e) {
      setError(parseApiErrorMessage(e));
      setModels([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchModels();
  }, [fetchModels]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      provider: "",
      model_name: "",
      base_url: "",
      api_key: "",
      supports_vision: false,
      supports_json: false,
      is_default: false,
      is_active: true,
      priority: 0,
      notes: "",
    });
    setSheetOpen(true);
  };

  const openEdit = (m: AiModel) => {
    setEditingId(m.id);
    setForm({
      provider: m.provider,
      model_name: m.model_name,
      base_url: m.base_url ?? "",
      api_key: "",
      supports_vision: m.supports_vision,
      supports_json: m.supports_json,
      is_default: m.is_default,
      is_active: m.is_active,
      priority: m.priority,
      notes: m.notes ?? "",
    });
    setSheetOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        provider: form.provider.trim(),
        model_name: form.model_name.trim(),
        base_url: form.base_url.trim() || null,
        api_key: form.api_key.trim() || null,
        supports_vision: form.supports_vision,
        supports_json: form.supports_json,
        is_default: form.is_default,
        is_active: form.is_active,
        priority: form.priority,
        notes: form.notes.trim() || null,
      };
      if (editingId) {
        await ehfAdminUpdateAiModel(editingId, payload);
      } else {
        await ehfAdminCreateAiModel(payload);
      }
      setSheetOpen(false);
      fetchModels();
    } catch (e) {
      alert(parseApiErrorMessage(e));
    } finally {
      setSaving(false);
    }
  };

  const setDefault = async (id: string) => {
    try {
      await ehfAdminUpdateAiModel(id, { is_default: true });
      fetchModels();
    } catch (e) {
      alert(parseApiErrorMessage(e));
    }
  };

  const toggleActive = async (m: AiModel) => {
    try {
      await ehfAdminUpdateAiModel(m.id, { is_active: !m.is_active });
      fetchModels();
    } catch (e) {
      alert(parseApiErrorMessage(e));
    }
  };

  const deleteModel = async (id: string) => {
    if (!confirm("确定删除该模型？")) return;
    try {
      await ehfAdminDeleteAiModel(id);
      setSheetOpen(false);
      fetchModels();
    } catch (e) {
      alert(parseApiErrorMessage(e));
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">AI 模型</h1>
          <p className="text-muted-foreground mt-1">{t("adminAi.modelsPageDesc")}</p>
        </div>
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <Button type="button" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-2" />
            新增模型
          </Button>
          <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
            <div className="p-4 space-y-4">
              <h2 className="text-lg font-semibold">
                {editingId ? "编辑模型" : "新增模型"}
              </h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="provider">Provider</Label>
                  <Input
                    id="provider"
                    value={form.provider}
                    onChange={(e) => setForm((f) => ({ ...f, provider: e.target.value }))}
                    placeholder="如 openai, azure"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="model_name">模型名称</Label>
                  <Input
                    id="model_name"
                    value={form.model_name}
                    onChange={(e) => setForm((f) => ({ ...f, model_name: e.target.value }))}
                    placeholder="如 gpt-4o"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="base_url">Base URL（可选）</Label>
                  <Input
                    id="base_url"
                    value={form.base_url}
                    onChange={(e) => setForm((f) => ({ ...f, base_url: e.target.value }))}
                    placeholder="https://..."
                  />
                </div>
                <div>
                  <Label htmlFor="api_key">API Key（可选，编辑时留空表示不修改）</Label>
                  <Input
                    id="api_key"
                    type="password"
                    value={form.api_key}
                    onChange={(e) => setForm((f) => ({ ...f, api_key: e.target.value }))}
                    placeholder={editingId ? "留空则不修改" : "sk-..."}
                  />
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.supports_vision}
                      onChange={(e) => setForm((f) => ({ ...f, supports_vision: e.target.checked }))}
                    />
                    <span className="text-sm">支持视觉</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.supports_json}
                      onChange={(e) => setForm((f) => ({ ...f, supports_json: e.target.checked }))}
                    />
                    <span className="text-sm">支持 JSON</span>
                  </label>
                </div>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.is_default}
                      onChange={(e) => setForm((f) => ({ ...f, is_default: e.target.checked }))}
                    />
                    <span className="text-sm">默认模型</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={form.is_active}
                      onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                    />
                    <span className="text-sm">启用</span>
                  </label>
                </div>
                <div>
                  <Label htmlFor="priority">优先级（数字越小越优先）</Label>
                  <Input
                    id="priority"
                    type="number"
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: parseInt(e.target.value, 10) || 0 }))}
                  />
                </div>
                <div>
                  <Label htmlFor="notes">备注</Label>
                  <Input
                    id="notes"
                    value={form.notes}
                    onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                    placeholder="可选"
                  />
                </div>
                <div className="flex gap-2 pt-4">
                  <Button type="submit" disabled={saving}>
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                    {saving ? "保存中…" : "保存"}
                  </Button>
                  {editingId && (
                    <Button
                      type="button"
                      variant="destructive"
                      onClick={() => deleteModel(editingId)}
                    >
                      <X className="h-4 w-4" />
                      删除
                    </Button>
                  )}
                </div>
              </form>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      <AdminAiConfigHints />

      <PageSection title="模型列表" description="管理可用于 AI 任务的模型">
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
                  <TableHead>Provider</TableHead>
                  <TableHead>模型名称</TableHead>
                  <TableHead>能力</TableHead>
                  <TableHead>状态</TableHead>
                  <TableHead>默认</TableHead>
                  <TableHead>优先级</TableHead>
                  <TableHead className="w-[180px]">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {models.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      暂无模型，请点击「新增模型」添加
                    </TableCell>
                  </TableRow>
                ) : (
                  models.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.provider}</TableCell>
                      <TableCell>{m.model_name}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {m.supports_vision && "视觉 "}
                        {m.supports_json && "JSON"}
                        {!m.supports_vision && !m.supports_json && "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={m.is_active ? "success" : "secondary"}>
                          {m.is_active ? "启用" : "禁用"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {m.is_default ? (
                          <Badge variant="default">默认</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setDefault(m.id)}
                          >
                            设为默认
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>{m.priority}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEdit(m)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleActive(m)}
                          >
                            {m.is_active ? "禁用" : "启用"}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </Card>
      </PageSection>
    </div>
  );
}
