import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { vi } from './i18n/vi.ts';
import { en } from './i18n/en.ts';

export type Lang = 'vi' | 'en';
export type LangSetting = 'auto' | Lang;
export type Dicts = Record<Lang, Record<string, string>>;
export const DICTS: Dicts = { vi, en };
const DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'i18n');

/** The machine's language: Vietnamese locale gives vi, anything else en. */
export const systemLang = (): Lang => (/^vi\b/i.test(Intl.DateTimeFormat().resolvedOptions().locale) ? 'vi' : 'en');
/** Locale for dates in hub notices. */
export const dateLocale = (l: Lang) => (l === 'vi' ? 'vi-VN' : 'en-GB');
export const resolveLang = (s: LangSetting | undefined): Lang => (s === 'vi' || s === 'en' ? s : systemLang());

/** String for key in lang; a missing key falls back to vi, then to the key itself. {name} takes params.name. */
export function t(lang: Lang, key: string, params: Record<string, string | number> = {}): string {
  const s = DICTS[lang]?.[key] ?? DICTS.vi[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in params ? String(params[k]) : m));
}

const loaded = new Map<string, { stamp: string; dicts: Dicts }>();
/**
 * The dictionaries as they are on disk now: a running hub picks up edited strings without a restart
 * (the UI is served fresh, so new keys would otherwise show as raw key names). Re-imported only when
 * vi.ts or en.ts changed; a file that fails to load (half saved) keeps the last good dictionaries.
 */
export async function loadDicts(dir = DIR): Promise<Dicts> {
  const last = loaded.get(dir);
  const file = (l: Lang) => path.join(dir, `${l}.ts`);
  let stamp: string;
  try { stamp = (['vi', 'en'] as Lang[]).map((l) => fs.statSync(file(l)).mtimeMs).join('-'); } catch { return last?.dicts ?? DICTS; }
  if (last?.stamp === stamp) return last.dicts;
  try {
    // A new query string is a new module for the ESM loader, so the edited file is read again.
    const [v, e] = await Promise.all((['vi', 'en'] as Lang[]).map((l) => import(`${pathToFileURL(file(l)).href}?v=${stamp}`)));
    if (typeof v.vi !== 'object' || typeof e.en !== 'object') throw new Error('bad dictionary');
    const dicts: Dicts = { vi: v.vi, en: e.en };
    loaded.set(dir, { stamp, dicts });
    if (dir === DIR) Object.assign(DICTS, dicts);   // hub notices made with t() follow too
    return dicts;
  } catch { return last?.dicts ?? DICTS; }
}
