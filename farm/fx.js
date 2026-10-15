// «Хуторок» — графика 2.0: живая трава (кустики, цветы, камни), вода с бликами и утками,
// новые животные, тени облаков, птицы, бабочки и мягкий солнечный свет.
'use strict';

Object.assign(Art, {
  /* ---------- спрайты мелочей на траве (рисуются один раз) ---------- */
  sprites: null,
  makeSprites(){
    const mk = (w, h, fn) => { const cv = document.createElement('canvas'); cv.width = w * 4; cv.height = h * 4; const c = cv.getContext('2d'); c.scale(4, 4); fn(c); return { cv, w, h }; };
    const tuft = (cols, n, hgt) => mk(26, 22, c => {
      c.fillStyle = '#00000022'; c.beginPath(); c.ellipse(13, 19, 9, 3, 0, 0, 7); c.fill();
      for(let i = 0; i < n; i++){
        const x = 5 + i * (16 / (n - 1)), lean = (i - n / 2) * 1.2, h = hgt * (0.65 + ((i * 37) % 10) / 28);
        c.strokeStyle = cols[i % cols.length]; c.lineWidth = 2.2; c.lineCap = 'round';
        c.beginPath(); c.moveTo(x, 19); c.quadraticCurveTo(x + lean * 0.3, 19 - h * 0.6, x + lean, 19 - h); c.stroke();
      }
    });
    const flowers = (col) => mk(26, 22, c => {
      c.fillStyle = '#00000020'; c.beginPath(); c.ellipse(13, 19, 9, 3, 0, 0, 7); c.fill();
      c.strokeStyle = '#4f9e35'; c.lineWidth = 1.6;
      [[7, 9], [13, 6], [19, 10]].forEach(([x, y]) => { c.beginPath(); c.moveTo(x, 19); c.lineTo(x, y + 2); c.stroke(); });
      [[7, 9], [13, 6], [19, 10]].forEach(([x, y]) => {
        c.fillStyle = col; for(let k = 0; k < 5; k++){ const a = k * 1.2566; c.beginPath(); c.arc(x + Math.cos(a) * 2.6, y + Math.sin(a) * 2.6, 2, 0, 7); c.fill(); }
        c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(x, y, 1.4, 0, 7); c.fill();
      });
    });
    const rock = mk(26, 20, c => {
      c.fillStyle = '#00000026'; c.beginPath(); c.ellipse(14, 16, 10, 3.5, 0, 0, 7); c.fill();
      const g = c.createLinearGradient(6, 6, 20, 16); g.addColorStop(0, '#d7d3cb'); g.addColorStop(1, '#8e877b');
      c.fillStyle = g; c.beginPath(); c.moveTo(5, 16); c.quadraticCurveTo(4, 8, 11, 6); c.quadraticCurveTo(19, 5, 21, 12); c.quadraticCurveTo(22, 16, 18, 17); c.closePath(); c.fill();
      c.strokeStyle = '#6d675d'; c.lineWidth = 1; c.stroke();
      c.fillStyle = '#ffffff70'; c.beginPath(); c.ellipse(10, 9, 3, 1.5, -0.4, 0, 7); c.fill();
      c.fillStyle = '#7cb342'; c.beginPath(); c.ellipse(17, 8, 3, 1.4, 0.3, 0, 7); c.fill();
    });
    const shroom = mk(20, 20, c => {
      c.fillStyle = '#00000022'; c.beginPath(); c.ellipse(10, 17, 6, 2, 0, 0, 7); c.fill();
      c.fillStyle = '#fff3e0'; c.fillRect(8.5, 10, 3, 7);
      c.fillStyle = '#e53935'; c.beginPath(); c.ellipse(10, 10, 6, 4.5, 0, Math.PI, 0); c.fill();
      c.fillStyle = '#fff'; [[8, 8], [11.5, 7], [13, 9.5]].forEach(([x, y]) => { c.beginPath(); c.arc(x, y, 0.9, 0, 7); c.fill(); });
    });
    this.sprites = {
      tufts: [tuft(['#5f9a16', '#7cb424', '#4c8a12'], 6, 11), tuft(['#6aa61c', '#94cc34', '#5a9614'], 5, 9), tuft(['#4f8e14', '#78b020'], 7, 13)],
      flowers: [flowers('#ffffff'), flowers('#ff7aa8'), flowers('#ffd23f'), flowers('#b39ddb')],
      rock, shroom,
    };
    // рассыпаем по карте: позиции детерминированные
    const r = rnd(4242), pts = [];
    for(let i = 0; i < 320; i++){
      const x = r() * MAP_W, y = r() * MAP_H, k = r();
      const kind = k < 0.6 ? 'tuft' : k < 0.92 ? 'flower' : k < 0.98 ? 'rock' : 'shroom';
      pts.push({ x, y, kind, v: Math.floor(r() * 4) });
    }
    this.groundBits = pts;
  },
  drawGroundBits(ctx, st, view){
    if(!this.sprites) this.makeSprites();
    const occ = makeOcc(st), T = TILE;
    const free = (x, y) => { const gx = Math.floor(x), gy = Math.floor(y); return gx >= 0 && gy >= 0 && gx < MAP_W && gy < MAP_H && occ.free(gx, gy, 1, 1); };
    for(const b of this.groundBits){
      const p = this.P(b.x * T, b.y * T);
      if(p.x < view.x0 - 30 || p.x > view.x1 + 30 || p.y < view.y0 - 30 || p.y > view.y1 + 30) continue;
      if(!free(b.x, b.y) || (b.y > 5.6 && b.y < 8.4 && b.x < 4.5)) continue;
      const sp = b.kind === 'tuft' ? this.sprites.tufts[b.v % 3] : b.kind === 'flower' ? this.sprites.flowers[b.v] : b.kind === 'rock' ? this.sprites.rock : this.sprites.shroom;
      ctx.drawImage(sp.cv, p.x - sp.w / 2, p.y - sp.h + 3, sp.w, sp.h);
    }
  },

  /* ---------- вода: глубина, рябь, блики, пена, кувшинки ---------- */
  waterFlat(ctx, time){
    const T = TILE, x = -7.5 * T, y = -7.5 * T, w = 6.9 * T, h = 12.6 * T;
    ctx.fillStyle = '#e6cf98'; ctx.beginPath(); ctx.roundRect(x + 10, y + 10, w + 4, h + 4, 46); ctx.fill();          // песок
    ctx.fillStyle = '#d4b97a'; ctx.beginPath(); ctx.roundRect(x + 6, y + 6, w + 2, h + 2, 44); ctx.fill();
    // бирюзовая вода как в Hay Day: глубже — темнее, у берега светлее
    const g = ctx.createLinearGradient(x, y, x + w, y + h * 0.5);
    g.addColorStop(0, '#1d6a7c'); g.addColorStop(0.5, '#2f8ea0'); g.addColorStop(1, '#55b4bd');
    ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(x, y, w, h, 40); ctx.fill();
    // мелководье у берега
    ctx.strokeStyle = '#86d3d0aa'; ctx.lineWidth = 16; ctx.beginPath(); ctx.roundRect(x + 7, y + 7, w - 14, h - 14, 34); ctx.stroke();
    ctx.strokeStyle = '#ffffffcc'; ctx.lineWidth = 3; ctx.setLineDash([18, 10]); ctx.lineDashOffset = -time * 12;
    ctx.beginPath(); ctx.roundRect(x + 3, y + 3, w - 6, h - 6, 38); ctx.stroke(); ctx.setLineDash([]);
    // рябь и блики солнца
    // мягкие отражения неба — светлые размытые полосы
    for(let i = 0; i < 6; i++){ const sx = x + 40 + i * (w - 80) / 5, sy = y + 60 + ((i * 97) % (h - 120)); const rg = ctx.createRadialGradient(sx, sy, 0, sx, sy, 90); rg.addColorStop(0, 'rgba(200,240,240,0.28)'); rg.addColorStop(1, 'rgba(200,240,240,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(sx, sy, 110, 50, 0.8, 0, 7); ctx.fill(); }
    const r = rnd(31);
    for(let i = 0; i < 16; i++){
      const wx = x + 20 + r() * (w - 60), wy = y + 20 + r() * (h - 40), ph = time * 1.4 + i;
      ctx.strokeStyle = `rgba(255,255,255,${0.25 + 0.25 * Math.sin(ph)})`; ctx.lineWidth = 2.5;
      ctx.beginPath(); ctx.moveTo(wx, wy + Math.sin(ph) * 3); ctx.quadraticCurveTo(wx + 12, wy - 6 + Math.sin(ph) * 3, wx + 24, wy + Math.sin(ph) * 3); ctx.stroke();
    }
    for(let i = 0; i < 10; i++){ const sx = x + 30 + r() * (w - 60), sy = y + 30 + r() * (h - 60), a = Math.max(0, Math.sin(time * 2.3 + i * 1.7)); if(a > 0.6){ ctx.fillStyle = `rgba(255,255,255,${(a - 0.6) * 2})`; this.star(ctx, sx, sy, 4); } }
    // кувшинки
    [[x + 40, y + h - 120], [x + w - 70, y + 90], [x + 60, y + 160]].forEach(([lx, ly], i) => {
      ctx.fillStyle = '#3f9a3a'; ctx.beginPath(); ctx.arc(lx, ly, 13, 0.3, Math.PI * 2 - 0.3); ctx.lineTo(lx, ly); ctx.fill();
      ctx.fillStyle = '#58b84a'; ctx.beginPath(); ctx.arc(lx - 3, ly - 3, 6, 0, 7); ctx.fill();
      if(i !== 1){ ctx.fillStyle = '#ff9ec4'; ctx.beginPath(); ctx.arc(lx + 4, ly - 2, 4, 0, 7); ctx.fill(); ctx.fillStyle = '#fff3a0'; ctx.beginPath(); ctx.arc(lx + 4, ly - 2, 1.5, 0, 7); ctx.fill(); }
    });
    // причал
    ctx.fillStyle = '#00000030'; ctx.fillRect(-2.5 * T + 6, 1.55 * T + 8, 2.6 * T, 1.3 * T);
    ctx.fillStyle = '#6b3f1d'; ctx.fillRect(-2.5 * T, 1.55 * T, 2.6 * T, 1.3 * T);
    for(let i = 0; i < 9; i++){ ctx.fillStyle = i % 2 ? '#b98048' : '#c98f55'; ctx.fillRect(-2.45 * T + i * 0.29 * T, 1.6 * T, 0.25 * T, 1.2 * T); }
    ctx.fillStyle = '#4a2a12'; [[-2.5, 1.55], [-2.5, 2.75], [-1.2, 1.55], [-1.2, 2.75]].forEach(([px, py]) => { ctx.beginPath(); ctx.arc(px * T + 4, py * T + 4, 5, 0, 7); ctx.fill(); });
  },
  // Утки плавают по кругу.
  ducks(ctx, time, view){
    const T = TILE;
    [[-4.6, -3.0, 1.6, 0], [-3.4, 3.4, 1.0, 2.1], [-5.6, 0.6, 0.9, 4.2]].forEach(([cx, cy, rr, ph], i) => {
      const a = time * 0.25 + ph, wx = (cx + Math.cos(a) * rr) * T, wy = (cy + Math.sin(a) * rr * 1.4) * T;
      const p = this.P(wx, wy); if(!this.inView(p, view)) return;
      const dir = -Math.sin(a) * rr - Math.cos(a) * rr * 1.4 > 0 ? 1 : -1, bob = Math.sin(time * 3 + i) * 1.2;
      ctx.save(); ctx.translate(p.x, p.y + bob); ctx.scale(dir, 1);
      ctx.strokeStyle = '#ffffff90'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(-4, 3, 13 + Math.sin(time * 2 + i) * 2, 3, 0, 0, 7); ctx.stroke();
      ctx.fillStyle = i === 1 ? '#8d6e63' : '#ffffff'; ctx.beginPath(); ctx.ellipse(0, -3, 9, 5.5, 0, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(-8, -6, 4, 3, -0.6, 0, 7); ctx.fill();
      ctx.fillStyle = i === 1 ? '#2e7d32' : '#ffffff'; ctx.beginPath(); ctx.arc(6, -10, 4.2, 0, 7); ctx.fill();
      ctx.fillStyle = '#ff9800'; ctx.beginPath(); ctx.moveTo(9.5, -10); ctx.lineTo(14, -9); ctx.lineTo(9.5, -8); ctx.fill();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(7.2, -11, 1, 0, 7); ctx.fill();
      ctx.restore();
    });
  },

  /* ---------- животные 2.0 ---------- */
  animal(ctx, kind, x, y, dir, t, state){
    const OL = 'rgba(60,40,25,.75)';
    ctx.save(); ctx.translate(x, y); ctx.scale(dir < 0 ? -1.45 : 1.45, 1.45);
    const walk = t ? Math.sin(t * 10) : 0, bob = t ? Math.abs(Math.sin(t * 10)) * 1.2 : 0;
    const idle = performance.now() / 1000 + x * 0.01;
    ctx.fillStyle = '#00000026'; ctx.beginPath(); ctx.ellipse(0, 10, 14, 4, 0, 0, 7); ctx.fill();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if(kind === 'chicken'){
      const peck = !t && state !== 'hungry' ? Math.max(0, Math.sin(idle * 1.7)) ** 6 * 6 : 0;
      ctx.strokeStyle = '#e08a1e'; ctx.lineWidth = 1.8;
      ctx.beginPath(); ctx.moveTo(-2, 5); ctx.lineTo(-2 - walk * 1.5, 10); ctx.moveTo(3, 5); ctx.lineTo(3 + walk * 1.5, 10); ctx.stroke();
      ctx.fillStyle = '#efe6d2'; ctx.beginPath(); ctx.moveTo(-9, -1 - bob); ctx.lineTo(-15, -9 - bob); ctx.lineTo(-13, -1 - bob); ctx.lineTo(-16, -5 - bob); ctx.lineTo(-10, 2 - bob); ctx.fill();   // хвост
      const g = ctx.createRadialGradient(-3, -4 - bob, 1, 0, -bob, 12); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e8dfcc');
      ctx.fillStyle = g; ctx.strokeStyle = OL; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.ellipse(0, -bob, 10.5, 8.5, 0, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#ece2cd'; ctx.beginPath(); ctx.ellipse(-2, 0 - bob, 6, 4, 0.35, 0, 7); ctx.fill(); ctx.stroke();      // крыло
      ctx.save(); ctx.translate(7, -6 - bob); ctx.rotate(peck * 0.12);
      ctx.translate(0, peck);
      ctx.fillStyle = '#fffdf8'; ctx.beginPath(); ctx.arc(1, -2, 5.5, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#e53935'; [[-1, -8], [1.5, -9], [4, -8]].forEach(([cx, cy]) => { ctx.beginPath(); ctx.arc(cx, cy, 2, 0, 7); ctx.fill(); });
      ctx.beginPath(); ctx.ellipse(5, 1.5, 1.4, 2.4, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#ffa726'; ctx.beginPath(); ctx.moveTo(5.5, -3); ctx.lineTo(10, -1.5); ctx.lineTo(5.5, 0); ctx.fill();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(3, -3, 1.2, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(3.4, -3.4, 0.4, 0, 7); ctx.fill();
      ctx.restore();
    } else if(kind === 'cow'){
      const chew = !t ? Math.sin(idle * 6) * 0.6 : 0;
      ctx.fillStyle = '#5d4a3a';
      [[-11, 0], [-5, 1], [5, 1], [10, 0]].forEach(([lx], i) => { const sw = (i % 2 ? walk : -walk) * 1.5; ctx.fillRect(lx + sw, 5, 3.4, 7); ctx.fillStyle = '#3a2a1a'; ctx.fillRect(lx + sw, 10.5, 3.4, 2); ctx.fillStyle = '#5d4a3a'; });
      ctx.strokeStyle = '#7a6a5a'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-15, -4 - bob); ctx.quadraticCurveTo(-19, 0, -17, 5 + Math.sin(idle * 2) * 1.5); ctx.stroke();
      const g = ctx.createLinearGradient(0, -12, 0, 8); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#e6e1d8');
      ctx.fillStyle = g; ctx.strokeStyle = OL; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.roundRect(-16, -11 - bob, 30, 18, 9); ctx.fill(); ctx.stroke();
      ctx.save(); ctx.beginPath(); ctx.roundRect(-16, -11 - bob, 30, 18, 9); ctx.clip();
      ctx.fillStyle = '#2b2522'; [[-8, -6, 6, 5], [5, 2, 5, 4], [-2, 4, 4, 3], [10, -8, 4, 4]].forEach(([cx, cy, rx, ry]) => { ctx.beginPath(); ctx.ellipse(cx, cy - bob, rx, ry, 0.4, 0, 7); ctx.fill(); });
      ctx.restore();
      ctx.fillStyle = '#f4a6a6'; ctx.beginPath(); ctx.ellipse(-2, 7 - bob, 4, 2.5, 0, 0, 7); ctx.fill();
      // голова
      ctx.save(); ctx.translate(16, -9 - bob);
      ctx.fillStyle = '#d9c7a0'; ctx.beginPath(); ctx.moveTo(-4, -6); ctx.quadraticCurveTo(-6, -11, -2, -10); ctx.lineTo(-1, -6); ctx.fill(); ctx.beginPath(); ctx.moveTo(4, -6); ctx.quadraticCurveTo(6, -11, 2, -10); ctx.lineTo(1, -6); ctx.fill();
      ctx.fillStyle = '#fffdf8'; ctx.beginPath(); ctx.roundRect(-6, -7, 12, 13, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#2b2522'; ctx.beginPath(); ctx.ellipse(-7, -3, 3.5, 2, -0.5, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(7, -3, 3.5, 2, 0.5, 0, 7); ctx.fill();
      ctx.fillStyle = '#f2b6b0'; ctx.beginPath(); ctx.roundRect(-5.5, 1 + chew * 0.3, 11, 6.5, 3); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#9e5a55'; ctx.beginPath(); ctx.arc(-2.2, 4, 0.9, 0, 7); ctx.arc(2.2, 4, 0.9, 0, 7); ctx.fill();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-2.5, -2.5, 1.3, 0, 7); ctx.arc(2.5, -2.5, 1.3, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-2.1, -2.9, 0.45, 0, 7); ctx.arc(2.9, -2.9, 0.45, 0, 7); ctx.fill();
      ctx.restore();
    } else {
      ctx.fillStyle = '#3d3a44';
      [[-9], [-3], [4], [9]].forEach(([lx], i) => { const sw = (i % 2 ? walk : -walk) * 1.4; ctx.fillRect(lx + sw, 5, 2.8, 7); });
      const puffs = [[-9, -1], [-3, -6], [4, -6], [9, -1], [-5, 3], [3, 3], [-11, 4], [10, 4], [0, -1]];
      ctx.fillStyle = '#a89e8f'; puffs.forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(dx, dy - bob, 7.2, 0, 7); ctx.fill(); });
      const g = ctx.createRadialGradient(-3, -6 - bob, 1, 0, -bob, 16); g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#ece6da');
      ctx.fillStyle = g; puffs.forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(dx, dy - bob, 6.2, 0, 7); ctx.fill(); });
      ctx.strokeStyle = '#d8d0c2'; ctx.lineWidth = 1; puffs.forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(dx + 1, dy - bob + 1, 3, 0.5, 2.6); ctx.stroke(); });
      ctx.save(); ctx.translate(15, -4 - bob + (!t ? Math.sin(idle * 1.3) * 0.8 : 0));
      ctx.fillStyle = '#3d3a44'; ctx.beginPath(); ctx.ellipse(-4, -4, 4, 2, -0.6, 0, 7); ctx.fill(); ctx.beginPath(); ctx.ellipse(5, -3, 4, 2, 0.6, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, 0, 5.5, 6.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#f7f4ee'; ctx.beginPath(); ctx.arc(0, -6, 4, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-2, -0.5, 1.6, 0, 7); ctx.arc(2, -0.5, 1.6, 0, 7); ctx.fill();
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(-1.7, -0.3, 0.9, 0, 7); ctx.arc(2.3, -0.3, 0.9, 0, 7); ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  },

  /* ---------- небо и свет ---------- */
  cloudShadows(ctx, time){
    const W = MAP_W * TILE, H = MAP_H * TILE;
    ctx.save(); ctx.transform(1, 0.5, -1, 0.5, 0, 0);
    ctx.fillStyle = 'rgba(20,40,80,0.075)';
    [[0.1, 0.2, 1], [0.55, 0.65, 1.3], [0.8, 0.15, 0.9]].forEach(([fx, fy, s], i) => {
      const cx = ((fx * W + time * 14 * (1 + i * 0.3)) % (W + 1200)) - 600, cy = fy * H;
      [[0, 0, 160], [130, 30, 120], [-120, 40, 110], [40, 90, 120]].forEach(([dx, dy, r]) => { ctx.beginPath(); ctx.ellipse(cx + dx * s, cy + dy * s, r * s, r * s * 0.8, 0, 0, 7); ctx.fill(); });
    });
    ctx.restore();
  },
  birds(ctx, time, view){
    for(let i = 0; i < 3; i++){
      const per = 26 + i * 7, ph = ((time + i * 11) % per) / per;
      const x = view.x0 - 120 + ph * (view.x1 - view.x0 + 240), y = view.y0 + 90 + i * 45 + Math.sin(time * 0.8 + i) * 18;
      for(let k = 0; k < 3; k++){
        const bx = x - k * 22, by = y + (k % 2) * 12 + k * 6, f = Math.sin(time * 9 + k + i) * 4;
        ctx.strokeStyle = '#3b3b48'; ctx.lineWidth = 2; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(bx - 7, by - f); ctx.quadraticCurveTo(bx - 3, by - 3, bx, by); ctx.quadraticCurveTo(bx + 3, by - 3, bx + 7, by - f); ctx.stroke();
      }
    }
  },
  butterflies(ctx, time, view){
    const T = TILE;
    [[10, -2], [4, 13], [16, 9], [8, 22], [22, 12]].forEach(([gx, gy], i) => {
      const wx = (gx + Math.sin(time * 0.5 + i) * 1.6) * T, wy = (gy + Math.cos(time * 0.37 + i * 2) * 1.6) * T;
      const p = this.P(wx, wy); if(!this.inView(p, view)) return;
      const hgt = 26 + Math.sin(time * 2 + i) * 8, f = Math.abs(Math.sin(time * 14 + i));
      ctx.fillStyle = ['#ff7aa8', '#ffd23f', '#81d4fa', '#ce93d8', '#ffab40'][i];
      ctx.beginPath(); ctx.ellipse(p.x - 3 * f, p.y - hgt, 3.5 * f + 0.5, 3, -0.4, 0, 7); ctx.fill();
      ctx.beginPath(); ctx.ellipse(p.x + 3 * f, p.y - hgt, 3.5 * f + 0.5, 3, 0.4, 0, 7); ctx.fill();
      ctx.fillStyle = '#333'; ctx.fillRect(p.x - 0.6, p.y - hgt - 2.5, 1.2, 5);
    });
  },
  // Мягкий солнечный свет сверху-слева и лёгкая виньетка — в экранных координатах.
  lighting(ctx, W, H){
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    const g = ctx.createRadialGradient(W * 0.15, -H * 0.15, 0, W * 0.15, -H * 0.15, Math.hypot(W, H) * 1.15);
    g.addColorStop(0, 'rgba(255,236,170,0.75)'); g.addColorStop(0.55, 'rgba(255,220,150,0.25)'); g.addColorStop(1, 'rgba(20,40,90,0.35)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalCompositeOperation = 'source-over';
    const v = ctx.createRadialGradient(W / 2, H * 0.45, Math.min(W, H) * 0.45, W / 2, H * 0.45, Math.hypot(W, H) * 0.7);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(10,25,10,0.22)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, W, H);
    ctx.restore();
  },
});
