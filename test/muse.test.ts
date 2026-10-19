import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { isDone, isLoginUrl, isMuseUrl, joinAnswer, MuseError, museAsk, museStatus, type Cdp, type Item, type Page, type Tab } from '../mcp/muse-core.ts';
import { board, makeHandler, TOOLS } from '../mcp/muse.ts';

const u = (text = 'q'): Item => ({ role: 'user', text, hasCopy: false });
const a = (text: string, hasCopy = true): Item => ({ role: 'assistant', text, hasCopy });

test('isDone needs no Stop, a finished assistant item and 2 s of stable text', () => {
  const items = [u(), a('PONG-42')];
  assert.equal(isDone({ stop: true, items }, 'PONG-42', 0, 5000), false, 'still streaming');
  assert.equal(isDone({ stop: false, items: [u(), a('', false)] }, '', 0, 5000), false, 'the empty blink at second 1');
  assert.equal(isDone({ stop: false, items }, 'PONG-42', 4000, 5000), false, 'stable for 1 s only');
  assert.equal(isDone({ stop: false, items }, 'PONG-42', 2000, 5000), true);
});

test('joinAnswer joins every assistant bubble after our user item and ignores older turns', () => {
  const items = [u(), a('old'), u(), a('part one'), a('part two')];
  assert.equal(joinAnswer(items, 2), 'part one\n\npart two');
  assert.equal(joinAnswer(items, 4), '');
  assert.equal(joinAnswer([u(), a('x')], 0), 'x');
});

test('only the real muse.ai host counts, never a URL that merely contains the name', () => {
  assert.equal(isMuseUrl('https://muse.ai/chat'), true);
  assert.equal(isMuseUrl('https://app.muse.ai/'), true);
  for (const bad of ['https://evil.com/muse.ai', 'https://muse.ai.evil.com/', 'https://notmuse.ai/', 'https://evil.com/?u=muse.ai', 'not a url', '']) assert.equal(isMuseUrl(bad), false, bad);
  assert.equal(isLoginUrl('https://www.instagram.com/accounts/login/'), true);
});

/** A debug Chrome with scripted pages: every script the server sends is recorded; unknown tabs must never be attached. */
function fakeChrome(opts: { tabs?: Tab[] | 'down'; answer?: string[]; signedIn?: boolean; streamForever?: boolean } = {}) {
  const sent: string[] = [], attached: string[] = [];
  const tab = (url: string): Tab => ({ type: 'page', url, webSocketDebuggerUrl: `ws://x/${url}` });
  const tabs = opts.tabs ?? [tab('https://google.com/'), tab('https://muse.ai/chat')];
  let polls = 0, items: Item[] = [u('old'), a('old answer')];
  const cdp: Cdp = {
    async tabs() { if (tabs === 'down') throw new Error('ECONNREFUSED'); return tabs; },
    async attach(t) {
      attached.push(t.url);
      const page: Page = {
        close() {},
        async eval(expr: string) {
          sent.push(expr);
          if (expr.includes('textarea[placeholder=Message]') && expr.startsWith('!!')) return opts.signedIn !== false;
          if (expr.includes('.length') && expr.startsWith('document')) return items.length;
          if (expr.includes('Object.getOwnPropertyDescriptor')) { items = [...items, u('the question')]; return true; }
          if (expr.includes('button[aria-label=Send]')) return true;
          if (expr.includes('stop:')) {
            polls++;
            const parts = opts.answer ?? ['PONG-42'];
            const shown = parts.slice(0, opts.streamForever ? Math.max(1, polls) : parts.length);
            const stop = opts.streamForever ? true : polls < 2;
            return { stop, items: [...items, ...shown.map((p, i) => a(`${p}${opts.streamForever ? polls : ''}`, !stop && i === shown.length - 1))] };
          }
          return null;
        },
      };
      return page;
    },
  };
  return { cdp, sent, attached };
}
const fast = { sleep: async () => {}, now: (() => { let t = 0; return () => (t += 700); })() };

test('museAsk: sends the prompt as data, waits for the end and returns the whole answer', async () => {
  const c = fakeChrome({ answer: ['part one', 'part two'] });
  const r = await museAsk(c.cdp, 'Reply with "quoted" text\nand ${a} `b`', 60, fast);
  assert.equal(r.text, 'part one\n\npart two'); assert.equal(r.timedOut, false);
  assert.deepEqual(c.attached, ['https://muse.ai/chat'], 'only the muse.ai tab was attached');
  const set = c.sent.find((s) => s.includes('Object.getOwnPropertyDescriptor'))!;
  assert.ok(set.includes(JSON.stringify('Reply with "quoted" text\nand ${a} `b`')), 'the prompt travels as a JSON string');
});

test('museAsk: clear errors for Chrome down, no muse tab, signed out, empty or huge prompt', async () => {
  await assert.rejects(museAsk(fakeChrome({ tabs: 'down' }).cdp, 'hi', 5, fast), /Chrome debug is not running/);
  const t = (url: string): Tab => ({ type: 'page', url, webSocketDebuggerUrl: 'ws://x' });
  await assert.rejects(museAsk(fakeChrome({ tabs: [t('https://google.com/')] }).cdp, 'hi', 5, fast), /No muse\.ai tab/);
  await assert.rejects(museAsk(fakeChrome({ tabs: [t('https://www.instagram.com/accounts/login/')] }).cdp, 'hi', 5, fast), /not signed in/);
  await assert.rejects(museAsk(fakeChrome({ signedIn: false }).cdp, 'hi', 5, fast), /not signed in/);
  const c = fakeChrome();
  await assert.rejects(museAsk(c.cdp, '   ', 5, fast), /prompt is empty/);
  await assert.rejects(museAsk(c.cdp, 'x'.repeat(8001), 5, fast), /longer than 8000/);
  assert.deepEqual(c.attached, [], 'a refused prompt never touches Chrome');
});

test('museAsk: a timeout returns what Muse had written so far', async () => {
  const r = await museAsk(fakeChrome({ answer: ['a', 'b', 'c'], streamForever: true }).cdp, 'hi', 5, fast);
  assert.equal(r.timedOut, true); assert.ok(r.text.length > 0);
});

test('museStatus reports Chrome, sign-in and busy', async () => {
  assert.deepEqual(await museStatus(fakeChrome({ tabs: 'down' }).cdp, false), { chrome: false, loggedIn: false, busy: false });
  assert.deepEqual(await museStatus(fakeChrome({ tabs: [{ type: 'page', url: 'https://google.com/', webSocketDebuggerUrl: 'ws://x' }] }).cdp, false), { chrome: true, loggedIn: false, busy: false });
  assert.deepEqual(await museStatus(fakeChrome().cdp, true), { chrome: true, loggedIn: true, busy: true });
});

test('MCP handler: tools, errors as isError, questions run one after the other, the board never holds the prompt or the answer', async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'muse-home-'));
  const c = fakeChrome({ answer: ['SECRET-ANSWER'] });
  const order: string[] = [];
  const slow: Cdp = { tabs: c.cdp.tabs, async attach(t) { order.push('start'); const p = await c.cdp.attach(t); return { eval: async (e: string) => { await new Promise((r) => setTimeout(r, 1)); return p.eval(e); }, close() { order.push('end'); p.close(); } }; } };
  const handle = makeHandler(slow, home, 'sid1');
  assert.deepEqual(((await handle('tools/list', {})) as any).tools.map((t: any) => t.name), ['muse_ask', 'muse_status']);
  assert.match(TOOLS[0].description, /UNVERIFIED/); assert.match(TOOLS[0].description, /never send secrets/i);
  const call = (n: string, args: object) => handle('tools/call', { name: n, arguments: args }) as Promise<any>;
  // sleeps are real here, so keep the polling cheap: the fake answers on the 2nd poll (about 2 s)
  const [r1, r2] = await Promise.all([call('muse_ask', { prompt: 'PRIVATE-PROMPT one', timeout_s: 30 }), call('muse_ask', { prompt: 'PRIVATE-PROMPT two', timeout_s: 30 })]);
  assert.match(r1.content[0].text, /SECRET-ANSWER/); assert.match(r2.content[0].text, /SECRET-ANSWER/);
  assert.deepEqual(order, ['start', 'end', 'start', 'end'], 'the second question waited for the first');
  const lines = fs.readFileSync(path.join(home, 'workers.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.equal(lines.length, 4); assert.deepEqual(lines.map((l) => l.event), ['start', 'end', 'start', 'end']);
  assert.ok(lines.every((l) => l.kind === 'muse' || l.event === 'end'));
  assert.ok(!fs.readFileSync(path.join(home, 'workers.jsonl'), 'utf8').match(/PRIVATE-PROMPT|SECRET-ANSWER/), 'neither prompt nor answer is written');
  const down = makeHandler(fakeChrome({ tabs: 'down' }).cdp, home, 'sid1');
  const err = (await down('tools/call', { name: 'muse_ask', arguments: { prompt: 'hi' } })) as any;
  assert.equal(err.isError, true); assert.match(err.content[0].text, /Chrome debug is not running/);
  assert.equal(((await handle('tools/call', { name: 'muse_status', arguments: {} })) as any).content[0].text.includes('"chrome":true'), true);
  await assert.rejects(handle('tools/call', { name: 'nope', arguments: {} }), /unknown tool/);
});

test('board writes a start and an end line for the Worker board', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'muse-board-'));
  board(home, 's9', 42)(0);
  const [s, e] = fs.readFileSync(path.join(home, 'workers.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  assert.deepEqual([s.event, s.kind, s.provider, s.tier, s.task, s.by], ['start', 'muse', 'muse', 'free', 'muse_ask (42 characters)', 's9']);
  assert.deepEqual([e.event, e.id === s.id, e.exit], ['end', true, 0]);
});
