/* Bear Agent Office — ported from the approved demo docs/design/office3d-demo.html (#145).
 *
 * mountOffice(el, api)  draws the diorama inside `el` and returns { root, unmount }.
 * unmountOffice()       tears the current diorama down (safe to call when nothing is mounted).
 *
 * The scene, characters, camera, HUD, panel and simulation are copied from the demo; what changed is only the plumbing:
 * every id is prefixed with `of-` and every lookup is scoped to the mounted root, so the tab can live inside
 * ui/index.html without touching the hub's own DOM or its global key handling.
 *
 * api (all optional — without it the demo's mock office runs, which is what "identical to the demo" means):
 *   agents   [{ id, handle, name, role, tier, color }]  replace the mock roster (handle = the @name used in chat)
 *   messages [{ from, to, text }]                        seed the room chat
 *   onSend   (text, to: string[]) => void                called when the user sends a message (mock mode only)
 *   mock     false                                       keep the simulation out of a real room (no auto answers)
 *   room     'bear-agent-manager'                        live mode: read a real room from the hub instead of the mock office
 *   base     location.origin                             hub base URL (default: the page's origin)
 *   token    '<hub token>'                               x-room-token for the API; the token the page already has
 *   fetchJson(path, init?) => Promise<any>               optional: the page's own authenticated fetch helper
 *   events   (cb) => unsubscribe                         optional: the page's own SSE subscriber;
 *                                                       default EventSource('/api/events?token=…')
 *   t        (key, params?) => string                    optional: the page's own t(); without it the module reads GET /api/i18n once at mount
 *   lang     'vi' | 'en'                                 optional: language before the dictionary arrives (default: navigator.language)
 *
 * Expects window.THREE and THREE.OrbitControls (r128 UMD, vendored under ui/vendor/). Without WebGL, or without those
 * two files, the HUD and chat still render and an explanation replaces the scene — never a blank tab.
 * The render loop stops while the tab is hidden (document.hidden or the tab pane is display:none) and honours
 * prefers-reduced-motion, exactly like the demo.
 */
(function () {
  'use strict';

  // Every office label is a key of shared/i18n (office.*). The page may inject its t(); without it this module
  // reads GET /api/i18n once at mount, so the markup below never carries a language of its own.
  const ST = { working: ['stat.working', '#f5a524'], ask: ['stat.ask', '#ef4444'], done: ['stat.done', '#34d399'], idle: ['stat.idle', '#94a3b8'], error: ['stat.error', '#fb923c'], meet: ['stat.meet', '#60a5fa'], sleep: ['stat.sleep', '#818cf8'] };
  const TOOLS = ['Edit ui/index.html', 'Read hub/server.ts', 'Bash npm test', 'Grep "flowTiers"', 'Write test/ui.test.ts', 'Playwright screenshot'];
  // The demo roster is fixture data too: names, roles and the simulated chat come from the dictionary.
  const mockAgents = (T) => [
    { id: 'lead', h: 'dieu-phoi', n: T('mock.lead'), r: T('mock.lead.role'), tier: 2, c: '#7c6cf6' },
    { id: 'ui', h: 'giao-dien', n: T('mock.ui'), r: T('mock.ui.role'), tier: 3, c: '#2fb4ee' },
    { id: 'core', h: 'loi-hub', n: T('mock.core'), r: T('mock.core.role'), tier: 3, c: '#7bbf1e' },
    { id: 'res', h: 'nghien-cuu', n: T('mock.res'), r: T('mock.res.role'), tier: 3, c: '#f0a020' },
    { id: 'qa', h: 'kiem-thu', n: T('mock.qa'), r: T('mock.qa.role'), tier: 3, c: '#18b3a3' },
    { id: 'w1', h: 'tho-a', n: T('mock.w1'), r: T('mock.code.role'), tier: 4, c: '#4f8ff7' },
    { id: 'w2', h: 'tho-b', n: T('mock.w2'), r: T('mock.code.role'), tier: 4, c: '#b36cf0' },
    { id: 'w3', h: 'tho-doc', n: T('mock.w3'), r: T('mock.w3.role'), tier: 5, c: '#f27a3a' },
    { id: 'w4', h: 'tho-don', n: T('mock.w4'), r: T('mock.w4.role'), tier: 5, c: '#26c2de' },
  ];
  // data-of keys are filled by applyI18n(), so a dictionary that arrives a moment later can still paint the chrome.
  const TEMPLATE = `
<div class="stars" aria-hidden="true"></div>
<div id="of-stage"></div>
<div id="of-tags" aria-hidden="true"></div>
<div class="top">
  <div><h1>Bear Agent Office</h1><p class="sub" data-of="sub"></p></div>
  <div class="pills">
    <span class="pill"><i style="background:#f5a524"></i><span data-of="pill.working"></span> <b id="of-nWork">0</b></span>
    <span class="pill"><i style="background:#ef4444"></i><span data-of="pill.ask"></span> <b id="of-nNeed">0</b></span>
    <span class="pill"><i style="background:#818cf8"></i><span data-of="pill.sleep"></span> <b id="of-nSleep">0</b></span>
    <span class="pill"><i style="background:#94a3b8"></i><span data-of="pill.idle"></span> <b id="of-nNap">0</b></span>
    <button id="of-bMeet" aria-pressed="false"><span data-of="meet"></span><kbd>M</kbd></button>
    <button id="of-bWalk" aria-pressed="false"><span data-of="walk"></span><kbd>F</kbd></button><button id="of-bOver"><span data-of="overview"></span><kbd>O</kbd></button>
    <button id="of-bTheme" data-of="themeAuto"></button>
  </div>
</div>
<section class="dock" id="of-dock">
  <header><b>#<span id="of-roomName" data-of="roomMock"></span></b><button id="of-bMem" aria-expanded="false" aria-controls="of-roster" style="padding:0 9px"><span id="of-mem"></span> ▾</button><button id="of-bDock" style="padding:0 9px">▾</button></header>
  <div class="roster" id="of-roster" hidden></div>
  <div class="msgs" id="of-msgs" aria-live="polite"></div>
  <form class="compose" id="of-form" autocomplete="off"><div class="sugg" id="of-sugg" hidden></div><input id="of-inp"><button type="submit" style="background:var(--hi);color:var(--onhi);border-color:var(--hi)" data-of="send"></button></form>
</section>
<aside class="panel" id="of-panel" hidden></aside>
<div class="toast" id="of-toast" hidden role="status"></div>
<div class="hint" data-of="hint"></div>
<div id="of-fallback"></div>`;

  let active = null;

  function mountOffice(el, api) {
    if (!el || !el.appendChild) throw new Error('mountOffice(el, api): el must be an element');
    unmountOffice();
    api = api || {};

    /* ---------- i18n (#148) ---------- */
    const langOf = (s) => (s === 'vi' || s === 'en' ? s : (/^vi\b/i.test(String((typeof navigator !== 'undefined' && navigator.language) || '')) ? 'vi' : 'en'));
    const I18N = { lang: langOf(api.lang), dicts: null };
    const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (m, k) => (vars && k in vars ? String(vars[k]) : m));
    /** An office.* key: the page's own t() wins, then GET /api/i18n, then empty (nothing is hard-coded here). */
    const T = (key, vars) => {
      const k = 'office.' + key;
      let s = typeof api.t === 'function' ? api.t(k, vars || {}) || '' : '';
      if (!s && I18N.dicts) s = (I18N.dicts[I18N.lang] || {})[k] ?? (I18N.dicts.vi || {})[k] ?? '';
      return s ? fill(s, vars) : '';
    };
    const list = (key) => T(key).split('|').map((x) => x.trim()).filter(Boolean);
    const st = (key) => [T(ST[key][0]), ST[key][1]];
    const locale = () => (I18N.lang === 'en' ? 'en-GB' : 'vi-VN');

    const root = document.createElement('div');
    root.className = 'office';
    root.innerHTML = TEMPLATE;
    el.appendChild(root);

    const $ = (id) => root.querySelector('#' + id);
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    /** Paints the static chrome; also runs again when the dictionary arrives after the first paint. */
    function applyI18n() {
      root.querySelectorAll('[data-of]').forEach((node) => { const v = T(node.getAttribute('data-of')); if (v) node.textContent = v; });
      const attr = (sel, name, key) => { const v = T(key), node = root.querySelector(sel); if (v && node) node.setAttribute(name, v); };
      attr('#of-dock', 'aria-label', 'dockAria');
      attr('#of-bDock', 'aria-label', 'dockToggle');
      attr('#of-bTheme', 'aria-label', 'themeAria');
      attr('#of-panel', 'aria-label', 'panelAria');
      const inp = $('of-inp'), ph = T('composePh'), aria = T('composeAria');
      if (ph) inp.placeholder = ph;
      if (aria) inp.setAttribute('aria-label', aria);
      const th = T(['themeAuto', 'themeLight', 'themeDark'][Number(root.dataset.themeI) || 0]);
      if (th) $('of-bTheme').textContent = th;
      const fb = $('of-fallback'), fv = T('webglFallback');   // a specific "three.js missing" line set later wins
      if (fb && !fb.textContent && fv) fb.textContent = fv;
    }
    applyI18n();
    const loadI18n = () => {
      if (I18N.dicts || typeof api.t === 'function' || typeof fetch !== 'function') return;
      const base = String(api.base ?? location.origin).replace(/\/+$/, '');
      // Same retry rhythm as the page: the hub may still be starting when the tab is opened.
      const again = () => { if (!I18N.dicts && root.isConnected) setTimeout(loadI18n, 3000); };
      fetch(base + '/api/i18n', { headers: api.token ? { 'x-room-token': String(api.token) } : {} })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (!d || !d.dicts) { again(); return; }
          I18N.dicts = d.dicts; I18N.lang = langOf(d.setting);
          const p = $('of-panel'); if (p) p.dataset.id = '';   // rebuild the open panel so its labels use the dictionary
          applyI18n(); hud(); paintDock(); paintPanel();
        })
        .catch(again);
    };
    const pick = (a) => (a.length ? a[Math.floor(Math.random() * a.length)] : '');
    const t0 = performance.now() / 1000, now = () => performance.now() / 1000 - t0;
    const fmtT = (s) => { const d = new Date(Date.now() - (now() - s) * 1000); return d.toLocaleTimeString(locale(), { hour12: false }); };
    /** Wake time; a limit that resets on another day also shows dd/MM, so "13:00" is not read as today (#186). */
    const fmtClock = (ts) => {
      const d = new Date(ts), sameDay = d.toDateString() === new Date().toDateString();
      return d.toLocaleString(locale(), sameDay ? { hour12: false, hour: '2-digit', minute: '2-digit' } : { hour12: false, day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
    };

    /* ---------- live hub mode (#147) ---------- */
    const live = typeof api.room === 'string' && api.room.trim() ? {
      room: api.room.trim().replace(/^#/, ''),
      base: String(api.base ?? location.origin).replace(/\/+$/, ''),
      token: String(api.token ?? ''),
      fetchJson: typeof api.fetchJson === 'function' ? api.fetchJson : null,
      events: typeof api.events === 'function' ? api.events : null,
    } : null;
    const seen = new Set();          // server message ids already shown
    const asks = new Map();          // session id -> open permission request
    const doneAt = new Map();        // agent name -> when its last "done" message arrived
    const dmOf = new Map();          // session id -> private room name
    let idByName = {}, stopLive = () => {}, liveRefresh = () => {};
    // Default (no renderer): keep the roster in step without meshes; the scene replaces this with one that builds them.
    let applyAgents = (list) => {
      const ids = new Set(list.map((x) => x.id));
      for (const a of [...AG]) if (!ids.has(a.id)) { const i = AG.indexOf(a); if (i >= 0) AG.splice(i, 1); delete by[a.id]; }
      for (const x of list) {
        const a = by[x.id];
        if (a) Object.assign(a, x);
        else { const na = { ...x, bub: '', bubUntil: 0, tool: '', askedAt: 0, log: [], tkey: '', path: [], pose: 'stand', cache: {} }; AG.push(na); by[na.id] = na; }
      }
      hud();
    };

    /* ---------- agents ---------- */
    const initialAgents = Array.isArray(api.agents) && api.agents.length ? api.agents : (live ? [] : mockAgents(T));
    const AG = initialAgents.map((a, i) => ({
      id: String(a.id ?? 'a' + i), h: String(a.handle ?? a.h ?? a.id ?? 'a' + i), n: String(a.name ?? a.n ?? a.id ?? 'a' + i),
      r: String(a.role ?? a.r ?? ''), tier: Number(a.tier) || 3, c: String(a.color ?? a.c ?? '#7c6cf6'),
    }));
    const by = Object.fromEntries(AG.map((a) => [a.id, a]));
    AG.forEach((a, i) => { Object.assign(a, { state: 'idle', until: 0, bub: '', bubUntil: 0, tool: '', askedAt: 0, log: [], ctx: 12 + (i * 7) % 50, done: 0, tkey: '', path: [], pose: 'stand', face: 0 }); });
    const simulated = api.mock !== false && !live;

    /* ---------- chat store ---------- */
    const CHAT = []; let chatId = 0, paused = false, meeting = false, focus = null;
    function post(from, to, text, extra = {}) { const m = Object.assign({ id: ++chatId, t: now(), from, to, text }, extra); CHAT.push(m); if (CHAT.length > 300) CHAT.shift(); chatDirty = true; return m; }
    let chatDirty = true;
    function alog(a, txt) { a.log.unshift({ t: now(), txt }); a.log.length = 40; panelDirty = true; }
    let panelDirty = true;

    /* ---------- simulation ---------- */
    function startWork(a, from) {
      a.state = 'working'; a.until = now() + 9 + Math.random() * 9; a.tool = pick(TOOLS); const txt = pick(list('sim.work')); a.bub = txt; a.bubUntil = now() + 3.5;
      const src = from || (a.tier > 3 ? pick(AG.filter((x) => x.tier === 3)) : by.lead) || a;
      post(src.id, [a.id], txt); alog(a, T('log.tookTask', { t: txt }));
    }
    function finish(a) {
      const r = Math.random();
      if (r < .2) { a.state = 'ask'; a.askedAt = now(); a.until = now() + 60; const txt = pick(list('sim.ask')); a.bub = txt; a.bubUntil = now() + 4; post(a.id, ['you'], txt, { ask: a.id }); alog(a, T('log.askedYou', { t: txt })); toast(a, T('toast.waiting', { name: a.n })); }
      else if (r < .28) { a.state = 'error'; a.until = now() + 6; a.bub = T('sim.redTest'); a.bubUntil = now() + 3.5; post(a.id, ['lead'], T('sim.redTest')); alog(a, T('log.error')); }
      else { a.state = 'done'; a.until = now() + 5; const txt = pick(list('sim.done')); a.bub = txt; a.bubUntil = now() + 3.5; post(a.id, ['lead'], txt); alog(a, txt); a.ctx = Math.min(96, a.ctx + 6); }
    }
    function step() {
      if (paused || !simulated) return; const t = now();
      const busy = AG.filter((a) => a.state === 'working' || a.state === 'error').length;
      AG.forEach((a) => {
        if (a.state === 'working') { if (t > a.until) finish(a); else if (Math.random() < .2) { a.tool = pick(TOOLS); } }
        else if (a.state === 'error' && t > a.until) startWork(a);
        else if (a.state === 'done' && t > a.until) { a.state = 'idle'; a.until = t + 4 + Math.random() * 8; }
        else if (a.state === 'ask' && t > a.until) { a.state = 'idle'; a.until = t + 3; post('sys', [], T('msg.unanswered', { name: a.n })); }
      });
      const idle = AG.filter((a) => a.state === 'idle' && t > a.until);
      if (busy < 5 && idle.length && Math.random() < .55) startWork(pick(idle));
      if (Math.random() < .18) { const x = pick(AG), others = AG.filter((z) => z !== x); if (!others.length) return; const y = pick(others); const tx = pick(list('sim.chat')); x.bub = tx; x.bubUntil = now() + 3; post(x.id, [y.id], tx); }
    }
    // start with a lively office — mock only: real agents must not be given invented states
    if (simulated) {
      [['ui', 'working'], ['core', 'working'], ['res', 'working'], ['w1', 'working'], ['qa', 'ask'], ['w3', 'done']].forEach(([id, s], i) => {
        const a = by[id]; if (!a) return;
        if (s === 'working') startWork(a);
        else if (s === 'ask') { a.state = 'ask'; a.askedAt = now() - i; a.until = now() + 60; a.bub = list('sim.ask')[0] || ''; a.bubUntil = now() + 4; post(a.id, ['you'], a.bub, { ask: a.id }); }
        else { a.state = 'done'; a.until = now() + 5; }
      });
      AG.filter((a) => a.state === 'idle').forEach((a) => { a.until = now() + 3 + Math.random() * 10; });
    }
    if (Array.isArray(api.messages)) for (const m of api.messages) post(String(m.from ?? 'sys'), Array.isArray(m.to) ? m.to : [], String(m.text ?? ''), m.ask ? { ask: String(m.ask) } : {});

    /* ---------- chat UI ---------- */
    const mentionize = (txt) => esc(txt).replace(/@([a-z0-9-]+)/g, (m, h) => `<u>@${h}</u>`);
    const nameOf = (id) => id === 'you' ? T('you') : id === 'sys' ? T('sys') : by[id] ? by[id].n : id;
    const colOf = (id) => id === 'you' ? 'var(--hi)' : by[id] ? by[id].c : '#999';
    function msgHtml(m) {
      const to = m.to && m.to.length ? m.to.map((i) => '@' + (i === 'you' ? T('youLower') : (by[i] ? by[i].h : i))).join(' ') : '';
      const body = (to ? `<u>${esc(to)}</u> ` : '') + mentionize(m.text);
      const opts = live
        ? `<button data-ans="${m.ask}" data-r="allow">${esc(T('perm.allow'))}</button><button data-ans="${m.ask}" data-r="deny">${esc(T('perm.deny'))}</button>`
        : `<button data-ans="${m.ask}" data-r="${esc(T('perm.keep'))}">${esc(T('perm.keep'))}</button><button data-ans="${m.ask}" data-r="${esc(T('perm.other'))}">${esc(T('perm.other'))}</button>`;
      const ans = m.ask && by[m.ask] && by[m.ask].state === 'ask' ? `<div class="opts">${opts}</div>` : '';
      return `<div class="m ${m.from === 'you' ? 'you' : ''} ${m.ask ? 'ask' : ''}"><div class="h"><i style="background:${colOf(m.from)}"></i><b>${esc(nameOf(m.from))}</b> ${fmtT(m.t)}</div><div class="t">${body}${ans}</div></div>`;
    }
    function paintMsgs(el, list, emptyTxt) {
      const stick = el.scrollTop + el.clientHeight >= el.scrollHeight - 30;
      el.innerHTML = list.slice(-60).map(msgHtml).join('') || `<div class="empty">${emptyTxt}</div>`;
      if (stick) el.scrollTop = el.scrollHeight;
    }
    const paintDock = () => paintMsgs($('of-msgs'), CHAT.filter((m) => !m.dm), live ? T('empty.liveRoom') : T('empty.room'));
    function answer(id, r) {
      if (live) return liveAnswer(id, r);   // the ask map, not the drawn state, decides
      const a = by[id]; if (!a || a.state !== 'ask') return;
      post('you', [id], r); alog(a, T('log.yourAnswer', { r })); a.state = 'working'; a.until = now() + 8; a.tool = pick(TOOLS); a.bub = T('log.got', { r }); a.bubUntil = now() + 3; chatDirty = panelDirty = true;
    }
    root.addEventListener('click', (e) => { const b = e.target.closest('[data-ans]'); if (b) { answer(b.dataset.ans, b.dataset.r); } });

    // composer with @ suggestions (shared by the room and the agent panel)
    function mountComposer(form, inp, sugg, scopeId) {
      let items = [], idx = 0;
      const close = () => { sugg.hidden = true; items = []; };
      inp.addEventListener('input', () => {
        const m = /@([a-z0-9-]*)$/.exec(inp.value.slice(0, inp.selectionStart));
        if (!m) { close(); return; }
        items = [{ h: 'all', n: T('mention.all'), c: '#999' }].concat(AG).filter((a) => a.h.startsWith(m[1]) || (a.n || '').toLowerCase().startsWith(m[1])); idx = 0;
        if (!items.length) { close(); return; }
        sugg.innerHTML = items.map((a, i) => `<button type="button" data-i="${i}" aria-selected="${i === 0}"><i style="background:${a.c}"></i>@${esc(a.h)} <span class="empty">${esc(a.n)}</span></button>`).join(''); sugg.hidden = false;
      });
      const choose = (i) => { const a = items[i]; if (!a) return; const pos = inp.selectionStart, pre = inp.value.slice(0, pos).replace(/@[a-z0-9-]*$/, '@' + a.h + ' '); inp.value = pre + inp.value.slice(pos); close(); inp.focus(); };
      sugg.addEventListener('mousedown', (e) => { const b = e.target.closest('[data-i]'); if (b) { e.preventDefault(); choose(+b.dataset.i); } });
      inp.addEventListener('keydown', (e) => {
        if (sugg.hidden) return;
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); idx = (idx + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length; [...sugg.children].forEach((c, i) => c.setAttribute('aria-selected', i === idx)); }
        else if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); choose(idx); } else if (e.key === 'Escape') { e.stopPropagation(); close(); }
      });
      form.addEventListener('submit', (e) => { e.preventDefault(); const txt = inp.value.trim(); if (!txt) return; inp.value = ''; close(); send(txt, scopeId && scopeId()); });
    }
    function send(txt, scope) {
      if (live) return liveSend(txt, scope);
      const hs = [...txt.matchAll(/@([a-z0-9-]+)/g)].map((m) => m[1]); let to = [];
      if (hs.includes('all')) to = AG.map((a) => a.id); else hs.forEach((h) => { const a = AG.find((x) => x.h === h); if (a) to.push(a.id); });
      if (scope && !to.includes(scope)) to.push(scope);
      const clean = txt.replace(/@[a-z0-9-]+\s*/g, '').trim() || txt;
      post('you', to, clean);
      if (typeof api.onSend === 'function') { try { api.onSend(clean, to.slice()); } catch (e) { console.error('[office] onSend failed', e); } }
      if (!simulated) return;
      if (!to.length) { post('sys', [], T('msg.needMention')); return; }
      to.forEach((id, k) => setTimeout(() => {
        if (!active || active.root !== root) return;
        const a = by[id]; if (!a) return;
        if (a.state === 'idle' || a.state === 'done' || a.state === 'ask') { a.state = 'working'; a.until = now() + 10; a.tool = pick(TOOLS); }
        a.bub = T('msg.ack'); a.bubUntil = now() + 3; alog(a, T('log.youSaid', { t: txt.slice(0, 60) }));
        setTimeout(() => { if (!active || active.root !== root) return; post(id, ['you'], T('msg.gotIt')); }, 1400 + k * 300);
      }, 500 + k * 250));
    }
    mountComposer($('of-form'), $('of-inp'), $('of-sugg'), null);
    $('of-bDock').onclick = () => { $('of-dock').classList.toggle('closed'); };
    /** A roster row tags that agent in the dock composer (#185): insert "@handle " once, then focus the input. */
    function tagAgent(h) {
      const inp = $('of-inp'); if (!inp || !h) return;
      const token = '@' + h;
      if (!inp.value.split(/\s+/).includes(token)) inp.value = inp.value + (inp.value && !/\s$/.test(inp.value) ? ' ' : '') + token + ' ';
      setRoster(false);
      inp.focus();
      try { inp.setSelectionRange(inp.value.length, inp.value.length); } catch (e) { /* older webviews */ }
    }
    function paintRoster() {
      const r = $('of-roster'); if (r.hidden) return;
      const html = AG.map((a) => { const S = st(meeting && a.state !== 'ask' ? 'meet' : a.state); return `<button data-id="${esc(a.id)}" data-h="${esc(a.h)}"><i style="background:${S[1]}"></i><b>${esc(a.n)}</b><span>${esc(a.r)}</span><em>${esc(S[0])}</em></button>`; }).join('');
      if (r.dataset.sig === html) return; r.dataset.sig = html; r.innerHTML = html;
      r.querySelectorAll('button').forEach((b) => { b.onclick = () => tagAgent(b.dataset.h); });
    }
    function setRoster(on) { $('of-roster').hidden = !on; $('of-bMem').setAttribute('aria-expanded', on); if (on) { $('of-dock').classList.remove('closed'); $('of-roster').dataset.sig = ''; paintRoster(); } }
    $('of-bMem').onclick = () => setRoster($('of-roster').hidden);

    /* ---------- agent panel ---------- */
    let tab = 'chat';
    function paintPanel() {
      const p = $('of-panel'), a = focus && by[focus];
      if (!a) { p.hidden = true; return; }
      p.hidden = false;
      const S = st(meeting && a.state !== 'ask' && a.state !== 'sleep' ? 'meet' : a.state);
      if (!p.dataset.id || p.dataset.id !== a.id) {
        p.dataset.id = a.id;
        p.innerHTML = `<header><div><div class="kick" id="of-pk"></div><h2>${esc(a.n)}</h2><span class="stchip" id="of-pst"></span></div><button id="of-pclose" aria-label="${esc(T('panel.close'))}">✕</button></header>
    <div class="tabs" role="tablist"><button class="tab" role="tab" data-tab="chat">${esc(T('panel.tabChat'))}</button><button class="tab" role="tab" data-tab="act">${esc(T('panel.tabAct'))}</button><button class="tab" role="tab" data-tab="det">${esc(T('panel.tabDet'))}</button></div><div class="pbody" id="of-pb"></div>`;
        $('of-pclose').onclick = closeFocus;
        p.querySelectorAll('.tab').forEach((b) => { b.onclick = () => { tab = b.dataset.tab; buildBody(); panelDirty = true; }; });
        buildBody();
      }
      $('of-pk').textContent = T('panel.tier', { n: a.tier, r: a.r }); const chip = $('of-pst'); chip.textContent = S[0]; chip.style.background = S[1];
      p.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));
      if (tab === 'chat') { paintMsgs($('of-pm'), CHAT.filter((m) => live ? m.dm === a.id : (m.from === a.id || (m.to || []).includes(a.id))), esc(T('empty.dm', { name: a.n }))); }
      else if (tab === 'act') { $('of-pb').firstChild.innerHTML = (a.state === 'working' && a.tool ? `<div style="border-color:var(--hi)">▶ ${esc(a.tool)}</div>` : '') + a.log.map((l) => `<div>${fmtT(l.t)} ${esc(l.txt)}</div>`).join('') || `<div>${esc(T('empty.act'))}</div>`; }
      else { $('of-pb').firstChild.innerHTML = `<dl><dt>${esc(T('panel.detailTier'))}</dt><dd>${a.tier}</dd><dt>${esc(T('panel.detailRole'))}</dt><dd>${esc(a.r)}</dd><dt>${esc(T('panel.detailHandle'))}</dt><dd>@${esc(a.h)}</dd><dt>${esc(T('panel.detailState'))}</dt><dd>${esc(S[0])}</dd></dl><div><div class="empty">${esc(T('panel.ctx', { n: a.ctx }))}</div><div class="meter"><i style="width:${a.ctx}%"></i></div></div>`; }
    }
    function buildBody() {
      const a = by[focus], pb = $('of-pb');
      if (!a) return;
      if (tab === 'chat') { pb.className = 'pbody'; const ph = esc(T('panel.composePh', { name: a.n })); pb.innerHTML = `<div class="msgs" id="of-pm" aria-live="polite"></div><form class="compose" id="of-pf" autocomplete="off"><div class="sugg" id="of-ps" hidden></div><input id="of-pi" placeholder="${ph}" aria-label="${ph}"><button type="submit" style="background:var(--hi);color:var(--onhi);border-color:var(--hi)">${esc(T('send'))}</button></form>`; mountComposer($('of-pf'), $('of-pi'), $('of-ps'), () => focus); }
      else { pb.className = 'pbody single'; pb.innerHTML = `<div class="${tab === 'act' ? 'act' : 'det'}"></div>`; }
    }

    /* ---------- toast + hud ---------- */
    let toastTimer = 0, toastFor = null;
    function toast(a, txt) { const t = $('of-toast'); t.textContent = '✋ ' + txt; t.hidden = false; toastFor = a.id; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 5000); }
    $('of-toast').onclick = () => { if (toastFor) setFocus(toastFor); $('of-toast').hidden = true; };
    function toastMsg(t) { const e = $('of-toast'); e.textContent = t; e.hidden = false; toastFor = null; clearTimeout(toastTimer); toastTimer = setTimeout(() => { e.hidden = true; }, 3500); }
    /** Sleepers are counted on their own pill: the rest room must not inflate the "free" number (#186). */
    function hud() {
      const c = { w: 0, n: 0, s: 0, z: 0 };
      AG.forEach((a) => {
        if (a.state === 'working' || a.state === 'error') c.w++;
        else if (a.state === 'ask') c.n++;
        else if (a.state === 'sleep') c.s++;
        else c.z++;
      });
      $('of-nWork').textContent = c.w; $('of-nNeed').textContent = c.n; $('of-nSleep').textContent = c.s; $('of-nNap').textContent = c.z;
      $('of-mem').textContent = T('hud.mem', { n: AG.length }) || String(AG.length);
      paintRoster();
    }

    /* ---------- live hub data (#147): real sessions, states, room chat, DM, permission asks ---------- */
    const enc = encodeURIComponent;
    const handleOf = (name) => String(name ?? '').toLowerCase().replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 24) || 'agent';
    const hue = (s) => { let h = 0; for (const c of String(s)) h = (h * 31 + c.charCodeAt(0)) % 360; return h; };
    let dead = false;

    function hubJson(path, init) {
      const opts = init ? { ...init } : {};
      // fetch would send "[object Object]" for a plain body; serialise here so both the page helper and fetch work.
      if (opts.body && typeof opts.body !== 'string') opts.body = JSON.stringify(opts.body);
      if (live.fetchJson) return Promise.resolve().then(() => live.fetchJson(path, opts));
      return fetch(live.base + path, {
        ...opts,
        headers: { 'content-type': 'application/json', ...(live.token ? { 'x-room-token': live.token } : {}), ...(opts.headers) },
      }).then((r) => { if (!r.ok) throw new Error(`${path} ${r.status}`); return r.json(); });
    }

    /** Sessions of the room -> the AG entries the scene draws. State law: a pending permission = ask, busy = working, a plan limit = sleep (rest room until the limit resets), a done notice under 3 min = done, else idle. Busy wins over a stale limit flag: a session that is actually working has not run out. */
    function liveAgents(sessions, tiers, lead) {
      return sessions.filter((s) => Array.isArray(s.rooms) && s.rooms.includes(live.room)).map((s) => {
        const done = doneAt.get(s.name), until = Number(s.limited && s.limited.until) || 0;
        let state = 'idle';
        if (asks.has(s.id)) state = 'ask';
        else if (s.status === 'busy') state = 'working';
        else if (until > Date.now()) state = 'sleep';
        else if (done && Date.now() - done < 180_000) state = 'done';
        return {
          id: s.id, h: handleOf(s.name), n: s.name, r: s.activity || s.ide || 'agent',
          tier: Number(tiers[String(s.name).toLowerCase()]) || (s.id === lead ? 2 : 3),
          c: `hsl(${hue(s.name)},62%,55%)`, s, state, sleepUntil: until > Date.now() ? until : 0, tool: s.activity || '', ctx: Math.min(96, Math.round((Number(s.ctx) || 0) / 2000)),
        };
      });
    }

    /** One hub message -> one line of the dock (or of the agent's private panel when dmId is given). */
    function ingest(m, dmId) {
      if (!m || seen.has(m.id)) return;
      seen.add(m.id);
      // A DM room holds both sides: the agent's own messages carry its id, the person's carry fromId null.
      const from = m.kind === 'system' || m.sys ? 'sys' : m.fromId == null ? 'you' : (by[m.fromId] ? m.fromId : (idByName[String(m.from).toLowerCase()] || dmId || 'sys'));
      const to = (m.mentions || []).map((h) => String(h).toLowerCase()).filter((h) => h !== 'all' && h !== 'you').map((h) => idByName[h]).filter(Boolean);
      const mm = post(from, to, String(m.text ?? ''), dmId ? { dm: dmId } : {});
      mm.t = now() - (Date.now() - Number(m.ts || Date.now())) / 1000;
      if (m.kind === 'done' && m.fromId && by[m.fromId]) { doneAt.set(by[m.fromId].n, Date.now()); by[m.fromId].state = 'done'; }
      if (from !== 'sys' && from !== 'you' && by[from]) {
        const a = by[from];
        // History loaded on the first refresh must not pop a stale bubble or invent a state; the state law above decides.
        if (Date.now() - Number(m.ts || 0) < 90_000) { a.bub = String(m.text ?? '').slice(0, 60); a.bubUntil = now() + 4; }
        alog(a, m.kind === 'system' ? mm.text : T('log.msg', { t: mm.text.slice(0, 60) }));
      }
      chatDirty = panelDirty = true;
    }

    function liveAnswer(id, r) {
      const req = asks.get(id); if (!req) { toastMsg(T('perm.gone')); return; }
      hubJson(`/api/permissions/${enc(req.id)}`, { method: 'POST', body: { allow: r === 'allow' } })
        .then(() => { asks.delete(id); if (by[id]) by[id].state = 'working'; liveRefresh(); })
        .catch((e) => toastMsg(T('perm.fail', { err: e.message })));
    }

    function liveSend(txt, scope) {
      const a = scope && by[scope];
      const sendTo = (room) => hubJson(`/api/rooms/${enc(room)}/messages`, { method: 'POST', body: { text: txt } })
        .then((res) => { if (res && res.message) ingest({ ...res.message, room }, a ? a.id : null); })
        .catch((e) => toastMsg(T('sendFail', { err: e.message })));
      if (!a) return sendTo(live.room);
      const room = dmOf.get(a.id);
      if (room) return sendTo(room);
      return hubJson(`/api/rooms/dm/${enc(a.id)}`, { method: 'POST' })
        .then((r) => { dmOf.set(a.id, r.name); return sendTo(r.name); })
        .catch((e) => toastMsg(T('dmFail', { err: e.message })));
    }

    /** The private chat of one agent: its room and its last messages, loaded when the panel opens. */
    function liveDm(id) {
      if (!by[id]) return;
      const load = (room) => hubJson(`/api/rooms/${enc(room)}/messages?after=0&limit=80`)
        .then((ms) => (ms || []).forEach((m) => ingest(m, id))).catch(() => {});
      const room = dmOf.get(id);
      if (room) return load(room);
      return hubJson(`/api/rooms/dm/${enc(id)}`, { method: 'POST' })
        .then((r) => { dmOf.set(id, r.name); return load(r.name); }).catch(() => {});
    }
    const roomOwner = (room) => { for (const [id, name] of dmOf) if (name === room) return id; return null; };

    let refreshing = false;
    liveRefresh = () => {
      if (dead || refreshing || document.hidden) return;
      refreshing = true;
      Promise.all([
        hubJson('/api/sessions'), hubJson('/api/settings'), hubJson('/api/permissions'),
        hubJson(`/api/rooms/${enc(live.room)}/messages?after=0&limit=120`), hubJson('/api/rooms'),
      ]).then(([sessions, settings, perms, msgs, rooms]) => {
        if (dead) return;
        const info = (rooms || []).find((r) => r.name === live.room) || {};
        const old = new Map(asks); asks.clear();
        (perms || []).forEach((p) => asks.set(p.session, p));
        const tiers = (settings && settings.flowTiers && settings.flowTiers[live.room]) || {};
        const list = liveAgents(sessions || [], tiers, info.lead || null);
        idByName = {};
        for (const x of list) { idByName[x.h.toLowerCase()] = x.id; idByName[String(x.n).toLowerCase()] = x.id; }   // mentions may use either form
        applyAgents(list);
        for (const [id, p] of asks) {
          const before = old.get(id);
          if (before && before.id === p.id) continue;
          const a = by[id]; if (!a) continue;
          post(id, ['you'], T('perm.ask', { tool: p.tool }), { ask: id });   // in the room dock: the person can answer without opening the agent
          a.askedAt = now(); alog(a, T('log.perm', { tool: p.tool }));
        }
        (msgs || []).slice().sort((x, y) => x.ts - y.ts).forEach((m) => ingest(m));
        (rooms || []).forEach((r) => { if (r.dm && by[r.dm]) dmOf.set(r.dm, r.name); });
        hud();
        if (!renderer) { chatDirty = false; panelDirty = false; paintDock(); paintPanel(); }
      }).catch((e) => console.error('[office] refresh failed', e))
        .finally(() => { refreshing = false; });
    };

    function startLive() {
      if (!live) return () => {};
      const title = root.querySelector('.dock header b');
      if (title) title.textContent = '#' + live.room;
      liveRefresh();
      let soon = 0;
      const refreshSoon = () => { clearTimeout(soon); soon = setTimeout(liveRefresh, 400); };
      const timer = setInterval(liveRefresh, 10_000);
      let close = () => {};
      const onMsg = (m) => {
        if (!m || !m.room) return refreshSoon();
        if (m.room === live.room) ingest(m);
        else { const owner = roomOwner(m.room); if (owner) ingest(m, owner); }
      };
      if (live.events) close = live.events((ev) => { if (dead) return; if (ev && ev.type === 'msg') onMsg(ev.data); else refreshSoon(); }) || close;
      else if (typeof EventSource === 'function' && live.token) {   // without a token the stream only retries a 401: keep the 10 s refresh
        const es = new EventSource(`${live.base}/api/events?token=${enc(live.token)}`);
        const add = (type) => es.addEventListener(type, (e) => {
          if (dead) return;
          let d = null; try { d = JSON.parse(e.data); } catch { /* keep null */ }
          if (type === 'msg') onMsg(d); else refreshSoon();
        });
        ['msg', 'session', 'permission', 'permission-done', 'settings', 'room', 'rooms'].forEach(add);
        close = () => es.close();
      }
      return () => { dead = true; clearInterval(timer); clearTimeout(soon); close(); };
    }

    /* ---------- three scene ---------- */
    const THREE = window.THREE;
    const why = !THREE ? T('threeMissing') : !THREE.OrbitControls ? T('orbitMissing') : '';
    let renderer;
    if (!why) { try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { renderer = undefined; } }
    const fallback = $('of-fallback');
    if (!renderer) { fallback.textContent = why || T('webglFallback'); fallback.style.display = 'grid'; }

    let setFocus = () => {}, closeFocus = () => {};
    let raf = 0, running = true, goal = null, walk = false;
    const keys = new Set();
    let themeI = 0, hemi, sun, applyTheme = () => {};
    const onDarkChange = () => applyTheme();
    // jsdom and very old browsers have no matchMedia: keep the defaults instead of throwing on mount.
    const mq = (q) => (typeof matchMedia === 'function' ? matchMedia(q) : { matches: false, addEventListener() {}, removeEventListener() {} });
    const mqDark = mq('(prefers-color-scheme:dark)');
    const mqReduce = mq('(prefers-reduced-motion:reduce)');
    const reduced = mqReduce.matches;

    if (renderer) {
      const stage = $('of-stage'), tagsEl = $('of-tags'), hint = root.querySelector('.hint');
      const shown = () => root.isConnected && root.getClientRects().length > 0;   // false while the tab pane is display:none
      renderer.setPixelRatio(Math.min(typeof devicePixelRatio === 'number' ? devicePixelRatio : 1, 2)); renderer.shadowMap.enabled = true; renderer.setClearColor(0x000000, 0); stage.appendChild(renderer.domElement);
      const scene = new THREE.Scene();
      const cam = new THREE.PerspectiveCamera(40, 1, .1, 300);
      const HOME = { p: new THREE.Vector3(-10, 25, 30), t: new THREE.Vector3(-10, 0, 2) }, MEET = { p: new THREE.Vector3(14, 14, 19), t: new THREE.Vector3(14.5, 0, 7) };
      cam.position.copy(HOME.p);
      const ctl = new THREE.OrbitControls(cam, renderer.domElement); ctl.target.copy(HOME.t); ctl.enableDamping = true; ctl.maxPolarAngle = 1.45; ctl.minDistance = 4; ctl.maxDistance = 60;
      hemi = new THREE.HemisphereLight(0xffffff, 0x6a6080, .9); sun = new THREE.DirectionalLight(0xfff0d8, .85);
      sun.position.set(-12, 26, 16); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048); Object.assign(sun.shadow.camera, { left: -28, right: 28, top: 22, bottom: -22, near: 1, far: 70 }); sun.shadow.bias = -.0006; scene.add(hemi, sun);
      const OUT = new THREE.MeshBasicMaterial({ color: 0x151220, side: THREE.BackSide });
      function outline(m, t = .05) { const g = m.geometry; g.computeBoundingBox(); const s = new THREE.Vector3(); g.boundingBox.getSize(s); const o = new THREE.Mesh(g, OUT); o.scale.set(1 + 2 * t / Math.max(s.x, .05), 1 + 2 * t / Math.max(s.y, .05), 1 + 2 * t / Math.max(s.z, .05)); m.add(o); return m; }
      const L = (c, o = {}) => new THREE.MeshLambertMaterial(Object.assign({ color: c }, o));
      function box(w, h, d, c, x, y, z, p = scene, ol = true, o) { const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), L(c, o)); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; if (ol) outline(m); p.add(m); return m; }
      function cyl(rt, rb, h, c, x, y, z, p = scene, seg = 20, ol = true) { const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), L(c)); m.position.set(x, y, z); m.castShadow = m.receiveShadow = true; if (ol) outline(m, .04); p.add(m); return m; }
      function sph(r, c, x, y, z, p = scene, sy = 1) { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 20, 14), L(c)); m.position.set(x, y, z); m.scale.y = sy; m.castShadow = true; outline(m, .04); p.add(m); return m; }
      function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h); const t = new THREE.CanvasTexture(c); return { t, c, x }; }

      // floor, walls and rooms
      box(46, .5, 30, 0xa89c78, 0, -.25, 0, scene, false); box(46, .12, 30.6, 0x22222e, 0, -.56, 0, scene, false);
      box(.5, 8, 30, 0xc9d0b4, -23, 3.75, 0); box(46, 8, .5, 0xc9d0b4, 0, 3.75, -15);          // left + back wall
      box(.45, 8, 16, 0xe9dcb4, 23, 3.75, -7, scene, false); box(14, 8, .5, 0xe6d8ae, 16, 3.75, -14.8, scene, false); // VIP room walls: warm cream
      box(14, .06, 14, 0xe6e0d2, 15, .03, -8, scene, false);[[13.4, .1, 15, -1.5], [13.4, .1, 15, -14.4], [.1, 12.9, 8.5, -8], [.1, 12.9, 22.3, -8]].forEach(([w, d, x, z]) => box(w, .02, d, 0xc8a24a, x, .07, z, scene, false)); box(14, .06, 12, 0xe9a36b, 14, .03, 8.5, scene, false);
      box(9, .06, 7, 0x8b5fd0, -8.4, .03, 7.5, scene, false);
      // meeting room partitions live in the boardroom block below
      // windows + wall screen + neon
      box(7, 3.6, .2, 0x79c2f0, -14, 5, -14.7, scene, false, { emissive: 0x2a5f88 }); box(.2, 3.6, 7, 0x79c2f0, -22.7, 5, -4, scene, false, { emissive: 0x2a5f88 });
      const neon = canvasTex(512, 128, (x, w, h) => { x.fillStyle = '#160b24'; x.fillRect(0, 0, w, h); x.font = '700 46px Fredoka,sans-serif'; x.textAlign = 'center'; x.shadowColor = '#ff4fa8'; x.shadowBlur = 18; x.fillStyle = '#ff9fd2'; x.fillText('BEAR AGENT OFFICE', w / 2, 78); });
      box(8, 2, .2, 0x160b24, -7.5, 5.6, -14.6, scene, false).material = new THREE.MeshBasicMaterial({ map: neon.t });
      const wall = canvasTex(512, 256, () => {}); const wallMesh = box(8.5, 4.2, .2, 0x0b1220, 5, 4.6, -14.6, scene, false); wallMesh.material = new THREE.MeshBasicMaterial({ map: wall.t });
      function paintWall() {
        const x = wall.x; x.fillStyle = '#0a1222'; x.fillRect(0, 0, 512, 256); x.fillStyle = '#35e0a1'; x.font = '700 20px Consolas,monospace'; x.fillText(T('wall.title'), 16, 30); x.font = '16px Consolas,monospace';
        CHAT.slice(-8).forEach((m, i) => { x.fillStyle = by[m.from] ? by[m.from].c : '#ffd166'; x.fillText((nameOf(m.from) + ': ' + m.text).slice(0, 38), 16, 62 + i * 24); }); wall.t.needsUpdate = true;
      }
      // string lights
      for (let i = 0; i < 22; i++) { const m = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 6), new THREE.MeshBasicMaterial({ color: [0xffe08a, 0xff9fd2, 0x9fe8ff][i % 3] })); m.position.set(-22 + i * 2.1, 7.4 + Math.sin(i) * .12, -14.6); scene.add(m); }
      // desks in two staggered rows (column x of a seat is free of other desks)
      const SEATS = [];
      const rowB = [...Array(5)].map((_, k) => -14.75 + 4.5 * k), rowA = [...Array(5)].map((_, k) => -17 + 4.5 * k);
      function deskAt(x, z, screenTilt = 0) {
        box(3.3, .18, 1.7, 0xd7a46a, x, 1.15, z);[[-1.5, -.7], [1.5, -.7], [-1.5, .7], [1.5, .7]].forEach(([dx, dz]) => box(.14, 1.1, .14, 0x2c2c38, x + dx, .55, z + dz, scene, false));
        box(1.9, 1.1, .1, 0x10131f, x, 1.95, z - .5); box(.12, .35, .12, 0x2c2c38, x, 1.35, z - .5, scene, false);
        const scr = box(1.7, .9, .04, 0x1d3a5a, x, 1.97, z - .44, scene, false, { emissive: 0x1d3a5a, emissiveIntensity: .5 });
        box(1.1, .06, .4, 0xf0f0e8, x, 1.27, z + .15, scene, false); cyl(.14, .12, .28, 0x2fbf71, x + 1.2, 1.38, z + .1, scene, 12, false);
        // chair
        box(1.1, .14, 1.1, 0x2c3150, x, .62, z + 1.45); box(1.1, 1.2, .14, 0x2c3150, x, 1.3, z + 2.0); cyl(.08, .08, .5, 0x777, x, .35, z + 1.45, scene, 8, false);
        return scr;
      }
      const screens = [];
      rowB.forEach((x) => { screens.push(deskAt(x, -4)); SEATS.push({ x, z: -2.55, col: x }); });
      rowA.slice(0, 4).forEach((x) => { screens.push(deskAt(x, -9)); SEATS.push({ x, z: -7.55, col: x }); });
      // reception box (the user's station)
      const BOX = { x: -1, z: 5.5 };
      cyl(1.4, 1.6, .9, 0x5a6f9a, BOX.x, .45, BOX.z); cyl(1.1, 1.1, .12, 0xd8e2ff, BOX.x, .96, BOX.z, scene, 24, false);
      const cube = box(1.1, 1.1, 1.1, 0x2b9cff, BOX.x, 1.6, BOX.z, scene, true, { emissive: 0x1166cc, emissiveIntensity: .6 });
      // lounge: beanbags, couch, arcade, ping pong
      [[-12, 6.5, 0xff6fae], [-9.5, 9.5, 0x4fd16a], [-6.5, 6, 0xffd23f]].forEach(([x, z, c]) => { sph(1.35, c, x, .85, z, scene, .7); });
      box(4.4, .9, 1.6, 0x2aa79a, -4.5, .5, 11.6); box(4.4, 1.3, .35, 0x2aa79a, -4.5, 1.3, 12.3);
      // VIP room (every tier above the last): marble floor, burgundy rug with gold border, velvet poufs on brass, chesterfield against the back wall, a bar, floor lamps, paintings, plants
      const GOLD = 0xc8a24a, velvet = (m, c) => { m.material = new THREE.MeshPhongMaterial({ color: c, shininess: 45, specular: 0x443322 }); return m; };
      box(10, .06, 7.6, 0x4a1530, 16, .09, -8.2, scene, false); box(9.2, .07, 6.8, 0x6b2347, 16, .095, -8.2, scene, false);
      [[9.2, .1, 16, -11.5], [9.2, .1, 16, -4.9], [.1, 6.8, 11.5, -8.2], [.1, 6.8, 20.5, -8.2]].forEach(([w, d, x, z]) => box(w, .02, d, GOLD, x, .14, z, scene, false));
      [[12.4, -9.2, 0x7b1e3a], [14.9, -6.2, 0x0f5a52], [17.9, -9.7, 0x1e3a6e]].forEach(([x, z, c]) => { cyl(1.25, 1.35, .14, GOLD, x, .18, z, scene, 24, false); velvet(sph(1.3, c, x, .93, z, scene, .66), c); });
      velvet(box(5.2, .7, 1.7, 0x5a1730, 16, .7, -12.4), 0x5a1730); velvet(box(5.2, 1.6, .4, 0x5a1730, 16, 1.4, -13.4), 0x5a1730);
      [13.35, 18.65].forEach((x) => velvet(box(.35, 1.1, 1.7, 0x4a1226, x, .85, -12.4), 0x4a1226));
      [14.6, 16, 17.4].forEach((x) => velvet(box(1.2, .3, 1.3, 0x7a2442, x, 1.18, -12.3, scene, false), 0x7a2442));
      [13.3, 18.7].forEach((x) => [-11.6, -13.2].forEach((z) => cyl(.07, .05, .28, GOLD, x, .24, z, scene, 8, false)));
      [[11.2, -13.3], [20.8, -13.3], [11.2, -2.6]].forEach(([x, z]) => { cyl(.05, .05, 2.6, GOLD, x, 1.4, z, scene, 8, false); cyl(.3, .3, .06, GOLD, x, .15, z, scene, 14, false); cyl(.28, .45, .6, 0xffe9b8, x, 2.9, z, scene, 14, false).material = new THREE.MeshBasicMaterial({ color: 0xffe3a0 }); });
      // bar along the east wall: walnut counter with a brass top, bottles behind it, two velvet stools
      velvet(box(1.3, 1.5, 4.6, 0x3a2012, 22.2, .75, -8), 0x3a2012); box(1.5, .1, 4.8, GOLD, 22.2, 1.55, -8, scene, false);
      [[-9.2, 0x2f8f4e], [-8.5, 0xc84a3a], [-7.8, 0xe8c868], [-7.1, 0x3a6ec8], [-6.4, 0x2f8f4e]].forEach(([z, c]) => cyl(.12, .14, .6, c, 22.3, 1.9, z, scene, 10, false));
      [-9.6, -6.4].forEach((z) => { cyl(.4, .4, .14, 0x7a2442, 20.6, 1.0, z, scene, 16, false); cyl(.07, .07, .95, GOLD, 20.6, .5, z, scene, 8, false); cyl(.3, .3, .06, GOLD, 20.6, .06, z, scene, 14, false); });
      // framed paintings on the back wall
      [[12.6, 'a'], [19.4, 'b']].forEach(([x, k]) => {
        const art = canvasTex(128, 80, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, k === 'a' ? '#1d3a6a' : '#6a1d3a'); g.addColorStop(1, k === 'a' ? '#e0b45a' : '#e8a07a'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(k === 'a' ? 40 : 88, 32, 18, 0, 7); c.fill(); });
        box(2.9, 2, .1, GOLD, x, 4.2, -14.5, scene, false); box(2.6, 1.7, .08, 0xffffff, x, 4.2, -14.45, scene, false).material = new THREE.MeshBasicMaterial({ map: art.t });
      });
      cyl(.5, .4, .7, GOLD, 21.2, .35, -3.6, scene, 14, false); [[0, 1.3, 0], [-.35, 1.1, .1], [.35, 1.15, -.05], [0, 1.0, .35]].forEach(([dx, y, dz]) => sph(.55, 0x2f8f4e, 21.2 + dx, y + .3, -3.6 + dz, scene, 1.2));
      const vipLight = new THREE.PointLight(0xffc880, .8, 18); vipLight.position.set(16, 6, -8); scene.add(vipLight);
      box(1.6, 3.2, 1.4, 0x6c3ec1, -21.5, 1.6, 2); box(1.3, .9, .1, 0x77f0ff, -21.5, 2.5, 1.28, scene, false, { emissive: 0x33aacc });
      box(4.6, .14, 2.6, 0x1e7a52, 2.6, 1.15, 9); box(4.6, .3, .04, 0xffffff, 2.6, 1.35, 9, scene, false);[[-2, -1], [2, -1], [-2, 1], [2, 1]].forEach(([dx, dz]) => box(.12, 1.1, .12, 0x2c2c38, 2.6 + dx, .55, 9 + dz, scene, false));
      // meeting room (boardroom): walnut table, leather chairs, brass trim, credenza + wide screen, pendant lights
      const glassO = { transparent: true, opacity: .2, depthWrite: false }, MBRASS = 0xc8a24a, MWAL = 0x4b2a16, P = (c, o = {}) => new THREE.MeshPhongMaterial(Object.assign({ color: c, shininess: 90, specular: 0x666666 }, o));
      const phong = (m, c, o) => { m.material = P(c, o); return m; };
      phong(box(8.8, .16, 2.8, MWAL, 15, 1.15, 7.5), MWAL); box(8.84, .04, 2.84, MBRASS, 15, 1.06, 7.5, scene, false); box(7.2, .02, .3, 0x8a6a2a, 15, 1.24, 7.5, scene, false);
      [12.4, 17.6].forEach((x) => { phong(box(1, 1.0, 2.1, 0x2e1a0d, x, .5, 7.5, scene, false), 0x2e1a0d); box(1.5, .06, 2.5, MBRASS, x, .03, 7.5, scene, false); });
      [13.4, 16.6].forEach((x) => { const gl = cyl(.18, .15, .45, 0xcfe8ff, x, 1.5, 7.5, scene, 14, false); gl.material = new THREE.MeshLambertMaterial(Object.assign({ color: 0xcfe8ff }, glassO)); gl.castShadow = false; });
      phong(cyl(.2, .26, .5, MBRASS, 15, 1.48, 7.5, scene, 14, false), MBRASS); [[0, 0, 0xff8fb8], [.15, .1, 0xfff2f6], [-.15, .08, 0xffc2d6]].forEach(([dx, dz, c]) => sph(.22, c, 15 + dx, 1.95, 7.5 + dz));
      // carpet + rug
      box(14.2, .05, 11, 0x1b2340, 15.5, .06, 9.1, scene, false); box(11.2, .05, 4.8, 0x5a1f2e, 15, .09, 7.5, scene, false);
      [[11.4, .1, 15, 4.9], [11.4, .1, 15, 10.1], [.1, 5.2, 9.4, 7.5], [.1, 5.2, 20.6, 7.5]].forEach(([w, d, x, z]) => box(w, .02, d, MBRASS, x, .13, z, scene, false));
      // panelled back wall with sconces and two framed paintings
      const slats = canvasTex(256, 64, (x, w, h) => { for (let i = 0; i < 32; i++) { x.fillStyle = ['#3b2213', '#4a2c18', '#432714', '#523320'][i % 4]; x.fillRect(i * 8, 0, 8, h); x.fillStyle = 'rgba(0,0,0,.35)'; x.fillRect(i * 8, 0, 1, h); } });
      const backW = box(10, 3.8, .3, 0xffffff, 18.2, 1.9, 3); backW.material = new THREE.MeshLambertMaterial({ map: slats.t });
      box(10.1, .1, .36, MBRASS, 18.2, 3.75, 3, scene, false); box(10.1, .1, .36, MBRASS, 18.2, .3, 3, scene, false);
      [14.6, 18.2, 21.8].forEach((x) => box(.28, .9, .1, 0xffe3a8, x, 2.4, 3.2, scene, false, { emissive: 0xffd9a0 }));
      [[16.4, 'a'], [20, 'b']].forEach(([x, k]) => {
        const art = canvasTex(128, 80, (c, w, h) => { const g = c.createLinearGradient(0, 0, w, h); g.addColorStop(0, k === 'a' ? '#1d3a6a' : '#6a1d3a'); g.addColorStop(1, k === 'a' ? '#e0b45a' : '#e8a07a'); c.fillStyle = g; c.fillRect(0, 0, w, h); c.fillStyle = 'rgba(255,255,255,.18)'; c.beginPath(); c.arc(w * .65, h * .4, 22, 0, 7); c.fill(); });
        box(2.5, 1.7, .08, MBRASS, x, 2.2, 3.18, scene, false); const cv = box(2.3, 1.5, .06, 0xffffff, x, 2.2, 3.22, scene, false); cv.material = new THREE.MeshBasicMaterial({ map: art.t });
      });
      // glass wall on the west side (walnut base, brass posts)
      box(.3, .9, 7, MWAL, 8, .45, 8.6); box(.1, 2.3, 7, 0xcfe8ff, 8, 2.05, 8.6, scene, false, glassO).castShadow = false; box(.3, .1, 7.2, MBRASS, 8, 3.25, 8.6, scene, false);
      [5.1, 8.6, 12.1].forEach((z) => box(.2, 3.2, .2, MBRASS, 8, 1.6, z, scene, false));
      // chairs: leather seat + high back + arms + chrome base
      const MEETSEATS = [];
      const chair = (x, z, bx, bz, c) => {
        const alongZ = bz !== 0;
        box(1.1, .2, 1.1, c, x, .6, z); box(alongZ ? 1.1 : .2, 1.4, alongZ ? .2 : 1.1, c, x + bx * .55, 1.3, z + bz * .55);
        [-1, 1].forEach((s) => box(alongZ ? .12 : .8, .12, alongZ ? .8 : .12, c, x + (alongZ ? s * .62 : 0), .95, z + (alongZ ? 0 : s * .62), scene, false));
        phong(cyl(.07, .07, .45, 0xcfd3d8, x, .32, z, scene, 8, false), 0xcfd3d8); phong(cyl(.5, .5, .06, 0xcfd3d8, x, .03, z, scene, 16, false), 0xcfd3d8);
      };
      [12, 14, 16, 18].forEach((x) => { chair(x, 5.4, 0, -1, 0x24262d); MEETSEATS.push({ x, z: 5.7, face: 0 }); chair(x, 9.6, 0, 1, 0x24262d); MEETSEATS.push({ x, z: 9.3, face: Math.PI }); });
      chair(10.5, 7.5, -1, 0, 0x6a1d2e); MEETSEATS.push({ x: 10.5, z: 7.5, face: Math.PI / 2 });
      // credenza + wide screen on the east wall
      phong(box(1.1, 1.0, 6.4, 0x3b2213, 21.7, .5, 8.5), 0x3b2213); box(1.14, .06, 6.5, MBRASS, 21.7, 1.03, 8.5, scene, false);
      box(.1, 3.3, 5.3, MBRASS, 22.55, 3.3, 8.5, scene, false); box(.2, 3.0, 5, 0x14192a, 22.4, 3.3, 8.5, scene, true, { emissive: 0x14325a, emissiveIntensity: .4 });
      cyl(.26, .2, .5, MBRASS, 21.7, 1.3, 6.1, scene, 12, false); sph(.34, 0xfff2f6, 21.7, 1.85, 6.1); cyl(.26, .2, .5, MBRASS, 21.7, 1.3, 10.9, scene, 12, false); sph(.34, 0xff8fb8, 21.7, 1.85, 10.9);
      // pendant lights + warm glow + corner plants
      [12.6, 15, 17.4].forEach((x) => { box(2.2, .12, .28, 0xffe9bd, x, 4.6, 7.5, scene, false, { emissive: 0xffd9a0 }); [-.9, .9].forEach((dx) => box(.03, 1.4, .03, 0x333338, x + dx, 5.3, 7.5, scene, false)); });
      const meetLight = new THREE.PointLight(0xffd9a0, .8, 18); meetLight.position.set(15, 5.2, 7.5); scene.add(meetLight);
      [[22, 4.3], [22, 13.9]].forEach(([x, z]) => { phong(cyl(.55, .45, .8, 0x2a2a34, x, .4, z, scene, 14), 0x2a2a34); sph(.85, 0x2f9d63, x, 1.7, z); sph(.6, 0x3fae73, x, 2.4, z + .1); });
      // living room: couch, tv unit, rug, plants
      box(4.6, .9, 1.7, 0x9bd6b8, 15, .5, -9.6); box(4.6, 1.3, .4, 0x9bd6b8, 15, 1.3, -10.4); box(3, 1.2, .8, 0x8a5a2b, 17.5, .6, -13.8); box(1.8, 1, .12, 0x161b2b, 17.5, 1.9, -13.7);
      [[-21, -13], [21, -13], [-21, 13], [7, 13.5]].forEach(([x, z]) => { cyl(.5, .4, .7, 0xa8632f, x, .35, z, scene, 12); sph(.9, 0x2f9d63, x, 1.5, z); });
      // rest loft: a roomy mezzanine along the left wall (oak floor, glass + brass rail, walnut stairs from the north end), three double beds head-to-wall, a reading corner.
      const LOFT = { x0: -23, x1: -14.2, z0: .2, z1: 12, h: 3.7, sx: -20.6, sz: -6.2, n: 15, ais: -18.3 };   // sx/sz = foot of the stairs (they climb towards +z); ais = walking aisle on the loft
      const stairIn = (x, z) => x > LOFT.sx - .95 && x < LOFT.sx + .95 && z >= LOFT.sz && z <= LOFT.z0;
      const stairY = (z) => LOFT.h * (z - LOFT.sz) / (LOFT.z0 - LOFT.sz);
      const H = LOFT.h, lw = LOFT.x1 - LOFT.x0, ld = LOFT.z1 - LOFT.z0, lcx = (LOFT.x0 + LOFT.x1) / 2, lcz = (LOFT.z0 + LOFT.z1) / 2;
      const BRASS = 0xc8a24a;
      const oak = canvasTex(256, 256, (x, w, h) => { for (let i = 0; i < 8; i++) { x.fillStyle = ['#d9b27c', '#cfa66c', '#dcb985', '#c99f66'][i % 4]; x.fillRect(0, i * 32, w, 32); x.fillStyle = 'rgba(80,50,20,.35)'; x.fillRect(0, i * 32, w, 2); x.fillRect((i * 97) % 220 + 10, i * 32, 2, 32); } });
      const slab = box(lw, .4, ld, 0xf4efe6, lcx, H - .2, lcz);                                              // white fascia
      const floorM = box(lw - .12, .06, ld - .12, 0xffffff, lcx, H + .03, lcz, scene, false); floorM.material = new THREE.MeshLambertMaterial({ map: oak.t });
      box(.08, 3.3, ld - .1, 0xd9c3a8, -22.7, H + 1.65, lcz, scene, false);                                  // warm wall panel behind the beds
      box(lw - .6, .06, .06, 0xffe3a8, lcx, H - .43, LOFT.z1 - .02, scene, false, { emissive: 0xffd9a0 }); box(.06, .06, ld - .4, 0xffe3a8, LOFT.x1 - .02, H - .43, lcz, scene, false, { emissive: 0xffd9a0 });   // LED strip under the edge
      [1, 6.1, 11.4].forEach((z) => cyl(.15, .15, H - .4, 0xf4efe6, LOFT.x1 - .35, (H - .4) / 2, z, scene, 14, false));   // stilts
      // stairs: white risers, oak treads
      const stepD = (LOFT.z0 - LOFT.sz) / LOFT.n;
      for (let i = 0; i < LOFT.n; i++) { const top = (i + 1) * H / LOFT.n; box(1.7, top, stepD, 0xf4efe6, LOFT.sx, top / 2, LOFT.sz + (i + .5) * stepD, scene, false); box(1.78, .07, stepD + .06, 0xb98450, LOFT.sx, top + .035, LOFT.sz + (i + .5) * stepD); }
      // railings: glass panels, brass handrails
      const rail = (len, x, z, alongZ) => { const g = box(alongZ ? .05 : len, 1, alongZ ? len : .05, 0xcfe8ff, x, H + .56, z, scene, false, glassO); g.castShadow = false; box(alongZ ? .09 : len, .08, alongZ ? len : .09, BRASS, x, H + 1.1, z, scene, false); };
      rail(ld - .1, LOFT.x1 - .05, lcz, true); rail(lw, lcx, LOFT.z1 - .05, false);
      rail(1.55, -22.2, LOFT.z0 + .05, false); rail(5.5, -16.95, LOFT.z0 + .05, false);
      [LOFT.z0 + .1, 3.5, 6.1, 8.7, LOFT.z1 - .05].forEach((z) => box(.1, 1.1, .1, BRASS, LOFT.x1 - .05, H + .55, z, scene, false));
      const slope = Math.atan2(H, LOFT.z0 - LOFT.sz), slen = Math.hypot(H, LOFT.z0 - LOFT.sz);
      [LOFT.sx - .9, LOFT.sx + .9].forEach((x) => { const gl = box(.05, 1, slen, 0xcfe8ff, x, H / 2 + .56, (LOFT.sz + LOFT.z0) / 2, scene, false, glassO); gl.rotation.x = -slope; gl.castShadow = false; const hr = box(.09, .08, slen, BRASS, x, H / 2 + 1.1, (LOFT.sz + LOFT.z0) / 2, scene, false); hr.rotation.x = -slope; });
      // three double beds, head against the wall (x = -23), nightstands with lamps between them
      const BEDS = [2.7, 6.1, 9.5].map((z) => ({ x: -21, z }));
      BEDS.forEach((b, i) => {
        const g = new THREE.Group(); g.position.set(b.x, H, b.z); g.rotation.y = Math.PI / 2; scene.add(g);
        box(2.3, .34, 3.4, 0x5a3b22, 0, .17, 0, g); box(2.14, .3, 3.24, 0xfbf7ee, 0, .5, 0, g, false);
        box(2.3, 1.5, .2, 0x4a2f1a, 0, .95, -1.7, g); box(2.0, 1.1, .12, [0x6d7fb8, 0x4f9d86, 0xb87a52][i], 0, 1.0, -1.58, g, false);   // headboard + padded panel
        [-.55, .55].forEach((px) => box(.85, .22, .6, 0xffffff, px, .72, -1.12, g, false));
        box(2.2, .2, 2.0, [0x7f9cf5, 0x63c9a8, 0xf0a35e][i], 0, .66, .5, g, false); box(2.2, .12, .6, [0xe6ecff, 0xdff5ec, 0xfde7d0][i], 0, .74, -.35, g, false);   // duvet + folded throw
      });
      [4.4, 7.8, 11.3].forEach((z) => { box(.8, .75, .8, 0x5a3b22, -22.3, H + .4, z); cyl(.05, .06, .5, BRASS, -22.3, H + 1.05, z, scene, 8, false); cyl(.26, .2, .3, 0xfff0d0, -22.3, H + 1.4, z, scene, 14, false).material = new THREE.MeshBasicMaterial({ color: 0xffe9bd }); });
      // wall art + fairy lights
      [[3.4, 0x5f7bd0], [8.2, 0xd08a5f]].forEach(([z, c]) => { box(.06, 1.5, 2.2, BRASS, -22.68, H + 2.5, z, scene, false); box(.07, 1.3, 2.0, c, -22.66, H + 2.5, z, scene, false, { emissive: c, emissiveIntensity: .25 }); });
      for (let z = .8; z < 11.6; z += .7) { const m = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), new THREE.MeshBasicMaterial({ color: [0xffe08a, 0xff9fd2, 0x9fe8ff][Math.round(z * 1.4) % 3] })); m.position.set(-22.62, H + 3.4 + Math.sin(z * 2) * .1, z); scene.add(m); }
      // reading corner: rug, armchair, side table, floor lamp, plant
      box(3.4, .04, 5.2, 0x2f6f73, -16.2, H + .08, 7.4, scene, false); box(3.0, .045, 4.8, 0xe8d9b8, -16.2, H + .085, 7.4, scene, false);
      box(1.5, .5, 1.5, 0xd9904f, -16.2, H + .35, 10.3); box(1.5, 1.1, .3, 0xd9904f, -16.2, H + .9, 11.05); box(.3, .6, 1.2, 0xc07a3a, -15.5, H + .55, 10.3); box(.3, .6, 1.2, 0xc07a3a, -16.9, H + .55, 10.3);
      cyl(.35, .35, .6, 0x5a3b22, -14.8, H + .3, 8.6, scene, 14); box(.9, .1, .9, 0x6a6a74, -14.8, H + .65, 8.6, scene, false);
      cyl(.07, .09, 2.2, 0x2c2c38, -17.5, H + 1.1, 4.4, scene, 10, false); sph(.33, 0xffe3a8, -17.5, H + 2.3, 4.4, scene, 1);
      cyl(.5, .4, .7, 0xf4efe6, -14.9, H + .35, 11.2, scene, 12); sph(.8, 0x2f9d63, -14.9, H + 1.5, 11.2);
      const restLight = new THREE.PointLight(0xffd9a0, .7, 12); restLight.position.set(-19, H + 3, 6.5); scene.add(restLight);
      // agents
      // six cute species (bear / cat / bunny / robot / sprout / beanie blob), shared rig so poses and animation stay the same
      const SPECIES = ['bear', 'cat', 'bunny', 'robot', 'sprout', 'blob'];
      function makeAgent(hex, kind = 0) {
        const sp = SPECIES[kind % SPECIES.length], col = new THREE.Color(hex), light = col.clone().lerp(new THREE.Color(0xffffff), .6), dark = col.clone().lerp(new THREE.Color(0x000000), .25);
        const g = new THREE.Group(), rootG = new THREE.Group(); g.add(rootG); g.userData.root = rootG;
        const fat = sp === 'blob' ? 1.25 : sp === 'robot' ? 1.05 : 1;
        const legs = [-1, 1].map((s) => { const l = new THREE.Group(); l.position.set(s * .22, .95, 0); const m = new THREE.Mesh(new THREE.CylinderGeometry(.17, .16, .9, 12), L(hex)); m.position.y = -.45; m.castShadow = true; outline(m, .04); l.add(m); const f = new THREE.Mesh(new THREE.SphereGeometry(.22, 12, 8), L(dark)); f.scale.set(1, .55, 1.3); f.position.set(0, -.88, .06); l.add(f); rootG.add(l); return l; });
        const torso = new THREE.Mesh(sp === 'robot' ? new THREE.BoxGeometry(.9, 1, .75) : new THREE.CylinderGeometry(.38 * fat, .46 * fat, 1, 16), L(hex)); torso.position.y = 1.45; torso.castShadow = true; outline(torso, .04); rootG.add(torso);
        const belly = new THREE.Mesh(new THREE.SphereGeometry(.3, 14, 10), L(light)); belly.scale.set(1.05 * fat, 1.2, .5); belly.position.set(0, 1.4, .36 * fat); rootG.add(belly);   // lighter tummy patch
        const arms = [-1, 1].map((s) => { const a = new THREE.Group(); a.position.set(s * .52 * fat, 1.85, 0); const m = new THREE.Mesh(new THREE.CylinderGeometry(.13, .12, .8, 10), L(hex)); m.position.y = -.38; m.castShadow = true; outline(m, .035); a.add(m); const h = new THREE.Mesh(new THREE.SphereGeometry(.16, 10, 8), L(light)); h.position.y = -.8; a.add(h); rootG.add(a); return a; });
        const head = new THREE.Group(); head.position.y = 2.6; rootG.add(head);
        const hm = new THREE.Mesh(new THREE.SphereGeometry(.68, 24, 18), L(light)); hm.scale.set(1.08, .98, 1); hm.castShadow = true; outline(hm, .05); head.add(hm);
        [-1, 1].forEach((s) => {   // big glossy eyes, blush, tiny ear cups of the headset
          const e = new THREE.Mesh(new THREE.SphereGeometry(.17, 14, 10), L(0x1a1620)); e.scale.set(.9, 1.25, .6); e.position.set(s * .27, .04, .6); head.add(e);
          const hl = new THREE.Mesh(new THREE.SphereGeometry(.055, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff })); hl.position.set(s * .27 + .05, .12, .69); head.add(hl);
          const bl = new THREE.Mesh(new THREE.SphereGeometry(.11, 10, 6), new THREE.MeshBasicMaterial({ color: 0xff9fb8, transparent: true, opacity: .75 })); bl.scale.set(1.3, .7, .3); bl.position.set(s * .46, -.15, .52); head.add(bl);
          if (sp !== 'sprout') { const cup = new THREE.Mesh(new THREE.CylinderGeometry(.17, .17, .12, 14), L(0x2e3350)); cup.rotation.z = Math.PI / 2; cup.position.set(s * .72, -.02, 0); head.add(cup); }
        });
        const smile = new THREE.Mesh(new THREE.TorusGeometry(.09, .022, 6, 12, Math.PI), new THREE.MeshBasicMaterial({ color: 0x3a1620 })); smile.rotation.z = Math.PI; smile.position.set(0, -.17, .65); head.add(smile);
        const mic = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), L(0x2e3350)); mic.position.set(.55, -.3, .45); if (sp !== 'sprout') head.add(mic);
        const add = (m, x, y, z, rx = 0, rz = 0) => { m.position.set(x, y, z); m.rotation.x = rx; m.rotation.z = rz; m.castShadow = true; head.add(m); return m; };
        if (sp === 'bear') [-1, 1].forEach((s) => { add(new THREE.Mesh(new THREE.SphereGeometry(.23, 12, 10), L(light)), s * .46, .56, 0); add(new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), L(0xffb0c4)), s * .46, .56, .12); });
        else if (sp === 'cat') { [-1, 1].forEach((s) => add(new THREE.Mesh(new THREE.ConeGeometry(.22, .45, 4), L(light)), s * .4, .66, 0, 0, -s * .35)); const tail = new THREE.Mesh(new THREE.CylinderGeometry(.07, .07, .9, 8), L(dark)); tail.position.set(0, 1.2, -.55); tail.rotation.x = .7; rootG.add(tail); }
        else if (sp === 'bunny') { [-1, 1].forEach((s) => { add(new THREE.Mesh(new THREE.SphereGeometry(.17, 12, 10), L(light)), s * .25, 1.0, 0, 0, -s * .12).scale.set(1, 3.4, .7); }); const tl = new THREE.Mesh(new THREE.SphereGeometry(.2, 10, 8), L(0xffffff)); tl.position.set(0, 1.15, -.5); rootG.add(tl); }
        else if (sp === 'robot') { add(new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .5, 6), L(0x9aa3b8)), 0, .88, 0); add(new THREE.Mesh(new THREE.SphereGeometry(.1, 10, 8), new THREE.MeshBasicMaterial({ color: 0xffd23f })), 0, 1.16, 0); }
        else if (sp === 'sprout') { add(new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8), L(0x4fd16a)), -.15, .78, 0, 0, .6).scale.set(1.5, .5, .8); add(new THREE.Mesh(new THREE.SphereGeometry(.22, 10, 8), L(0x38b856)), .17, .8, 0, 0, -.6).scale.set(1.5, .5, .8); add(new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .22, 6), L(0x2f9d63)), 0, .72, 0); }
        else { add(new THREE.Mesh(new THREE.SphereGeometry(.62, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), L(dark)), 0, .22, 0, -.15).scale.set(1.05, 1, 1.05); add(new THREE.Mesh(new THREE.SphereGeometry(.14, 10, 8), L(0xffffff)), 0, .85, -.05); }   // beanie + pompom
        if (sp !== 'sprout' && sp !== 'blob') { const band = new THREE.Mesh(new THREE.TorusGeometry(.7, .045, 8, 22, Math.PI), L(0x2e3350)); band.position.y = 0; head.add(band); }
        const bang = new THREE.Mesh(new THREE.OctahedronGeometry(.24), new THREE.MeshBasicMaterial({ color: 0xff4b4b })); bang.position.y = 3.6; bang.visible = false; rootG.add(bang);
        g.scale.setScalar(.72); return { g, root: rootG, legs, arms, head, bang };
      }
      function addAgentMesh(a) {
        if (a.g) return;
        Object.assign(a, makeAgent(a.c, AG.indexOf(a)));
        const i = AG.indexOf(a);
        a.g.position.set(-14.5 + (i % 5) * 1.6, 0, 7.5 + Math.floor(i / 5) * 2.2); scene.add(a.g);
        Object.assign(a, { state: a.state || 'idle', until: 0, bub: '', bubUntil: 0, tool: a.tool || '', askedAt: 0, log: a.log || [], ctx: a.ctx ?? 0, tkey: '', path: [], pose: 'stand', cache: {} });
        const hit = new THREE.Mesh(new THREE.SphereGeometry(1.5, 8, 6), new THREE.MeshBasicMaterial({ visible: false })); hit.position.y = 2; hit.userData.id = a.id; a.root.add(hit); a.hit = hit;
        const tg = document.createElement('div'); tg.className = 'tag'; tg.innerHTML = `<div class="say"></div><div class="nm"><i style="background:${a.c}"></i>${esc(a.n)}</div><div class="chip"></div><div class="tool"></div>`; tagsEl.appendChild(tg);
        a.tg = tg; a.tSay = tg.querySelector('.say'); a.tChip = tg.querySelector('.chip'); a.tTool = tg.querySelector('.tool'); a.cache = {};
      }
      AG.forEach(addAgentMesh);
      // Live mode: the roster follows the room's sessions; meshes are added and dropped with them.
      applyAgents = (list) => {
        const ids = new Set(list.map((x) => x.id));
        for (const a of [...AG]) if (!ids.has(a.id)) {
          if (a.g) scene.remove(a.g);
          if (a.tg) a.tg.remove();
          const i = AG.indexOf(a); if (i >= 0) AG.splice(i, 1); delete by[a.id];
        }
        for (const x of list) {
          const a = by[x.id];
          if (a) Object.assign(a, x);
          else { const na = { ...x }; AG.push(na); by[na.id] = na; addAgentMesh(na); }
        }
        if (focus && !by[focus]) closeFocus();
        hud();
      };
      const OBS = [[-12, 6.5, 1.35], [-9.5, 9.5, 1.35], [-6.5, 6, 1.35], [-1, 5.5, 1.65], [-21, -13, .85], [21, -13, .85], [-21, 13, .85], [7, 13.5, .85], [22, 4.3, .9], [22, 13.9, .9], [12.4, -9.2, 1.35], [14.9, -6.2, 1.35], [17.9, -9.7, 1.35], [11.2, -13.3, .45], [20.8, -13.3, .45], [11.2, -2.6, .45], [21.2, -3.6, .8], [20.6, -9.6, .45], [20.6, -6.4, .45]];   // x, z, radius
      // targets + paths
      const V = (x, z) => new THREE.Vector3(x, 0, z);
      const lastTier = () => Math.max(5, ...AG.map((x) => x.tier || 0)), VIP_RING = [[15.4, -8.2], [12.4, -6.3], [17.4, -6.1], [11.8, -11.4], [20, -10.9], [14.9, -10.4], [19.4, -7.4], [12.2, -7.2], [16.4, -4.7]];
      function targetFor(a, slot) {
        if (a.state === 'sleep') { const b = BEDS[slot.sleep % BEDS.length]; return { kind: 'bed', pos: V(b.x + 1.1, b.z), face: Math.PI / 2, pose: 'lie', key: 'z' + (slot.sleep % BEDS.length) }; }
        if (meeting) return { kind: 'meet', pos: V(MEETSEATS[slot.meet % MEETSEATS.length].x, MEETSEATS[slot.meet % MEETSEATS.length].z), face: MEETSEATS[slot.meet % MEETSEATS.length].face, pose: 'sit', key: 'm' + slot.meet };
        const i = AG.indexOf(a);
        if (a.state === 'working' || a.state === 'error') { const s = SEATS[i % SEATS.length]; return { kind: 'desk', pos: V(s.x, s.z), col: s.col, face: Math.PI, pose: 'sit', key: 'd' + i }; }
        if (a.state === 'ask') { const ang = (Math.PI * .18) + slot.ask * (Math.PI * .64 / Math.max(1, slot.asks - 1 || 1)); const r = 2.9; return { kind: 'box', pos: V(BOX.x + Math.cos(ang) * r * 1.0, BOX.z + Math.sin(ang) * r), face: Math.atan2(-Math.cos(ang), -Math.sin(ang)), pose: 'wave', key: 'b' + slot.ask }; }
        if (a.tier < lastTier()) { const c = VIP_RING[slot.vip % VIP_RING.length]; return { kind: 'vip', pos: V(c[0], c[1]), face: Math.atan2(16 - c[0], -8.2 - c[1]) + Math.PI, pose: a.state === 'idle' ? 'nap' : 'stand', key: 'v' + slot.vip }; }   // tiers above the last rest in the VIP room
        const ring = [[-9, 7.5], [-12, 9.4], [-7, 9.6], [-10.8, 3.2], [-4.2, 5], [-9.5, 5.3], [-4.6, 8.3], [-12.2, 8.5], [-8, 11]][slot.lounge % 9];
        return { kind: 'lounge', pos: V(ring[0], ring[1]), face: Math.atan2(-8.4 - ring[0], 7.5 - ring[1]) + Math.PI, pose: a.state === 'idle' ? 'nap' : 'stand', key: 'l' + slot.lounge };
      }
      function planPath(a, t) {
        const p = a.g.position, pts = [];
        if (p.y > .05) { pts.push(V(LOFT.ais, p.z)); pts.push(V(LOFT.ais, LOFT.z0 + 1)); pts.push(V(LOFT.sx, LOFT.z0 + 1)); pts.push(V(LOFT.sx, LOFT.sz)); pts.push(V(-19.2, LOFT.sz - .3)); pts.push(V(-19.2, .8)); }   // coming down from the loft
        if (p.z < .4) pts.push(V(p.x, .8));
        else if (p.x > 8.3 && p.z > 2.6) { pts.push(V(9.5, p.z > 7.5 ? 9.8 : 5.6)); pts.push(V(9.5, 5.6)); pts.push(V(9.5, .8)); }
        if (t.kind === 'desk') { pts.push(V(t.col, .8)); pts.push(t.pos); }
        else if (t.kind === 'meet') { pts.push(V(9.5, .8)); pts.push(V(9.5, 5.6)); if (t.pos.z > 7.5) pts.push(V(9.5, 9.8)); pts.push(t.pos); }
        else if (t.kind === 'bed') { pts.push(V(-19.2, .8)); pts.push(V(-19.2, LOFT.sz - .3)); pts.push(V(LOFT.sx, LOFT.sz - .3)); pts.push(V(LOFT.sx, LOFT.z0 + 1)); pts.push(V(LOFT.ais, LOFT.z0 + 1)); pts.push(V(LOFT.ais, t.pos.z)); pts.push(t.pos); }   // up the stairs, along the aisle
        else if (t.kind === 'vip') { pts.push(V(9.5, .8)); pts.push(V(9.5, -3.2)); pts.push(t.pos); }   // along the aisle, then into the back room
        else pts.push(t.pos);
        return pts;
      }
      // camera tween
      let followPrev = null;
      const flyTo = (g) => { goal = { p: g.p.clone(), t: g.t.clone() }; followPrev = null; };
      const camOff = (a, h) => { const y = a.g.rotation.y, f = new THREE.Vector3(Math.sin(y), 0, Math.cos(y)), r = new THREE.Vector3(Math.cos(y), 0, -Math.sin(y)); return h.clone().addScaledVector(f, 3.6).addScaledVector(r, 4.2).add(new THREE.Vector3(0, 3.4, 0)); };
      const focusOn = (a) => { const h = a.g.position.clone(); h.y = 1.8; flyTo({ p: camOff(a, h), t: h }); goal.follow = a; };
      setFocus = (id) => { walk = false; $('of-bWalk').setAttribute('aria-pressed', 'false'); focus = id; meeting = false; $('of-bMeet').setAttribute('aria-pressed', 'false'); const a = by[id]; $('of-panel').dataset.id = ''; panelDirty = true; chatDirty = true; if (live) liveDm(id); if (a) focusOn(a); };
      closeFocus = () => { focus = null; $('of-panel').hidden = true; $('of-panel').dataset.id = ''; flyTo(meeting ? MEET : HOME); };
      $('of-bOver').onclick = () => { walk = false; $('of-bWalk').setAttribute('aria-pressed', 'false'); meeting = false; $('of-bMeet').setAttribute('aria-pressed', 'false'); closeFocus(); flyTo(HOME); };
      $('of-bMeet').onclick = () => { walk = false; $('of-bWalk').setAttribute('aria-pressed', 'false'); meeting = !meeting; $('of-bMeet').setAttribute('aria-pressed', meeting); if (meeting) { focus = null; $('of-panel').hidden = true; flyTo(MEET); post('sys', [], T('msg.meeting')); } else flyTo(HOME); };
      $('of-bTheme').onclick = () => { themeI = (themeI + 1) % 3; const m = ['', 'light', 'dark'][themeI]; m ? root.setAttribute('data-theme', m) : root.removeAttribute('data-theme'); root.dataset.themeI = String(themeI); $('of-bTheme').textContent = T(['themeAuto', 'themeLight', 'themeDark'][themeI]); applyTheme(); };
      function setWalk(on) { walk = on; $('of-bWalk').setAttribute('aria-pressed', on); if (on) { meeting = false; $('of-bMeet').setAttribute('aria-pressed', 'false'); if (focus) closeFocus(); flyTo({ p: new THREE.Vector3(-3, 5.5, 18), t: new THREE.Vector3(-3, 2.2, 6) }); setTimeout(() => { if (walk) goal = null; }, 1800); toastMsg(T('toast.walk')); } else flyTo(HOME); }
      $('of-bWalk').onclick = () => setWalk(!walk);
      const isDark = () => { const d = root.getAttribute('data-theme'); return d ? d === 'dark' : mqDark.matches; };
      applyTheme = () => { const d = isDark(); hemi.intensity = d ? .5 : .6; sun.intensity = d ? .5 : .55; hemi.color.set(d ? 0xaab4ff : 0xffffff); sun.color.set(d ? 0xffd9b0 : 0xfff4e0); };
      mqDark.addEventListener('change', onDarkChange); applyTheme();
      const onKey = (e) => {
        if (!shown()) return;   // the tab is not showing
        const ae = document.activeElement;
        if (ae && /INPUT|TEXTAREA/.test(ae.tagName) && e.key !== 'Escape') return;
        if (/^[wasd]$|^arrow/i.test(e.key) && walk) { keys.add(e.key.toLowerCase()); return; }
        if (e.key === 'f' || e.key === 'F') $('of-bWalk').click(); else if (e.key === 'm' || e.key === 'M') $('of-bMeet').click(); else if (e.key === 'o' || e.key === 'O') $('of-bOver').click(); else if (e.key === 'c' || e.key === 'C') $('of-bDock').click(); else if (e.key === 'Escape') { if (focus) closeFocus(); else $('of-bOver').click(); }
      };
      const onKeyUp = (e) => keys.delete(e.key.toLowerCase());
      addEventListener('keydown', onKey); addEventListener('keyup', onKeyUp);
      // picking
      const ray = new THREE.Raycaster(), mp = new THREE.Vector2(); let down = null;
      renderer.domElement.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY]; goal = goal && goal.follow ? goal : null; });
      renderer.domElement.addEventListener('pointerup', (e) => {
        if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 5) return;
        const r = root.getBoundingClientRect(), W = r.width || 1, H = r.height || 1;
        mp.set((e.clientX - r.left) / W * 2 - 1, -((e.clientY - r.top) / H) * 2 + 1); ray.setFromCamera(mp, cam);
        const h = ray.intersectObjects(AG.filter((a) => a.hit).map((a) => a.hit), false)[0]; if (h) setFocus(h.object.userData.id); else if (focus) closeFocus();
      });
      const size = () => { const r = root.getBoundingClientRect(); return { W: Math.max(1, Math.round(r.width)), H: Math.max(1, Math.round(r.height)) }; };
      let last = now(), simAt = 0, wallAt = 0;
      function start() { if (running || !root.isConnected) return; running = true; last = now(); raf = requestAnimationFrame(frame); }
      function resize() {
        const { W, H } = size();
        renderer.setSize(W, H); cam.aspect = W / H; cam.updateProjectionMatrix();
        // phone: frame the VIP room + boardroom and keep the floor edge below the frame, otherwise the
        // transparent renderer shows the near-white sky gradient as a band under the canvas (#211)
        if (W < 760) { HOME.p.set(15, 30, 26); HOME.t.set(15, 0, -4); if (!resize.m) { resize.m = 1; cam.position.copy(HOME.p); ctl.target.copy(HOME.t); $('of-dock').classList.add('closed'); } }
        else { HOME.p.set(-10, 25, 30); HOME.t.set(-10, 0, 2); if (resize.m) { resize.m = 0; cam.position.copy(HOME.p); ctl.target.copy(HOME.t); } }
      }
      addEventListener('resize', resize); resize();
      let ro = null;
      if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(() => { resize(); start(); }); ro.observe(root); }   // pane shown/hidden by the tab bar
      const v3 = new THREE.Vector3();
      /** Screen-space labels (#211): keep every tag inside the canvas and stack a tag upward when two agents stand close. */
      const placedTags = [];
      function layoutTags(W) {
        placedTags.length = 0;
        for (const a of AG) {
          if (!a.tg) continue;
          if (!a._vis) { if (a.tg.style.display !== 'none') a.tg.style.display = 'none'; continue; }
          a.tg.style.display = '';
          const w = a.tg.offsetWidth || 60, h = a.tg.offsetHeight || 20;
          let x = a._tx, y = a._ty;
          x = Math.max(w / 2 + 4, Math.min(W - w / 2 - 4, x));   // never clipped by the canvas edge (phone, 390px)
          for (let n = 0; n < 8; n++) {
            const hit = placedTags.find((r) => Math.abs(r.x - x) * 2 < r.w + w + 6 && y > r.y - r.h - 4 && y - h < r.y + 4);
            if (!hit) break;
            y = hit.y - hit.h - 4;   // stack above the label it collided with
          }
          placedTags.push({ x, y, w, h });
          a.tg.style.transform = `translate(${x}px,${y}px) translate(-50%,-100%)`;
        }
      }
      function frame() {
        if (!running) return;
        if (document.hidden || !shown()) { running = false; last = now(); return; }   // paused: no simulation, no render, no rAF
        raf = requestAnimationFrame(frame);
        const t = now(), dt = Math.min(.05, t - last); last = t;
        const { W, H } = size();
        if (t - simAt > 1.4) { simAt = t; step(); hud(); }
        // slots
        const slot = { ask: 0, asks: AG.filter((a) => a.state === 'ask').length, lounge: 0, vip: 0, meet: 0, sleep: 0 };
        let woke = false;
        AG.forEach((a) => {
          if (!a.g) return;
          // the plan limit ran out: the agent gets up and walks back to its desk (liveRefresh then picks busy/idle)
          if (a.state === 'sleep' && a.sleepUntil && Date.now() > a.sleepUntil) { a.state = 'idle'; a.sleepUntil = 0; woke = true; }
          const s = { ask: slot.ask, asks: slot.asks, lounge: slot.lounge, vip: slot.vip, meet: slot.meet, sleep: slot.sleep };
          const tg = targetFor(a, s); if (tg.kind === 'box') slot.ask++; else if (tg.kind === 'lounge') slot.lounge++; else if (tg.kind === 'vip') slot.vip++; else if (tg.kind === 'meet') slot.meet++; else if (tg.kind === 'bed') slot.sleep++;
          if (a.tkey !== tg.key) { a.tkey = tg.key; a.tgt = tg; a.path = planPath(a, tg); a.pose = 'stand'; }
          // move
          const p = a.g.position; let moving = false;
          if (a.path.length) {
            const w = a.path[0], d = w.clone().sub(p); d.y = 0; const dist = d.length();
            if (dist < .12) { a.path.shift(); } else { moving = true; d.normalize(); p.addScaledVector(d, Math.min(dist, dt * (reduced ? 9 : 5))); const fy = Math.atan2(d.x, d.z); let dr = fy - a.g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); a.g.rotation.y += dr * Math.min(1, dt * 10); }
          }
          // keep clear of the round furniture (beanbags, reception, plant pots) while walking
          if (moving && !a.up) for (const [ox, oz, or] of OBS) { const rx = p.x - ox, rz = p.z - oz, rd = Math.hypot(rx, rz), m = or + .45; if (rd < m && rd > 1e-3) { const tx = -rz / rd, tz = rx / rd, w0 = a.path[0], s0 = Math.sign(tx * (w0.x - p.x) + tz * (w0.z - p.z)) || 1; p.x = ox + rx / rd * m + tx * s0 * .04; p.z = oz + rz / rd * m + tz * s0 * .04; } }
          if (!moving && a.tgt) { let dr = a.tgt.face - a.g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); a.g.rotation.y += dr * Math.min(1, dt * 8); a.pose = a.tgt.pose; }
          // pose
          const lie = !moving && a.pose === 'lie', sit = !moving && (a.pose === 'sit' || a.pose === 'nap'), w = t * 9 + AG.indexOf(a), typing = !moving && a.pose === 'sit' && (a.state === 'working');
          a.root.rotation.x += ((lie ? -Math.PI / 2 : 0) - a.root.rotation.x) * Math.min(1, dt * 6);
          const breathe = lie && !reduced ? Math.sin(t * 1.3 + w) * .015 : 0;
          if (stairIn(p.x, p.z)) { p.y = stairY(p.z); a.up = p.y > LOFT.h - .15 ? true : p.y < .05 ? false : a.up; } else p.y = a.up ? LOFT.h : 0; a.root.position.y = lie ? 1.24 + breathe : sit ? (a.pose === 'nap' ? -.7 : -.04) : (moving && !reduced ? Math.abs(Math.sin(w)) * .08 : 0);
          a.legs[0].rotation.x = lie ? 0 : sit ? -1.5 : (moving ? Math.sin(w) * .7 : 0); a.legs[1].rotation.x = lie ? 0 : sit ? -1.5 : (moving ? -Math.sin(w) * .7 : 0);
          const floorSit = sit && a.pose === 'nap'; a.legs[0].rotation.z += ((floorSit ? .28 : 0) - a.legs[0].rotation.z) * .3; a.legs[1].rotation.z += ((floorSit ? -.28 : 0) - a.legs[1].rotation.z) * .3;   // sitting on the floor: legs splayed
          const wave = !moving && a.pose === 'wave';
          a.arms[0].rotation.x = lie ? 0 : typing && !reduced ? -1.1 + Math.sin(t * 14 + w) * .18 : (moving ? -Math.sin(w) * .7 : (sit ? -.5 : 0));
          a.arms[1].rotation.x = lie ? 0 : typing && !reduced ? -1.1 + Math.cos(t * 13 + w) * .18 : (moving ? Math.sin(w) * .7 : (sit ? -.5 : 0));
          a.arms[1].rotation.z = wave ? -2.6 + (reduced ? 0 : Math.sin(t * 7) * .4) : 0;
          a.head.rotation.x = a.pose === 'nap' && !moving ? .45 + (reduced ? 0 : Math.sin(t * 1.6) * .05) : 0;
          a.bang.visible = a.state === 'ask' || a.state === 'error'; a.bang.material.color.set(a.state === 'error' ? 0xff9a3a : 0xff4b4b); a.bang.rotation.y = t * 2.5; a.bang.position.y = 3.5 + (reduced ? 0 : Math.sin(t * 4) * .15);
          // tag: project here, place after the pass so labels of agents standing close can stack (#211)
          v3.copy(p); v3.y = p.y + 3.5; v3.project(cam);
          a._vis = v3.z <= 1; a._tx = (v3.x * .5 + .5) * W; a._ty = (-v3.y * .5 + .5) * H;
          const key = meeting && a.state !== 'ask' && a.state !== 'sleep' ? 'meet' : a.state, S = st(key);
          let chip = S[0]; if (a.state === 'ask') chip += ' · ' + Math.floor(t - a.askedAt) + 's'; else if (a.state === 'sleep') chip = T('stat.sleepUntil', { t: fmtClock(a.sleepUntil) }) || S[0];
          if (a.cache.chip !== chip) { a.cache.chip = chip; a.tChip.textContent = chip; a.tChip.style.background = S[1]; }
          const tool = a.state === 'working' && !meeting ? '▸ ' + a.tool : ''; if (a.cache.tool !== tool) { a.cache.tool = tool; a.tTool.textContent = tool; a.tTool.style.display = tool ? '' : 'none'; }
          const sleeping = a.state === 'sleep', bub = sleeping ? (T('sleep.bubble') || '💤') : a.bub, on = sleeping || t < a.bubUntil;
          if (a.cache.on !== on) { a.cache.on = on; a.tSay.classList.toggle('on', on); } if (a.cache.bub !== bub) { a.cache.bub = bub; a.tSay.textContent = bub; }
          a.tg.classList.toggle('sel', focus === a.id); hint.style.display = focus ? 'none' : '';
        });
        layoutTags(W);
        if (woke && live) liveRefresh();
        // screens glow by activity
        AG.forEach((a, i) => { const sc = screens[i % screens.length]; if (sc) sc.material.emissive.set(a.state === 'working' && a.tgt && a.tgt.kind === 'desk' && !a.path.length ? 0x2a9d6f : 0x1d3a5a); });
        cube.position.y = 1.6 + (reduced ? 0 : Math.sin(t * 2) * .08); cube.rotation.y = t * .6;
        if (t - wallAt > 2) { wallAt = t; paintWall(); }
        if (chatDirty) { chatDirty = false; paintDock(); }
        if (panelDirty || t - (frame.pa || 0) > 1) { panelDirty = false; frame.pa = t; paintPanel(); }
        // camera
        if (goal) {
          const k = 1 - Math.exp(-dt * (goal.follow ? 6 : 3.2));
          if (goal.follow) { const a = goal.follow, h = a.g.position.clone(); h.y = 1.8; goal.t.copy(h); goal.p.copy(camOff(a, h)); }
          cam.position.lerp(goal.p, k); ctl.target.lerp(goal.t, k);
        }
        if (walk && keys.size) {
          const f = ctl.target.clone().sub(cam.position); f.y = 0; f.normalize(); const rt = new THREE.Vector3(-f.z, 0, f.x), m = new THREE.Vector3();
          if (keys.has('w') || keys.has('arrowup')) m.add(f); if (keys.has('s') || keys.has('arrowdown')) m.sub(f); if (keys.has('d') || keys.has('arrowright')) m.add(rt); if (keys.has('a') || keys.has('arrowleft')) m.sub(rt);
          m.multiplyScalar(dt * 9); const np = cam.position.clone().add(m); np.x = Math.max(-21, Math.min(21, np.x)); np.z = Math.max(-13, Math.min(14, np.z)); m.copy(np).sub(cam.position); cam.position.add(m); ctl.target.add(m);
        }
        ctl.update(); renderer.render(scene, cam);
      }
      hud(); stopLive = startLive(); frame(); loadI18n();
      // Pause the loop while the tab is hidden; restart it when the page comes back.
      const onVisible = () => { if (document.hidden) { running = false; cancelAnimationFrame(raf); } else { if (live) liveRefresh(); start(); } };
      document.addEventListener('visibilitychange', onVisible);
      const cleanup = () => {
        running = false; cancelAnimationFrame(raf);
        document.removeEventListener('visibilitychange', onVisible);
        removeEventListener('keydown', onKey); removeEventListener('keyup', onKeyUp); removeEventListener('resize', resize);
        if (ro) ro.disconnect();
        stopLive(); mqDark.removeEventListener('change', onDarkChange);
        renderer.dispose();
        try { renderer.forceContextLoss?.(); } catch (e) { /* older WebGL */ }
      };
      active = { root, stop: cleanup, unmount: unmountOffice };
      return active;
    }

    // No WebGL / no three.js: keep the HUD and chat alive, explain the scene.
    applyTheme(); hud(); chatDirty = false; panelDirty = false;
    paintDock(); paintPanel();
    stopLive = startLive(); loadI18n();
    active = { root, stop: () => stopLive(), unmount: unmountOffice };
    return active;
  }

  function unmountOffice() {
    if (!active) return;
    const { root, stop } = active;
    active = null;
    try { if (stop) stop(); } catch (e) { console.error('[office] teardown failed', e); }
    try { root.remove(); } catch (e) { /* already gone */ }
  }

  window.mountOffice = mountOffice;
  window.unmountOffice = unmountOffice;
})();
