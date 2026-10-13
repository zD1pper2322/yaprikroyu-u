// «Хуторок» — игра с друзьями: вход, облачное сохранение, соседи, помощь, лавка.
// Общая база — та же Firebase, что у «Я прикрою!», всё лежит в разделе /farm.
'use strict';

const DB_URL = 'https://ya-prikroyu-default-rtdb.europe-west1.firebasedatabase.app/farm';
const HELP_COOLDOWN = 4 * 3600 * 1000;   // помогать одному соседу — раз в 4 часа
const SYNC_MS = 15000;

async function api(path, method = 'GET', body){
  const opt = { method, cache: 'no-store' };
  if(body !== undefined){ opt.headers = { 'Content-Type': 'application/json' }; opt.body = JSON.stringify(body); }
  const res = await fetch(`${DB_URL}/${path}.json${method === 'GET' ? '?_=' + Date.now() : ''}`, opt);
  if(!res.ok) throw new Error('База ответила ' + res.status);
  return res.json();
}
const enc = s => encodeURIComponent(s);
function nickKey(nick){ return nick.trim().toLowerCase().replace(/[.#$\[\]\/\s]+/g, '_'); }
async function sha(text){
  const b = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
}
function ago(ts){
  const m = Math.round((Date.now() - ts) / 60000);
  if(m < 2) return 'сейчас в игре';
  if(m < 60) return `был ${m} мин назад`;
  const h = Math.round(m / 60);
  if(h < 24) return `был ${h} ч назад`;
  return `был ${Math.round(h / 24)} дн назад`;
}
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]));

const Net = {
  online: false,
  players: {},   // pid -> {nick, lvl, updatedAt}
  market: {},    // id -> listing
  lastSync: 0,

  isBusy(){ return false; },

  /* ---------- вход ---------- */
  async register(nick, pin){
    nick = nick.trim();
    if(nick.length < 2 || nick.length > 20) throw new Error('Имя фермы — от 2 до 20 символов');
    if(!/^\d{4,6}$/.test(pin)) throw new Error('PIN — 4–6 цифр');
    const key = nickKey(nick);
    const taken = await api(`nicks/${enc(key)}`);
    if(taken) throw new Error('Такое имя уже занято — придумайте другое или войдите');
    const pid = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    await api(`nicks/${enc(key)}`, 'PUT', pid);
    const check = await api(`nicks/${enc(key)}`);
    if(check !== pid) throw new Error('Такое имя только что заняли — придумайте другое');
    const pinHash = await sha(key + ':' + pin);
    const st = newState(pid, nick);
    await api(`players/${pid}`, 'PUT', { nick, pinHash, lvl: 1, updatedAt: Date.now() });
    await api(`states/${pid}`, 'PUT', st);
    return st;
  },
  async login(nick, pin){
    const key = nickKey(nick);
    const pid = await api(`nicks/${enc(key)}`);
    if(!pid) throw new Error('Фермы с таким именем нет');
    const p = await api(`players/${pid}`);
    if(!p || p.pinHash !== await sha(key + ':' + pin)) throw new Error('Неверный PIN');
    const cloud = await api(`states/${pid}`);
    const local = loadLocal();
    if(local && local.pid === pid && (!cloud || (local.updatedAt || 0) > (cloud.updatedAt || 0))) return local;
    if(!cloud) throw new Error('Сохранение не найдено');
    return cloud;
  },

  /* ---------- сохранение и синхронизация ---------- */
  async pushState(){
    if(!S) return;
    try{
      await api(`states/${S.pid}`, 'PUT', S);
      const st = S.stats || {};
      await api(`players/${S.pid}`, 'PATCH', { nick: S.nick, lvl: S.lvl, xp: S.xp, orders: st.orders || 0, helps: st.helps || 0, updatedAt: S.updatedAt, ...(S.admin ? { hidden: true } : {}) });
      this.setOnline(true);
    }catch(e){ this.setOnline(false); }
  },
  setOnline(v){
    this.online = v;
    const d = document.getElementById('netDot');
    if(d){ d.className = 'net-dot ' + (v ? 'on' : 'off'); d.title = v ? 'Связь с соседями есть' : 'Нет связи — игра сохраняется на телефоне'; }
    if(Engine.visit) this.renderVisitBar();
  },
  async sync(){
    if(!S) return;
    try{
      const [players, market, help] = await Promise.all([api('players'), api('market'), api(`help/${S.pid}`)]);
      // ферма админа и другие скрытые фермы никому не показываются
      this.allPlayers = players || {};
      this.hidden = new Set(Object.entries(this.allPlayers).filter(([, p]) => p && p.hidden).map(([pid]) => pid));
      this.players = Object.fromEntries(Object.entries(this.allPlayers).filter(([pid]) => !this.hidden.has(pid)));
      this.market = Object.fromEntries(Object.entries(market || {}).filter(([, l]) => l && (l.seller === S.pid || !this.hidden.has(l.seller))));
      this.setOnline(true);
      this.lastSync = Date.now();
      let changed = false;
      // Соседи полили грядки: оставшееся время роста сокращается вдвое.
      for(const [hid, h] of Object.entries(help || {})){
        let n = 0;
        S.plots.forEach(p => {
          if(!p.crop) return;
          const total = ITEMS[p.crop].time * 1000;
          const left = p.start + total - Date.now();
          if(left > 0){ p.start -= left / 2; p.helpedBy = h.fromNick; n++; }
        });
        await api(`help/${S.pid}/${enc(hid)}`, 'DELETE').catch(() => {});
        toast(`💧 ${h.fromNick} полил${n ? ` ${n} гряд.` : ''} — урожай поспеет быстрее`);
        changed = true;
      }
      // Мои проданные товары: забираем монеты.
      for(const [id, l] of Object.entries(this.market)){
        if(l && l.seller === S.pid && l.buyer && !l.paid){
          await api(`market/${enc(id)}`, 'DELETE');
          S.coins += l.price;
          S.shop = (S.shop || []).filter(x => x !== id);
          delete this.market[id];
          toast(`🏪 ${l.buyerNick || 'Сосед'} купил ${ITEMS[l.item].e}×${l.qty} — +🪙 ${l.price}`);
          changed = true;
        }
      }
      if(changed) save();
      await Social.sync();
      if(sheetOpen('friends')) this.openFriends(true);
    }catch(e){ this.setOnline(false); }
  },

  /* ---------- помощь соседу ---------- */
  canHelp(fid){ return Date.now() - ((S.helped || {})[fid] || 0) > HELP_COOLDOWN; },
  async help(fid){
    if(!this.canHelp(fid)) return toast('Сегодня вы уже помогали этому соседу');
    try{
      await api(`help/${fid}`, 'POST', { from: S.pid, fromNick: S.nick, ts: Date.now() });
      S.helped[fid] = Date.now();
      S.stats = S.stats || {}; S.stats.helps = (S.stats.helps || 0) + 1;
      S.coins += 10; gainXp(3);
      Sound.play('coin');
      toast('💧 Полито! +🪙 10, +⭐ 3');
      save(); this.renderVisitBar();
    }catch(e){ toast('Нет связи'); }
  },

  /* ---------- лавка ---------- */
  shopSlots(){ return 3 + Math.floor(S.lvl / 4); },
  myListings(){ return Object.entries(this.market).filter(([, l]) => l && l.seller === S.pid); },
  openSell(){
    if(this.myListings().length >= this.shopSlots()) return toast('В лавке нет места');
    const keys = Object.keys(S.inv).filter(k => have(k) > 0);
    if(!keys.length) return toast('Склад пуст');
    showSheet('🏪 Выставить в лавку', `<div class="pick">${keys.map(k => `<button class="pick-item" data-it="${k}"><span class="pe">${ITEMS[k].e}</span><span class="pn">${ITEMS[k].n}</span><span class="pm">есть ${have(k)}</span></button>`).join('')}</div>`, sheet => {
      sheet.querySelectorAll('[data-it]').forEach(b => b.onclick = () => this.openSellItem(b.dataset.it));
    });
  },
  openSellItem(k){
    const it = ITEMS[k];
    const maxQ = Math.min(have(k), 10);
    const html = `<p class="big">${it.e} ${it.n}</p>
      <label class="fld">Сколько штук <input type="number" id="sq" min="1" max="${maxQ}" value="${Math.min(maxQ, 5)}" inputmode="numeric"></label>
      <label class="fld">Цена за всё, 🪙 <input type="number" id="sp" min="1" inputmode="numeric"></label>
      <p class="hint" id="sh"></p>
      <button class="btn primary" id="sgo">Выставить</button>`;
    showSheet('🏪 Цена', html, sheet => {
      const q = sheet.querySelector('#sq'), p = sheet.querySelector('#sp'), h = sheet.querySelector('#sh');
      const upd = (setPrice) => {
        const n = Math.max(1, Math.min(maxQ, +q.value || 1));
        if(setPrice) p.value = Math.round(it.price * n * 1.3);
        h.textContent = `На складе продаётся за 🪙 ${it.price * n}. Можно от 🪙 ${Math.ceil(it.price * n * 0.5)} до 🪙 ${Math.floor(it.price * n * 3)}.`;
      };
      upd(true);
      q.oninput = () => upd(true);
      sheet.querySelector('#sgo').onclick = async () => {
        const n = Math.max(1, Math.min(maxQ, +q.value || 1));
        const price = Math.round(+p.value || 0);
        if(price < Math.ceil(it.price * n * 0.5) || price > Math.floor(it.price * n * 3)) return toast('Цена вне допустимых границ');
        if(have(k) < n) return toast('Не хватает товара');
        add(k, -n); save();
        try{
          const r = await api('market', 'POST', { seller: S.pid, sellerNick: S.nick, item: k, qty: n, price, ts: Date.now() });
          S.shop = [...(S.shop || []), r.name];
          this.market[r.name] = { seller: S.pid, sellerNick: S.nick, item: k, qty: n, price, ts: Date.now() };
          toast('Выставлено в лавку'); save(); this.openFriends();
        }catch(e){ add(k, n); save(); toast('Нет связи — товар вернулся на склад'); }
      };
    });
  },
  async cancelListing(id){
    try{
      const l = await api(`market/${enc(id)}`);
      if(!l){ delete this.market[id]; this.openFriends(); return; }
      if(l.buyer) return toast('Уже купили — монеты придут через несколько секунд');
      if(spaceLeft() < l.qty) return toast('📦 Склад полон');
      await api(`market/${enc(id)}`, 'DELETE');
      add(l.item, l.qty); delete this.market[id];
      S.shop = (S.shop || []).filter(x => x !== id);
      save(); this.openFriends();
    }catch(e){ toast('Нет связи'); }
  },
  async buy(id){
    const l = this.market[id];
    if(!l || l.buyer) return toast('Уже продано');
    if(S.coins < l.price) return toast(`Нужно 🪙 ${l.price}`);
    if(spaceLeft() < l.qty) return toast('📦 Склад полон');
    try{
      // Бронь: кто первым поставил отметку — тот и купил.
      await api(`market/${enc(id)}/claims/${S.pid}`, 'PUT', Date.now());
      await new Promise(r => setTimeout(r, 800));
      const cur = await api(`market/${enc(id)}`);
      if(!cur || cur.buyer) return toast('Опоздали — уже купили');
      const first = Object.entries(cur.claims || {}).sort((a, b) => a[1] - b[1] || a[0].localeCompare(b[0]))[0];
      if(!first || first[0] !== S.pid) return toast('Опоздали — уже купили');
      await api(`market/${enc(id)}`, 'PATCH', { buyer: S.pid, buyerNick: S.nick });
      S.coins -= cur.price; add(cur.item, cur.qty);
      this.market[id] = { ...cur, buyer: S.pid };
      toast(`Куплено: ${ITEMS[cur.item].e}×${cur.qty}`);
      Sound.play('coin');
      save(); if(sheetOpen('friends')) this.openFriends(); else closeSheet();
    }catch(e){ toast('Нет связи'); }
  },

  /* ---------- окно «Соседи» ---------- */
  openFriends(quiet){
    const mine = this.myListings();
    const slots = this.shopSlots();
    const shop = mine.map(([id, l]) => `<div class="stall ${l.buyer ? 'sold' : ''}"><span class="se">${ITEMS[l.item].e}<sub>×${l.qty}</sub></span><small>🪙 ${l.price}</small>
        ${l.buyer ? '<small>продано</small>' : `<button class="btn ghost sm" data-unlist="${esc(id)}">Снять</button>`}</div>`).join('')
      + (mine.length < slots ? `<button class="stall add" id="sellBtn">＋<small>Выставить</small></button>` : '');
    const others = Object.entries(this.players).filter(([pid, p]) => pid !== S.pid && p && p.nick)
      .sort((a, b) => (b[1].updatedAt || 0) - (a[1].updatedAt || 0));
    const forSale = Object.entries(this.market).filter(([, l]) => l && l.seller !== S.pid && !l.buyer);
    const list = others.map(([pid, p]) => {
      const n = forSale.filter(([, l]) => l.seller === pid).length;
      return `<div class="friend"><span class="fa">🏡</span><div class="fi"><b>${esc(p.nick)}</b><small>ур. ${p.lvl || 1} · ${ago(p.updatedAt || 0)}${n ? ` · 🏪 ${n} товар.` : ''}</small></div>
        <button class="btn sm ghost" data-gift="${esc(pid)}" ${Social.canGift(pid) ? '' : 'disabled'} title="Подарок">🎁</button>
        <button class="btn sm" data-visit="${esc(pid)}">В гости</button></div>`;
    }).join('') || `<p class="hint">Пока вы тут один. Отправьте друзьям ссылку на игру — они появятся здесь.</p>`;
    const market = forSale.sort((a, b) => b[1].ts - a[1].ts).slice(0, 30).map(([id, l]) => `<div class="offer">
        <span class="oe">${ITEMS[l.item].e}<sub>×${l.qty}</sub></span><div class="oi"><b>${ITEMS[l.item].n}</b><small>${esc(l.sellerNick)}</small></div>
        <button class="btn primary sm" data-buy="${esc(id)}">🪙 ${l.price}</button></div>`).join('') || '<p class="hint">Соседи пока ничего не продают.</p>';
    const scroll = quiet ? document.querySelector('.sheet-box')?.scrollTop : 0;
    showSheet('👋 Соседи', `${Social.tabs('friends')}
      <div class="card-lite"><b>🏪 Моя лавка</b><small>Друзья покупают ваши товары. Мест: ${slots}</small><div class="stalls">${shop}</div></div>
      <div class="card-lite"><b>🛒 Рынок соседей</b><div class="offers">${market}</div></div>
      <div class="card-lite"><b>🏡 Соседи</b><small>Заходите в гости и поливайте грядки — им быстрее, вам монеты</small>${list}</div>
      <p class="hint">${this.online ? '🟢 Связь есть' : '🔴 Нет связи — игра сохраняется на телефоне'}</p>`, root => {
      root.querySelector('#sellBtn')?.addEventListener('click', () => this.openSell());
      root.querySelectorAll('[data-unlist]').forEach(b => b.onclick = () => this.cancelListing(b.dataset.unlist));
      root.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => this.buy(b.dataset.buy));
      root.querySelectorAll('[data-visit]').forEach(b => b.onclick = () => this.visit(b.dataset.visit));
      root.querySelectorAll('[data-gift]').forEach(b => b.onclick = () => Social.openGift(b.dataset.gift, this.players[b.dataset.gift]?.nick || 'соседа'));
      Social.bindTabs(root);
    }, null, 'friends');
    if(quiet && scroll) document.querySelector('.sheet-box').scrollTop = scroll;
  },

  /* ---------- в гостях: ферма соседа на карте ---------- */
  visitId: null,
  async visit(fid){
    let st;
    try{ st = await api(`states/${fid}`); }catch(e){ return toast('Нет связи — не удалось загрузить ферму соседа'); }
    if(!st || !st.plots) return toast('Ферма не найдена');
    closeSheet();
    const copy = migrate(JSON.parse(JSON.stringify(st)));
    Engine.animals.clear();
    Engine.visit = copy; this.visitId = fid;
    Radial.close();
    document.body.classList.add('visiting');
    this.renderVisitBar();
    Engine.focus(8.5, 9);
  },
  leaveVisit(){
    Engine.visit = null; this.visitId = null; Engine.animals.clear();
    document.body.classList.remove('visiting');
    document.getElementById('visitBar').hidden = true;
    Engine.focus(8.5, 9);
  },
  renderVisitBar(){
    const bar = document.getElementById('visitBar');
    const st = Engine.visit; if(!st){ bar.hidden = true; return; }
    const growing = st.plots.some(p => p.crop && p.start + ITEMS[p.crop].time * 1000 > Date.now());
    const can = this.canHelp(this.visitId);
    const stall = Object.values(this.market).filter(l => l && l.seller === this.visitId && !l.buyer).length;
    bar.hidden = false;
    bar.innerHTML = `<div class="vb-name">🏡 <b></b> · ур. ${st.lvl}</div><div class="vb-row">
      <button class="btn sm ${growing && can ? 'primary' : ''}" id="vbHelp" ${growing && can ? '' : 'disabled'}>${!growing ? '💧 Нечего поливать' : can ? '💧 Полить (+🪙 10)' : '💧 Уже поливали'}</button>
      ${stall ? `<button class="btn sm" id="vbShop">🏪 Лавка (${stall})</button>` : ''}
      <button class="btn sm" id="vbHome">← Домой</button></div>`;
    bar.querySelector('b').textContent = st.nick;
    bar.querySelector('#vbHome').onclick = () => this.leaveVisit();
    bar.querySelector('#vbHelp')?.addEventListener('click', () => this.help(this.visitId));
    bar.querySelector('#vbShop')?.addEventListener('click', () => this.openStall(this.visitId));
  },
  openStall(fid){
    const items = Object.entries(this.market).filter(([, l]) => l && l.seller === fid && !l.buyer);
    showSheet('🏪 Лавка соседа', `<div class="offers">${items.map(([id, l]) => `<div class="offer"><span class="oe">${ITEMS[l.item].e}<sub>×${l.qty}</sub></span><div class="oi"><b>${ITEMS[l.item].n}</b></div><button class="btn primary sm" data-buy="${esc(id)}">🪙 ${l.price}</button></div>`).join('') || '<p class="hint">Всё раскупили.</p>'}</div>`, sh => {
      sh.querySelectorAll('[data-buy]').forEach(b => b.onclick = async () => { await this.buy(b.dataset.buy); this.renderVisitBar(); this.openStall(fid); });
    });
  },
  tapVisit(obj, w){
    if(!obj) return;
    const st = Engine.visit;
    if(obj.type === 'plot'){
      const p = st.plots[obj.idx];
      if(!p.crop) return;
      const left = (p.start + ITEMS[p.crop].time * 1000 - Date.now()) / 1000;
      const s = Engine.toScreen(w.x, w.y);
      Engine.tip(s.x, s.y, `${ITEMS[p.crop].e} ${ITEMS[p.crop].n}${left > 0 ? ' · ещё ' + fmtTime(left) : ' · созрело'}`);
    } else if(obj.type === 'board' && Object.values(this.market).some(l => l && l.seller === this.visitId && !l.buyer)){
      this.openStall(this.visitId);
    }
  },
};
window.Net = Net;

/* ---------- экран входа ---------- */
document.addEventListener('DOMContentLoaded', () => {
  const local = loadLocal();
  if(local){
    startGame(local);
    Net.sync();
  }
  let mode = 'new';
  const setMode = m => {
    mode = m;
    document.querySelectorAll('.auth-tabs button').forEach(b => b.classList.toggle('active', b.dataset.mode === m));
    document.getElementById('authGo').textContent = m === 'new' ? 'Создать ферму' : 'Войти';
    document.getElementById('authHint').textContent = m === 'new' ? 'Запомните имя и PIN — по ним можно войти с другого телефона.' : 'Введите имя фермы и PIN, которые придумали при создании.';
    document.getElementById('authErr').textContent = '';
  };
  document.querySelectorAll('.auth-tabs button').forEach(b => b.onclick = () => setMode(b.dataset.mode));
  setMode('new');
  document.getElementById('authGo').onclick = async () => {
    const nick = document.getElementById('authNick').value, pin = document.getElementById('authPin').value.trim();
    const err = document.getElementById('authErr'), btn = document.getElementById('authGo');
    err.textContent = ''; btn.disabled = true;
    try{
      // админ: тот же логин и пароль, что в «Я прикрою!»; если пароль не подошёл — обычный вход
      let st = Admin.isAdminNick(nick) ? await Admin.enter(nick, pin).catch(() => null) : null;
      if(!st) st = mode === 'new' ? await Net.register(nick, pin) : await Net.login(nick, pin);
      startGame(st); Net.setOnline(true); Net.sync();
    }catch(e){
      err.textContent = /fetch|network|Failed/i.test(e.message) ? 'Нет связи с интернетом — попробуйте ещё раз' : e.message;
    }
    btn.disabled = false;
  };
  setInterval(() => Net.sync(), SYNC_MS);
  window.addEventListener('online', () => { Net.pushState(); Net.sync(); });
});
