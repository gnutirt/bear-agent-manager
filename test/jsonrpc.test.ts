import { test } from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import readline from 'node:readline';
import { RpcError, serve } from '../mcp/jsonrpc.ts';

test('stdio JSON-RPC handles parse errors, requests, notifications and handler failures', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const lines = readline.createInterface({ input: output });
  const queued: unknown[] = [];
  const waiting: ((value: unknown) => void)[] = [];
  lines.on('line', (line) => {
    const value = JSON.parse(line);
    const resolve = waiting.shift();
    if (resolve) resolve(value);
    else queued.push(value);
  });
  const nextResponse = () => queued.length
    ? Promise.resolve(queued.shift())
    : new Promise<unknown>((resolve) => waiting.push(resolve));
  let notified = false;
  let notifyHandler: (() => void) | undefined;
  const notificationHandled = new Promise<void>((resolve) => { notifyHandler = resolve; });
  const server = serve(async (method, params) => {
    if (method === 'notify') {
      notified = true;
      notifyHandler?.();
      return;
    }
    if (method === 'known-error') throw new RpcError(-32001, 'expected failure');
    if (method === 'unknown-error') throw new Error('unexpected failure');
    return method === 'empty-result' ? undefined : { method, params };
  }, input, output);

  try {
    const parseResponse = nextResponse();
    input.write('not json\n');
    assert.deepEqual(await parseResponse, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } });

    const requestResponse = nextResponse();
    input.write('{"jsonrpc":"2.0","id":1,"method":"hello"}\n');
    assert.deepEqual(await requestResponse, { jsonrpc: '2.0', id: 1, result: { method: 'hello', params: {} } });

    const emptyResponse = nextResponse();
    input.write('{"jsonrpc":"2.0","id":2,"method":"empty-result"}\n');
    assert.deepEqual(await emptyResponse, { jsonrpc: '2.0', id: 2, result: {} });

    const knownErrorResponse = nextResponse();
    input.write('{"jsonrpc":"2.0","id":3,"method":"known-error"}\n');
    assert.deepEqual(await knownErrorResponse, { jsonrpc: '2.0', id: 3, error: { code: -32001, message: 'expected failure' } });

    const unknownErrorResponse = nextResponse();
    input.write('{"jsonrpc":"2.0","id":4,"method":"unknown-error"}\n');
    assert.deepEqual(await unknownErrorResponse, { jsonrpc: '2.0', id: 4, error: { code: -32603, message: 'unexpected failure' } });

    input.write('{"jsonrpc":"2.0","method":"notify"}\n');
    await notificationHandled;
    assert.equal(notified, true);
    assert.equal(queued.length, 0, 'notifications must not receive responses');
  } finally {
    input.end();
    server.close();
    lines.close();
  }
});

test('stdio JSON-RPC tolerates closed pipes while replying or reading', async () => {
  const input = new PassThrough();
  const output = new PassThrough();
  const server = serve(async () => ({ ok: true }), input, output);
  const closed = new Promise<void>((resolve) => server.once('close', resolve));

  output.end();
  assert.doesNotThrow(() => input.write('{"jsonrpc":"2.0","id":1,"method":"ping"}\n'));
  await new Promise<void>((resolve) => setImmediate(resolve));
  assert.doesNotThrow(() => output.emit('error', new Error('EPIPE')));
  assert.doesNotThrow(() => input.emit('error', new Error('EIO')));
  await closed;
});
