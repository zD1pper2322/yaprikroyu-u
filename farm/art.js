// «Хуторок» — рисованная графика. Всё рисуется кодом на canvas, без картинок.
'use strict';

const TILE = 48;

// Детерминированный «случай» — чтобы трава и колосья не прыгали каждый кадр.
function rnd(seed){ let s = seed | 0 || 1; return () => (s = (s * 16807) % 2147483647) / 2147483647; }

const Art = {
  grassPattern: null,
  soilPattern: null,

  init(ctx){
    // Трава как в Hay Day: сочная, «нарисованная» — мягкие пятна светлее и темнее, кустистые
    // мазки травинок, светлые блики. Плитка 512 и бесшовная (пятна заворачиваются через край).
    const Q = 2, S = 512;
    const paintGrass = (base, light, dark, blades, seed, flowers) => {
      const cv = document.createElement('canvas'); cv.width = cv.height = S * Q;
      const c = cv.getContext('2d'); c.scale(Q, Q);
      c.fillStyle = base; c.fillRect(0, 0, S, S);
      const r = rnd(seed);
      const wrap = fn => { for(const ox of [-S, 0, S]) for(const oy of [-S, 0, S]) fn(ox, oy); };
      const blob = (x, y, rad, col, a) => wrap((ox, oy) => { const g = c.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, rad); g.addColorStop(0, col.replace('A', a)); g.addColorStop(1, col.replace('A', 0)); c.fillStyle = g; c.beginPath(); c.arc(x + ox, y + oy, rad, 0, 7); c.fill(); });
      for(let i = 0; i < 18; i++) blob(r() * S, r() * S, 90 + r() * 120, dark, 0.22);
      for(let i = 0; i < 26; i++) blob(r() * S, r() * S, 60 + r() * 100, light, 0.34);
      // кустистые мазки: пучки из нескольких травинок
      for(let i = 0; i < 520; i++){
        const x = r() * S, y = r() * S, n = 3 + Math.floor(r() * 3), col = blades[Math.floor(r() * blades.length)];
        c.strokeStyle = col; c.lineWidth = 2 + r() * 0.8; c.globalAlpha = 0.55; c.lineCap = 'round';
        for(let k = 0; k < n; k++){ const dx = (k - n / 2) * 1.6, h = 4 + r() * 6; wrap((ox, oy) => { if(x + ox < -12 || x + ox > S + 12 || y + oy < -12 || y + oy > S + 12) return; c.beginPath(); c.moveTo(x + dx + ox, y + oy); c.quadraticCurveTo(x + dx + ox + (r() - 0.5) * 2, y + oy - h * 0.6, x + dx * 1.6 + ox + (r() - 0.5) * 3, y + oy - h); c.stroke(); }); }
      }
      c.globalAlpha = 1;
      // солнечные блики на траве
      for(let i = 0; i < 70; i++){ const x = r() * S, y = r() * S; c.fillStyle = 'rgba(232,248,120,0.3)'; c.beginPath(); c.ellipse(x, y, 3 + r() * 4, 1.5 + r() * 2, r() * 3, 0, 7); c.fill(); }
      if(flowers) for(let i = 0; i < 14; i++){ c.fillStyle = ['#ffffff', '#ffe066', '#ff9ec4', '#b8a6ff'][i % 4]; const x = 10 + r() * (S - 20), y = 10 + r() * (S - 20); for(let k = 0; k < 5; k++){ c.beginPath(); c.arc(x + Math.cos(k * 1.256) * 1.8, y + Math.sin(k * 1.256) * 1.8, 1.4, 0, 7); c.fill(); } c.fillStyle = '#ffcc33'; c.beginPath(); c.arc(x, y, 1, 0, 7); c.fill(); }
      const pat = ctx.createPattern(cv, 'repeat'); pat.setTransform(new DOMMatrix().scale(1 / Q)); return pat;
    };
    this.grassPattern = paintGrass('#8fd034', 'rgba(196,236,80,A)', 'rgba(70,128,18,A)', ['#7fbc28', '#74b024', '#a6da44', '#b8e652'], 7, true);
    // трава за пределами хутора — темнее и гуще
    this.outerPattern = paintGrass('#6fa424', 'rgba(150,196,50,A)', 'rgba(46,90,12,A)', ['#5a8e1a', '#4c7f14', '#7fb22e', '#689c20'], 5, false);
    // Земля грядок: рыхлая, тёплая.
    const QS = 4, so = document.createElement('canvas'); so.width = so.height = 64 * QS;
    const sc = so.getContext('2d'); sc.scale(QS, QS);
    sc.fillStyle = '#a5672f'; sc.fillRect(0, 0, 64, 64);
    const r2 = rnd(3);
    for(let i = 0; i < 90; i++){ sc.fillStyle = ['#8f5526', '#b8773d', '#9a5d2a', '#c58a4c'][i % 4]; sc.beginPath(); sc.arc(r2() * 64, r2() * 64, 1 + r2() * 1.8, 0, 7); sc.fill(); }
    this.soilPattern = ctx.createPattern(so, 'repeat'); this.soilPattern.setTransform(new DOMMatrix().scale(1 / QS));
  },

  /* ---------- изометрия ----------
     Земля хранится в «плоских» координатах (клетка = TILE px), на экран
     проецируется как ромб: X = x − y, Y = (x + y) / 2. */
  P(x, y){ return { x: x - y, y: (x + y) / 2 }; },
  up(p, h){ return { x: p.x, y: p.y - h }; },
  poly(ctx, pts, fill, stroke, lw = 1.5){
    ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)); ctx.closePath();
    if(fill){ ctx.fillStyle = fill; ctx.fill(); }
    if(stroke){ ctx.strokeStyle = stroke; ctx.lineWidth = lw; ctx.lineJoin = 'round'; ctx.stroke(); }
  },
  OL: 'rgba(60,32,12,.55)',
  vgrad(ctx, yBottom, yTop, c0, c1){ const g = ctx.createLinearGradient(0, yBottom, 0, yTop); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; },
  shade(hex, k){
    const n = parseInt(hex.slice(1), 16);
    const f = c => Math.max(0, Math.min(255, Math.round(c * k)));
    return '#' + [f(n >> 16), f(n >> 8 & 255), f(n & 255)].map(v => v.toString(16).padStart(2, '0')).join('');
  },

  /* ---------- земля (рисуется в плоскости) ---------- */
  groundFlat(ctx){
    const W = MAP_W * TILE, H = MAP_H * TILE;
    ctx.fillStyle = this.outerPattern; ctx.fillRect(-3000, -3000, W + 6000, H + 6000);
    ctx.fillStyle = this.grassPattern; ctx.fillRect(0, 0, W, H);
    // «стрижка газона» — широкие светлые полосы, как на ухоженном хуторе
    ctx.fillStyle = 'rgba(230,250,140,0.07)';
    for(let i = 0; i < MAP_W; i += 4) ctx.fillRect(i * TILE, 0, 2 * TILE, H);
    // мягкие светлые пятна
    const r = rnd(11); ctx.fillStyle = 'rgba(200,232,80,0.18)';
    for(let i = 0; i < 26; i++){ ctx.beginPath(); ctx.ellipse(r() * W, r() * H, 40 + r() * 70, 24 + r() * 36, r() * 3, 0, 7); ctx.fill(); }
    // грунтовая дорога: тёплая земля, колея, камешки, трава по краям
    const RX = -3000, RW = 3000 + 4 * TILE, RY = 6 * TILE, RH = 2 * TILE;
    ctx.fillStyle = '#a77a48'; ctx.beginPath(); ctx.roundRect(RX, RY + 1, RW + 4, RH - 2, 16); ctx.fill();
    const rg = ctx.createLinearGradient(0, RY, 0, RY + RH); rg.addColorStop(0, '#d7a86c'); rg.addColorStop(0.5, '#e6bd84'); rg.addColorStop(1, '#cf9d60');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.roundRect(RX, RY + 6, RW, RH - 12, 14); ctx.fill();
    ctx.fillStyle = 'rgba(150,100,55,0.35)'; ctx.fillRect(RX, RY + 22, RW - 10, 9); ctx.fillRect(RX, RY + RH - 31, RW - 10, 9);
    const r4 = rnd(9);
    for(let i = 0; i < 140; i++){ const x = -1400 + r4() * (1400 + 4 * TILE), y = RY + 8 + r4() * (RH - 16); ctx.fillStyle = ['#b98c58', '#f1d29c', '#9c7446'][i % 3]; ctx.beginPath(); ctx.ellipse(x, y, 1.5 + r4() * 3, 1 + r4() * 2, r4() * 3, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#7fbf3c'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    for(let x = -1400; x < 4 * TILE; x += 9){ const h = 3 + r4() * 6; [RY + 4, RY + RH - 4].forEach((yy, k) => { ctx.beginPath(); ctx.moveTo(x, yy); ctx.lineTo(x + (r4() - 0.5) * 3, yy + (k ? -h : h)); ctx.stroke(); }); }
  },
  // Обрыв по переднему краю хутора — хутор стоит «на холме».
  cliff(ctx){
    const W = MAP_W * TILE, H = MAP_H * TILE, d = 46;
    const A = this.P(0, H), B = this.P(W, H), C = this.P(W, 0);
    const down = (p, k) => ({ x: p.x, y: p.y + k });
    this.poly(ctx, [A, B, down(B, d), down(A, d)], this.vgrad(ctx, A.y, A.y + d, '#a86a35', '#7a4a22'));
    this.poly(ctx, [B, C, down(C, d), down(B, d)], this.vgrad(ctx, C.y, C.y + d, '#8f5a2c', '#64391a'));
    // слои породы
    ctx.strokeStyle = '#00000022'; ctx.lineWidth = 2;
    [16, 30].forEach(k => { ctx.beginPath(); ctx.moveTo(A.x, A.y + k); ctx.lineTo(B.x, B.y + k); ctx.lineTo(C.x, C.y + k); ctx.stroke(); });
    const r = rnd(4); ctx.fillStyle = '#c4874a';
    for(let i = 0; i < 60; i++){ const t = r(), side = r() < 0.5; const p = side ? { x: A.x + (B.x - A.x) * t, y: A.y + (B.y - A.y) * t } : { x: B.x + (C.x - B.x) * t, y: B.y + (C.y - B.y) * t }; ctx.beginPath(); ctx.ellipse(p.x, p.y + 10 + r() * 30, 4 + r() * 5, 2 + r() * 2, 0, 0, 7); ctx.fill(); }
    // травяной край
    ctx.strokeStyle = '#5fa834'; ctx.lineWidth = 7; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(A.x, A.y + 2); ctx.lineTo(B.x, B.y + 2); ctx.lineTo(C.x, C.y + 2); ctx.stroke();
    ctx.strokeStyle = '#9be05c'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.moveTo(A.x, A.y - 1); ctx.lineTo(B.x, B.y - 1); ctx.lineTo(C.x, C.y - 1); ctx.stroke();
  },
  plotFlat(ctx, x, y, size){
    // тень грядки на траве
    ctx.fillStyle = '#00000026'; ctx.beginPath(); ctx.roundRect(x + 7, y + 9, size - 8, size - 8, 14); ctx.fill();
  },
  // Грядка — приподнятая земляная клумба с бортиком.
  plotBed(ctx, x, y, size, ready, highlight){
    const pad = 5, h = 9, x0 = x + pad, y0 = y + pad, x1 = x + size - pad, y1 = y + size - pad;
    const B = this.P(x1, y0), C = this.P(x1, y1), D = this.P(x0, y1);
    this.poly(ctx, [D, C, this.up(C, h), this.up(D, h)], '#7a4520', this.OL);
    this.poly(ctx, [C, B, this.up(B, h), this.up(C, h)], '#5e3418', this.OL);
    ctx.save(); ctx.translate(0, -h); ctx.transform(1, 0.5, -1, 0.5, 0, 0);
    ctx.fillStyle = this.soilPattern; ctx.beginPath(); ctx.roundRect(x0, y0, x1 - x0, y1 - y0, 6); ctx.fill();
    // борозды
    for(let i = 0; i < 4; i++){
      const yy = y0 + 8 + i * (y1 - y0 - 16) / 3;
      ctx.strokeStyle = '#7d4a20'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(x0 + 8, yy + 2); ctx.lineTo(x1 - 8, yy + 2); ctx.stroke();
      ctx.strokeStyle = '#c48848'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x0 + 8, yy - 2); ctx.lineTo(x1 - 8, yy - 2); ctx.stroke();
    }
    ctx.strokeStyle = '#c79055'; ctx.lineWidth = 3; ctx.beginPath(); ctx.roundRect(x0 + 1.5, y0 + 1.5, x1 - x0 - 3, y1 - y0 - 3, 6); ctx.stroke();
    if(ready){ ctx.strokeStyle = '#ffd84a'; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(x0, y0, x1 - x0, y1 - y0, 6); ctx.stroke(); }
    if(highlight){ ctx.strokeStyle = highlight; ctx.lineWidth = 6; ctx.beginPath(); ctx.roundRect(x0, y0, x1 - x0, y1 - y0, 6); ctx.stroke(); }
    ctx.restore();
  },
  shadowFlat(ctx, x, y, w, h){
    ctx.fillStyle = '#00000018'; ctx.beginPath(); ctx.roundRect(x + 2, y + 6, w + 18, h + 14, 22); ctx.fill();
    ctx.fillStyle = '#00000022'; ctx.beginPath(); ctx.roundRect(x + 4, y + 8, w + 8, h + 6, 16); ctx.fill();
  },
  penFlat(ctx, x, y, w, h){
    // загон: утоптанная трава с проплешинами земли и соломой
    ctx.fillStyle = '#9cc63a'; ctx.beginPath(); ctx.roundRect(x + 2, y + 2, w - 4, h - 4, 12); ctx.fill();
    const r = rnd(w * 7 + h);
    for(let i = 0; i < 9; i++){ const cx = x + 20 + r() * (w - 40), cy = y + 20 + r() * (h - 40), rr = 18 + r() * 26; const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr); g.addColorStop(0, 'rgba(196,160,98,0.75)'); g.addColorStop(1, 'rgba(196,160,98,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, 7); ctx.fill(); }
    ctx.strokeStyle = '#e3c66a'; ctx.lineWidth = 1.6; ctx.lineCap = 'round';
    for(let i = 0; i < 70; i++){ const sx = x + 8 + r() * (w - 16), sy = y + 8 + r() * (h - 16), a = r() * 3; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * 7, sy + Math.sin(a) * 7); ctx.stroke(); }
    ctx.strokeStyle = '#86bf3f'; ctx.lineWidth = 1.8;
    for(let i = 0; i < 90; i++){ const sx = x + 6 + r() * (w - 12), sy = y + 6 + r() * (h - 12); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + (r() - 0.5) * 3, sy - 4 - r() * 4); ctx.stroke(); }
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
      [10, 21].forEach(hh => {
        ctx.strokeStyle = '#5c3416'; ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(a.x, a.y - hh); ctx.lineTo(b.x, b.y - hh); ctx.stroke();
        ctx.strokeStyle = '#b8783c'; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.moveTo(a.x, a.y - hh - 0.5); ctx.lineTo(b.x, b.y - hh - 0.5); ctx.stroke();
        ctx.strokeStyle = '#e0a868'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(a.x, a.y - hh - 1.8); ctx.lineTo(b.x, b.y - hh - 1.8); ctx.stroke();
      });
    }
    pts.forEach(o => {
      if(skip(o)) return;
      const x = o.p.x, y = o.p.y;
      ctx.fillStyle = '#00000022'; ctx.beginPath(); ctx.ellipse(x + 2, y + 1, 6, 2.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#5c3416'; ctx.fillRect(x - 4.5, y - 30, 9, 30);
      ctx.fillStyle = '#a86a32'; ctx.fillRect(x - 3, y - 29, 6, 28);
      ctx.fillStyle = '#d29455'; ctx.fillRect(x - 3, y - 29, 2.5, 28);
      ctx.fillStyle = '#5c3416'; ctx.beginPath(); ctx.moveTo(x - 4.5, y - 30); ctx.lineTo(x, y - 35); ctx.lineTo(x + 4.5, y - 30); ctx.fill();
    });
  },
  // Дом-коробка: x,y,W,H — основание в плоских координатах, h — высота стен.
  box(ctx, x, y, W, H, h, wall, roof, opts = {}){
    const P = (a, b) => this.P(a, b), up = (p, hh) => this.up(p, hh), OL = this.OL, sh = (c, k) => this.shade(c, k);
    const A = P(x, y), B = P(x + W, y), C = P(x + W, y + H), D = P(x, y + H);
    const rh = opts.roofH ?? h * 0.7, ov = 9;
    const fh = opts.flat ? 0 : Math.min(9, h * 0.15);
    // фундамент из камня
    if(fh){
      this.poly(ctx, [D, C, up(C, fh), up(D, fh)], '#b3aa9a', OL);
      this.poly(ctx, [C, B, up(B, fh), up(C, fh)], '#8f8778', OL);
      ctx.strokeStyle = '#00000022'; ctx.lineWidth = 1;
      for(let t = 0.15; t < 1; t += 0.2){ const p1 = { x: D.x + (C.x - D.x) * t, y: D.y + (C.y - D.y) * t }; ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.lineTo(p1.x, p1.y - fh); ctx.stroke(); const p2 = { x: C.x + (B.x - C.x) * t, y: C.y + (B.y - C.y) * t }; ctx.beginPath(); ctx.moveTo(p2.x, p2.y); ctx.lineTo(p2.x, p2.y - fh); ctx.stroke(); }
    }
    // стены с объёмом: снизу темнее, сверху светлее
    this.poly(ctx, [up(D, fh), up(C, fh), up(C, h), up(D, h)], this.vgrad(ctx, D.y - fh, D.y - h, sh(wall, 0.9), sh(wall, 1.08)), OL);
    this.poly(ctx, [up(C, fh), up(B, fh), up(B, h), up(C, h)], this.vgrad(ctx, C.y - fh, C.y - h, sh(wall, 0.7), sh(wall, 0.84)), OL);
    // доски
    if(!opts.noPlanks){
      ctx.strokeStyle = sh(wall, 0.8); ctx.globalAlpha = 0.45; ctx.lineWidth = 1.2;
      for(let v = fh + 10; v < h - 4; v += 10){
        ctx.beginPath(); ctx.moveTo(D.x, D.y - v); ctx.lineTo(C.x, C.y - v); ctx.lineTo(B.x, B.y - v); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // мягкая тень у земли (ambient occlusion) — дом «стоит», а не висит
    for(let k = 0; k < 6; k++){
      ctx.strokeStyle = `rgba(30,20,10,${0.22 * (1 - k / 6)})`; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(D.x, D.y - k * 2.5 - 1); ctx.lineTo(C.x, C.y - k * 2.5 - 1); ctx.lineTo(B.x, B.y - k * 2.5 - 1); ctx.stroke();
    }
    // светлый угол
    ctx.strokeStyle = sh(wall, 1.18); ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(C.x, C.y - fh); ctx.lineTo(C.x, C.y - h + 2); ctx.stroke();
    if(opts.flat){
      this.poly(ctx, [up(A, h), up(B, h), up(C, h), up(D, h)], roof, OL);
      return { A, B, C, D, top: up(A, h) };
    }
    // тень под свесом крыши
    this.poly(ctx, [up(D, h - 8), up(C, h - 8), up(C, h), up(D, h)], '#00000030');
    this.poly(ctx, [up(C, h - 8), up(B, h - 8), up(B, h), up(C, h)], '#00000038');
    // двускатная крыша, конёк вдоль x
    const R1 = up(P(x - ov, y + H / 2), h + rh), R2 = up(P(x + W + ov, y + H / 2), h + rh);
    const a = up(P(x - ov, y - ov), h - 3), b = up(P(x + W + ov, y - ov), h - 3), c = up(P(x + W + ov, y + H + ov), h - 3), d = up(P(x - ov, y + H + ov), h - 3);
    this.poly(ctx, [a, b, R2, R1], sh(roof, 0.7), OL);
    const gab = [up(C, h), up(B, h), up(P(x + W, y + H / 2), h + rh)];
    this.poly(ctx, gab, this.vgrad(ctx, C.y - h, C.y - h - rh, sh(wall, 0.84), sh(wall, 0.95)), OL);
    // круглое окошко во фронтоне
    const gw = up(P(x + W, y + H / 2), h + rh * 0.38);
    ctx.fillStyle = '#fffaf0'; ctx.beginPath(); ctx.ellipse(gw.x, gw.y, 7, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#6fb6d8'; ctx.beginPath(); ctx.ellipse(gw.x, gw.y, 5, 6, 0, 0, 7); ctx.fill();
    // передний скат с градиентом
    this.poly(ctx, [d, c, R2, R1], this.vgrad(ctx, d.y, R1.y, sh(roof, 0.92), sh(roof, 1.15)), OL);
    // черепица: ряды и шахматные швы
    ctx.strokeStyle = sh(roof, 0.72); ctx.lineWidth = 1.6;
    const rows = 5;
    for(let i = 1; i < rows; i++){
      const t = i / rows;
      const l = { x: d.x + (R1.x - d.x) * t, y: d.y + (R1.y - d.y) * t }, r2 = { x: c.x + (R2.x - c.x) * t, y: c.y + (R2.y - c.y) * t };
      ctx.beginPath(); ctx.moveTo(l.x, l.y); ctx.lineTo(r2.x, r2.y); ctx.stroke();
      const n = Math.max(4, Math.round(W / 14));
      for(let k = (i % 2) * 0.5; k < n; k++){
        const u = (k + 0.5) / n;
        const p = { x: l.x + (r2.x - l.x) * u, y: l.y + (r2.y - l.y) * u };
        const q = { x: p.x + (R1.x - d.x) / rows, y: p.y + (R1.y - d.y) / rows };
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
      }
    }
    // блик на скате
    ctx.strokeStyle = '#ffffff40'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(R1.x + (d.x - R1.x) * 0.12, R1.y + (d.y - R1.y) * 0.12); ctx.lineTo(R2.x + (c.x - R2.x) * 0.12, R2.y + (c.y - R2.y) * 0.12); ctx.stroke();
    // торцевая доска и конёк
    this.poly(ctx, [d, c, { x: c.x, y: c.y + 6 }, { x: d.x, y: d.y + 6 }], sh(roof, 0.55), OL);
    ctx.strokeStyle = sh(roof, 0.55); ctx.lineWidth = 5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(c.x, c.y + 3); ctx.lineTo(R2.x, R2.y); ctx.lineTo(b.x, b.y); ctx.stroke();
    ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(R1.x, R1.y); ctx.lineTo(R2.x, R2.y); ctx.stroke();
    ctx.strokeStyle = sh(roof, 1.25); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(R1.x, R1.y - 2); ctx.lineTo(R2.x, R2.y - 2); ctx.stroke();
    return { A, B, C, D, R1, R2 };
  },
  // Прямоугольник на стене +y (передняя левая): u — смещение вдоль стены (px), v — высота.
  faceY(ctx, x, y, W, H, u0, u1, v0, v1, fill, stroke){
    const p = (u, v) => this.up(this.P(x + u, y + H), v);
    this.poly(ctx, [p(u0, v0), p(u1, v0), p(u1, v1), p(u0, v1)], fill, stroke);
  },
  faceX(ctx, x, y, W, H, u0, u1, v0, v1, fill, stroke){
    const p = (u, v) => this.up(this.P(x + W, y + H - u), v);
    this.poly(ctx, [p(u0, v0), p(u1, v0), p(u1, v1), p(u0, v1)], fill, stroke);
  },
  // Окно с рамой, переплётом, ставнями и ящиком с цветами.
  window(ctx, side, x, y, W, H, u0, u1, v0, v1, shutter, flowers){
    const f = (a, b, c2, d2, col, st) => (side === 'y' ? this.faceY : this.faceX).call(this, ctx, x, y, W, H, a, b, c2, d2, col, st);
    const dark = side === 'x';
    if(shutter){ f(u0 - 10, u0 - 2, v0 - 1, v1 + 1, this.shade(shutter, dark ? 0.8 : 1), this.OL); f(u1 + 2, u1 + 10, v0 - 1, v1 + 1, this.shade(shutter, dark ? 0.8 : 1), this.OL); }
    f(u0 - 3, u1 + 3, v0 - 3, v1 + 3, dark ? '#e8e0cc' : '#fffaf0', this.OL);
    f(u0, u1, v0, v1, dark ? '#5aa3c8' : '#74c0e4');
    f(u0, u1, (v0 + v1) / 2, v1, dark ? '#86c3e0' : '#a8dcf2');
    f((u0 + u1) / 2 - 1.2, (u0 + u1) / 2 + 1.2, v0, v1, '#fffaf0');
    f(u0, u1, (v0 + v1) / 2 - 1.2, (v0 + v1) / 2 + 1.2, '#fffaf0');
    if(flowers){
      f(u0 - 4, u1 + 4, v0 - 9, v0 - 3, '#8b5a2b', this.OL);
      const pt = (u, v) => side === 'y' ? this.up(this.P(x + u, y + H), v) : this.up(this.P(x + W, y + H - u), v);
      const cols = ['#ff5d8f', '#ffd23f', '#ffffff', '#ff8a3d'];
      for(let u = u0; u <= u1; u += 5){ const p = pt(u, v0 - 1); ctx.fillStyle = '#3f9a32'; ctx.beginPath(); ctx.arc(p.x, p.y, 3, 0, 7); ctx.fill(); ctx.fillStyle = cols[Math.round(u) % 4]; ctx.beginPath(); ctx.arc(p.x, p.y - 2, 2.2, 0, 7); ctx.fill(); }
    }
  },
  door(ctx, x, y, W, H, uc, w, hh, col){
    const f = (a, b, c2, d2, cl, st) => this.faceY(ctx, x, y, W, H, a, b, c2, d2, cl, st);
    f(uc - w / 2 - 4, uc + w / 2 + 4, 0, hh + 4, '#fffaf0', this.OL);
    f(uc - w / 2, uc + w / 2, 0, hh, col, this.OL);
    for(let k = 1; k < 4; k++){ const u = uc - w / 2 + w * k / 4; f(u - 0.6, u + 0.6, 2, hh - 2, this.shade(col, 0.75)); }
    f(uc - w / 2, uc + w / 2, hh - 6, hh, this.shade(col, 0.8));
    const kn = this.up(this.P(x + uc + w / 2 - 5, y + H), hh / 2); ctx.fillStyle = '#f4c542'; ctx.beginPath(); ctx.arc(kn.x, kn.y, 2.4, 0, 7); ctx.fill();
  },
  // Полосатый навес над дверью.
  awning(ctx, x, y, W, H, u0, u1, v, col){
    const n = 6, out = 18, drop = 14;
    for(let i = 0; i < n; i++){
      const ua = u0 + (u1 - u0) * i / n, ub = u0 + (u1 - u0) * (i + 1) / n;
      const p1 = this.up(this.P(x + ua, y + H), v), p2 = this.up(this.P(x + ub, y + H), v);
      const p3 = this.up(this.P(x + ub, y + H + out), v - drop), p4 = this.up(this.P(x + ua, y + H + out), v - drop);
      this.poly(ctx, [p1, p2, p3, p4], i % 2 ? '#fffaf0' : col, this.OL, 1);
      // фестон
      const m = { x: (p3.x + p4.x) / 2, y: (p3.y + p4.y) / 2 };
      ctx.fillStyle = i % 2 ? '#fffaf0' : col; ctx.beginPath(); ctx.arc(m.x, m.y, Math.hypot(p3.x - p4.x, p3.y - p4.y) / 2, 0, Math.PI); ctx.fill();
    }
  },
  sign(ctx, px, py, icon, r = 17){
    ctx.fillStyle = '#00000030'; ctx.beginPath(); ctx.arc(px + 2, py + 3, r + 2, 0, 7); ctx.fill();
    ctx.fillStyle = '#f4c542'; ctx.beginPath(); ctx.arc(px, py, r + 3, 0, 7); ctx.fill();
    ctx.strokeStyle = '#a8741a'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = '#fffdf6'; ctx.beginPath(); ctx.arc(px, py, r, 0, 7); ctx.fill();
    ctx.font = `${Math.round(r * 1.2)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(icon, px, py + 1);
  },
  factory(ctx, x, y, W, H, B, working, time){
    const h = 66, i = 5;   // небольшой отступ — видна тень и трава вокруг
    x += i; y += i; W -= i * 2; H -= i * 2;
    this.box(ctx, x, y, W, H, h, B.wall, B.roof, { roofH: 48 });
    this.door(ctx, x, y, W, H, W / 2, 28, 40, this.shade(B.roof, 0.85));
    this.awning(ctx, x, y, W, H, W / 2 - 26, W / 2 + 26, 54, B.roof);
    this.window(ctx, 'y', x, y, W, H, 14, 34, 24, 42, null, true);
    this.window(ctx, 'y', x, y, W, H, W - 34, W - 14, 24, 42, null, true);
    this.window(ctx, 'x', x, y, W, H, 26, 50, 24, 44, B.roof);
    this.window(ctx, 'x', x, y, W, H, H - 50, H - 26, 24, 44, B.roof);
    // кирпичная труба
    const ch = this.up(this.P(x + W * 0.72, y + H * 0.3), h + 30);
    ctx.fillStyle = '#9c4a32'; ctx.fillRect(ch.x - 8, ch.y - 30, 16, 36); ctx.fillStyle = '#7d3524'; ctx.fillRect(ch.x + 2, ch.y - 30, 6, 36);
    ctx.strokeStyle = '#00000030'; ctx.lineWidth = 1; for(let k = 0; k < 5; k++){ ctx.beginPath(); ctx.moveTo(ch.x - 8, ch.y - 24 + k * 7); ctx.lineTo(ch.x + 8, ch.y - 24 + k * 7); ctx.stroke(); }
    ctx.fillStyle = '#5a3a2a'; ctx.fillRect(ch.x - 10, ch.y - 35, 20, 6); ctx.strokeStyle = this.OL; ctx.lineWidth = 1.5; ctx.strokeRect(ch.x - 10, ch.y - 35, 20, 6); ctx.strokeRect(ch.x - 8, ch.y - 29, 16, 35);
    if(working){
      for(let k = 0; k < 5; k++){ const p = (time * 0.45 + k / 5) % 1; ctx.globalAlpha = (1 - p) * 0.85; ctx.fillStyle = p < 0.3 ? '#ffffff' : '#eef2f5'; ctx.beginPath(); ctx.arc(ch.x + Math.sin(p * 6 + k) * 7 + p * 10, ch.y - 40 - p * 60, 5 + p * 11, 0, 7); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    const s = this.up(this.P(x + W / 2, y + H), h + 20);
    this.sign(ctx, s.x, s.y, B.e, 18);
  },
  barn(ctx, x, y, W, H){
    const h = 80, i = 4;
    x += i; y += i; W -= i * 2; H -= i * 2;
    const red = '#d4432c';
    this.box(ctx, x, y, W, H, h, red, '#6d6a72', { roofH: 58 });
    const f = (a, b, c2, d2, cl, st) => this.faceY(ctx, x, y, W, H, a, b, c2, d2, cl, st);
    // белая окантовка углов
    f(0, 5, 8, h, '#fffaf0'); f(W - 5, W, 8, h, '#fffaf0');
    this.faceX(ctx, x, y, W, H, H - 5, H, 8, h, '#e8e0cc');
    // ворота с белым крестом
    f(W / 2 - 30, W / 2 + 30, 0, 58, '#fffaf0', this.OL);
    f(W / 2 - 26, W / 2 + 26, 0, 54, '#a3301f', this.OL);
    const p = (u, v) => this.up(this.P(x + u, y + H), v);
    ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = 4;
    const a = p(W / 2 - 26, 2), b = p(W / 2 + 26, 54), c = p(W / 2 + 26, 2), d = p(W / 2 - 26, 54), m1 = p(W / 2, 0), m2 = p(W / 2, 54);
    ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.moveTo(c.x, c.y); ctx.lineTo(d.x, d.y); ctx.moveTo(m1.x, m1.y); ctx.lineTo(m2.x, m2.y); ctx.stroke();
    // сеновал наверху
    this.faceX(ctx, x, y, W, H, H / 2 - 16, H / 2 + 16, 46, 72, '#fffaf0', this.OL);
    this.faceX(ctx, x, y, W, H, H / 2 - 12, H / 2 + 12, 48, 68, '#7a2a1d');
    this.faceX(ctx, x, y, W, H, H / 2 - 12, H / 2 + 12, 48, 56, '#e8c35a');
    this.window(ctx, 'x', x, y, W, H, 16, 36, 20, 38, null);
    const s = this.up(this.P(x + W / 2, y + H), h + 22);
    this.sign(ctx, s.x, s.y, '📦', 18);
  },
  // вода и причал за задним забором (плоско, в координатах земли)
  waterFlat(ctx, time){
    const T = TILE;
    ctx.fillStyle = '#d9c38c'; ctx.beginPath(); ctx.roundRect(-7 * T, -7 * T, 6.9 * T, 12.6 * T, 40); ctx.fill();
    ctx.fillStyle = '#3d94c9'; ctx.beginPath(); ctx.roundRect(-7.5 * T, -7.5 * T, 6.9 * T, 12.6 * T, 40); ctx.fill();
    ctx.fillStyle = '#5bb0e0'; ctx.beginPath(); ctx.roundRect(-7.2 * T, -7.2 * T, 6.2 * T, 12 * T, 34); ctx.fill();
    ctx.strokeStyle = '#ffffff70'; ctx.lineWidth = 3;
    for(let i = 0; i < 7; i++){ const wx = -6.4 * T + (i % 3) * 1.9 * T, wy = -5.8 * T + i * 1.5 * T + Math.sin(time + i) * 6; ctx.beginPath(); ctx.moveTo(wx, wy); ctx.quadraticCurveTo(wx + 14, wy - 8, wx + 28, wy); ctx.stroke(); }
    // причал
    ctx.fillStyle = '#7a4a22'; ctx.fillRect(-2.5 * T, 1.55 * T, 2.6 * T, 1.3 * T);
    ctx.fillStyle = '#b07a45';
    for(let i = 0; i < 9; i++) ctx.fillRect(-2.45 * T + i * 0.29 * T, 1.6 * T, 0.25 * T, 1.2 * T);
  },
  boat(ctx, x, y, time, crates){
    const bob = Math.sin(time * 1.6) * 2.5;
    ctx.save(); ctx.translate(x, y + bob);
    ctx.fillStyle = '#00000022'; ctx.beginPath(); ctx.ellipse(0, 10, 80, 16, 0, 0, 7); ctx.fill();
    // корпус
    ctx.fillStyle = '#8c3b2a'; ctx.beginPath(); ctx.moveTo(-78, -14); ctx.lineTo(78, -14); ctx.lineTo(58, 12); ctx.lineTo(-62, 12); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f2ead8'; ctx.fillRect(-74, -18, 148, 6);
    ctx.fillStyle = '#5d2a1e'; ctx.fillRect(-60, 2, 116, 4);
    // мачта и парус
    ctx.fillStyle = '#6b4220'; ctx.fillRect(-3, -110, 6, 96);
    ctx.fillStyle = '#fffdf6'; ctx.beginPath(); ctx.moveTo(4, -104); ctx.quadraticCurveTo(52 + Math.sin(time) * 4, -64, 4, -26); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f1efe6'; ctx.beginPath(); ctx.moveTo(-4, -96); ctx.quadraticCurveTo(-40, -62, -4, -30); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e5533d'; ctx.beginPath(); ctx.moveTo(3, -110); ctx.lineTo(24, -104); ctx.lineTo(3, -98); ctx.fill();
    // ящики
    (crates || []).forEach((c, i) => {
      const cx = -58 + i * 42;
      ctx.fillStyle = c.done ? '#c98f4f' : '#e6c89a'; ctx.fillRect(cx, -40, 30, 24);
      ctx.strokeStyle = '#7a4a22'; ctx.lineWidth = 2; ctx.strokeRect(cx, -40, 30, 24);
      if(c.done){ ctx.beginPath(); ctx.moveTo(cx, -40); ctx.lineTo(cx + 30, -16); ctx.moveTo(cx + 30, -40); ctx.lineTo(cx, -16); ctx.stroke(); }
    });
    ctx.restore();
  },
  chest(ctx, x, y, time){
    const q = this.P(x, y), j = Math.max(0, Math.sin(time * 2.2)) ** 8 * 6;
    ctx.save(); ctx.translate(q.x, q.y - j); ctx.scale(1.5, 1.5);
    ctx.fillStyle = '#00000030'; ctx.beginPath(); ctx.ellipse(0, j + 2, 22, 8, 0, 0, 7); ctx.fill();
    ctx.fillStyle = '#8a5a2b'; ctx.fillRect(-18, -22, 36, 22);
    ctx.fillStyle = '#a86d34'; ctx.beginPath(); ctx.moveTo(-19, -22); ctx.quadraticCurveTo(0, -40, 19, -22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f4c542'; ctx.fillRect(-19, -24, 38, 4); ctx.fillRect(-12, -24, 4, 24); ctx.fillRect(8, -24, 4, 24); ctx.fillRect(-4, -18, 8, 9);
    ctx.fillStyle = `rgba(255,248,200,${0.5 + 0.5 * Math.sin(time * 4)})`; this.star(ctx, 16, -36, 6); this.star(ctx, -20, -30, 4);
    ctx.restore();
  },
  shelter(ctx, x, y, W, H, B){
    this.box(ctx, x, y, W, H, 42, B.wall, B.roof, { roofH: 32 });
    this.faceY(ctx, x, y, W, H, W / 2 - 16, W / 2 + 16, 0, 31, '#fffaf0', this.OL);
    this.faceY(ctx, x, y, W, H, W / 2 - 13, W / 2 + 13, 0, 28, '#4a2c16');
    this.faceY(ctx, x, y, W, H, W / 2 - 13, W / 2 + 13, 0, 6, '#e8c35a');
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
    ctx.fillStyle = '#00000028'; ctx.beginPath(); ctx.ellipse(px + 6, py + 2, 38, 16, 0, 0, 7); ctx.fill();
    // ствол
    ctx.fillStyle = '#5c3416'; ctx.beginPath(); ctx.moveTo(px - 8, py); ctx.lineTo(px - 5, py - 46); ctx.lineTo(px + 5, py - 46); ctx.lineTo(px + 8, py); ctx.fill();
    ctx.fillStyle = '#8a5428'; ctx.beginPath(); ctx.moveTo(px - 6, py - 1); ctx.lineTo(px - 3.5, py - 46); ctx.lineTo(px + 1.5, py - 46); ctx.lineTo(px + 1, py - 1); ctx.fill();
    if(kind === 'tree' || kind === 'oak'){
      const blob = (pts, col) => { ctx.fillStyle = col; pts.forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(px + dx + sway, py + dy, r, 0, 7); ctx.fill(); }); };
      const base = [[-22, -60, 22], [20, -60, 22], [0, -78, 26], [-12, -46, 18], [14, -46, 18], [0, -56, 24]];
      blob(base.map(([a, b, r]) => [a, b, r + 2.5]), '#1f5e25');
      blob(base, '#2f8a34');
      blob([[-10, -70, 17], [10, -72, 15], [-18, -56, 13], [4, -84, 14]], '#47aa3e');
      blob([[-14, -76, 8], [-2, -88, 6], [-24, -62, 6]], '#7fd060');
      if(kind === 'tree') [[-16, -52], [14, -64], [6, -46], [-4, -80], [22, -52], [-24, -66]].forEach(([dx, dy]) => {
        ctx.fillStyle = '#d92f2f'; ctx.beginPath(); ctx.arc(px + dx + sway, py + dy, 5, 0, 7); ctx.fill();
        ctx.fillStyle = '#ff9a8a'; ctx.beginPath(); ctx.arc(px + dx + sway - 1.6, py + dy - 1.6, 1.6, 0, 7); ctx.fill();
      });
    } else {
      for(let i = 0; i < 4; i++){
        const yy = py - 128 + i * 26, wd = 20 + i * 9, top = px + sway * (1 - i / 4);
        ctx.fillStyle = '#163f22'; ctx.beginPath(); ctx.moveTo(top, yy - 3); ctx.lineTo(px + wd + 3, yy + 40); ctx.lineTo(px - wd - 3, yy + 40); ctx.fill();
        const g = ctx.createLinearGradient(px - wd, 0, px + wd, 0); g.addColorStop(0, '#3f9a4c'); g.addColorStop(0.5, '#2f7d3c'); g.addColorStop(1, '#1f5c2c');
        ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(top, yy); ctx.lineTo(px + wd, yy + 38); ctx.quadraticCurveTo(px, yy + 44, px - wd, yy + 38); ctx.fill();
      }
      ctx.fillStyle = '#6cc070'; ctx.beginPath(); ctx.moveTo(px + sway, py - 128); ctx.lineTo(px - 6, py - 104); ctx.lineTo(px - 16, py - 92); ctx.fill();
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
      case 'potato': {
        ctx.fillStyle = '#3f9a32'; ctx.beginPath(); ctx.arc(x, y - 7 * k, 9 * k, 0, 7); ctx.fill();
        ctx.fillStyle = '#5cbf45'; ctx.beginPath(); ctx.arc(x - 3, y - 9 * k, 6 * k, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(x + 4, y - 6 * k, 5 * k, 0, 7); ctx.fill();
        if(stage >= 2){ ctx.fillStyle = '#e8dcff'; [[-4, -15], [4, -13]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(x + dx, y + dy * k, 2, 0, 7); ctx.fill(); }); }
        if(stage === 3){ ctx.fillStyle = '#c99a5b'; [[-6, 2], [5, 3]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.ellipse(x + dx, y + dy, 4.5, 3.2, 0.3, 0, 7); ctx.fill(); }); ctx.fillStyle = '#e2b97c'; ctx.beginPath(); ctx.arc(x - 7, y + 1, 1.3, 0, 7); ctx.fill(); }
        break;
      }
      case 'pepper': {
        ctx.strokeStyle = '#3f8a2a'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - 20 * k); ctx.stroke();
        ctx.fillStyle = '#4caf3a'; [[-6, -14, 7], [6, -18, 7], [0, -24, 6]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.arc(x + dx, y + dy * k, r * k, 0, 7); ctx.fill(); });
        if(stage === 3){ ['#e53935', '#fbc02d', '#43a047'].forEach((col, i) => { ctx.fillStyle = col; ctx.beginPath(); ctx.ellipse(x - 6 + i * 6, y - 8 - (i % 2) * 6, 3.2, 5, 0.1, 0, 7); ctx.fill(); }); }
        break;
      }
      case 'cotton': {
        ctx.strokeStyle = '#6b8e3a'; ctx.lineWidth = 2; for(let sx = -1; sx <= 1; sx++){ ctx.beginPath(); ctx.moveTo(x + sx * 3, y); ctx.lineTo(x + sx * 6, y - 22 * k); ctx.stroke(); }
        ctx.fillStyle = '#5c9a36'; [[-6, -14], [6, -16]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.ellipse(x + dx, y + dy * k, 5 * k, 3 * k, dx > 0 ? 0.5 : -0.5, 0, 7); ctx.fill(); });
        if(stage === 3){ [[-6, -22], [6, -24], [0, -28]].forEach(([dx, dy]) => { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(x + dx, y + dy, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#e8e8f0'; ctx.beginPath(); ctx.arc(x + dx + 2, y + dy + 2, 2.5, 0, 7); ctx.fill(); }); }
        break;
      }
      case 'pumpkin': {
        ctx.strokeStyle = '#4e9a2e'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 10, y); ctx.quadraticCurveTo(x, y - 8, x + 10, y - 2); ctx.stroke();
        ctx.fillStyle = '#5fb03a'; ctx.beginPath(); ctx.arc(x - 6, y - 4, 5 * k, 0, 7); ctx.fill();
        if(stage === 3){ ctx.fillStyle = '#f08b1c'; ctx.beginPath(); ctx.ellipse(x + 3, y - 4, 8, 6, 0, 0, 7); ctx.fill(); ctx.strokeStyle = '#c96a10'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(x + 3, y - 10); ctx.lineTo(x + 3, y + 2); ctx.stroke(); }
        break;
      }
      case 'rice': {
        ctx.strokeStyle = stage === 3 ? '#c9b458' : '#7cb342'; ctx.lineWidth = 1.8;
        for(let s2 = -2; s2 <= 2; s2++){ ctx.beginPath(); ctx.moveTo(x + s2 * 2, y); ctx.quadraticCurveTo(x + s2 * 3, y - 14 * k, x + s2 * 5 + 3, y - 20 * k); ctx.stroke(); }
        if(stage === 3){ ctx.fillStyle = '#f3e3a0'; for(let s2 = -2; s2 <= 2; s2++){ ctx.beginPath(); ctx.ellipse(x + s2 * 5 + 3, y - 20, 1.8, 3, 0.4, 0, 7); ctx.fill(); } }
        break;
      }
      case 'onion': case 'lettuce': {
        if(kind === 'lettuce'){ ctx.fillStyle = '#5cbf45'; ctx.beginPath(); ctx.arc(x, y - 6 * k, 9 * k, 0, 7); ctx.fill(); ctx.fillStyle = '#9be36a'; ctx.beginPath(); ctx.arc(x - 2, y - 8 * k, 5 * k, 0, 7); ctx.fill(); if(stage === 3){ ctx.strokeStyle = '#3f9a32'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(x, y - 6, 6, 0, 7); ctx.stroke(); } }
        else { ctx.strokeStyle = '#4caf3a'; ctx.lineWidth = 2.2; for(let s2 = -1; s2 <= 1; s2++){ ctx.beginPath(); ctx.moveTo(x + s2 * 2, y - 2); ctx.lineTo(x + s2 * 4, y - 20 * k); ctx.stroke(); } if(stage === 3){ ctx.fillStyle = '#c77dbe'; ctx.beginPath(); ctx.ellipse(x, y, 6, 5, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#e3b5dd'; ctx.beginPath(); ctx.arc(x - 2, y - 1, 1.6, 0, 7); ctx.fill(); } }
        break;
      }
      default: {
        // кустик с плодами: розы, яблоки, лимоны, кофе
        const fruit = { rose: '#e53950', apple: '#d32f2f', lemon: '#fdd835', coffee: '#8d3b1f' }[kind] || '#e5533d';
        const tall = kind === 'apple' || kind === 'lemon' ? 1.3 : 1;
        if(tall > 1){ ctx.fillStyle = '#7a4a24'; ctx.fillRect(x - 1.5, y - 14 * k, 3, 14 * k); }
        ctx.fillStyle = '#2f8a34'; ctx.beginPath(); ctx.arc(x, y - 12 * k * tall, 10 * k, 0, 7); ctx.fill();
        ctx.fillStyle = '#4caf3a'; ctx.beginPath(); ctx.arc(x - 3, y - 14 * k * tall, 6 * k, 0, 7); ctx.fill();
        if(stage === 3){ ctx.fillStyle = fruit; [[-5, -12], [4, -16], [2, -8], [-2, -18]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(x + dx, y + dy * tall, kind === 'coffee' ? 2.2 : 3, 0, 7); ctx.fill(); }); }
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
      ctx.strokeStyle = '#8a7a6a'; ctx.lineWidth = 1.2;
      ctx.fillStyle = '#fffdf6'; ctx.beginPath(); ctx.ellipse(0, bob, 11, 9, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.arc(8, -7 + bob, 6, 0, 7); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(0, bob, 10.4, 8.4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#e5533d'; ctx.beginPath(); ctx.arc(9, -13 + bob, 3, 0, 7); ctx.fill();
      ctx.fillStyle = '#f2a33a'; ctx.beginPath(); ctx.moveTo(13, -7 + bob); ctx.lineTo(18, -5 + bob); ctx.lineTo(13, -3 + bob); ctx.fill();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(10, -8 + bob, 1.2, 0, 7); ctx.fill();
      ctx.fillStyle = '#eee7d6'; ctx.beginPath(); ctx.ellipse(-4, bob, 6, 4, 0.4, 0, 7); ctx.fill();
    } else if(kind === 'cow'){
      ctx.strokeStyle = '#6a6a6a'; ctx.lineWidth = 1.2;
      ctx.fillStyle = '#fbfbf7'; ctx.beginPath(); ctx.roundRect(-16, -10 + bob, 30, 18, 8); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2b2b2b'; ctx.beginPath(); ctx.arc(-6, -4 + bob, 4, 0, 7); ctx.fill(); ctx.beginPath(); ctx.arc(6, 2 + bob, 3, 0, 7); ctx.fill();
      ctx.fillStyle = '#fbfbf7'; ctx.beginPath(); ctx.roundRect(10, -16 + bob, 14, 14, 5); ctx.fill();
      ctx.fillStyle = '#f2b6b0'; ctx.beginPath(); ctx.roundRect(15, -8 + bob, 10, 7, 3); ctx.fill();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(17, -12 + bob, 1.3, 0, 7); ctx.fill();
      ctx.fillStyle = '#d9c7a0'; ctx.fillRect(11, -19 + bob, 3, 4); ctx.fillRect(20, -19 + bob, 3, 4);
      ctx.fillStyle = '#555'; [-12, -4, 4, 10].forEach(lx => ctx.fillRect(lx, 7 + bob, 3, 6));
    } else {
      ctx.fillStyle = '#b8b0a2';
      [[-8, 0], [0, -4], [8, 0], [-2, 4], [6, 5], [-9, 6]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(dx, dy + bob, 8, 0, 7); ctx.fill(); });
      ctx.fillStyle = '#f7f4ee';
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
    ctx.fillStyle = '#00000030'; ctx.beginPath(); ctx.arc(x + 1.5, by + 3, r, 0, 7); ctx.fill();
    ctx.fillStyle = opts.bg || '#fffdf6'; ctx.strokeStyle = opts.stroke || '#c9a46a'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(x, by, r, 0, 7); ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x - 5, by + r - 2); ctx.lineTo(x, by + r + 7); ctx.lineTo(x + 5, by + r - 2); ctx.fill();
    ctx.font = `${Math.round(r * 1.15)}px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillStyle = '#000'; ctx.fillText(emoji, x, by + 1);
    if(opts.badge){ ctx.fillStyle = '#e5533d'; ctx.beginPath(); ctx.arc(x + r - 2, by - r + 2, 8, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px Rubik,sans-serif'; ctx.fillText(opts.badge, x + r - 2, by - r + 3); }
  },

};
