import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { makeHub } from './helpers.ts';
import { defaultSettings } from '../hub/settings.ts';
import { en } from '../shared/i18n/en.ts';
import { vi } from '../shared/i18n/vi.ts';

const readOffice = () => readFile(new URL('../ui/office.js', import.meta.url), 'utf8');

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

test('accounts UI exposes Claude auth status, refresh, login, logout confirmation and account creation', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const source of [
      'data-account-refresh="${esc(a.dir)}"',
      'data-account-login="${esc(a.dir)}"',
      'data-account-logout="${esc(a.dir)}"',
      'data-account-logout-confirm="${esc(a.dir)}"',
      'id="accountNew"',
      "api(`/api/accounts${refresh ? '?refresh=1' : ''}`)",
      "api('/api/accounts/login'",
      "api('/api/accounts/logout'",
      "api('/api/accounts/new'",
      'ac.auth.statusError',
    ]) assert.ok(html.includes(source), `missing account auth UI wiring: ${source}`);
    assert.ok(!/\bprompt\(|\balert\(|\bconfirm\(/.test(html), 'account actions use an inline confirmation, not browser dialogs');
    for (const key of [
      'ac.auth.statusError', 'ac.auth.refresh', 'ac.auth.login', 'ac.auth.logout',
      'ac.auth.newPlaceholder', 'ac.auth.new', 'ac.auth.loginStarted', 'ac.auth.logoutConfirm',
      'ac.auth.logoutConfirmButton', 'ac.auth.logoutStarted', 'ac.auth.nameInvalid', 'ac.auth.exists',
      'ac.auth.unknownAccount', 'ac.auth.consoleUnsupported', 'ac.auth.consoleFailed', 'ac.auth.shareFailed',
    ]) assert.ok(key in en && key in vi, `missing account auth translation ${key}`);
  } finally { await hub.close(); }
});

test('chat links open a reusable isolated popup, while modifier clicks and VS Code use the default target', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of [
      '<a class="chatlink" href="$2" target="_blank" rel="noopener">',
      'window.open(\'about:blank\', \'bam-link\', \'popup,width=1100,height=800\')',
      'popup.opener = null',
      'popup.location.replace(a.href)',
      'e.ctrlKey || e.metaKey || e.shiftKey || e.altKey',
      "location.protocol === 'vscode-webview:'",
      'if (!popup) return',
    ]) assert.ok(html.includes(s), `missing ${s}`);
  } finally { await hub.close(); }
});

test('paid-provider Settings expose an editable daily budget and save it with pricing', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of [
      "t('prov.dailyBudget')",
      'name="budgetUsdPerDay"',
      'p.pricing?.budgetUsdPerDay ?? 1',
      'patch.pricing = { budgetUsdPerDay }',
      "t('prov.dailyBudget.invalid')",
    ]) assert.ok(html.includes(s), `missing ${s}`);
  } finally { await hub.close(); }
});

test('tasks use grouped status sections with a completed checklist and an undo window', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of ['class="tstatusbar"', 'data-task-jump="${s}"', 'id="task-${s}"', 'TGROUPS.map(sec)', 'role="checkbox"', "label: t('task.undo')", 'ms: 6000']) {
      assert.ok(html.includes(s), `missing ${s}`);
    }
    assert.ok(html.indexOf("const TGROUPS = ['planned', 'doing', 'done']") < html.indexOf('TGROUPS.map(sec)'), 'status groups are ordered from open work to completed');
    assert.ok(!html.includes('id="agentNew"'), 'the old folder form must be gone: every add button opens the dialog');
    assert.ok(!html.includes("e.target.id !== 'agentNew'"), 'the old create form handler must be gone');
    const { vi, en } = await Promise.all([import('../shared/i18n/vi.ts'), import('../shared/i18n/en.ts')]).then(([a, b]) => ({ vi: a.vi, en: b.en }));
    // #149: a todo with an owner was handed out (agent may have forgotten to claim) — shown as "Đã giao", not lumped with unowned work.
    assert.ok(html.includes("const tgroup = (x) => x.status === 'todo' || x.status === 'blocked' ? 'planned' : x.status;"));
    assert.equal(vi['task.col.planned'], 'Dự định'); assert.equal(vi['task.blocked'], 'Bị chặn');
    for (const k of ['task.col.planned', 'task.waitFor', 'task.blockedReal']) assert.ok(en[k], `en missing ${k}`);
    // #196: KPI table from GET /api/rooms/:room/kpi, row click filters by owner, stuck badge on doing cards, lead.monitor settings
    for (const s of ['`/api/rooms/${enc(r)}/kpi?days=${S.kpiDays}`', 'data-kpi-owner=', 'id="kpiDays"', 'kpiPanel(r)', "t('task.stuckFor', { n: idleMin })", "'lead.monitor.on'", "'lead.monitor.staleMin'", "'lead.monitor.nudgeMin'"]) assert.ok(html.includes(s), `missing ${s}`);
    for (const k of ['task.kpi.title', 'task.kpi.stale', 'task.kpi.min', 'task.kpi.hour', 'task.stuckFor']) { assert.ok(en[k], `en missing ${k}`); assert.ok(vi[k], `vi missing ${k}`); }
  } finally { await hub.close(); }
});

test('UI distinguishes hub notices with no session id from messages sent by the user', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of ["const isHubMessage = (m) => !m.fromId", "m.from === 'bear-agent-manager'", 'm.kind === \'system\' || isHubMessage(m)', 'const who = messageName(m)', 'messageName(m) : (m.kind === \'system\'']) {
      assert.ok(html.includes(s), `missing ${s}`);
    }
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
    for (const s of ['id="replyBar"', "id = 'rplBtn'", 'replyTo: S.reply.id', 'data-goto=', 'm.replyTo']) assert.ok(html.includes(s), `missing ${s}`);
  } finally { await hub.close(); }
});

test('T38: private chat per agent — popup button, dm rooms split from the room list, hide action', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of [
      'id="dmSec"', 'id="dms"',
      'data-dm="${esc(s.id)}"', "t('members.chatDm')",
      "api(`/api/rooms/dm/${enc(b.dataset.dm)}`",
      "const dmFor = (sid) => S.rooms.find((r) => r.dm === sid)",
      "Math.abs(x.ts - m.ts) <= 2000",
      "S.rooms.filter((r) => !r.dm)", "S.rooms.filter((r) => r.dm && !r.dmHidden)",
      "api(`/api/rooms/${enc(r.name)}/hide`",
    ]) assert.ok(html.includes(s), `missing ${s}`);
  } finally { await hub.close(); }
});

test('#238 new-agent dialog: folder picker, review before start, and the room folder default', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of [
      'data-agent-browse', "api('/api/browse-folder'", "t('ac.agent.browse')",
      'data-agent-confirm', "t('ac.agent.confirmText'", "t('agent.spawn.back')", "t('agent.spawn.setRoomFolder')",
      'createAgent({ ...state.body, confirm: true }, true)',
    ]) assert.ok(html.includes(s), `missing ${s}`);
  } finally { await hub.close(); }
});

test('Room.cwd: both headless spawn forms default to the selected room folder and can update it', async () => {
  const { hub, call, dir } = await makeHub();
  try {
    await call('/api/rooms', { name: 'repo' });
    await call('/api/rooms/repo/cwd', { cwd: dir }, { method: 'PUT' });
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of [
      'roomInfo?.cwd',
      'name="setRoomCwd"',
      "t('agent.spawn.setRoomFolder')",
      "form.elements.namedItem('cwd').value = room?.cwd || ''",
    ]) assert.ok(html.includes(s), `missing ${s}`);
  } finally { await hub.close(); }
});

test('bug: private-chat entry reachable from the running-agents sidebar too, and room/DM rows show a pointer cursor', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of [
      "it('dm', ico(I.chat) + t('members.chatDm'))",
      "on('dm', () => api(`/api/rooms/dm/${enc(id)}`, {})",
      '.room{display:flex;align-items:center;gap:8px;width:100%;padding:6px 8px;border-radius:8px;text-align:left;color:var(--side-text);cursor:pointer}',
      'data-a="dm" title="${t(\'members.chatDm.tip\')}"',
      "d.querySelector('[data-a=dm]')?.addEventListener('click', () => api(`/api/rooms/dm/${enc(s.id)}`, {})",
    ]) assert.ok(html.includes(s), `missing ${s}`);
  } finally { await hub.close(); }
});

test('T56: private chats are easy to find — always-visible "Chat riêng" block with a "+ Nhắn riêng…" picker, and hiding one explains itself instead of vanishing silently', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of [
      // (1) the "Chat riêng" block is static markup with no display:none/hidden gate, plus a visible "+ Nhắn riêng…" picker button
      '<div class="sec" id="dmSec"><span data-i18n="rooms.dm.title">Chat riêng</span></div>',
      '<button type="button" class="btn sm dmnew" id="addDmBtn" data-i18n="rooms.dm.new">+ Nhắn riêng…</button>',
      '<div id="dms"></div>',
      "$('addDmBtn').onclick",
      // the picker's own rows are plain menu buttons (not .sess rows), so picking an agent starts the DM in one click — no nested sessionMenu popup
      'data-dmpick="${esc(s.id)}"',
      "m.querySelectorAll('[data-dmpick]').forEach((b) => b.onclick = () => {",
      "api(`/api/rooms/dm/${enc(b.dataset.dmpick)}`, {})",
      "t('rooms.dm.noAgents')",
      "t('rooms.dm.none')", // empty-state line shown in #dms instead of hiding the whole block
      // (2) "…" on a DM row opens a menu with an explicit "keeps history, can reopen" label, not an immediate hide
      "openMenu(e.currentTarget, `<button type=\"button\" class=\"item\" data-a=\"hide\">${t('members.chatDm.hide')}</button>`",
      "toast(t('members.chatDm.hidden'))",
      // (3) the 💬 icon on an agent row gets its own "Nhắn riêng" tooltip, distinct from the menu-item label "Chat riêng"
      "t('members.chatDm.tip')",
    ]) assert.ok(html.includes(s), `missing ${s}`);
    const { vi, en } = await Promise.all([import('../shared/i18n/vi.ts'), import('../shared/i18n/en.ts')]).then(([a, b]) => ({ vi: a.vi, en: b.en }));
    for (const k of ['rooms.dm.new', 'rooms.dm.none', 'rooms.dm.pick', 'rooms.dm.noAgents', 'members.chatDm.tip', 'members.chatDm.hide', 'members.chatDm.hidden']) {
      assert.ok(vi[k], `vi missing ${k}`); assert.ok(en[k], `en missing ${k}`);
    }
    assert.notEqual(vi['members.chatDm.tip'], vi['members.chatDm']); // icon tooltip ("Nhắn riêng") reads differently from the full action label ("Chat riêng")
  } finally { await hub.close(); }
});

test('T54: sys.tab.deaf / sys.wake.cannot messages offer a "Mở lại" button (data-sysopen) even while the session still looks online', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of [
      "m.sys.type === 'tab' || (['usage', 'wake'].includes(m.sys.type) && ag.status === 'offline')",
    ]) assert.ok(html.includes(s), `missing ${s}`);
  } finally { await hub.close(); }
});

test('i18n: every key the UI uses exists, and no Vietnamese text is left outside data-i18n fallbacks and comments', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    const { vi } = await import('../shared/i18n/vi.ts');
    const used = new Set<string>();
    for (const m of html.matchAll(/\bt\('([\w.]+)'/g)) used.add(m[1]);
    for (const m of html.matchAll(/data-i18n[\w-]*="([\w.]+)"/g)) used.add(m[1]);
    for (const m of html.matchAll(/: '([a-zA-Z]+(?:\.[a-zA-Z0-9]+)+)'/g)) if (m[1] in vi || /^(rcKind|status|mode|cmode|route|sub)\./.test(m[1])) used.add(m[1]);
    assert.deepEqual([...used].filter((k) => !(k in vi)), [], 'keys used but missing from vi.ts');
    const VN = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐ]/;
    const body = html.replace(/<style>[\s\S]*?<\/style>/, '').split('\n').filter((l) => !/^\s*(\/\/|\/\*|\*)/.test(l) && !/\/\/[^'"`]*$/.test(l.replace(/'[^']*'|"[^"]*"|`[^`]*`/g, '')));
    const bad = body.filter((l) => VN.test(l.replace(/Tiếng Việt/g, '')) && !/data-i18n/.test(l)).map((l) => l.trim().slice(0, 80));
    assert.deepEqual(bad, [], 'hard-coded Vietnamese outside the dictionary');
  } finally { await hub.close(); }
});

test('identical consecutive system lines collapse into one with a count', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of ['sysRuns', 'function sysRow', '×${run.length}']) assert.ok(html.includes(s), `missing ${s}`);
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

test('UI tabs have their views', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const t of ['rooms', 'workers', 'tokens', 'logs', 'flow', 'office', 'skills', 'settings']) {
      assert.ok(html.includes(`data-tab="${t}"`), `missing tab ${t}`);
      assert.ok(html.includes(`id="view-${t}"`), `missing view ${t}`);
    }
    assert.ok(html.includes('.view[hidden]{display:none!important}'), 'a hidden flex <main> must really hide');
    assert.ok(html.includes('function openOffice()') && html.includes('function closeOffice()'), 'Office is loaded on demand and unmounted when leaving its tab');
    assert.ok(html.indexOf("loadOfficeScript('/vendor/office/three.min.js')") < html.indexOf("loadOfficeScript('/vendor/office/OrbitControls.js')"), 'Three.js loads before OrbitControls');
    assert.ok(html.indexOf("loadOfficeScript('/vendor/office/OrbitControls.js')") < html.indexOf("loadOfficeScript('/office.js')"), 'OrbitControls loads before the Office module');
  } finally { await hub.close(); }
});

test('Office tab assets are served locally and without a token', async () => {
  const { hub } = await makeHub();
  try {
    for (const [url, type, marker] of [
      ['/office.css', 'text/css', '.office{'],
      ['/office.js', 'text/javascript', 'window.mountOffice = mountOffice'],
      ['/vendor/office/three.min.js', 'text/javascript', 'const e="128"'],
      ['/vendor/office/OrbitControls.js', 'text/javascript', 'THREE.OrbitControls = OrbitControls'],
      ['/office4/main.js', 'text/javascript', 'export function mountOffice4'],
      ['/vendor/three/three.module.min.js', 'text/javascript', 'REVISION'],
      ['/vendor/three/examples/jsm/postprocessing/GTAOPass.js', 'text/javascript', 'class GTAOPass'],
    ]) {
      const response = await fetch(hub.url + url);
      assert.equal(response.status, 200, `${url} should be public static asset`);
      assert.ok(response.headers.get('content-type')?.startsWith(type), `${url} should have ${type} content type`);
      assert.ok((await response.text()).includes(marker), `${url} should contain ${marker}`);
    }
  } finally { await hub.close(); }
});

test('Flow tab ports the tiered room graph, replay controls, task actions and fixed 5-tier cards', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of [
      "function loadFlow()",
      "function renderFlow()",
      "api(`/api/rooms/${enc(r)}/messages?limit=300`)",
      'for (const id of m.wake || [])',
      'function flowPulse',
      'class="flow-main"',
      'id="flowInfo" aria-live="polite"',
      "es.addEventListener('msg'",
      "es.addEventListener('tasks'",
      "es.addEventListener('session'",
      'function flowTierLayout(nodes, tiers)',
      'function flowLaneTimeline(nodes, events, cursor, selectedMsg, selected)',
      'data-flow-tier-node=',
      'data-flow-tier-select',
      'data-flow-add-tier',
      'data-flow-task-open',
      'id="flowTaskForm"',
      'api(`/api/rooms/${enc(S.flowRoom)}/tasks`, { title, detail, owner: agent })',
      'role="button"',
      'data-flow-message=',
      '<div class="flow-graph-wrap"><div class="flow-tier-tools">',
      'flowColorOrder = new Map(nodes.map((n, i) => [n.id, i]))',
      '.flow-tier-tools button{padding:4px 12px;border:1px solid var(--line);background:var(--panel)',
      '>+ ${t(\'flow.addTier\')}</button>',
      '.tdot.st-assigned{background:#3B82F6}',
      'function flowHash(value)',
      'function flowDrawEdges()',
      'class="flow-stage" id="flowStage"',
      'class="flow-edges" id="flowEdges"',
      'class="flow-cols" id="flowCols"',
      'data-flow-close',
      '.flow-stage{position:relative;height:calc(100vh - 270px)',
      'prefers-reduced-motion',
      "el.contains(ae) && ae.matches('select,input,textarea')"
    ]) assert.ok(html.includes(s), `missing Flow behavior: ${s}`);
    assert.ok(!html.includes('flowSprite') && !html.includes('flow.office'), 'the unapproved pixel-office view must be removed');
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

test('Log tab: filters query GET /api/logs, a row opens its data, raw output loads, and SSE only feeds the open tab', async () => {
  const { hub, call } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of [
      'data-tab="logs"', 'id="view-logs"', 'function renderLogPage()', 'function loadLogs()',
      'data-log-${kind}="${esc(value)}"', 'data-log-range="${r}"',
      'function logKeep(e)', "es.addEventListener('log'", "if (S.tab !== 'logs' || !S.logLive) return;",
      'data-log-row="${esc(key)}"', 'aria-expanded="${open}"', 'data-log-run="${esc(e.runLog)}"',
      "'/api/logs?' + logQuery()", "'/api/logs/run/' + encodeURIComponent(name)", "p.set('limit', '300')",
      'function openAgentLog', 'data-log-agent="${esc(selected.name)}"', 'S.logs.length > 500',
    ]) assert.ok(html.includes(s), `missing ${s}`);
    assert.ok(html.indexOf("es.addEventListener('log'") > html.indexOf('function connect()'), 'the log line arrives on the existing SSE stream');
    for (const key of [
      'tab.logs', 'logs.title', 'logs.lede', 'logs.level', 'logs.area', 'logs.agent', 'logs.allAgents', 'logs.q',
      'logs.range', 'logs.range.hour', 'logs.range.today', 'logs.range.week', 'logs.live', 'logs.refresh', 'logs.count',
      'logs.empty', 'logs.error', 'logs.data', 'logs.runLog', 'logs.runTitle', 'logs.openFor',
    ]) assert.ok(key in en && key in vi, `missing log translation ${key}`);
    // the tab talks to the real route: newest-first list, q that matches nothing is empty, run names cannot escape logs/runs
    assert.ok(Array.isArray(await call('/api/logs?limit=5')), 'GET /api/logs returns a list');
    assert.deepEqual(await call('/api/logs?q=no-such-log-line-xyz'), []);
    const bad = await fetch(hub.url + '/api/logs/run/' + encodeURIComponent('../state.json'), { headers: { 'x-room-token': hub.token } });
    assert.equal(bad.status, 400, 'the UI can only ask for a run log, never another file');
  } finally { await hub.close(); }
});

test('settings tab: worker switches, auto jobs, per-agent skill rules, providers (keys write-only), accounts frame', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of ['function renderSettingsView', 'type="password"', 'key: null', "t('compact.note')", "sel('agentComms'", "'settings.agentComms.hint'", "force: 'mode.force'", "ban: 'mode.ban'", 'agentSkills', "'/api/skills'", "'/api/settings'", "method || (body ? 'POST' : 'GET')"]) assert.ok(html.includes(s), `missing ${s}`);
    assert.ok(html.includes("(wildcard ? ['auto', 'ban'] : ['force', 'auto', 'ban'])"), 'a whole plugin can never be forced');
  } finally { await hub.close(); }
});

test('Settings memory view loads, edits, deletes and clears BAM-owned entries with translated labels', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const source of ["'/api/memory", "data-memory-save", "data-memory-delete", "data-memory-clear", "data-memory-search"]) {
      assert.ok(html.includes(source), `memory UI is missing ${source}`);
    }
    const keys = [
      'set.memory.title', 'set.memory.note', 'set.memory.room', 'set.memory.project', 'set.memory.kind', 'set.memory.search',
      'set.memory.all', 'set.memory.kind.preference', 'set.memory.kind.decision', 'set.memory.kind.context',
      'set.memory.kind.tracking', 'set.memory.kind.research', 'set.memory.kind.question', 'set.memory.scope',
      'set.memory.scope.user', 'set.memory.scope.project', 'set.memory.scope.room', 'set.memory.text', 'set.memory.tags',
      'set.memory.source.user', 'set.memory.source.duck', 'set.memory.source.muse', 'set.memory.add', 'set.memory.save',
      'set.memory.delete', 'set.memory.clearRoom', 'set.memory.clearProject', 'set.memory.list', 'set.memory.loading',
      'set.memory.none', 'set.memory.created', 'set.memory.saved', 'set.memory.deleted', 'set.memory.cleared',
    ];
    for (const key of keys) {
      assert.ok(en[key], `missing English translation ${key}`);
      assert.ok(vi[key], `missing Vietnamese translation ${key}`);
    }
  } finally { await hub.close(); }
});

test('Duck and Muse profiles share memory, expose explicit Muse saves and use Chrome status', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const source of [
      'data-agent-kind="duck"', 'data-agent-duck', "api('/api/duck/status')", '/api/duck/history?id=',
      'data-duck-status-refresh', 'data-duck-history-clear',
      'data-memory-add', 'data-memory-save', 'data-agent-kind="muse"', 'data-agent-muse', 'data-muse-save="${m.id}"',
      "api('/api/muse/status')", "api('/api/memory/from-message', { room, id })", 'data-muse-status-refresh',
    ]) assert.ok(html.includes(source), `Duck/memory UI is missing ${source}`);
    const start = html.indexOf('const duckInfo = isDuck');
    const end = html.indexOf('const toggleDisabled', start);
    assert.ok(start >= 0 && end > start);
    assert.ok(!html.slice(start, end).includes('/api/browser'), 'Duck settings do not add a browser setting');
    const { vi, en } = await Promise.all([import('../shared/i18n/vi.ts'), import('../shared/i18n/en.ts')]).then(([a, b]) => ({ vi: a.vi, en: b.en }));
    for (const key of [
      'agent.spawn.duck', 'agent.spawn.duckNote', 'agents.duck.title',
      'agent.spawn.muse', 'agent.spawn.museNote', 'agents.muse.title', 'agents.muse.save', 'agents.muse.saved',
      'agents.duck.chrome', 'agents.duck.chromeReady', 'agents.duck.chromeMissing',
      'agents.duck.signedIn', 'agents.duck.signInRequired', 'agents.duck.statusError',
      'agents.duck.busy', 'agents.duck.refresh',
      'agents.duck.historyClear', 'agents.duck.historyCleared',
      'agents.duck.enabled', 'agents.duck.disabled',
      'agents.duck.confirmOn', 'agents.duck.confirmOff',
    ]) {
      assert.ok(en[key], `missing English translation ${key}`);
      assert.ok(vi[key], `missing Vietnamese translation ${key}`);
    }
  } finally { await hub.close(); }
});

test('browser settings are in Worker, save browser fields, show live status, and add no browser pane', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const source of [
      "api('/api/browser')",
      "t('set.browser.running'",
      "t('set.browser.stopped')",
      "sw('browser.enabled'",
      "num('browser.port'",
      "txt('browser.chromePath'",
      'set.browser.agentsNote',
      'set.browser.noPasswords',
    ]) assert.ok(html.includes(source), `browser settings are missing ${source}`);
    assert.ok(!html.includes('data-tab="browser"'), 'the headless browser has no UI pane');
    for (const key of [
      'set.browser', 'set.browser.hint', 'set.browser.enabled', 'set.browser.port', 'set.browser.chromePath',
      'set.browser.running', 'set.browser.stopped', 'set.browser.agentsNote', 'set.browser.noPasswords',
    ]) {
      assert.ok(key in vi, `missing Vietnamese string ${key}`);
      assert.ok(key in en, `missing English string ${key}`);
    }
  } finally { await hub.close(); }
});

test('Copilot profile settings: list, add, enable/disable, remove, and separate runtime from auth status', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of [
      "const profiles = st.agents?.profiles || []",
      'data-open-agent-dialog',
      'name="model"',
      // #247: a profile card shows its model read-only and links to the one drawer, like the member panel
      '`<div class="pf small"><span>${t(\'ac.profile.modelLabel\')}: <b class="mono">${esc(p.model || t(\'common.default\'))}</b></span><button type="button" class="btn sm" data-agent-open="${esc(normAgent(p.name))}">${t(\'agent.settings\')}</button></div>`',
      'data-profile-enabled="${esc(p.id)}"',
      'data-profile-remove="${esc(p.id)}"',
      "submitAgentProfile({ id, provider: 'copilot', name, cwd",
      "api('/api/settings', { agents: { profiles }, ...(confirmRemove ? { confirmRemove } : {}) }, 'PUT')",
      "api('/api/agent-profiles')",
      "status?.auth === 'ok'",
      "status?.auth === 'no'",
      "data-profile-confirm=",
      "api(profileRoute(id), { on, confirm: true })",
      "t('ac.profile.runtime')",
      "'ac.profile.login'",
      "provider: 'claude-api', name, cwd, providerId",
      "m.kind === 'mirror' ? ' mirror'",
      "t('msg.fromTab')",
      'data-profile-retry="${esc(p.id)}"',
      "api(`${profileRoute(id)}/retry`, {})",
    ]) assert.ok(html.includes(s), `missing ${s}`);
    // #247: the inline model editor is gone — the drawer owns the model, the agent table owns the link
    assert.ok(!html.includes('data-profile-model'), 'a profile card still edits the model outside the drawer');
  } finally { await hub.close(); }
});

test('Antigravity agents are added from the + Agent dialog: agy is checked on open, Create waits for a login, install commands are only copied', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const source of [
      'data-agent-agy',
      "api('/api/agy/check?path=')",
      "api(`/api/agy/check?path=${enc(agyPath)}`)",
      'model.replaceChildren(...models.map',
      'submit.disabled = !result.loggedIn',
      "provider: 'agy', name, cwd",
      'id: newProfileId(name, profiles)',
      "'gemini-4-argon-medium'",
      'irm https://antigravity.google/cli/install.ps1 | iex',
      'curl -fsSL https://antigravity.google/cli/install.sh | bash',
      'data-copytext="${esc(agyInstall)}"',
      'agy-install-command{min-width:0;overflow-wrap:anywhere}',
      '<code class="mono agy-install-command">',
      "agents.agy.quota",
      "agents.agy.commit",
    ]) assert.ok(html.includes(source), `missing Agy setup behavior: ${source}`);
    const { vi, en } = await Promise.all([import('../shared/i18n/vi.ts'), import('../shared/i18n/en.ts')]).then(([a, b]) => ({ vi: a.vi, en: b.en }));
    for (const key of ['title', 'type', 'name', 'cwd', 'path', 'model', 'defaultModel', 'effort', 'check', 'ok', 'notFound', 'notLogged', 'install', 'installWindows', 'installUnix', 'quota', 'commit', 'checkFirst']) {
      assert.ok(vi[`agents.agy.${key}`], `vi missing agents.agy.${key}`);
      assert.ok(en[`agents.agy.${key}`], `en missing agents.agy.${key}`);
    }
  } finally { await hub.close(); }
});

test('#238 one + Agent dialog offers all six kinds, including Muse, and missing dependencies link to group 3', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of [
      'id="agentNewBtn"',
      'function openAgentDialog()',
      'data-agent-kind="folder"',
      'data-agent-kind="api"',
      'data-agent-kind="copilot"',
      'data-agent-kind="agy"',
      'data-agent-kind="duck"',
      'data-agent-kind="muse"',
      'data-agent-folder', 'data-agent-api', 'data-agent-copilot', 'data-agent-agy', 'data-agent-duck', 'data-agent-muse',
      'data-agent-muse-refresh', 'provider: \'muse\'', '/api/muse/status',
      "data-agent-goto=\"accounts\"", "agent.spawn.needAccount", "agent.spawn.needProvider", "agent.spawn.needCopilot", "agent.spawn.openAccounts",
      "if (e.target.closest('[data-open-agent-dialog]')) return openAgentDialog();",
      "zoom.querySelectorAll('[data-agent-goto]')",
      'function newProfileId(name, profiles)',
      "if (e.target.closest('[data-open-agent-dialog]')) return openAgentDialog();",
      "createAgent({ name: get('name'), cwd: get('cwd'), room: get('room')",
      "provider: 'claude-api', name, cwd, providerId",
      "api(`${endpoint}${enc(profile.id)}`, { on: true, confirm: true })",
      'function agentKindBadge(s)',
      'e.message',
    ]) assert.ok(html.includes(s), `missing ${s}`);
    const { vi, en } = await Promise.all([import('../shared/i18n/vi.ts'), import('../shared/i18n/en.ts')]).then(([a, b]) => ({ vi: a.vi, en: b.en }));
    for (const dict of [vi, en]) {
      assert.ok(dict['agent.spawn.agy']);
      assert.ok(dict['agent.spawn.agyNote']);
      assert.ok(dict['agent.spawn.muse']);
      assert.ok(dict['agent.spawn.museNote']);
      assert.ok(dict['ac.copilot'].includes('Antigravity'));
      for (const k of ['agent.spawn.runBy', 'agent.spawn.needAccount', 'agent.spawn.needProvider', 'agent.spawn.needCopilot', 'agent.spawn.openAccounts']) assert.ok(dict[k], `missing ${k}`);
    }
  } finally { await hub.close(); }
});

test('#253 Duck + Agent mirrors Muse with Chrome status and refresh', async () => {
  const html = await readFile(new URL('../ui/index.html', import.meta.url), 'utf8');
  for (const source of [
    'data-agent-duck',
    'data-agent-duck-status',
    'data-agent-duck-refresh',
    'loadDuckStatus',
    "api('/api/duck/status')",
    "provider: 'duck'",
  ]) assert.ok(html.includes(source), `missing Duck Chrome wiring: ${source}`);
  const { vi, en } = await Promise.all([import('../shared/i18n/vi.ts'), import('../shared/i18n/en.ts')]).then(([a, b]) => ({ vi: a.vi, en: b.en }));
  for (const dict of [vi, en]) {
    for (const key of ['agent.spawn.duck', 'agent.spawn.duckNote', 'agents.duck.chrome', 'agents.duck.chromeReady', 'agents.duck.chromeMissing', 'agents.duck.signedIn', 'agents.duck.signInRequired']) {
      assert.ok(dict[key], `missing translation ${key}`);
    }
  }
});

test('+ Agent stays available on home and private chats and uses the last normal room', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of [
      'id="agentNewBtn"',
      "$('agentNewBtn').hidden = false",
      '.btn[hidden],button[hidden]{display:none!important}',
      'room: currentRoom?.dm ? S.taskRoom : (currentRoom?.name || S.taskRoom)',
      'rooms.find((r) => r.name === S.taskRoom)?.name',
    ]) assert.ok(html.includes(s), `missing ${s}`);
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
    // \r?: a Windows checkout with core.autocrlf has CRLF line ends
    const grab = (name: string) => html.match(new RegExp(String.raw`function ${name}\([\s\S]*?\r?\n}\r?\n`))![0];
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
    for (const s of ['data-sub="${k}"', "overview: 'sub.overview'", "agent: 'sub.agent'", "accounts: 'sub.accounts'", "rooms: 'sub.rooms'", "tools: 'sub.tools'", "system: 'sub.system'", "t('members.lead')", "t('members.unlead')"]) assert.ok(html.includes(s), `missing ${s}`);
    assert.ok(html.includes("<div class=\"vw\">${claudeProBlock()}${copilotUsageBlock()}${paidUsageBlock()}<h2>${t('usage.worker')}</h2>${head}"), 'Usage tab: Claude, Copilot and paid providers come before the worker token KPIs');
    for (const x of ["'/api/paid-usage'", 'data-tab="tokens" data-i18n="tab.usage"', 'function copilotUsageBlock', 'function paidUsageBlock']) assert.ok(html.includes(x), `Usage tab: missing ${x}`);
  } finally { await hub.close(); }
});

/* ---------- Settings IA S1 (#234): one registry, search, deep links, changed dot ---------- */

test('#234 the settings registry matches the UI and the server defaults, and every key renders once', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    const script = html.slice(html.indexOf('<script>'), html.lastIndexOf('</script>'));
    const routes = /const SETTING_ROUTES = \[([^\]]+)\]/.exec(script)?.[1].split(',').map((x) => x.trim().replace(/^'|'$/g, '')).filter(Boolean) ?? [];
    assert.deepEqual(routes, ['read', 'edit', 'osin'], 'the routes table drives the dynamic workerRoutes keys');
    const defStart = script.indexOf('const SETTING_DEFS = ') + 'const SETTING_DEFS = '.length;
    const defEnd = script.indexOf('\nconst DEF = (key)');
    assert.ok(defStart > 0 && defEnd > defStart, 'the registry table is missing');
    const defs = new Function('SETTING_ROUTES', `return (${script.slice(defStart, defEnd).trim().replace(/;$/, '')});`)(routes) as {
      key: string; group: string; sub: string; label: string; hint: string; detail: string; type: string; default: unknown; min?: number; max?: number;
    }[];
    assert.ok(defs.length > 30, `the registry should cover the whole settings tab (${defs.length})`);
    for (const d of defs) {
      for (const field of ['key', 'group', 'sub', 'label', 'type']) assert.ok(d[field], `${d.key}: missing ${field}`);
      assert.ok(['bool', 'number', 'text', 'select'].includes(d.type), `${d.key}: unknown type ${d.type}`);
      assert.ok(d.label in en && d.label in vi, `${d.key}: label key ${d.label} is not translated`);
      if (d.hint) assert.ok(d.hint in en && d.hint in vi, `${d.key}: hint key ${d.hint} is not translated`);
      if (d.type === 'number') assert.ok(Number.isFinite(d.min) && Number.isFinite(d.max) && (d.min as number) < (d.max as number), `${d.key}: a number needs min < max`);
    }

    // The registry's default must be what the server writes when nothing is saved (#archive.enabled is only
    // written once the switch is used, so its implicit default is false).
    const defaults = defaultSettings(4);
    const at = (key: string) => key.split('.').reduce<any>((o, k) => (o == null ? undefined : o[k]), defaults);
    for (const d of defs) {
      const want = d.key === 'archive.enabled' ? false : at(d.key);
      assert.deepEqual(d.default, want, `${d.key}: registry default differs from hub defaultSettings()`);
    }

    // Every row the UI draws: a literal data-set, or the first argument of the row helpers.
    const rendered = new Map<string, number>();
    const bump = (key: string) => rendered.set(key, (rendered.get(key) ?? 0) + 1);
    for (const m of script.matchAll(/data-set="([A-Za-z0-9_.-]+)"/g)) bump(m[1]);
    for (const m of script.matchAll(/\b(?:sw|swVal|num|txt|sel)\('([A-Za-z0-9_.-]+)'/g)) bump(m[1]);
    for (const m of script.matchAll(/data-set="workerRoutes\.\$\{k\}\.(enabled|provider|model)"/g)) for (const k of routes) bump(`workerRoutes.${k}.${m[1]}`);

    const registered = new Set(defs.map((d) => d.key));
    for (const [key, n] of rendered) {
      assert.ok(registered.has(key), `the UI renders ${key}${n > 1 ? ` ${n} times` : ''} but it is not in SETTING_DEFS`);
      assert.equal(n, 1, `${key} is rendered ${n} times; a setting has exactly one home`);
    }
    for (const key of registered) assert.ok(rendered.has(key), `${key} is registered but no row renders it`);
  } finally { await hub.close(); }
});

test('#244 isChanged of a key missing from SETTING_DEFS returns false instead of throwing', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    const at = html.indexOf('const isChanged = ');
    assert.ok(at > 0, 'isChanged is missing');
    const src = html.slice(at + 'const isChanged = '.length, html.indexOf('\n', at)).replace(/;\s*$/, '');
    const build = (settingAt: (k: string) => unknown) => new Function('settingAt', `return ${src};`)(settingAt) as (d?: { key: string; default?: unknown } | null) => boolean;
    const live = build((k) => (k === 'lead.wake.atPct' ? 95 : undefined));
    assert.equal(live({ key: 'lead.wake.atPct', default: 90 }), true, 'a value that differs from its default is changed');
    assert.equal(live({ key: 'lead.wake.atPct', default: 95 }), false);
    const missing = build(() => undefined);
    assert.equal(missing(undefined), false, 'a key with no registry entry has no row to mark');
    assert.equal(missing(null), false);
  } finally { await hub.close(); }
});

test('#234 settings search, deep link and changed dot are wired, and the old duplicate archive rows are gone', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of [
      'id="setSearch"', 'function applySettingsFilter', "S.setQuery", "settings.search.ph",
      'function settingsDeepLink', "startsWith('settings/')", 'data-row="${key}"',
      'data-reset="${key}"', "t('settings.reset')", "t('settings.changed')", 'isChanged(d)',
      'saveValue(d.key, d.default)',
    ]) assert.ok(html.includes(s), `settings S1 is missing ${s}`);
    assert.ok(!html.includes("data-set=\"archive.dir\"") && !html.includes("sw('archive.enabled', arOn, t('set.archive')"), 'the machine wizard must link to the Data tab instead of drawing the archive inputs a second time');
    for (const key of ['settings.search', 'settings.search.ph', 'settings.changed', 'settings.reset', 'settings.noMatch', 'sm.s2.open']) {
      assert.ok(key in vi && key in en, `missing translated string ${key}`);
    }
  } finally { await hub.close(); }
});

/* ---------- Settings IA S2 (#235): six groups, old sub-tabs redirect ---------- */

test('#235 settings has six groups and every old sub-tab id still lands in one of them', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    const script = html.slice(html.indexOf('<script>'), html.lastIndexOf('</script>'));
    const groups = ["overview: 'sub.overview'", "agent: 'sub.agent'", "accounts: 'sub.accounts'", "rooms: 'sub.rooms'", "tools: 'sub.tools'", "system: 'sub.system'"];
    const subsSrc = /const SUBS = lazy\(\{([^}]+)\}\)/.exec(script)?.[1];
    assert.ok(subsSrc, 'the six settings groups are missing');
    const subs = [...subsSrc.matchAll(/(\w+):/g)].map((m) => m[1]);
    assert.deepEqual(subs, ['overview', 'agent', 'accounts', 'rooms', 'tools', 'system'], 'settings groups follow spec §3');
    for (const g of groups) assert.ok(script.includes(g), `missing settings group ${g}`);

    const aliasSrc = /const SUB_ALIAS = \{([^}]+)\}/.exec(script)?.[1];
    assert.ok(aliasSrc, 'old sub-tab ids must map to a new group');
    const alias = new Function(`return {${aliasSrc}}`)() as Record<string, string>;
    for (const old of ['general', 'worker', 'lead', 'perms', 'compact', 'data', 'memory', 'providers', 'account', 'health', 'setup']) {
      assert.ok(subs.includes(alias[old]), `${old} has no group (${alias[old]})`);
    }
    for (const s of ['const subOf = (name)', 'S.setSub = subOf(S.setSub)', 'S.setSub = subOf(sb.dataset.sub)', 'S.setSub = subOf(sub); showTab(tab)']) {
      assert.ok(script.includes(s), `old settings links are not redirected: missing ${s}`);
    }

    // A setting has exactly one home: the registry's group and sub agree (#235).
    const defs = script.slice(script.indexOf('const SETTING_DEFS = '), script.indexOf('\nconst DEF = (key)'));
    for (const m of defs.matchAll(/group: '([a-z]+)', sub: '([a-z]+)'/g)) assert.equal(m[2], m[1], `a setting is filed under ${m[1]} but its sub-tab is ${m[2]}`);

    for (const key of ['sub.overview', 'sub.agent', 'sub.accounts', 'sub.rooms', 'sub.tools', 'sub.system', 'agent.defaults.title', 'set.mcp.title']) {
      assert.ok(key in vi && key in en, `missing translated string ${key}`);
    }
  } finally { await hub.close(); }
});

/* ---------- Settings IA S3 (#237): one agent table + one drawer, one edit place ---------- */

test('#237 every agent is listed in one table and its settings are edited only in the drawer', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    const script = html.slice(html.indexOf('<script>'), html.lastIndexOf('</script>'));
    // The catalog merges saved profiles (api / agy / duck / copilot) with the live member sessions.
    for (const s of ['function agentCatalog()', 'st.agents?.profiles', 'S.skills?.members', 'agentKind(', 'agentRunsWith(', 'function agentModel(a)']) {
      assert.ok(script.includes(s), `the agent catalog is missing ${s}`);
    }
    // One table: kind filter, one row per agent, one button into the drawer.
    for (const s of ['function agentTableBlock(st)', 'id="agentKindFilter"', 'data-agent-open="${esc(a.key)}"', "t('agent.col.name')", "t('agent.col.tier')", "t('agent.settings')"]) {
      assert.ok(script.includes(s), `the agent table is missing ${s}`);
    }
    // #245: AGENT_KIND is a lazy() map of already-translated strings, so wrapping it in t() prints an empty kind.
    assert.ok(!script.includes('t(AGENT_KIND'), 'AGENT_KIND is translated twice, so the kind column goes blank');
    for (const s of ['<td class="kind">${AGENT_KIND_SHORT[a.kind]}</td>', '...kinds.map((k) => [k, AGENT_KIND_SHORT[k]])', '<span class="lic">${AGENT_KIND[a.kind]}</span>']) {
      assert.ok(script.includes(s), `the kind is not read straight from its lazy map: ${s}`);
    }
    // #245: the agent table carries the "+ Agent" button of the spec (settings-ia §3), next to the kind filter.
    assert.ok(script.includes("data-open-agent-dialog>${t('agent.spawn.add')}"), 'the agent table has no "+ Agent" button');
    assert.ok(script.includes("if (e.target.closest('[data-open-agent-dialog]')) return openAgentDialog();"), 'the "+ Agent" button is not wired to the dialog');
    // The drawer is the one place for model, permissions, compact, skill, tier and MCP.
    const paint = script.slice(script.indexOf('function paintAgentSettings()'), script.indexOf('function renderSettingsView()'));
    for (const s of ['id="agentModelInput"', 'id="agentTier"', 'permRadios(', 'permLists(', 'data-cagent="${esc(a.key)}"', 'data-cmode', 'data-cpct', 'data-cwake', 'data-rtools', 'data-agent-skill', 'data-agent-mcp', 'data-agent-close']) {
      assert.ok(paint.includes(s), `the agent drawer is missing ${s}`);
    }
    assert.ok(script.includes('function openAgentSettings(key)'), 'no function opens the drawer');
    // #247: the drawer sits in #zoom, outside the settings-view handler, so it saves the allow/deny lists itself
    assert.ok(paint.includes("if (el.matches('[data-plist]'))"), 'the drawer does not save the allow/deny lists');
    // #247: the catalog knows every kind the spawn dialog offers, muse included
    for (const s of ["p.provider === 'muse' ? 'muse'", "muse: 'agent.spawn.muse'", "k === 'muse' ? t('agents.muse.title')"]) {
      assert.ok(script.includes(s), `the agent catalog does not know the muse kind: ${s}`);
    }
    for (const key of ['agent.spawn.muse', 'agents.muse.title']) {
      assert.ok(key in vi && key in en, `missing translated string ${key}`);
    }
    assert.ok(script.includes("const ao = e.target.closest('[data-agent-open]'); if (ao) return openAgentSettings(ao.dataset.agentOpen);"), 'the table does not open the drawer');
    assert.ok(script.includes("if (e.target.id === 'agentKindFilter')"), 'the kind filter is not wired');
    // The old per-agent editors are now links: model in the member popup, permissions in the permissions card.
    assert.ok(!script.includes('data-model='), 'the member popup still edits the model outside the drawer');
    assert.ok(script.includes('data-agentsettings='), 'the member popup does not link to the drawer');
    const perms = script.slice(script.indexOf('function permsBlock(st)'), script.indexOf('function createAgent('));
    assert.ok(!perms.includes('permRadios(r.mode'), 'the permissions card still has a second per-agent editor');
    assert.ok(!perms.includes('permLists(n, r)'), 'the permissions card still has a second per-agent editor');
    assert.ok(perms.includes('data-agent-open="${esc(n)}"'), 'the permissions card does not link to the drawer');
    // Saving in the drawer keeps the drawer and the table in sync.
    for (const s of ['if (S.agentOpen) paintAgentSettings();', 'function saveAgentTier(a, tier, room = S.current)', 'function saveAgentModel(a, model)']) {
      assert.ok(script.includes(s), `drawer save is missing ${s}`);
    }
    // The agent group opens with the table, and the group keeps spec §3 cards ≤ 5.
    assert.ok(script.includes('agent: `${agentTableBlock(st)}'), 'the agent group does not start with the table');
    assert.ok(script.includes('saveCopilotProfiles(profiles, confirmRemove)') && script.includes('return saveCopilotProfiles((S.settings.agents?.profiles || []).filter((p) => p.id !== id), [id]);'), 'profile removal must send its exact ID in confirmRemove');
    for (const key of ['agent.profile.invalid', 'agent.profile.confirmRemove']) assert.ok(key in vi && key in en, `missing translation ${key}`);
    const group = script.slice(script.indexOf('agent: `${agentTableBlock(st)}'), script.indexOf('accounts: `${account.accounts}'));
    assert.ok((group.match(/<h2>/g) || []).length <= 5, 'the agent group has more than five cards');
    for (const key of ['agent.table.title', 'agent.col.name', 'agent.col.kind', 'agent.col.runs', 'agent.col.model', 'agent.col.tier', 'agent.col.status', 'agent.settings', 'agent.noSession', 'agent.tierDefault', 'agent.blk.basic', 'agent.blk.context', 'agent.blk.activity']) {
      assert.ok(key in vi && key in en, `missing translated string ${key}`);
    }
  } finally { await hub.close(); }
});

test('#248 the agent table uses short kind words and wraps the name/path so it fits the 1440 frame', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    const script = html.slice(html.indexOf('<script>'), html.lastIndexOf('</script>'));
    // The long kind names ("Claude trong thư mục", "Agent API", "Duck (trò chuyện)") stretched the kind column past the frame.
    assert.ok(script.includes("const AGENT_KIND_SHORT = lazy({ copilot: 'agent.kind.copilot'"), 'the table has no short kind map');
    for (const key of ['agent.kind.folder', 'agent.kind.api', 'agent.kind.copilot', 'agent.kind.agy', 'agent.kind.duck', 'agent.kind.muse']) {
      assert.ok(key in vi && key in en, `missing translated string ${key}`);
      assert.ok(vi[key].length <= 12 && en[key].length <= 12, `${key} is not a short word: ${vi[key]} / ${en[key]}`);
    }
    // The table and its filter take the short word; the drawer header keeps the long name.
    assert.ok(script.includes('<td class="kind">${AGENT_KIND_SHORT[a.kind]}</td>'), 'the kind cell does not use the short word');
    assert.ok(script.includes('...kinds.map((k) => [k, AGENT_KIND_SHORT[k]])'), 'the kind filter does not use the short word');
    assert.ok(script.includes('<span class="lic">${AGENT_KIND[a.kind]}</span>'), 'the drawer lost the long kind name');
    // CSS: no horizontal scroll — the kind is one line, the name/folder column wraps instead of widening the table.
    for (const s of ['.agent-tbl .tbl td:first-child{white-space:normal;overflow-wrap:anywhere', '.agent-tbl .tbl td.kind{white-space:nowrap}']) {
      assert.ok(html.includes(s), `the agent table does not fit the frame: ${s}`);
    }
    assert.ok(script.includes("table(head, body, 'agent-tbl')"), 'the agent table does not carry its own class');
  } finally { await hub.close(); }
});

/* ---------- Office M4 (#148): mount/unmount, no-WebGL fallback, paused loop, reduced motion, i18n ---------- */

test('Office M4: the tab mounts into a scoped root and unmounts every listener, timer and GPU resource it made', async () => {
  const src = await readOffice();
  for (const s of [
    'window.mountOffice = mountOffice',
    'window.unmountOffice = unmountOffice',
    'if (!el || !el.appendChild) throw new Error',
    'unmountOffice();',                                  // mounting twice never leaves a ghost tab behind
    'const $ = (id) => root.querySelector(\'#\' + id);', // ids are looked up inside the mounted root, never the page
    'if (!active) return;',
    'const { root, stop } = active;',
    'active = null;',
    'root.remove()',
    "removeEventListener('keydown', onKey)",
    "removeEventListener('keyup', onKeyUp)",
    "removeEventListener('resize', resize)",
    "document.removeEventListener('visibilitychange', onVisible)",
    'if (ro) ro.disconnect()',
    'stopLive()',
    'mqDark.removeEventListener(\'change\', onDarkChange)',
    'renderer.dispose()',
    'renderer.forceContextLoss',
  ]) assert.ok(src.includes(s), `missing mount/unmount step: ${s}`);
  assert.ok(!src.includes('document.getElementById'), 'an id lookup on document would collide with the hub page');
});

test('Office M4: without WebGL or three.js the HUD and chat stay alive and the scene is replaced by an explanation', async () => {
  const src = await readOffice();
  const { vi } = await import('../shared/i18n/vi.ts');
  const { en } = await import('../shared/i18n/en.ts');
  for (const s of [
    'const THREE = window.THREE;',
    "const why = !THREE ? T('threeMissing') : !THREE.OrbitControls ? T('orbitMissing') : '';",
    'try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { renderer = undefined; }',
    "fallback.textContent = why || T('webglFallback')",
    // the fallback path still wires the simulation/live data and the chat; only the canvas is gone
    '// No WebGL / no three.js: keep the HUD and chat alive, explain the scene.',
    'paintDock(); paintPanel();',
    'stopLive = startLive(); loadI18n();',
  ]) assert.ok(src.includes(s), `missing fallback behavior: ${s}`);
  for (const k of ['office.threeMissing', 'office.orbitMissing', 'office.webglFallback']) {
    assert.ok(vi[k], `vi missing ${k}`);
    assert.ok(en[k], `en missing ${k}`);
  }
  const css = await readFile(new URL('../ui/office.css', import.meta.url), 'utf8');
  assert.ok(css.includes('.office #of-fallback{position:absolute;inset:0;display:none'), 'the fallback starts hidden until JS shows it');
  assert.ok(/\.office #of-fallback\{[^}]*pointer-events:none/.test(css), 'the fallback layer must not swallow clicks on the dock and panel');
});

test('Office M4: the render loop pauses while the page or the tab pane is hidden and resumes when it shows', async () => {
  const src = await readOffice();
  const frame = src.slice(src.indexOf('function frame()'), src.indexOf('hud(); stopLive = startLive();'));
  const pause = frame.indexOf('if (document.hidden || !shown())');
  assert.ok(pause >= 0, 'frame() must return early while hidden');
  assert.ok(frame.indexOf('requestAnimationFrame(frame)') > pause, 'no frame is scheduled after the pause check');
  assert.ok(frame.includes('running = false; last = now(); return;'));
  for (const s of [
    'const shown = () => root.isConnected && root.getClientRects().length > 0;',
    "document.addEventListener('visibilitychange', onVisible);",
    "const onVisible = () => { if (document.hidden) { running = false; cancelAnimationFrame(raf); } else { if (live) liveRefresh(); start(); } };",
    'ro = new ResizeObserver(() => { resize(); start(); });',   // the tab bar shows the pane again
    'if (dead || refreshing || document.hidden) return;',        // live refresh skips work while hidden too
  ]) assert.ok(src.includes(s), `missing pause/resume step: ${s}`);
});

test('Office M4: prefers-reduced-motion removes the bobbing, typing and walking flourishes', async () => {
  const src = await readOffice();
  for (const s of [
    "const mqReduce = mq('(prefers-reduced-motion:reduce)');",
    'const reduced = mqReduce.matches;',
    "typeof matchMedia === 'function'",
    'dt * (reduced ? 9 : 5)',
    'typing && !reduced',
    '(reduced ? 0 : Math.sin(t * 7) * .4)',
    '(reduced ? 0 : Math.sin(t * 4) * .15)',
    'cube.position.y = 1.6 + (reduced ? 0 : Math.sin(t * 2) * .08);',
  ]) assert.ok(src.includes(s), `missing reduced-motion step: ${s}`);
});

test('Office M4: every office label is a dictionary key, en and vi carry the same keys and params, nothing Vietnamese is hard-coded', async () => {
  const src = await readOffice();
  const { vi } = await import('../shared/i18n/vi.ts');
  const { en } = await import('../shared/i18n/en.ts');
  const used = new Set<string>();
  for (const m of src.matchAll(/\bT\('([\w.]+)'/g)) used.add('office.' + m[1]);
  for (const m of src.matchAll(/\blist\('([\w.]+)'\)/g)) used.add('office.' + m[1]);
  for (const m of src.matchAll(/data-of="([\w.]+)"/g)) used.add('office.' + m[1]);
  for (const m of src.matchAll(/'(stat\.[a-z]+)'/g)) used.add('office.' + m[1]);
  for (const k of ['themeAuto', 'themeLight', 'themeDark']) used.add('office.' + k);
  assert.ok(used.size > 70, `expected the whole office surface, found ${used.size} keys`);
  assert.deepEqual([...used].filter((k) => !(k in vi)), [], 'keys used by office.js but missing from vi.ts');
  assert.deepEqual([...used].filter((k) => !(k in en)), [], 'keys used by office.js but missing from en.ts');
  const params = (s: string) => [...s.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
  for (const k of Object.keys(vi).filter((x) => x.startsWith('office.'))) {
    assert.ok(k in en, `en missing ${k}`);
    assert.equal(params((vi as Record<string, string>)[k]), params((en as Record<string, string>)[k]), `params differ for ${k}`);
  }
  // the module resolves labels through the page's t(), then GET /api/i18n, then nothing — never a local string
  for (const s of ["typeof api.t === 'function'", "'/api/i18n'", 'I18N.dicts = d.dicts', 'I18N.lang = langOf(d.setting)', 'applyI18n(); hud(); paintDock();', 'setTimeout(loadI18n, 3000)']) {
    assert.ok(src.includes(s), `missing i18n plumbing: ${s}`);
  }
  const VN = /[àáảãạăắằẳẵặâấầẩẫậèéẻẽẹêếềểễệìíỉĩịòóỏõọôốồổỗộơớờởỡợùúủũụưứừửữựỳýỷỹỵđĐ]/;
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').split('\n').map((l) => l.replace(/\/\/.*$/, '')).join('\n');
  assert.deepEqual(code.split('\n').filter((l) => VN.test(l)).map((l) => l.trim().slice(0, 80)), [], 'hard-coded Vietnamese in office.js');
});

/* ---------- Office rest room (#179): a rate-limited agent sleeps until the limit resets ---------- */

test('Office #179: beds in a rest room, a rate-limited agent sleeps with 💤 and its reset time, then goes back to its desk', async () => {
  const src = await readOffice();
  const { vi } = await import('../shared/i18n/vi.ts');
  const { en } = await import('../shared/i18n/en.ts');
  for (const s of [
    // the rest room: three double beds with a mattress, pillows and a duvet, like the rest of the diorama
    'const BEDS = [2.7, 6.1, 9.5].map((z) => ({ x: -21, z }));',
    'box(2.14, .3, 3.24, 0xfbf7ee, 0, .5, 0, g, false);',
    '[-.55, .55].forEach((px) => box(.85, .22, .6, 0xffffff, px, .72, -1.12, g, false));',
    'box(2.2, .2, 2.0, [0x7f9cf5, 0x63c9a8, 0xf0a35e][i], 0, .66, .5, g, false);',
    // state law: busy wins over a stale limit flag; a limit that has not reset yet is its own state, not the error state
    "else if (s.status === 'busy') state = 'working';",
    "else if (until > Date.now()) state = 'sleep';",
    'sleepUntil: until > Date.now() ? until : 0,',
    "if (a.state === 'sleep') { const b = BEDS[slot.sleep % BEDS.length]; return { kind: 'bed', pos: V(b.x + 1.1, b.z), face: Math.PI / 2, pose: 'lie', key: 'z' + (slot.sleep % BEDS.length) }; }",
    "else if (t.kind === 'bed') { pts.push(V(-19.2, .8)); pts.push(V(-19.2, LOFT.sz - .3)); pts.push(V(LOFT.sx, LOFT.sz - .3)); pts.push(V(LOFT.sx, LOFT.z0 + 1)); pts.push(V(LOFT.ais, LOFT.z0 + 1)); pts.push(V(LOFT.ais, t.pos.z)); pts.push(t.pos); }",
    // the agent lies down on the mattress (not curled up in a lounge chair) and shows a 💤 bubble
    "const lie = !moving && a.pose === 'lie'",
    'a.root.rotation.x += ((lie ? -Math.PI / 2 : 0) - a.root.rotation.x) * Math.min(1, dt * 6);',
    'a.root.position.y = lie ? 1.24 + breathe :',
    "const sleeping = a.state === 'sleep', bub = sleeping ? (T('sleep.bubble') || '💤') : a.bub, on = sleeping || t < a.bubUntil;",
    // the tag says when the limit resets, in the page's language and clock
    'const d = new Date(ts), sameDay = d.toDateString() === new Date().toDateString();',
    "sameDay ? { hour12: false, hour: '2-digit', minute: '2-digit' } : { hour12: false, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }",
    "chip = T('stat.sleepUntil', { t: fmtClock(a.sleepUntil) }) || S[0];",
    // when the limit has passed, the agent gets up and the live refresh puts it back at its desk
    "if (a.state === 'sleep' && a.sleepUntil && Date.now() > a.sleepUntil) { a.state = 'idle'; a.sleepUntil = 0; woke = true; }",
    'if (woke && live) liveRefresh();',
    // meeting mode never drags a sleeper out of bed; sleep has its own chip colour
    "const key = meeting && a.state !== 'ask' && a.state !== 'sleep' ? 'meet' : a.state, S = st(key);",
    "sleep: ['stat.sleep', '#818cf8']",
  ]) assert.ok(src.includes(s), `missing rest-room behavior: ${s}`);
  assert.ok(!/sleep: \['stat\.error'/.test(src), 'sleep must not reuse the error label');
  assert.ok(src.indexOf("else if (s.status === 'busy') state = 'working';") < src.indexOf("else if (until > Date.now()) state = 'sleep';"), 'a busy session is never put to bed by a stale limit flag');
  for (const k of ['office.stat.sleep', 'office.stat.sleepUntil', 'office.sleep.bubble']) {
    assert.ok(vi[k], `vi missing ${k}`);
    assert.ok(en[k], `en missing ${k}`);
  }
  assert.ok(vi['office.stat.sleepUntil'].includes('{t}') && en['office.stat.sleepUntil'].includes('{t}'), 'the tag carries the wake time');
  assert.ok(vi['office.stat.sleepUntil'].length > vi['office.stat.sleep'].length, 'the tag adds the wake time to the state label');
});

/* ---------- Office #185: a roster row tags that agent in the composer ---------- */

test('Office #185: clicking a name in the dock roster inserts @handle into the chat input instead of opening the panel', async () => {
  const src = await readOffice();
  for (const s of [
    "const token = '@' + h;",
    'inp.value.split(/\\s+/).includes(token)',
    "if (!inp.value.split(/\\s+/).includes(token)) inp.value = inp.value + (inp.value && !/\\s$/.test(inp.value) ? ' ' : '') + token + ' ';",
    'data-h="${esc(a.h)}"',
    'b.onclick = () => tagAgent(b.dataset.h);',
    'inp.focus();',
    "try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch (e) { /* older webviews */ }",
  ]) assert.ok(src.includes(s), `missing roster tag behavior: ${s}`);
  assert.ok(!src.includes('b.onclick = () => { setRoster(false); setFocus(b.dataset.id); };'), 'a roster click no longer opens the DM/panel');
  const css = await readFile(new URL('../ui/office.css', import.meta.url), 'utf8');
  assert.ok(/\.office \.roster button\{[^}]*cursor:pointer/.test(css), 'roster rows keep a pointer cursor');
});

/* ---------- Office #186: cross-day wake time, HUD splits sleepers ---------- */

test('Office #186: a cross-day wake time shows dd/MM, HUD counts sleepers apart from free agents', async () => {
  const src = await readOffice();
  const { vi } = await import('../shared/i18n/vi.ts');
  const { en } = await import('../shared/i18n/en.ts');
  for (const s of [
    // a limit that resets on another day: the chip would otherwise look like today
    'const d = new Date(ts), sameDay = d.toDateString() === new Date().toDateString();',
    "sameDay ? { hour12: false, hour: '2-digit', minute: '2-digit' } : { hour12: false, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }",
    // HUD: sleeping is its own count, and the pills read working / ask / sleep / free
    '<span class="pill"><i style="background:#818cf8"></i><span data-of="pill.sleep"></span> <b id="of-nSleep">0</b></span>',
    "else if (a.state === 'sleep') c.s++;",
    "$('of-nSleep').textContent = c.s; $('of-nNap').textContent = c.z;",
  ]) assert.ok(src.includes(s), `missing rest-room audit fix: ${s}`);
  assert.ok(src.indexOf('data-of="pill.sleep"') < src.indexOf('data-of="pill.idle"'), 'the sleep pill sits before the free pill');
  assert.equal(vi['office.pill.idle'], 'Rảnh', 'the free label no longer collides with "Phòng nghỉ"');
  assert.equal(en['office.pill.idle'], 'Free');
  assert.equal(vi['office.pill.sleep'], 'Ngủ');
  assert.equal(en['office.pill.sleep'], 'Sleep');
});

/* ---------- Office #188: the idle chip uses the same word as the free pill ---------- */

test('Office #188: the idle chip reads "Đang rảnh" / "Free", matching the free pill', async () => {
  const src = await readOffice();
  const { vi } = await import('../shared/i18n/vi.ts');
  const { en } = await import('../shared/i18n/en.ts');
  assert.ok(src.includes("idle: ['stat.idle', '#94a3b8']"), 'the chip label still comes from the idle state key');
  assert.equal(vi['office.stat.idle'], 'Đang rảnh');
  assert.equal(en['office.stat.idle'], 'Free');
  assert.equal(vi['office.pill.idle'], 'Rảnh', 'chip and pill agree in Vietnamese');
});

test('Office: the last tier rests in the plain lounge, every tier above it in the VIP room', async () => {
  const src = await readOffice();
  for (const s of [
    'const lastTier = () => Math.max(5, ...AG.map((x) => x.tier || 0))',
    "if (a.tier < lastTier()) { const c = VIP_RING[slot.vip % VIP_RING.length]; return { kind: 'vip'",
    "else if (t.kind === 'vip') { pts.push(V(9.5, .8)); pts.push(V(9.5, -3.2)); pts.push(t.pos); }",
    '[12.4, -9.2, 1.35], [14.9, -6.2, 1.35], [17.9, -9.7, 1.35]',
  ]) assert.ok(src.includes(s), s);
});

/* ---------- Office #197: the approved v3 diorama (rest loft, boardroom, obstacles, six species, home camera) ---------- */

test('Office #197: the loft rest room, the walnut boardroom, obstacle push-out, six species and the new home camera', async () => {
  const src = await readOffice();
  for (const s of [
    // (1) the loft replaces the beds on the floor: oak mezzanine, stairs and glass railing.
    'const LOFT = { x0: -23, x1: -14.2, z0: .2, z1: 12, h: 3.7, sx: -20.6, sz: -6.2, n: 15, ais: -18.3 };',
    'const stairIn = (x, z) => x > LOFT.sx - .95 && x < LOFT.sx + .95 && z >= LOFT.sz && z <= LOFT.z0;',
    'const stairY = (z) => LOFT.h * (z - LOFT.sz) / (LOFT.z0 - LOFT.sz);',
    'const BEDS = [2.7, 6.1, 9.5].map((z) => ({ x: -21, z }));',
    'rail(ld - .1, LOFT.x1 - .05, lcz, true); rail(lw, lcx, LOFT.z1 - .05, false);',
    'box(3.4, .04, 5.2, 0x2f6f73, -16.2, H + .08, 7.4, scene, false);',   // reading corner rug
    // an agent walks up the stairs and stays on the mezzanine (`a.up`) until it comes back down
    'if (stairIn(p.x, p.z)) { p.y = stairY(p.z); a.up = p.y > LOFT.h - .15 ? true : p.y < .05 ? false : a.up; } else p.y = a.up ? LOFT.h : 0;',
    'if (p.y > .05) { pts.push(V(LOFT.ais, p.z)); pts.push(V(LOFT.ais, LOFT.z0 + 1));',
    // (2) the boardroom replaces the old partitions and meeting table
    'const phong = (m, c, o) => { m.material = P(c, o); return m; };',
    'const chair = (x, z, bx, bz, c) => {',
    'const backW = box(10, 3.8, .3, 0xffffff, 18.2, 1.9, 3);',
    'box(.3, .9, 7, MWAL, 8, .45, 8.6);',
    'const meetLight = new THREE.PointLight(0xffd9a0, .8, 18);',
    // (3) round furniture is an obstacle, and the lounge has moved right of the loft
    'const OBS = [[-12, 6.5, 1.35], [-9.5, 9.5, 1.35], [-6.5, 6, 1.35], [-1, 5.5, 1.65],',
    'if (moving && !a.up) for (const [ox, oz, or] of OBS)',
    'box(9, .06, 7, 0x8b5fd0, -8.4, .03, 7.5, scene, false);',
    'box(4.4, .9, 1.6, 0x2aa79a, -4.5, .5, 11.6);',
    'const ring = [[-9, 7.5], [-12, 9.4], [-7, 9.6], [-10.8, 3.2], [-4.2, 5], [-9.5, 5.3], [-4.6, 8.3], [-12.2, 8.5], [-8, 11]][slot.lounge % 9];',
    // (4) six cute species, and a nap sits on the floor with the legs splayed
    "const SPECIES = ['bear', 'cat', 'bunny', 'robot', 'sprout', 'blob'];",
    'function makeAgent(hex, kind = 0) {',
    'Object.assign(a, makeAgent(a.c, AG.indexOf(a)));',
    "a.root.position.y = lie ? 1.24 + breathe : sit ? (a.pose === 'nap' ? -.7 : -.04) :",
    "const floorSit = sit && a.pose === 'nap';",
    // (5) the home camera frames the loft
    'const HOME = { p: new THREE.Vector3(-10, 25, 30), t: new THREE.Vector3(-10, 0, 2) },',
    'else { HOME.p.set(-10, 25, 30); HOME.t.set(-10, 0, 2);',
  ]) assert.ok(src.includes(s), `missing v3 diorama: ${s}`);
  assert.ok(!src.includes('window.__AG'), 'the demo-only global stays out of the tab');
  assert.ok(!src.includes('0xa9cf6a'), 'the old green partitions are gone');
  assert.ok(!src.includes('0x6b4226'), 'the old meeting table is gone');
});

/* ---------- Office #211: fixes from the frontend photo audit (label collisions, dock height, phone 390) ---------- */

test('Office #211: close labels stack and stay inside the canvas, the dock is shorter, and the phone camera frames the VIP room', async () => {
  const src = await readOffice();
  for (const s of [
    // labels are placed after the pass, so a tag that collides is moved instead of drawn on top (#215 refines this)
    'const placedTags = [];',
    'function layoutTags(W, H) {',
    'if (free(r)) { spot = r; break; }',
    'top -= h + 4;',
    // and clamped inside the canvas, which is what clipped tags at 390px
    'const clampX = (x, w) => Math.max(w / 2 + 4, Math.min(W - w / 2 - 4, x));',
    'a._vis = v3.z <= 1; a._tx = (v3.x * .5 + .5) * W; a._ty = (-v3.y * .5 + .5) * H;',
    'layoutTags(W, H);',
    // phone camera: VIP room + boardroom, with the floor edge below the frame so no white band shows
    'if (W < 760) { HOME.p.set(15, 30, 26); HOME.t.set(15, 0, -4);',
  ]) assert.ok(src.includes(s), `missing #211 fix: ${s}`);
  assert.ok(!src.includes('HOME.p.set(0, 66, 76)'), 'the old phone camera stopped short of the floor edge and missed the VIP room');
  const css = await readFile(new URL('../ui/office.css', import.meta.url), 'utf8');
  assert.ok(/\.office \.dock\{[^}]*height:min\(32vh,286px\)/.test(css), 'the dock no longer covers the lower half of the loft beds');
  assert.ok(/\.office \.tag \.tool\{[^}]*max-width:min\(240px,60vw\)[^}]*text-overflow:ellipsis/.test(css), 'a long tool line is truncated instead of spilling out on a phone');
  assert.ok(/@media\(max-width:760px\)\{[\s\S]*\.office \.pills\{[^}]*flex-wrap:nowrap[^}]*overflow-x:auto/.test(css), 'the phone pill row scrolls on one line instead of wrapping misaligned');
  assert.ok(css.includes('.office .pills kbd{display:none}'), 'keyboard hints are hidden on a phone');
});

/* ---------- Office #215: labels clear of the title/sign and the dock, kept next to their agent ---------- */

test('Office #215: labels avoid the floating HUD, dock and panel, sit beside their agent, and draw a leader when moved', async () => {
  const src = await readOffice();
  for (const s of [
    // the safe area is measured from the real DOM, so the title/pill row, the dock and an open panel are respected
    'function measureChrome(W, H) {',
    "const top = rect(root.querySelector('.top'));",
    'chrome.push({ l: 0, t: 0, r: W, b: top.b + 6 });',
    "const dock = rect($('of-dock'));",
    "const panel = rect($('of-panel'));",
    'if (chromeDirty || W !== chromeW || H !== chromeH)',
    // the neon sign on the back wall also counts as chrome, so the labels of far agents do not cover it
    'const neonSign = box(8, 2, .2, 0x160b24, -7.5, 5.6, -14.6, scene, false);',
    'neonSign.updateWorldMatrix(true, false);',
    'const solids = sign ? chrome.concat([sign]) : chrome;',
    '...(sign ? [[x0, sign.b + 6]] : []),',
    // an agent standing behind the chrome has no floating label on top of it
    '// the agent itself is behind the HUD/dock/panel',
    '// above the head, then beside it, then under it: a label always stays next to its character (#215)',
    'const spots = [',
    '[x0, y0 - h], [x0 + w / 2 + 12, y0 - h], [x0 - w / 2 - 12, y0 - h],',
    '// leader line (#215): when a collision moved the label sideways or upward, connect it to the agent',
    "a.tg.style.setProperty('--lead', L.toFixed(1) + 'px');",
    "a.tg.style.setProperty('--leadA', (Math.atan2(ax, ay) * 180 / Math.PI).toFixed(1) + 'deg');",
    // the tag is positioned by its top-left corner, so a label below the head needs no second transform mode
    'a.tg.style.transform = `translate(${cx}px,${spot.t}px) translate(-50%,0)`;',
    // a long name is truncated inside a pill instead of widening the whole label
    '<span class="nmt">',
  ]) assert.ok(src.includes(s), `missing #215 label placement: ${s}`);
  assert.ok(!src.includes('translate(-50%,-100%)'), 'labels no longer end exactly on the projected head point');
  const css = await readFile(new URL('../ui/office.css', import.meta.url), 'utf8');
  assert.ok(/\.office \.tag::after\{[^}]*height:var\(--lead,0px\)[^}]*rotate\(var\(--leadA,0deg\)\)/.test(css), 'the leader line is a hairline scaled by the computed distance');
  assert.ok(/\.office \.tag \.nm \.nmt\{[^}]*text-overflow:ellipsis/.test(css), 'the name truncates with an ellipsis instead of pushing the label out');
  assert.ok(/@media\(max-width:760px\)\{[\s\S]*\.office \.tag \.nm\{max-width:min\(72vw,230px\)\}/.test(css), 'a phone caps the name pill width');
  assert.ok(/\.office \.tag \.chip\{max-width:72vw[^}]*text-overflow:ellipsis/.test(css), 'a long state chip is capped on a phone too');
});

test('#252 Flow: a profile agent with no tier starts at the bottom tier, and member DMs draw you↔agent edges', async () => {
  const html = await readFile(new URL('../ui/index.html', import.meta.url), 'utf8');
  for (const s of [
    // (2) the default tier: bottom for a hub-run profile, middle for a tab agent
    "const profiles = new Set((S.settings?.agents?.profiles || []).map((p) => normAgent(p.name)));",
    'const def = profiles.has(normAgent(n.name)) ? tierCount : Math.floor(tierCount / 2) + 1;',
    '|| def));',
    // (4) the DMs of the room's members are loaded, merged as you↔agent edges and redrawn live
    'const flowDms = (r) => S.rooms.filter((x) => x.dm && room(r)?.members?.includes(x.dm));',
    'api(`/api/rooms/${enc(d.name)}/messages?limit=100`)',
    "map((m) => ({ ...m, wake: m.fromId ? ['you'] : [d.dm] }))",
    'messages = [...(S.flowMessages[r] || []), ...dmMsgs]',
    'else if (S.flowRoom && flowDms(S.flowRoom).some((d) => d.name === m.room)) queueFlow();',
  ]) assert.ok(html.includes(s), `missing #252 Flow wiring: ${s}`);
  assert.ok(!html.includes('|| Math.floor(tierCount / 2) + 1));'), 'the tier default ignores profile agents again');
});

test('#259 Flow live view: only current members (kick/add shows at once), stopped profile agents hidden', async () => {
  const html = await readFile(new URL('../ui/index.html', import.meta.url), 'utf8');
  for (const s of [
    'function flowNodes(roomInfo, messages, live = false) {',
    'if (session && off.has(normAgent(session.name))) return;',
    'if (!live) for (const m of messages)',
    'flowNodes(roomInfo, messages, live)',
  ]) assert.ok(html.includes(s), `missing #259 Flow wiring: ${s}`);
});

test('#271 Agent drawer: hides Claude-only blocks (permissions, context/compact, tools, MCP) for duck and muse', async () => {
  const html = await readFile(new URL('../ui/index.html', import.meta.url), 'utf8');
  const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
  const script = scripts[0];
  const paint = script.slice(script.indexOf('function paintAgentSettings()'), script.indexOf('function renderSettingsView()'));

  // isWebChat predicate
  assert.ok(paint.includes("const isWebChat = a.kind === 'duck' || a.kind === 'muse';"), 'isWebChat flag missing in paintAgentSettings');

  // Verify the Claude-only blocks are guarded by isWebChat
  assert.ok(paint.includes("${isWebChat ? '' : `<section class=\"mblk\"><h4>${t('perm.title')}</h4>"), 'permissions block not hidden for webchat');
  assert.ok(paint.includes("${isWebChat ? '' : `<section class=\"mblk\"><h4>${t('agent.mcp')}</h4>"), 'mcp block not hidden for webchat');
  assert.ok(paint.includes("${t('agent.blk.context')}</h4><div data-cagent="), 'context block missing');

  // Basic, Skill, and Activity blocks remain unconditional
  assert.ok(paint.includes("<section class=\"mblk\"><h4>${t('agent.blk.basic')}</h4>"), 'basic block missing');
  assert.ok(paint.includes("<section class=\"mblk\"><h4>${t('members.blk.skill')}</h4>"), 'skill block missing');
  assert.ok(paint.includes("<section class=\"mblk\"><h4>${t('agent.blk.activity')}</h4>"), 'activity block missing');
});

test('#272 Tasks tab: auto-assign tier option in owner select and pool badge on task card', async () => {
  const html = await readFile(new URL('../ui/index.html', import.meta.url), 'utf8');
  for (const s of [
    'roomTiers.map((n) => `<option value="tier:${n}"',
    "t('task.poolOpt', { n })",
    'x.pool ? `<span class="town"',
    "t('task.pool', { n: x.pool })",
    "x.owner || t('task.poolNone')",
  ]) assert.ok(html.includes(s), `missing #272 wiring: ${s}`);
  for (const k of ['task.pool', 'task.poolNone', 'task.poolOpt', 'sys.task.tierEmpty']) {
    assert.ok(k in vi, `vi missing ${k}`);
    assert.ok(k in en, `en missing ${k}`);
  }
});

test('#290 claude-api model picker: options with ctx and price, datalist per provider, warnings', async () => {
  const html = await readFile(new URL('../ui/index.html', import.meta.url), 'utf8');
  for (const k of ['ac.api.modelsLoading', 'ac.api.modelsFailed', 'ac.api.modelUnknown', 'ac.api.priceFree', 'ac.api.priceUnknown']) {
    assert.ok(k in vi, `vi missing ${k}`);
    assert.ok(k in en, `en missing ${k}`);
  }

  // T3 dialog elements and placeholder/warning wiring
  for (const s of [
    'list="agentSpawnModels"',
    'id="agentSpawnModels"',
    'id="agentSpawnModelsMsg"',
    'id="agentSpawnModelWarn"',
    'buildModelListOptions',
    'formatModelOption',
    'loadProviderModels',
  ]) assert.ok(html.includes(s), `missing T3 wiring in ui/index.html: ${s}`);

  // T4 drawer datalist per provider
  assert.ok(html.includes('list="${a.profile?.provider === \'claude-api\' ? \'agentProviderModels\' : \'modelList\'}"'), 'drawer missing agentProviderModels for claude-api');
  assert.ok(html.includes('id="agentProviderModels"'), 'drawer missing datalist agentProviderModels');
  assert.ok(html.includes('id="agentModelWarn"'), 'drawer missing agentModelWarn');

  // Verify formatModelOption and buildModelListOptions logic
  const fnCtx = {
    esc: (s: string) => s,
    t: (k: string, p?: Record<string, string>) => {
      let text = vi[k as keyof typeof vi] || k;
      if (p) for (const [key, val] of Object.entries(p)) text = text.replace(`{${key}}`, val);
      return text;
    },
  };
  const code = html.slice(html.indexOf('function formatModelOption(m)'), html.indexOf('async function loadProviderModels'));
  const runner = new Function('esc', 't', `
    ${code}
    return { formatModelOption, buildModelListOptions };
  `)(fnCtx.esc, fnCtx.t);

  const opt1 = runner.formatModelOption({
    id: 'deepseek-flash',
    ctx: 128000,
    inPerM: 0.3,
    outPerM: 1.2,
    priceSrc: 'table',
    source: 'api-docs.deepseek.com',
    asOf: '2026-10-21',
  });
  assert.ok(opt1.includes('value="deepseek-flash"'));
  assert.ok(opt1.includes('128k'));
  assert.ok(opt1.includes('$0.30/$1.20'));
  assert.ok(opt1.includes('title="2026-10-21 api-docs.deepseek.com"'));

  const optFree = runner.formatModelOption({
    id: 'free-chat',
    ctx: 64000,
    inPerM: 0,
    outPerM: 0,
    priceSrc: 'live',
  });
  assert.ok(optFree.includes('free-chat · 64k · free'));

  const optNone = runner.formatModelOption({
    id: 'ollama-llama',
    priceSrc: 'none',
  });
  assert.ok(optNone.includes('ollama-llama · giá ?'));

  // buildModelListOptions puts configured models first, then live models, deduplicated
  const opts = runner.buildModelListOptions(
    ['model-b', 'model-a'],
    [
      { id: 'model-a', ctx: 32000, inPerM: 1, outPerM: 2, priceSrc: 'live' },
      { id: 'model-c', ctx: 64000, inPerM: 0.5, outPerM: 1, priceSrc: 'live' },
    ]
  );
  const valMatches = [...opts.matchAll(/value="([^"]+)"/g)].map((m: any) => m[1]);
  assert.deepEqual(valMatches, ['model-b', 'model-a', 'model-c']);
});
