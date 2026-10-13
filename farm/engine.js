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
  last: 0,

  get st(){ return this.visit || S; },

  start(){
    if(this.started) return;
    this.started = true;
    this.cv = $('#map'); this.ctx = this.cv.getContext('2d');
    Art.init(this.ctx);
    this.resize(); window.addEventListener('resize', () => this.resize());
    const z = Math.max(0.5, Math.min(1.1, this.W / (13.5 * TILE)));
    this.cam.z = z;
    this.focus(8.5, 9, true);
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
    const tx = gx * TILE - this.W / 2 / this.cam.z, ty = gy * TILE - this.H / 2 / this.cam.z;
    if(instant){ this.cam.x = tx; this.cam.y = ty; this.clamp(); return; }
    this.camTarget = { x: tx, y: ty };
  },
  clamp(){
    const z = this.cam.z, mw = MAP_W * TILE, mh = MAP_H * TILE, pad = 160;
    const vw = this.W / z, vh = this.H / z;
    this.cam.x = vw > mw + pad * 2 ? (mw - vw) / 2 : Math.max(-pad - 4 * TILE, Math.min(mw + pad - vw, this.cam.x));
    this.cam.y = vh > mh + pad * 2 ? (mh - vh) / 2 : Math.max(-pad, Math.min(mh + pad - vh, this.cam.y));
  },
  toWorld(sx, sy){ const r = this.cv.getBoundingClientRect(); return { x: (sx - r.left) / this.cam.z + this.cam.x, y: (sy - r.top) / this.cam.z + this.cam.y }; },
  toScreen(wx, wy){ const r = this.cv.getBoundingClientRect(); return { x: (wx - this.cam.x) * this.cam.z + r.left, y: (wy - this.cam.y) * this.cam.z + r.top }; },

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
  hit(wx, wy){
    const objs = this.objects().filter(o => wx >= o.gx * TILE && wx < (o.gx + o.w) * TILE && wy >= (o.gy - (o.type === 'factory' || o.type === 'storage' ? 0.6 : 0)) * TILE && wy < (o.gy + o.h) * TILE);
    objs.sort((a, b) => (b.gy + b.h) - (a.gy + a.h));
    return objs[0] || null;
  },
  plotAt(wx, wy){
    const st = this.st;
    for(let i = 0; i < st.plots.length; i++){ const p = st.plots[i]; if(wx >= p.gx * TILE && wx < (p.gx + PLOT) * TILE && wy >= p.gy * TILE && wy < (p.gy + PLOT) * TILE) return i; }
    return -1;
  },

  /* ---------- животные ---------- */
  penBox(hk){
    const b = this.st.buildings[hk], B = BUILDINGS[hk];
    return { x1: b.gx * TILE + 24, x2: (b.gx + B.w) * TILE - 24, y1: b.gy * TILE + 86, y2: (b.gy + B.h) * TILE - 18 };
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
          if(d < 2){ m.wait = 1 + Math.random() * (busy === 'ready' ? 4 : 2.5); m.tx = box.x1 + Math.random() * (box.x2 - box.x1); m.ty = box.y1 + Math.random() * (box.y2 - box.y1); }
          else { m.x += dx / d * speed * dt; m.y += dy / d * speed * dt; m.dir = dx >= 0 ? 1 : -1; m.walk += dt; }
        }
      });
    }
  },
  animalAt(hk, wx, wy){
    const n = (this.st.buildings[hk]?.animals || []).length;
    let best = -1, bd = 30;
    for(let i = 0; i < n; i++){ const m = this.animalPos(hk, i); if(!m) continue; const d = Math.hypot(m.x - wx, m.y - 4 - wy); if(d < bd){ bd = d; best = i; } }
    return best;
  },

  /* ---------- отрисовка ---------- */
  frame(t){
    const dt = Math.min(0.05, (t - (this.last || t)) / 1000); this.last = t;
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
    Art.ground(c);
    const objs = this.objects();
    // сетка при перестановке
    if(this.moving){
      c.strokeStyle = '#ffffff40'; c.lineWidth = 1;
      for(let x = 0; x <= MAP_W; x++){ c.beginPath(); c.moveTo(x * TILE, 0); c.lineTo(x * TILE, MAP_H * TILE); c.stroke(); }
      for(let y = 0; y <= MAP_H; y++){ c.beginPath(); c.moveTo(0, y * TILE); c.lineTo(MAP_W * TILE, y * TILE); c.stroke(); }
    }
    // грядки — плоские, рисуем первыми
    objs.filter(o => o.type === 'plot').forEach(o => {
      const p = st.plots[o.idx], ps = plotState(p);
      const hl = this.tool && ((this.tool.kind === 'seed' && ps.s === 'empty') || (this.tool.kind === 'sickle' && ps.s === 'ready')) ? '#ffffffaa' : (p.helpedBy && ps.s === 'growing' ? '#7fd3ff' : null);
      Art.plot(c, o.gx * TILE, o.gy * TILE, PLOT * TILE, p.crop, ps.pct || 0, ps.s === 'ready', o.idx + 1, hl);
    });
    // остальное — по глубине
    const rest = objs.filter(o => o.type !== 'plot').sort((a, b) => (a.gy + a.h) - (b.gy + b.h));
    const overlays = [];
    for(const o of rest){
      const x = o.gx * TILE, y = o.gy * TILE, w = o.w * TILE, h = o.h * TILE;
      if(o.type === 'house'){
        const B = BUILDINGS[o.bk], b = st.buildings[o.bk];
        Art.pen(c, x, y, w, h, B);
        (b.animals || []).forEach((a, i) => {
          const m = this.animalPos(o.bk, i); if(!m) return;
          const as = animalState(a, B.animal);
          Art.animal(c, B.animal, m.x, m.y, m.dir, m.walk ? time : 0, as.s);
          if(as.s === 'ready') overlays.push(() => Art.bubble(c, m.x, m.y - 34, ITEMS[ANIMALS[B.animal].makes].e, { r: 14 }));
          else if(as.s === 'hungry') overlays.push(() => Art.bubble(c, m.x, m.y - 30, ITEMS[ANIMALS[B.animal].feed].e, { r: 9, bg: '#ffffffcc' }));
        });
      } else if(o.type === 'factory'){
        const B = BUILDINGS[o.bk], q = st.buildings[o.bk].queue || [];
        Art.house(c, x, y - 0.6 * TILE, w, h + 0.6 * TILE, B.wall, B.roof, B.e, { chimney: q.some(j => j.start <= now() && j.end > now()) });
        const done = q.filter(j => j.end <= now());
        const run = q.find(j => j.start <= now() && j.end > now());
        if(done.length) overlays.push(() => Art.bubble(c, x + w / 2, y - 0.6 * TILE - 6, ITEMS[done[0].item].e, { badge: done.length > 1 ? done.length : 0 }));
        else if(run){ const pct = (now() - run.start) / (run.end - run.start); overlays.push(() => { c.fillStyle = '#00000055'; c.beginPath(); c.roundRect(x + 14, y + h + 2, w - 28, 8, 4); c.fill(); c.fillStyle = '#7ad04f'; c.beginPath(); c.roundRect(x + 14, y + h + 2, (w - 28) * pct, 8, 4); c.fill(); }); }
      } else if(o.type === 'storage'){
        Art.house(c, x, y - 0.6 * TILE, w, h + 0.6 * TILE, '#c8442f', '#7a2a1d', '📦', { x: true });
      } else if(o.type === 'board'){
        Art.board(c, x, y);
        const ts = this.visit ? 'home' : truckState();
        const hasOrder = !this.visit && (S.orders || []).some(o2 => o2 && canPay(o2.items));
        if(hasOrder && ts === 'home') overlays.push(() => Art.bubble(c, x + w / 2, y - 10, '✅', { r: 13 }));
      } else if(o.type === 'decor'){
        Art.decor(c, o.kind, x, y, w, h);
      }
      if(this.moving && this.moving.key === o.key){
        c.fillStyle = this.moving.ok ? '#3fcf4a44' : '#e5533d55';
        c.fillRect(x, y, w, h);
      }
    }
    if(this.moving && this.moving.key.startsWith('plot:')){
      const m = this.moving; c.fillStyle = m.ok ? '#3fcf4a44' : '#e5533d55'; c.fillRect(m.gx * TILE, m.gy * TILE, PLOT * TILE, PLOT * TILE);
    }
    this.drawTruck(c, time, overlays);
    overlays.forEach(f => f());
  },
  truckPos(){
    const f = this.st.fixed.board;
    const home = { x: (f.gx + 3.6) * TILE, y: 6.85 * TILE };
    if(this.visit) return home;
    const ts = truckState();
    if(ts !== 'away') return home;
    const left = now() - (S.truck.back - TRUCK_TIME * 1000), toEnd = S.truck.back - now();
    if(left < 3000) return { x: home.x - (left / 3000) ** 2 * 900, y: home.y, flip: true, cargo: true };
    if(toEnd < 3000) return { x: home.x - (toEnd / 3000) ** 2 * 900, y: home.y };
    return null;
  },
  drawTruck(c, time, overlays){
    const p = this.truckPos(); if(!p) return;
    Art.truck(c, p.x, p.y, p.flip, p.cargo);
    if(!this.visit && truckState() === 'back') overlays.push(() => Art.bubble(c, p.x, p.y - 44, '🪙', { r: 16 }));
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
    if(tp && truckState() === 'back' && Math.hypot(w.x - tp.x, w.y - tp.y) < 70){ collectTruck(); return; }
    if(!obj) return;
    Sound.play('tap');
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
      if(feedAnimal(T.hk, i)) T.used = true;
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
