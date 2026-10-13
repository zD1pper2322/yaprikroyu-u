// «Хуторок» — движок карты: камера, жесты, инструменты, анимация.
'use strict';

const Engine = {
  cv: null, ctx: null, dpr: 1, W: 0, H: 0,
  cam: { x: 0, y: 0, z: 1 },
  started: false,
  visit: null,          // состояние фермы соседа, когда мы в гостях
  pointers: new Map(),
  gesture: null,        // { type:'pan'|'pinch'|'press'|'move', ... }
  tool: null,           // { kind:'seed'|'sickle'|'feed', crop, hk, used, origin }
  moving: null,         // { key, w, h, gx, gy, ox, oy, ok }
  animals: new Map(),   // позиции животных для анимации
  parts: [],            // частицы (зёрна, монеты, искры)
  pulses: new Map(),    // «пружинка» построек при нажатии
  last: 0, dt: 0,

  get st(){ return this.visit || S; },

  start(){
    if(this.started) return;
    this.started = true;
    this.cv = $('#map'); this.ctx = this.cv.getContext('2d');
    Art.init(this.ctx);
    this.resize(); window.addEventListener('resize', () => this.resize());
    this.cam.z = Math.max(0.5, Math.min(1.2, this.W / 600));
    this.focus(10, 10, true);
    this.bindInput();
    requestAnimationFrame(t => this.frame(t));
  },
  resize(){
    this.dpr = Math.min(2, window.devicePixelRatio || 1);
    const r = this.cv.getBoundingClientRect();
    this.W = r.width; this.H = r.height;
    this.cv.width = Math.round(this.W * this.dpr); this.cv.height = Math.round(this.H * this.dpr);
  },
  focus(gx, gy, instant){
    const p = Art.P(gx * TILE, gy * TILE);
    const tx = p.x - this.W / 2 / this.cam.z, ty = p.y - this.H / 2 / this.cam.z;
    if(instant){ this.cam.x = tx; this.cam.y = ty; this.clamp(); return; }
    this.camTarget = { x: tx, y: ty };
  },
  clamp(){
    // границы ромба карты в экранном (изометрическом) пространстве
    const z = this.cam.z, pad = 200;
    const minX = -MAP_H * TILE - pad, maxX = MAP_W * TILE + pad, minY = -pad - 120, maxY = (MAP_W + MAP_H) * TILE / 2 + pad;
    const vw = this.W / z, vh = this.H / z;
    this.cam.x = vw > maxX - minX ? (minX + maxX - vw) / 2 : Math.max(minX, Math.min(maxX - vw, this.cam.x));
    this.cam.y = vh > maxY - minY ? (minY + maxY - vh) / 2 : Math.max(minY, Math.min(maxY - vh, this.cam.y));
  },
  // экран → изометрия → земля (плоские координаты)
  toIso(sx, sy){ const r = this.cv.getBoundingClientRect(); return { x: (sx - r.left) / this.cam.z + this.cam.x, y: (sy - r.top) / this.cam.z + this.cam.y }; },
  toWorld(sx, sy){ const i = this.toIso(sx, sy); return { x: i.x / 2 + i.y, y: i.y - i.x / 2, ix: i.x, iy: i.y }; },
  toScreen(wx, wy){ const p = Art.P(wx, wy), r = this.cv.getBoundingClientRect(); return { x: (p.x - this.cam.x) * this.cam.z + r.left, y: (p.y - this.cam.y) * this.cam.z + r.top }; },

  /* ---------- объекты на карте ---------- */
  objects(){
    const st = this.st, list = [];
    st.plots.forEach((p, i) => list.push({ type:'plot', key:'plot:' + i, idx: i, gx: p.gx, gy: p.gy, w: PLOT, h: PLOT }));
    for(const [k, b] of Object.entries(st.buildings || {})) if(BUILDINGS[k] && b.gx !== undefined) list.push({ type: BUILDINGS[k].kind, key:'building:' + k, bk: k, gx: b.gx, gy: b.gy, w: BUILDINGS[k].w, h: BUILDINGS[k].h });
    for(const [k, f] of Object.entries(st.fixed || {})) list.push({ type: k, key:'fixed:' + k, gx: f.gx, gy: f.gy, w: FIXED[k].w, h: FIXED[k].h, fixed: true });
    (st.decor || []).forEach((d, i) => list.push({ type:'decor', key:'decor:' + i, idx: i, kind: d.kind, gx: d.gx, gy: d.gy, w: DECOR[d.kind].w, h: DECOR[d.kind].h }));
    if(this.moving){ const o = list.find(o => o.key === this.moving.key); if(o){ o.gx = this.moving.gx; o.gy = this.moving.gy; } }
    return list;
  },
  height(o){ return o.type === 'factory' ? 120 : o.type === 'storage' ? 140 : o.type === 'board' ? 100 : o.type === 'decor' && (o.kind === 'tree' || o.kind === 'pine') ? 110 : o.type === 'house' ? 40 : 30; },
  hit(wx, wy){
    const w = { x: wx, y: wy }, iso = Art.P(wx, wy);
    const cands = this.objects().filter(o => {
      const x0 = o.gx * TILE, y0 = o.gy * TILE, x1 = (o.gx + o.w) * TILE, y1 = (o.gy + o.h) * TILE;
      if(w.x >= x0 && w.x < x1 && w.y >= y0 && w.y < y1) return true;
      if(o.type === 'plot') return false;
      // тело постройки над основанием
      const L = Art.P(x0, y1), R = Art.P(x1, y0), T = Art.P(x0, y0), B = Art.P(x1, y1);
      return iso.x >= L.x && iso.x <= R.x && iso.y >= T.y - this.height(o) && iso.y <= B.y;
    });
    cands.sort((a, b) => (b.gx + b.w / 2 + b.gy + b.h / 2) - (a.gx + a.w / 2 + a.gy + a.h / 2));
    return cands[0] || null;
  },
  plotAt(wx, wy){
    const st = this.st;
    for(let i = 0; i < st.plots.length; i++){ const p = st.plots[i]; if(wx >= p.gx * TILE && wx < (p.gx + PLOT) * TILE && wy >= p.gy * TILE && wy < (p.gy + PLOT) * TILE) return i; }
    return -1;
  },

  /* ---------- животные ---------- */
  penBox(hk){
    const b = this.st.buildings[hk], B = BUILDINGS[hk];
    return { x1: b.gx * TILE + 26, x2: (b.gx + B.w) * TILE - 26, y1: b.gy * TILE + 26, y2: (b.gy + B.h) * TILE - 26, sx: (b.gx + B.w - 2.2) * TILE, sy: b.gy * TILE + 2.2 * TILE };
  },
  animalPos(hk, i){ return this.animals.get(hk + ':' + i) || null; },
  stepAnimals(dt){
    const st = this.st;
    for(const [hk, b] of Object.entries(st.buildings || {})){
      if(BUILDINGS[hk]?.kind !== 'house') continue;
      const box = this.penBox(hk), kind = BUILDINGS[hk].animal;
      (b.animals || []).forEach((a, i) => {
        const id = hk + ':' + i;
        let m = this.animals.get(id);
        if(!m || m.hk !== hk || m.gx !== b.gx || m.gy !== b.gy){
          m = { hk, gx: b.gx, gy: b.gy, x: box.x1 + Math.random() * (box.x2 - box.x1), y: box.y1 + Math.random() * (box.y2 - box.y1), tx: 0, ty: 0, wait: Math.random() * 2, dir: 1, walk: 0 };
          m.tx = m.x; m.ty = m.y; this.animals.set(id, m);
        }
        const speed = kind === 'chicken' ? 34 : 18;
        const busy = animalState(a, kind).s;
        if(m.wait > 0){ m.wait -= dt; m.walk = 0; }
        else {
          const dx = m.tx - m.x, dy = m.ty - m.y, d = Math.hypot(dx, dy);
          if(d < 2){
            m.wait = 1 + Math.random() * (busy === 'ready' ? 4 : 2.5);
            do { m.tx = box.x1 + Math.random() * (box.x2 - box.x1); m.ty = box.y1 + Math.random() * (box.y2 - box.y1); } while(m.tx > box.sx && m.ty < box.sy);
          }
          else { m.x += dx / d * speed * dt; m.y += dy / d * speed * dt; m.dir = dx >= 0 ? 1 : -1; m.walk += dt; }
        }
      });
    }
  },
  animalAt(hk, wx, wy){
    const n = (this.st.buildings[hk]?.animals || []).length, pt = Art.P(wx, wy);
    let best = -1, bd = 34;
    for(let i = 0; i < n; i++){ const m = this.animalPos(hk, i); if(!m) continue; const a = Art.P(m.x, m.y); const d = Math.hypot(a.x - pt.x, a.y - 14 - pt.y); if(d < bd){ bd = d; best = i; } }
    return best;
  },

  /* ---------- отрисовка ---------- */
  frame(t){
    const dt = Math.min(0.05, (t - (this.last || t)) / 1000); this.last = t; this.dt = dt;
    if(this.camTarget){
      this.cam.x += (this.camTarget.x - this.cam.x) * 0.15; this.cam.y += (this.camTarget.y - this.cam.y) * 0.15;
      if(Math.abs(this.camTarget.x - this.cam.x) < 1 && Math.abs(this.camTarget.y - this.cam.y) < 1) this.camTarget = null;
      this.clamp();
    }
    if(this.st){ this.stepAnimals(dt); this.draw(t / 1000); }
    requestAnimationFrame(tt => this.frame(tt));
  },
  draw(time){
    const c = this.ctx, z = this.cam.z, st = this.st;
    c.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    c.clearRect(0, 0, this.W, this.H);
    c.setTransform(this.dpr * z, 0, 0, this.dpr * z, -this.cam.x * z * this.dpr, -this.cam.y * z * this.dpr);
    const objs = this.objects();
    const T = TILE;
    // 1) земля и всё плоское — в плоских координатах через матрицу изометрии
    c.save(); c.transform(1, 0.5, -1, 0.5, 0, 0);
    Art.groundFlat(c);
    for(const o of objs){
      const x = o.gx * T, y = o.gy * T, w = o.w * T, h = o.h * T;
      if(o.type === 'plot'){
        const p = st.plots[o.idx], ps = plotState(p);
        const hl = this.tool && ((this.tool.kind === 'seed' && ps.s === 'empty') || (this.tool.kind === 'sickle' && ps.s === 'ready')) ? '#ffffffcc' : (p.helpedBy && ps.s === 'growing' ? '#7fd3ff' : null);
        Art.plotFlat(c, x, y, w, ps.s === 'ready', hl);
      } else if(o.type === 'house') Art.penFlat(c, x, y, w, h);
      else if(o.type === 'factory' || o.type === 'storage') Art.shadowFlat(c, x, y, w, h);
      else if(o.type === 'decor' && o.kind === 'pond') Art.pondFlat(c, x, y, w, h);
      if(this.moving && this.moving.key === o.key){ c.fillStyle = this.moving.ok ? '#3fcf4a55' : '#e5533d66'; c.fillRect(x, y, w, h); }
    }
    if(this.moving){
      c.strokeStyle = '#ffffff55'; c.lineWidth = 2;
      for(let i = 0; i <= MAP_W; i++){ c.beginPath(); c.moveTo(i * T, 0); c.lineTo(i * T, MAP_H * T); c.stroke(); }
      for(let j = 0; j <= MAP_H; j++){ c.beginPath(); c.moveTo(0, j * T); c.lineTo(MAP_W * T, j * T); c.stroke(); }
    }
    c.restore();
    // 2) задний забор хутора
    const W = MAP_W * T, H = MAP_H * T;
    Art.fenceLine(c, 0, 0, W, 0); Art.fenceLine(c, 0, 0, 0, H, [5.8 * T, 8.2 * T]);
    // 3) вертикальные объекты по глубине (дальше — раньше)
    const items = [], overlays = [];
    const add = (depth, fn) => items.push({ depth, fn });
    for(const o of objs){
      const x = o.gx * T, y = o.gy * T, w = o.w * T, h = o.h * T;
      const depth = x + w / 2 + y + h / 2;
      if(o.type === 'plot'){
        const p = st.plots[o.idx], ps = plotState(p);
        if(!p.crop) continue;
        add(x + y + w * 0.6, () => {
          const r = rnd((o.idx + 1) * 31 + 7), stage = ps.s === 'ready' ? 3 : ps.pct < 0.33 ? 0 : ps.pct < 0.66 ? 1 : 2;
          const pts = [];
          for(let j = 0; j < 3; j++) for(let i = 0; i < 4; i++) pts.push([x + 16 + i * (w - 32) / 3 + (r() - 0.5) * 6, y + 16 + j * (h - 32) / 2 + (r() - 0.5) * 6]);
          pts.sort((a2, b2) => (a2[0] + a2[1]) - (b2[0] + b2[1]));
          for(const [gx2, gy2] of pts){
            const q = Art.P(gx2, gy2);
            c.save(); c.translate(q.x, q.y); c.scale(1.35, 1.35);
            if(stage > 0){ const sway = Math.sin(time * 2 + gx2 * 0.05) * 0.06; c.rotate(sway); }
            Art.crop(c, p.crop, stage, 0, 0, r);
            c.restore();
          }
          if(ps.s === 'ready'){ const q = Art.P(x + w * 0.85, y + h * 0.15); c.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(time * 3 + o.idx)})`; Art.star(c, q.x, q.y - 30, 7); }
        });
      } else if(o.type === 'house'){
        const B = BUILDINGS[o.bk], b = st.buildings[o.bk];
        // забор загона: задние стороны, домик, корыто, животные, передние стороны
        add(x + y, () => { Art.fenceLine(c, x, y, x + w, y); Art.fenceLine(c, x, y, x, y + h); });
        add(x + w - 2.2 * T + y + 2.2 * T, () => this.squash(o.key, Art.P(x + w - 1.4 * T, y + 2 * T), time, () => Art.shelter(c, x + w - 2.4 * T, y + 0.3 * T, 2 * T, 1.7 * T, B)));
        add(x + 0.4 * T + y + h - 0.8 * T, () => Art.trough(c, x + 0.4 * T, y + h - 0.9 * T));
        (b.animals || []).forEach((a2, i) => {
          const m = this.animalPos(o.bk, i); if(!m) return;
          const as = animalState(a2, B.animal);
          add(m.x + m.y, () => {
            const q = Art.P(m.x, m.y);
            const hop = m.hop && time - m.hop < 0.4 ? Math.sin((time - m.hop) / 0.4 * Math.PI) * 10 : 0;
            Art.animal(c, B.animal, q.x, q.y - hop, m.dir, m.walk ? time : 0, as.s);
            if(as.s === 'ready') overlays.push(() => Art.bubble(c, q.x, q.y - 54, ITEMS[ANIMALS[B.animal].makes].e, { r: 15 }));
            else if(as.s === 'hungry') overlays.push(() => Art.bubble(c, q.x, q.y - 48, ITEMS[ANIMALS[B.animal].feed].e, { r: 10, bg: '#ffffffcc' }));
          });
        });
        add(x + w + y + h, () => { Art.fenceLine(c, x, y + h, x + w, y + h); Art.fenceLine(c, x + w, y, x + w, y + h); });
      } else if(o.type === 'factory'){
        const B = BUILDINGS[o.bk], q = st.buildings[o.bk].queue || [];
        const run = q.find(j => j.start <= now() && j.end > now()), done = q.filter(j => j.end <= now());
        add(depth, () => this.squash(o.key, Art.P(x + w / 2, y + h), time, () => Art.factory(c, x, y, w, h, B, !!run, time)));
        const top = Art.P(x + w / 2, y + h / 2);
        if(done.length) overlays.push(() => Art.bubble(c, top.x, top.y - 150, ITEMS[done[0].item].e, { badge: done.length > 1 ? done.length : 0 }));
        else if(run){ const pct = (now() - run.start) / (run.end - run.start); const bp = Art.P(x + w, y + h); overlays.push(() => { c.fillStyle = '#00000066'; c.beginPath(); c.roundRect(bp.x - 70, bp.y - 4, 70, 10, 5); c.fill(); c.fillStyle = '#7ad04f'; c.beginPath(); c.roundRect(bp.x - 70, bp.y - 4, 70 * pct, 10, 5); c.fill(); }); }
      } else if(o.type === 'storage'){
        add(depth, () => this.squash(o.key, Art.P(x + w / 2, y + h), time, () => Art.barn(c, x, y, w, h)));
      } else if(o.type === 'board'){
        add(depth, () => this.squash(o.key, Art.P(x + w / 2, y + h), time, () => Art.board(c, x, y)));
        const hasOrder = !this.visit && (S.orders || []).some(o2 => o2 && canPay(o2.items)) && truckState() === 'home';
        if(hasOrder){ const q = Art.P(x + w / 2, y + h / 2); overlays.push(() => Art.bubble(c, q.x, q.y - 120, '✅', { r: 14 })); }
      } else if(o.type === 'decor'){
        add(depth, () => this.squash(o.key, Art.P(x + w / 2, y + h), time, () => Art.decorUp(c, o.kind, x, y, w, h, time)));
      }
    }
    // грузовик
    const tp = this.truckPos();
    if(tp){
      add(tp.x + tp.y, () => { const q = Art.P(tp.x, tp.y); Art.truck(c, q.x, q.y - 8, tp.flip, tp.cargo); });
      if(!this.visit && truckState() === 'back'){ const q = Art.P(tp.x, tp.y); overlays.push(() => Art.bubble(c, q.x, q.y - 70, '🪙', { r: 17 })); }
    }
    items.sort((a2, b2) => a2.depth - b2.depth).forEach(it => it.fn());
    // 4) передний забор
    Art.fenceLine(c, 0, H, W, H); Art.fenceLine(c, W, 0, W, H);
    const bob = Math.sin(time * 3) * 3;
    c.save(); c.translate(0, bob); overlays.forEach(f => f()); c.restore();
    this.drawParts(c, this.dt);
  },
  /* ---------- «сочность»: пружинка и частицы ---------- */
  pulse(key){ this.pulses.set(key, performance.now() / 1000); },
  squash(key, base, time, fn){
    const t0 = this.pulses.get(key), k = t0 === undefined ? 1 : (time - t0) / 0.35;
    if(k >= 1 || k < 0){ if(t0 !== undefined && k >= 1) this.pulses.delete(key); return fn(); }
    const a = Math.sin(k * Math.PI) * (1 - k) * 0.22, c = this.ctx;
    c.save(); c.translate(base.x, base.y); c.scale(1 + a, 1 - a); c.translate(-base.x, -base.y); fn(); c.restore();
  },
  burst(wx, wy, kind, opt = {}){
    if(this.visit && !opt.always) return;
    const q = Art.P(wx, wy), n = opt.n || 14;
    const colors = opt.colors || ({ dust:['#b07a45','#8a5a30','#d4a373'], coin:['#ffd23f','#f4b400','#fff3b0'], spark:['#fff7c2','#ffe066','#ffffff'], confetti:['#e5533d','#ffd23f','#4caf50','#4a90e2','#d6457a'] })[kind] || ['#fff'];
    for(let i = 0; i < n; i++){
      const a = kind === 'dust' ? Math.PI + Math.random() * Math.PI : -Math.PI / 2 + (Math.random() - 0.5) * (kind === 'confetti' ? 2.6 : 2);
      const sp = (kind === 'dust' ? 40 : kind === 'confetti' ? 260 : 150) * (0.5 + Math.random());
      this.parts.push({ x: q.x + (Math.random() - 0.5) * 20, y: q.y - (opt.lift || 10), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - (kind === 'dust' ? 30 : 0),
        g: kind === 'dust' ? 60 : kind === 'spark' ? 120 : 520, life: 0, max: (kind === 'confetti' ? 1.6 : 0.8) + Math.random() * 0.4,
        color: colors[i % colors.length], size: kind === 'coin' ? 6 : kind === 'confetti' ? 7 + Math.random() * 4 : kind === 'dust' ? 4 + Math.random() * 3 : 3 + Math.random() * 3,
        shape: kind === 'coin' ? 'coin' : kind === 'spark' ? 'star' : 'sq', rot: Math.random() * 6, vr: (Math.random() - 0.5) * 12 });
    }
    if(this.parts.length > 400) this.parts.splice(0, this.parts.length - 400);
  },
  drawParts(c, dt){
    if(!this.parts.length) return;
    this.parts = this.parts.filter(p => (p.life += dt) < p.max);
    for(const p of this.parts){
      p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      c.globalAlpha = Math.max(0, 1 - (p.life / p.max) ** 2);
      c.fillStyle = p.color;
      if(p.shape === 'star') Art.star(c, p.x, p.y, p.size + 1);
      else if(p.shape === 'coin'){ c.beginPath(); c.ellipse(p.x, p.y, p.size * Math.abs(Math.cos(p.rot)) + 1, p.size, 0, 0, 7); c.fill(); c.strokeStyle = '#b8860b'; c.lineWidth = 1.5; c.stroke(); }
      else { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.6); c.restore(); }
    }
    c.globalAlpha = 1;
  },
  truckPos(){
    const f = this.st.fixed.board;
    const home = { x: (f.gx + 3.2) * TILE, y: 7 * TILE };
    if(this.visit) return home;
    const ts = truckState();
    if(ts !== 'away') return home;
    const left = now() - (S.truck.back - TRUCK_TIME * 1000), toEnd = S.truck.back - now();
    if(left < 3000) return { x: home.x - (left / 3000) ** 2 * 1400, y: home.y, flip: true, cargo: true };
    if(toEnd < 3000) return { x: home.x - (toEnd / 3000) ** 2 * 1400, y: home.y };
    return null;
  },

  /* ---------- ввод ---------- */
  bindInput(){
    const cv = this.cv;
    cv.addEventListener('pointerdown', e => this.down(e));
    window.addEventListener('pointermove', e => this.move(e));
    window.addEventListener('pointerup', e => this.up(e));
    window.addEventListener('pointercancel', e => this.up(e, true));
    cv.addEventListener('wheel', e => { e.preventDefault(); this.zoomAt(e.clientX, e.clientY, Math.exp(-e.deltaY * 0.0015)); }, { passive: false });
    cv.addEventListener('contextmenu', e => e.preventDefault());
  },
  zoomAt(sx, sy, k){
    const before = this.toWorld(sx, sy);
    this.cam.z = Math.max(0.4, Math.min(1.8, this.cam.z * k));
    const after = this.toWorld(sx, sy);
    this.cam.x += before.x - after.x; this.cam.y += before.y - after.y;
    this.camTarget = null; this.clamp();
  },
  down(e){
    if(this.tool) return;
    Radial.close();
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    try{ this.cv.setPointerCapture(e.pointerId); }catch(_){}
    if(this.pointers.size === 2){
      clearTimeout(this.pressTimer);
      const [a, b] = [...this.pointers.values()];
      this.gesture = { type:'pinch', d: Math.hypot(a.x - b.x, a.y - b.y) };
      return;
    }
    const w = this.toWorld(e.clientX, e.clientY);
    const obj = this.hit(w.x, w.y);
    this.gesture = { type:'press', sx: e.clientX, sy: e.clientY, cx: this.cam.x, cy: this.cam.y, obj, w, moved: false };
    clearTimeout(this.pressTimer);
    if(obj && !obj.fixed && !this.visit){
      this.pressTimer = setTimeout(() => this.startMove(obj, w), 480);
    }
  },
  move(e){
    if(!this.pointers.has(e.pointerId)) return;
    this.pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = this.gesture; if(!g) return;
    if(g.type === 'pinch' && this.pointers.size >= 2){
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      this.zoomAt((a.x + b.x) / 2, (a.y + b.y) / 2, d / g.d); g.d = d;
      return;
    }
    if(g.type === 'move'){
      const w = this.toWorld(e.clientX, e.clientY);
      const m = this.moving;
      m.gx = Math.round((w.x - m.ox) / TILE); m.gy = Math.round((w.y - m.oy) / TILE);
      m.gx = Math.max(0, Math.min(MAP_W - m.w, m.gx)); m.gy = Math.max(0, Math.min(MAP_H - m.h, m.gy));
      m.ok = makeOcc(S, m.key).free(m.gx, m.gy, m.w, m.h);
      return;
    }
    if(g.type === 'press' || g.type === 'pan'){
      const dx = e.clientX - g.sx, dy = e.clientY - g.sy;
      if(g.type === 'press' && Math.hypot(dx, dy) > 8){ g.type = 'pan'; clearTimeout(this.pressTimer); }
      if(g.type === 'pan'){ this.cam.x = g.cx - dx / this.cam.z; this.cam.y = g.cy - dy / this.cam.z; this.camTarget = null; this.clamp(); }
    }
  },
  up(e, cancel){
    if(!this.pointers.has(e.pointerId)) return;
    this.pointers.delete(e.pointerId);
    clearTimeout(this.pressTimer);
    const g = this.gesture;
    if(this.pointers.size > 0){ if(g && g.type === 'pinch'){ const [p] = [...this.pointers.values()]; this.gesture = { type:'pan', sx: p.x, sy: p.y, cx: this.cam.x, cy: this.cam.y }; } return; }
    this.gesture = null;
    if(!g || cancel) { this.moving = null; return; }
    if(g.type === 'move') return this.endMove();
    if(g.type === 'press') this.tap(g.obj, g.w, e);
  },
  startMove(obj, w){
    const g = this.gesture; if(!g || g.type !== 'press') return;
    g.type = 'move';
    this.moving = { key: obj.key, w: obj.w, h: obj.h, gx: obj.gx, gy: obj.gy, ox: w.x - obj.gx * TILE, oy: w.y - obj.gy * TILE, ok: true, from: [obj.gx, obj.gy] };
    if(navigator.vibrate) navigator.vibrate(20);
    Sound.play('tap');
    $('#hint').textContent = 'Перетащите и отпустите';
    $('#hint').hidden = false;
  },
  endMove(){
    const m = this.moving; this.moving = null; $('#hint').hidden = true;
    if(!m) return;
    if(m.gx === m.from[0] && m.gy === m.from[1]) return;
    if(!m.ok){ toast('Здесь занято — поставьте на свободное место'); return; }
    const [type, id] = m.key.split(':');
    if(type === 'plot'){ S.plots[+id].gx = m.gx; S.plots[+id].gy = m.gy; }
    else if(type === 'building'){ S.buildings[id].gx = m.gx; S.buildings[id].gy = m.gy; [...this.animals.keys()].filter(k => k.startsWith(id + ':')).forEach(k => this.animals.delete(k)); }
    else if(type === 'decor'){ S.decor[+id].gx = m.gx; S.decor[+id].gy = m.gy; }
    Sound.play('build');
    save();
  },

  /* ---------- нажатия ---------- */
  tap(obj, w, e){
    if(this.visit) return Net.tapVisit(obj, w);
    // грузовик
    const tp = this.truckPos();
    if(tp && truckState() === 'back'){ const a = Art.P(tp.x, tp.y), b2 = Art.P(w.x, w.y); if(Math.hypot(a.x - b2.x, a.y - 30 - b2.y) < 70){ collectTruck(); return; } }
    if(!obj) return;
    Sound.play('tap');
    if(obj.type !== 'plot') this.pulse(obj.key);
    switch(obj.type){
      case 'plot': {
        const p = S.plots[obj.idx], ps = plotState(p);
        if(ps.s === 'empty') Radial.seeds(e.clientX, e.clientY, obj.idx);
        else if(ps.s === 'ready') Radial.sickle(e.clientX, e.clientY, obj.idx);
        else this.tip(e.clientX, e.clientY, `${ITEMS[p.crop].e} ${ITEMS[p.crop].n} · ещё ${fmtTime(ps.left)}${p.helpedBy ? ` · 💧 полил ${p.helpedBy}` : ''}`);
        break;
      }
      case 'house': {
        if(collectAnimals(obj.bk)) return;
        const B = BUILDINGS[obj.bk];
        const hungry = S.buildings[obj.bk].animals.filter(a => animalState(a, B.animal).s === 'hungry').length;
        if(hungry) Radial.feed(e.clientX, e.clientY, obj.bk);
        else openPen(obj.bk);
        break;
      }
      case 'factory':
        if(factoryDone(obj.bk) && collectFactory(obj.bk)) return;
        openFactory(obj.bk);
        break;
      case 'storage': openStorage(); break;
      case 'board': if(!collectTruck()) openOrders(); break;
      case 'decor': this.tip(e.clientX, e.clientY, `${DECOR[obj.kind].e} ${DECOR[obj.kind].n} · зажмите, чтобы переставить`); break;
    }
  },
  tip(sx, sy, text){
    const t = $('#tip'); t.textContent = text; t.hidden = false;
    t.style.left = Math.max(10, Math.min(window.innerWidth - 10 - t.offsetWidth, sx - t.offsetWidth / 2)) + 'px';
    t.style.top = Math.max(70, sy - 60) + 'px';
    clearTimeout(t._h); t._h = setTimeout(() => t.hidden = true, 2200);
  },

  /* ---------- инструменты (протягивание) ---------- */
  startTool(tool, e){
    this.tool = { ...tool, used: false, sx: e.clientX, sy: e.clientY };
    const cur = $('#cursor'); cur.textContent = tool.icon; cur.hidden = false;
    this.moveTool(e);
  },
  moveTool(e){
    const T = this.tool; if(!T) return;
    const cur = $('#cursor'); cur.style.left = e.clientX + 'px'; cur.style.top = e.clientY + 'px';
    const w = this.toWorld(e.clientX, e.clientY);
    if(T.kind === 'seed' || T.kind === 'sickle'){
      const i = this.plotAt(w.x, w.y); if(i < 0 || T.done?.has(i)) return;
      const ok = T.kind === 'seed' ? plant(i, T.crop) : harvest(i);
      if(ok){ T.used = true; (T.done = T.done || new Set()).add(i); }
    } else if(T.kind === 'feed'){
      const i = this.animalAt(T.hk, w.x, w.y); if(i < 0) return;
      if(feedAnimal(T.hk, i)){ T.used = true; const m = this.animalPos(T.hk, i); if(m) m.hop = performance.now() / 1000; }
    }
  },
  endTool(e){
    const T = this.tool; this.tool = null; $('#cursor').hidden = true;
    if(!T) return;
    if(!T.used && Math.hypot(e.clientX - T.sx, e.clientY - T.sy) < 10){
      // просто нажали на инструмент — применить к тому, что открыло меню
      if(T.kind === 'seed') plant(T.origin, T.crop);
      else if(T.kind === 'sickle'){ S.plots.forEach((p, i) => { if(plotState(p).s === 'ready') harvest(i); }); }
      else if(T.kind === 'feed'){ S.buildings[T.hk].animals.forEach((a, i) => feedAnimal(T.hk, i)); }
    }
    save();
  },

  /* ---------- полёт значков к панели ---------- */
  flyFromWorld(text, wx, wy, target){
    if(this.visit) return;
    const s = this.toScreen(wx, wy);
    const el = document.createElement('div'); el.className = 'fly'; el.textContent = text;
    el.style.left = s.x + 'px'; el.style.top = s.y + 'px';
    document.body.appendChild(el);
    const tgt = (target === 'coins' ? $('#hudCoins') : $('#hudStoreBtn')).getBoundingClientRect();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.style.transform = `translate(${tgt.left + tgt.width / 2 - s.x}px, ${tgt.top + tgt.height / 2 - s.y}px) scale(.6)`;
      el.style.opacity = '0.2';
    }));
    setTimeout(() => el.remove(), 900);
  },
};

/* ---------- круговое меню инструментов ---------- */
const Radial = {
  open(sx, sy, items, title){
    const r = $('#radial');
    r.innerHTML = (title ? `<div class="rad-title"></div>` : '') + items.map((it, i) => `<button class="rad-item ${it.disabled ? 'off' : ''}" data-i="${i}"><span>${it.icon}</span>${it.badge !== undefined ? `<b>${it.badge}</b>` : ''}</button>`).join('');
    if(title) r.querySelector('.rad-title').textContent = title;
    r.hidden = false;
    const n = items.length, R = n <= 1 ? 0 : Math.min(110, 46 + n * 9);
    const btns = [...r.querySelectorAll('.rad-item')];
    btns.forEach((b, i) => {
      const a = n <= 1 ? -Math.PI / 2 : -Math.PI + (i + 0.5) * Math.PI / n;
      b.style.left = (Math.cos(a) * R) + 'px'; b.style.top = (Math.sin(a) * R - (n <= 1 ? 56 : 30)) + 'px';
      const it = items[i];
      b.addEventListener('pointerdown', ev => {
        ev.preventDefault(); ev.stopPropagation();
        if(it.disabled){ toast(it.disabledText || 'Пока недоступно'); return; }
        try{ b.setPointerCapture(ev.pointerId); }catch(_){}
        r.classList.add('dragging');
        Engine.startTool(it.tool, ev);
        const mv = e2 => Engine.moveTool(e2);
        const up = e2 => { b.removeEventListener('pointermove', mv); b.removeEventListener('pointerup', up); b.removeEventListener('pointercancel', up); Engine.endTool(e2); Radial.close(); };
        b.addEventListener('pointermove', mv); b.addEventListener('pointerup', up); b.addEventListener('pointercancel', up);
      });
    });
    const x = Math.max(130, Math.min(window.innerWidth - 130, sx)), y = Math.max(200, Math.min(window.innerHeight - 90, sy));
    r.style.left = x + 'px'; r.style.top = y + 'px';
  },
  close(){ const r = $('#radial'); r.hidden = true; r.classList.remove('dragging'); r.innerHTML = ''; },
  seeds(sx, sy, idx){
    const items = CROPS.filter(unlocked).map(k => ({ icon: ITEMS[k].e, badge: have(k) || `🪙${ITEMS[k].price * 2}`, tool: { kind:'seed', crop: k, icon: ITEMS[k].e, origin: idx } }));
    this.open(sx, sy, items, 'Проведите по грядкам');
  },
  sickle(sx, sy, idx){ this.open(sx, sy, [{ icon:'🌙', tool: { kind:'sickle', icon:'🌙', origin: idx } }], 'Проведите серпом'); },
  feed(sx, sy, hk){
    const A = ANIMALS[BUILDINGS[hk].animal];
    this.open(sx, sy, [{ icon: ITEMS[A.feed].e, badge: have(A.feed), disabled: !have(A.feed), disabledText: `Нет корма — сделайте ${ITEMS[A.feed].n.toLowerCase()} на кормовом заводе`, tool: { kind:'feed', hk, icon: ITEMS[A.feed].e } }], 'Проведите по животным');
  },
};
