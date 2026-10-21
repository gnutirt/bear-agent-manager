import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('mobile Flow keeps all tiers horizontally scrollable and recent feed text readable', async () => {
  const html = await readFile(new URL('../ui/index.html', import.meta.url), 'utf8');
  const en = await readFile(new URL('../shared/i18n/en.ts', import.meta.url), 'utf8');
  const vi = await readFile(new URL('../shared/i18n/vi.ts', import.meta.url), 'utf8');

  assert.ok(html.includes('.flow-canvas{overflow:auto'));
  assert.ok(html.includes('.flow-scroll-hint{display:block;margin-right:auto}'));
  assert.ok(html.includes('<span class="flow-scroll-hint">${t(\'flow.scrollHint\')}</span>'));
  assert.ok(html.includes("el.querySelector('#flowCanvas').scrollLeft = graphScrollLeft"));
  assert.ok(html.includes('graph.style.width = `max(100%, ${Math.round(graphW * .8)}px)`'));
  assert.ok(html.includes("if (window.matchMedia('(max-width:650px)').matches) graph.style.width = `max(100%, ${graphW}px)`"));
  assert.ok(!html.includes('.flow-feed li.new{animation:flow-slide'), 'live rerenders must not fade recent feed text');
  assert.ok(en.includes("'flow.scrollHint': 'Swipe horizontally"));
  assert.ok(vi.includes("'flow.scrollHint': 'Vuốt ngang"));
});
