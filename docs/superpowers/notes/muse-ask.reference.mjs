// Throwaway: node muse-ask.mjs <promptFile> [timeoutSec] — sends prompt to muse.ai via CDP :9222, prints the answer.
import { readFileSync } from 'node:fs';
const prompt = readFileSync(process.argv[2], 'utf8');
const timeout = Number(process.argv[3] ?? 300) * 1000;
const tab = (await (await fetch('http://localhost:9222/json')).json()).find((t) => t.type === 'page' && t.url.includes('muse.ai'));
if (!tab) { console.error('no muse.ai tab'); process.exit(2); }
const ws = new WebSocket(tab.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r, { once: true }));
let id = 0; const pending = new Map();
ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); pending.get(m.id)?.(m); pending.delete(m.id); });
const ev = (expression) => new Promise((r) => { const i = ++id; pending.set(i, (m) => r(m.result?.result?.value)); ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression, returnByValue: true } })); });

const before = await ev(`document.querySelectorAll('[data-message-item]').length`);
await ev(`(()=>{const t=document.querySelector('textarea[placeholder=Message]');Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(t,${JSON.stringify(prompt)});t.dispatchEvent(new Event('input',{bubbles:true}))})()`);
await new Promise((r) => setTimeout(r, 300));
await ev(`document.querySelector('button[aria-label=Send]').click()`);
const snap = `(()=>{const it=[...document.querySelectorAll('[data-message-item]')];let u=-1;it.forEach((e,i)=>{if(e.dataset.messageRole==='user')u=i});
const ans=it.slice(u+1).filter(e=>e.dataset.messageRole==='assistant');const l=it[it.length-1];
return {stop:!!document.querySelector('button[aria-label=Stop]'),last:l?.dataset.messageRole,copy:!!l?.querySelector('button[aria-label="Copy response"]'),text:ans.map(e=>e.innerText).join('\\n\\n')}})()`;
const t0 = Date.now(); let prev = '', stableSince = 0, s;
while (Date.now() - t0 < timeout) {
  await new Promise((r) => setTimeout(r, 1000));
  s = await ev(snap);
  if (s.text !== prev) { prev = s.text; stableSince = Date.now(); }
  if (!s.stop && s.last === 'assistant' && s.copy && s.text && Date.now() - stableSince >= 2000) break;
}
console.log(s.text + (Date.now() - t0 >= timeout ? '\n[timeout]' : ''));
console.error(`[muse] ${((Date.now() - t0) / 1000).toFixed(0)}s, items before=${before}`);
ws.close();
