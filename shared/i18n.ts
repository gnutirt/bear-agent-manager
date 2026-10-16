import { vi } from './i18n/vi.ts';
import { en } from './i18n/en.ts';

export type Lang = 'vi' | 'en';
export type LangSetting = 'auto' | Lang;
export const DICTS: Record<Lang, Record<string, string>> = { vi, en };

/** The machine's language: Vietnamese locale gives vi, anything else en. */
export const systemLang = (): Lang => (/^vi\b/i.test(Intl.DateTimeFormat().resolvedOptions().locale) ? 'vi' : 'en');
export const resolveLang = (s: LangSetting | undefined): Lang => (s === 'vi' || s === 'en' ? s : systemLang());

/** String for key in lang; a missing key falls back to vi, then to the key itself. {name} takes params.name. */
export function t(lang: Lang, key: string, params: Record<string, string | number> = {}): string {
  const s = DICTS[lang]?.[key] ?? vi[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));
}
