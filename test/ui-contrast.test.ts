import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

// Text contrast of the main colour tokens, for every theme of ui/index.html (WCAG AA: 4.5:1 for normal text).
// A new colour that breaks a pair fails here, before anyone has to look at the page. The glass themes use translucent
// surfaces over a moving background, so they are measured in the browser (docs/ui-a11y.md), not here.
const html = fs.readFileSync(new URL('../ui/index.html', import.meta.url), 'utf8');

const vars = (block: string) => Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*([^;}]+)/g)].map((m) => [m[1], m[2].trim()]));
const root = vars(/:root\{([^}]*)\}/.exec(html)?.[1] ?? '');
const themes: Record<string, Record<string, string>> = {};
for (const m of html.matchAll(/:root\[data-theme=(\w+)\]\{([^}]*)\}/g)) themes[m[1]] = { ...(themes[m[1]] ?? {}), ...vars(m[2]) };
// "auto" follows the system: its dark values live in a media block
const autoDark = vars(/@media \(prefers-color-scheme:dark\)\{:root\[data-theme=auto\]\{([^}]*)\}/.exec(html)?.[1] ?? '');
// themes whose accent is light get dark ink: ":root:is([data-theme=a],[data-theme=b]){--on-accent:#..}"
const darkInk = new Set<string>();
for (const m of html.matchAll(/:root:is\(([^)]*)\)\{--on-accent:(#\w+)\}/g)) for (const n of m[1].matchAll(/data-theme=(\w+)/g)) darkInk.add(n[1]);

if (/prefers-color-scheme:dark\)\{:root\[data-theme=auto\]\{--on-accent:/.test(html)) darkInk.add('auto');

const rgb = (s?: string) => { const m = /^#([0-9a-f]{6})$/i.exec(String(s ?? '').trim()); if (!m) return null; const n = parseInt(m[1], 16); return { r: n >> 16, g: (n >> 8) & 255, b: n & 255 }; };
const lum = (c: { r: number; g: number; b: number }) => { const f = (v: number) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
const ratio = (a: string, b: string) => { const x = rgb(a), y = rgb(b); if (!x || !y) return null; const p = lum(x), q = lum(y); return (Math.max(p, q) + 0.05) / (Math.min(p, q) + 0.05); };

const named: [string, Record<string, string>][] = [['light', {}], ...Object.entries(themes).filter(([n]) => n !== 'auto'), ['auto (dark)', autoDark]];
const PAIRS: [string, string, string][] = [
  ['--text', '--bg', 'body text'], ['--text', '--panel', 'text on panels'],
  ['--mute', '--bg', 'muted text'], ['--mute', '--panel', 'muted text on panels'],
  ['--side-text', '--side', 'sidebar text'], ['--side-mute', '--side', 'sidebar muted text'],
];

test('main colour tokens keep WCAG AA contrast in every theme', () => {
  assert.ok(named.length >= 12, 'themes were found in the stylesheet');
  const bad: string[] = [];
  for (const [name, own] of named) {
    const t = { ...root, ...(name === 'auto (dark)' ? themes.dark ?? {} : {}), ...own };
    for (const [fg, bg, what] of PAIRS) {
      const r = ratio(t[fg], t[bg]);
      if (r !== null && r < 4.5) bad.push(`${name}: ${what} ${fg} ${t[fg]} on ${bg} ${t[bg]} = ${r.toFixed(2)}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('text on the accent colour is readable in every theme (--on-accent or white)', () => {
  const bad: string[] = [];
  for (const [name, own] of named) {
    const t = { ...root, ...(name === 'auto (dark)' ? themes.dark ?? {} : {}), ...own };
    const key = name === 'auto (dark)' ? 'auto' : name;
    const ink = darkInk.has(key) ? '#0B1020' : '#FFFFFF';
    const r = ratio(ink, t['--accent']);
    if (r !== null && r < 4.5) bad.push(`${name}: ${ink} on accent ${t['--accent']} = ${r.toFixed(2)}`);
  }
  assert.deepEqual(bad, []);
});
