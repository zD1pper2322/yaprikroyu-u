// «Хуторок» — логика игры и экраны.
'use strict';

const $ = s => document.querySelector(s);
const now = () => Date.now();
const SAVE_KEY = 'hutorok_save_v1';

/* ===================== СОСТОЯНИЕ ===================== */
let S = null;

function newState(pid, nick){
  const plots = Array.from({ length: START_PLOTS }, () => ({ crop: null, start: 0 }));
  return {
    v: 1, pid, nick,
    coins: 80, xp: 0, lvl: 1,
    cap: START_STORAGE,
    inv: { wheat: 6, corn: 3 },
    plots,
    buildings: {
      coop: { animals: [{ start: 0 }, { start: 0 }] },
      feedmill: { queue: [] },
    },
    orders: [],
    orderCooldown: {},
    helped: {},          // кому помогал: { pid: ts }
    created: now(),
    updatedAt: now(),
  };
}

function loadLocal(){
  try{ const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if(s && s.pid) return s; }catch(e){}
  return null;
}
let saveTimer = null;
function save(){
  S.updatedAt = now();
  try{ localStorage.setItem(SAVE_KEY, JSON.stringify(S)); }catch(e){}
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => window.Net && Net.pushState(), 1500);
}

/* ===================== ПОДСЧЁТЫ ===================== */
const unlocked = key => (ITEMS[key]?.lvl || BUILDINGS[key]?.lvl || ANIMALS[key]?.lvl || 1) <= S.lvl;
const have = k => S.inv[k] || 0;
function stored(){ return Object.values(S.inv).reduce((a, b) => a + b, 0); }
function spaceLeft(){ return S.cap - stored(); }
function add(k, n){ S.inv[k] = have(k) + n; if(S.inv[k] <= 0) delete S.inv[k]; }
function canPay(map){ return Object.entries(map).every(([k, n]) => have(k) >= n); }
function pay(map){ Object.entries(map).forEach(([k, n]) => add(k, -n)); }
function fmtTime(sec){
  sec = Math.max(0, Math.ceil(sec));
  if(sec < 60) return sec + ' с';
  const m = Math.floor(sec / 60), s = sec % 60;
  if(m < 60) return s ? `${m} мин ${s} с` : `${m} мин`;
  const h = Math.floor(m / 60), mm = m % 60;
  return mm ? `${h} ч ${mm} мин` : `${h} ч`;
}
const label = k => `${ITEMS[k].e} ${ITEMS[k].n}`;
const listStr = map => Object.entries(map).map(([k, n]) => `${ITEMS[k].e}×${n}`).join(' ');

function gainXp(n){
  S.xp += n;
  let up = false;
  while(S.xp >= xpForLevel(S.lvl)){
    S.xp -= xpForLevel(S.lvl);
    S.lvl++;
    up = true;
    const opened = [
      ...Object.keys(ITEMS).filter(k => ITEMS[k].lvl === S.lvl && ITEMS[k].kind !== 'feed').map(k => ITEMS[k].e + ' ' + ITEMS[k].n),
      ...Object.keys(BUILDINGS).filter(k => BUILDINGS[k].lvl === S.lvl).map(k => BUILDINGS[k].e + ' ' + BUILDINGS[k].n),
    ];
    S.coins += 20 * S.lvl;
    showSheet(`🎉 Уровень ${S.lvl}!`, `<p class="big">Награда: 🪙 ${20 * S.lvl}</p>${opened.length ? `<p>Открыто:</p><div class="chips">${opened.map(o => `<span class="chip">${o}</span>`).join('')}</div>` : ''}<button class="btn primary" data-close>Отлично</button>`);
  }
  if(up) fillOrders();
}

/* ===================== ПОЛЕ ===================== */
function plotState(p){
  if(!p.crop) return { s:'empty' };
  const left = p.start + ITEMS[p.crop].time * 1000 - now();
  return left <= 0 ? { s:'ready' } : { s:'growing', left: left / 1000, pct: 1 - left / (ITEMS[p.crop].time * 1000) };
}
function plant(i, crop, opts = {}){
  const p = S.plots[i];
  if(p.crop) return false;
  if(have(crop) < 1){
    const cost = ITEMS[crop].price * 2;
    if(!opts.buy) return false;
    if(S.coins < cost){ toast('Не хватает монет'); return false; }
    S.coins -= cost;
  } else add(crop, -1);
  p.crop = crop; p.start = now();
  return true;
}
function harvest(i){
  const p = S.plots[i];
  if(plotState(p).s !== 'ready') return false;
  if(spaceLeft() < 2){ toast('📦 Склад полон — продайте что-нибудь или расширьте склад'); return false; }
  add(p.crop, 2);
  gainXp(ITEMS[p.crop].xp);
  floatText(`.plot[data-i="${i}"]`, `+2 ${ITEMS[p.crop].e}`);
  p.crop = null; p.start = 0;
  return true;
}
function harvestAll(){
  let n = 0;
  S.plots.forEach((p, i) => { if(harvest(i)) n++; });
  if(n){ save(); render(); } else toast('Пока нечего собирать');
}

function openPlantSheet(i){
  const crops = CROPS.filter(unlocked);
  const html = `<div class="pick">${crops.map(k => {
    const it = ITEMS[k];
    const n = have(k);
    return `<button class="pick-item" data-crop="${k}">
      <span class="pe">${it.e}</span>
      <span class="pn">${it.n}</span>
      <span class="pm">${fmtTime(it.time)} · ${n ? `есть ${n}` : `🪙 ${it.price * 2}`}</span>
    </button>`;
  }).join('')}</div>
  <label class="check"><input type="checkbox" id="plantAll" checked> Засеять все пустые грядки</label>`;
  showSheet('Что посадить?', html, sheet => {
    sheet.querySelectorAll('[data-crop]').forEach(b => b.onclick = () => {
      const crop = b.dataset.crop;
      const all = sheet.querySelector('#plantAll').checked;
      const targets = all ? S.plots.map((p, j) => j).filter(j => !S.plots[j].crop) : [i];
      if(!targets.includes(i)) targets.unshift(i);
      let planted = 0;
      for(const j of targets){
        const buy = have(crop) < 1 && planted === 0;  // одно семя можно докупить, если нет совсем
        if(!plant(j, crop, { buy })) break;
        planted++;
      }
      if(planted){ save(); closeSheet(); render(); }
      else toast(`Нет ${ITEMS[crop].n.toLowerCase()} и не хватает монет на семена`);
    });
  });
}
function buyPlot(){
  if(S.plots.length >= MAX_PLOTS) return toast('Больше грядок не поместится');
  const cost = plotCost(S.plots.length);
  if(S.coins < cost) return toast(`Нужно 🪙 ${cost}`);
  S.coins -= cost;
  S.plots.push({ crop: null, start: 0 });
  save(); render();
}

/* ===================== ЖИВОТНЫЕ ===================== */
function houseOf(animal){ return ANIMALS[animal].house; }
function animalState(a, kind){
  if(!a.start) return { s:'hungry' };
  const left = a.start + ANIMALS[kind].time * 1000 - now();
  return left <= 0 ? { s:'ready' } : { s:'eating', left: left / 1000, pct: 1 - left / (ANIMALS[kind].time * 1000) };
}
function tapAnimal(hk, idx){
  const B = BUILDINGS[hk], kind = B.animal, A = ANIMALS[kind];
  const a = S.buildings[hk].animals[idx];
  const st = animalState(a, kind);
  if(st.s === 'ready'){
    if(spaceLeft() < 1) return toast('📦 Склад полон');
    add(A.makes, 1); gainXp(ITEMS[A.makes].xp);
    a.start = 0;
    floatText(`[data-animal="${hk}-${idx}"]`, `+1 ${ITEMS[A.makes].e}`);
    save(); render(); return;
  }
  if(st.s === 'hungry'){
    if(have(A.feed) < 1) return toast(`Нужен ${ITEMS[A.feed].n.toLowerCase()} — сделайте на кормовом заводе`);
    add(A.feed, -1); a.start = now();
    save(); render(); return;
  }
  toast(`${A.e} ${A.n}: ещё ${fmtTime(st.left)}`);
}
function feedAll(hk){
  const B = BUILDINGS[hk], A = ANIMALS[B.animal];
  let fed = 0, got = 0;
  S.buildings[hk].animals.forEach(a => {
    const st = animalState(a, B.animal);
    if(st.s === 'ready' && spaceLeft() > 0){ add(A.makes, 1); gainXp(ITEMS[A.makes].xp); a.start = 0; got++; }
    if(!a.start && have(A.feed) > 0){ add(A.feed, -1); a.start = now(); fed++; }
  });
  if(!fed && !got) toast(have(A.feed) ? 'Все уже сыты' : `Нет: ${ITEMS[A.feed].n.toLowerCase()}`);
  save(); render();
}
function buyAnimal(hk){
  const B = BUILDINGS[hk], A = ANIMALS[B.animal];
  const list = S.buildings[hk].animals;
  if(list.length >= B.slots) return toast('В загоне нет места');
  const cost = A.cost * (list.length + 1);
  if(S.coins < cost) return toast(`Нужно 🪙 ${cost}`);
  S.coins -= cost; list.push({ start: 0 });
  save(); render();
}

/* ===================== ПОСТРОЙКИ И ЗАВОДЫ ===================== */
function build(k){
  const B = BUILDINGS[k];
  if(S.buildings[k]) return;
  if(!unlocked(k)) return toast(`Откроется на уровне ${B.lvl}`);
  if(S.coins < B.cost) return toast(`Нужно 🪙 ${B.cost}`);
  S.coins -= B.cost;
  S.buildings[k] = B.kind === 'house' ? { animals: [{ start: 0 }] } : { queue: [] };
  gainXp(5 + B.lvl * 2);
  save(); render();
}
function queueEnd(q){ return q.length ? q[q.length - 1].end : 0; }
function produce(bk, item){
  const R = RECIPES[item];
  const q = S.buildings[bk].queue;
  if(q.length >= FACTORY_QUEUE) return toast('Очередь заполнена — заберите готовое');
  if(!canPay(R.in)) return toast('Не хватает: ' + Object.entries(R.in).filter(([k, n]) => have(k) < n).map(([k, n]) => `${ITEMS[k].e}×${n - have(k)}`).join(' '));
  pay(R.in);
  const start = Math.max(now(), queueEnd(q));
  q.push({ item, start, end: start + R.time * 1000 });
  save(); render();
}
function collectFactory(bk){
  const q = S.buildings[bk].queue;
  let got = 0;
  while(q.length && q[0].end <= now()){
    const it = q[0].item, n = RECIPES[it].out;
    if(spaceLeft() < n){ toast('📦 Склад полон'); break; }
    add(it, n); gainXp(ITEMS[it].xp * n); q.shift(); got++;
  }
  if(got){ save(); render(); }
}

/* ===================== ЗАКАЗЫ ===================== */
const ORDER_SLOTS = () => Math.min(6, 3 + Math.floor(S.lvl / 4));
function orderable(){
  return Object.keys(ITEMS).filter(k => ITEMS[k].kind !== 'feed' && unlocked(k) && (ITEMS[k].kind !== 'good' || S.buildings[RECIPES[k].b]) && (ITEMS[k].kind !== 'animal' || S.buildings[houseOf(Object.keys(ANIMALS).find(a => ANIMALS[a].makes === k))]));
}
function makeOrder(){
  const pool = orderable();
  const kinds = Math.min(pool.length, 1 + Math.floor(Math.random() * Math.min(3, 1 + S.lvl / 3)));
  const items = {};
  const shuffled = pool.sort(() => Math.random() - 0.5).slice(0, kinds);
  shuffled.forEach(k => {
    const kind = ITEMS[k].kind;
    const max = kind === 'crop' ? 4 + Math.floor(S.lvl / 2) : kind === 'animal' ? 3 : 2;
    items[k] = 1 + Math.floor(Math.random() * max);
  });
  const value = Object.entries(items).reduce((s, [k, n]) => s + ITEMS[k].price * n, 0);
  const xp = Object.entries(items).reduce((s, [k, n]) => s + ITEMS[k].xp * n, 0);
  const who = ['🧑‍🌾 Фермер Петя', '👵 Бабушка Зина', '👨‍🍳 Повар Антон', '🧑‍🏫 Учитель', '🚚 Водитель', '👩‍⚕️ Доктор', '🧒 Ваня', '🐻 Мишка-сластёна'];
  return { id: 'o' + now().toString(36) + Math.random().toString(36).slice(2, 5), who: who[Math.floor(Math.random() * who.length)], items, coins: Math.round(value * 1.6 + 5), xp: Math.round(xp * 1.5 + 2) };
}
function fillOrders(){
  const slots = ORDER_SLOTS();
  while(S.orders.length < slots) S.orders.push(null);
  S.orders = S.orders.slice(0, slots).map((o, i) => o || ((S.orderCooldown[i] || 0) <= now() ? makeOrder() : null));
}
function completeOrder(i){
  const o = S.orders[i];
  if(!o) return;
  if(!canPay(o.items)) return toast('Не хватает товаров');
  pay(o.items); S.coins += o.coins; gainXp(o.xp);
  S.orders[i] = null; S.orderCooldown[i] = now() + 20 * 1000;
  toast(`✅ +🪙 ${o.coins}  +⭐ ${o.xp}`);
  save(); render();
}
function skipOrder(i){
  S.orders[i] = null; S.orderCooldown[i] = now() + 90 * 1000;
  save(); render();
}

/* ===================== СКЛАД ===================== */
function sellOne(k, n = 1){
  if(have(k) < n) return;
  add(k, -n); S.coins += ITEMS[k].price * n;
  save(); render();
}
function upgradeStorage(){
  const cost = storageUpgradeCost(S.cap);
  if(S.coins < cost) return toast(`Нужно 🪙 ${cost}`);
  S.coins -= cost; S.cap += 25;
  toast(`📦 Склад: ${S.cap} мест`);
  save(); render();
}

/* ===================== ИНТЕРФЕЙС ===================== */
let tab = 'field';
let sheetOnClose = null;

function toast(text){
  const t = $('#toast'); t.textContent = text; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2600);
}
function floatText(sel, text){
  const el = document.querySelector(sel); if(!el) return;
  const r = el.getBoundingClientRect();
  const f = document.createElement('div'); f.className = 'float'; f.textContent = text;
  f.style.left = (r.left + r.width / 2) + 'px'; f.style.top = (r.top + 10) + 'px';
  document.body.appendChild(f); setTimeout(() => f.remove(), 1100);
}
function showSheet(title, html, bind, onClose){
  $('#sheetTitle').textContent = title;
  $('#sheetBody').innerHTML = html;
  $('#sheet').classList.add('show');
  sheetOnClose = onClose || null;
  $('#sheetBody').querySelectorAll('[data-close]').forEach(b => b.onclick = closeSheet);
  if(bind) bind($('#sheetBody'));
}
function closeSheet(){ $('#sheet').classList.remove('show'); const f = sheetOnClose; sheetOnClose = null; if(f) f(); }

function renderHud(){
  const need = xpForLevel(S.lvl);
  $('#hudLvl').textContent = S.lvl;
  $('#hudXp').style.width = Math.min(100, S.xp / need * 100) + '%';
  $('#hudXpText').textContent = `${S.xp}/${need}`;
  $('#hudCoins').textContent = S.coins;
  $('#hudStore').textContent = `${stored()}/${S.cap}`;
  $('#hudNick').textContent = S.nick;
}

function viewField(){
  const ready = S.plots.some(p => plotState(p).s === 'ready');
  const plots = S.plots.map((p, i) => {
    const st = plotState(p);
    const it = p.crop ? ITEMS[p.crop] : null;
    const helpBadge = p.helpedBy ? `<span class="help-badge" title="Помог ${p.helpedBy}">💧</span>` : '';
    if(st.s === 'empty') return `<button class="plot empty" data-i="${i}"><span class="soil">＋</span></button>`;
    if(st.s === 'ready') return `<button class="plot ready" data-i="${i}">${helpBadge}<span class="crop big">${it.e}</span><span class="t">Собрать</span></button>`;
    return `<button class="plot growing" data-i="${i}">${helpBadge}<span class="crop" style="transform:scale(${0.65 + st.pct * 0.35})">${it.e}</span><span class="t">${fmtTime(st.left)}</span><span class="bar"><i style="width:${st.pct * 100}%"></i></span></button>`;
  }).join('');
  const more = S.plots.length < MAX_PLOTS ? `<button class="plot buy" id="buyPlot"><span>＋ Грядка</span><span class="t">🪙 ${plotCost(S.plots.length)}</span></button>` : '';
  return `<div class="toolbar"><h2>Поле</h2>${ready ? '<button class="btn primary sm" id="harvestAll">🧺 Собрать всё</button>' : ''}</div>
    <div class="field">${plots}${more}</div>
    <p class="hint">Посадка тратит 1 штуку, урожай — 2. Нет семян? Можно купить одно на грядку.</p>`;
}
function bindField(root){
  root.querySelectorAll('.plot[data-i]').forEach(b => b.onclick = () => {
    const i = +b.dataset.i, st = plotState(S.plots[i]);
    if(st.s === 'empty') openPlantSheet(i);
    else if(st.s === 'ready'){ if(harvest(i)){ save(); render(); } }
    else toast(`${ITEMS[S.plots[i].crop].e} ещё ${fmtTime(st.left)}`);
  });
  root.querySelector('#harvestAll')?.addEventListener('click', harvestAll);
  root.querySelector('#buyPlot')?.addEventListener('click', buyPlot);
}

function viewAnimals(){
  return `<div class="toolbar"><h2>Животные</h2></div>` + Object.keys(BUILDINGS).filter(k => BUILDINGS[k].kind === 'house').map(hk => {
    const B = BUILDINGS[hk], A = ANIMALS[B.animal];
    const bs = S.buildings[hk];
    if(!bs){
      return `<div class="card locked"><div class="card-h"><span class="ce">${B.e}</span><div><b>${B.n}</b><small>${A.e} ${A.n} · даёт ${label(A.makes)}</small></div></div>
        ${unlocked(hk) ? `<button class="btn primary" data-build="${hk}">Построить за 🪙 ${B.cost}</button>` : `<p class="hint">🔒 Откроется на уровне ${B.lvl}</p>`}</div>`;
    }
    const animals = bs.animals.map((a, i) => {
      const st = animalState(a, B.animal);
      const cls = st.s;
      const inner = st.s === 'ready' ? `<span class="ae">${A.e}</span><span class="prod">${ITEMS[A.makes].e}</span><span class="t">Забрать</span>`
        : st.s === 'hungry' ? `<span class="ae">${A.e}</span><span class="t">Покормить ${ITEMS[A.feed].e}</span>`
        : `<span class="ae">${A.e}</span><span class="t">${fmtTime(st.left)}</span><span class="bar"><i style="width:${st.pct * 100}%"></i></span>`;
      return `<button class="animal ${cls}" data-animal="${hk}-${i}">${inner}</button>`;
    }).join('');
    const canMore = bs.animals.length < B.slots;
    return `<div class="card"><div class="card-h"><span class="ce">${B.e}</span><div><b>${B.n}</b><small>Корм: ${label(A.feed)} — есть ${have(A.feed)}</small></div>
        <button class="btn sm" data-feedall="${hk}">Покормить всех</button></div>
      <div class="animals">${animals}${canMore ? `<button class="animal buy" data-buyanimal="${hk}">＋ ${A.e}<span class="t">🪙 ${A.cost * (bs.animals.length + 1)}</span></button>` : ''}</div></div>`;
  }).join('');
}
function bindAnimals(root){
  root.querySelectorAll('[data-animal]').forEach(b => b.onclick = () => { const [hk, i] = b.dataset.animal.split('-'); tapAnimal(hk, +i); });
  root.querySelectorAll('[data-feedall]').forEach(b => b.onclick = () => feedAll(b.dataset.feedall));
  root.querySelectorAll('[data-buyanimal]').forEach(b => b.onclick = () => buyAnimal(b.dataset.buyanimal));
  root.querySelectorAll('[data-build]').forEach(b => b.onclick = () => build(b.dataset.build));
}

function viewFactories(){
  return `<div class="toolbar"><h2>Производство</h2></div>` + Object.keys(BUILDINGS).filter(k => BUILDINGS[k].kind === 'factory').map(bk => {
    const B = BUILDINGS[bk];
    const bs = S.buildings[bk];
    const recipes = Object.keys(RECIPES).filter(r => RECIPES[r].b === bk);
    if(!bs){
      return `<div class="card locked"><div class="card-h"><span class="ce">${B.e}</span><div><b>${B.n}</b><small>${recipes.map(r => ITEMS[r].e).join(' ')}</small></div></div>
        ${unlocked(bk) ? `<button class="btn primary" data-build="${bk}">Построить за 🪙 ${B.cost}</button>` : `<p class="hint">🔒 Откроется на уровне ${B.lvl}</p>`}</div>`;
    }
    const q = bs.queue;
    const doneN = q.filter(j => j.end <= now()).length;
    const queue = q.map((j, idx) => {
      const left = (j.end - now()) / 1000;
      const running = j.start <= now() && left > 0;
      const pct = running ? 1 - left / RECIPES[j.item].time : (left <= 0 ? 1 : 0);
      return `<div class="job ${left <= 0 ? 'done' : running ? 'run' : 'wait'}"><span>${ITEMS[j.item].e}${RECIPES[j.item].out > 1 ? '×' + RECIPES[j.item].out : ''}</span>
        <small>${left <= 0 ? 'готово' : running ? fmtTime(left) : 'в очереди'}</small><span class="bar"><i style="width:${pct * 100}%"></i></span></div>`;
    }).join('') + Array.from({ length: FACTORY_QUEUE - q.length }, () => '<div class="job empty">свободно</div>').join('');
    const menu = recipes.map(r => {
      const R = RECIPES[r], ok = unlocked(r);
      const enough = canPay(R.in);
      return `<button class="recipe ${ok ? '' : 'lock'} ${enough ? 'ok' : ''}" ${ok ? `data-make="${bk}:${r}"` : 'disabled'}>
        <span class="re">${ITEMS[r].e}${R.out > 1 ? '<sub>×' + R.out + '</sub>' : ''}</span>
        <span class="rn">${ITEMS[r].n}</span>
        <span class="ri">${ok ? listStr(R.in) + ' · ' + fmtTime(R.time) : '🔒 ур. ' + ITEMS[r].lvl}</span></button>`;
    }).join('');
    return `<div class="card"><div class="card-h"><span class="ce">${B.e}</span><div><b>${B.n}</b><small>Очередь ${q.length}/${FACTORY_QUEUE}</small></div>
      ${doneN ? `<button class="btn primary sm" data-collect="${bk}">Забрать ${doneN}</button>` : ''}</div>
      <div class="queue">${queue}</div><div class="recipes">${menu}</div></div>`;
  }).join('');
}
function bindFactories(root){
  root.querySelectorAll('[data-build]').forEach(b => b.onclick = () => build(b.dataset.build));
  root.querySelectorAll('[data-make]').forEach(b => b.onclick = () => { const [bk, r] = b.dataset.make.split(':'); produce(bk, r); });
  root.querySelectorAll('[data-collect]').forEach(b => b.onclick = () => collectFactory(b.dataset.collect));
}

function viewOrders(){
  fillOrders();
  const cards = S.orders.map((o, i) => {
    if(!o){
      const left = ((S.orderCooldown[i] || 0) - now()) / 1000;
      return `<div class="order wait"><span class="who">🚶 Новый заказ</span><small>через ${fmtTime(left)}</small></div>`;
    }
    const ok = canPay(o.items);
    const lines = Object.entries(o.items).map(([k, n]) => `<li class="${have(k) >= n ? 'got' : ''}">${ITEMS[k].e} ${ITEMS[k].n} <b>${have(k)}/${n}</b></li>`).join('');
    return `<div class="order ${ok ? 'can' : ''}"><span class="who">${o.who}</span><ul>${lines}</ul>
      <div class="reward">🪙 ${o.coins} · ⭐ ${o.xp}</div>
      <div class="row"><button class="btn ${ok ? 'primary' : ''}" data-done="${i}" ${ok ? '' : 'disabled'}>Отдать</button><button class="btn ghost" data-skip="${i}" title="Убрать заказ">✕</button></div></div>`;
  }).join('');
  return `<div class="toolbar"><h2>Заказы</h2></div><div class="orders">${cards}</div><p class="hint">Заказы приносят больше монет, чем продажа на складе.</p>`;
}
function bindOrders(root){
  root.querySelectorAll('[data-done]').forEach(b => b.onclick = () => completeOrder(+b.dataset.done));
  root.querySelectorAll('[data-skip]').forEach(b => b.onclick = () => skipOrder(+b.dataset.skip));
}

function openStorage(){
  const keys = Object.keys(S.inv).filter(k => have(k) > 0).sort((a, b) => ITEMS[a].price - ITEMS[b].price);
  const rows = keys.map(k => `<div class="inv-row"><span class="ie">${ITEMS[k].e}</span><span class="in">${ITEMS[k].n}<small>🪙 ${ITEMS[k].price} за шт.</small></span><b class="iq">${have(k)}</b>
      <button class="btn sm" data-sell="${k}">Продать 1</button></div>`).join('') || '<p class="hint">Склад пуст.</p>';
  const cost = storageUpgradeCost(S.cap);
  showSheet(`📦 Склад ${stored()}/${S.cap}`, `<div class="inv">${rows}</div>
    <button class="btn primary" id="upStore">Расширить до ${S.cap + 25} за 🪙 ${cost}</button>
    <p class="hint">Продавать друзьям дороже — через 🏪 Лавку во вкладке «Соседи».</p>`, sheet => {
    sheet.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => { sellOne(b.dataset.sell); openStorage(); });
    sheet.querySelector('#upStore').onclick = () => { upgradeStorage(); openStorage(); };
  });
}

const VIEWS = {
  field:     [viewField, bindField],
  animals:   [viewAnimals, bindAnimals],
  factories: [viewFactories, bindFactories],
  orders:    [viewOrders, bindOrders],
  friends:   [() => window.Net ? Net.viewFriends() : '', root => window.Net && Net.bindFriends(root)],
};
function render(){
  if(!S) return;
  renderHud();
  const [view, bind] = VIEWS[tab];
  const main = $('#main');
  const scroll = main.scrollTop;
  main.innerHTML = view();
  bind(main);
  main.scrollTop = scroll;
  document.querySelectorAll('.nav button').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const readyField = S.plots.some(p => plotState(p).s === 'ready');
  const readyOrders = (S.orders || []).some(o => o && canPay(o.items));
  $('#navFieldDot').hidden = !readyField || tab === 'field';
  $('#navOrdersDot').hidden = !readyOrders || tab === 'orders';
}
function setTab(t){ tab = t; $('#main').scrollTop = 0; render(); }

// Тик: каждую секунду обновляем таймеры (если не открыт ввод).
setInterval(() => {
  if(!S) return;
  const a = document.activeElement;
  if(a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT')) return;
  if(tab === 'friends' && window.Net && Net.isBusy()) return;
  render();
}, 1000);

function startGame(state){
  S = state;
  // совместимость со старыми сохранениями
  S.orders = S.orders || []; S.orderCooldown = S.orderCooldown || {}; S.helped = S.helped || {};
  S.buildings = S.buildings || {};
  fillOrders();
  $('#auth').hidden = true;
  $('#app').hidden = false;
  render();
  save();
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.nav button').forEach(b => b.onclick = () => setTab(b.dataset.tab));
  $('#hudStoreBtn').onclick = openStorage;
  $('#sheetClose').onclick = closeSheet;
  $('#sheet').onclick = e => { if(e.target.id === 'sheet') closeSheet(); };
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
});
