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
import { Plus, Pencil, Loader2, Check, X, Radio } from "lucide-react";
import { extractPaginatedItems } from "@/lib/api/unwrapApiResponse";
import { testDraftAiModel, testSavedAiModel } from "@/lib/ai/testAiModel";
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

function resolveApiKeySet(m: AiModel): boolean {
  if (m.api_key_set === true) return true;
  if (m.api_key_set === false) return false;
  const raw = m as unknown as Record<string, unknown>;
  if (raw.apiKeySet === true || raw.has_api_key === true) return true;
  return false;
}

export default function AdminAiModelsPage() {
  const { t } = useLocale();
  const [models, setModels] = useState<AiModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [testOk, setTestOk] = useState<boolean | null>(null);
  const [rowTestingId, setRowTestingId] = useState<string | null>(null);
  /** 列表行测试反馈（testMessage 仅在抽屉内展示，需单独状态） */
  const [listTestFeedback, setListTestFeedback] = useState<{
    modelId: string;
    modelLabel: string;
    ok: boolean;
    message: string;
  } | null>(null);
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
      setModels(
        extractPaginatedItems<AiModel>(data).map((m) => ({
          ...m,
          api_key_set: resolveApiKeySet(m),
        }))
      );
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
    setTestMessage(null);
    setTestOk(null);
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
    setTestMessage(null);
    setTestOk(null);
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

  const runConnectivityTest = async (opts: {
    modelId?: string;
    useForm?: boolean;
  }) => {
    setTesting(true);
    setTestMessage(null);
    setTestOk(null);
    try {
      const result =
        opts.useForm && !opts.modelId
          ? await testDraftAiModel({
              provider: form.provider,
              model_name: form.model_name,
              base_url: form.base_url,
              api_key: form.api_key,
            })
          : opts.modelId
            ? await testSavedAiModel(opts.modelId)
            : { ok: false, message: "无法测试：缺少模型 ID" };
      setTestOk(result.ok);
      setTestMessage(
        result.latencyMs != null
          ? `${result.message}（${result.latencyMs} ms）`
          : result.message
      );
    } finally {
      setTesting(false);
      setRowTestingId(null);
    }
  };

  const testRowModel = async (m: AiModel) => {
    const modelLabel = `${m.provider} / ${m.model_name}`;
    setRowTestingId(m.id);
    setListTestFeedback(null);
    setTesting(true);
    try {
      const result = await testSavedAiModel(m.id);
      const message =
        result.latencyMs != null
          ? `${result.message}（${result.latencyMs} ms）`
          : result.message;
      setListTestFeedback({
        modelId: m.id,
        modelLabel,
        ok: result.ok,
        message,
      });
    } catch (e) {
      setListTestFeedback({
        modelId: m.id,
        modelLabel,
        ok: false,
        message: e instanceof Error ? e.message : String(e),
      });
    } finally {
      setTesting(false);
      setRowTestingId(null);
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
                    placeholder="https://api.deepseek.com"
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
                {testMessage && (
                  <p
                    className={`text-sm rounded-md px-3 py-2 ${
                      testOk
                        ? "text-green-800 bg-green-50 border border-green-200 dark:text-green-200 dark:bg-green-950/40"
                        : "text-destructive bg-destructive/10 border border-destructive/30"
                    }`}
                  >
                    {testMessage}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    disabled={testing || saving}
                    onClick={() =>
                      runConnectivityTest({
                        modelId: editingId ?? undefined,
                        useForm: !editingId || Boolean(form.api_key.trim()),
                      })
                    }
                  >
                    {testing ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Radio className="h-4 w-4" />
                    )}
                    {testing ? "测试中…" : "测试连通"}
                  </Button>
                  <Button type="submit" disabled={saving || testing}>
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
          {listTestFeedback && (
            <div
              className={`mx-4 mt-4 rounded-md border px-4 py-3 text-sm ${
                listTestFeedback.ok
                  ? "border-green-200 bg-green-50 text-green-900 dark:border-green-800 dark:bg-green-950/40 dark:text-green-100"
                  : "border-destructive/30 bg-destructive/10 text-destructive"
              }`}
              role="status"
            >
              <p className="font-medium">
                连通测试 · {listTestFeedback.modelLabel}
              </p>
              <p className="mt-1">{listTestFeedback.message}</p>
              <button
                type="button"
                className="mt-2 text-xs underline opacity-80 hover:opacity-100"
                onClick={() => setListTestFeedback(null)}
              >
                关闭
              </button>
            </div>
          )}
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
                  <TableHead className="w-[240px]">操作</TableHead>
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
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            title={
                              m.api_key_set
                                ? "测试 API 连通"
                                : "未标记 api_key_set，仍可尝试测试（依赖服务端已存密钥）"
                            }
                            disabled={rowTestingId === m.id}
                            onClick={() => testRowModel(m)}
                          >
                            {rowTestingId === m.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Radio className="h-4 w-4" />
                            )}
                            测试
                          </Button>
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
