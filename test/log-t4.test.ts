import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { makeHub } from './helpers.ts';
import { log, runsDir } from '../hub/log.ts';

test('T4: GET /api/logs filters by level, area, agent, sid, q, limit and redacts secrets', async () => {
  const { hub, dir, call } = await makeHub();
  try {
    // 1. Without token returns 401
    const unauth = await fetch(`${hub.url}/api/logs`);
    assert.equal(unauth.status, 401, 'GET /api/logs without token must return 401');

    // 2. Generate a variety of log entries
    log('info', 'wake', 'agent waking up', { sid: 'sid-1', agent: 'deepseek', data: { model: 'v3' } });
    log('warn', 'turn', 'turn timed out', { sid: 'sid-1', agent: 'deepseek', data: { timeoutMs: 30000 } });
    log('error', 'provider', 'provider failed with key sk-ant-api03-12345678901234567890', { sid: 'sid-2', agent: 'agy' });
    log('info', 'compact', 'compact completed successfully', { sid: 'sid-3', agent: 'copilot', data: { tokens: 50000 } });
    log('debug', 'settings', 'debug settings trace', { agent: 'system' });

    // 3. GET /api/logs (no filters) returns matching entries (excluding debug by default)
    const all = await call<any[]>('/api/logs');
    assert.ok(Array.isArray(all));
    assert.ok(all.length >= 4);

    // Verify secret was redacted
    const errEntry = all.find((l) => l.area === 'provider');
    assert.ok(errEntry, 'provider entry exists');
    assert.ok(!errEntry.msg.includes('sk-ant-api03-12345678901234567890'), 'secret key must be redacted');
    assert.ok(errEntry.msg.includes('[redacted]'));

    // 4. Filter by level
    const warnOnly = await call<any[]>('/api/logs?level=warn');
    assert.ok(warnOnly.length > 0);
    assert.ok(warnOnly.every((l) => l.level === 'warn'));

    const warnAndError = await call<any[]>('/api/logs?level=warn,error');
    assert.ok(warnAndError.length >= 2);
    assert.ok(warnAndError.every((l) => l.level === 'warn' || l.level === 'error'));

    // 5. Filter by area
    const wakeOnly = await call<any[]>('/api/logs?area=wake');
    assert.ok(wakeOnly.length > 0);
    assert.ok(wakeOnly.every((l) => l.area === 'wake'));

    // 6. Filter by agent
    const deepseekOnly = await call<any[]>('/api/logs?agent=deepseek');
    assert.ok(deepseekOnly.length >= 2);
    assert.ok(deepseekOnly.every((l) => l.agent?.toLowerCase() === 'deepseek'));

    // 7. Filter by sid
    const sidOnly = await call<any[]>('/api/logs?sid=sid-3');
    assert.equal(sidOnly.length, 1);
    assert.equal(sidOnly[0].sid, 'sid-3');
    assert.equal(sidOnly[0].agent, 'copilot');

    // 8. Filter by q (case-insensitive substring)
    const qSearch = await call<any[]>('/api/logs?q=timed%20out');
    assert.equal(qSearch.length, 1);
    assert.equal(qSearch[0].msg, 'turn timed out');

    // 9. Limit
    const limited = await call<any[]>('/api/logs?limit=2');
    assert.equal(limited.length, 2);
  } finally {
    await hub.close();
  }
});

test('T4: GET /api/logs/run/<file> validates file name, returns 400 on traversal, redacts secrets, and caps tail to 256KB', async () => {
  const { hub, dir, call } = await makeHub();
  try {
    // 1. Without token returns 401
    const unauth = await fetch(`${hub.url}/api/logs/run/revive-0-2026-10-24T00-00-00-000Z.log`);
    assert.equal(unauth.status, 401);

    // 2. Traversal ../state.json returns 400
    const traversal = await fetch(`${hub.url}/api/logs/run/../state.json`, {
      headers: { 'x-room-token': hub.token },
    });
    assert.equal(traversal.status, 400, 'path traversal ../state.json must return 400');

    const encodedTraversal = await fetch(`${hub.url}/api/logs/run/%2e%2e/state.json`, {
      headers: { 'x-room-token': hub.token },
    });
    assert.equal(encodedTraversal.status, 400, 'encoded traversal %2e%2e must return 400');

    // 3. Invalid file name not matching regex returns 400
    const badName = await fetch(`${hub.url}/api/logs/run/something.txt`, {
      headers: { 'x-room-token': hub.token },
    });
    assert.equal(badName.status, 400, 'file name not matching regex must return 400');

    // 4. Non-existent file returns 404
    const notFound = await fetch(`${hub.url}/api/logs/run/revive-1234-2026-10-24T00-00-00-000Z.log`, {
      headers: { 'x-room-token': hub.token },
    });
    assert.equal(notFound.status, 404, 'non-existent log file must return 404');

    // 5. Valid run log file with secret
    const validFileName = 'revive-abcd1234-2026-10-24T12-00-00-000Z.log';
    const runs = runsDir(dir);
    fs.mkdirSync(runs, { recursive: true });
    const secretContent = 'Starting claude turn with key sk-ant-api03-abcdef1234567890123456 and Bearer ghp_secrettoken1234567890\nTurn finished with exit code 0\n';
    fs.writeFileSync(path.join(runs, validFileName), secretContent, 'utf8');

    const res = await call<any>(`/api/logs/run/${validFileName}`);
    assert.ok(res);
    assert.equal(res.name, validFileName);
    assert.ok(!res.text.includes('sk-ant-api03-abcdef1234567890123456'), 'secret in raw run log must be redacted');
    assert.ok(!res.text.includes('ghp_secrettoken1234567890'), 'bearer token in raw run log must be redacted');
    assert.ok(res.text.includes('[redacted]'));
    assert.ok(res.text.includes('Turn finished with exit code 0'));

    // 6. Test 256 KB tail capping
    const bigFileName = 'revive-beef-2026-10-24T12-00-00-000Z.log';
    const bigSize = 300 * 1024;
    const bigBuffer = Buffer.alloc(bigSize, 'a');
    bigBuffer.write('HEAD_OF_FILE_MUST_BE_OMITTED', 0);
    bigBuffer.write('TAIL_OF_FILE_MUST_BE_PRESENT', bigSize - 50);
    fs.writeFileSync(path.join(runs, bigFileName), bigBuffer);

    const bigRes = await call<any>(`/api/logs/run/${bigFileName}`);
    assert.ok(!bigRes.text.includes('HEAD_OF_FILE_MUST_BE_OMITTED'), 'head of oversized file must be omitted');
    assert.ok(bigRes.text.includes('TAIL_OF_FILE_MUST_BE_PRESENT'), 'tail of oversized file must be present');
    assert.ok(Buffer.byteLength(bigRes.text, 'utf8') <= 256 * 1024 + 100);

    // 7. Accept: text/plain returns raw text
    const textRes = await fetch(`${hub.url}/api/logs/run/${validFileName}`, {
      headers: { 'x-room-token': hub.token, accept: 'text/plain' },
    });
    assert.equal(textRes.status, 200);
    assert.match(textRes.headers.get('content-type') ?? '', /text\/plain/);
    const plainText = await textRes.text();
    assert.ok(!plainText.includes('sk-ant-api03-abcdef1234567890123456'));
    assert.ok(plainText.includes('Turn finished with exit code 0'));
  } finally {
    await hub.close();
  }
});

test('T4: SSE /api/events broadcasts log events with JSON entries', async () => {
  const { hub, call } = await makeHub();
  const ac = new AbortController();
  try {
    const sseRes = await fetch(`${hub.url}/api/events`, {
      headers: { 'x-room-token': hub.token },
      signal: ac.signal,
    });
    assert.equal(sseRes.status, 200);
    assert.match(sseRes.headers.get('content-type') ?? '', /text\/event-stream/);

    const received: any[] = [];
    let buffer = '';

    const reader = sseRes.body!.getReader();
    const readLoop = async () => {
      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += new TextDecoder().decode(value);
          const parts = buffer.split('\n\n');
          buffer = parts.pop() ?? '';
          for (const block of parts) {
            const lines = block.split('\n');
            let event = 'message';
            let data = '';
            for (const line of lines) {
              if (line.startsWith('event: ')) event = line.slice(7).trim();
              else if (line.startsWith('data: ')) data = line.slice(6).trim();
            }
            if (event === 'log' && data) {
              try { received.push(JSON.parse(data)); } catch { /* ignore */ }
            }
          }
        }
      } catch { /* aborted */ }
    };
    const loopPromise = readLoop();

    // Trigger log entry
    log('warn', 'wake', 'test sse broadcast log entry', { sid: 'sse-session', agent: 'sse-agent' });

    // Wait until SSE event is received
    const start = Date.now();
    while (received.length === 0 && Date.now() - start < 3000) {
      await new Promise((r) => setTimeout(r, 50));
    }

    assert.ok(received.length > 0, 'must receive log event on SSE');
    const logEv = received.find((e) => e.msg === 'test sse broadcast log entry');
    assert.ok(logEv);
    assert.equal(logEv.level, 'warn');
    assert.equal(logEv.area, 'wake');
    assert.equal(logEv.sid, 'sse-session');
    assert.equal(logEv.agent, 'sse-agent');

    ac.abort();
    await loopPromise;
  } finally {
    ac.abort();
    await hub.close();
  }
});
