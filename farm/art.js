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

  /* ---------- земля ---------- */
  ground(ctx){
    const W = MAP_W * TILE, H = MAP_H * TILE;
    ctx.fillStyle = '#5f9e3c'; ctx.fillRect(-2000, -2000, W + 4000, H + 4000);   // за забором
    ctx.fillStyle = this.grassPattern; ctx.fillRect(0, 0, W, H);
    // дорога к доске заказов
    ctx.fillStyle = '#d9b67a';
    ctx.beginPath(); ctx.roundRect(-2000, 6.2 * TILE, 2000 + 4 * TILE, 1.6 * TILE, 10); ctx.fill();
    ctx.fillStyle = '#c9a265';
    for(let x = -1980; x < 4 * TILE; x += 60) ctx.fillRect(x, 6.95 * TILE, 26, 3);
    // забор
    this.fence(ctx, 0, 0, W, H, true);
  },
  fence(ctx, x, y, w, h, gate){
    ctx.save();
    ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 5; ctx.lineCap = 'round';
    const rail = (x1, y1, x2, y2) => { ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke(); };
    rail(x, y + 8, x + w, y + 8); rail(x, y + h - 4, x + w, y + h - 4);
    if(gate){ rail(x, y + 8, x, 6 * TILE); rail(x, 8 * TILE, x, y + h); }
    else { rail(x, y + 8, x, y + h); }
    rail(x + w, y + 8, x + w, y + h);
    ctx.fillStyle = '#a06a35';
    const post = (px, py) => { ctx.fillRect(px - 4, py - 10, 8, 18); };
    for(let px = x; px <= x + w; px += TILE) { post(px, y + 8); post(px, y + h - 4); }
    for(let py = y + TILE; py < y + h; py += TILE){ if(!gate || py < 6 * TILE || py > 8 * TILE) post(x, py); post(x + w, py); }
    ctx.restore();
  },

  /* ---------- грядка и урожай ---------- */
  plot(ctx, x, y, size, crop, pct, ready, seed, highlight){
    const pad = 4;
    ctx.fillStyle = '#6e4723';
    ctx.beginPath(); ctx.roundRect(x + pad, y + pad + 4, size - pad * 2, size - pad * 2, 12); ctx.fill();
    ctx.fillStyle = this.soilPattern;
    ctx.beginPath(); ctx.roundRect(x + pad, y + pad, size - pad * 2, size - pad * 2, 12); ctx.fill();
    ctx.strokeStyle = '#7d5128'; ctx.lineWidth = 3;
    for(let i = 1; i < 4; i++){ const yy = y + pad + (size - pad * 2) * i / 4; ctx.beginPath(); ctx.moveTo(x + pad + 8, yy); ctx.lineTo(x + size - pad - 8, yy); ctx.stroke(); }
    if(highlight){ ctx.strokeStyle = highlight; ctx.lineWidth = 4; ctx.beginPath(); ctx.roundRect(x + pad, y + pad, size - pad * 2, size - pad * 2, 12); ctx.stroke(); }
    if(!crop) return;
    const stage = ready ? 3 : pct < 0.33 ? 0 : pct < 0.66 ? 1 : 2;
    const r = rnd(seed * 31 + 7);
    const cols = 4, rows = 3;
    for(let j = 0; j < rows; j++) for(let i = 0; i < cols; i++){
      const cx = x + pad + 12 + i * (size - pad * 2 - 24) / (cols - 1) + (r() - 0.5) * 6;
      const cy = y + pad + 22 + j * (size - pad * 2 - 34) / (rows - 1) + (r() - 0.5) * 4;
      this.crop(ctx, crop, stage, cx, cy, r);
    }
    if(ready){ // блеск
      const t = performance.now() / 400 + seed;
      ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.5 * Math.sin(t)})`;
      this.star(ctx, x + size - 16, y + 14, 5);
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

  /* ---------- постройки ---------- */
  shadow(ctx, x, y, w, h){ ctx.fillStyle = '#00000022'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h - 4, w / 2, 10, 0, 0, 7); ctx.fill(); },
  house(ctx, x, y, w, h, wall, roof, icon, opts = {}){
    // фасад 3/4: стена + двускатная крыша
    const roofH = h * 0.42;
    this.shadow(ctx, x, y, w, h);
    ctx.fillStyle = wall;
    ctx.beginPath(); ctx.roundRect(x + 6, y + roofH - 4, w - 12, h - roofH - 2, 6); ctx.fill();
    ctx.fillStyle = '#00000014'; ctx.fillRect(x + 6, y + h - 16, w - 12, 10);
    ctx.fillStyle = roof;
    ctx.beginPath(); ctx.moveTo(x, y + roofH + 2); ctx.lineTo(x + w * 0.5, y + 2); ctx.lineTo(x + w, y + roofH + 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff22'; ctx.beginPath(); ctx.moveTo(x + w * 0.5, y + 2); ctx.lineTo(x + w, y + roofH + 2); ctx.lineTo(x + w * 0.86, y + roofH + 2); ctx.closePath(); ctx.fill();
    // дверь
    ctx.fillStyle = '#6b4226';
    ctx.beginPath(); ctx.roundRect(x + w / 2 - 12, y + h - 40, 24, 32, [10, 10, 2, 2]); ctx.fill();
    if(opts.x){ ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(x + w / 2 - 9, y + h - 32); ctx.lineTo(x + w / 2 + 9, y + h - 12); ctx.moveTo(x + w / 2 + 9, y + h - 32); ctx.lineTo(x + w / 2 - 9, y + h - 12); ctx.stroke(); }
    // окно
    if(w > 100){ ctx.fillStyle = '#bfe3f5'; ctx.fillRect(x + 18, y + h - 44, 18, 16); ctx.fillRect(x + w - 36, y + h - 44, 18, 16); }
    // вывеска
    if(icon){
      ctx.fillStyle = '#fffdf6'; ctx.strokeStyle = '#8b5a2b'; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.arc(x + w / 2, y + roofH * 0.62, 15, 0, 7); ctx.fill(); ctx.stroke();
      ctx.font = '18px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(icon, x + w / 2, y + roofH * 0.62 + 1);
    }
    if(opts.chimney){
      ctx.fillStyle = '#8c5a3c'; ctx.fillRect(x + w * 0.72, y + roofH * 0.2, 10, 20);
      const t = performance.now() / 900;
      ctx.fillStyle = '#ffffffaa';
      for(let i = 0; i < 3; i++){ const p = (t + i / 3) % 1; ctx.beginPath(); ctx.arc(x + w * 0.72 + 5 + Math.sin(p * 6) * 4, y + roofH * 0.2 - p * 30, 4 + p * 5, 0, 7); ctx.globalAlpha = 1 - p; ctx.fill(); }
      ctx.globalAlpha = 1;
    }
  },
  pen(ctx, x, y, w, h, B){
    // загон: утоптанная земля, забор, домик сзади, кормушка
    ctx.fillStyle = '#b9d07a'; ctx.beginPath(); ctx.roundRect(x + 4, y + 30, w - 8, h - 34, 10); ctx.fill();
    ctx.fillStyle = '#a7c06a'; const r = rnd(w + h);
    for(let i = 0; i < 30; i++){ ctx.beginPath(); ctx.arc(x + 10 + r() * (w - 20), y + 36 + r() * (h - 44), 2 + r() * 3, 0, 7); ctx.fill(); }
    this.house(ctx, x + w - 110, y - 22, 104, 80, B.wall, B.roof, B.e);
    ctx.fillStyle = '#8b5a2b'; ctx.fillRect(x + 14, y + h - 28, 44, 12); ctx.fillStyle = '#e6c35c'; ctx.fillRect(x + 17, y + h - 26, 38, 6);
    this.fence(ctx, x, y + 26, w, h - 26, false);
  },
  board(ctx, x, y){
    ctx.fillStyle = '#8b5a2b'; ctx.fillRect(x + 14, y + 40, 8, 54); ctx.fillRect(x + 74, y + 40, 8, 54);
    ctx.fillStyle = '#c98f4f'; ctx.beginPath(); ctx.roundRect(x + 4, y + 8, 88, 52, 6); ctx.fill();
    ctx.fillStyle = '#fffdf6'; for(let i = 0; i < 3; i++){ ctx.fillRect(x + 12 + i * 26, y + 16, 20, 24); }
    ctx.fillStyle = '#e5533d'; for(let i = 0; i < 3; i++){ ctx.beginPath(); ctx.arc(x + 22 + i * 26, y + 17, 3, 0, 7); ctx.fill(); }
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

  /* ---------- декор ---------- */
  decor(ctx, kind, x, y, w, h){
    switch(kind){
      case 'tree': case 'pine': {
        this.shadow(ctx, x, y, w, h);
        ctx.fillStyle = '#7a4a24'; ctx.fillRect(x + w / 2 - 6, y + h - 34, 12, 30);
        if(kind === 'tree'){
          ctx.fillStyle = '#3f8f35'; ctx.beginPath(); ctx.arc(x + w / 2, y + h * 0.42, w * 0.42, 0, 7); ctx.fill();
          ctx.fillStyle = '#56a845'; ctx.beginPath(); ctx.arc(x + w / 2 - 8, y + h * 0.36, w * 0.28, 0, 7); ctx.fill();
          ctx.fillStyle = '#e5533d'; [[-14, 0], [10, -8], [4, 12], [-4, -16]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(x + w / 2 + dx, y + h * 0.42 + dy, 4, 0, 7); ctx.fill(); });
        } else {
          ctx.fillStyle = '#2f6f3a';
          for(let i = 0; i < 3; i++){ const yy = y + 6 + i * 20; ctx.beginPath(); ctx.moveTo(x + w / 2, yy); ctx.lineTo(x + w / 2 + 26 + i * 6, yy + 34); ctx.lineTo(x + w / 2 - 26 - i * 6, yy + 34); ctx.fill(); }
        }
        break;
      }
      case 'flowers': case 'sunflower': {
        const r = rnd(x + y);
        for(let i = 0; i < 4; i++){
          const fx = x + 10 + r() * (w - 20), fy = y + 10 + r() * (h - 24);
          ctx.strokeStyle = '#3f8f35'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(fx, fy + 12); ctx.lineTo(fx, fy); ctx.stroke();
          ctx.fillStyle = kind === 'sunflower' ? '#ffc93a' : ['#ff6b9a', '#ffd23f', '#a78bfa', '#ff8f4a'][i % 4];
          ctx.beginPath(); ctx.arc(fx, fy, kind === 'sunflower' ? 8 : 6.5, 0, 7); ctx.fill();
          if(kind === 'sunflower'){ ctx.fillStyle = '#7a4a24'; ctx.beginPath(); ctx.arc(fx, fy, 2.5, 0, 7); ctx.fill(); }
        }
        break;
      }
      case 'bench':
        ctx.fillStyle = '#8b5a2b'; ctx.fillRect(x + 8, y + 18, w - 16, 8); ctx.fillRect(x + 8, y + 8, w - 16, 6);
        ctx.fillRect(x + 12, y + 26, 5, 14); ctx.fillRect(x + w - 17, y + 26, 5, 14);
        break;
      case 'pond':
        ctx.fillStyle = '#8fbf6a'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, 7); ctx.fill();
        ctx.fillStyle = '#5fb3e0'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h / 2, w / 2 - 8, h / 2 - 8, 0, 0, 7); ctx.fill();
        ctx.strokeStyle = '#ffffff88'; ctx.lineWidth = 2; const tt = performance.now() / 700;
        for(let i = 0; i < 2; i++){ ctx.beginPath(); ctx.ellipse(x + w / 2 - 14 + i * 30, y + h / 2 + 4, 8 + Math.sin(tt + i) * 2, 3, 0, 0, 7); ctx.stroke(); }
        ctx.fillStyle = '#3f8f35'; ctx.beginPath(); ctx.ellipse(x + 26, y + 26, 8, 5, 0.4, 0, 7); ctx.fill();
        break;
      case 'hay':
        ctx.fillStyle = '#e8c35a'; ctx.beginPath(); ctx.ellipse(x + w / 2, y + h - 14, w / 2 - 4, 14, 0, Math.PI, 0); ctx.fill(); ctx.fillRect(x + 4, y + h - 14, w - 8, 8);
        ctx.strokeStyle = '#c99b30'; ctx.lineWidth = 1.5; for(let i = 0; i < 4; i++){ ctx.beginPath(); ctx.moveTo(x + 10 + i * 8, y + h - 22); ctx.lineTo(x + 8 + i * 8, y + h - 8); ctx.stroke(); }
        break;
      case 'well':
        this.shadow(ctx, x, y, w, h);
        ctx.fillStyle = '#9aa3ad'; ctx.beginPath(); ctx.roundRect(x + 14, y + h - 40, w - 28, 32, 6); ctx.fill();
        ctx.fillStyle = '#5fb3e0'; ctx.fillRect(x + 20, y + h - 40, w - 40, 6);
        ctx.fillStyle = '#8b5a2b'; ctx.fillRect(x + 16, y + 10, 6, h - 44); ctx.fillRect(x + w - 22, y + 10, 6, h - 44);
        ctx.fillStyle = '#bc4b2c'; ctx.beginPath(); ctx.moveTo(x + 8, y + 16); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w - 8, y + 16); ctx.fill();
        break;
    }
  },
};
