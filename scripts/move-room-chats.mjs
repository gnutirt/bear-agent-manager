// Lists (dry run) or moves (--apply) room-made transcripts of every project into its room_chat folder.
// Usage: node --no-warnings scripts/move-room-chats.mjs [--apply] [--config-dir <dir>]
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs';
import { sweepProject } from '../hub/roomchat.ts';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const ci = args.indexOf('--config-dir');
const cfg = ci >= 0 ? args[ci + 1] : (process.env.CLAUDE_CONFIG_DIR ?? path.join(os.homedir(), '.claude'));
const root = path.join(cfg, 'projects');
let total = 0;
for (const proj of fs.existsSync(root) ? fs.readdirSync(root) : []) {
  const dir = path.join(root, proj);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const r of sweepProject(dir, { apply, reviveIds: new Set(), activeIds: new Set() })) {
    total++;
    console.log(`${apply ? 'moved' : 'would move'} [${r.kind}] ${proj}/${r.file}`);
  }
}
console.log(`${total} transcript(s)${apply ? ' moved' : ' found (dry run, pass --apply)'}`);
