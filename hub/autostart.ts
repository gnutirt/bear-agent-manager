import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// D3: start the hub when the user signs in, so agents wake without any editor open. Off by default; on writes one
// small script in the user's own Startup folder (no admin rights, no Task Scheduler), off deletes that script only.
// Windows only for now: elsewhere the API says unsupported and the README shows the manual way.

const FILE = 'bear-agent-manager-hub.vbs';
export const startupDir = (): string => path.join(process.env.APPDATA ?? path.join(os.homedir(), 'AppData', 'Roaming'), 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup');

/** A hidden `node --no-warnings <root>/hub/main.ts` (the hub exits by itself when another one already runs). */
export function startupScript(node: string, root: string): string {
  const q = (s: string) => s.replace(/"/g, '""');
  return `' bear-agent-manager: starts the hub at sign-in (Settings > Accounts). Delete this file to stop.\r\n` +
    `CreateObject("WScript.Shell").Run """${q(node)}"" --no-warnings ""${q(path.join(root, 'hub', 'main.ts'))}""", 0, False\r\n`;
}

export type Autostart = { supported: boolean; on: boolean; file: string };

export function autostartState(dir = startupDir(), platform = process.platform): Autostart {
  const file = path.join(dir, FILE);
  return { supported: platform === 'win32', on: fs.existsSync(file), file };
}

export function setAutostart(on: boolean, node: string, root: string, dir = startupDir(), platform = process.platform): Autostart {
  const st = autostartState(dir, platform);
  if (!st.supported) throw new Error('autostart is only set up on Windows; start the hub with `npm run hub`');
  if (on) { fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(st.file, startupScript(node, root)); }
  else if (st.on) fs.unlinkSync(st.file);
  return autostartState(dir, platform);
}
