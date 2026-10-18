import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DICTS, resolveLang, t } from '../shared/i18n.ts';
import { defaultSettings, patchSettings } from '../hub/settings.ts';

const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

test('vi and en have the same keys and the same {params} per key', () => {
  assert.deepEqual(Object.keys(DICTS.en).sort(), Object.keys(DICTS.vi).sort());
  for (const k of Object.keys(DICTS.vi)) assert.deepEqual(params(DICTS.en[k]), params(DICTS.vi[k]), k);
});

test('t fills params and falls back to vi, then to the key', () => {
  assert.equal(t('en', 'settings.language.auto', { lang: 'English' }), 'Automatic, from this computer (English)');
  assert.equal(t('en', 'settings.language.auto'), 'Automatic, from this computer ({lang})');
  assert.equal(t('en', 'no.such.key'), 'no.such.key');
  assert.equal(resolveLang('en'), 'en');
  assert.ok(['vi', 'en'].includes(resolveLang('auto')));
});

test('settings.language: auto by default, only auto/vi/en accepted', () => {
  const d = defaultSettings(4);
  assert.equal(d.language, 'auto');
  assert.equal(patchSettings(d, { language: 'en' }).language, 'en');
  assert.equal(patchSettings(patchSettings(d, { language: 'vi' }), { language: 'fr' }).language, 'vi');
});

test('loadDicts reads edited dictionaries again and keeps the last good ones when a file is broken', async () => {
  const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path');
  const { loadDicts } = await import('../shared/i18n.ts');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'i18n-'));
  const write = (l: string, text: string, at: number) => {
    const f = path.join(dir, `${l}.ts`);
    fs.writeFileSync(f, `export const ${l}: Record<string, string> = { 'a.b': ${JSON.stringify(text)} };\n`);
    fs.utimesSync(f, at, at);
  };
  write('vi', 'một', 1000); write('en', 'one', 1000);
  assert.equal((await loadDicts(dir)).en['a.b'], 'one');
  write('en', 'two', 2000);
  assert.equal((await loadDicts(dir)).en['a.b'], 'two');
  fs.writeFileSync(path.join(dir, 'en.ts'), 'export const en = {');   // half-saved file
  fs.utimesSync(path.join(dir, 'en.ts'), 3000, 3000);
  assert.equal((await loadDicts(dir)).en['a.b'], 'two');
  fs.rmSync(dir, { recursive: true, force: true });
});

test('GET /api/i18n gives the setting, the machine language and both dictionaries', async () => {
  const { makeHub } = await import('./helpers.ts');
  const { hub, call } = await makeHub();
  try {
    await call('/api/settings', { language: 'en' }, { method: 'PUT' });
    const d = await call<any>('/api/i18n');
    assert.equal(d.setting, 'en');
    assert.ok(['vi', 'en'].includes(d.system));
    assert.equal(d.dicts.en['settings.language'], 'Language');
  } finally { await hub.close(); }
});
