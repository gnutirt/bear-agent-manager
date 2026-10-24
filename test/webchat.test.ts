import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
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

test('isDuckUrl: recognizes duck.ai and subdomains only, rejects duckduckgo.com and others', () => {
  assert.equal(isDuckUrl('https://duck.ai/chat'), true);
  assert.equal(isDuckUrl('https://duck.ai/'), true);
  assert.equal(isDuckUrl('https://app.duck.ai/chat?chatID=123'), true);

  // Rejected URLs
  assert.equal(isDuckUrl('https://duckduckgo.com/?q=DuckDuckGo+AI+Chat&ia=chat'), false, 'duckduckgo.com with ia=chat no longer accepted');
  assert.equal(isDuckUrl('https://duckduckgo.com/?ia=chat'), false, 'duckduckgo.com no longer accepted');
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
  termsModalMissingAgree?: boolean;
  streamForever?: boolean;
  inputDelayChecks?: number;
} = {}) {
  const sent: string[] = [], attached: string[] = [], opened: string[] = [];
  const clickedTerms: number[] = [];
  let termsAccepted = !opts.termsModal && !opts.termsModalMissingAgree;
  let inputChecks = 0;
  const tab = (url: string): Tab => ({ type: 'page', url, webSocketDebuggerUrl: `ws://x/${url}` });
  const tabs = opts.tabs ?? [tab('https://google.com/'), tab('https://duck.ai/chat')];
  let polls = 0, items: Item[] = [u('old'), a('old answer')];

  const cdp: Cdp = {
    async tabs() { if (tabs === 'down') throw new Error('ECONNREFUSED'); return tabs; },
    async open(url: string) {
      opened.push(url);
      const newTab = tab(url);
      if (Array.isArray(tabs)) tabs.push(newTab);
      return newTab;
    },
    async attach(t) {
      attached.push(t.url);
      const page: Page = {
        close() {},
        async eval(expr: string) {
          sent.push(expr);
          // 0. New chat navigation
          if (expr.includes('window.location.href')) {
            items = [];
            return true;
          }
          // 1. Bot check
          if (expr.includes('verify you are human')) {
            return !!opts.botChallenge;
          }
          // 2. Terms agreement
          if (expr.includes('DUCKAI_ONBOARDING_AGREE')) {
            if (opts.termsModalMissingAgree) {
              return 'needs-user';
            }
            if (!termsAccepted) {
              termsAccepted = true;
              clickedTerms.push(Date.now());
              return true;
            }
            return false;
          }
          // 3. Has input
          if (expr.includes('textarea[name=user-prompt]') && expr.startsWith('!!')) {
            if (opts.inputDelayChecks !== undefined && inputChecks < opts.inputDelayChecks) {
              inputChecks++;
              return false;
            }
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
  return { cdp, sent, attached, clickedTerms, opened };
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
  assert.ok(c.sent.some((s) => s.includes('window.location.href')), 'navigated to newChatUrl');
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

test('duckAsk: terms modal present without DUCKAI_ONBOARDING_AGREE throws needs-user', async () => {
  const c = fakeDuckChrome({ termsModalMissingAgree: true });
  await assert.rejects(
    duckAsk(c.cdp, 'Hello terms', 60, fast),
    (e: any) => e instanceof WebChatError && e.message.includes('needs-user')
  );
  assert.ok(!c.sent.some((s) => s.includes('closest(\'form\')')), 'never sends prompt when terms cannot be accepted');
});

test('duckAsk: answer containing "unusual traffic" is returned normally without triggering needs-user', async () => {
  const c = fakeDuckChrome({ answer: ['We detected unusual traffic on your router, please check.'] });
  const r = await duckAsk(c.cdp, 'Tell me about unusual traffic', 60, fast);
  assert.equal(r.text, 'We detected unusual traffic on your router, please check.');
  assert.equal(r.timedOut, false);
});

test('DUCK_BOT_CHECK: strips user and assistant messages so conversation text does not trigger false positive', () => {
  // 1. When assistant response contains "unusual traffic", clone strips it and returns false
  const mockElements: Array<{ tag: string; selector: string; text: string }> = [
    { tag: 'div', selector: '[data-activeresponse]', text: 'Unusual traffic detected in logs' },
    { tag: 'div', selector: '[data-testid=user-message]', text: 'Verify you are human prompt' },
    { tag: 'textarea', selector: 'textarea', text: 'prompt' },
  ];
  let stripped = false;
  const ctx = {
    document: {
      querySelector: () => null,
      body: {
        cloneNode: () => ({
          querySelectorAll: (sel: string) => {
            if (sel.includes('user-message')) {
              stripped = true;
              return mockElements.map(() => ({ remove: () => {} }));
            }
            return [];
          },
          innerText: 'Duck.ai normal header and chrome',
        }),
      },
    },
  };
  const res = vm.runInNewContext(DUCK.js.botCheck!, ctx);
  assert.equal(res, false, 'botCheck ignores keywords inside user or assistant messages');
  assert.equal(stripped, true, 'clone stripped messages');

  // 2. Real bot challenge outside messages triggers true
  const challengeCtx = {
    document: {
      querySelector: () => null,
      body: {
        cloneNode: () => ({
          querySelectorAll: () => [],
          innerText: 'Cloudflare security verification: unusual traffic from your IP network',
        }),
      },
    },
  };
  const challengeRes = vm.runInNewContext(DUCK.js.botCheck!, challengeCtx);
  assert.equal(challengeRes, true, 'botCheck detects challenge text outside messages');
});

test('DUCK_ACCEPT_TERMS: clicks DUCKAI_ONBOARDING_AGREE and returns needs-user when modal lacks button', () => {
  // Case A: button present
  let clicked = false;
  const ctxWithBtn = {
    document: {
      querySelector: (sel: string) => {
        if (sel === 'button[data-testid="DUCKAI_ONBOARDING_AGREE"]') {
          return { disabled: false, click: () => { clicked = true; } };
        }
        return null;
      },
    },
  };
  const resA = vm.runInNewContext(DUCK.js.acceptTerms!, ctxWithBtn);
  assert.equal(resA, true);
  assert.equal(clicked, true);

  // Case B: modal present but button is missing
  const ctxModalNoBtn = {
    document: {
      querySelector: (sel: string) => {
        if (sel.includes('privacy-terms') || sel.includes('onboardingModal')) return {};
        return null;
      },
    },
  };
  const resB = vm.runInNewContext(DUCK.js.acceptTerms!, ctxModalNoBtn);
  assert.equal(resB, 'needs-user', 'returns needs-user when terms modal is present without agree button');

  // Case C: no modal
  const ctxNoModal = { document: { querySelector: () => null } };
  const resC = vm.runInNewContext(DUCK.js.acceptTerms!, ctxNoModal);
  assert.equal(resC, false);
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
  const cdpWithoutOpen: Cdp = {
    async tabs() { return [t('https://google.com/')]; },
    async attach() { throw new Error('should not attach'); },
  };
  await assert.rejects(duckAsk(cdpWithoutOpen, 'hi', 5, fast), /No duck\.ai tab/);

  const c = fakeDuckChrome();
  await assert.rejects(duckAsk(c.cdp, '   ', 5, fast), /prompt is empty/);
  await assert.rejects(duckAsk(c.cdp, 'x'.repeat(8001), 5, fast), /longer than 8000/);
  assert.deepEqual(c.attached, [], 'rejected prompt never touches Chrome');
});

test('duckAsk: opens duck tab via cdp.open when no duck.ai tab exists initially', async () => {
  const t = (url: string): Tab => ({ type: 'page', url, webSocketDebuggerUrl: `ws://x/${url}` });
  const c = fakeDuckChrome({ tabs: [t('https://google.com/')], answer: ['fresh opened tab answer'] });
  const r = await duckAsk(c.cdp, 'Hello after open', 60, fast);
  assert.equal(r.text, 'fresh opened tab answer');
  assert.deepEqual(c.opened, ['https://duck.ai/chat'], 'opened duck.ai tab');
  assert.ok(c.attached.includes('https://duck.ai/chat'), 'attached to opened tab');
});

test('duckAsk: delayed input availability (simulating 600ms load) resolves via polling without throwing notSignedIn', async () => {
  // inputDelayChecks: 3 means hasInput returns false for first 3 checks, then true
  const c = fakeDuckChrome({ inputDelayChecks: 3, answer: ['delayed answer'] });
  const r = await duckAsk(c.cdp, 'Hello delayed', 60, fast);
  assert.equal(r.text, 'delayed answer');
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
