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
 *
 * Expects window.THREE and THREE.OrbitControls (r128 UMD, vendored under ui/vendor/). Without WebGL, or without those
 * two files, the HUD and chat still render and an explanation replaces the scene — never a blank tab.
 * The render loop stops while the tab is hidden (document.hidden or the tab pane is display:none) and honours
 * prefers-reduced-motion, exactly like the demo.
 */
(function () {
  'use strict';

  const ST = { working: ['Đang làm', '#f5a524'], ask: ['Chờ bạn', '#ef4444'], done: ['Xong ✓', '#34d399'], idle: ['Đang nghỉ', '#94a3b8'], error: ['Lỗi', '#fb923c'], meet: ['Đang họp', '#60a5fa'] };
  const TOOLS = ['Edit ui/index.html', 'Read hub/server.ts', 'Bash npm test', 'Grep "flowTiers"', 'Write test/ui.test.ts', 'Playwright screenshot'];
  const WORKTXT = ['Sửa bố cục thẻ', 'Viết test cho luồng này', 'Gộp hai hàm giống nhau', 'Đọc lại yêu cầu', 'Kiểm lỗi hub treo', 'Dọn log cũ'];
  const ASKTXT = ['Giữ hay bỏ phần này?', 'Chọn cách nào đây?', 'Cần bạn duyệt trước khi sửa'];
  const DONETXT = ['Xong, đã commit', 'Test xanh hết', 'Đã gửi báo cáo'];
  const MOCK = [
    { id: 'lead', h: 'dieu-phoi', n: 'Điều phối', r: 'Phân việc, duyệt', tier: 2, c: '#7c6cf6' },
    { id: 'ui', h: 'giao-dien', n: 'Giao diện', r: 'Màn hình, kiểm bằng ảnh', tier: 3, c: '#2fb4ee' },
    { id: 'core', h: 'loi-hub', n: 'Lõi hub', r: 'Logic, API', tier: 3, c: '#7bbf1e' },
    { id: 'res', h: 'nghien-cuu', n: 'Nghiên cứu', r: 'Đọc repo, tìm lỗi', tier: 3, c: '#f0a020' },
    { id: 'qa', h: 'kiem-thu', n: 'Kiểm thử', r: 'Chạy test, xác nhận', tier: 3, c: '#18b3a3' },
    { id: 'w1', h: 'tho-a', n: 'Thợ code A', r: 'Viết code theo spec', tier: 4, c: '#4f8ff7' },
    { id: 'w2', h: 'tho-b', n: 'Thợ code B', r: 'Viết code theo spec', tier: 4, c: '#b36cf0' },
    { id: 'w3', h: 'tho-doc', n: 'Thợ đọc', r: 'Đọc file lớn, tóm tắt', tier: 5, c: '#f27a3a' },
    { id: 'w4', h: 'tho-don', n: 'Thợ dọn', r: 'Dọn log, hồ sơ', tier: 5, c: '#26c2de' },
  ];

  const TEMPLATE = `
<div class="stars" aria-hidden="true"></div>
<div id="of-stage"></div>
<div id="of-tags" aria-hidden="true"></div>
<div class="top">
  <div><h1>Bear Agent Office</h1><p class="sub">Kéo để xoay, cuộn để zoom, bấm vào một người để xem họ làm gì và nhắn riêng.</p></div>
  <div class="pills">
    <span class="pill"><i style="background:#f5a524"></i>Đang làm <b id="of-nWork">0</b></span>
    <span class="pill"><i style="background:#ef4444"></i>Chờ bạn <b id="of-nNeed">0</b></span>
    <span class="pill"><i style="background:#94a3b8"></i>Nghỉ <b id="of-nNap">0</b></span>
    <button id="of-bMeet" aria-pressed="false">Họp<kbd>M</kbd></button>
    <button id="of-bWalk" aria-pressed="false">Đi dạo<kbd>F</kbd></button><button id="of-bOver">Toàn cảnh<kbd>O</kbd></button>
    <button id="of-bTheme" aria-label="Đổi ngày hoặc đêm">Tự động</button>
  </div>
</div>
<section class="dock" id="of-dock" aria-label="Chat phòng">
  <header><b>#phòng-chung</b><span class="empty" id="of-mem"></span><button id="of-bDock" aria-label="Thu gọn hoặc mở chat" style="padding:0 9px">▾</button></header>
  <div class="msgs" id="of-msgs" aria-live="polite"></div>
  <form class="compose" id="of-form" autocomplete="off"><div class="sugg" id="of-sugg" hidden></div><input id="of-inp" placeholder="Nhắn cả phòng, gõ @ để gọi một agent" aria-label="Tin nhắn"><button type="submit" style="background:var(--hi);color:var(--onhi);border-color:var(--hi)">Gửi</button></form>
</section>
<aside class="panel" id="of-panel" hidden aria-label="Chi tiết agent"></aside>
<div class="toast" id="of-toast" hidden role="status"></div>
<div class="hint">Phím: F đi dạo · M họp · O toàn cảnh · C chat · Esc đóng</div>
<div id="of-fallback">Trình duyệt này không bật được WebGL nên không vẽ được cảnh 3D.</div>`;

  let active = null;

  function mountOffice(el, api) {
    if (!el || !el.appendChild) throw new Error('mountOffice(el, api): el must be an element');
    unmountOffice();
    api = api || {};

    const root = document.createElement('div');
    root.className = 'office';
    root.innerHTML = TEMPLATE;
    el.appendChild(root);

    const $ = (id) => root.querySelector('#' + id);
    const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    const pick = (a) => a[Math.floor(Math.random() * a.length)];
    const t0 = performance.now() / 1000, now = () => performance.now() / 1000 - t0;
    const fmtT = (s) => { const d = new Date(Date.now() - (now() - s) * 1000); return d.toLocaleTimeString('vi-VN', { hour12: false }); };

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
    const initialAgents = Array.isArray(api.agents) && api.agents.length ? api.agents : (live ? [] : MOCK);
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
      a.state = 'working'; a.until = now() + 9 + Math.random() * 9; a.tool = pick(TOOLS); const txt = pick(WORKTXT); a.bub = txt; a.bubUntil = now() + 3.5;
      const src = from || (a.tier > 3 ? pick(AG.filter((x) => x.tier === 3)) : by.lead) || a;
      post(src.id, [a.id], txt); alog(a, 'Nhận việc: ' + txt);
    }
    function finish(a) {
      const r = Math.random();
      if (r < .2) { a.state = 'ask'; a.askedAt = now(); a.until = now() + 60; const t = pick(ASKTXT); a.bub = t; a.bubUntil = now() + 4; post(a.id, ['you'], t, { ask: a.id }); alog(a, 'Hỏi bạn: ' + t); toast(a, a.n + ' đang chờ bạn'); }
      else if (r < .28) { a.state = 'error'; a.until = now() + 6; a.bub = 'Test đỏ ở 2 chỗ'; a.bubUntil = now() + 3.5; post(a.id, ['lead'], 'Test đỏ ở 2 chỗ'); alog(a, 'Lỗi: test đỏ'); }
      else { a.state = 'done'; a.until = now() + 5; const t = pick(DONETXT); a.bub = t; a.bubUntil = now() + 3.5; post(a.id, ['lead'], t); alog(a, t); a.ctx = Math.min(96, a.ctx + 6); }
    }
    function step() {
      if (paused || !simulated) return; const t = now();
      const busy = AG.filter((a) => a.state === 'working' || a.state === 'error').length;
      AG.forEach((a) => {
        if (a.state === 'working') { if (t > a.until) finish(a); else if (Math.random() < .2) { a.tool = pick(TOOLS); } }
        else if (a.state === 'error' && t > a.until) startWork(a);
        else if (a.state === 'done' && t > a.until) { a.state = 'idle'; a.until = t + 4 + Math.random() * 8; }
        else if (a.state === 'ask' && t > a.until) { a.state = 'idle'; a.until = t + 3; post('sys', [], a.n + ' không được trả lời, quay về nghỉ'); }
      });
      const idle = AG.filter((a) => a.state === 'idle' && t > a.until);
      if (busy < 5 && idle.length && Math.random() < .55) startWork(pick(idle));
      if (Math.random() < .18) { const x = pick(AG), others = AG.filter((z) => z !== x); if (!others.length) return; const y = pick(others); const tx = pick(['Cho mình xem file này', 'Cần bạn xem giúp', 'Đã xong phần của mình']); x.bub = tx; x.bubUntil = now() + 3; post(x.id, [y.id], tx); }
    }
    // start with a lively office — mock only: real agents must not be given invented states
    if (simulated) {
      [['ui', 'working'], ['core', 'working'], ['res', 'working'], ['w1', 'working'], ['qa', 'ask'], ['w3', 'done']].forEach(([id, s], i) => {
        const a = by[id]; if (!a) return;
        if (s === 'working') startWork(a);
        else if (s === 'ask') { a.state = 'ask'; a.askedAt = now() - i; a.until = now() + 60; a.bub = 'Giữ hay bỏ phần này?'; a.bubUntil = now() + 4; post(a.id, ['you'], a.bub, { ask: a.id }); }
        else { a.state = 'done'; a.until = now() + 5; }
      });
      AG.filter((a) => a.state === 'idle').forEach((a) => { a.until = now() + 3 + Math.random() * 10; });
    }
    if (Array.isArray(api.messages)) for (const m of api.messages) post(String(m.from ?? 'sys'), Array.isArray(m.to) ? m.to : [], String(m.text ?? ''), m.ask ? { ask: String(m.ask) } : {});

    /* ---------- chat UI ---------- */
    const mentionize = (txt) => esc(txt).replace(/@([a-z0-9-]+)/g, (m, h) => `<u>@${h}</u>`);
    const nameOf = (id) => id === 'you' ? 'Bạn' : id === 'sys' ? 'Hệ thống' : by[id] ? by[id].n : id;
    const colOf = (id) => id === 'you' ? 'var(--hi)' : by[id] ? by[id].c : '#999';
    function msgHtml(m) {
      const to = m.to && m.to.length ? m.to.map((i) => '@' + (i === 'you' ? 'bạn' : (by[i] ? by[i].h : i))).join(' ') : '';
      const body = (to ? `<u>${esc(to)}</u> ` : '') + mentionize(m.text);
      const opts = live
        ? `<button data-ans="${m.ask}" data-r="allow">Cho phép</button><button data-ans="${m.ask}" data-r="deny">Từ chối</button>`
        : `<button data-ans="${m.ask}" data-r="Giữ nguyên">Giữ nguyên</button><button data-ans="${m.ask}" data-r="Làm cách khác">Làm cách khác</button>`;
      const ans = m.ask && by[m.ask] && by[m.ask].state === 'ask' ? `<div class="opts">${opts}</div>` : '';
      return `<div class="m ${m.from === 'you' ? 'you' : ''} ${m.ask ? 'ask' : ''}"><div class="h"><i style="background:${colOf(m.from)}"></i><b>${esc(nameOf(m.from))}</b> ${fmtT(m.t)}</div><div class="t">${body}${ans}</div></div>`;
    }
    function paintMsgs(el, list, emptyTxt) {
      const stick = el.scrollTop + el.clientHeight >= el.scrollHeight - 30;
      el.innerHTML = list.slice(-60).map(msgHtml).join('') || `<div class="empty">${emptyTxt}</div>`;
      if (stick) el.scrollTop = el.scrollHeight;
    }
    const paintDock = () => paintMsgs($('of-msgs'), CHAT.filter((m) => !m.dm), live ? 'Phòng chưa có tin nào.' : 'Chưa có tin nào.');
    function answer(id, r) {
      if (live) return liveAnswer(id, r);   // the ask map, not the drawn state, decides
      const a = by[id]; if (!a || a.state !== 'ask') return;
      post('you', [id], r); alog(a, 'Bạn trả lời: ' + r); a.state = 'working'; a.until = now() + 8; a.tool = pick(TOOLS); a.bub = 'Nhận: ' + r; a.bubUntil = now() + 3; chatDirty = panelDirty = true;
    }
    root.addEventListener('click', (e) => { const b = e.target.closest('[data-ans]'); if (b) { answer(b.dataset.ans, b.dataset.r); } });

    // composer with @ suggestions (shared by the room and the agent panel)
    function mountComposer(form, inp, sugg, scopeId) {
      let items = [], idx = 0;
      const close = () => { sugg.hidden = true; items = []; };
      inp.addEventListener('input', () => {
        const m = /@([a-z0-9-]*)$/.exec(inp.value.slice(0, inp.selectionStart));
        if (!m) { close(); return; }
        items = [{ h: 'all', n: 'Cả phòng', c: '#999' }].concat(AG).filter((a) => a.h.startsWith(m[1]) || (a.n || '').toLowerCase().startsWith(m[1])); idx = 0;
        if (!items.length) { close(); return; }
        sugg.innerHTML = items.map((a, i) => `<button type="button" data-i="${i}" aria-selected="${i === 0}"><i style="background:${a.c}"></i>@${a.h} <span class="empty">${esc(a.n)}</span></button>`).join(''); sugg.hidden = false;
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
      if (!to.length) { post('sys', [], 'Gõ @ rồi chọn tên để gọi một agent.'); return; }
      to.forEach((id, k) => setTimeout(() => {
        if (!active || active.root !== root) return;
        const a = by[id]; if (!a) return;
        if (a.state === 'idle' || a.state === 'done' || a.state === 'ask') { a.state = 'working'; a.until = now() + 10; a.tool = pick(TOOLS); }
        a.bub = 'Nhận rồi'; a.bubUntil = now() + 3; alog(a, 'Bạn nhắn: ' + txt.slice(0, 60));
        setTimeout(() => { if (!active || active.root !== root) return; post(id, ['you'], 'Đã nhận, đang làm.'); }, 1400 + k * 300);
      }, 500 + k * 250));
    }
    mountComposer($('of-form'), $('of-inp'), $('of-sugg'), null);
    $('of-bDock').onclick = () => { $('of-dock').classList.toggle('closed'); };

    /* ---------- agent panel ---------- */
    let tab = 'chat';
    function paintPanel() {
      const p = $('of-panel'), a = focus && by[focus];
      if (!a) { p.hidden = true; return; }
      p.hidden = false;
      const S = ST[meeting && a.state !== 'ask' ? 'meet' : a.state];
      if (!p.dataset.id || p.dataset.id !== a.id) {
        p.dataset.id = a.id;
        p.innerHTML = `<header><div><div class="kick" id="of-pk"></div><h2>${esc(a.n)}</h2><span class="stchip" id="of-pst"></span></div><button id="of-pclose" aria-label="Đóng">✕</button></header>
    <div class="tabs" role="tablist"><button class="tab" role="tab" data-tab="chat">Chat</button><button class="tab" role="tab" data-tab="act">Hoạt động</button><button class="tab" role="tab" data-tab="det">Chi tiết</button></div><div class="pbody" id="of-pb"></div>`;
        $('of-pclose').onclick = closeFocus;
        p.querySelectorAll('.tab').forEach((b) => { b.onclick = () => { tab = b.dataset.tab; buildBody(); panelDirty = true; }; });
        buildBody();
      }
      $('of-pk').textContent = 'Tầng ' + a.tier + ' · ' + a.r; const st = $('of-pst'); st.textContent = S[0]; st.style.background = S[1];
      p.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', b.dataset.tab === tab));
      if (tab === 'chat') { paintMsgs($('of-pm'), CHAT.filter((m) => live ? m.dm === a.id : (m.from === a.id || (m.to || []).includes(a.id))), 'Chưa có tin nào với ' + esc(a.n) + '.'); }
      else if (tab === 'act') { $('of-pb').firstChild.innerHTML = (a.state === 'working' && a.tool ? `<div style="border-color:var(--hi)">▶ ${esc(a.tool)}</div>` : '') + a.log.map((l) => `<div>${fmtT(l.t)} ${esc(l.txt)}</div>`).join('') || '<div>Chưa có hoạt động</div>'; }
      else { $('of-pb').firstChild.innerHTML = `<dl><dt>Tầng</dt><dd>${a.tier}</dd><dt>Vai trò</dt><dd>${esc(a.r)}</dd><dt>Gọi bằng</dt><dd>@${a.h}</dd><dt>Trạng thái</dt><dd>${S[0]}</dd></dl><div><div class="empty">Cửa sổ ngữ cảnh ${a.ctx}%</div><div class="meter"><i style="width:${a.ctx}%"></i></div></div>`; }
    }
    function buildBody() {
      const a = by[focus], pb = $('of-pb');
      if (!a) return;
      if (tab === 'chat') { pb.className = 'pbody'; pb.innerHTML = `<div class="msgs" id="of-pm" aria-live="polite"></div><form class="compose" id="of-pf" autocomplete="off"><div class="sugg" id="of-ps" hidden></div><input id="of-pi" placeholder="Nhắn riêng cho ${esc(a.n)}" aria-label="Tin nhắn riêng"><button type="submit" style="background:var(--hi);color:var(--onhi);border-color:var(--hi)">Gửi</button></form>`; mountComposer($('of-pf'), $('of-pi'), $('of-ps'), () => focus); }
      else { pb.className = 'pbody single'; pb.innerHTML = `<div class="${tab === 'act' ? 'act' : 'det'}"></div>`; }
    }

    /* ---------- toast + hud ---------- */
    let toastTimer = 0, toastFor = null;
    function toast(a, txt) { const t = $('of-toast'); t.textContent = '✋ ' + txt; t.hidden = false; toastFor = a.id; clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 5000); }
    $('of-toast').onclick = () => { if (toastFor) setFocus(toastFor); $('of-toast').hidden = true; };
    function toastMsg(t) { const e = $('of-toast'); e.textContent = t; e.hidden = false; toastFor = null; clearTimeout(toastTimer); toastTimer = setTimeout(() => { e.hidden = true; }, 3500); }
    function hud() { const c = { w: 0, n: 0, z: 0 }; AG.forEach((a) => { if (a.state === 'working' || a.state === 'error') c.w++; else if (a.state === 'ask') c.n++; else c.z++; }); $('of-nWork').textContent = c.w; $('of-nNeed').textContent = c.n; $('of-nNap').textContent = c.z; $('of-mem').textContent = AG.length + ' agent'; }

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

    /** Sessions of the room -> the AG entries the scene draws. State law: a pending permission = ask, a plan limit = error, busy = working, a done notice under 3 min = done, else idle. */
    function liveAgents(sessions, tiers, lead) {
      return sessions.filter((s) => Array.isArray(s.rooms) && s.rooms.includes(live.room)).map((s) => {
        const done = doneAt.get(s.name);
        let state = 'idle';
        if (asks.has(s.id)) state = 'ask';
        else if (s.limited && Number(s.limited.until) > Date.now()) state = 'error';
        else if (s.status === 'busy') state = 'working';
        else if (done && Date.now() - done < 180_000) state = 'done';
        return {
          id: s.id, h: handleOf(s.name), n: s.name, r: s.activity || s.ide || 'agent',
          tier: Number(tiers[String(s.name).toLowerCase()]) || (s.id === lead ? 2 : 3),
          c: `hsl(${hue(s.name)},62%,55%)`, s, state, tool: s.activity || '', ctx: Math.min(96, Math.round((Number(s.ctx) || 0) / 2000)),
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
        alog(a, m.kind === 'system' ? mm.text : 'msg: ' + mm.text.slice(0, 60));
      }
      chatDirty = panelDirty = true;
    }

    function liveAnswer(id, r) {
      const req = asks.get(id); if (!req) { toastMsg('Yêu cầu này đã được trả lời hoặc hết hạn.'); return; }
      hubJson(`/api/permissions/${enc(req.id)}`, { method: 'POST', body: { allow: r === 'allow' } })
        .then(() => { asks.delete(id); if (by[id]) by[id].state = 'working'; liveRefresh(); })
        .catch((e) => toastMsg('Không trả lời được: ' + e.message));
    }

    function liveSend(txt, scope) {
      const a = scope && by[scope];
      const sendTo = (room) => hubJson(`/api/rooms/${enc(room)}/messages`, { method: 'POST', body: { text: txt } })
        .then((res) => { if (res && res.message) ingest({ ...res.message, room }, a ? a.id : null); })
        .catch((e) => toastMsg('Gửi lỗi: ' + e.message));
      if (!a) return sendTo(live.room);
      const room = dmOf.get(a.id);
      if (room) return sendTo(room);
      return hubJson(`/api/rooms/dm/${enc(a.id)}`, { method: 'POST' })
        .then((r) => { dmOf.set(a.id, r.name); return sendTo(r.name); })
        .catch((e) => toastMsg('Chưa mở được chat riêng: ' + e.message));
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
          post(id, ['you'], 'Xin quyền dùng ' + p.tool, { ask: id });   // in the room dock: the person can answer without opening the agent
          a.askedAt = now(); alog(a, 'Xin quyền: ' + p.tool);
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
    const why = !THREE ? 'Không tải được three.js (ui/vendor/three.min.js).' : !THREE.OrbitControls ? 'Không tải được OrbitControls (ui/vendor/OrbitControls.js).' : '';
    let renderer;
    if (!why) { try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch (e) { renderer = undefined; } }
    const fallback = $('of-fallback');
    if (!renderer) { fallback.textContent = why || 'Trình duyệt này không bật được WebGL nên không vẽ được cảnh 3D.'; fallback.style.display = 'grid'; }

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
      const HOME = { p: new THREE.Vector3(-7, 25, 31), t: new THREE.Vector3(-6, 0, 1) }, MEET = { p: new THREE.Vector3(14, 14, 19), t: new THREE.Vector3(14.5, 0, 7) };
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
      box(.45, 8, 16, 0xfbe9a8, 23, 3.75, -7, scene, false); box(14, 8, .5, 0xfbe0a0, 16, 3.75, -14.8, scene, false); // lounge yellow
      box(14, .06, 14, 0xf0b27a, 15, .03, -8, scene, false); box(14, .06, 12, 0xe9a36b, 14, .03, 8.5, scene, false);
      box(9, .06, 7, 0x8b5fd0, -13.5, .03, 7.5, scene, false);
      // meeting room partitions (door gap at left of the back wall)
      box(10, 2.4, .3, 0xa9cf6a, 18.2, 1.2, 3); box(.3, 2.4, 7, 0xa9cf6a, 8, 1.2, 8.6);
      // windows + wall screen + neon
      box(7, 3.6, .2, 0x79c2f0, -14, 5, -14.7, scene, false, { emissive: 0x2a5f88 }); box(.2, 3.6, 7, 0x79c2f0, -22.7, 5, -4, scene, false, { emissive: 0x2a5f88 });
      const neon = canvasTex(512, 128, (x, w, h) => { x.fillStyle = '#160b24'; x.fillRect(0, 0, w, h); x.font = '700 46px Fredoka,sans-serif'; x.textAlign = 'center'; x.shadowColor = '#ff4fa8'; x.shadowBlur = 18; x.fillStyle = '#ff9fd2'; x.fillText('BEAR AGENT OFFICE', w / 2, 78); });
      box(8, 2, .2, 0x160b24, -7.5, 5.6, -14.6, scene, false).material = new THREE.MeshBasicMaterial({ map: neon.t });
      const wall = canvasTex(512, 256, () => {}); const wallMesh = box(8.5, 4.2, .2, 0x0b1220, 5, 4.6, -14.6, scene, false); wallMesh.material = new THREE.MeshBasicMaterial({ map: wall.t });
      function paintWall() {
        const x = wall.x; x.fillStyle = '#0a1222'; x.fillRect(0, 0, 512, 256); x.fillStyle = '#35e0a1'; x.font = '700 20px Consolas,monospace'; x.fillText('LUỒNG TRỰC TIẾP', 16, 30); x.font = '16px Consolas,monospace';
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
      [[-17, 6.5, 0xff6fae], [-14.5, 9.5, 0x4fd16a], [-11.5, 6, 0xffd23f]].forEach(([x, z, c]) => { sph(1.35, c, x, .85, z, scene, .7); });
      box(4.4, .9, 1.6, 0x2aa79a, -9.5, .5, 11.6); box(4.4, 1.3, .35, 0x2aa79a, -9.5, 1.3, 12.3);
      box(1.6, 3.2, 1.4, 0x6c3ec1, -21.5, 1.6, 2); box(1.3, .9, .1, 0x77f0ff, -21.5, 2.5, 1.28, scene, false, { emissive: 0x33aacc });
      box(4.6, .14, 2.6, 0x1e7a52, 2.6, 1.15, 9); box(4.6, .3, .04, 0xffffff, 2.6, 1.35, 9, scene, false);[[-2, -1], [2, -1], [-2, 1], [2, 1]].forEach(([dx, dz]) => box(.12, 1.1, .12, 0x2c2c38, 2.6 + dx, .55, 9 + dz, scene, false));
      // meeting room: long table + chairs + TV
      box(8.2, .2, 2.6, 0x6b4226, 15, 1.15, 7.5); box(1, 1.1, 1, 0x4a2c18, 15, .55, 7.5, scene, false);
      const MEETSEATS = [];
      [12, 14, 16, 18].forEach((x) => {[[5.4, 0], [9.6, Math.PI]].forEach(([z, f]) => { box(1.1, .14, 1.1, [0xff7043, 0x26a69a, 0x7e57c2, 0x37474f][(x / 2) % 4], x, .62, z); box(1.1, 1.1, .14, 0x37474f, x, 1.25, z + (z < 7 ? -.55 : .55), scene, false); MEETSEATS.push({ x, z: z < 7 ? 5.7 : 9.3, face: f }); }); });
      MEETSEATS.push({ x: 10.5, z: 7.5, face: Math.PI / 2 });
      box(.2, 3, 5, 0x14192a, 22.4, 3, 8.5, scene, true, { emissive: 0x14325a, emissiveIntensity: .4 });
      // living room: couch, tv unit, rug, plants
      box(4.6, .9, 1.7, 0x9bd6b8, 15, .5, -9.6); box(4.6, 1.3, .4, 0x9bd6b8, 15, 1.3, -10.4); box(3, 1.2, .8, 0x8a5a2b, 17.5, .6, -13.8); box(1.8, 1, .12, 0x161b2b, 17.5, 1.9, -13.7);
      [[-21, -13], [21, -13], [-21, 13], [7, 13.5]].forEach(([x, z]) => { cyl(.5, .4, .7, 0xa8632f, x, .35, z, scene, 12); sph(.9, 0x2f9d63, x, 1.5, z); });
      // agents
      function makeAgent(hex) {
        const col = new THREE.Color(hex), light = col.clone().lerp(new THREE.Color(0xffffff), .55);
        const g = new THREE.Group(), rootG = new THREE.Group(); g.add(rootG); g.userData.root = rootG;
        const legs = [-1, 1].map((s) => { const l = new THREE.Group(); l.position.set(s * .22, .95, 0); const m = new THREE.Mesh(new THREE.CylinderGeometry(.16, .15, .9, 10), L(hex)); m.position.y = -.45; m.castShadow = true; outline(m, .04); l.add(m); rootG.add(l); return l; });
        const torso = new THREE.Mesh(new THREE.CylinderGeometry(.36, .44, 1, 14), L(hex)); torso.position.y = 1.45; torso.castShadow = true; outline(torso, .04); rootG.add(torso);
        const arms = [-1, 1].map((s) => { const a = new THREE.Group(); a.position.set(s * .52, 1.85, 0); const m = new THREE.Mesh(new THREE.CylinderGeometry(.12, .11, .8, 10), L(hex)); m.position.y = -.38; m.castShadow = true; outline(m, .035); a.add(m); rootG.add(a); return a; });
        const head = new THREE.Group(); head.position.y = 2.55; rootG.add(head);
        const hm = new THREE.Mesh(new THREE.SphereGeometry(.6, 22, 16), L(light)); hm.scale.y = 1.08; hm.castShadow = true; outline(hm, .05); head.add(hm);
        [-1, 1].forEach((s) => {
          const e = new THREE.Mesh(new THREE.SphereGeometry(.2, 14, 10), L(0xffffff)); e.position.set(s * .25, .08, .5); head.add(e);
          const p = new THREE.Mesh(new THREE.SphereGeometry(.09, 10, 8), L(0x111111)); p.position.set(s * .25, .06, .67); head.add(p);
          const cup = new THREE.Mesh(new THREE.CylinderGeometry(.2, .2, .14, 14), L(0x2e3350)); cup.rotation.z = Math.PI / 2; cup.position.set(s * .62, 0, 0); head.add(cup);
        });
        const band = new THREE.Mesh(new THREE.TorusGeometry(.63, .05, 8, 22, Math.PI), L(0x2e3350)); band.position.y = 0; head.add(band);
        const mic = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), L(0x2e3350)); mic.position.set(.42, -.32, .5); head.add(mic);
        const mouth = new THREE.Mesh(new THREE.BoxGeometry(.28, .05, .04), L(0x3a1620)); mouth.position.set(0, -.22, .58); head.add(mouth);
        const bang = new THREE.Mesh(new THREE.OctahedronGeometry(.24), new THREE.MeshBasicMaterial({ color: 0xff4b4b })); bang.position.y = 3.5; bang.visible = false; rootG.add(bang);
        g.scale.setScalar(.72); return { g, root: rootG, legs, arms, head, bang };
      }
      function addAgentMesh(a) {
        if (a.g) return;
        Object.assign(a, makeAgent(a.c));
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
      // targets + paths
      const V = (x, z) => new THREE.Vector3(x, 0, z);
      function targetFor(a, slot) {
        if (meeting) return { kind: 'meet', pos: V(MEETSEATS[slot.meet % MEETSEATS.length].x, MEETSEATS[slot.meet % MEETSEATS.length].z), face: MEETSEATS[slot.meet % MEETSEATS.length].face, pose: 'sit', key: 'm' + slot.meet };
        const i = AG.indexOf(a);
        if (a.state === 'working' || a.state === 'error') { const s = SEATS[i % SEATS.length]; return { kind: 'desk', pos: V(s.x, s.z), col: s.col, face: Math.PI, pose: 'sit', key: 'd' + i }; }
        if (a.state === 'ask') { const ang = (Math.PI * .18) + slot.ask * (Math.PI * .64 / Math.max(1, slot.asks - 1 || 1)); const r = 2.9; return { kind: 'box', pos: V(BOX.x + Math.cos(ang) * r * 1.0, BOX.z + Math.sin(ang) * r), face: Math.atan2(-Math.cos(ang), -Math.sin(ang)), pose: 'wave', key: 'b' + slot.ask }; }
        const ring = [[-14, 7.5], [-16, 9.2], [-12, 9.6], [-17.5, 6], [-11, 5.6], [-14.5, 5.3], [-9.6, 8.3], [-18, 8.6], [-13, 11]][slot.lounge % 9];
        return { kind: 'lounge', pos: V(ring[0], ring[1]), face: Math.atan2(-14 - ring[0], 7.5 - ring[1]) + Math.PI, pose: a.state === 'idle' ? 'nap' : 'stand', key: 'l' + slot.lounge };
      }
      function planPath(a, t) {
        const p = a.g.position, pts = [];
        if (p.z < .4) pts.push(V(p.x, .8));
        else if (p.x > 8.3 && p.z > 2.6) { pts.push(V(9.5, p.z > 7.5 ? 9.8 : 5.6)); pts.push(V(9.5, 5.6)); pts.push(V(9.5, .8)); }
        if (t.kind === 'desk') { pts.push(V(t.col, .8)); pts.push(t.pos); }
        else if (t.kind === 'meet') { pts.push(V(9.5, .8)); pts.push(V(9.5, 5.6)); if (t.pos.z > 7.5) pts.push(V(9.5, 9.8)); pts.push(t.pos); }
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
      $('of-bMeet').onclick = () => { walk = false; $('of-bWalk').setAttribute('aria-pressed', 'false'); meeting = !meeting; $('of-bMeet').setAttribute('aria-pressed', meeting); if (meeting) { focus = null; $('of-panel').hidden = true; flyTo(MEET); post('sys', [], 'Họp cả phòng: mọi agent về bàn họp.'); } else flyTo(HOME); };
      $('of-bTheme').onclick = () => { themeI = (themeI + 1) % 3; const m = ['', 'light', 'dark'][themeI]; m ? root.setAttribute('data-theme', m) : root.removeAttribute('data-theme'); $('of-bTheme').textContent = ['Tự động', 'Ban ngày', 'Ban đêm'][themeI]; applyTheme(); };
      function setWalk(on) { walk = on; $('of-bWalk').setAttribute('aria-pressed', on); if (on) { meeting = false; $('of-bMeet').setAttribute('aria-pressed', 'false'); if (focus) closeFocus(); flyTo({ p: new THREE.Vector3(-3, 5.5, 18), t: new THREE.Vector3(-3, 2.2, 6) }); setTimeout(() => { if (walk) goal = null; }, 1800); toastMsg('Đi dạo: W A S D để đi, kéo chuột để quay đầu'); } else flyTo(HOME); }
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
        if (W < 760) { HOME.p.set(0, 66, 76); HOME.t.set(0, 0, 2); if (!resize.m) { resize.m = 1; cam.position.copy(HOME.p); ctl.target.copy(HOME.t); $('of-dock').classList.add('closed'); } }
        else { HOME.p.set(-7, 25, 31); HOME.t.set(-6, 0, 1); if (resize.m) { resize.m = 0; cam.position.copy(HOME.p); ctl.target.copy(HOME.t); } }
      }
      addEventListener('resize', resize); resize();
      let ro = null;
      if (typeof ResizeObserver === 'function') { ro = new ResizeObserver(() => { resize(); start(); }); ro.observe(root); }   // pane shown/hidden by the tab bar
      const v3 = new THREE.Vector3();
      function frame() {
        if (!running) return;
        if (document.hidden || !shown()) { running = false; last = now(); return; }   // paused: no simulation, no render, no rAF
        raf = requestAnimationFrame(frame);
        const t = now(), dt = Math.min(.05, t - last); last = t;
        const { W, H } = size();
        if (t - simAt > 1.4) { simAt = t; step(); hud(); }
        // slots
        const slot = { ask: 0, asks: AG.filter((a) => a.state === 'ask').length, lounge: 0, meet: 0 };
        AG.forEach((a) => {
          if (!a.g) return;
          const s = { ask: slot.ask, asks: slot.asks, lounge: slot.lounge, meet: slot.meet };
          const tg = targetFor(a, s); if (tg.kind === 'box') slot.ask++; else if (tg.kind === 'lounge') slot.lounge++; else if (tg.kind === 'meet') slot.meet++;
          if (a.tkey !== tg.key) { a.tkey = tg.key; a.tgt = tg; a.path = planPath(a, tg); a.pose = 'stand'; }
          // move
          const p = a.g.position; let moving = false;
          if (a.path.length) {
            const w = a.path[0], d = w.clone().sub(p); d.y = 0; const dist = d.length();
            if (dist < .12) { a.path.shift(); } else { moving = true; d.normalize(); p.addScaledVector(d, Math.min(dist, dt * (reduced ? 9 : 5))); const fy = Math.atan2(d.x, d.z); let dr = fy - a.g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); a.g.rotation.y += dr * Math.min(1, dt * 10); }
          }
          if (!moving && a.tgt) { let dr = a.tgt.face - a.g.rotation.y; dr = Math.atan2(Math.sin(dr), Math.cos(dr)); a.g.rotation.y += dr * Math.min(1, dt * 8); a.pose = a.tgt.pose; }
          // pose
          const sit = !moving && (a.pose === 'sit' || a.pose === 'nap'), w = t * 9 + AG.indexOf(a), typing = !moving && a.pose === 'sit' && (a.state === 'working');
          a.root.position.y = sit ? (a.pose === 'nap' ? .1 : -.04) : (moving && !reduced ? Math.abs(Math.sin(w)) * .08 : 0);
          a.legs[0].rotation.x = sit ? -1.5 : (moving ? Math.sin(w) * .7 : 0); a.legs[1].rotation.x = sit ? -1.5 : (moving ? -Math.sin(w) * .7 : 0);
          const wave = !moving && a.pose === 'wave';
          a.arms[0].rotation.x = typing && !reduced ? -1.1 + Math.sin(t * 14 + w) * .18 : (moving ? -Math.sin(w) * .7 : (sit ? -.5 : 0));
          a.arms[1].rotation.x = typing && !reduced ? -1.1 + Math.cos(t * 13 + w) * .18 : (moving ? Math.sin(w) * .7 : (sit ? -.5 : 0));
          a.arms[1].rotation.z = wave ? -2.6 + (reduced ? 0 : Math.sin(t * 7) * .4) : 0;
          a.head.rotation.x = a.pose === 'nap' && !moving ? .45 + (reduced ? 0 : Math.sin(t * 1.6) * .05) : 0;
          a.bang.visible = a.state === 'ask' || a.state === 'error'; a.bang.material.color.set(a.state === 'error' ? 0xff9a3a : 0xff4b4b); a.bang.rotation.y = t * 2.5; a.bang.position.y = 3.5 + (reduced ? 0 : Math.sin(t * 4) * .15);
          // tag
          v3.copy(p); v3.y = 3.5; v3.project(cam);
          if (v3.z > 1) { a.tg.style.display = 'none'; } else { a.tg.style.display = ''; a.tg.style.transform = `translate(${(v3.x * .5 + .5) * W}px,${(-v3.y * .5 + .5) * H}px) translate(-50%,-100%)`; }
          const key = meeting && a.state !== 'ask' ? 'meet' : a.state, S = ST[key];
          let chip = S[0]; if (a.state === 'ask') chip += ' · ' + Math.floor(t - a.askedAt) + 's';
          if (a.cache.chip !== chip) { a.cache.chip = chip; a.tChip.textContent = chip; a.tChip.style.background = S[1]; }
          const tool = a.state === 'working' && !meeting ? '▸ ' + a.tool : ''; if (a.cache.tool !== tool) { a.cache.tool = tool; a.tTool.textContent = tool; a.tTool.style.display = tool ? '' : 'none'; }
          const on = t < a.bubUntil; if (a.cache.on !== on) { a.cache.on = on; a.tSay.classList.toggle('on', on); } if (a.cache.bub !== a.bub) { a.cache.bub = a.bub; a.tSay.textContent = a.bub; }
          a.tg.classList.toggle('sel', focus === a.id); hint.style.display = focus ? 'none' : '';
        });
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
      hud(); stopLive = startLive(); frame();
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
    stopLive = startLive();
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
