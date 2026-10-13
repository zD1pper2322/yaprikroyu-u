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
    await api(`players/${ADMIN_PID}`, 'PUT', { nick: st.nick, hidden: true, lvl: st.lvl, updatedAt: Date.now() });
    await api(`states/${ADMIN_PID}`, 'PUT', st);
    return st;
  },
};
window.Admin = Admin;

/* ---------- панель администратора ---------- */
function openAdmin(){
  if(!S || !S.admin) return;
  const all = Object.entries(Net.allPlayers || {}).filter(([pid, p]) => p && p.nick && pid !== S.pid).sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));
  const rows = all.map(([pid, p]) => `<div class="top-row"><span class="tp">🧑‍🌾</span><b>${esc(p.nick)}</b><span class="tl">ур. ${p.lvl || 1}</span>
      <small>${ago(p.updatedAt || 0)} · <a href="#" data-av="${esc(pid)}">в гости</a> · <a href="#" data-adel="${esc(pid)}">удалить</a></small></div>`).join('') || '<p class="hint">Игроков пока нет.</p>';
  showSheet('🛠 Админ', `<p class="hint">Эту ферму никто не видит: её нет в соседях, рейтинге, на рынке и в ярмарке.</p>
    <div class="card-lite"><b>Моя ферма</b>
      <div class="qty"><input id="aLvl" type="number" min="1" max="99" value="${S.lvl}" style="width:80px;font:600 16px var(--body);padding:8px;border-radius:10px;border:2px solid var(--wood-d)"><button class="btn primary sm" id="aSetLvl">Поставить уровень</button></div>
      <div class="qty"><button class="btn sm" data-ac="coins">🪙 +10 000</button><button class="btn sm" data-ac="gems">💎 +500</button></div>
      <div class="qty"><button class="btn sm" data-ac="fill">📦 По 20 всего открытого</button><button class="btn sm" data-ac="ready">⚡ Всё готово сейчас</button></div>
      <div class="qty"><button class="btn sm" data-ac="all">🔓 Открыть всё (ур. 30)</button></div></div>
    <div class="card-lite"><b>Игроки (${all.length})</b>${rows}</div>
    <div class="card-lite"><b>Порядок</b><button class="btn" id="aClearChat">🧹 Очистить общий чат</button></div>`, sh => {
    sh.querySelector('#aSetLvl').onclick = () => { const n = Math.max(1, Math.min(99, +sh.querySelector('#aLvl').value || 1)); S.lvl = n; S.xp = 0; fillOrders(); save(); toast(`Уровень ${n}`); openAdmin(); };
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
        toast(`Игрок ${p.nick} удалён`); openAdmin();
      }catch(err){ toast('Нет связи'); }
    });
    sh.querySelector('#aClearChat').onclick = async () => {
      if(!confirm('Удалить все сообщения общего чата?')) return;
      try{ await api('chat', 'DELETE'); Social.chat = []; toast('Чат очищен'); }catch(e){ toast('Нет связи'); }
    };
  }, null, 'admin');
}
