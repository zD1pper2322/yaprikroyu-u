// «Хуторок» — логика игры и окна (заводы, склад, заказы, магазин).
'use strict';

const $ = s => document.querySelector(s);
const now = () => Date.now();
const SAVE_KEY = 'hutorok_save_v1';

/* ===================== СОСТОЯНИЕ ===================== */
let S = null;

function newState(pid, nick){
  const st = {
    v: 4, pid, nick,
    coins: 80, xp: 0, lvl: 1,
    cap: START_STORAGE,
    inv: { wheat: 8, corn: 3 },
    plots: [],
    buildings: { coop: { animals: [{ start: 0 }, { start: 0 }] }, feedmill: { queue: [] } },
    decor: [],
    orders: [], orderCooldown: {}, helped: {},
    truck: null, tut: 0, sound: true,
    created: now(), updatedAt: now(),
  };
  for(let i = 0; i < START_PLOTS; i++) st.plots.push({ crop: null, start: 0 });
  return migrate(st);
}

// Расстановка по карте: старые сохранения (без координат) раскладываются по местам по умолчанию.
function migrate(st){
  st.decor = st.decor || []; st.orders = st.orders || []; st.orderCooldown = st.orderCooldown || {}; st.helped = st.helped || {};
  st.buildings = st.buildings || {};
  if(st.sound === undefined) st.sound = true;
  if(st.music === undefined) st.music = true;
  if(st.vibro === undefined) st.vibro = true;
  if(st.tut === undefined) st.tut = st.v >= 2 ? 0 : 99;   // старым игрокам обучение не показываем
  if((st.v || 1) < 3){
    // новая раскладка под изометрический вид: всё расставляется заново
    delete st.fixed;
    for(const b of Object.values(st.buildings)) { delete b.gx; delete b.gy; }
    (st.plots || []).forEach(p => { delete p.gx; delete p.gy; });
    (st.decor || []).forEach(d => { delete d.gx; delete d.gy; });
  }
  if((st.v || 1) < 4){
    // v4: новая раскладка построек — фасады не закрывают друг друга
    for(const b of Object.values(st.buildings)) { delete b.gx; delete b.gy; }
  }
  st.fixed = st.fixed || { storage: { gx: FIXED.storage.spot[0], gy: FIXED.storage.spot[1] }, board: { gx: FIXED.board.spot[0], gy: FIXED.board.spot[1] } };
  const occ = makeOcc(st);
  for(const [k, b] of Object.entries(st.buildings)){
    if(!BUILDINGS[k]) { delete st.buildings[k]; continue; }
    if(b.gx === undefined){ const p = findSpot(occ, BUILDINGS[k].w, BUILDINGS[k].h, BUILDINGS[k].spot); b.gx = p[0]; b.gy = p[1]; occ.mark(b.gx, b.gy, BUILDINGS[k].w, BUILDINGS[k].h); }
  }
  st.plots.forEach((p, i) => {
    p.id = p.id || 'p' + i + Math.random().toString(36).slice(2, 5);
    if(p.gx === undefined){
      const pref = [7 + (i % 3) * 2, 7 + Math.floor(i / 3) * 2];
      const s = findSpot(occ, PLOT, PLOT, pref); p.gx = s[0]; p.gy = s[1]; occ.mark(p.gx, p.gy, PLOT, PLOT);
    }
  });
  st.decor = st.decor.filter(d => DECOR[d.kind]);
  st.decor.forEach(d => {
    if(d.gx === undefined){ const s = findSpot(occ, DECOR[d.kind].w, DECOR[d.kind].h, [11, 4]); if(s){ d.gx = s[0]; d.gy = s[1]; occ.mark(d.gx, d.gy, DECOR[d.kind].w, DECOR[d.kind].h); } }
  });
  st.decor = st.decor.filter(d => d.gx !== undefined);
  st.v = 4;
  return migrateExtra(st);
}

/* ---------- занятость клеток ---------- */
function footprints(st, skip){
  const list = [];
  st.plots.forEach((p, i) => { if(skip !== 'plot:' + i && p.gx !== undefined) list.push([p.gx, p.gy, PLOT, PLOT]); });
  for(const [k, b] of Object.entries(st.buildings)) if(skip !== 'building:' + k && b.gx !== undefined) list.push([b.gx, b.gy, BUILDINGS[k].w, BUILDINGS[k].h]);
  for(const [k, f] of Object.entries(st.fixed || {})) list.push([f.gx, f.gy, FIXED[k].w, FIXED[k].h]);
  (st.decor || []).forEach((d, i) => { if(skip !== 'decor:' + i) list.push([d.gx, d.gy, DECOR[d.kind].w, DECOR[d.kind].h]); });
  list.push([0, 6, 4, 2]);   // дорога к доске заказов
  return list;
}
function makeOcc(st, skip){
  const grid = new Uint8Array(MAP_W * MAP_H);
  const occ = {
    mark(x, y, w, h){ for(let j = y; j < y + h; j++) for(let i = x; i < x + w; i++) if(i >= 0 && j >= 0 && i < MAP_W && j < MAP_H) grid[j * MAP_W + i] = 1; },
    free(x, y, w, h){
      if(x < 1 || y < 1 || x + w > MAP_W - 1 || y + h > MAP_H - 1) return false;
      for(let j = y; j < y + h; j++) for(let i = x; i < x + w; i++) if(grid[j * MAP_W + i]) return false;
      return true;
    },
  };
  footprints(st, skip).forEach(f => occ.mark(...f));
  return occ;
}
function findSpot(occ, w, h, pref, ok){
  const [px, py] = pref || [Math.floor(MAP_W / 2), Math.floor(MAP_H / 2)];
  for(let r = 0; r < Math.max(MAP_W, MAP_H); r++){
    for(let dy = -r; dy <= r; dy++) for(let dx = -r; dx <= r; dx++){
      if(Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
      if(occ.free(px + dx, py + dy, w, h) && (!ok || ok(px + dx, py + dy))) return [px + dx, py + dy];
    }
  }
  return ok ? findSpot(occ, w, h, pref) : null;
}
// Не ставить новое так, чтобы оно закрывало фасады построек (или чтобы его фасад закрыли).
function frontPoints(st, kind, key, gx, gy, w, h){
  const T = TILE, x = gx * T, y = gy * T, W = w * T, H = h * T, P = (a, b, hh = 0) => { const q = Art.P(a, b); return { x: q.x, y: q.y - hh }; };
  if(kind === 'house') return [P(x + W * 0.3, y + H * 0.6, 8), P(x + W * 0.6, y + H * 0.7, 8), P(x + W - 1.4 * T, y + 2 * T, 40)];
  if(kind === 'factory' || kind === 'storage') return [P(x + W * 0.3, y + H, 22), P(x + W * 0.5, y + H, 30), P(x + W * 0.7, y + H, 22), P(x + W * 0.5, y + H * 0.5, 100)];
  if(kind === 'board') return [P(x + W * 0.5, y + H * 0.7, 70)];
  return [];
}
function clearView(st, cand){
  const objs = Engine.objects().filter(o => o.key !== cand.key && o.type !== 'plot');
  const depth = o => o.gx + o.w / 2 + o.gy + o.h / 2;
  const sc = Engine.silhouette(cand), myFront = frontPoints(st, cand.type, cand.key, cand.gx, cand.gy, cand.w, cand.h);
  for(const o of objs){
    if(depth(o) > depth(cand)){ if(myFront.length && myFront.some(q => inPoly(q, Engine.silhouette(o)))) return false; }
    else if(frontPoints(st, o.type, o.key, o.gx, o.gy, o.w, o.h).some(q => inPoly(q, sc))) return false;
  }
  return true;
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
  renderHud();
}

/* ===================== ПОДСЧЁТЫ ===================== */
// Ограничений по уровню нет: всё доступно сразу, нужны только монеты.
const unlocked = () => true;
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
const CROP_COLORS = { wheat:['#f2c94c','#e0a933','#fff0a8'], corn:['#f9d84a','#7cb342','#fff59d'], carrot:['#f08a24','#5fa83a','#ffb066'], cane:['#9ccc65','#689f38','#dcedc8'],
  tomato:['#e5533d','#ff8a65','#5fa83a'], strawberry:['#d62f4b','#ff7b93','#5fa83a'], pumpkin:['#f39c12','#e67e22','#5fa83a'] };
function buzz(p){ if(S && S.vibro && navigator.vibrate) try{ navigator.vibrate(p); }catch(e){} }
const listStr = map => Object.entries(map).map(([k, n]) => `${ITEMS[k].e}×${n}`).join(' ');

function gainXp(n){
  S.xp += n;
  while(S.xp >= xpForLevel(S.lvl)){
    S.xp -= xpForLevel(S.lvl);
    S.lvl++;
    const opened = [];
    S.coins += 20 * S.lvl;
    const lg = S.lvl % 5 === 0 ? 3 : 1; addGems(lg);
    if(S.lvl >= 3 && window.Social) Social.sys(`🎉 ${S.nick} достиг ${S.lvl} уровня!`);
    Sound.play('level'); buzz([30, 40, 60]);
    { const c = Engine.toWorld(window.innerWidth / 2, window.innerHeight / 2); Engine.burst(c.x, c.y, 'confetti', { n: 60, lift: 60 }); }
    showSheet(`🎉 Уровень ${S.lvl}!`, `<p class="big">Награда: 🪙 ${20 * S.lvl} и 💎 ${lg}</p>${opened.length ? `<p>Открыто:</p><div class="chips">${opened.map(o => `<span class="chip">${o}</span>`).join('')}</div>` : ''}<button class="btn primary" data-close>Отлично</button>`);
    fillOrders();
  }
}

/* ===================== ПОЛЕ ===================== */
function plotState(p){
  if(!p.crop) return { s:'empty' };
  const total = ITEMS[p.crop].time * 1000;
  const left = p.start + total - now();
  return left <= 0 ? { s:'ready', pct: 1 } : { s:'growing', left: left / 1000, pct: 1 - left / total };
}
function plant(i, crop){
  const p = S.plots[i];
  if(!p || p.crop) return false;
  if(have(crop) < 1){
    const cost = ITEMS[crop].price * 2;
    if(S.coins < cost){ toast(`Нет: ${ITEMS[crop].n.toLowerCase()}. Купить семена — 🪙 ${cost}`); return false; }
    S.coins -= cost;
  } else add(crop, -1);
  p.crop = crop; p.start = now(); delete p.helpedBy;
  Engine.burst((p.gx + 1) * TILE, (p.gy + 1) * TILE, 'dust', { n: 6, lift: 0 });
  Sound.play('plant');
  Tut.on('plant'); Daily.on('plant');
  return true;
}
function harvest(i){
  const p = S.plots[i];
  if(!p || plotState(p).s !== 'ready') return false;
  if(spaceLeft() < 2){ toast('📦 Амбар полон — продайте что-нибудь или расширьте амбар'); return false; }
  const crop = p.crop;
  add(crop, 2);
  gainXp(ITEMS[crop].xp);
  p.crop = null; p.start = 0; delete p.helpedBy;
  Engine.flyFromWorld(ITEMS[crop].e + '×2', p.gx * TILE + TILE, p.gy * TILE + TILE / 2, 'store');
  Engine.burst((p.gx + 1) * TILE, (p.gy + 1) * TILE, 'crop', { n: 12, colors: CROP_COLORS[crop], lift: 20 });
  Sound.play('harvest'); buzz(8);
  Tut.on('harvest'); Daily.on('harvest', crop, 2);
  return true;
}
function buyPlot(){
  if(S.plots.length >= MAX_PLOTS) return toast('Больше грядок не поместится');
  const cost = plotCost(S.plots.length);
  if(S.coins < cost) return toast(`Нужно 🪙 ${cost}`);
  const spot = findSpot(makeOcc(S), PLOT, PLOT, [9, 9]);
  if(!spot) return toast('Нет места на хуторе');
  S.coins -= cost;
  S.plots.push({ id: 'p' + now().toString(36), crop: null, start: 0, gx: spot[0], gy: spot[1] });
  Sound.play('coin');
  save(); Engine.focus(spot[0] + 1, spot[1] + 1);
  toast('Грядка готова. Зажмите её, чтобы переставить');
}

/* ===================== ЖИВОТНЫЕ ===================== */
function animalState(a, kind){
  if(!a.start) return { s:'hungry' };
  const total = ANIMALS[kind].time * 1000;
  const left = a.start + total - now();
  return left <= 0 ? { s:'ready' } : { s:'eating', left: left / 1000, pct: 1 - left / total };
}
function feedAnimal(hk, idx){
  const B = BUILDINGS[hk], A = ANIMALS[B.animal];
  const a = S.buildings[hk]?.animals[idx];
  if(!a || animalState(a, B.animal).s !== 'hungry') return false;
  if(have(A.feed) < 1){ toast(`Нет корма: ${ITEMS[A.feed].n.toLowerCase()} — сделайте на кормовом заводе`); return false; }
  add(A.feed, -1); a.start = now();
  Sound.play(B.animal);
  Tut.on('feed');
  return true;
}
function collectAnimals(hk){
  const B = BUILDINGS[hk], A = ANIMALS[B.animal];
  let got = 0;
  S.buildings[hk].animals.forEach((a, i) => {
    if(animalState(a, B.animal).s !== 'ready') return;
    if(spaceLeft() < 1) return;
    add(A.makes, 1); gainXp(ITEMS[A.makes].xp); a.start = 0; got++; Daily.on('animal', A.makes, 1);
    const pos = Engine.animalPos(hk, i);
    if(pos){ Engine.flyFromWorld(ITEMS[A.makes].e, pos.x, pos.y - 20, 'store'); Engine.burst(pos.x, pos.y, 'spark', { n: 8, lift: 30 }); }
  });
  if(got){ Sound.play('pop'); buzz(15); save(); }
  else if(spaceLeft() < 1) toast('📦 Амбар полон');
  return got;
}
function buyAnimal(hk){
  const B = BUILDINGS[hk], A = ANIMALS[B.animal];
  const list = S.buildings[hk].animals;
  if(list.length >= B.slots) return toast('В загоне нет места');
  const cost = A.cost * (list.length + 1);
  if(S.coins < cost) return toast(`Нужно 🪙 ${cost}`);
  S.coins -= cost; list.push({ start: 0 });
  Sound.play(B.animal);
  save();
}

/* ===================== ПОСТРОЙКИ И ЗАВОДЫ ===================== */
function build(k){
  const B = BUILDINGS[k];
  if(S.buildings[k]) return;
  if(!unlocked(k)) return toast(`Откроется на уровне ${B.lvl}`);
  if(S.coins < B.cost) return toast(`Нужно 🪙 ${B.cost}`);
  const spot = findSpot(makeOcc(S), B.w, B.h, B.spot, (gx, gy) => clearView(S, { type: B.kind, key: 'building:' + k, gx, gy, w: B.w, h: B.h }));
  if(!spot) return toast('Нет места на хуторе — уберите декор');
  S.coins -= B.cost;
  Engine.burst((spot[0] + B.w / 2) * TILE, (spot[1] + B.h / 2) * TILE, 'dust', { n: 30, lift: 0 }); Engine.pulse('building:' + k); buzz(40);
  S.buildings[k] = B.kind === 'house' ? { animals: [{ start: 0 }], gx: spot[0], gy: spot[1] } : { queue: [], gx: spot[0], gy: spot[1] };
  gainXp(5 + Math.round(B.cost / 40));
  Sound.play('build');
  save(); closeSheet(); Engine.focus(spot[0] + B.w / 2, spot[1] + B.h / 2);
  toast(`${B.e} ${B.n} построен! Зажмите, чтобы переставить`);
}
function queueEnd(q){ return q.length ? q[q.length - 1].end : 0; }
function produce(bk, item){
  const R = RECIPES[item];
  const q = S.buildings[bk].queue;
  if(q.length >= qSize(bk)) return toast('Очередь заполнена — заберите готовое или добавьте ячейку');
  if(!canPay(R.in)) return toast('Не хватает: ' + Object.entries(R.in).filter(([k, n]) => have(k) < n).map(([k, n]) => `${ITEMS[k].e}×${n - have(k)}`).join(' '));
  pay(R.in);
  const start = Math.max(now(), queueEnd(q));
  q.push({ item, start, end: start + R.time * 1000 });
  Sound.play('pop');
  Tut.on('produce');
  save(); openFactory(bk);
}
function factoryDone(bk){ return (S.buildings[bk]?.queue || []).filter(j => j.end <= now()).length; }
function collectFactory(bk){
  const q = S.buildings[bk].queue;
  const B = S.buildings[bk];
  let got = 0;
  while(q.length && q[0].end <= now()){
    const it = q[0].item, n = RECIPES[it].out;
    if(spaceLeft() < n){ toast('📦 Амбар полон'); break; }
    add(it, n); gainXp(ITEMS[it].xp * n); q.shift(); got++; Daily.on('produce', it, n);
    Engine.flyFromWorld(ITEMS[it].e + (n > 1 ? '×' + n : ''), (B.gx + 1.5) * TILE, B.gy * TILE, 'store');
  }
  if(got){ Engine.burst((B.gx + 1.5) * TILE, (B.gy + 1.5) * TILE, 'spark', { n: 14, lift: 90 }); Engine.pulse('building:' + bk); Sound.play('pop'); buzz(15); save(); }
  return got;
}

/* ===================== ЗАКАЗЫ И ГРУЗОВИК ===================== */
const ORDER_SLOTS = () => Math.min(6, 3 + Math.floor(S.lvl / 4));
function orderable(){
  return Object.keys(ITEMS).filter(k => {
    const it = ITEMS[k];
    if(it.kind === 'feed') return false;
    // долгие культуры в заказах — только если игрок их уже сажал или они есть в амбаре
    if(it.kind === 'crop') return it.time <= 600 * (1 + S.lvl) || have(k) > 0 || S.plots.some(p => p.crop === k);
    if(it.kind === 'good') return !!S.buildings[RECIPES[k].b];
    if(it.kind === 'animal') return !!S.buildings[ANIMALS[Object.keys(ANIMALS).find(a => ANIMALS[a].makes === k)].house];
    return true;
  });
}
function makeOrder(){
  const pool = orderable().sort(() => Math.random() - 0.5);
  const kinds = Math.min(pool.length, 1 + Math.floor(Math.random() * Math.min(3, 1 + S.lvl / 3)));
  const items = {};
  pool.slice(0, kinds).forEach(k => {
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
function truckState(){
  if(!S.truck) return 'home';
  return now() < S.truck.back ? 'away' : 'back';
}
function completeOrder(i){
  const o = S.orders[i];
  if(!o) return;
  if(truckState() !== 'home') return toast(truckState() === 'away' ? '🚚 Грузовик ещё в пути' : '🚚 Сначала заберите монеты у грузовика');
  if(!canPay(o.items)) return toast('Не хватает товаров');
  pay(o.items);
  S.truck = { coins: o.coins, xp: o.xp, back: now() + TRUCK_TIME * 1000 };
  S.orders[i] = null; S.orderCooldown[i] = now() + 20 * 1000;
  Sound.play('truck');
  Tut.on('order'); Daily.on('order');
  S.stats = S.stats || {}; S.stats.orders = (S.stats.orders || 0) + 1;
  save(); closeSheet();
  toast(`🚚 Грузовик повёз заказ. Через ${TRUCK_TIME} секунд привезёт 🪙 ${o.coins}`);
}
function collectTruck(){
  if(truckState() !== 'back') return false;
  S.coins += S.truck.coins; gainXp(S.truck.xp);
  const f = S.fixed.board;
  Engine.flyFromWorld(`🪙${S.truck.coins}`, (f.gx + 1) * TILE, (f.gy + 2) * TILE, 'coins');
  { const tp = Engine.truckPos() || { x: (f.gx + 3.2) * TILE, y: 7 * TILE }; Engine.burst(tp.x, tp.y, 'coin', { n: 18, lift: 30 }); }
  buzz([20, 30, 20]);
  S.truck = null;
  Sound.play('coin');
  save();
  return true;
}
function skipOrder(i){ S.orders[i] = null; S.orderCooldown[i] = now() + 90 * 1000; save(); openOrders(); }

/* ===================== СОБРАТЬ ВСЁ ===================== */
function readyCount(){
  if(!S) return 0;
  let n = S.plots.filter(p => plotState(p).s === 'ready').length;
  for(const [k, b] of Object.entries(S.buildings)){
    const B = BUILDINGS[k];
    if(B.kind === 'factory') n += factoryDone(k);
    else n += (b.animals || []).filter(a => animalState(a, B.animal).s === 'ready').length;
  }
  if(truckState() === 'back') n++;
  return n;
}
function collectAll(){
  const before = { ...S.inv }, coins = S.coins;
  let full = false;
  S.plots.forEach((p, i) => { if(plotState(p).s === 'ready'){ if(spaceLeft() < 2) full = true; else harvest(i); } });
  for(const [k, b] of Object.entries(S.buildings)){
    if(BUILDINGS[k].kind === 'factory'){ if(factoryDone(k)) collectFactory(k); }
    else collectAnimals(k);
  }
  collectTruck();
  const got = Object.keys(S.inv).map(k => [k, have(k) - (before[k] || 0)]).filter(([, n]) => n > 0);
  const msg = got.map(([k, n]) => `${ITEMS[k].e}${n}`).join(' ') + (S.coins > coins ? ` 🪙${S.coins - coins}` : '');
  if(msg.trim()) toast('✨ Собрано: ' + msg);
  if(full || (readyCount() && spaceLeft() < 2)) setTimeout(() => toast('📦 Амбар полон — продайте что-нибудь или расширьте'), msg.trim() ? 1500 : 0);
  save();
  renderAllBtn();
}
function renderAllBtn(){
  const b = $('#btnAll'); if(!b) return;
  const n = Engine.visit ? 0 : readyCount();
  b.hidden = !n; if(n) b.querySelector('b').textContent = n;
}

/* ===================== СКЛАД И МАГАЗИН ===================== */
function sellOne(k){ if(have(k) < 1) return; add(k, -1); S.coins += ITEMS[k].price; Sound.play('coin'); buzz(5); save(); }
function upgradeStorage(){
  const cost = storageUpgradeCost(S.cap);
  if(S.coins < cost) return toast(`Нужно 🪙 ${cost}`);
  S.coins -= cost; S.cap += 25; Sound.play('build');
  toast(`📦 Амбар: ${S.cap} мест`); save();
}
function buyDecor(kind){
  const D = DECOR[kind];
  if(!unlocked(kind)) return toast(`Откроется на уровне ${D.lvl}`);
  if(S.coins < D.cost) return toast(`Нужно 🪙 ${D.cost}`);
  const spot = findSpot(makeOcc(S), D.w, D.h, [11, 4], (gx, gy) => clearView(S, { type: 'decor', kind, key: 'decor:new', gx, gy, w: D.w, h: D.h }));
  if(!spot) return toast('Нет места на хуторе');
  S.coins -= D.cost; S.decor.push({ kind, gx: spot[0], gy: spot[1] });
  Sound.play('build'); save(); closeSheet(); Engine.focus(spot[0] + D.w / 2, spot[1] + D.h / 2);
  toast(`${D.e} ${D.n} на хуторе. Зажмите, чтобы переставить`);
}

/* ===================== ОКНА ===================== */
let sheetOnClose = null, sheetKind = null;
function toast(text){
  const t = $('#toast'); t.textContent = text; t.classList.add('show');
  clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove('show'), 2800);
}
function showSheet(title, html, bind, onClose, kind){
  $('#sheetTitle').textContent = title;
  $('#sheetBody').innerHTML = html;
  $('#sheet').classList.add('show');
  sheetOnClose = onClose || null; sheetKind = kind || null;
  $('#sheetBody').querySelectorAll('[data-close]').forEach(b => b.onclick = closeSheet);
  if(bind) bind($('#sheetBody'));
}
function closeSheet(){ $('#sheet').classList.remove('show'); sheetKind = null; const f = sheetOnClose; sheetOnClose = null; if(f) f(); }
function sheetOpen(kind){ return $('#sheet').classList.contains('show') && (!kind || sheetKind === kind); }

function renderHud(){
  if(!S) return;
  const need = xpForLevel(S.lvl);
  $('#hudLvl').textContent = S.lvl;
  $('#hudXp').style.width = Math.min(100, S.xp / need * 100) + '%';
  $('#hudXpText').textContent = `${S.xp}/${need}`;
  $('#hudCoins').textContent = S.coins;
  $('#hudGems').textContent = S.gems || 0;
  $('#hudStore').textContent = `${stored()}/${S.cap}`;
  $('#hudNick').textContent = S.nick;
  const canOrder = (S.orders || []).some(o => o && canPay(o.items)) || truckState() === 'back';
  $('#ordersDot').hidden = !canOrder;
}

function openFactory(bk){
  const B = BUILDINGS[bk], bs = S.buildings[bk];
  const q = bs.queue;
  const recipes = Object.keys(RECIPES).filter(r => RECIPES[r].b === bk);
  const doneN = factoryDone(bk);
  const queue = q.map(j => {
    const left = (j.end - now()) / 1000;
    const running = j.start <= now() && left > 0;
    const pct = running ? 1 - left / RECIPES[j.item].time : (left <= 0 ? 1 : 0);
    return `<div class="job ${left <= 0 ? 'done' : running ? 'run' : 'wait'}"><span>${ITEMS[j.item].e}${RECIPES[j.item].out > 1 ? '×' + RECIPES[j.item].out : ''}</span>
      <small>${left <= 0 ? 'готово' : running ? fmtTime(left) : 'в очереди'}</small><span class="bar"><i style="width:${pct * 100}%"></i></span></div>`;
  }).join('') + Array.from({ length: Math.max(0, qSize(bk) - q.length) }, () => '<div class="job empty">свободно</div>').join('')
    + (qSize(bk) < MAX_QUEUE ? `<button class="job add" id="fSlot">➕<small>ячейка<br>💎 ${slotCost(bk)}</small></button>` : '');
  const run = factoryRun(bk);
  const menu = recipes.map(r => {
    const R = RECIPES[r], ok = unlocked(r), enough = canPay(R.in);
    return `<button class="recipe ${ok ? '' : 'lock'} ${enough ? 'ok' : ''}" ${ok ? `data-make="${r}"` : 'disabled'}>
      <span class="re">${ITEMS[r].e}${R.out > 1 ? '<sub>×' + R.out + '</sub>' : ''}</span>
      <span class="rn">${ITEMS[r].n}</span>
      <span class="ri">${ok ? listStr(R.in) + ' · ' + fmtTime(R.time) : '🔒 ур. ' + ITEMS[r].lvl}</span></button>`;
  }).join('');
  showSheet(`${B.e} ${B.n}`, `<div class="queue">${queue}</div>
    ${doneN ? `<button class="btn primary" id="fCollect">Забрать готовое (${doneN})</button>` : ''}
    ${run ? `<button class="btn" id="fSpeed">⚡ Доделать ${ITEMS[run.item].e} сейчас за 💎 ${gemCost((run.end - now()) / 1000)}</button>` : ''}
    <div class="recipes">${menu}</div>`, sh => {
    sh.querySelectorAll('[data-make]').forEach(b => b.onclick = () => produce(bk, b.dataset.make));
    sh.querySelector('#fCollect')?.addEventListener('click', () => { collectFactory(bk); openFactory(bk); });
    sh.querySelector('#fSpeed')?.addEventListener('click', () => { speedFactory(bk); openFactory(bk); });
    sh.querySelector('#fSlot')?.addEventListener('click', () => addSlot(bk));
  }, null, 'factory:' + bk);
}
function openPen(hk){
  const B = BUILDINGS[hk], A = ANIMALS[B.animal], bs = S.buildings[hk];
  const canMore = bs.animals.length < B.slots;
  const hungry = bs.animals.filter(a => animalState(a, B.animal).s === 'hungry').length;
  showSheet(`${B.e} ${B.n}`, `<p>${A.e} ${A.n}: ${bs.animals.length} из ${B.slots}. Голодных: ${hungry}.</p>
    <p class="hint">Корм: ${ITEMS[A.feed].e} ${ITEMS[A.feed].n} — есть ${have(A.feed)}. Делается на кормовом заводе.</p>
    <p class="hint">На ферме: нажмите на загон и проведите кормом по животным. Когда над ними появится ${ITEMS[A.makes].e} — нажмите, чтобы собрать.</p>
    ${animalsLeft(hk) ? `<button class="btn" id="bSp">⚡ Накормить мгновенно за 💎 ${gemCost(animalsLeft(hk))}</button>` : ''}
    ${canMore ? `<button class="btn primary" id="bA">Купить ${A.e} за 🪙 ${A.cost * (bs.animals.length + 1)}</button>` : '<p class="hint">Загон заполнен.</p>'}`, sh => {
    sh.querySelector('#bA')?.addEventListener('click', () => { buyAnimal(hk); openPen(hk); });
    sh.querySelector('#bSp')?.addEventListener('click', () => { speedAnimals(hk); openPen(hk); });
  });
}
function openOrders(){
  fillOrders();
  const ts = truckState();
  const truckLine = ts === 'away' ? `<div class="truck-line">🚚 В пути — вернётся через ${fmtTime((S.truck.back - now()) / 1000)} с 🪙 ${S.truck.coins} <button class="btn sm" id="tSpeed">⚡ 💎 ${gemCost((S.truck.back - now()) / 1000)}</button></div>`
    : ts === 'back' ? `<button class="btn primary" id="tGet">🚚 Забрать 🪙 ${S.truck.coins} у грузовика</button>` : '';
  const cards = S.orders.map((o, i) => {
    if(!o){
      const left = ((S.orderCooldown[i] || 0) - now()) / 1000;
      return `<div class="order wait"><span class="who">🚶 Новый заказ</span><small>через ${fmtTime(left)}</small></div>`;
    }
    const ok = canPay(o.items);
    const lines = Object.entries(o.items).map(([k, n]) => `<li class="${have(k) >= n ? 'got' : ''}">${ITEMS[k].e} ${ITEMS[k].n} <b>${have(k)}/${n}</b></li>`).join('');
    return `<div class="order ${ok ? 'can' : ''}"><span class="who">${o.who}</span><ul>${lines}</ul>
      <div class="reward">🪙 ${o.coins} · ⭐ ${o.xp}</div>
      <div class="row"><button class="btn ${ok ? 'primary' : ''}" data-done="${i}" ${ok && ts === 'home' ? '' : 'disabled'}>Отправить</button><button class="btn ghost" data-skip="${i}" title="Убрать заказ">✕</button></div></div>`;
  }).join('');
  showSheet('📋 Заказы', `${truckLine}<div class="orders">${cards}</div><p class="hint">Готовый заказ увозит грузовик. Когда вернётся — нажмите на него и заберите монеты.</p>`, sh => {
    sh.querySelectorAll('[data-done]').forEach(b => b.onclick = () => completeOrder(+b.dataset.done));
    sh.querySelectorAll('[data-skip]').forEach(b => b.onclick = () => skipOrder(+b.dataset.skip));
    sh.querySelector('#tGet')?.addEventListener('click', () => { collectTruck(); openOrders(); });
    sh.querySelector('#tSpeed')?.addEventListener('click', () => { speedTruck(); openOrders(); });
  }, null, 'orders');
}
function openStorage(){
  const keys = Object.keys(S.inv).filter(k => have(k) > 0).sort((a, b) => ITEMS[a].price - ITEMS[b].price);
  const rows = keys.map(k => `<div class="inv-row"><span class="ie">${ITEMS[k].e}</span><span class="in">${ITEMS[k].n}<small>🪙 ${ITEMS[k].price} за шт.</small></span><b class="iq">${have(k)}</b>
      <button class="btn sm" data-sell="${k}">Продать 1</button></div>`).join('') || '<p class="hint">Амбар пуст.</p>';
  showSheet(`📦 Амбар ${stored()}/${S.cap}`, `<div class="inv">${rows}</div>
    <button class="btn primary" id="upStore">Расширить до ${S.cap + 25} за 🪙 ${storageUpgradeCost(S.cap)}</button>
    <p class="hint">Друзьям можно продать дороже — через 🏪 Лавку в «Соседях».</p>`, sh => {
    sh.querySelectorAll('[data-sell]').forEach(b => b.onclick = () => { sellOne(b.dataset.sell); openStorage(); });
    sh.querySelector('#upStore').onclick = () => { upgradeStorage(); openStorage(); };
  }, null, 'storage');
}
function openShop(tab = 'build'){
  const tabs = `<div class="seg"><button data-t="build" class="${tab === 'build' ? 'active' : ''}">Постройки</button><button data-t="field" class="${tab === 'field' ? 'active' : ''}">Поле</button><button data-t="decor" class="${tab === 'decor' ? 'active' : ''}">Декор</button></div>`;
  let body = '';
  if(tab === 'build'){
    body = Object.keys(BUILDINGS).map(k => {
      const B = BUILDINGS[k], built = !!S.buildings[k];
      const sub = B.kind === 'house' ? `${ANIMALS[B.animal].e} даёт ${ITEMS[ANIMALS[B.animal].makes].e}` : Object.keys(RECIPES).filter(r => RECIPES[r].b === k).map(r => ITEMS[r].e).join(' ');
      return `<div class="shop-row ${built ? 'done' : ''}"><span class="se">${B.e}</span><div class="si"><b>${B.n}</b><small>${sub}</small></div>
        ${built ? '<span class="tag">есть</span>' : unlocked(k) ? `<button class="btn primary sm" data-build="${k}">🪙 ${B.cost}</button>` : `<span class="tag">🔒 ур. ${B.lvl}</span>`}</div>`;
    }).join('') + Object.keys(BUILDINGS).filter(k => BUILDINGS[k].kind === 'house' && S.buildings[k]).map(k => {
      const B = BUILDINGS[k], A = ANIMALS[B.animal], n = S.buildings[k].animals.length;
      return n < B.slots ? `<div class="shop-row"><span class="se">${A.e}</span><div class="si"><b>${A.n}</b><small>в ${B.n.toLowerCase()} · ${n}/${B.slots}</small></div><button class="btn primary sm" data-animal="${k}">🪙 ${A.cost * (n + 1)}</button></div>` : '';
    }).join('');
  } else if(tab === 'field'){
    body = `<div class="shop-row"><span class="se">🟫</span><div class="si"><b>Грядка</b><small>${S.plots.length} из ${MAX_PLOTS}</small></div>${S.plots.length < MAX_PLOTS ? `<button class="btn primary sm" id="bPlot">🪙 ${plotCost(S.plots.length)}</button>` : ''}</div>
      <div class="shop-row"><span class="se">📦</span><div class="si"><b>Расширить амбар</b><small>${S.cap} → ${S.cap + 25} мест</small></div><button class="btn primary sm" id="bStore">🪙 ${storageUpgradeCost(S.cap)}</button></div>`;
  } else {
    body = Object.keys(DECOR).map(k => {
      const D = DECOR[k];
      return `<div class="shop-row"><span class="se">${D.e}</span><div class="si"><b>${D.n}</b><small>${D.w}×${D.h} клетки</small></div>${unlocked(k) ? `<button class="btn primary sm" data-decor="${k}">🪙 ${D.cost}</button>` : `<span class="tag">🔒 ур. ${D.lvl}</span>`}</div>`;
    }).join('');
  }
  showSheet('🛒 Магазин', tabs + `<div class="shop">${body}</div>`, sh => {
    sh.querySelectorAll('[data-t]').forEach(b => b.onclick = () => openShop(b.dataset.t));
    sh.querySelectorAll('[data-build]').forEach(b => b.onclick = () => build(b.dataset.build));
    sh.querySelectorAll('[data-animal]').forEach(b => b.onclick = () => { buyAnimal(b.dataset.animal); openShop('build'); });
    sh.querySelectorAll('[data-decor]').forEach(b => b.onclick = () => buyDecor(b.dataset.decor));
    sh.querySelector('#bPlot')?.addEventListener('click', () => { closeSheet(); buyPlot(); });
    sh.querySelector('#bStore')?.addEventListener('click', () => { upgradeStorage(); openShop('field'); });
  }, null, 'shop');
}
function openSettings(){
  const nState = !('Notification' in window) ? 'none' : Notification.permission;
  showSheet('⚙️ Настройки', `<label class="check"><input type="checkbox" id="snd" ${S.sound ? 'checked' : ''}> Звуки</label>
    <label class="check"><input type="checkbox" id="mus" ${S.music ? 'checked' : ''}> Музыка</label>
    <label class="check"><input type="checkbox" id="vib" ${S.vibro ? 'checked' : ''}> Вибрация</label>
    <label class="check"><input type="checkbox" id="ntf" ${S.notify && nState === 'granted' ? 'checked' : ''} ${nState === 'none' || nState === 'denied' ? 'disabled' : ''}> Уведомления, когда всё готово</label>
    ${nState === 'denied' ? '<p class="hint">Уведомления запрещены в браузере — разрешите их в настройках сайта.</p>' : nState === 'none' ? '<p class="hint">Этот браузер не умеет показывать уведомления. На телефоне добавьте игру на главный экран.</p>' : '<p class="hint">Придут, пока игра открыта или свёрнута.</p>'}
    <button class="btn" id="tutAgain">Показать подсказки заново</button>
    <div class="me-box">Вы играете как <b></b>. С другого телефона входите с этим именем и PIN.<button class="btn ghost sm" id="logoutBtn">Выйти</button></div>`, sh => {
    sh.querySelector('.me-box b').textContent = S.nick;
    sh.querySelector('#snd').onchange = e => { S.sound = e.target.checked; save(); };
    sh.querySelector('#mus').onchange = e => { S.music = e.target.checked; save(); Music.sync(); };
    sh.querySelector('#vib').onchange = e => { S.vibro = e.target.checked; save(); buzz(30); };
    sh.querySelector('#ntf').onchange = async e => {
      if(e.target.checked){ const r = await Notification.requestPermission(); S.notify = r === 'granted'; e.target.checked = S.notify; if(S.notify) toast('🔔 Сообщу, когда урожай и заводы будут готовы'); }
      else S.notify = false;
      save();
    };
    sh.querySelector('#tutAgain').onclick = () => { S.tut = 0; save(); closeSheet(); Tut.show(); };
    sh.querySelector('#logoutBtn').onclick = async () => { await Net.pushState(); localStorage.removeItem(SAVE_KEY); location.reload(); };
  });
}

/* ===================== ЗВУК (синтез, без файлов) ===================== */
const Sound = {
  ac: null,
  unlock(){ if(!this.ac){ try{ this.ac = new (window.AudioContext || window.webkitAudioContext)(); }catch(e){} } if(this.ac && this.ac.state === 'suspended') this.ac.resume(); },
  tone(f, d, type = 'sine', vol = 0.12, slide = 0, delay = 0){
    if(!this.ac || !S || !S.sound) return;
    const t = this.ac.currentTime + delay, o = this.ac.createOscillator(), g = this.ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t); if(slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f + slide), t + d);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    o.connect(g); g.connect(this.ac.destination); o.start(t); o.stop(t + d + 0.02);
  },
  noise(d, vol = 0.08){
    if(!this.ac || !S || !S.sound) return;
    const b = this.ac.createBuffer(1, this.ac.sampleRate * d, this.ac.sampleRate), ch = b.getChannelData(0);
    for(let i = 0; i < ch.length; i++) ch[i] = (Math.random() * 2 - 1) * (1 - i / ch.length);
    const s = this.ac.createBufferSource(), g = this.ac.createGain(), f = this.ac.createBiquadFilter();
    f.type = 'highpass'; f.frequency.value = 2000; s.buffer = b; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(this.ac.destination); s.start();
  },
  play(name){
    switch(name){
      case 'plant': this.tone(520, 0.08, 'triangle', 0.08, 120); break;
      case 'harvest': this.noise(0.12, 0.06); this.tone(700, 0.06, 'triangle', 0.05, 200); break;
      case 'pop': this.tone(600, 0.1, 'sine', 0.12, 400); break;
      case 'coin': this.tone(988, 0.08, 'square', 0.05); this.tone(1319, 0.14, 'square', 0.05, 0, 0.07); break;
      case 'build': this.tone(220, 0.12, 'sawtooth', 0.05); this.tone(330, 0.16, 'triangle', 0.07, 0, 0.1); break;
      case 'level': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.18, 'triangle', 0.08, 0, i * 0.11)); break;
      case 'truck': this.tone(110, 0.4, 'sawtooth', 0.04, -30); break;
      case 'chicken': this.tone(900, 0.06, 'square', 0.03, 400); this.tone(1100, 0.07, 'square', 0.03, 300, 0.08); break;
      case 'cow': this.tone(140, 0.45, 'sawtooth', 0.05, -40); break;
      case 'sheep': this.tone(380, 0.35, 'sawtooth', 0.035, 20); break;
      case 'tap': this.tone(440, 0.04, 'sine', 0.05); break;
    }
  },
};

/* ===================== МУЗЫКА (тихая деревенская мелодия) ===================== */
const Music = {
  on: false, timer: null, step: 0, gain: null,
  // пентатоника до-мажор; бас и мелодия меняются по кругу
  MEL: [[0,2,4,7],[4,7,9,7],[2,4,2,0],[7,9,12,9],[4,2,0,2],[0,4,7,4],[9,7,4,2],[0,0,-1,-1]],
  BASS: [0, -5, -3, -5, 0, -7, -3, -5],
  sync(){
    const want = !!(S && S.music && Sound.ac && document.visibilityState === 'visible');
    if(want === this.on) return;
    this.on = want;
    if(want){
      const ac = Sound.ac;
      this.gain = ac.createGain(); this.gain.gain.value = 0.0001; this.gain.connect(ac.destination);
      this.gain.gain.exponentialRampToValueAtTime(0.05, ac.currentTime + 2);
      this.next = ac.currentTime + 0.1; this.tick();
    } else {
      clearTimeout(this.timer);
      if(this.gain){ const g = this.gain; try{ g.gain.setTargetAtTime(0.0001, Sound.ac.currentTime, 0.3); }catch(e){} setTimeout(() => g.disconnect(), 1500); this.gain = null; }
    }
  },
  note(semi, t, d, type, vol){
    const ac = Sound.ac, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = 261.63 * Math.pow(2, semi / 12);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g); g.connect(this.gain); o.start(t); o.stop(t + d + 0.05);
  },
  tick(){
    if(!this.on) return;
    const ac = Sound.ac, beat = 0.42;
    while(this.next < ac.currentTime + 1.2){
      const bar = Math.floor(this.step / 4) % this.MEL.length, i = this.step % 4;
      const m = this.MEL[bar][i];
      if(m >= 0) this.note(m + 12, this.next, beat * 0.9, 'triangle', 0.5);
      if(i === 0) this.note(this.BASS[bar] - 12, this.next, beat * 3.5, 'sine', 0.6);
      if(i === 2) this.note(this.BASS[bar] - 5, this.next, beat * 1.5, 'sine', 0.25);
      this.step++; this.next += beat;
    }
    this.timer = setTimeout(() => this.tick(), 400);
  },
};

/* ===================== УВЕДОМЛЕНИЯ (пока игра открыта или свёрнута) ===================== */
const Notify = {
  timer: null,
  nextEvent(){
    let best = null;
    const put = (t, text) => { if(t > now() && (!best || t < best.t)) best = { t, text }; };
    S.plots.forEach(p => { if(p.crop) put(p.start + ITEMS[p.crop].time * 1000, `${ITEMS[p.crop].e} ${ITEMS[p.crop].n} созрела — пора собирать!`); });
    for(const [k, b] of Object.entries(S.buildings)){
      const B = BUILDINGS[k];
      if(B.kind === 'factory') (b.queue || []).forEach(j => put(j.end, `${B.e} ${B.n}: ${ITEMS[j.item].e} ${ITEMS[j.item].n} готово`));
      else (b.animals || []).forEach(a => { if(a.start) put(a.start + ANIMALS[B.animal].time * 1000, `${ANIMALS[B.animal].e} ${ANIMALS[B.animal].n}: ${ITEMS[ANIMALS[B.animal].makes].e} можно забирать`); });
    }
    if(S.truck) put(S.truck.back, '🚚 Грузовик вернулся с монетами');
    return best;
  },
  plan(){
    clearTimeout(this.timer);
    if(!S || !S.notify || !('Notification' in window) || Notification.permission !== 'granted') return;
    if(document.visibilityState === 'visible') return;
    const ev = this.nextEvent(); if(!ev) return;
    this.timer = setTimeout(() => { this.show(ev.text); this.plan(); }, Math.min(ev.t - now() + 500, 2 ** 31 - 1));
  },
  async show(text){
    const opt = { body: text, icon: 'icon-192.png', badge: 'icon-192.png', tag: 'hutorok', renotify: true };
    try{
      const reg = navigator.serviceWorker && await navigator.serviceWorker.getRegistration();
      if(reg) return reg.showNotification('Хуторок', opt);
    }catch(e){}
    try{ new Notification('Хуторок', opt); }catch(e){}
  },
};
document.addEventListener('visibilitychange', () => { if(!S) return; Music.sync(); Notify.plan(); if(document.visibilityState === 'visible') clearTimeout(Notify.timer); });

/* ===================== ОБУЧЕНИЕ ===================== */
const TUT = [
  { text:'👆 Нажмите на пустую грядку, затем проведите пальцем от 🌾 по грядкам — так сеют.', ev:'plant' },
  { text:'⏳ Пшеница растёт 1 минуту. Когда созреет — нажмите на грядку и проведите серпом 🌙 по полю.', ev:'harvest' },
  { text:'🏭 Нажмите на кормовой завод и сделайте корм для кур.', ev:'produce' },
  { text:'🐔 Когда корм будет готов, заберите его и нажмите на курятник — проведите кормом по курам.', ev:'feed' },
  { text:'📋 Нажмите на доску заказов у дороги и отправьте заказ грузовиком.', ev:'order' },
];
const Tut = {
  on(ev){
    if(!S || S.tut >= TUT.length) return;
    if(TUT[S.tut].ev === ev){ S.tut++; this.show(); }
  },
  show(){
    const el = $('#tut');
    if(!S || S.tut >= TUT.length){ el.hidden = true; return; }
    el.hidden = false; el.querySelector('span').textContent = TUT[S.tut].text;
  },
};

function startGame(state){
  S = migrate(state);
  fillOrders();
  $('#auth').hidden = true;
  $('#app').hidden = false;
  Engine.start();
  renderHud(); Tut.show();
  save();
  Daily.check(); Daily.dot(); Boat.tick();
}

document.addEventListener('DOMContentLoaded', () => {
  $('#btnShop').onclick = () => openShop();
  $('#btnOrders').onclick = openOrders;
  $('#btnFriends').onclick = () => Net.openFriends();
  $('#btnSettings').onclick = openSettings;
  $('#btnDaily').onclick = openDaily;
  $('#hudGemsBtn').onclick = () => toast(`💎 Кристаллы: ${S.gems || 0}. Ускоряют грядки, заводы, животных и грузовик. Даются за уровни, задания дня, корабль и сундуки`);
  $('#hudStoreBtn').onclick = openStorage;
  $('#sheetClose').onclick = closeSheet;
  $('#sheet').onclick = e => { if(e.target.id === 'sheet') closeSheet(); };
  $('#tut button').onclick = () => { S.tut = 99; save(); Tut.show(); };
  document.addEventListener('pointerdown', () => { Sound.unlock(); Music.sync(); }, { capture: true });
  $('#btnAll').onclick = collectAll;
  if('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
  // Окна с таймерами обновляются раз в секунду.
  setInterval(() => {
    if(!S) return;
    renderHud(); renderAllBtn();
    const a = document.activeElement;
    if(a && /INPUT|TEXTAREA|SELECT/.test(a.tagName)) return;
    if(sheetKind === 'orders') openOrders();
    else if(sheetKind && sheetKind.startsWith('factory:')) openFactory(sheetKind.slice(8));
    else if(sheetKind === 'boat') openBoat();
    Social.dot();
  }, 1000);
});
