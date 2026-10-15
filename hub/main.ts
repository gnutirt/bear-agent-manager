import { HOME, PORT } from '../shared/config.ts';
import { startHub } from './server.ts';

try {
  const hub = await startHub({ dir: HOME, port: PORT });
  console.log(`${new Date().toISOString()} bear-agent-manager hub listening on ${hub.url} (data: ${HOME})`);
} catch (e: any) {
  if (e?.code === 'EADDRINUSE') {
    console.log(`${new Date().toISOString()} port ${PORT} busy: another hub is running, exiting`);
    process.exit(0);
  }
  throw e;
}
