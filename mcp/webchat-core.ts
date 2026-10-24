// WebChat driver: generic browser-based chat driver over Chrome CDP.
// Supports Muse and Duck web chat interfaces.
// See docs/superpowers/specs/2026-10-24-duck-web-driver.md (§2, §3.1, §4).
export type Item = { role: 'user' | 'assistant'; text: string; hasCopy: boolean };
export type Snap = { stop: boolean; items: Item[] };
export type Tab = { type: string; url: string; webSocketDebuggerUrl: string };
/** One page of the debug Chrome: runs a fixed script and returns its value. */
export type Page = { eval(expression: string): Promise<any>; close(): void };
export type Cdp = { tabs(): Promise<Tab[]>; attach(tab: Tab): Promise<Page> };

export class WebChatError extends Error {}
export class MuseError extends WebChatError {}

export const MAX_PROMPT = 8000;

export type Site = {
  name: string;
  isUrl(u: string): boolean;
  isLogin?(u: string): boolean;
  newChatUrl?: string;
  js: {
    hasInput: string;
    count: string;
    setPrompt(p: string): string;
    click: string;
    snap: string;
    botCheck?: string;
    acceptTerms?: string;
    selectModel?: (model: string) => string;
  };
  errors: {
    noChrome: string;
    noTab: string;
    notSignedIn: string;
    noInput: string;
    noSend: string;
  };
  ErrorClass?: new (message: string) => Error;
};

/** Only the real muse.ai (or a subdomain): the host is parsed, never searched for in the text of the URL. */
export function isMuseUrl(u: string): boolean {
  try { const h = new URL(u).hostname.toLowerCase(); return h === 'muse.ai' || h.endsWith('.muse.ai'); } catch { return false; }
}
export const isLoginUrl = (u: string) => /\/(accounts\/)?(login|signin)\b/i.test(u) || /instagram\.com|facebook\.com/i.test(u);

/** Duck.ai (or Duck subdomains): parsed host, duck.ai or *.duck.ai only. */
export function isDuckUrl(u: string): boolean {
  try {
    const host = new URL(u).hostname.toLowerCase();
    return host === 'duck.ai' || host.endsWith('.duck.ai');
  } catch {
    return false;
  }
}

/** Done = no Stop button, the last item is an assistant one with "Copy response", and its text has not changed for stableMs. */
export function isDone(snap: Snap, lastText: string, stableSinceMs: number, now: number, stableMs = 2000): boolean {
  const last = snap.items[snap.items.length - 1];
  if (snap.stop || !last || last.role !== 'assistant' || !last.hasCopy || !last.text.trim()) return false;
  return last.text === lastText && now - stableSinceMs >= stableMs;
}

/** The answer: every assistant bubble after the first user item at or after fromIndex (the item count before we sent). */
export function joinAnswer(items: Item[], fromIndex: number): string {
  const i = items.findIndex((x, k) => k >= fromIndex && x.role === 'user');
  if (i < 0) return '';
  return items.slice(i + 1).filter((x) => x.role === 'assistant' && x.text.trim()).map((x) => x.text.trim()).join('\n\n');
}

// Fixed scripts for Muse.
const MUSE_COUNT = `document.querySelectorAll('[data-message-item]').length`;
const museSetPrompt = (p: string) => `(()=>{const t=document.querySelector('textarea[placeholder=Message]');if(!t)return false;Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t,${JSON.stringify(p)});t.dispatchEvent(new Event('input',{bubbles:true}));return true})()`;
const MUSE_CLICK = `(()=>{const b=document.querySelector('button[aria-label=Send]');if(!b)return false;b.click();return true})()`;
const MUSE_SNAP = `(()=>({stop:!!document.querySelector('button[aria-label=Stop]'),items:[...document.querySelectorAll('[data-message-item]')].map(e=>({role:e.dataset.messageRole==='user'?'user':'assistant',text:e.innerText,hasCopy:!!e.querySelector('button[aria-label="Copy response"]')}))}))()`;
const MUSE_HAS_INPUT = `!!document.querySelector('textarea[placeholder=Message]')`;

export const MUSE: Site = {
  name: 'muse',
  isUrl: isMuseUrl,
  isLogin: (u: string) => isLoginUrl(u) && /muse|meta|instagram/i.test(u),
  js: {
    hasInput: MUSE_HAS_INPUT,
    count: MUSE_COUNT,
    setPrompt: museSetPrompt,
    click: MUSE_CLICK,
    snap: MUSE_SNAP,
  },
  errors: {
    noChrome: 'Chrome debug is not running: open Chrome with --remote-debugging-port=9222 and sign in to muse.ai',
    noTab: 'No muse.ai tab in the debug Chrome: open muse.ai there',
    notSignedIn: 'Muse is not signed in: sign in to muse.ai in the debug Chrome',
    noInput: 'the Muse input box was not found (the page may have changed)',
    noSend: 'the Muse Send button was not found (the page may have changed)',
  },
  ErrorClass: MuseError,
};

// Fixed scripts for Duck (§2).
const DUCK_COUNT = `document.querySelectorAll('[data-testid=user-message],[data-activeresponse]').length`;
const duckSetPrompt = (p: string) =>
  `(()=>{const t=document.querySelector('textarea[name=user-prompt]');if(!t)return false;Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t,${JSON.stringify(p)});t.dispatchEvent(new Event('input',{bubbles:true}));return true})()`;
const DUCK_CLICK = `(()=>{const t=document.querySelector('textarea[name=user-prompt]');const b=t?t.closest('form')?.querySelector('button[type=submit]'):null;if(!b||b.disabled)return false;b.click();return true})()`;
const DUCK_SNAP = `(()=>{const stopBtn=document.querySelector('button[aria-label="Stop generating"]');const stop=!!(stopBtn&&!stopBtn.disabled);const els=[...document.querySelectorAll('[data-testid=user-message],[data-activeresponse]')];const items=els.map(el=>{if(el.matches('[data-testid=user-message]')){return{role:'user',text:el.innerText.trim(),hasCopy:false};}const hasCopy=!!el.querySelector('[data-copyairesponse]');const parts=[...el.children].filter(c=>{if(c.tagName==='H3')return false;if(c.matches('[id^=heading-]')||c.querySelector('[id^=heading-]'))return false;if(c.matches('[data-message-actions]')||c.querySelector('[data-message-actions]'))return false;return true;});const text=parts.map(c=>c.innerText.trim()).filter(Boolean).join('\\n\\n').trim();return{role:'assistant',text,hasCopy};});return{stop,items};})()`;
const DUCK_HAS_INPUT = `!!document.querySelector('textarea[name=user-prompt]')`;
const DUCK_BOT_CHECK = `(()=>{if(document.querySelector('iframe[src*="challenge"],iframe[src*="turnstile"],iframe[src*="captcha"],#cf-wrapper,.cf-turnstile,#challenge-stage'))return true;if(!document.body)return false;const clone=document.body.cloneNode(true);clone.querySelectorAll('[data-testid=user-message],[data-activeresponse],textarea,script,style,noscript,template').forEach(e=>e.remove());const text=(clone.innerText||'').toLowerCase();if(text.includes('verify you are human')||text.includes('unusual traffic')||text.includes('checking your browser')||text.includes('security verification')||text.includes('challenge-running'))return true;return false;})()`;
const DUCK_ACCEPT_TERMS = `(()=>{const b=document.querySelector('button[data-testid="DUCKAI_ONBOARDING_AGREE"]');if(b&&!b.disabled){b.click();return true;}const hasModal=!!(document.querySelector('a[href*="privacy-terms"],[class*="onboardingModal"],[data-testid*="onboarding"]')||document.querySelector('[role="dialog"]'));if(hasModal)return 'needs-user';return false;})()`;
// shortcut: menu render async thì bỏ qua và dùng model mặc định.
const duckSelectModel = (m: string) => `(()=>{const name=${JSON.stringify(m)}.toLowerCase().trim();if(!name)return true;const btn=document.querySelector('[data-testid=model-picker-button]');if(!btn)return false;btn.click();const rows=[...document.querySelectorAll('[role=menuitemradio]')];const target=rows.find(r=>{const tid=(r.getAttribute('data-testid')||'').toLowerCase();const txt=(r.innerText||'').toLowerCase();return tid.includes(name)||txt.includes(name);});if(target){target.click();return true;}btn.click();return false;})()`;

export const DUCK: Site = {
  name: 'duck',
  isUrl: isDuckUrl,
  newChatUrl: 'https://duck.ai/chat',
  js: {
    hasInput: DUCK_HAS_INPUT,
    count: DUCK_COUNT,
    setPrompt: duckSetPrompt,
    click: DUCK_CLICK,
    snap: DUCK_SNAP,
    botCheck: DUCK_BOT_CHECK,
    acceptTerms: DUCK_ACCEPT_TERMS,
    selectModel: duckSelectModel,
  },
  errors: {
    noChrome: 'Chrome debug is not running: BrowserHost is down',
    noTab: 'No duck.ai tab in the debug Chrome: open duck.ai there',
    notSignedIn: 'duck.ai is not ready: input box was not found',
    noInput: 'the duck.ai input box was not found (the page may have changed)',
    noSend: 'the duck.ai Send button was not found (the page may have changed)',
  },
  ErrorClass: WebChatError,
};

export type Env = { sleep?: (ms: number) => Promise<void>; now?: () => number };
const real: Required<Env> = { sleep: (ms) => new Promise((r) => setTimeout(r, ms)), now: () => Date.now() };

export async function findTab(cdp: Cdp, site: Site): Promise<Tab> {
  let tabs: Tab[];
  const Err = site.ErrorClass ?? WebChatError;
  try { tabs = await cdp.tabs(); } catch { throw new Err(site.errors.noChrome); }
  const tab = tabs.find((t) => t.type === 'page' && site.isUrl(t.url));
  if (tab) return tab;
  if (site.isLogin && tabs.some((t) => t.type === 'page' && site.isLogin!(t.url))) {
    throw new Err(site.errors.notSignedIn);
  }
  throw new Err(site.errors.noTab);
}

export async function siteStatus(site: Site, cdp: Cdp, busy: boolean): Promise<{ chrome: boolean; loggedIn: boolean; busy: boolean }> {
  let tabs: Tab[];
  try { tabs = await cdp.tabs(); } catch { return { chrome: false, loggedIn: false, busy }; }
  const tab = tabs.find((t) => t.type === 'page' && site.isUrl(t.url));
  if (!tab) return { chrome: true, loggedIn: false, busy };
  const page = await cdp.attach(tab);
  try { return { chrome: true, loggedIn: !!(await page.eval(site.js.hasInput)), busy }; } finally { page.close(); }
}

export type AskOpts = {
  timeoutS?: number;
  model?: string;
  env?: Env;
};

export async function ask(
  site: Site,
  cdp: Cdp,
  prompt: string,
  timeoutOrOpts: number | AskOpts = 180,
  envOpt: Env = {}
): Promise<{ text: string; timedOut: boolean; ms: number }> {
  const opts: AskOpts = typeof timeoutOrOpts === 'number' ? { timeoutS: timeoutOrOpts, env: envOpt } : timeoutOrOpts;
  const timeoutS = opts.timeoutS ?? 180;
  const env = opts.env ?? envOpt;
  const model = opts.model;

  const { sleep, now } = { ...real, ...env };
  const q = String(prompt ?? '');
  const Err = site.ErrorClass ?? WebChatError;
  if (!q.trim()) throw new Err('prompt is empty');
  if (q.length > MAX_PROMPT) throw new Err(`prompt is longer than ${MAX_PROMPT} characters`);
  const tab = await findTab(cdp, site), page = await cdp.attach(tab);
  try {
    // 1. Bot challenge check: if present, throw immediately without clicking anything.
    if (site.js.botCheck && (await page.eval(site.js.botCheck))) {
      throw new WebChatError('needs-user');
    }

    // 2. Initial terms acceptance: auto-accept if box is present (only that one button).
    if (site.js.acceptTerms) {
      const accepted = await page.eval(site.js.acceptTerms);
      if (accepted === 'needs-user') throw new WebChatError('needs-user');
      if (accepted) await sleep(300);
    }

    // Re-check bot challenge after terms
    if (site.js.botCheck && (await page.eval(site.js.botCheck))) {
      throw new WebChatError('needs-user');
    }

    // 3. Ensure input box is available
    if (!(await page.eval(site.js.hasInput))) {
      if (site.js.acceptTerms) {
        const accepted = await page.eval(site.js.acceptTerms);
        if (accepted === 'needs-user') throw new WebChatError('needs-user');
        if (accepted) await sleep(300);
      }
      if (!(await page.eval(site.js.hasInput))) throw new Err(site.errors.notSignedIn);
    }

    // 4. Model selection (if requested and site supports it)
    if (model && site.js.selectModel) {
      await page.eval(site.js.selectModel(model));
      await sleep(300);
    }

    const before = Number(await page.eval(site.js.count)) || 0;
    if (!(await page.eval(site.js.setPrompt(q)))) throw new Err(site.errors.noInput);
    await sleep(300);
    if (!(await page.eval(site.js.click))) throw new Err(site.errors.noSend);

    const t0 = now(), limit = Math.max(5, Math.min(Number(timeoutS) || 180, 900)) * 1000;
    let prev = '', stableSince = t0, snap: Snap = { stop: false, items: [] };
    while (now() - t0 < limit) {
      await sleep(1000);
      if (site.js.botCheck && (await page.eval(site.js.botCheck))) {
        throw new WebChatError('needs-user');
      }
      snap = (await page.eval(site.js.snap)) as Snap;
      const text = joinAnswer(snap.items, before);
      if (text !== prev) { prev = text; stableSince = now(); }
      if (text && isDone(snap, snap.items[snap.items.length - 1]?.text ?? '', stableSince, now())) {
        return { text, timedOut: false, ms: now() - t0 };
      }
    }
    return { text: joinAnswer(snap.items, before), timedOut: true, ms: now() - t0 };
  } finally {
    page.close();
  }
}

export const duckAsk = (cdp: Cdp, prompt: string, timeoutOrOpts: number | AskOpts = 180, env: Env = {}) =>
  ask(DUCK, cdp, prompt, timeoutOrOpts, env);

export const duckStatus = (cdp: Cdp, busy: boolean) => siteStatus(DUCK, cdp, busy);
