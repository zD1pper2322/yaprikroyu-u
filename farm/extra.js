// «Хуторок» — кристаллы и ускорения, задания дня, награда за вход, корабль, сундуки, улучшение заводов.
'use strict';

const START_GEMS = 10;
const gemCost = sec => Math.max(1, Math.ceil(sec / 300));     // 💎1 за каждые 5 минут ожидания
const MAX_QUEUE = 6;
const BOAT_LVL = 1;
const BOAT_STAY = 6 * 3600e3;     // корабль ждёт 6 часов
const BOAT_GAP = 60 * 60e3;       // следующий приплывает через час
const LOGIN_REWARDS = [{ coins: 20 }, { coins: 40 }, { gems: 1 }, { coins: 60 }, { gems: 2 }, { coins: 100 }, { gems: 5 }];
// Причал: вода за задним забором, слева от дороги к доске заказов.
const BOAT_SPOT = { x: -3.3 * TILE, y: 2.2 * TILE };

function qSize(bk){ return S.buildings[bk]?.slots || FACTORY_QUEUE; }
function addGems(n){ S.gems = (S.gems || 0) + n; }
function spendGems(n){
  if((S.gems || 0) < n){ toast(`Нужно 💎 ${n}. Кристаллы дают за уровни, задания дня, корабль и сундуки`); return false; }
  S.gems -= n; Sound.play('coin'); buzz(10); return true;
}
function migrateExtra(st){
  if(st.gems === undefined) st.gems = START_GEMS;
  if(st.chestNext === undefined) st.chestNext = now() + 3 * 60e3;
  return st;
}

/* ===================== УСКОРЕНИЯ ===================== */
function speedPlot(i){
  const p = S.plots[i], ps = plotState(p);
  if(ps.s !== 'growing' || !spendGems(gemCost(ps.left))) return;
  p.start = now() - ITEMS[p.crop].time * 1000;
  Engine.burst((p.gx + 1) * TILE, (p.gy + 1) * TILE, 'spark', { n: 12, lift: 20 });
  save();
}
function factoryRun(bk){ return (S.buildings[bk]?.queue || []).find(j => j.start <= now() && j.end > now()); }
function speedFactory(bk){
  const run = factoryRun(bk); if(!run) return;
  const d = run.end - now();
  if(!spendGems(gemCost(d / 1000))) return;
  S.buildings[bk].queue.forEach(j => { if(j.end > now()){ j.end -= d; j.start -= d; } });
  const b = S.buildings[bk];
  Engine.burst((b.gx + 1.5) * TILE, (b.gy + 1.5) * TILE, 'spark', { n: 14, lift: 90 });
  save();
}
function animalsLeft(hk){
  const B = BUILDINGS[hk];
  return Math.max(0, ...S.buildings[hk].animals.map(a => { const s = animalState(a, B.animal); return s.s === 'eating' ? s.left : 0; }));
}
function speedAnimals(hk){
  const left = animalsLeft(hk); if(!left) return;
  if(!spendGems(gemCost(left))) return;
  const B = BUILDINGS[hk];
  S.buildings[hk].animals.forEach(a => { if(animalState(a, B.animal).s === 'eating') a.start = now() - ANIMALS[B.animal].time * 1000; });
  save();
}
function speedTruck(){
  if(truckState() !== 'away') return;
  if(!spendGems(gemCost((S.truck.back - now()) / 1000))) return;
  S.truck.back = now(); save();
}

/* ===================== ЗАДАНИЯ ДНЯ И НАГРАДА ЗА ВХОД ===================== */
const Daily = {
  key(t){ const d = new Date(t); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); },
  gen(){
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const pool = [];
    const crops = CROPS.filter(unlocked);
    const c = pick(crops.filter(k => ITEMS[k].time <= 600 * (1 + S.lvl) || have(k) > 0));
    pool.push({ k:'harvest', item: c, n: Math.max(4, Math.round(24 / Math.sqrt(ITEMS[c].time / 60) / 2) * 2) });
    const goods = Object.keys(RECIPES).filter(r => unlocked(r) && S.buildings[RECIPES[r].b]);
    if(goods.length){ const g = pick(goods), R = RECIPES[g]; pool.push({ k:'produce', item: g, n: R.out * (R.time <= 300 ? 3 : 2) }); }
    const houses = Object.keys(S.buildings).filter(k => BUILDINGS[k].kind === 'house');
    if(houses.length){ const h = pick(houses), m = ANIMALS[BUILDINGS[h].animal].makes; pool.push({ k:'animal', item: m, n: { egg: 4, milk: 3, wool: 2 }[m] || 3 }); }
    pool.push({ k:'order', n: 3 });
    if(S.lvl >= BOAT_LVL) pool.push({ k:'boat', n: 2 });
    pool.push({ k:'plant', n: 16 });
    // берём три задания разных видов
    const out = [];
    for(const t of pool.sort(() => Math.random() - 0.5)) if(out.length < 3 && !out.some(o => o.k === t.k)) out.push({ ...t, got: 0 });
    return out;
  },
  text(t){
    const it = t.item && ITEMS[t.item];
    return { harvest: `Собрать ${it?.e} ${it?.n.toLowerCase()}`, produce: `Сделать ${it?.e} ${it?.n.toLowerCase()}`, animal: `Собрать ${it?.e} ${it?.n.toLowerCase()}`,
      order: '📋 Отправить заказы грузовиком', boat: '⛵ Загрузить ящики на корабль', plant: '🌱 Посадить грядки' }[t.k];
  },
  reward(){ return { coins: 20 + S.lvl * 8, xp: 4 + S.lvl }; },
  check(){
    const today = this.key(now());
    if(S.daily && S.daily.day === today) return;
    const prev = S.daily && S.daily.day;
    S.streak = prev === this.key(now() - 864e5) ? (S.streak || 0) + 1 : 1;
    S.daily = { day: today, tasks: this.gen(), bonus: false };
    const r = LOGIN_REWARDS[(S.streak - 1) % 7];
    if(r.coins) S.coins += r.coins; if(r.gems) addGems(r.gems);
    save();
    const cells = LOGIN_REWARDS.map((x, i) => {
      const day = Math.floor((S.streak - 1) / 7) * 7 + i + 1;
      return `<div class="lday ${day < S.streak ? 'past' : day === S.streak ? 'now' : ''}"><small>день ${i + 1}</small><b>${x.coins ? '🪙' + x.coins : '💎' + x.gems}</b></div>`;
    }).join('');
    setTimeout(() => {
      if(sheetOpen()) return;
      Sound.play('level');
      showSheet('🎁 Награда за вход', `<p>Вы заходите <b>${S.streak}-й день подряд</b>. Сегодня: <b>${r.coins ? '🪙 ' + r.coins : '💎 ' + r.gems}</b></p>
        <div class="ldays">${cells}</div><p class="hint">Пропустите день — счёт начнётся заново. Новые задания дня уже в 🎯.</p>
        <button class="btn primary" data-close>Забрать</button>`);
    }, 600);
  },
  on(k, item, n = 1){
    if(!S || !S.daily) return;
    let changed = false;
    S.daily.tasks.forEach(t => { if(t.k === k && (!t.item || t.item === item) && t.got < t.n){ t.got = Math.min(t.n, t.got + n); changed = true; if(t.got >= t.n) toast(`🎯 Задание выполнено: ${this.text(t)} — заберите награду`); } });
    if(changed){ this.dot(); if(sheetKind === 'daily') openDaily(); }
  },
  claim(i){
    const t = S.daily.tasks[i]; if(!t || t.got < t.n || t.claimed) return;
    const r = this.reward();
    t.claimed = true; S.coins += r.coins; gainXp(r.xp);
    Sound.play('coin'); buzz(20);
    if(S.daily.tasks.every(x => x.claimed) && !S.daily.bonus){ S.daily.bonus = true; addGems(3); toast('🎉 Все задания дня выполнены: 💎 3'); }
    save(); this.dot();
  },
  dot(){ const d = $('#dailyDot'); if(d && S.daily) d.hidden = !S.daily.tasks.some(t => t.got >= t.n && !t.claimed); },
};
function openDaily(){
  Daily.check();
  const r = Daily.reward();
  const rows = S.daily.tasks.map((t, i) => `<div class="task ${t.claimed ? 'claimed' : ''}"><div class="tt"><b>${Daily.text(t)}<small class="rw">награда 🪙 ${r.coins} и ${r.xp} опыта</small></b><small>${t.got}/${t.n}</small></div>
      <span class="bar"><i style="width:${t.got / t.n * 100}%"></i></span>
      ${t.claimed ? '<span class="tag">✓ получено</span>' : `<button class="btn sm ${t.got >= t.n ? 'primary' : ''}" data-claim="${i}" ${t.got >= t.n ? '' : 'disabled'}>Забрать</button>`}</div>`).join('');
  const tomorrow = new Date(now()); tomorrow.setHours(24, 0, 0, 0);
  showSheet('🎯 Задания дня', `${rows}
    <p class="bonus ${S.daily.bonus ? 'got' : ''}">${S.daily.bonus ? '✓ Бонус 💎 3 получен' : 'Выполните все три — получите 💎 3'}</p>
    <p class="hint">Новые задания через ${fmtTime((tomorrow - now()) / 1000)}. Вход каждый день подряд: ${S.streak || 1}-й день.</p>`, sh => {
    sh.querySelectorAll('[data-claim]').forEach(b => b.onclick = () => { Daily.claim(+b.dataset.claim); openDaily(); });
  }, null, 'daily');
}

/* ===================== КОРАБЛЬ ===================== */
const Boat = {
  state(st = S){
    if(!st || st.lvl < BOAT_LVL) return 'locked';
    if(!st.boat) return 'none';
    if(now() < st.boat.arrive) return 'sailing';
    return now() < st.boat.leaves ? 'docked' : 'none';
  },
  make(arrive){
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const pool = [...CROPS.filter(k => ITEMS[k].time <= 600 * (1 + S.lvl) || have(k) > 0).map(k => ({ k, n: 4 + Math.round(10 / Math.sqrt(ITEMS[k].time / 60)) }))];
    Object.keys(S.buildings).filter(k => BUILDINGS[k].kind === 'house').forEach(k => { const m = ANIMALS[BUILDINGS[k].animal].makes; pool.push({ k: m, n: 3 + Math.floor(Math.random() * 3) }); });
    Object.keys(RECIPES).filter(r => ITEMS[r].kind === 'good' && unlocked(r) && S.buildings[RECIPES[r].b]).forEach(r => pool.push({ k: r, n: 1 + Math.floor(Math.random() * (ITEMS[r].price < 50 ? 3 : 2)) }));
    const crates = [];
    while(crates.length < 3 && pool.length){ const i = Math.floor(Math.random() * pool.length); const p = pool.splice(i, 1)[0]; crates.push({ item: p.k, n: p.n, done: false }); }
    return { arrive, leaves: arrive + BOAT_STAY, crates };
  },
  crateReward(c){ return { coins: Math.round(ITEMS[c.item].price * c.n * 1.5), xp: ITEMS[c.item].xp * c.n }; },
  tick(){
    if(!S || S.lvl < BOAT_LVL) return;
    if(!S.boat){ S.boat = this.make(now() + 5000); save(); return; }
    if(now() >= S.boat.leaves){ this.depart(false); }
  },
  depart(full){
    S.boatLeft = now();
    S.boat = this.make(now() + BOAT_GAP);
    save();
    if(!full) toast('⛵ Корабль уплыл. Следующий — через час');
  },
  fill(i){
    const c = S.boat?.crates[i];
    if(!c || c.done || this.state() !== 'docked') return;
    if(have(c.item) < c.n) return toast(`Не хватает: ${ITEMS[c.item].e}×${c.n - have(c.item)}`);
    add(c.item, -c.n); c.done = true;
    const r = this.crateReward(c); S.coins += r.coins; gainXp(r.xp);
    Engine.burst(BOAT_SPOT.x, BOAT_SPOT.y, 'coin', { n: 14, lift: 40 });
    Sound.play('coin'); buzz(20);
    Daily.on('boat', null, 1);
    if(S.boat.crates.every(x => x.done)){
      const bonus = Math.round(S.boat.crates.reduce((a, x) => a + this.crateReward(x).coins, 0) * 0.5);
      S.coins += bonus; addGems(2); gainXp(10 + S.lvl);
      Sound.play('level'); buzz([30, 40, 60]);
      Engine.burst(BOAT_SPOT.x, BOAT_SPOT.y, 'confetti', { n: 50, lift: 60 });
      toast(`⛵ Корабль загружен! Бонус 🪙 ${bonus} и 💎 2`);
      closeSheet();
      this.depart(true);
      return;
    }
    save(); openBoat();
  },
  speed(){
    if(this.state() !== 'sailing') return;
    if(!spendGems(gemCost((S.boat.arrive - now()) / 1000))) return;
    S.boat.arrive = now(); S.boat.leaves = now() + BOAT_STAY; save(); openBoat();
  },
  // положение для отрисовки: стоит у причала, приплывает или уплывает
  pos(st = S){
    const s = this.state(st);
    if(s === 'docked') return { x: BOAT_SPOT.x, y: BOAT_SPOT.y, docked: true };
    if(s === 'sailing' && st.boat.arrive - now() < 4000){ const k = (st.boat.arrive - now()) / 4000; return { x: BOAT_SPOT.x, y: BOAT_SPOT.y - k * k * 9 * TILE }; }
    if(st.boatLeft && now() - st.boatLeft < 4000){ const k = (now() - st.boatLeft) / 4000; return { x: BOAT_SPOT.x, y: BOAT_SPOT.y - k * k * 9 * TILE }; }
    return null;
  },
};
function openBoat(){
  const s = Boat.state();
  if(s === 'locked') return showSheet('⛵ Причал', `<p>Корабль с большими заказами начнёт приплывать с <b>${BOAT_LVL} уровня</b>.</p><p class="hint">Он привозит три ящика: загрузите их товарами и получите монеты, опыт и 💎.</p><button class="btn primary" data-close>Понятно</button>`);
  if(s !== 'docked'){
    const left = S.boat ? (S.boat.arrive - now()) / 1000 : 0;
    return showSheet('⛵ Причал', `<p>Корабль в море. Приплывёт через <b>${fmtTime(left)}</b>.</p>
      <button class="btn primary" id="bSpeed">⚡ Позвать сейчас за 💎 ${gemCost(left)}</button><p class="hint">У вас 💎 ${S.gems || 0}</p>`, sh => {
      sh.querySelector('#bSpeed').onclick = () => Boat.speed();
    }, null, 'boat');
  }
  const cards = S.boat.crates.map((c, i) => {
    const r = Boat.crateReward(c), ok = have(c.item) >= c.n;
    return `<div class="crate ${c.done ? 'done' : ok ? 'can' : ''}"><span class="ce">${ITEMS[c.item].e}</span><b>${c.done ? '✓' : `${have(c.item)}/${c.n}`}</b><small>${ITEMS[c.item].n}</small>
      ${c.done ? '<span class="tag">загружено</span>' : `<button class="btn sm ${ok ? 'primary' : ''}" data-fill="${i}" ${ok ? '' : 'disabled'}>🪙 ${r.coins}</button>`}</div>`;
  }).join('');
  showSheet('⛵ Корабль', `<div class="crates">${cards}</div>
    <p class="bonus">Загрузите все три ящика — бонус 💎 2 и ещё половина монет сверху.</p>
    <p class="hint">Уплывёт через ${fmtTime((S.boat.leaves - now()) / 1000)}.</p>`, sh => {
    sh.querySelectorAll('[data-fill]').forEach(b => b.onclick = () => Boat.fill(+b.dataset.fill));
  }, null, 'boat');
}

/* ===================== СУНДУКИ ===================== */
const Chest = {
  tick(){
    if(!S || S.chest || now() < (S.chestNext || 0)) return;
    const occ = makeOcc(S);
    for(let k = 0; k < 40; k++){
      const gx = 4 + Math.floor(Math.random() * 20), gy = 4 + Math.floor(Math.random() * 20);
      if(Math.abs(gx - gy) > 6 || !occ.free(gx, gy, 1, 1)) continue;
      S.chest = { gx, gy }; save(); return;
    }
    S.chestNext = now() + 5 * 60e3;
  },
  open(){
    const c = S.chest; if(!c) return;
    S.chest = null; S.chestNext = now() + (20 + Math.random() * 25) * 60e3;
    const roll = Math.random();
    let text;
    if(roll < 0.2){ const n = 1 + Math.floor(Math.random() * 3); addGems(n); text = `💎 ${n}`; }
    else if(roll < 0.5){
      const k = CROPS.filter(unlocked)[Math.floor(Math.random() * CROPS.filter(unlocked).length)], n = 3 + Math.floor(Math.random() * 4);
      const got = Math.min(n, spaceLeft()); if(got > 0){ add(k, got); text = `${ITEMS[k].e} ×${got}`; } else { S.coins += 30; text = '🪙 30'; }
    } else { const n = 10 + Math.floor(Math.random() * 10) * S.lvl; S.coins += n; text = `🪙 ${n}`; }
    Engine.burst((c.gx + 0.5) * TILE, (c.gy + 0.5) * TILE, 'spark', { n: 24, lift: 30 });
    Engine.burst((c.gx + 0.5) * TILE, (c.gy + 0.5) * TILE, 'coin', { n: 10, lift: 30 });
    Engine.flyFromWorld(text, (c.gx + 0.5) * TILE, (c.gy + 0.5) * TILE, text.startsWith('🪙') ? 'coins' : 'store');
    Sound.play('level'); buzz([20, 30, 40]);
    toast('🎁 В сундуке: ' + text);
    save();
  },
};

/* ===================== УЛУЧШЕНИЕ ЗАВОДОВ ===================== */
function slotCost(bk){ return (qSize(bk) - 2) * 2; }
function addSlot(bk){
  if(qSize(bk) >= MAX_QUEUE) return;
  if(!spendGems(slotCost(bk))) return;
  S.buildings[bk].slots = qSize(bk) + 1;
  Engine.pulse('building:' + bk); Sound.play('build');
  save(); openFactory(bk);
}

setInterval(() => { if(!S || Engine.visit) return; Daily.check(); Boat.tick(); Chest.tick(); }, 5000);
