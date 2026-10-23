// Office 4 (trial): the scene of linhvvn/ai-office (MIT, see LICENSE-ai-office.txt) fed with this hub's sessions.
// mountOffice4(el, { room, base, token, onPick(sessionId)? }) -> { unmount }. Quality starts on "low"; the button in the HUD cycles it.
import { Office3D, QUALITY } from './office3d.js';

const LAYOUT = [   // positions and styles of the ai-office floor; names and the tier-to-zone map are ours
  { id: 'thiet-ke', color: '#4d6189', x: -8.6, z: -6.3, w: 8.6, d: 6.4, style: { shape: 'zone', screenTheme: 'design', seed: 11 } },
  { id: 'chien-luoc', color: '#8a7db3', x: 8.2, z: -6.3, w: 7.4, d: 6.4, style: { shape: 'zone', screenTheme: 'charts', seed: 23 } },
  { id: 'ky-thuat', color: '#8c9b6b', x: -8.6, z: 4.9, w: 8.6, d: 6.4, style: { shape: 'zone', screenTheme: 'code', seed: 37 } },
  { id: 'san-xuat-noi-dung', color: '#b9745a', x: 8.2, z: 4.9, w: 7.4, d: 6.4, style: { shape: 'zone', screenTheme: 'media', seed: 41 } },
  { id: 'dieu-phoi', color: '#2f3033', x: 0, z: -0.7, w: 8.4, d: 8.4, style: { shape: 'lounge', screenTheme: 'docs', seed: 53 } },
  { id: 'khach-hang', color: '#6d7a8c', x: -16.1, z: -0.6, w: 3.6, d: 6.6, style: { shape: 'room', screenTheme: 'docs', seed: 61 } },
  { id: 'san-xuat-phim', color: '#8c6d7a', x: 15.1, z: -0.4, w: 5.6, d: 6.4, style: { shape: 'room', meeting: true, screenTheme: 'media', seed: 67 } },
  { id: 'ca-phe', color: '#6b4a34', x: -9.4, z: 11.35, w: 11.4, d: 4.0, style: { shape: 'cafe', seed: 71 } },
  { id: 'giai-tri', color: '#2a2f6b', x: 9.4, z: 11.35, w: 11.4, d: 4.0, style: { shape: 'game', seed: 73 } },
  { id: 'khu-nghi', color: '#3d4657', x: 0, z: 8.3, w: 5.8, d: 4.0, style: { shape: 'rest', label: 'Khu nghỉ', seed: 79 } },   // #225: giường cho agent hết hạn mức; lùi khỏi trục cửa kính, nằm giữa hai khu tầng 5
];
const ZONE_TIER = { 'dieu-phoi': 2, 'thiet-ke': 3, 'chien-luoc': 4, 'ky-thuat': 5, 'san-xuat-noi-dung': 5 }, FIXED = { 'khach-hang': 'Phòng trưởng phòng', 'san-xuat-phim': 'Phòng họp', 'ca-phe': 'Cà phê', 'giai-tri': 'Giải trí', 'khu-nghi': 'Khu nghỉ' };
const SEATS = 8;   // one bench cluster of the zone
const enc = encodeURIComponent;
const lower = (s) => String(s).toLowerCase();

/** The room lead sits in the left private room, tiers 1 and 2 in the lounge (the right private room is the meeting room), 3 and 4 get their own zone, 5 and up fill two zones of 8. */
function zoneFor(tier, nth, lead) {
  if (lead) return 'khach-hang';
  if (tier <= 2) return 'dieu-phoi';
  if (tier === 3) return 'thiet-ke';
  if (tier === 4) return 'chien-luoc';
  return nth < SEATS ? 'ky-thuat' : 'san-xuat-noi-dung';
}

export function mountOffice4(el, api) {
  const base = api.base || location.origin, headers = api.token ? { 'x-room-token': api.token } : {};
  const hub = (p) => fetch(base + p, { headers }).then((r) => { if (!r.ok) throw new Error(p + ' ' + r.status); return r.json(); });
  const names = () => { try { return JSON.parse(localStorage.getItem('bear-agent-manager:flowTierNames') || '{}')[api.room] || {}; } catch { return {}; } };

  const host = document.createElement('div');
  host.style.cssText = 'position:relative;flex:1;min-width:0;height:100%;background:#05070d;overflow:hidden';
  const hud = document.createElement('div');
  hud.style.cssText = 'position:absolute;left:16px;top:16px;z-index:3;max-width:320px;padding:12px 14px;border-radius:14px;background:rgba(14,17,26,.82);color:#eef0f6;font:13px/1.4 system-ui,sans-serif;border:1px solid rgba(255,255,255,.1)';
  const loading = document.createElement('div');
  loading.style.cssText = 'position:absolute;inset:0;display:grid;place-items:center;z-index:4;background:#05070d;color:#9aa3b8;font:14px system-ui,sans-serif';
  loading.textContent = '…';
  const bar = document.createElement('div');
  bar.style.cssText = 'position:absolute;right:16px;bottom:16px;z-index:3;display:flex;gap:8px';
  const btn = (label, fn) => { const b = document.createElement('button'); b.textContent = label; b.style.cssText = 'font:inherit;color:#eef0f6;background:rgba(14,17,26,.82);border:1px solid rgba(255,255,255,.12);border-radius:10px;padding:7px 12px;cursor:pointer'; b.onclick = fn; bar.append(b); return b; };
  // #226: thẻ nổi mở khi bấm một agent — tên, tầng, trạng thái, hoạt động, nút Chat riêng
  const cardStyle = document.createElement('style');
  cardStyle.textContent = '.o4card{position:absolute;right:16px;top:16px;z-index:3;width:252px;padding:12px 14px;border-radius:14px;background:rgba(14,17,26,.9);color:#eef0f6;font:13px/1.45 system-ui,sans-serif;border:1px solid rgba(255,255,255,.12);box-shadow:0 10px 30px rgba(0,0,0,.35)}'
    + '.o4card[hidden]{display:none}.o4card h3{margin:0;font-size:15px;font-weight:600;padding-right:24px}'
    + '.o4card .o4x{position:absolute;right:8px;top:8px;width:24px;height:24px;padding:0;border-radius:8px;border:1px solid rgba(255,255,255,.14);background:transparent;color:#cfd6e6;font:14px/1 system-ui,sans-serif;cursor:pointer}'
    + '.o4card .o4meta{margin-top:2px;color:#9aa3b8;font-size:12px}'
    + '.o4card .o4row{margin-top:8px}.o4card .o4st{display:inline-block;border-radius:999px;padding:1px 8px;font-size:12px;font-weight:600;color:#0e111a}'
    + '.o4card .o4act{margin-top:8px;color:#cfd6e6;overflow-wrap:anywhere}'
    + '.o4card .o4chat{margin-top:12px;width:100%;padding:7px 12px;border:0;border-radius:10px;background:#e8c880;color:#1a1c24;font:inherit;font-weight:600;cursor:pointer}'
    + '@media(max-width:700px){.o4card{left:12px;right:12px;top:auto;bottom:64px;width:auto}}';
  const card = document.createElement('div');
  card.className = 'o4card'; card.hidden = true;
  card.setAttribute('role', 'group'); card.setAttribute('aria-label', 'Chi tiết agent');
  card.innerHTML = '<button class="o4x" aria-label="Đóng">✕</button><h3></h3><div class="o4meta"></div><div class="o4row"><span class="o4st"></span></div><div class="o4act"></div><button class="o4chat">Chat riêng</button>';
  host.append(loading, hud, bar, cardStyle, card);
  el.replaceChildren(host);

  let dead = false, office = null, timer = 0, es = null, soon = 0, refreshing = false;
  const state = { sessions: [], tiers: {}, perms: new Set(), lead: '' };
  let picked = '', shown = [];
  const ST = { working: ['Đang làm', '#ffd38a'], waiting: ['Chờ bạn', '#ff9a4d'], idle: ['Rảnh', '#94a3b8'], offline: ['Ngủ', '#818cf8'] };
  /** Vẽ lại thẻ đang mở; agent biến mất khỏi phòng thì đóng thẻ */
  const paintCard = () => {
    const a = picked && shown.find((x) => x.id === picked);
    if (!a) { card.hidden = true; return; }
    card.hidden = false;
    card.querySelector('h3').textContent = a.name;
    card.querySelector('.o4meta').textContent = `Tầng ${a.tier}${a.lead ? ' · Trưởng phòng' : ''}`;
    const st = ST[a.status] || ST.idle, chip = card.querySelector('.o4st');
    chip.textContent = a.status === 'offline' && a.sleepUntil ? `Ngủ · dậy ${wakeText(a.sleepUntil)}` : st[0];
    chip.style.background = st[1];
    card.querySelector('.o4act').textContent = a.role || 'Chưa có hoạt động';
    card.querySelector('.o4chat').dataset.id = a.id;
  };
  const closeCard = () => { picked = ''; card.hidden = true; office?.select?.(''); };
  card.querySelector('.o4x').onclick = closeCard;
  card.querySelector('.o4chat').onclick = (e) => { const id = e.currentTarget.dataset.id; if (id && api.onPick) api.onPick(id); };
  const onKey = (e) => { if (e.key === 'Escape' && !card.hidden) closeCard(); };
  window.addEventListener('keydown', onKey);

  const toData = () => {
    const nm = names(), perTier = {}, now = Date.now();
    const rows = state.sessions.filter((s) => Array.isArray(s.rooms) && s.rooms.includes(api.room)).sort((a, b) => a.name.localeCompare(b.name));
    const agents = rows.map((s) => {
      const lead = s.id === state.lead, tier = Number(state.tiers[lower(s.name)]) || 3, nth = lead ? 0 : perTier[tier] = (perTier[tier] ?? -1) + 1;
      const until = Number(s.limited && s.limited.until) || 0;
      const status = state.perms.has(s.id) ? 'waiting' : s.status === 'busy' ? 'working' : until > now ? 'offline' : 'idle';
      return { id: s.id, name: s.name, role: s.activity || '', departmentId: zoneFor(tier, nth, lead), provider: 'claude-code', status, tier, lead: s.id === state.lead, sleepUntil: until > now ? until : 0 };
    });
    const label = (d) => FIXED[d.id] || nm[ZONE_TIER[d.id]] || `Tầng ${ZONE_TIER[d.id]}`;   // #249: hai khu tầng 5 cùng đọc "Tầng 5"; hậu tố "(2)" cũ làm nhãn chạm mép thảm ở 390
    const departments = LAYOUT.map((d) => ({ ...d, name: label(d), style: { ...d.style, label: label(d) } }));
    return { departments, agents };
  };

  /** Giờ dậy: chỉ giờ:phút nếu còn hôm nay, kèm ngày nếu sang ngày khác */
  const wakeText = (ts) => {
    const d = new Date(ts), n = new Date();
    const hm = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    return d.toDateString() === n.toDateString() ? hm : `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')} ${hm}`;
  };

  const paintHud = (agents) => {
    const n = (k) => agents.filter((a) => a.status === k).length, w = agents.find((a) => a.status === 'working');
    const sleepers = agents.filter((a) => a.status === 'offline');
    hud.replaceChildren();
    const h = document.createElement('div'); h.style.cssText = 'font-size:16px;font-weight:600'; h.textContent = w ? `${w.name} đang làm` : 'Cả nhà đang rảnh';
    const c = document.createElement('div'); c.style.cssText = 'margin-top:4px;color:#e8c880;font-weight:600'; c.textContent = `Đang làm ${n('working')} · Chờ bạn ${n('waiting')} · Rảnh ${n('idle')} · Ngủ ${sleepers.length}`;
    hud.append(h, c);
    // chip giờ dậy của từng người đang ngủ (giường ở khu nghỉ, xem office3d.js)
    if (sleepers.length) {
      const row = document.createElement('div'); row.style.cssText = 'margin-top:8px;display:flex;flex-wrap:wrap;gap:6px';
      for (const a of sleepers) {
        const chip = document.createElement('span');
        chip.style.cssText = 'font-size:12px;color:#cfd6e6;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:2px 8px';
        chip.textContent = a.sleepUntil ? `💤 ${a.name} · dậy ${wakeText(a.sleepUntil)}` : `💤 ${a.name}`;
        row.append(chip);
      }
      hud.append(row);
    }
  };

  const refresh = () => {
    if (dead || refreshing || document.hidden || !office) return;
    refreshing = true;
    Promise.all([hub('/api/sessions'), hub('/api/settings'), hub('/api/permissions'), hub('/api/rooms')]).then(([sessions, settings, perms, rooms]) => {
      if (dead) return;
      state.sessions = sessions || []; state.tiers = (settings && settings.flowTiers && settings.flowTiers[api.room]) || {};
      state.perms = new Set((perms || []).map((p) => p.session));
      state.lead = ((rooms || []).find((r) => r.name === api.room) || {}).lead || '';
      const d = toData(); office.setData(d.departments, d.agents); paintHud(d.agents);
      shown = d.agents; paintCard();   // thẻ đang mở cập nhật theo trạng thái mới (#226)
    }).catch((e) => console.error('[office4] refresh failed', e)).finally(() => { refreshing = false; });
  };

  (async () => {
    try {
      office = new Office3D(host, {
        token: api.token,   // #240: the optional model files sit behind the same token as the API
        onPick: (id) => { picked = id; office.select(id); paintCard(); },   // #226: bấm agent mở thẻ nổi, không mở chat ngay
        onProgress: (m) => { loading.textContent = m; },
      });
      office.quality = 'low'; office.autoQuality = false;
      await office.init();
      if (dead) { office.renderer?.setAnimationLoop(null); return; }
      loading.remove();
      btn('Toàn cảnh', () => office.overview());
      const q = btn('Chất lượng: ' + QUALITY[office.quality], () => { const o = ['high', 'medium', 'low']; office.applyQuality(o[(o.indexOf(office.quality) + 1) % 3]); q.textContent = 'Chất lượng: ' + QUALITY[office.quality]; });
      refresh();
      timer = setInterval(refresh, 10_000);
      if (typeof EventSource === 'function' && api.token) {
        es = new EventSource(`${base}/api/events?token=${enc(api.token)}`);
        ['session', 'permission', 'permission-done', 'settings', 'rooms'].forEach((t) => es.addEventListener(t, () => { clearTimeout(soon); soon = setTimeout(refresh, 600); }));
      }
    } catch (e) {
      console.error('[office4]', e);
      loading.textContent = 'Không dựng được văn phòng 3D bản mới: ' + (e && e.message || e);
    }
  })();

  return {
    unmount() {
      dead = true; clearInterval(timer); clearTimeout(soon); es && es.close();
      window.removeEventListener('keydown', onKey);
      if (office && office.renderer) { office.renderer.setAnimationLoop(null); office.renderer.dispose(); }
      el.replaceChildren();
    },
  };
}
