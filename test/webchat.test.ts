import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  isDuckUrl,
  duckAsk,
  duckStatus,
  DUCK,
  WebChatError,
  type Cdp,
  type Item,
  type Page,
  type Tab,
} from '../mcp/webchat-core.ts';

const u = (text = 'q'): Item => ({ role: 'user', text, hasCopy: false });
const a = (text: string, hasCopy = true): Item => ({ role: 'assistant', text, hasCopy });

test('isDuckUrl: recognizes duck.ai and duckduckgo.com with ia=chat, rejects others', () => {
  assert.equal(isDuckUrl('https://duck.ai/chat'), true);
  assert.equal(isDuckUrl('https://duck.ai/'), true);
  assert.equal(isDuckUrl('https://app.duck.ai/chat?chatID=123'), true);
  assert.equal(isDuckUrl('https://duckduckgo.com/?q=DuckDuckGo+AI+Chat&ia=chat'), true);
  assert.equal(isDuckUrl('https://duckduckgo.com/?ia=chat'), true);

  // Rejected URLs
  assert.equal(isDuckUrl('https://duckduckgo.com/?q=hello'), false, 'no ia=chat');
  assert.equal(isDuckUrl('https://evil.com/duck.ai'), false, 'path match only');
  assert.equal(isDuckUrl('https://duck.ai.evil.com/'), false, 'subdomain spoofing');
  assert.equal(isDuckUrl('https://evil.com/?ia=chat'), false, 'other host with ia=chat');
  assert.equal(isDuckUrl('not a url'), false);
  assert.equal(isDuckUrl(''), false);
});

function fakeDuckChrome(opts: {
  tabs?: Tab[] | 'down';
  answer?: string[];
  botChallenge?: boolean;
  termsModal?: boolean;
  streamForever?: boolean;
} = {}) {
  const sent: string[] = [], attached: string[] = [];
  const clickedTerms: number[] = [];
  let termsAccepted = !opts.termsModal;
  const tab = (url: string): Tab => ({ type: 'page', url, webSocketDebuggerUrl: `ws://x/${url}` });
  const tabs = opts.tabs ?? [tab('https://google.com/'), tab('https://duck.ai/chat')];
  let polls = 0, items: Item[] = [u('old'), a('old answer')];

  const cdp: Cdp = {
    async tabs() { if (tabs === 'down') throw new Error('ECONNREFUSED'); return tabs; },
    async attach(t) {
      attached.push(t.url);
      const page: Page = {
        close() {},
        async eval(expr: string) {
          sent.push(expr);
          // 1. Bot check
          if (expr.includes('verify you are human')) {
            return !!opts.botChallenge;
          }
          // 2. Terms agreement
          if (expr.includes('DUCKAI_ONBOARDING_AGREE')) {
            if (!termsAccepted) {
              termsAccepted = true;
              clickedTerms.push(Date.now());
              return true;
            }
            return false;
          }
          // 3. Has input
          if (expr.includes('textarea[name=user-prompt]') && expr.startsWith('!!')) {
            return termsAccepted;
          }
          // 4. Model selection
          if (expr.includes('data-testid=model-picker-button')) {
            return true;
          }
          // 5. Count
          if (expr.includes('.length') && expr.startsWith('document')) {
            return items.length;
          }
          // 6. Set prompt
          if (expr.includes('Object.getOwnPropertyDescriptor')) {
            items = [...items, u('the question')];
            return true;
          }
          // 7. Click send
          if (expr.includes('closest(\'form\')')) {
            return true;
          }
          // 8. Snap (polling)
          if (expr.includes('Stop generating')) {
            polls++;
            const parts = opts.answer ?? ['DUCK-42'];
            const shown = parts.slice(0, opts.streamForever ? Math.max(1, polls) : parts.length);
            const stop = opts.streamForever ? true : polls < 2;
            return {
              stop,
              items: [
                ...items,
                ...shown.map((p, i) => a(`${p}${opts.streamForever ? polls : ''}`, !stop && i === shown.length - 1))
              ]
            };
          }
          return null;
        },
      };
      return page;
    },
  };
  return { cdp, sent, attached, clickedTerms };
}

const fast = { sleep: async () => {}, now: (() => { let t = 0; return () => (t += 700); })() };

test('duckAsk: sends the prompt as data, waits for stream to finish, returns answer', async () => {
  const c = fakeDuckChrome({ answer: ['duck answer 1', 'duck answer 2'] });
  const r = await duckAsk(c.cdp, 'Hello Duck, how are you?', 60, fast);
  assert.equal(r.text, 'duck answer 1\n\nduck answer 2');
  assert.equal(r.timedOut, false);
  assert.deepEqual(c.attached, ['https://duck.ai/chat'], 'only the duck.ai tab was attached');

  const set = c.sent.find((s) => s.includes('Object.getOwnPropertyDescriptor'))!;
  assert.ok(set.includes(JSON.stringify('Hello Duck, how are you?')), 'prompt is sent as JSON string');
  assert.ok(c.sent.some((s) => s.includes('closest(\'form\')')), 'submit button was clicked');
});

test('duckAsk: bot challenge stops immediately, throws needs-user, clicks nothing', async () => {
  const c = fakeDuckChrome({ botChallenge: true });
  await assert.rejects(
    duckAsk(c.cdp, 'Hello', 60, fast),
    (e: any) => e instanceof WebChatError && e.message.includes('needs-user')
  );
  // Verify that neither setPrompt nor submit click was ever evaluated
  assert.ok(!c.sent.some((s) => s.includes('Object.getOwnPropertyDescriptor')), 'never sets prompt on bot challenge');
  assert.ok(!c.sent.some((s) => s.includes('closest(\'form\')')), 'never clicks send on bot challenge');
});

test('duckAsk: auto-accepts terms modal once when present, then sends prompt', async () => {
  const c = fakeDuckChrome({ termsModal: true, answer: ['agreed answer'] });
  const r = await duckAsk(c.cdp, 'Question after terms', 60, fast);
  assert.equal(r.text, 'agreed answer');
  assert.equal(c.clickedTerms.length, 1, 'terms button clicked exactly once');
  assert.ok(c.sent.some((s) => s.includes('closest(\'form\')')), 'proceeded to send prompt after terms');
});

test('duckAsk: model selection evaluates on page when model option is passed', async () => {
  const c = fakeDuckChrome({ answer: ['model answer'] });
  const r = await duckAsk(c.cdp, 'Hi model', { model: 'claude-haiku-4-5', timeoutS: 60, env: fast });
  assert.equal(r.text, 'model answer');
  assert.ok(
    c.sent.some((s) => s.includes('data-testid=model-picker-button') && s.includes('claude-haiku-4-5')),
    'model picker was called with requested model name'
  );
});

test('duckAsk: clear errors for Chrome down, no duck tab, empty or oversized prompt', async () => {
  await assert.rejects(duckAsk(fakeDuckChrome({ tabs: 'down' }).cdp, 'hi', 5, fast), /Chrome debug is not running/);
  const t = (url: string): Tab => ({ type: 'page', url, webSocketDebuggerUrl: 'ws://x' });
  await assert.rejects(duckAsk(fakeDuckChrome({ tabs: [t('https://google.com/')] }).cdp, 'hi', 5, fast), /No duck\.ai tab/);

  const c = fakeDuckChrome();
  await assert.rejects(duckAsk(c.cdp, '   ', 5, fast), /prompt is empty/);
  await assert.rejects(duckAsk(c.cdp, 'x'.repeat(8001), 5, fast), /longer than 8000/);
  assert.deepEqual(c.attached, [], 'rejected prompt never touches Chrome');
});

test('duckAsk: a timeout returns what Duck had written so far', async () => {
  const r = await duckAsk(fakeDuckChrome({ answer: ['a', 'b', 'c'], streamForever: true }).cdp, 'hi', 5, fast);
  assert.equal(r.timedOut, true);
  assert.ok(r.text.length > 0);
});

test('duckStatus: reports Chrome running, duck tab presence and busy', async () => {
  assert.deepEqual(await duckStatus(fakeDuckChrome({ tabs: 'down' }).cdp, false), { chrome: false, loggedIn: false, busy: false });
  assert.deepEqual(await duckStatus(fakeDuckChrome({ tabs: [{ type: 'page', url: 'https://google.com/', webSocketDebuggerUrl: 'ws://x' }] }).cdp, false), { chrome: true, loggedIn: false, busy: false });
  assert.deepEqual(await duckStatus(fakeDuckChrome().cdp, true), { chrome: true, loggedIn: true, busy: true });
});
