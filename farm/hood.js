// «Хуторок» — соседства, как в Hay Day: игроки сами создают соседство, другие вступают,
// у каждого соседства свой чат и список участников. Данные — в /farm/hoods и /farm/hoodchat.
'use strict';

const HOOD_MAX = 30;
const HOOD_EMBLEMS = ['🏡', '🌻', '🐄', '🌾', '🍎', '🐝', '⭐', '🌈', '🐔', '🚜', '🍀', '🦊'];

const Hood = {
  info: null, list: null, chat: [], sub: 'chat',

  /* ---------- загрузка ---------- */
  async loadList(){ this.list = (await api('hoods')) || {}; return this.list; },
  async loadMine(){
    if(!S || !S.hood){ this.info = null; return null; }
    const h = await api(`hoods/${enc(S.hood)}`);
    if(!h || !h.members || !h.members[S.pid]){
      const was = h && h.name;
      S.hood = null; this.info = null; this.chat = []; save();
      toast(was ? `Вы больше не в соседстве «${was}»` : 'Соседство распущено');
      return null;
    }
    this.info = { id: S.hood, ...h };
    const me = h.members[S.pid];
    if(me.lvl !== S.lvl || me.nick !== S.nick) api(`hoods/${enc(S.hood)}/members/${S.pid}`, 'PATCH', { lvl: S.lvl, nick: S.nick, seen: now() }).catch(() => {});
    return this.info;
  },
  async loadChat(){
    if(!S || !S.hood) return;
    const r = await fetch(`${DB_URL}/hoodchat/${enc(S.hood)}.json?orderBy=%22$key%22&limitToLast=50`, { cache: 'no-store' });
    if(!r.ok) throw new Error('hoodchat ' + r.status);
    const d = await r.json() || {};
    const before = this.chat.length ? this.chat[this.chat.length - 1].id : null;
    this.chat = Object.entries(d).map(([id, m]) => ({ id, ...m })).filter(m => m && m.text).sort((a, b) => a.id < b.id ? -1 : 1);
    if(sheetKind === 'hood' && this.sub === 'chat'){
      const last = this.chat.length ? this.chat[this.chat.length - 1].id : null;
      if(last !== before) this.renderChat();
      this.markSeen();
    }
    Social.dot();
  },
  unread(){ return S && S.hood ? this.chat.filter(m => m.pid !== S.pid && m.ts > (S.hoodSeen || 0)).length : 0; },
  markSeen(){
    const last = this.chat.length ? Math.max(...this.chat.map(m => m.ts || 0)) : 0;
    if(last > (S.hoodSeen || 0)){ S.hoodSeen = last; save(); }
  },
  members(){ return Object.entries(this.info?.members || {}).map(([pid, m]) => ({ pid, ...m })).sort((a, b) => (b.role === 'leader') - (a.role === 'leader') || (b.lvl || 0) - (a.lvl || 0)); },
  isLeader(){ return this.info && this.info.owner === S.pid; },

  /* ---------- действия ---------- */
  async create(name, emoji, desc){
    name = (name || '').trim(); desc = (desc || '').trim().slice(0, 120);
    if(S.hood) return toast('Сначала выйдите из своего соседства');
    if(name.length < 3 || name.length > 24) return toast('Название — от 3 до 24 символов');
    const key = nickKey(name);
    try{
      if(await api(`hoodNames/${enc(key)}`)) return toast('Такое название уже занято');
      const hid = 'h' + now().toString(36) + Math.random().toString(36).slice(2, 6);
      await api(`hoodNames/${enc(key)}`, 'PUT', hid);
      if(await api(`hoodNames/${enc(key)}`) !== hid) return toast('Такое название только что заняли');
      await api(`hoods/${hid}`, 'PUT', { name, key, emoji, desc, owner: S.pid, ownerNick: S.nick, created: now(),
        members: { [S.pid]: { nick: S.nick, lvl: S.lvl, joined: now(), role: 'leader' } } });
      S.hood = hid; save();
      await this.loadMine();
      await this.send(`🏘 ${S.nick} основал соседство «${name}»`, true);
      Sound.play('level'); buzz([20, 30, 40]);
      toast(`🏘 Соседство «${name}» создано! Позовите друзей`);
      this.sub = 'chat'; this.open();
    }catch(e){ toast('Нет связи — попробуйте ещё раз'); }
  },
  async join(hid){
    if(S.hood) return toast('Сначала выйдите из своего соседства');
    try{
      const h = await api(`hoods/${enc(hid)}`);
      if(!h) return toast('Соседство не найдено');
      if(Object.keys(h.members || {}).length >= HOOD_MAX) return toast('В соседстве нет мест');
      const t = now();
      await api(`hoods/${enc(hid)}/members/${S.pid}`, 'PUT', { nick: S.nick, lvl: S.lvl, joined: t, role: 'member' });
      // если одновременно вступили несколько и мест не хватило — выходит последний
      const after = await api(`hoods/${enc(hid)}/members`) || {};
      const order = Object.entries(after).sort((a, b) => (a[1].joined || 0) - (b[1].joined || 0)).map(([p]) => p);
      if(order.indexOf(S.pid) >= HOOD_MAX){ await api(`hoods/${enc(hid)}/members/${S.pid}`, 'DELETE'); return toast('Мест уже нет — кто-то успел раньше'); }
      S.hood = hid; S.hoodSeen = now(); save();
      await this.loadMine();
      await this.send(`👋 ${S.nick} вступил в соседство`, true);
      Sound.play('level');
      toast(`🏘 Добро пожаловать в «${h.name}»!`);
      this.sub = 'chat'; this.open();
    }catch(e){ toast('Нет связи — попробуйте ещё раз'); }
  },
  async leave(){
    const h = this.info; if(!h) return;
    if(!confirm(`Выйти из соседства «${h.name}»?`)) return;
    try{
      const rest = this.members().filter(m => m.pid !== S.pid);
      await api(`hoods/${enc(h.id)}/members/${S.pid}`, 'DELETE');
      if(!rest.length){
        await api(`hoods/${enc(h.id)}`, 'DELETE'); await api(`hoodNames/${enc(h.key || nickKey(h.name))}`, 'DELETE'); await api(`hoodchat/${enc(h.id)}`, 'DELETE');
      } else {
        await this.send(`🚪 ${S.nick} покинул соседство`, true);
        if(h.owner === S.pid){
          const next = rest.sort((a, b) => (a.joined || 0) - (b.joined || 0))[0];
          await api(`hoods/${enc(h.id)}`, 'PATCH', { owner: next.pid, ownerNick: next.nick });
          await api(`hoods/${enc(h.id)}/members/${next.pid}`, 'PATCH', { role: 'leader' });
          await this.send(`👑 Новый глава соседства — ${next.nick}`, true);
        }
      }
      S.hood = null; this.info = null; this.chat = []; save();
      toast('Вы вышли из соседства'); this.open();
    }catch(e){ toast('Нет связи — попробуйте ещё раз'); }
  },
  async kick(pid){
    if(!this.isLeader() || pid === S.pid) return;
    const m = this.info.members[pid]; if(!m) return;
    if(!confirm(`Исключить ${m.nick} из соседства?`)) return;
    try{
      await api(`hoods/${enc(this.info.id)}/members/${pid}`, 'DELETE');
      await this.send(`🚫 ${m.nick} исключён из соседства`, true);
      await this.loadMine(); this.open();
    }catch(e){ toast('Нет связи'); }
  },
  async makeLeader(pid){
    if(!this.isLeader() || pid === S.pid) return;
    const m = this.info.members[pid]; if(!m || !confirm(`Передать главенство ${m.nick}?`)) return;
    try{
      await api(`hoods/${enc(this.info.id)}`, 'PATCH', { owner: pid, ownerNick: m.nick });
      await api(`hoods/${enc(this.info.id)}/members/${pid}`, 'PATCH', { role: 'leader' });
      await api(`hoods/${enc(this.info.id)}/members/${S.pid}`, 'PATCH', { role: 'member' });
      await this.send(`👑 Новый глава соседства — ${m.nick}`, true);
      await this.loadMine(); this.open();
    }catch(e){ toast('Нет связи'); }
  },
  async editDesc(){
    if(!this.isLeader()) return;
    const d = prompt('Описание соседства (до 120 символов):', this.info.desc || '');
    if(d === null) return;
    try{ await api(`hoods/${enc(this.info.id)}`, 'PATCH', { desc: d.trim().slice(0, 120) }); await this.loadMine(); this.open(); }catch(e){ toast('Нет связи'); }
  },
  async send(text, sys){
    if(!S.hood) return;
    const m = { pid: S.pid, nick: S.nick, text: String(text).slice(0, 200), ts: now() };
    if(sys) m.sys = true;
    try{
      await api(`hoodchat/${enc(S.hood)}`, 'POST', m);
      if(!sys){ Sound.play('pop'); }
      await this.loadChat();
    }catch(e){ if(!sys) toast('Нет связи — сообщение не ушло'); }
  },

  /* ---------- окно ---------- */
  renderChat(){
    const box = $('#hoodChat'); if(!box) return;
    box.innerHTML = this.chat.map(m => m.sys
      ? `<div class="msg sys">${esc(m.text)}</div>`
      : `<div class="msg ${m.pid === S.pid ? 'me' : ''}"><b>${esc(m.nick)}${this.info?.owner === m.pid ? ' 👑' : ''}</b><span>${esc(m.text)}</span><small>${hhmm(m.ts)}</small></div>`).join('')
      || '<p class="hint">Здесь пока тихо. Поздоровайтесь с соседями!</p>';
    box.scrollTop = box.scrollHeight;
  },
  async open(){
    const kind = 'hood';
    if(!S.hood){
      showSheet('👋 Соседи', `${Social.tabs('hood')}<p class="hint">Загружаю соседства…</p>`, r => Social.bindTabs(r), null, kind);
      try{ await this.loadList(); }catch(e){ return showSheet('👋 Соседи', `${Social.tabs('hood')}<p class="hint">Нет связи — список не загрузился.</p>`, r => Social.bindTabs(r), null, kind); }
      if(sheetKind !== kind) return;
      const list = Object.entries(this.list).filter(([, h]) => h && h.name).sort((a, b) => Object.keys(b[1].members || {}).length - Object.keys(a[1].members || {}).length);
      const rows = list.map(([id, h]) => {
        const n = Object.keys(h.members || {}).length;
        return `<div class="hood-row"><span class="he">${esc(h.emoji || '🏡')}</span><div class="hi"><b>${esc(h.name)}</b><small>👥 ${n}/${HOOD_MAX} · 👑 ${esc(h.ownerNick || '')}</small>${h.desc ? `<small class="hd">${esc(h.desc)}</small>` : ''}</div>
          <button class="btn primary sm" data-join="${esc(id)}" ${n >= HOOD_MAX ? 'disabled' : ''}>Вступить</button></div>`;
      }).join('') || '<p class="hint">Соседств пока нет — создайте первое!</p>';
      showSheet('👋 Соседи', `${Social.tabs('hood')}
        <div class="card-lite"><b>🏘 Создать своё соседство</b><small>Позовите друзей: у соседства общий чат и список участников.</small>
          <label class="fld">Название <input id="hName" maxlength="24" placeholder="Например: Весёлый хутор"></label>
          <div class="emb">${HOOD_EMBLEMS.map((e, i) => `<button class="${i ? '' : 'on'}" data-emb="${e}">${e}</button>`).join('')}</div>
          <label class="fld">Описание <input id="hDesc" maxlength="120" placeholder="Кого ждём и как играем"></label>
          <button class="btn primary" id="hCreate">Создать соседство</button></div>
        <div class="card-lite"><b>🔎 Вступить в соседство</b>${rows}</div>`, r => {
        Social.bindTabs(r);
        let emb = HOOD_EMBLEMS[0];
        r.querySelectorAll('[data-emb]').forEach(b => b.onclick = () => { emb = b.dataset.emb; r.querySelectorAll('[data-emb]').forEach(x => x.classList.toggle('on', x === b)); });
        r.querySelector('#hCreate').onclick = () => this.create(r.querySelector('#hName').value, emb, r.querySelector('#hDesc').value);
        r.querySelectorAll('[data-join]').forEach(b => b.onclick = () => this.join(b.dataset.join));
      }, null, kind);
      return;
    }
    if(!this.info){
      showSheet('👋 Соседи', `${Social.tabs('hood')}<p class="hint">Загружаю соседство…</p>`, r => Social.bindTabs(r), null, kind);
      try{ await this.loadMine(); }catch(e){}
      if(sheetKind !== kind) return;
      if(!this.info) return S.hood ? showSheet('👋 Соседи', `${Social.tabs('hood')}<p class="hint">Нет связи — соседство не загрузилось.</p>`, r => Social.bindTabs(r), null, kind) : this.open();
    }
    const h = this.info, mem = this.members(), lead = this.isLeader();
    const seg = `<div class="seg"><button data-hs="chat" class="${this.sub === 'chat' ? 'active' : ''}">💬 Чат${this.unread() ? '<i class="mini-dot"></i>' : ''}</button><button data-hs="members" class="${this.sub === 'members' ? 'active' : ''}">👥 Участники (${mem.length})</button></div>`;
    let body;
    if(this.sub === 'chat'){
      body = `<div class="chat" id="hoodChat"></div>
        <div class="quick">${['👋 Привет, соседи!', '🙏 Нужна помощь', '🎁 Спасибо!', '🚚 Кто что продаёт?', '😄'].map(q => `<button class="chip" data-q="${q}">${q}</button>`).join('')}</div>
        <form class="chat-in" id="hoodForm"><input id="hoodText" maxlength="200" placeholder="Сообщение соседству" autocomplete="off"><button class="btn primary sm">➤</button></form>`;
    } else {
      body = `<div class="top">${mem.map(m => `<div class="top-row ${m.pid === S.pid ? 'me' : ''}"><span class="tp">${m.role === 'leader' ? '👑' : '🧑‍🌾'}</span><b>${onDot(m.pid)}${esc(m.nick)}</b><span class="tl">ур. ${m.lvl || 1}</span>
          <small>${m.role === 'leader' ? 'глава' : 'сосед'} · ${m.pid === S.pid ? '<span class="on-dot"></span>в сети' : seenText(m.pid)}${m.pid !== S.pid ? ` · <a href="#" data-visit="${esc(m.pid)}">в гости</a>` : ''}${lead && m.pid !== S.pid ? ` · <a href="#" data-lead="${esc(m.pid)}">сделать главой</a> · <a href="#" data-kick="${esc(m.pid)}">исключить</a>` : ''}</small></div>`).join('')}</div>
        ${lead ? '<button class="btn" id="hEdit">✏️ Изменить описание</button>' : ''}
        <button class="btn" id="hLeave">🚪 Выйти из соседства</button>`;
    }
    showSheet('👋 Соседи', `${Social.tabs('hood')}
      <div class="hood-head"><span class="he">${esc(h.emoji || '🏡')}</span><div><b>${esc(h.name)}</b><small>${esc(h.desc || 'Без описания')}</small></div></div>
      ${seg}${body}`, r => {
      Social.bindTabs(r);
      r.querySelectorAll('[data-hs]').forEach(b => b.onclick = () => { this.sub = b.dataset.hs; this.open(); });
      if(this.sub === 'chat'){
        r.querySelectorAll('[data-q]').forEach(b => b.onclick = () => this.send(b.dataset.q));
        r.querySelector('#hoodForm').onsubmit = e => { e.preventDefault(); const i = $('#hoodText'); const t = i.value.trim(); if(t){ this.send(t); i.value = ''; } };
      } else {
        r.querySelectorAll('[data-visit]').forEach(a => a.onclick = e => { e.preventDefault(); Net.visit(a.dataset.visit); });
        r.querySelectorAll('[data-kick]').forEach(a => a.onclick = e => { e.preventDefault(); this.kick(a.dataset.kick); });
        r.querySelectorAll('[data-lead]').forEach(a => a.onclick = e => { e.preventDefault(); this.makeLeader(a.dataset.lead); });
        r.querySelector('#hLeave').onclick = () => this.leave();
        r.querySelector('#hEdit')?.addEventListener('click', () => this.editDesc());
      }
    }, null, kind);
    if(this.sub === 'chat'){ this.renderChat(); this.markSeen(); Social.dot(); this.loadChat().catch(() => {}); }
  },
};
window.Hood = Hood;

// Встраиваемся во вкладки «Соседей».
Social.tabs = function(active){
  const t = [['friends', '🏡 Соседи'], ['hood', '🏘 Соседство'], ['chat', '💬 Чат'], ['fair', '🎪 Ярмарка'], ['top', '🏆 Топ']];
  const dot = k => (k === 'chat' && this.unread()) || (k === 'fair' && this.fairClaimable()) || (k === 'hood' && Hood.unread());
  return `<div class="seg stabs">${t.map(([k, n]) => `<button data-st="${k}" class="${k === active ? 'active' : ''}">${n}${dot(k) ? '<i class="mini-dot"></i>' : ''}</button>`).join('')}</div>`;
};
const socialOpen = Social.open.bind(Social);
Social.open = function(tab){ if(tab === 'hood') return Hood.open(); return socialOpen(tab); };
Social.dot = function(){
  const d = $('#friendsDot'); if(!d || !S) return;
  d.hidden = !(this.unread() || this.fairClaimable() || Hood.unread());
};
const socialSync = Social.sync.bind(Social);
Social.sync = async function(){
  await socialSync();
  if(!S || Engine.visit || !S.hood) return;
  await Promise.all([Hood.loadMine().catch(() => {}), Hood.loadChat().catch(() => {})]);
};
setInterval(() => { if(S && S.hood && sheetKind === 'hood' && Hood.sub === 'chat') Hood.loadChat().catch(() => {}); }, 4000);
