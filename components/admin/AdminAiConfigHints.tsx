"use client";

import { useLocale } from "@/context/LocaleContext";
import { getMessages } from "@/lib/i18n";

/** 管理端 AI 配置页：说明服务器 OCR 流水线与常见模型报错 */
export function AdminAiConfigHints({ showMoonshot = true }: { showMoonshot?: boolean }) {
  const { locale } = useLocale();
  const hints = getMessages(locale).adminAi;

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground rounded-lg border bg-muted/40 px-4 py-3">
        {hints.pipelineHint}
      </p>
      <p className="text-sm text-muted-foreground rounded-lg border bg-muted/40 px-4 py-3">
        {hints.llmBaseUrlHint}
      </p>
      {showMoonshot && (
        <>
          <p className="text-sm text-amber-800 dark:text-amber-200 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 px-4 py-3">
            {hints.deepseekHint}
          </p>
          <p className="text-sm text-amber-800 dark:text-amber-200 rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40 px-4 py-3">
            {hints.moonshotHint}
          </p>
        </>
      )}
    </div>
  );
}
