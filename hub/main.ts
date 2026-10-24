import { HOME, PORT } from '../shared/config.ts';
import { initLog, log } from './log.ts';
import { startHub } from './server.ts';

// #281: the JSONL log is ready before the hub starts, so boot errors and the legacy move are recorded too.
initLog(HOME);

try {
  const hub = await startHub({ dir: HOME, port: PORT });
  console.log(`${new Date().toISOString()} bear-agent-manager hub listening on ${hub.url} (data: ${HOME})`);
  log('info', 'hub', 'hub listening', { data: { url: hub.url, dir: HOME } });
} catch (e: any) {
  if (e?.code === 'EADDRINUSE') {
    console.log(`${new Date().toISOString()} port ${PORT} busy: another hub is running, exiting`);
    log('warn', 'hub', 'port busy: another hub is running, exiting', { data: { port: PORT } });
    process.exit(0);
  }
  log('error', 'hub', 'hub failed to start', { data: { error: e instanceof Error ? e.message : String(e) } });
  throw e;
}
