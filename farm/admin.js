// «Хуторок» — ферма администратора. Её не видно другим игрокам: нет в «Соседях», рейтинге,
// на рынке и в ярмарке. Вход — тем же логином и паролем админа, что в «Я прикрою!»:
// пароль проверяет Firebase, в коде игры он не хранится.
'use strict';

const ADMIN_LOGIN = 'zd1pper';
const ADMIN_PID = 'padmin';
const FB_KEY = 'AIzaSyACN9IXzwhSzoxBWvi4WTccFn_AFfRHgqE';
const FB_ROOT = 'https://ya-prikroyu-default-rtdb.europe-west1.firebasedatabase.app';

const Admin = {
  isAdminNick(n){ return nickKey(n || '') === ADMIN_LOGIN; },
  // Та же схема учётных данных, что у админа в «Я прикрою!».
  async creds(login, password){
    const l = String(login).trim().toLowerCase();
    return { email: `u${(await sha('l:' + l)).slice(0, 12)}.${(await sha('e:' + l + ':' + password)).slice(0, 12)}@yaprikroyu.app`, password: await sha('p:' + l + ':' + password) };
  },
  async verify(login, password){
    const c = await this.creds(login, password);
    const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FB_KEY}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...c, returnSecureToken: true }) });
    if(!r.ok) return false;
    const a = await r.json();
    const chk = await fetch(`${FB_ROOT}/admins/${a.localId}.json?auth=${a.idToken}`, { cache: 'no-store' });
    return chk.ok && (await chk.json()) === true;
  },
  async enter(nick, pin){
    if(!(await this.verify(nick, pin))) return null;
    const cloud = await api(`states/${ADMIN_PID}`);
    const local = loadLocal();
    let st = local && local.pid === ADMIN_PID && (!cloud || (local.updatedAt || 0) > (cloud.updatedAt || 0)) ? local : cloud;
    if(!st){ st = newState(ADMIN_PID, 'Админ'); }
    st.admin = true;
    if(st.lvl < 1000){ st.lvl = 1000; st.xp = 0; }   // админ — 1000 уровень
    // Обычная ферма, созданная раньше под ником zD1pper, переезжает на логин xMorskoy (PIN 2322).
    try{
      const old = await api(`nicks/${ADMIN_LOGIN}`);
      if(old && old !== ADMIN_PID){ const r = await Admin.rename(old, 'xMorskoy', '2322'); if(r) setTimeout(() => toast('Старая ферма zD1pper перенесена на логин xMorskoy, PIN 2322'), 3000); }
    }catch(e){}
    await api(`players/${ADMIN_PID}`, 'PUT', { nick: st.nick, hidden: true, lvl: st.lvl, updatedAt: Date.now() });
    await api(`states/${ADMIN_PID}`, 'PUT', st);
    return st;
  },
  // Сменить логин (имя фермы) и PIN игрока. Ферма, уровень и всё остальное сохраняются.
  async rename(pid, newNick, pin){
    newNick = String(newNick || '').trim();
    if(newNick.length < 2 || newNick.length > 20){ toast('Имя — от 2 до 20 символов'); return false; }
    if(pin && !/^\d{4,6}$/.test(pin)){ toast('PIN — 4–6 цифр'); return false; }
    const key = nickKey(newNick);
    const taken = await api(`nicks/${enc(key)}`);
    if(taken && taken !== pid){ toast('Такое имя уже занято'); return false; }
    const p = await api(`players/${enc(pid)}`) || {};
    const oldKey = p.nick ? nickKey(p.nick) : null;
    if(!pin && p.pinHash && oldKey !== key){ toast('При смене имени нужно задать новый PIN'); return false; }
    await api(`nicks/${enc(key)}`, 'PUT', pid);
    if(oldKey && oldKey !== key && (await api(`nicks/${enc(oldKey)}`)) === pid) await api(`nicks/${enc(oldKey)}`, 'DELETE');
    const patch = { nick: newNick };
    if(pin) patch.pinHash = await sha(key + ':' + pin);
    await api(`players/${enc(pid)}`, 'PATCH', patch);
    const st = await api(`states/${enc(pid)}`);
    if(st){ await api(`states/${enc(pid)}`, 'PATCH', { nick: newNick }); }
    await api(`admingrants/${enc(pid)}`, 'PATCH', { nick: newNick });
    if(Net.allPlayers && Net.allPlayers[pid]) Net.allPlayers[pid].nick = newNick;
    return true;
  },
  async grant(pid, g){ await api(`admingrants/${enc(pid)}`, 'PATCH', g); },
  async deleteHood(id, h){
    await api(`hoods/${enc(id)}`, 'DELETE');
    await api(`hoodNames/${enc(h.key || nickKey(h.name || ''))}`, 'DELETE');
    await api(`hoodchat/${enc(id)}`, 'DELETE');
  },
};
window.Admin = Admin;

/* ---------- выдачи от админа: игрок получает их при синхронизации ---------- */
async function applyAdminGrants(){
  if(!S || Engine.visit) return;
  const g = await api(`admingrants/${S.pid}`);
  if(!g) return;
  await api(`admingrants/${S.pid}`, 'DELETE');
  const got = [];
  if(g.nick && g.nick !== S.nick){ S.nick = g.nick; got.push(`новое имя фермы: ${g.nick}`); }
  if(g.coins){ S.coins += g.coins; got.push(`🪙 ${g.coins}`); }
  if(g.gems){ addGems(g.gems); got.push(`💎 ${g.gems}`); }
  if(g.lvl){ S.lvl = g.lvl; S.xp = 0; fillOrders(); got.push(`уровень ${g.lvl}`); }
  save();
  if(got.length) showSheet('🎁 От администрации', `<p class="big">${got.map(esc).join('<br>')}</p><button class="btn primary" data-close>Спасибо!</button>`);
}
{ const prevSync = Social.sync.bind(Social); Social.sync = async function(){ await prevSync(); await applyAdminGrants().catch(() => {}); }; }

/* ---------- админ может удалять отдельные сообщения в чатах ---------- */
function addChatDeletes(box, list, path){
  if(!S || !S.admin || !box) return;
  [...box.children].forEach((el, i) => {
    const m = list[i]; if(!m || el.querySelector('.msg-del')) return;
    const b = document.createElement('button'); b.className = 'msg-del'; b.textContent = '✕'; b.title = 'Удалить сообщение';
    b.onclick = async () => { try{ await api(`${path}/${enc(m.id)}`, 'DELETE'); el.remove(); list.splice(list.indexOf(m), 1); }catch(e){ toast('Нет связи'); } };
    el.appendChild(b);
  });
}
{ const r1 = Social.renderChatList.bind(Social); Social.renderChatList = function(){ r1(); addChatDeletes($('#chatList'), this.chat, 'chat'); }; }
{ const r2 = Hood.renderChat.bind(Hood); Hood.renderChat = function(){ r2(); if(S && S.hood) addChatDeletes($('#hoodChat'), this.chat, `hoodchat/${S.hood}`); }; }

/* ---------- панель администратора ---------- */
async function openAdmin(fresh){
  if(!S || !S.admin) return;
  if(fresh){ try{ Net.allPlayers = (await api('players')) || {}; Admin.hoods = (await api('hoods')) || {}; }catch(e){ toast('Нет связи — показываю что было'); } }
  const all = Object.entries(Net.allPlayers || {}).filter(([pid, p]) => p && p.nick && pid !== S.pid).sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));
  const rows = all.map(([pid, p]) => `<div class="top-row"><span class="tp">🧑‍🌾</span><b>${esc(p.nick)}</b><span class="tl">ур. ${p.lvl || 1}</span>
      <small>${seenText(pid)}${p.hidden ? ' · скрыт' : ''} · <a href="#" data-av="${esc(pid)}">в гости</a> · <a href="#" data-aren="${esc(pid)}">логин/PIN</a> · <a href="#" data-agift="${esc(pid)}">выдать</a> · <a href="#" data-adel="${esc(pid)}">удалить</a></small></div>`).join('') || '<p class="hint">Игроков пока нет.</p>';
  const hoods = Object.entries(Admin.hoods || {}).filter(([, h]) => h && h.name);
  const hrows = hoods.map(([id, h]) => `<div class="hood-row"><span class="he">${esc(h.emoji || '🏡')}</span><div class="hi"><b>${esc(h.name)}</b><small>👥 ${Object.keys(h.members || {}).length} · 👑 ${esc(h.ownerNick || '')}</small>
      <small>${Object.entries(h.members || {}).map(([mp, m]) => `${esc(m.nick)} <a href="#" data-hkick="${esc(id)}|${esc(mp)}">✕</a>`).join(', ')}</small></div>
      <button class="btn sm" data-hdel="${esc(id)}">Удалить</button></div>`).join('') || '<p class="hint">Соседств нет.</p>';
  showSheet('🛠 Админ', `<p class="hint">Эту ферму никто не видит: её нет в соседях, рейтинге, на рынке и в ярмарке.</p>
    <div class="card-lite"><b>Моя ферма</b>
      <div class="qty"><input id="aLvl" type="number" min="1" max="9999" value="${S.lvl}" style="width:80px;font:600 16px var(--body);padding:8px;border-radius:10px;border:2px solid var(--wood-d)"><button class="btn primary sm" id="aSetLvl">Поставить уровень</button></div>
      <div class="qty"><button class="btn sm" data-ac="coins">🪙 +10 000</button><button class="btn sm" data-ac="gems">💎 +500</button></div>
      <div class="qty"><button class="btn sm" data-ac="fill">📦 По 20 всего открытого</button><button class="btn sm" data-ac="ready">⚡ Всё готово сейчас</button></div>
      <div class="qty"><button class="btn sm" data-ac="all">🔓 Открыть всё (ур. 30)</button></div></div>
    <div class="card-lite"><b>Игроки (${all.length})</b>${rows}</div>
    <div class="card-lite"><b>Соседства (${hoods.length})</b>${hrows}</div>
    <div class="card-lite"><b>Порядок</b><p class="hint">Отдельные сообщения удаляются крестиком прямо в чате.</p><button class="btn" id="aClearChat">🧹 Очистить общий чат</button></div>`, sh => {
    sh.querySelector('#aSetLvl').onclick = () => { const n = Math.max(1, Math.min(9999, +sh.querySelector('#aLvl').value || 1)); S.lvl = n; S.xp = 0; fillOrders(); save(); toast(`Уровень ${n}`); openAdmin(); };
    sh.querySelectorAll('[data-ac]').forEach(b => b.onclick = () => {
      const a = b.dataset.ac;
      if(a === 'coins') S.coins += 10000;
      if(a === 'gems') addGems(500);
      if(a === 'all'){ S.lvl = Math.max(S.lvl, 30); S.xp = 0; fillOrders(); }
      if(a === 'fill'){ S.cap = Math.max(S.cap, 2000); Object.keys(ITEMS).filter(unlocked).forEach(k => add(k, 20)); }
      if(a === 'ready'){
        const t = now();
        S.plots.forEach(p => { if(p.crop) p.start = t - ITEMS[p.crop].time * 1000; });
        for(const [k, bs] of Object.entries(S.buildings)){
          if(BUILDINGS[k].kind === 'factory') (bs.queue || []).forEach(j => { j.start = Math.min(j.start, t - 1000); j.end = t - 1; });
          else (bs.animals || []).forEach(an => { if(an.start) an.start = t - ANIMALS[BUILDINGS[k].animal].time * 1000; });
        }
        if(S.truck) S.truck.back = t;
        if(S.boat && S.boat.arrive > t){ S.boat.arrive = t; S.boat.leaves = t + BOAT_STAY; }
      }
      save(); toast('Готово'); openAdmin();
    });
    sh.querySelectorAll('[data-av]').forEach(x => x.onclick = e => { e.preventDefault(); Net.visit(x.dataset.av); });
    sh.querySelectorAll('[data-adel]').forEach(x => x.onclick = async e => {
      e.preventDefault();
      const pid = x.dataset.adel, p = Net.allPlayers[pid];
      if(!confirm(`Удалить игрока «${p.nick}» и его ферму навсегда?`)) return;
      try{
        await api(`states/${enc(pid)}`, 'DELETE');
        await api(`players/${enc(pid)}`, 'DELETE');
        await api(`nicks/${enc(nickKey(p.nick))}`, 'DELETE');
        for(const [id, l] of Object.entries(Net.market)) if(l && l.seller === pid) await api(`market/${enc(id)}`, 'DELETE');
        delete Net.allPlayers[pid]; delete Net.players[pid];
        toast(`Игрок ${p.nick} удалён`); openAdmin(true);
      }catch(err){ toast('Нет связи'); }
    });
    sh.querySelectorAll('[data-aren]').forEach(x => x.onclick = async e => {
      e.preventDefault();
      const pid = x.dataset.aren, p = Net.allPlayers[pid];
      const nick = prompt(`Новое имя (логин) для «${p.nick}»:`, p.nick); if(nick === null) return;
      const pin = prompt('Новый PIN (4–6 цифр):', ''); if(pin === null) return;
      try{ if(await Admin.rename(pid, nick, pin.trim())){ toast(`Готово: логин ${nick.trim()}, PIN ${pin.trim()}`); openAdmin(); } }catch(err){ toast('Нет связи'); }
    });
    sh.querySelectorAll('[data-agift]').forEach(x => x.onclick = async e => {
      e.preventDefault();
      const pid = x.dataset.agift, p = Net.allPlayers[pid];
      const coins = +(prompt(`Сколько монет выдать «${p.nick}»?`, '0') || 0);
      const gems = +(prompt('Сколько кристаллов?', '0') || 0);
      const lvl = +(prompt('Поставить уровень (пусто — не менять):', '') || 0);
      const g = {}; if(coins > 0) g.coins = Math.round(coins); if(gems > 0) g.gems = Math.round(gems); if(lvl > 0) g.lvl = Math.min(9999, Math.round(lvl));
      if(!Object.keys(g).length) return;
      try{ await Admin.grant(pid, g); toast(`Выдано — ${p.nick} получит при следующем входе в игру`); }catch(err){ toast('Нет связи'); }
    });
    sh.querySelectorAll('[data-hdel]').forEach(x => x.onclick = async () => {
      const id = x.dataset.hdel, h = Admin.hoods[id];
      if(!confirm(`Удалить соседство «${h.name}» вместе с чатом?`)) return;
      try{ await Admin.deleteHood(id, h); delete Admin.hoods[id]; if(S.hood === id){ S.hood = null; Hood.info = null; save(); } toast('Соседство удалено'); openAdmin(); }catch(err){ toast('Нет связи'); }
    });
    sh.querySelectorAll('[data-hkick]').forEach(x => x.onclick = async e => {
      e.preventDefault();
      const [id, mp] = x.dataset.hkick.split('|'), h = Admin.hoods[id], m = h.members[mp];
      if(!confirm(`Убрать ${m.nick} из «${h.name}»?`)) return;
      try{
        await api(`hoods/${enc(id)}/members/${enc(mp)}`, 'DELETE'); delete h.members[mp];
        if(h.owner === mp){ const next = Object.entries(h.members).sort((a, b) => (a[1].joined || 0) - (b[1].joined || 0))[0];
          if(next){ await api(`hoods/${enc(id)}`, 'PATCH', { owner: next[0], ownerNick: next[1].nick }); await api(`hoods/${enc(id)}/members/${enc(next[0])}`, 'PATCH', { role: 'leader' }); }
          else { await Admin.deleteHood(id, h); delete Admin.hoods[id]; } }
        openAdmin();
      }catch(err){ toast('Нет связи'); }
    });
    sh.querySelector('#aClearChat').onclick = async () => {
      if(!confirm('Удалить все сообщения общего чата?')) return;
      try{ await api('chat', 'DELETE'); Social.chat = []; toast('Чат очищен'); }catch(e){ toast('Нет связи'); }
    };
  }, null, 'admin');
}
