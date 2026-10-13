// «Хуторок» — с друзьями: общий чат, подарки, рейтинг, ярмарка недели (общая цель).
'use strict';

const FAIR_GOALS = { wheat: 240, corn: 160, carrot: 100, egg: 70, bread: 50, chickenfeed: 120 };
const FAIR_STAGES = [{ k: 1 / 3, gems: 1, coins: 30 }, { k: 2 / 3, gems: 2, coins: 60 }, { k: 1, gems: 3, coins: 150 }];

function dayKey(t = now()){ const d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function weekKey(t = now()){ const d = new Date(t); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (d.getDay() + 6) % 7); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function hhmm(ts){ const d = new Date(ts); return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0'); }

const Social = {
  chat: [], gifts: 0, fair: null,

  tabs(active){
    const t = [['friends', '🏡 Соседи'], ['chat', '💬 Чат'], ['fair', '🎪 Ярмарка'], ['top', '🏆 Рейтинг']];
    return `<div class="seg stabs">${t.map(([k, n]) => `<button data-st="${k}" class="${k === active ? 'active' : ''}">${n}${k === 'chat' && this.unread() ? '<i class="mini-dot"></i>' : ''}${k === 'fair' && this.fairClaimable() ? '<i class="mini-dot"></i>' : ''}</button>`).join('')}</div>`;
  },
  bindTabs(root){ root.querySelectorAll('[data-st]').forEach(b => b.onclick = () => this.open(b.dataset.st)); },
  open(tab){
    if(tab === 'friends') return Net.openFriends();
    if(tab === 'chat') return this.openChat();
    if(tab === 'fair') return this.openFair();
    if(tab === 'top') return this.openTop();
  },
  dot(){
    const d = $('#friendsDot'); if(!d || !S) return;
    d.hidden = !(this.unread() || this.fairClaimable());
  },

  /* ---------- чат ---------- */
  unread(){ return S ? this.chat.filter(m => m.pid !== S.pid && m.ts > (S.chatSeen || 0)).length : 0; },
  async loadChat(){
    const r = await fetch(`${DB_URL}/chat.json?orderBy=%22$key%22&limitToLast=40`, { cache: 'no-store' });
    if(!r.ok) throw new Error('chat ' + r.status);
    const d = await r.json() || {};
    const before = this.chat.length ? this.chat[this.chat.length - 1].id : null;
    this.chat = Object.entries(d).map(([id, m]) => ({ id, ...m })).filter(m => m && m.text).sort((a, b) => a.id < b.id ? -1 : 1);
    if(sheetKind === 'chat'){
      const last = this.chat.length ? this.chat[this.chat.length - 1].id : null;
      if(last !== before) this.renderChatList();
      this.markSeen();
    }
    this.dot();
  },
  markSeen(){
    const last = this.chat.length ? Math.max(...this.chat.map(m => m.ts || 0)) : 0;
    if(last > (S.chatSeen || 0)){ S.chatSeen = last; save(); }
    this.dot();
  },
  renderChatList(){
    const box = $('#chatList'); if(!box) return;
    box.innerHTML = this.chat.map(m => m.sys
      ? `<div class="msg sys">${esc(m.text)}</div>`
      : `<div class="msg ${m.pid === S.pid ? 'me' : ''}"><b>${esc(m.nick)}</b><span>${esc(m.text)}</span><small>${hhmm(m.ts)}</small></div>`).join('')
      || '<p class="hint">Здесь пока тихо. Напишите соседям первым!</p>';
    box.scrollTop = box.scrollHeight;
  },
  openChat(){
    if(S) this.markSeen();
    showSheet('👋 Соседи', `${this.tabs('chat')}<div class="chat" id="chatList"></div>
      <div class="quick">${['👋 Привет!', '🙏 Помогите полить', '🏪 Выставил товар', '🎁 Спасибо!', '😄'].map(q => `<button class="chip" data-q="${q}">${q}</button>`).join('')}</div>
      <form class="chat-in" id="chatForm"><input id="chatText" maxlength="200" placeholder="Сообщение соседям" autocomplete="off"><button class="btn primary sm">➤</button></form>`, root => {
      this.bindTabs(root);
      root.querySelectorAll('[data-q]').forEach(b => b.onclick = () => this.send(b.dataset.q));
      root.querySelector('#chatForm').onsubmit = e => { e.preventDefault(); const i = $('#chatText'); const t = i.value.trim(); if(t){ this.send(t); i.value = ''; } };
    }, null, 'chat');
    this.renderChatList(); this.markSeen();
    this.loadChat().catch(() => {});
  },
  async send(text, sys){
    const m = { pid: S.pid, nick: S.nick, text: String(text).slice(0, 200), ts: now() };
    if(sys) m.sys = true;
    try{
      await api('chat', 'POST', m);
      if(!sys){ Sound.play('pop'); await this.loadChat(); }
    }catch(e){ if(!sys) toast('Нет связи — сообщение не ушло'); }
  },
  sys(text){ if(S) this.send(text, true); },

  /* ---------- подарки ---------- */
  canGift(fid){ return (S.gifted || {})[fid] !== dayKey(); },
  openGift(fid, nick){
    if(!this.canGift(fid)) return toast('Сегодня вы уже дарили этому соседу');
    const keys = Object.keys(S.inv).filter(k => have(k) > 0);
    if(!keys.length) return toast('Амбар пуст — дарить нечего');
    showSheet(`🎁 Подарок для ${nick}`, `<p class="hint">Один подарок соседу в день. Вам за доброту — опыт.</p><div class="pick">${keys.map(k => `<button class="pick-item" data-it="${k}"><span class="pe">${ITEMS[k].e}</span><span class="pn">${ITEMS[k].n}</span><span class="pm">есть ${have(k)}</span></button>`).join('')}</div>`, sh => {
      sh.querySelectorAll('[data-it]').forEach(b => b.onclick = () => {
        const k = b.dataset.it, max = Math.min(5, have(k));
        showSheet(`🎁 ${ITEMS[k].e} ${ITEMS[k].n}`, `<p>Сколько подарить ${esc(nick)}?</p><div class="qty">${Array.from({ length: max }, (_, i) => `<button class="btn ${i === max - 1 ? 'primary' : ''}" data-n="${i + 1}">${i + 1}</button>`).join('')}</div>`, s2 => {
          s2.querySelectorAll('[data-n]').forEach(x => x.onclick = () => this.sendGift(fid, nick, k, +x.dataset.n));
        });
      });
    });
  },
  async sendGift(fid, nick, k, n){
    if(have(k) < n || !this.canGift(fid)) return;
    add(k, -n); S.gifted = { ...(S.gifted || {}), [fid]: dayKey() }; save();
    try{
      await api(`gifts/${fid}`, 'POST', { from: S.pid, fromNick: S.nick, item: k, qty: n, ts: now() });
      gainXp(2 + n); Sound.play('coin'); buzz(20);
      toast(`🎁 Отправлено ${nick}: ${ITEMS[k].e}×${n}`);
      save(); Net.openFriends();
    }catch(e){ add(k, n); delete S.gifted[fid]; save(); toast('Нет связи — подарок вернулся в амбар'); }
  },
  async syncGifts(){
    const g = await api(`gifts/${S.pid}`);
    for(const [id, x] of Object.entries(g || {})){
      if(!x || !ITEMS[x.item]) { await api(`gifts/${S.pid}/${enc(id)}`, 'DELETE').catch(() => {}); continue; }
      if(spaceLeft() < x.qty){ toast(`🎁 Вам подарок от ${x.fromNick}, но амбар полон — освободите место`); break; }
      await api(`gifts/${S.pid}/${enc(id)}`, 'DELETE');
      add(x.item, x.qty);
      Sound.play('level'); buzz([20, 30, 20]);
      showSheet('🎁 Подарок!', `<p class="big">${esc(x.fromNick)} прислал вам ${ITEMS[x.item].e}×${x.qty}</p><p class="hint">Товар уже в амбаре. Скажите спасибо в чате!</p>
        <button class="btn primary" id="gThanks">💬 Сказать спасибо</button>`, sh => {
        sh.querySelector('#gThanks').onclick = () => { this.send(`🎁 Спасибо, ${x.fromNick}!`); this.openChat(); };
      });
      save();
    }
  },

  /* ---------- рейтинг ---------- */
  openTop(){
    const rows = Object.entries(Net.players).filter(([, p]) => p && p.nick)
      .sort((a, b) => (b[1].lvl || 1) - (a[1].lvl || 1) || (b[1].xp || 0) - (a[1].xp || 0));
    const medal = i => ['🥇', '🥈', '🥉'][i] || (i + 1);
    const list = rows.map(([pid, p], i) => `<div class="top-row ${pid === S.pid ? 'me' : ''}"><span class="tp">${medal(i)}</span><b>${esc(p.nick)}</b>
      <span class="tl">ур. ${p.lvl || 1}</span><small>📋 ${p.orders || 0} · 💧 ${p.helps || 0}</small></div>`).join('') || '<p class="hint">Пока пусто.</p>';
    showSheet('👋 Соседи', `${this.tabs('top')}<div class="top">${list}</div><p class="hint">📋 — отправлено заказов, 💧 — сколько раз помогал соседям.</p>`, root => this.bindTabs(root), null, 'top');
  },

  /* ---------- ярмарка недели ---------- */
  fairGoal(week = weekKey()){
    const keys = Object.keys(FAIR_GOALS);
    let h = 0; for(const ch of week) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const item = keys[h % keys.length];
    return { item, target: FAIR_GOALS[item] };
  },
  async loadFair(){
    const week = weekKey();
    const d = await api(`fair/${enc(week)}`);
    const c = (d && d.c) || {};
    const total = Object.values(c).reduce((a, x) => a + (x && x.n || 0), 0);
    this.fair = { week, c, total, ...this.fairGoal(week) };
    this.dot();
    return this.fair;
  },
  myFair(){ const f = this.fair; if(!f) return 0; return Math.max(f.c[S.pid]?.n || 0, S.fairMine?.week === f.week ? S.fairMine.n : 0); },
  fairClaimable(){
    const f = this.fair; if(!f || !S || !this.myFair()) return false;
    const got = S.fairClaims?.week === f.week ? S.fairClaims.got : [];
    return FAIR_STAGES.some((s, i) => f.total >= Math.ceil(f.target * s.k) && !got[i]);
  },
  async give(n){
    const f = this.fair; if(!f) return;
    if(have(f.item) < n) return toast(`Не хватает: ${ITEMS[f.item].e}×${n - have(f.item)}`);
    const mine = this.myFair() + n;
    add(f.item, -n);
    S.fairMine = { week: f.week, n: mine }; save();
    try{
      await api(`fair/${enc(f.week)}/c/${S.pid}`, 'PUT', { nick: S.nick, n: mine });
      const coins = Math.round(ITEMS[f.item].price * n * 1.2);
      S.coins += coins; gainXp(ITEMS[f.item].xp * n);
      Sound.play('coin'); buzz(15);
      toast(`🎪 Сдано ${ITEMS[f.item].e}×${n} — +🪙 ${coins}`);
      const before = f.total;
      await this.loadFair();
      FAIR_STAGES.forEach((s, i) => { const need = Math.ceil(f.target * s.k); if(before < need && this.fair.total >= need) this.sys(`🎪 Ярмарка: ${i + 1}-я ступень пройдена! Заберите награду`); });
      save(); this.openFair();
    }catch(e){ add(f.item, n); S.fairMine = { week: f.week, n: mine - n }; save(); toast('Нет связи — товар вернулся в амбар'); }
  },
  claim(i){
    const f = this.fair; if(!f || !this.myFair()) return;
    const s = FAIR_STAGES[i];
    if(f.total < Math.ceil(f.target * s.k)) return;
    if(S.fairClaims?.week !== f.week) S.fairClaims = { week: f.week, got: [] };
    if(S.fairClaims.got[i]) return;
    S.fairClaims.got[i] = true;
    addGems(s.gems); S.coins += s.coins;
    Sound.play('level'); buzz([30, 40, 60]);
    const c = Engine.toWorld(window.innerWidth / 2, window.innerHeight / 2); Engine.burst(c.x, c.y, 'confetti', { n: 50, lift: 60 });
    toast(`🎪 Награда ярмарки: 💎 ${s.gems} и 🪙 ${s.coins}`);
    save(); this.openFair();
  },
  async openFair(){
    if(!this.fair || this.fair.week !== weekKey()){
      showSheet('👋 Соседи', `${this.tabs('fair')}<p class="hint">Загружаю ярмарку…</p>`, root => this.bindTabs(root), null, 'fair');
      try{ await this.loadFair(); }catch(e){ return showSheet('👋 Соседи', `${this.tabs('fair')}<p class="hint">Нет связи — ярмарка не загрузилась.</p>`, root => this.bindTabs(root), null, 'fair'); }
      if(sheetKind !== 'fair') return;
    }
    const f = this.fair, it = ITEMS[f.item], mine = this.myFair();
    const pct = Math.min(100, f.total / f.target * 100);
    const got = S.fairClaims?.week === f.week ? S.fairClaims.got : [];
    const stages = FAIR_STAGES.map((s, i) => {
      const need = Math.ceil(f.target * s.k), reached = f.total >= need;
      return `<div class="fstage ${reached ? 'ok' : ''}"><b>${i + 1}</b><small>${need} ${it.e}</small><span>💎${s.gems} 🪙${s.coins}</span>
        ${got[i] ? '<span class="tag">✓</span>' : reached && mine ? `<button class="btn primary sm" data-fc="${i}">Забрать</button>` : reached ? '<small>сдайте хоть 1</small>' : ''}</div>`;
    }).join('');
    const top = Object.entries(f.c).filter(([, x]) => x && x.n).sort((a, b) => b[1].n - a[1].n).slice(0, 8)
      .map(([pid, x], i) => `<div class="top-row ${pid === S.pid ? 'me' : ''}"><span class="tp">${['🥇', '🥈', '🥉'][i] || i + 1}</span><b>${esc(x.nick)}</b><span class="tl">${x.n} ${it.e}</span></div>`).join('') || '<p class="hint">Пока никто не сдавал. Будьте первым!</p>';
    const [wy, wm, wd] = f.week.split('-').map(Number), end = new Date(wy, wm - 1, wd + 7);
    showSheet('👋 Соседи', `${this.tabs('fair')}
      <div class="fair"><p class="big">🎪 Вся деревня собирает ${it.e} <b>${it.n.toLowerCase()}</b></p>
      <div class="fbar"><i style="width:${pct}%"></i><span>${f.total} / ${f.target}</span></div>
      <div class="fstages">${stages}</div>
      <p>Вы сдали: <b>${mine} ${it.e}</b> · в амбаре: ${have(f.item)}. За каждую штуку сразу 🪙 ${Math.round(it.price * 1.2)}.</p>
      <div class="qty">${[1, 5, 10].map(n => `<button class="btn ${have(f.item) >= n ? 'primary' : ''}" data-fg="${n}" ${have(f.item) >= n ? '' : 'disabled'}>Сдать ${n}</button>`).join('')}</div>
      <div class="card-lite"><b>Лучшие помощники</b>${top}</div>
      <p class="hint">Ярмарка закончится через ${fmtTime((end - now()) / 1000)}. Награду ступени получают все, кто сдал хотя бы одну штуку.</p></div>`, root => {
      this.bindTabs(root);
      root.querySelectorAll('[data-fg]').forEach(b => b.onclick = () => this.give(+b.dataset.fg));
      root.querySelectorAll('[data-fc]').forEach(b => b.onclick = () => this.claim(+b.dataset.fc));
    }, null, 'fair');
  },

  async sync(){
    if(!S || Engine.visit) return;
    await Promise.all([this.syncGifts().catch(() => {}), this.loadChat().catch(() => {}), this.loadFair().catch(() => {})]);
  },
};
window.Social = Social;
setInterval(() => { if(S && sheetKind === 'chat') Social.loadChat().catch(() => {}); }, 4000);
