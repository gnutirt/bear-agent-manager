import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('Flow fits one frame on desktop, stacks tiers on mobile and keeps recent feed text readable', async () => {
  const html = await readFile(new URL('../ui/index.html', import.meta.url), 'utf8');

  assert.ok(html.includes('.flow-stage{position:relative;height:calc(100vh - 270px)'), 'graph fits one frame');
  assert.ok(html.includes('@media (max-width:760px)'), 'mobile layout block');
  assert.ok(!html.includes('flow-scroll-hint') && !html.includes('graphScrollLeft'), 'no horizontal scroll workaround left');
  assert.ok(!html.includes('.flow-feed li.new{animation:flow-slide'), 'live rerenders must not fade recent feed text');
});
