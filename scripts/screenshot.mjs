// Screenshots the hub UI in each theme via Chrome DevTools Protocol (dev aid for UI review).
// Usage: node scripts/screenshot.mjs <outDir> [width] [height]
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const out = process.argv[2] ?? '.';
const base = process.env.SHOT_BASE ?? 'http://127.0.0.1:7788/';
const extra = process.env.SHOT_QUERY ?? '';
const width = Number(process.argv[3] ?? 1400), height = Number(process.argv[4] ?? 860);
const chrome = ['C:/Program Files/Google/Chrome/Application/chrome.exe', '/usr/bin/google-chrome'].find((p) => fs.existsSync(p));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ar-chrome-'));
const port = 9300 + Math.floor(Math.random() * 500);
const proc = spawn(chrome, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

try {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    target = await fetch(`http://127.0.0.1:${port}/json/list`).then((r) => r.json()).then((l) => l.find((t) => t.type === 'page')).catch(() => null);
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((r) => ws.addEventListener('open', r, { once: true }));
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); pending.get(m.id)?.(m.result); pending.delete(m.id); });
  const send = (method, params = {}) => new Promise((r) => { pending.set(++id, r); ws.send(JSON.stringify({ id, method, params })); });
  await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
  for (const theme of ['light', 'gray', 'dark']) {
    await send('Page.navigate', { url: `${base}?theme=${theme}${extra}` });
    await sleep(3500);
    const { data } = await send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(out, `${theme}-${width}.png`), Buffer.from(data, 'base64'));
    console.log(`saved ${theme}-${width}.png`);
  }
  ws.close();
} finally {
  proc.kill();
}
