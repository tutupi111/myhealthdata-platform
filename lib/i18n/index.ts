import { en } from "./locales/en";
import { zh } from "./locales/zh";
import type { Locale, Messages } from "./types";

export type { Locale, Messages };

const dictionaries: Record<Locale, Messages> = { zh, en };

export function getMessages(locale: Locale): Messages {
  return dictionaries[locale];
}

function getNestedValue(obj: unknown, path: string): string | undefined {
  const value = path.split(".").reduce<unknown>((acc, key) => {
    if (acc && typeof acc === "object" && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj);
  return typeof value === "string" ? value : undefined;
}

export function createTranslator(locale: Locale) {
  const messages = getMessages(locale);
  return function t(key: string, vars?: Record<string, string>): string {
    const raw = getNestedValue(messages, key) ?? key;
    if (!vars) return raw;
    return raw.replace(/\{(\w+)\}/g, (_, name: string) => vars[name] ?? `{${name}}`);
  };
}

export const LOCALE_STORAGE_KEY = "ehf_locale";
