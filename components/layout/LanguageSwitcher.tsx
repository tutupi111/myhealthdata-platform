"use client";

import { cn } from "@/lib/utils";
import { useLocale } from "@/context/LocaleContext";
import type { Locale } from "@/lib/i18n";

const OPTIONS: Locale[] = ["zh", "en"];

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale, t } = useLocale();

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-border bg-background p-0.5 text-xs font-medium",
        className
      )}
      role="group"
      aria-label={t("language.switchTo")}
    >
      {OPTIONS.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => setLocale(code)}
          className={cn(
            "rounded px-2.5 py-1 transition-colors",
            locale === code
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-pressed={locale === code}
        >
          {t(`language.${code}`)}
        </button>
      ))}
    </div>
  );
}
