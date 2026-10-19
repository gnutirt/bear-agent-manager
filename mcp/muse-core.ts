// Muse worker (tier 3): the logic that does not touch Chrome. See docs/superpowers/specs/2026-10-19-muse-worker.md.
export type Item = { role: 'user' | 'assistant'; text: string; hasCopy: boolean };
export type Snap = { stop: boolean; items: Item[] };
export type Tab = { type: string; url: string; webSocketDebuggerUrl: string };
/** One page of the debug Chrome: runs a fixed script and returns its value. */
export type Page = { eval(expression: string): Promise<any>; close(): void };
export type Cdp = { tabs(): Promise<Tab[]>; attach(tab: Tab): Promise<Page> };

export class MuseError extends Error {}
export const MAX_PROMPT = 8000;

/** Only the real muse.ai (or a subdomain): the host is parsed, never searched for in the text of the URL. */
export function isMuseUrl(u: string): boolean {
  try { const h = new URL(u).hostname.toLowerCase(); return h === 'muse.ai' || h.endsWith('.muse.ai'); } catch { return false; }
}
export const isLoginUrl = (u: string) => /\/(accounts\/)?(login|signin)\b/i.test(u) || /instagram\.com|facebook\.com/i.test(u);

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

// Fixed scripts. The prompt is the only variable part and it goes in as a JSON string.
const COUNT = `document.querySelectorAll('[data-message-item]').length`;
const setPrompt = (p: string) => `(()=>{const t=document.querySelector('textarea[placeholder=Message]');if(!t)return false;Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t,${JSON.stringify(p)});t.dispatchEvent(new Event('input',{bubbles:true}));return true})()`;
const CLICK = `(()=>{const b=document.querySelector('button[aria-label=Send]');if(!b)return false;b.click();return true})()`;
const SNAP = `(()=>({stop:!!document.querySelector('button[aria-label=Stop]'),items:[...document.querySelectorAll('[data-message-item]')].map(e=>({role:e.dataset.messageRole==='user'?'user':'assistant',text:e.innerText,hasCopy:!!e.querySelector('button[aria-label="Copy response"]')}))}))()`;
const HAS_INPUT = `!!document.querySelector('textarea[placeholder=Message]')`;

type Env = { sleep?: (ms: number) => Promise<void>; now?: () => number };
const real: Required<Env> = { sleep: (ms) => new Promise((r) => setTimeout(r, ms)), now: () => Date.now() };

async function findTab(cdp: Cdp): Promise<Tab> {
  let tabs: Tab[];
  try { tabs = await cdp.tabs(); } catch { throw new MuseError('Chrome debug is not running: open Chrome with --remote-debugging-port=9222 and sign in to muse.ai'); }
  const tab = tabs.find((t) => t.type === 'page' && isMuseUrl(t.url));
  if (tab) return tab;
  if (tabs.some((t) => t.type === 'page' && isLoginUrl(t.url) && /muse|meta|instagram/i.test(t.url))) throw new MuseError('Muse is not signed in: sign in to muse.ai in the debug Chrome');
  throw new MuseError('No muse.ai tab in the debug Chrome: open muse.ai there');
}

export async function museStatus(cdp: Cdp, busy: boolean): Promise<{ chrome: boolean; loggedIn: boolean; busy: boolean }> {
  let tabs: Tab[];
  try { tabs = await cdp.tabs(); } catch { return { chrome: false, loggedIn: false, busy }; }
  const tab = tabs.find((t) => t.type === 'page' && isMuseUrl(t.url));
  if (!tab) return { chrome: true, loggedIn: false, busy };
  const page = await cdp.attach(tab);
  try { return { chrome: true, loggedIn: !!(await page.eval(HAS_INPUT)), busy }; } finally { page.close(); }
}

export async function museAsk(cdp: Cdp, prompt: string, timeoutS = 180, env: Env = {}): Promise<{ text: string; timedOut: boolean; ms: number }> {
  const { sleep, now } = { ...real, ...env };
  const q = String(prompt ?? '');
  if (!q.trim()) throw new MuseError('prompt is empty');
  if (q.length > MAX_PROMPT) throw new MuseError(`prompt is longer than ${MAX_PROMPT} characters`);
  const tab = await findTab(cdp), page = await cdp.attach(tab);
  try {
    if (!(await page.eval(HAS_INPUT))) throw new MuseError('Muse is not signed in: sign in to muse.ai in the debug Chrome');
    const before = Number(await page.eval(COUNT)) || 0;
    if (!(await page.eval(setPrompt(q)))) throw new MuseError('the Muse input box was not found (the page may have changed)');
    await sleep(300);
    if (!(await page.eval(CLICK))) throw new MuseError('the Muse Send button was not found (the page may have changed)');
    const t0 = now(), limit = Math.max(5, Math.min(Number(timeoutS) || 180, 900)) * 1000;
    let prev = '', stableSince = t0, snap: Snap = { stop: false, items: [] };
    while (now() - t0 < limit) {
      await sleep(1000);
      snap = (await page.eval(SNAP)) as Snap;
      const text = joinAnswer(snap.items, before);
      if (text !== prev) { prev = text; stableSince = now(); }
      if (text && isDone(snap, snap.items[snap.items.length - 1]?.text ?? '', stableSince, now())) return { text, timedOut: false, ms: now() - t0 };
    }
    return { text: joinAnswer(snap.items, before), timedOut: true, ms: now() - t0 };
  } finally { page.close(); }
}
