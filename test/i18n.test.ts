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
