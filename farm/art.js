// «Хуторок» — рисованная графика. Всё рисуется кодом на canvas, без картинок.
'use strict';

const TILE = 48;

// Детерминированный «случай» — чтобы трава и колосья не прыгали каждый кадр.
function rnd(seed){ let s = seed | 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

const Art = {
  grassPattern: null,
  soilPattern: null,

  init(ctx){
    // Трава: светлые и тёмные травинки на зелёном.
    const g = document.createElement('canvas'); g.width = g.height = 192;
    const c = g.getContext('2d');
    c.fillStyle = '#7cc453'; c.fillRect(0, 0, 192, 192);
    const r = rnd(7);
    for(let i = 0; i < 520; i++){
      const x = r() * 192, y = r() * 192, h = 3 + r() * 6;
      c.strokeStyle = r() < 0.5 ? '#6ab443' : '#93d266';
      c.lineWidth = 1.4;
      c.beginPath(); c.moveTo(x, y); c.lineTo(x + (r() - 0.5) * 3, y - h); c.stroke();
    }
    for(let i = 0; i < 14; i++){ c.fillStyle = r() < 0.5 ? '#fff6' : '#ffe56a99'; c.beginPath(); c.arc(r() * 192, r() * 192, 1.6, 0, 7); c.fill(); }
    this.grassPattern = ctx.createPattern(g, 'repeat');
    const so = document.createElement('canvas'); so.width = so.height = 64;
    const sc = so.getContext('2d');
    sc.fillStyle = '#9b6b3c'; sc.fillRect(0, 0, 64, 64);
    const r2 = rnd(3);
    for(let i = 0; i < 60; i++){ sc.fillStyle = r2() < 0.5 ? '#8a5c30' : '#ad7c4a'; sc.fillRect(r2() * 64, r2() * 64, 2, 2); }
    this.soilPattern = ctx.createPattern(so, 'repeat');
  },

  /* ---------- изометрия ----------
     Земля хранится в «плоских» координатах (клетка = TILE px), на экран
     проецируется как ромб: X = x − y, Y = (x + y) / 2. */
  P(x, y){ return { x: x - y, y: (x + y) / 2 }; },
  up(p, h){ return { x: p.x, y: p.y - h }; },
  poly(ctx, pts, fill, stroke){
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
    if(fill){ ctx.fillStyle = fill; ctx.fill(); }
    if(stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.stroke(); }
  },
  shade(hex, k){
    const n = parseInt(hex.slice(1), 16);
    const f = c => Math.max(0, Math.min(255, Math.round(c * k)));
    return '#' + [f(n >> 16), f(n >> 8 & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join('');
  },

  /* ---------- земля (рисуется в плоскости) ---------- */
  groundFlat(ctx){
    const W = MAP_W * TILE, H = MAP_H * TILE;
    ctx.fillStyle = '#5c9a3a'; ctx.fillRect(-3000, -3000, W + 6000, H + 6000);
    ctx.fillStyle = this.grassPattern; ctx.fillRect(0, 0, W, H);
    // тропинки-«проплешины» для живости
    const r = rnd(11); ctx.fillStyle = '#8bcf5e66';
    for(let i = 0; i < 18; i++){ ctx.beginPath(); ctx.ellipse(r() * W, r() * H, 30 + r() * 60, 18 + r() * 30, r() * 3, 0, 7); ctx.fill(); }
    // дорога
    ctx.fillStyle = '#d9b67a'; ctx.beginPath(); ctx.roundRect(-3000, 6 * TILE + 6, 3000 + 4 * TILE, 2 * TILE - 12, 12); ctx.fill();
    ctx.fillStyle = '#c9a265'; for(let x = -2980; x < 4 * TILE; x += 70) ctx.fillRect(x, 7 * TILE - 2, 30, 4);
  },
  plotFlat(ctx, x, y, size, ready, highlight){
    const pad = 5;
    ctx.fillStyle = '#5e3c1e'; ctx.beginPath(); ctx.roundRect(x + pad + 3, y + pad + 3, size - pad * 2, size - pad * 2, 14); ctx.fill();
    ctx.fillStyle = this.soilPattern; ctx.beginPath(); ctx.roundRect(x + pad, y + pad, size - pad * 2, size - pad * 2, 14); ctx.fill();
    ctx.strokeStyle = '#7d5128'; ctx.lineWidth = 4;
    for(let i = 1; i < 4; i++){ const yy = y + pad + (size - pad * 2) * i / 4; ctx.beginPath(); ctx.moveTo(x + pad + 10, yy); ctx.lineTo(x + size - pad - 10, yy); ctx.stroke(); }
    if(ready){ ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(x + pad, y + pad, size - pad * 2, size - pad * 2, 14); ctx.stroke(); }
    if(highlight){ ctx.strokeStyle = highlight; ctx.lineWidth = 5; ctx.beginPath(); ctx.roundRect(x + pad, y + pad, size - pad * 2, size - pad * 2, 14); ctx.stroke(); }
  },
  shadowFlat(ctx, x, y, w, h){
    ctx.fillStyle = '#00000026'; ctx.beginPath(); ctx.roundRect(x + 6, y + 10, w + 6, h + 4, 16); ctx.fill();
  },
  penFlat(ctx, x, y, w, h){
    ctx.fillStyle = '#c3d98a'; ctx.beginPath(); ctx.roundRect(x + 2, y + 2, w - 4, h - 4, 12); ctx.fill();
    const r = rnd(w * 7 + h); ctx.fillStyle = '#afc777';
    for(let i = 0; i < 40; i++){ ctx.beginPath(); ctx.arc(x + 10 + r() * (w - 20), y + 10 + r() * (h - 20), 3 + r() * 5, 0, 7); ctx.fill(); }
  },
  pondFlat(ctx, x, y, w, h){
    ctx.fillStyle = '#7fb85a'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#4fa8dc'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2 - 10, h / 2 - 10, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#6fc0ea'; ctx.beginPath(); ctx.ellipse(x + w / 2 - 8, y + h / 2 - 6, w / 2 - 26, h / 2 - 22, 0, 0, 7); ctx.fill();
  },

  /* ---------- вертикальные элементы ---------- */
  fenceLine(ctx, ax, ay, bx, by, gap){
    const len = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(len / TILE));
    const pts = [];
    for(let i = 0; i <= n; i++){ const gx = ax + (bx - ax) * i / n, gy = ay + (by - ay) * i / n; pts.push({ gx, gy, p: this.P(gx, gy) }); }
    const skip = (a) => gap && a.gy > gap[0] && a.gy < gap[1] && a.gx < 2;
    ctx.lineCap = 'round';
    for(let i = 0; i < n; i++){
      if(skip(pts[i]) || skip(pts[i + 1])) continue;
      const a = pts[i].p, b = pts[i + 1].p;
      ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 4;
      ctx.beginPath(); ctx.moveTo(a.x, a.y - 8); ctx.lineTo(b.x, b.y - 8); ctx.moveTo(a.x, a.y - 18); ctx.lineTo(b.x, b.y - 18); ctx.stroke();
      ctx.strokeStyle = '#b07a42'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(a.x, a.y - 9); ctx.lineTo(b.x, b.y - 9); ctx.moveTo(a.x, a.y - 19); ctx.lineTo(b.x, b.y - 19); ctx.stroke();
    }
    pts.forEach(o => { if(skip(o)) return; ctx.fillStyle = '#8b5a2b'; ctx.fillRect(o.p.x - 3, o.p.y - 26, 6, 26); ctx.fillStyle = '#a8743d'; ctx.fillRect(o.p.x - 3, o.p.y - 26, 3, 26); });
  },
  // Дом-коробка: x,y,W,H — основание в плоских координатах, h — высота стен.
  box(ctx, x, y, W, H, h, wall, roof, opts = {}){
    const P = (a, b) => this.P(a, b), up = (p, hh) => this.up(p, hh);
    const A = P(x, y), B = P(x + W, y), C = P(x + W, y + H), D = P(x, y + H);
    const rh = opts.roofH ?? h * 0.7, ov = 6;
    const wallL = wall, wallR = this.shade(wall, 0.82);
    this.poly(ctx, [D, C, up(C, h), up(D, h)], wallL);
    this.poly(ctx, [C, B, up(B, h), up(C, h)], wallR);
    // основание стены — тёмная полоса
    this.poly(ctx, [D, C, up(C, 8), up(D, 8)], this.shade(wall, 0.7));
    this.poly(ctx, [C, B, up(B, 8), up(C, 8)], this.shade(wall, 0.6));
    if(opts.flat){
      this.poly(ctx, [up(A, h), up(B, h), up(C, h), up(D, h)], roof);
      return { A, B, C, D, top: up(A, h) };
    }
    // двускатная крыша, конёк вдоль x
    const R1 = up(P(x - ov, y + H / 2), h + rh), R2 = up(P(x + W + ov, y + H / 2), h + rh);
    const a = up(P(x - ov, y - ov), h - 2), b = up(P(x + W + ov, y - ov), h - 2), c = up(P(x + W + ov, y + H + ov), h - 2), d = up(P(x - ov, y + H + ov), h - 2);
    this.poly(ctx, [a, b, R2, R1], this.shade(roof, 0.75));
    this.poly(ctx, [up(C, h), up(B, h), up(P(x + W, y + H / 2), h + rh)], wallR);     // фронтон
    this.poly(ctx, [d, c, R2, R1], roof);
    // черепица
    ctx.strokeStyle = this.shade(roof, 0.85); ctx.lineWidth = 2;
    for(let i = 1; i < 4; i++){ const t = i / 4; const l = { x: d.x + (R1.x - d.x) * t, y: d.y + (R1.y - d.y) * t }, r2 = { x: c.x + (R2.x - c.x) * t, y: c.y + (R2.y - c.y) * t }; ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(r2.x, r2.y); ctx.stroke(); }
    ctx.strokeStyle = this.shade(roof, 0.6); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(R1.x, R1.y); ctx.lineTo(R2.x, R2.y); ctx.stroke();
    return { A, B, C, D, R1, R2 };
  },
  // Прямоугольник на стене +y (передняя левая): u — смещение вдоль стены (px), v — высота.
  faceY(ctx, x, y, W, H, u0, u1, v0, v1, fill){
    const p = (u, v) => this.up(this.P(x + u, y + H), v);
    this.poly(ctx, [p(u0, v0), p(u1, v0), p(u1, v1), p(u0, v1)], fill);
  },
  faceX(ctx, x, y, W, H, u0, u1, v0, v1, fill){
    const p = (u, v) => this.up(this.P(x + W, y + H - u), v);
    this.poly(ctx, [p(u0, v0), p(u1, v0), p(u1, v1), p(u0, v1)], fill);
  },
  sign(ctx, px, py, icon, r = 17){
    ctx.fillStyle = '#fffdf6'; ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.font = `${Math.round(r * 1.2)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(icon, px, py + 1);
  },
  factory(ctx, x, y, W, H, B, working, time){
    const h = 62;
    const g = this.box(ctx, x, y, W, H, h, B.wall, B.roof, { roofH: 46 });
    // дверь и окна
    this.faceY(ctx, x, y, W, H, W / 2 - 16, W / 2 + 16, 0, 40, '#6b4226');
    this.faceY(ctx, x, y, W, H, W / 2 - 13, W / 2 + 13, 3, 37, '#7d5230');
    this.faceY(ctx, x, y, W, H, 14, 40, 26, 46, '#bfe3f5');
    this.faceY(ctx, x, y, W, H, W - 40, W - 14, 26, 46, '#bfe3f5');
    this.faceX(ctx, x, y, W, H, 30, 60, 26, 46, '#a9d3e8');
    // труба
    const ch = this.up(this.P(x + W * 0.75, y + H * 0.3), h + 30);
    ctx.fillStyle = '#8c5a3c'; ctx.fillRect(ch.x - 7, ch.y - 30, 14, 34); ctx.fillStyle = '#6e452d'; ctx.fillRect(ch.x - 9, ch.y - 34, 18, 6);
    if(working){
      ctx.fillStyle = '#ffffff';
      for(let i = 0; i < 4; i++){ const p = (time * 0.5 + i / 4) % 1; ctx.globalAlpha = (1 - p) * 0.8; ctx.beginPath(); ctx.arc(ch.x + Math.sin(p * 7 + i) * 6, ch.y - 36 - p * 50, 5 + p * 8, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    const s = this.up(this.P(x + W / 2, y + H), h + 14);
    this.sign(ctx, s.x, s.y, B.e);
  },
  barn(ctx, x, y, W, H){
    const h = 74;
    this.box(ctx, x, y, W, H, h, '#c8442f', '#7a2a1d', { roofH: 56 });
    this.faceY(ctx, x, y, W, H, W / 2 - 26, W / 2 + 26, 0, 54, '#f4efe4');
    this.faceY(ctx, x, y, W, H, W / 2 - 22, W / 2 + 22, 4, 50, '#9b3424');
    const p = (u, v) => this.up(this.P(x + u, y + H), v);
    ctx.strokeStyle = '#f4efe4'; ctx.lineWidth = 4;
    const a = p(W / 2 - 22, 4), b = p(W / 2 + 22, 50), c = p(W / 2 + 22, 4), d = p(W / 2 - 22, 50);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.stroke();
    this.faceX(ctx, x, y, W, H, 40, 70, 40, 60, '#f4efe4');
    const s = this.up(this.P(x + W / 2, y + H), h + 18);
    this.sign(ctx, s.x, s.y, '📦');
  },
  shelter(ctx, x, y, W, H, B){
    this.box(ctx, x, y, W, H, 40, B.wall, B.roof, { roofH: 30 });
    this.faceY(ctx, x, y, W, H, W / 2 - 13, W / 2 + 13, 0, 28, '#5a3820');
    const s = this.up(this.P(x + W / 2, y + H), 54);
    this.sign(ctx, s.x, s.y, B.e, 14);
  },
  trough(ctx, x, y){
    const g = this.box(ctx, x, y, 56, 22, 12, '#8b5a2b', '#e6c35c', { flat: true });
  },
  board(ctx, x, y, hasDone){
    const a = this.P(x + 20, y + 70), b = this.P(x + 76, y + 70);
    ctx.fillStyle = '#7a4a22'; ctx.fillRect(a.x - 4, a.y - 70, 8, 70); ctx.fillRect(b.x - 4, b.y - 70, 8, 70);
    const tl = this.up(a, 90), tr = this.up(b, 90), br = this.up(b, 48), bl = this.up(a, 48);
    this.poly(ctx, [this.up(a, 94), this.up(b, 94), this.up(b, 44), this.up(a, 44)], '#c98f4f');
    for(let i = 0; i < 3; i++){
      const u0 = 0.08 + i * 0.31, u1 = u0 + 0.24;
      const L = t => ({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
      this.poly(ctx, [this.up(L(u0), 86), this.up(L(u1), 86), this.up(L(u1), 54), this.up(L(u0), 54)], '#fffdf6');
      const pin = this.up(L((u0 + u1) / 2), 84); ctx.fillStyle = '#e5533d'; ctx.beginPath(); ctx.arc(pin.x, pin.y, 3, 0, 7); ctx.fill();
    }
  },
  tree(ctx, px, py, kind, time, seed){
    const sway = Math.sin(time * 1.3 + seed) * 2.5;
    ctx.fillStyle = '#00000022'; ctx.beginPath(); ctx.ellipse(px, py, 34, 15, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#7a4a24'; ctx.fillRect(px - 6, py - 40, 12, 40);
    if(kind === 'tree'){
      ctx.fillStyle = '#3f8f35'; ctx.beginPath(); ctx.arc(px + sway, py - 62, 36, 0, 7); ctx.fill();
      ctx.fillStyle = '#56a845'; ctx.beginPath(); ctx.arc(px - 10 + sway, py - 72, 24, 0, 7); ctx.fill();
      ctx.fillStyle = '#e5533d'; [[-16, -54], [12, -66], [6, -46], [-4, -82], [20, -52]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(px + dx + sway, py + dy, 4.5, 0, 7); ctx.fill(); });
    } else {
      ctx.fillStyle = '#2f6f3a';
      for(let i = 0; i < 3; i++){ const yy = py - 110 + i * 26; ctx.beginPath(); ctx.moveTo(px + sway * (1 - i / 3), yy); ctx.lineTo(px + 30 + i * 6, yy + 40); ctx.lineTo(px - 30 - i * 6, yy + 40); ctx.fill(); }
      ctx.fillStyle = '#3d8546'; ctx.beginPath(); ctx.moveTo(px + sway, py - 110); ctx.lineTo(px + 8, py - 80); ctx.lineTo(px - 18, py - 74); ctx.fill();
    }
  },
  decorUp(ctx, kind, x, y, w, h, time){
    const c = this.P(x + w / 2, y + h / 2);
    switch(kind){
      case 'tree': case 'pine': this.tree(ctx, c.x, c.y + 10, kind, time, x + y); break;
      case 'flowers': case 'sunflower': {
        const r = rnd(x * 3 + y);
        for(let i = 0; i < 5; i++){
          const p = this.P(x + 8 + r() * (w - 16), y + 8 + r() * (h - 16));
          const sw = Math.sin(time * 2 + i) * 1.5;
          ctx.strokeStyle = '#3f8f35'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x + sw, p.y - (kind === 'sunflower' ? 30 : 16)); ctx.stroke();
          ctx.fillStyle = kind === 'sunflower' ? '#ffc93a' : ['#ff6b9a', '#ffd23f', '#a78bfa', '#ff8f4a', '#fff'][i % 5];
          const hy = p.y - (kind === 'sunflower' ? 32 : 18);
          if(kind === 'sunflower'){ for(let k = 0; k < 8; k++){ const a = k * Math.PI / 4; ctx.beginPath(); ctx.ellipse(p.x + sw + Math.cos(a) * 6, hy + Math.sin(a) * 6, 4, 2.5, a, 0, 7); ctx.fill(); } ctx.fillStyle = '#7a4a24'; ctx.beginPath(); ctx.arc(p.x + sw, hy, 4, 0, 7); ctx.fill(); }
          else { for(let k = 0; k < 5; k++){ const a = k * Math.PI * 2 / 5; ctx.beginPath(); ctx.arc(p.x + sw + Math.cos(a) * 3.5, hy + Math.sin(a) * 3.5, 3, 0, 7); ctx.fill(); } ctx.fillStyle = '#ffe36a'; ctx.beginPath(); ctx.arc(p.x + sw, hy, 2, 0, 7); ctx.fill(); }
        }
        break;
      }
      case 'bench': {
        const a = this.P(x + 10, y + h / 2), b = this.P(x + w - 10, y + h / 2);
        ctx.fillStyle = '#6b4226'; ctx.fillRect(a.x - 3, a.y - 16, 6, 16); ctx.fillRect(b.x - 3, b.y - 16, 6, 16);
        this.poly(ctx, [this.up(a, 18), this.up(b, 18), this.up(b, 24), this.up(a, 24)], '#a0693a');
        this.poly(ctx, [this.up(a, 30), this.up(b, 30), this.up(b, 40), this.up(a, 40)], '#8b5a2b');
        break;
      }
      case 'hay': {
        ctx.fillStyle = '#00000022'; ctx.beginPath(); ctx.ellipse(c.x, c.y + 4, 26, 11, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#e8c35a'; ctx.beginPath(); ctx.ellipse(c.x, c.y - 10, 24, 22, 0, Math.PI, 0); ctx.lineTo(c.x + 24, c.y); ctx.lineTo(c.x - 24, c.y); ctx.fill();
        ctx.strokeStyle = '#c99b30'; ctx.lineWidth = 2; for(let i = -2; i <= 2; i++){ ctx.beginPath(); ctx.moveTo(c.x + i * 8, c.y - 26 + Math.abs(i) * 4); ctx.lineTo(c.x + i * 9, c.y - 2); ctx.stroke(); }
        break;
      }
      case 'well': {
        this.box(ctx, x + 14, y + 14, w - 28, h - 28, 26, '#9aa3ad', '#5fb3e0', { flat: true });
        const p1 = this.up(this.P(x + 18, y + h / 2), 26), p2 = this.up(this.P(x + w - 18, y + h / 2), 26);
        ctx.fillStyle = '#8b5a2b'; ctx.fillRect(p1.x - 3, p1.y - 46, 6, 46); ctx.fillRect(p2.x - 3, p2.y - 46, 6, 46);
        this.poly(ctx, [this.up(this.P(x + 8, y + h / 2 - 20), 66), this.up(this.P(x + w - 8, y + h / 2 - 20), 66), this.up(this.P(x + w - 8, y + h / 2 + 20), 66), this.up(this.P(x + 8, y + h / 2 + 20), 66)], '#bc4b2c');
        this.poly(ctx, [this.up(this.P(x + 8, y + h / 2 + 20), 66), this.up(this.P(x + w - 8, y + h / 2 + 20), 66), this.up(this.P(x + w - 8, y + h / 2 + 20), 58), this.up(this.P(x + 8, y + h / 2 + 20), 58)], '#8e3a22');
        break;
      }
      case 'pond': {
        // вода рисуется плоско; тут — блики и кувшинки
        ctx.strokeStyle = '#ffffff99'; ctx.lineWidth = 2;
        for(let i = 0; i < 3; i++){ const p = this.P(x + w * (0.3 + i * 0.2), y + h * (0.4 + (i % 2) * 0.2)); ctx.beginPath(); ctx.ellipse(p.x, p.y, 10 + Math.sin(time * 2 + i) * 3, 3, 0, 0, 7); ctx.stroke(); }
        const lp = this.P(x + w * 0.75, y + h * 0.35); ctx.fillStyle = '#3f9a3a'; ctx.beginPath(); ctx.ellipse(lp.x, lp.y, 12, 6, 0.2, 0, 7); ctx.fill(); ctx.fillStyle = '#ff8fb3'; ctx.beginPath(); ctx.arc(lp.x + 3, lp.y - 2, 4, 0, 7); ctx.fill();
        break;
      }
    }
  },
  star(ctx, x, y, r){
    ctx.beginPath();
    for(let i = 0; i < 8; i++){ const a = i * Math.PI / 4, rr = i % 2 ? r * 0.35 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
    ctx.fill();
  },
  crop(ctx, kind, stage, x, y, r){
    const sprout = () => { ctx.strokeStyle = '#5fae3a'; ctx.lineWidth = 2.4; ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x - 4, y - 6, x - 6, y - 8); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 4, y - 6, x + 6, y - 9); ctx.stroke(); };
    if(stage === 0){ sprout(); return; }
    const k = stage === 1 ? 0.6 : 1;
    ctx.lineCap = 'round';
    switch(kind){
      case 'wheat': {
        const h = 22 * k;
        for(let s = -1; s <= 1; s++){
          ctx.strokeStyle = stage === 3 ? '#d9a62e' : '#8fbf3a'; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.moveTo(x + s * 3, y); ctx.lineTo(x + s * 5, y - h); ctx.stroke();
          if(stage >= 2){ ctx.fillStyle = stage === 3 ? '#f2c84b' : '#b6d45a'; ctx.beginPath(); ctx.ellipse(x + s * 5, y - h - 4, 2.6, 6, s * 0.2, 0, 7); ctx.fill(); }
        }
        break;
      }
      case 'corn': {
        const h = 30 * k;
        ctx.strokeStyle = '#4f9a2c'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h); ctx.stroke();
        ctx.fillStyle = '#5fb03a';
        ctx.beginPath(); ctx.ellipse(x - 6, y - h * 0.5, 9, 3, -0.6, 0, 7); ctx.fill();
        ctx.beginPath(); ctx.ellipse(x + 6, y - h * 0.7, 9, 3, 0.6, 0, 7); ctx.fill();
        if(stage === 3){ ctx.fillStyle = '#f6c945'; ctx.beginPath(); ctx.ellipse(x + 4, y - h * 0.45, 3.5, 7, 0.3, 0, 7); ctx.fill(); ctx.fillStyle = '#7fbf4a'; ctx.beginPath(); ctx.ellipse(x + 2, y - h * 0.38, 2.5, 6, 0.6, 0, 7); ctx.fill(); }
        break;
      }
      case 'carrot': {
        if(stage === 3){ ctx.fillStyle = '#f08a24'; ctx.beginPath(); ctx.moveTo(x - 4, y - 2); ctx.lineTo(x + 4, y - 2); ctx.lineTo(x, y + 8); ctx.fill(); }
        ctx.fillStyle = '#4fae35';
        for(let s = -1; s <= 1; s++){ ctx.beginPath(); ctx.ellipse(x + s * 4, y - 9 * k, 2.6, 8 * k, s * 0.4, 0, 7); ctx.fill(); }
        break;
      }
      case 'cane': {
        ctx.strokeStyle = stage === 3 ? '#9ccc4a' : '#6fb53e'; ctx.lineWidth = 3;
        for(let s = -1; s <= 1; s += 2){ ctx.beginPath(); ctx.moveTo(x + s * 3, y); ctx.lineTo(x + s * 4, y - 32 * k); ctx.stroke(); }
        ctx.strokeStyle = '#3f7f25'; ctx.lineWidth = 1;
        for(let yy = 8; yy < 32 * k; yy += 8){ ctx.beginPath(); ctx.moveTo(x - 6, y - yy); ctx.lineTo(x + 6, y - yy); ctx.stroke(); }
        break;
      }
      case 'tomato':
      case 'strawberry': {
        const big = kind === 'tomato';
        ctx.fillStyle = '#3f9a32';
        ctx.beginPath(); ctx.arc(x, y - 8 * k, (big ? 10 : 8) * k, 0, 7); ctx.fill();
        ctx.fillStyle = '#56b443'; ctx.beginPath(); ctx.arc(x - 3, y - 10 * k, (big ? 6 : 5) * k, 0, 7); ctx.fill();
        if(stage === 3){
          ctx.fillStyle = big ? '#e8402d' : '#e9334f';
          for(let i = 0; i < 3; i++){ ctx.beginPath(); ctx.arc(x - 5 + i * 5, y - 6 - (i % 2) * 6, big ? 3.4 : 2.6, 0, 7); ctx.fill(); }
        }
        break;
      }
      case 'pumpkin': {
        ctx.strokeStyle = '#4e9a2e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.quadraticCurveTo(x, y - 8, x + 10, y - 2); ctx.stroke();
        ctx.fillStyle = '#5fb03a'; ctx.beginPath(); ctx.arc(x - 6, y - 4, 5 * k, 0, 7); ctx.fill();
        if(stage === 3){ ctx.fillStyle = '#f08b1c'; ctx.beginPath(); ctx.ellipse(x + 3, y - 4, 8, 6, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#c96a10'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 3, y - 10); ctx.lineTo(x + 3, y + 2); ctx.stroke(); }
        break;
      }
    }
  },

  truck(ctx, x, y, flip, cargo){
    ctx.save(); ctx.translate(x, y); if(flip) ctx.scale(-1, 1);
    ctx.fillStyle = '#00000025'; ctx.beginPath(); ctx.ellipse(0, 26, 54, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#e8eef4'; ctx.beginPath(); ctx.roundRect(-52, -22, 66, 42, 6); ctx.fill();
    ctx.fillStyle = '#d9473a'; ctx.beginPath(); ctx.roundRect(14, -10, 38, 30, [10, 10, 4, 4]); ctx.fill();
    ctx.fillStyle = '#bfe3f5'; ctx.beginPath(); ctx.roundRect(30, -6, 18, 12, 3); ctx.fill();
    ctx.fillStyle = '#2b2b2b';
    [-36, -8, 36].forEach(wx => { ctx.beginPath(); ctx.arc(wx, 22, 8, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#9aa'; [-36, -8, 36].forEach(wx => { ctx.beginPath(); ctx.arc(wx, 22, 3, 0, 7); ctx.fill(); });
    if(cargo){ ctx.fillStyle = '#d8a35a'; ctx.fillRect(-46, -36, 22, 16); ctx.fillRect(-20, -32, 22, 12); }
    ctx.restore();
  },

  /* ---------- животные ---------- */
  animal(ctx, kind, x, y, dir, t, state){
    ctx.save(); ctx.translate(x, y); ctx.scale(dir < 0 ? -1.4 : 1.4, 1.4);
    const bob = Math.sin(t * 8) * 1.5;
    ctx.fillStyle = '#00000022'; ctx.beginPath(); ctx.ellipse(0, 10, 14, 4, 0, 0, 7); ctx.fill();
    if(kind === 'chicken'){
      ctx.fillStyle = '#fffdf6'; ctx.beginPath(); ctx.ellipse(0, bob, 11, 9, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.arc(8, -7 + bob, 6, 0, 7); ctx.fill();
      ctx.fillStyle = '#e5533d'; ctx.beginPath(); ctx.arc(9, -13 + bob, 3, 0, 7); ctx.fill();
      ctx.fillStyle = '#f2a33a'; ctx.beginPath(); ctx.moveTo(13, -7 + bob); ctx.lineTo(18, -5 + bob); ctx.lineTo(13, -3 + bob); ctx.fill();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(10, -8 + bob, 1.2, 0, 7); ctx.fill();
      ctx.fillStyle = '#eee7d6'; ctx.beginPath(); ctx.ellipse(-4, bob, 6, 4, 0.4, 0, 7); ctx.fill();
    } else if(kind === 'cow'){
      ctx.fillStyle = '#fbfbf7'; ctx.beginPath(); ctx.roundRect(-16, -10 + bob, 30, 18, 8); ctx.fill();
      ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(-6, -4 + bob, 4, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(6, 2 + bob, 3, 0, 7); ctx.fill();
      ctx.fillStyle = '#fbfbf7'; ctx.beginPath(); ctx.roundRect(10, -16 + bob, 14, 14, 5); ctx.fill();
      ctx.fillStyle = '#f2b6b0'; ctx.beginPath(); ctx.roundRect(15, -8 + bob, 10, 7, 3); ctx.fill();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(17, -12 + bob, 1.3, 0, 7); ctx.fill();
      ctx.fillStyle = '#d9c7a0'; ctx.fillRect(11, -19 + bob, 3, 4); ctx.fillRect(20, -19 + bob, 3, 4);
      ctx.fillStyle = '#555'; [-12, -4, 4, 10].forEach(lx => ctx.fillRect(lx, 7 + bob, 3, 6));
    } else {
      ctx.fillStyle = '#f4f1ea';
      [[-8, 0], [0, -4], [8, 0], [-2, 4], [6, 5], [-9, 6]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(dx, dy + bob, 7, 0, 7); ctx.fill(); });
      ctx.fillStyle = '#3d3a44'; ctx.beginPath(); ctx.ellipse(15, -4 + bob, 6, 7, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(17, -6 + bob, 1.4, 0, 7); ctx.fill();
      ctx.fillStyle = '#3d3a44'; [-8, 0, 8].forEach(lx => ctx.fillRect(lx, 9 + bob, 3, 6));
    }
    ctx.restore();
  },
  bubble(ctx, x, y, emoji, opts = {}){
    const r = opts.r || 16;
    const t = performance.now() / 300;
    const by = y + Math.sin(t + x) * 2;
    ctx.fillStyle = opts.bg || '#fffdf6'; ctx.strokeStyle = opts.stroke || '#00000030'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, by, r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 5, by + r - 2); ctx.lineTo(x, by + r + 7); ctx.lineTo(x + 5, by + r - 2); ctx.fill();
    ctx.font = `${Math.round(r * 1.15)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000'; ctx.fillText(emoji, x, by + 1);
    if(opts.badge){ ctx.fillStyle = '#e5533d'; ctx.beginPath(); ctx.arc(x + r - 2, by - r + 2, 8, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Rubik,sans-serif'; ctx.fillText(opts.badge, x + r - 2, by - r + 3); }
  },

};
