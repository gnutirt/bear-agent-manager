import { parentPort, workerData } from 'node:worker_threads';
import { archiveNow } from './archive.ts';

// One archive round off the hub's event loop (a first copy into an empty folder takes minutes).
const a = workerData as { configDirs: string[]; archiveDir: string; onlySession?: string; roomChatRoot?: string; roomsRoot?: string };
parentPort!.postMessage(archiveNow(a.configDirs, a.archiveDir, a.onlySession, a.roomChatRoot, a.roomsRoot));
