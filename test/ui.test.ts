import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeHub } from './helpers.ts';

test('UI page has rooms, running-sessions list, chat, presence strip, composer and SSE wiring', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const id of ['id="rooms"', 'id="sessions"', 'id="log"', 'id="presence"', 'id="composer"', 'id="banner"', 'id="mentionMenu"', 'id="menu"', 'id="toast"']) {
      assert.ok(html.includes(id), `missing ${id}`);
    }
    assert.ok(html.includes("new EventSource('/api/events?token='"));
    assert.ok(html.includes('lang="vi"'));
    for (const route of ['/rename', '/delete', '/join', '/leave']) assert.ok(html.includes(route), `UI never calls ${route}`);
    assert.ok(!/\bprompt\(|\balert\(|\bconfirm\(/.test(html), 'dialogs do not work inside VS Code webviews');
  } finally { await hub.close(); }
});

test('UI inline script compiles and the workers panel is wired (list, live updates, stop)', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
    assert.equal(scripts.length, 1);
    assert.doesNotThrow(() => new Function(scripts[0]), 'a syntax error here turns the whole page into raw text');
    for (const s of ['id="workers"', 'id="wkCap"', "'/api/workers'", "addEventListener('workers'", '/kill`']) assert.ok(html.includes(s), `missing ${s}`);
  } finally { await hub.close(); }
});

test('chat log sticks to the bottom by intent, not by measuring before render', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of ['S.stick', 'new ResizeObserver(', 'id="logBody"', 'S.expanded', 'data-mid=']) assert.ok(html.includes(s), `missing ${s}`);
    assert.ok(!html.includes('atBottom'), 'the pre-render atBottom check is gone');
  } finally { await hub.close(); }
});

test('theme picker: every option has a palette block (or is auto/light)', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    const sel = html.match(/<select[^>]*id="themes"[\s\S]*?<\/select>/)![0];
    const opts = [...sel.matchAll(/<option value="([a-z]+)"/g)].map((m) => m[1]);
    assert.ok(opts.length >= 10, 'many themes');
    for (const t of opts.filter((o) => !['auto', 'light'].includes(o))) assert.ok(html.includes(`:root[data-theme=${t}]`), `no palette for ${t}`);
    for (const s of ['id="fonts"', "addEventListener('contextmenu'", 'id = \'zoom\'']) assert.ok(html.includes(s), `missing ${s}`);
  } finally { await hub.close(); }
});

test('reply: quote bar, floating button, replyTo sent with the message, quote box jumps to the original', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of ['id="replyBar"', "id = 'rplBtn'", '{ text, replyTo: S.reply.id }', 'data-goto=', 'm.replyTo']) assert.ok(html.includes(s), `missing ${s}`);
  } finally { await hub.close(); }
});

test('inline script never calls $() before declaring it (a TDZ error blanks the whole page)', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    const script = html.slice(html.indexOf('<script>'));
    assert.ok(!script.slice(0, script.indexOf('const $ =')).includes('$('));
  } finally { await hub.close(); }
});

test('UI has five tabs with their views', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const t of ['rooms', 'workers', 'tokens', 'skills', 'settings']) {
      assert.ok(html.includes(`data-tab="${t}"`), `missing tab ${t}`);
      assert.ok(html.includes(`id="view-${t}"`), `missing view ${t}`);
    }
    assert.ok(html.includes('.view[hidden]{display:none!important}'), 'a hidden flex <main> must really hide');
  } finally { await hub.close(); }
});

test('workers tab: providers, live and recent runs with filters, room_chat preview and sweep', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of ['function renderWorkersView', 'data-filter="${k}"', "failed: (r) => r.status === 'failed'", "addEventListener('providers'", "'/api/providers'", "'/api/room-chat'", "'/api/room-chat/sweep'"]) assert.ok(html.includes(s), `missing ${s}`);
  } finally { await hub.close(); }
});

test('token tab: range, KPIs, stacked chart with a table view, Claude Pro usage block (T10a)', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of ['function renderTokensView', 'id="tkChart"', "'/api/tokens?days='", "'/api/claude-usage'", 'function claudeProBlock', 'id="cuRefresh"', 'function acctChip', 'Asia/Ho_Chi_Minh', "t('tokens.asTable')", '--c-free', '--c-paid']) assert.ok(html.includes(s), `missing ${s}`);
  } finally { await hub.close(); }
});

test('settings tab: worker switches, auto jobs, per-agent skill rules, providers (keys write-only), accounts frame', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of ['function renderSettingsView', 'type="password"', 'key: null', "t('compact.note')", "force: 'mode.force'", "ban: 'mode.ban'", 'agentSkills', "'/api/skills'", "'/api/settings'", "method || (body ? 'POST' : 'GET')"]) assert.ok(html.includes(s), `missing ${s}`);
    assert.ok(html.includes("(wildcard ? ['auto', 'ban'] : ['force', 'auto', 'ban'])"), 'a whole plugin can never be forced');
  } finally { await hub.close(); }
});

test('a view whose data fails to load says why instead of loading forever', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of ['function viewFail', "viewFail('tokens', e)", "viewFail('settings', e)", "viewFail('workers', e)", 'role="alert"']) assert.ok(html.includes(s), `missing ${s}`);
  } finally { await hub.close(); }
});

test('settings tab: machine export button, keys only when the switch is on', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of ["'/api/machine'", "'/api/machine/export'", 'id="machineExport"', 'id="machineKeys"', 'withKeys: !!S.machineWithKeys']) assert.ok(html.includes(s), `missing ${s}`);
  } finally { await hub.close(); }
});

test('receipts: each member gets a chip only on the newest message that woke it, none once it answered', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    const grab = (name: string) => html.match(new RegExp(String.raw`function ${name}\([\s\S]*?\n}\n`))![0];
    const S = { sessions: { a: { name: 'fw', status: 'offline', cursor: 0 }, b: { name: 'web', status: 'idle', cursor: 5 } } };
    const esc = (x: string) => x;
    const { lastWakes, receipts } = new Function('S', 'esc', 't', `${grab('lastWakes')}${grab('receipts')}return { lastWakes, receipts };`)(S, esc, (k: string) => k);
    const list = [{ id: 1, wake: ['a'] }, { id: 2, wake: ['a', 'b'] }, { id: 3, fromId: 'b', wake: [] }];
    const last = lastWakes(list);
    assert.equal(receipts(list[0], list, last), '', 'older message that woke an offline agent: no chip');
    const newest = receipts(list[1], list, last);
    assert.equal((newest.match(/class="rc dead"/g) || []).length, 1, 'only the newest message has the dead chip');
    assert.ok(!newest.includes('web'), 'web already answered: its chip is gone');
    assert.ok(!html.includes('đã trả lời'));
  } finally { await hub.close(); }
});

test('settings sub-tabs, Claude usage first in the Token tab, text button to make a room lead', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of ['data-sub="${k}"', "general: 'sub.general'", "lead: 'sub.lead'", "account: 'sub.account'", "t('members.lead')", "t('members.unlead')"]) assert.ok(html.includes(s), `missing ${s}`);
    assert.ok(html.includes('<div class="vw">${claudeProBlock()}${head}'), 'Claude usage comes before the worker token KPIs');
  } finally { await hub.close(); }
});
