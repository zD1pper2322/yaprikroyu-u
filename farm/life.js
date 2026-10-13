// «Хуторок» — живая ферма: фермер с собакой ходит по хутору, к доске заказов приходят
// покупатели, трава колышется на ветру, летают листья, а день и ночь меняются по настоящим
// часам: вечером закат, ночью темнеет, в окнах загорается свет, горят фонари и светлячки.
'use strict';

const Life = {
  farmer: null, dog: null, visitors: [], nextVisitor: 0, leaves: [],
  lights: [],          // точки света этого кадра (окна, фонари) в пикселях экрана

  /* ---------- время суток ---------- */
  sky(){
    if(S && S.daynight === false) return { n: 0, s: 0 };
    const d = new Date(now()), h = d.getHours() + d.getMinutes() / 60;
    let n = 0, s = 0;
    if(h < 5 || h >= 22) n = 1;
    else if(h < 7){ n = 1 - (h - 5) / 2; s = Math.max(0, 1 - Math.abs(h - 6.2) / 1.2) * 0.7; }
    else if(h >= 20){ n = (h - 20) / 2; s = Math.max(0, 1 - (h - 20) / 1.5); }
    else if(h >= 17){ s = (h - 17) / 3; }
    return { n: Math.min(1, n), s: Math.min(1, s) };
  },

  /* ---------- проходимость ---------- */
  occ: null, occAt: 0,
  freeAt(st, x, y){
    if(!this.occ || now() - this.occAt > 3000){ this.occ = makeOcc(st); this.occAt = now(); }
    const gx = Math.floor(x), gy = Math.floor(y);
    return gx >= 1 && gy >= 1 && gx < MAP_W - 1 && gy < MAP_H - 1 && this.occ.free(gx, gy, 1, 1);
  },
  lineFree(st, a, b){
    const d = Math.hypot(b.x - a.x, b.y - a.y), n = Math.ceil(d / 0.3);
    for(let i = 1; i <= n; i++){ const t = i / n; if(!this.freeAt(st, a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t)) return false; }
    return true;
  },
  pickTarget(st, from, near){
    for(let k = 0; k < 30; k++){
      const c = near || from, t = { x: c.x + (Math.random() - 0.5) * 10, y: c.y + (Math.random() - 0.5) * 10 };
      if(this.freeAt(st, t.x, t.y) && this.lineFree(st, from, t)) return t;
    }
    return null;
  },
  spawnSpot(st){
    for(let k = 0; k < 200; k++){ const x = 5 + Math.random() * 14, y = 5 + Math.random() * 14; if(this.freeAt(st, x, y)) return { x, y }; }
    return { x: 4.5, y: 9 };
  },

  /* ---------- движение ---------- */
  step(st, dt){
    if(!this.farmer || this.farmer.st !== st){
      const p = this.spawnSpot(st);
      this.farmer = { st, x: p.x, y: p.y, tx: p.x, ty: p.y, wait: 1, dir: 1, walk: 0, speed: 1.1 };
      this.dog = { x: p.x + 0.6, y: p.y + 0.4, dir: 1, walk: 0, wag: 0, zoom: 0 };
      this.visitors = [];
    }
    const f = this.farmer;
    const move = (m, tx, ty, sp) => {
      const dx = tx - m.x, dy = ty - m.y, d = Math.hypot(dx, dy);
      if(d < 0.05) { m.walk = 0; return true; }
      const k = Math.min(1, sp * dt / d); m.x += dx * k; m.y += dy * k;
      m.dir = (dx - dy) >= 0 ? 1 : -1; m.walk += dt; return false;
    };
    if(f.wait > 0){ f.wait -= dt; f.walk = 0; }
    else if(move(f, f.tx, f.ty, f.speed)){
      f.wait = 1.5 + Math.random() * 4;
      // фермер ходит к грядкам, загонам и заводам
      const spots = [...st.plots.map(p => ({ x: p.gx + 1, y: p.gy + 2.4 })), ...Object.values(st.buildings || {}).map(b => ({ x: b.gx + 1.5, y: b.gy + 3.6 }))];
      const near = spots.length ? spots[Math.floor(Math.random() * spots.length)] : null;
      const t = this.pickTarget(st, f, near); if(t){ f.tx = t.x; f.ty = t.y; }
    }
    // собака бегает рядом с хозяином, иногда носится кругами
    const g = this.dog;
    g.zoom -= dt;
    if(g.zoom <= 0 && Math.random() < dt * 0.05) g.zoom = 3;
    const ang = performance.now() / 600;
    const gx = g.zoom > 0 ? f.x + Math.cos(ang) * 1.6 : f.x + 0.7, gy = g.zoom > 0 ? f.y + Math.sin(ang) * 1.6 : f.y + 0.5;
    const ok = this.freeAt(st, gx, gy);
    move(g, ok ? gx : f.x + 0.3, ok ? gy : f.y + 0.3, g.zoom > 0 ? 3.2 : 2.2);
    g.wag += dt * (f.walk ? 14 : 8);
    // покупатели: приходят по дороге к доске заказов и уходят
    if(!Engine.visit && now() > this.nextVisitor && this.visitors.length < 2){
      this.nextVisitor = now() + 25000 + Math.random() * 35000;
      const li = 1 + Math.floor(Math.random() * 4);
      const look = [null, ['#e53935', '#3949ab', '#6d4c41'], ['#43a047', '#5d4037', '#212121'], ['#8e24aa', '#00897b', '#f9a825'], ['#fb8c00', '#455a64', '#4e342e']][li];
      this.visitors.push({ li, x: -5, y: 6.9 + Math.random() * 0.3, tx: (st.fixed?.board?.gx ?? 1) + 2.6, ty: 6.9, phase: 'in', wait: 0, dir: 1, walk: 0, look });
    }
    this.visitors = this.visitors.filter(v => {
      if(v.phase === 'in' && move(v, v.tx, v.ty, 1.4)){ v.phase = 'read'; v.wait = 3 + Math.random() * 2; }
      else if(v.phase === 'read'){ v.wait -= dt; v.walk = 0; if(v.wait <= 0){ v.phase = 'out'; v.tx = -6; } }
      else if(v.phase === 'out' && move(v, v.tx, v.ty, 1.4)) return false;
      return true;
    });
  },

  /* ---------- человечки и собака ---------- */
  person(c, p, m, time, look, hat){
    const sw = m.walk ? Math.sin(time * 9) : 0, bob = m.walk ? Math.abs(Math.sin(time * 9)) * 1.2 : 0;
    c.save(); c.translate(p.x, p.y); c.scale(m.dir * 1.25, 1.25);
    c.fillStyle = '#00000030'; c.beginPath(); c.ellipse(0, 0, 8, 3, 0, 0, 7); c.fill();
    c.lineCap = 'round';
    c.strokeStyle = look[1]; c.lineWidth = 3.4;
    c.beginPath(); c.moveTo(-2, -12); c.lineTo(-2 - sw * 3, -1); c.moveTo(2, -12); c.lineTo(2 + sw * 3, -1); c.stroke();
    c.fillStyle = '#3e2723'; c.beginPath(); c.ellipse(-2 - sw * 3, -1, 2.4, 1.4, 0, 0, 7); c.ellipse(2 + sw * 3, -1, 2.4, 1.4, 0, 0, 7); c.fill();
    c.fillStyle = look[0]; c.beginPath(); c.roundRect(-5, -24 - bob, 10, 13, 4); c.fill();
    c.fillStyle = look[1]; c.beginPath(); c.roundRect(-4.5, -17 - bob, 9, 7, 2); c.fill();             // комбинезон
    c.fillRect(-3.5, -23 - bob, 1.6, 7); c.fillRect(1.9, -23 - bob, 1.6, 7);
    c.strokeStyle = look[0]; c.lineWidth = 2.6;
    c.beginPath(); c.moveTo(-5, -22 - bob); c.lineTo(-7 + sw * 3, -14 - bob); c.moveTo(5, -22 - bob); c.lineTo(7 - sw * 3, -14 - bob); c.stroke();
    c.fillStyle = '#f2c29b'; c.beginPath(); c.arc(-7 + sw * 3, -14 - bob, 1.6, 0, 7); c.arc(7 - sw * 3, -14 - bob, 1.6, 0, 7); c.fill();
    c.beginPath(); c.arc(0, -29 - bob, 5, 0, 7); c.fill();
    c.fillStyle = '#222'; c.beginPath(); c.arc(2, -29.5 - bob, 0.8, 0, 7); c.fill();
    c.fillStyle = '#e57373'; c.beginPath(); c.arc(3.4, -27.5 - bob, 1, 0, 7); c.fill();
    if(hat){
      c.fillStyle = '#e8c35a'; c.beginPath(); c.ellipse(0, -32 - bob, 8.5, 2.6, 0, 0, 7); c.fill();
      c.beginPath(); c.ellipse(0, -34 - bob, 4.6, 3.6, 0, Math.PI, 0); c.fill();
      c.fillStyle = '#c0392b'; c.fillRect(-4.6, -34.5 - bob, 9.2, 1.6);
    } else { c.fillStyle = look[2]; c.beginPath(); c.arc(0, -31 - bob, 5.2, Math.PI * 1.05, Math.PI * 1.95); c.fill(); }
    c.restore();
  },
  dogDraw(c, p, g, time){
    const sw = g.walk ? Math.sin(time * 14) : 0;
    c.save(); c.translate(p.x, p.y); c.scale(g.dir * 1.2, 1.2);
    c.fillStyle = '#00000030'; c.beginPath(); c.ellipse(0, 0, 9, 3, 0, 0, 7); c.fill();
    c.strokeStyle = '#6d4c41'; c.lineWidth = 2.4; c.lineCap = 'round';
    [[-5, 1], [-2, -1], [3, 1], [6, -1]].forEach(([lx, s], i) => { c.beginPath(); c.moveTo(lx, -6); c.lineTo(lx + sw * s * 2.5, -1); c.stroke(); });
    c.strokeStyle = '#a1683f'; c.lineWidth = 2.6; c.beginPath(); c.moveTo(-8, -9); c.lineTo(-12, -14 + Math.sin(g.wag) * 3); c.stroke();
    c.fillStyle = '#a1683f'; c.beginPath(); c.ellipse(0, -9, 9, 5, 0, 0, 7); c.fill();
    c.fillStyle = '#fff3e0'; c.beginPath(); c.ellipse(1, -7, 5, 2.4, 0, 0, 7); c.fill();
    c.fillStyle = '#a1683f'; c.beginPath(); c.arc(9, -14, 5, 0, 7); c.fill();
    c.fillStyle = '#6d4c41'; c.beginPath(); c.ellipse(7, -17, 2.4, 4, 0.5, 0, 7); c.fill();
    c.fillStyle = '#fff3e0'; c.beginPath(); c.ellipse(12.5, -12.5, 3, 2.2, 0, 0, 7); c.fill();
    c.fillStyle = '#222'; c.beginPath(); c.arc(14.5, -13, 1.1, 0, 7); c.fill(); c.beginPath(); c.arc(10, -15.5, 0.9, 0, 7); c.fill();
    if(g.walk){ c.fillStyle = '#e57373'; c.beginPath(); c.ellipse(13, -10, 1.4, 2.2, 0.3, 0, 7); c.fill(); }
    c.restore();
  },
  addItems(add, getC, time, st){
    const T = TILE;
    const f = this.farmer, g = this.dog;
    if(!f) return;
    add((f.x + f.y) * T, () => this.person(getC(), Art.P(f.x * T, f.y * T), f, time, ['#e53935', '#3f6fd8', '#6d4c41'], true, 0));
    add((g.x + g.y) * T, () => this.dogDraw(getC(), Art.P(g.x * T, g.y * T), g, time));
    this.visitors.forEach(v => add((v.x + v.y) * T, () => this.person(getC(), Art.P(v.x * T, v.y * T), v, time, v.look, false, v.li || 1)));
  },

  /* ---------- свет ночью ---------- */
  addLight(ctx, x, y, r, col){ const m = ctx.getTransform(), q = m.transformPoint(new DOMPoint(x, y)); this.lights.push({ x: q.x, y: q.y, r: r * Math.hypot(m.a, m.b), col }); },
  lamps(ctx, time, view){
    const T = TILE;
    [[-1.2, 5.6], [3.6, 5.6], [-4.4, 8.6], [12.2, -1.6], [6.6, -1.4]].forEach(([gx, gy]) => {
      const p = Art.P(gx * T, gy * T); if(!Art.inView(p, view)) return;
      ctx.fillStyle = '#00000030'; ctx.beginPath(); ctx.ellipse(p.x, p.y, 7, 3, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#37474f'; ctx.fillRect(p.x - 2, p.y - 56, 4, 56); ctx.fillRect(p.x - 5, p.y - 4, 10, 4);
      ctx.fillStyle = '#263238'; ctx.beginPath(); ctx.moveTo(p.x - 8, p.y - 58); ctx.lineTo(p.x + 8, p.y - 58); ctx.lineTo(p.x + 5, p.y - 70); ctx.lineTo(p.x - 5, p.y - 70); ctx.fill();
      const on = this.sky().n > 0.25;
      ctx.fillStyle = on ? '#ffe082' : '#cfd8dc'; ctx.fillRect(p.x - 5, p.y - 68, 10, 9);
      ctx.fillStyle = '#263238'; ctx.beginPath(); ctx.moveTo(p.x - 7, p.y - 70); ctx.lineTo(p.x, p.y - 76); ctx.lineTo(p.x + 7, p.y - 70); ctx.fill();
      if(on) this.addLight(ctx, p.x, p.y - 64, 70, '255,210,120');
    });
  },
  // После затемнения: окна и фонари светятся, летают светлячки.
  glow(ctx, time, view, n){
    if(n < 0.05){ this.lights.length = 0; return; }
    ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'lighter';
    for(const l of this.lights){
      const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
      g.addColorStop(0, `rgba(${l.col},${0.55 * n})`); g.addColorStop(1, `rgba(${l.col},0)`);
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(l.x, l.y, l.r, 0, 7); ctx.fill();
    }
    ctx.restore();
    this.lights.length = 0;
    // светлячки
    ctx.save();
    const r = rnd(99);
    for(let i = 0; i < 40; i++){
      const bx = r() * MAP_W * TILE, by = r() * MAP_H * TILE, ph = r() * 6;
      const p = Art.P(bx + Math.sin(time * 0.6 + ph) * 30, by + Math.cos(time * 0.5 + ph) * 30); if(!Art.inView(p, view, 0)) continue;
      const a = Math.max(0, Math.sin(time * 2.4 + ph * 3)) * n;
      if(a < 0.05) continue;
      const y = p.y - 18 - Math.sin(time + ph) * 8;
      const g = ctx.createRadialGradient(p.x, y, 0, p.x, y, 9); g.addColorStop(0, `rgba(230,255,120,${a})`); g.addColorStop(1, 'rgba(230,255,120,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, y, 9, 0, 7); ctx.fill();
    }
    ctx.restore();
  },
  // Летящие по ветру листья (днём) — в экранных координатах.
  wind(ctx, W, H, dt, n){
    if(n > 0.6) return;
    if(this.leaves.length < 7 && Math.random() < dt * 0.8) this.leaves.push({ x: -20, y: Math.random() * H * 0.8, vx: 40 + Math.random() * 40, vy: 8 + Math.random() * 14, r: Math.random() * 6, col: ['#7cb342', '#c0ca33', '#ffb300', '#8bc34a'][Math.floor(Math.random() * 4)] });
    ctx.save();
    this.leaves = this.leaves.filter(l => {
      l.x += l.vx * dt; l.y += (l.vy + Math.sin(l.x / 30) * 20) * dt; l.r += dt * 3;
      ctx.save(); ctx.translate(l.x, l.y); ctx.rotate(l.r); ctx.fillStyle = l.col; ctx.beginPath(); ctx.ellipse(0, 0, 4.5, 2.2, 0, 0, 7); ctx.fill(); ctx.restore();
      return l.x < W + 30 && l.y < H + 30;
    });
    ctx.restore();
  },
};
window.Life = Life;

/* ---------- свет и цвет неба поверх картинки ---------- */
Art.lighting = function(ctx, W, H){
  const { n, s } = Life.sky();
  ctx.save();
  ctx.globalCompositeOperation = 'soft-light';
  const g = ctx.createRadialGradient(W * 0.15, -H * 0.15, 0, W * 0.15, -H * 0.15, Math.hypot(W, H) * 1.15);
  g.addColorStop(0, `rgba(255,236,170,${0.75 * (1 - n)})`); g.addColorStop(0.55, `rgba(255,220,150,${0.25 * (1 - n)})`); g.addColorStop(1, 'rgba(20,40,90,0.35)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
  if(s > 0){ ctx.fillStyle = `rgba(255,120,60,${0.55 * s})`; ctx.fillRect(0, 0, W, H); }
  if(n > 0){
    ctx.globalCompositeOperation = 'multiply';
    const k = 0.62 * n, mix = (a, b) => Math.round(a + (b - a) * k);
    ctx.fillStyle = `rgb(${mix(255, 40)},${mix(255, 58)},${mix(255, 120)})`; ctx.fillRect(0, 0, W, H);
  }
  ctx.globalCompositeOperation = 'source-over';
  const v = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.45, W / 2, H * 0.45, Math.hypot(W, H) * 0.7);
  v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, `rgba(10,25,10,${0.22 + n * 0.15})`);
  ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
  ctx.restore();
};
// Окна ночью светятся тёплым светом.
{
  const win = Art.window;
  Art.window = function(ctx, side, x, y, W, H, u0, u1, v0, v1, shutter, flowers){
    win.call(this, ctx, side, x, y, W, H, u0, u1, v0, v1, shutter, flowers);
    const n = Life.sky().n; if(n < 0.25) return;
    const f = (a, b, c2, d2, col) => (side === 'y' ? this.faceY : this.faceX).call(this, ctx, x, y, W, H, a, b, c2, d2, col);
    ctx.save(); ctx.globalAlpha = Math.min(1, n * 1.2); f(u0, u1, v0, v1, '#ffd77a'); ctx.restore();
    const c = side === 'y' ? this.up(this.P(x + (u0 + u1) / 2, y + H), (v0 + v1) / 2) : this.up(this.P(x + W, y + H - (u0 + u1) / 2), (v0 + v1) / 2);
    Life.addLight(ctx, c.x, c.y, 34, '255,200,110');
  };
}
// Трава и цветы колышутся на ветру.
Art.drawGroundBits = function(ctx, st, view, time = 0){
  if(!this.sprites) this.makeSprites();
  const occ = makeOcc(st), T = TILE;
  const free = (x, y) => { const gx = Math.floor(x), gy = Math.floor(y); return gx >= 0 && gy >= 0 && gx < MAP_W && gy < MAP_H && occ.free(gx, gy, 1, 1); };
  for(const b of this.groundBits){
    const p = this.P(b.x * T, b.y * T);
    if(p.x < view.x0 - 30 || p.x > view.x1 + 30 || p.y < view.y0 - 30 || p.y > view.y1 + 30) continue;
    if(!free(b.x, b.y) || (b.y > 5.6 && b.y < 8.4 && b.x < 4.5)) continue;
    const sp = b.kind === 'tuft' ? this.sprites.tufts[b.v % 3] : b.kind === 'flower' ? this.sprites.flowers[b.v] : b.kind === 'rock' ? this.sprites.rock : this.sprites.shroom;
    if(b.kind === 'tuft' || b.kind === 'flower'){
      const sk = Math.sin(time * 1.7 + b.x * 0.9 + b.y * 0.4) * 0.16 + Math.sin(time * 4.1 + b.x) * 0.03;
      ctx.save(); ctx.translate(p.x, p.y + 3); ctx.transform(1, 0, sk, 1, 0, 0); ctx.drawImage(sp.cv, -sp.w / 2, -sp.h, sp.w, sp.h); ctx.restore();
    } else ctx.drawImage(sp.cv, p.x - sp.w / 2, p.y - sp.h + 3, sp.w, sp.h);
  }
};
