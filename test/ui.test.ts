import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { makeHub } from './helpers.ts';

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
    assert.ok(html.indexOf("const TGROUPS = ['unassigned', 'assigned', 'doing', 'blocked', 'done']") < html.indexOf('TGROUPS.map(sec)'), 'status groups are ordered from open work to completed');
    const { vi, en } = await Promise.all([import('../shared/i18n/vi.ts'), import('../shared/i18n/en.ts')]).then(([a, b]) => ({ vi: a.vi, en: b.en }));
    // #149: a todo with an owner was handed out (agent may have forgotten to claim) — shown as "Đã giao", not lumped with unowned work.
    assert.ok(html.includes("const tgroup = (x) => x.status === 'todo' ? (x.owner ? 'assigned' : 'unassigned') : x.status;"));
    assert.equal(vi['task.col.unassigned'], 'Chưa giao'); assert.equal(vi['task.col.assigned'], 'Đã giao'); assert.equal(vi['task.blocked'], 'Bị chặn');
    for (const k of ['task.col.unassigned', 'task.col.assigned']) assert.ok(en[k], `en missing ${k}`);
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

test('T36: new-agent form — folder picker button, review step shows account/permission/folder before running', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of [
      'id="cwdBrowse"', "t('ac.agent.browse')",
      "api('/api/browse-folder'",
      't(\'ac.agent.reviewTitle\')', "t('ac.agent.reviewAccount'", "t('ac.agent.reviewPerm'", "t('ac.agent.reviewFolder'",
      'S.agentAsk = { body }',
      'createAgent(ask.needConfirm ? { ...ask.body, confirm: true } : ask.body)',
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
      'selectedRoomInfo?.cwd',
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
    for (const t of ['rooms', 'workers', 'tokens', 'flow', 'office', 'skills', 'settings']) {
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
      'prefers-reduced-motion'
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

test('settings tab: worker switches, auto jobs, per-agent skill rules, providers (keys write-only), accounts frame', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of ['function renderSettingsView', 'type="password"', 'key: null', "t('compact.note')", "data-set=\"agentComms\"", "t('settings.agentComms.hint')", "force: 'mode.force'", "ban: 'mode.ban'", 'agentSkills', "'/api/skills'", "'/api/settings'", "method || (body ? 'POST' : 'GET')"]) assert.ok(html.includes(s), `missing ${s}`);
    assert.ok(html.includes("(wildcard ? ['auto', 'ban'] : ['force', 'auto', 'ban'])"), 'a whole plugin can never be forced');
  } finally { await hub.close(); }
});

test('Copilot profile settings: list, add, enable/disable, remove, and separate runtime from auth status', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of [
      "const profiles = st.agents?.profiles || []",
      'id="copilotProfileNew"',
      'name="model"',
      'data-profile-model="${esc(p.id)}"',
      'data-profile-model-save="${esc(p.id)}"',
      "ac.profile.modelInvalid",
      "t('ac.profile.modelCurrent', { model: p.model || t('ac.profile.modelDefault') })",
      'data-profile-enabled="${esc(p.id)}"',
      'data-profile-remove="${esc(p.id)}"',
      "saveCopilotProfiles([...profiles, { id, provider: 'copilot', name, cwd",
      "api('/api/settings', { agents: { profiles } }, 'PUT')",
      "api('/api/agent-profiles')",
      "status?.auth === 'ok'",
      "status?.auth === 'no'",
      "data-profile-confirm=",
      "api(profileRoute(id), { on, confirm: true })",
      "t('ac.profile.runtime')",
      "'ac.profile.login'",
      'id="apiProfileNew"',
      "provider: 'claude-api', name, cwd, providerId",
      "m.kind === 'mirror' ? ' mirror'",
      "t('msg.fromTab')",
      'data-profile-retry="${esc(p.id)}"',
      "api(`${profileRoute(profileRetry.dataset.profileRetry)}/retry`, {})",
    ]) assert.ok(html.includes(s), `missing ${s}`);
  } finally { await hub.close(); }
});

test('main screen agent spawn dialog offers folder, API, and Copilot agents with profile validation errors', async () => {
  const { hub } = await makeHub();
  try {
    const html = await (await fetch(hub.url + '/')).text();
    for (const s of [
      'id="agentNewBtn"',
      'function openAgentDialog()',
      'data-agent-kind="folder"',
      'data-agent-kind="api"',
      'data-agent-kind="copilot"',
      "createAgent({ name: get('name'), cwd: get('cwd'), room: get('room')",
      "provider: 'claude-api', name, cwd, providerId",
      "api(`${endpoint}${enc(profile.id)}`, { on: true, confirm: true })",
      'function agentKindBadge(s)',
      'e.message',
    ]) assert.ok(html.includes(s), `missing ${s}`);
  } finally { await hub.close(); }
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
    for (const s of ['data-sub="${k}"', "general: 'sub.general'", "lead: 'sub.lead'", "account: 'sub.account'", "t('members.lead')", "t('members.unlead')"]) assert.ok(html.includes(s), `missing ${s}`);
    assert.ok(html.includes("<div class=\"vw\">${claudeProBlock()}${copilotUsageBlock()}${paidUsageBlock()}<h2>${t('usage.worker')}</h2>${head}"), 'Usage tab: Claude, Copilot and paid providers come before the worker token KPIs');
    for (const x of ["'/api/paid-usage'", 'data-tab="tokens" data-i18n="tab.usage"', 'function copilotUsageBlock', 'function paidUsageBlock']) assert.ok(html.includes(x), `Usage tab: missing ${x}`);
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
