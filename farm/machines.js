// «Хуторок» — заводы как в Hay Day: у каждого свой механизм на каменной площадке
// (мельница с бункером, кирпичная печь, котёл попкорна, гриль, тележка мороженого…).
'use strict';

Object.assign(Art, {
  /* ---------- объёмные заготовки ---------- */
  G(x, y, z = 0){ const q = this.P(x, y); return { x: q.x, y: q.y - z }; },
  hgrad(ctx, x0, x1, col, k0 = 1.14, k1 = 0.66){
    const g = ctx.createLinearGradient(x0, 0, x1, 0);
    g.addColorStop(0, this.shade(col, k0)); g.addColorStop(0.42, this.shade(col, 1)); g.addColorStop(1, this.shade(col, k1));
    return g;
  },
  // Цилиндр (бак, котёл, бочка): x,y — центр на земле, r — радиус, h — высота, z — подъём.
  cyl(ctx, x, y, r, h, col, z = 0, top){
    const g = this.G(x, y, z), rx = r * 1.414, ry = r * 0.707, by = g.y, ty = g.y - h;
    ctx.beginPath(); ctx.moveTo(g.x - rx, ty); ctx.lineTo(g.x - rx, by); ctx.ellipse(g.x, by, rx, ry, 0, Math.PI, 0, true);
    ctx.lineTo(g.x + rx, ty); ctx.ellipse(g.x, ty, rx, ry, 0, 0, Math.PI, false); ctx.closePath();
    ctx.fillStyle = this.hgrad(ctx, g.x - rx, g.x + rx, col); ctx.fill(); ctx.strokeStyle = this.OL; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(g.x, ty, rx, ry, 0, 0, 7); ctx.fillStyle = top || this.shade(col, 1.2); ctx.fill(); ctx.stroke();
    return { x: g.x, y: ty, by, rx, ry };
  },
  // Усечённый конус: r0 — радиус снизу, r1 — сверху (воронка, если r1 > r0).
  frustum(ctx, x, y, r0, r1, h, col, z = 0, top){
    const g = this.G(x, y, z), a = r0 * 1.414, b = r0 * 0.707, c = r1 * 1.414, d = r1 * 0.707, by = g.y, ty = g.y - h;
    ctx.beginPath(); ctx.moveTo(g.x - c, ty); ctx.lineTo(g.x - a, by); ctx.ellipse(g.x, by, a, b, 0, Math.PI, 0, true);
    ctx.lineTo(g.x + c, ty); ctx.ellipse(g.x, ty, c, d, 0, 0, Math.PI, false); ctx.closePath();
    ctx.fillStyle = this.hgrad(ctx, g.x - Math.max(a, c), g.x + Math.max(a, c), col); ctx.fill(); ctx.strokeStyle = this.OL; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.beginPath(); ctx.ellipse(g.x, ty, c, d, 0, 0, 7); ctx.fillStyle = top || this.shade(col, 1.2); ctx.fill(); ctx.stroke();
    return { x: g.x, y: ty };
  },
  // Купол (печь, крышка гриля, мешок).
  dome(ctx, x, y, r, h, col, z = 0){
    const g = this.G(x, y, z), rx = r * 1.414, ry = r * 0.707;
    ctx.beginPath(); ctx.ellipse(g.x, g.y, rx, ry, 0, 0, Math.PI, false); ctx.ellipse(g.x, g.y, rx, h, 0, Math.PI, 0, false); ctx.closePath();
    const gr = ctx.createRadialGradient(g.x - rx * 0.35, g.y - h * 0.6, 2, g.x, g.y - h * 0.3, Math.max(rx, h) * 1.2);
    gr.addColorStop(0, this.shade(col, 1.3)); gr.addColorStop(0.5, col); gr.addColorStop(1, this.shade(col, 0.62));
    ctx.fillStyle = gr; ctx.fill(); ctx.strokeStyle = this.OL; ctx.lineWidth = 1.5; ctx.stroke();
    return { x: g.x, y: g.y - h, by: g.y, rx, ry };
  },
  cone(ctx, x, y, r, h, col, z = 0, stripes){
    const g = this.G(x, y, z), rx = r * 1.414, ry = r * 0.707, top = { x: g.x, y: g.y - h };
    ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(g.x - rx, g.y); ctx.ellipse(g.x, g.y, rx, ry, 0, Math.PI, 0, true); ctx.closePath();
    ctx.fillStyle = this.hgrad(ctx, g.x - rx, g.x + rx, col); ctx.fill();
    if(stripes){
      for(let i = 0; i < 8; i += 2){
        const a0 = Math.PI * i / 8, a1 = Math.PI * (i + 1) / 8;
        ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(g.x + Math.cos(a0) * rx, g.y + Math.sin(a0) * ry); ctx.ellipse(g.x, g.y, rx, ry, 0, a0, a1); ctx.closePath();
        ctx.fillStyle = stripes; ctx.fill();
      }
    }
    ctx.beginPath(); ctx.moveTo(top.x, top.y); ctx.lineTo(g.x - rx, g.y); ctx.ellipse(g.x, g.y, rx, ry, 0, Math.PI, 0, true); ctx.closePath();
    ctx.strokeStyle = this.OL; ctx.lineWidth = 1.5; ctx.stroke();
    return top;
  },
  // Вертикальные полосы на цилиндре (котёл попкорна, тент).
  cylStripes(ctx, s, h, col, n = 10){
    for(let i = 0; i < n; i += 2){
      const a0 = Math.PI * i / n, a1 = Math.PI * (i + 1) / n;
      ctx.beginPath(); ctx.ellipse(s.x, s.by, s.rx, s.ry, 0, a0, a1); ctx.ellipse(s.x, s.y, s.rx, s.ry, 0, a1, a0, true); ctx.closePath();
      ctx.fillStyle = col; ctx.globalAlpha = 0.85; ctx.fill(); ctx.globalAlpha = 1;
    }
  },
  // Обруч вокруг цилиндра (бочка).
  hoop(ctx, s, v, col = '#4a2c16'){
    ctx.strokeStyle = col; ctx.lineWidth = 3.5; ctx.beginPath(); ctx.ellipse(s.x, s.by - v, s.rx, s.ry, 0, 0, Math.PI); ctx.stroke();
  },
  boxZ(ctx, x, y, w, d, h, wall, top, z = 0, planks = false){
    ctx.save(); ctx.translate(0, -z); this.box(ctx, x, y, w, d, h, wall, top, { flat: true, noPlanks: !planks }); ctx.restore();
  },
  // Квадрат на передней левой стене бокса, поднятого на z.
  faceYZ(ctx, x, y, w, d, z, u0, u1, v0, v1, fill, stroke){ ctx.save(); ctx.translate(0, -z); this.faceY(ctx, x, y, w, d, u0, u1, v0, v1, fill, stroke); ctx.restore(); },
  faceXZ(ctx, x, y, w, d, z, u0, u1, v0, v1, fill, stroke){ ctx.save(); ctx.translate(0, -z); this.faceX(ctx, x, y, w, d, u0, u1, v0, v1, fill, stroke); ctx.restore(); },
  // Арка (дверца печи) на передней стороне купола/цилиндра.
  archAt(ctx, p, w, h, fill, glow){
    ctx.beginPath(); ctx.moveTo(p.x - w, p.y); ctx.lineTo(p.x - w, p.y - h + w); ctx.arc(p.x, p.y - h + w, w, Math.PI, 0); ctx.lineTo(p.x + w, p.y); ctx.closePath();
    ctx.fillStyle = fill; ctx.fill(); ctx.strokeStyle = '#fffaf0'; ctx.lineWidth = 3; ctx.stroke();
    if(glow){ const g = ctx.createRadialGradient(p.x, p.y - 4, 1, p.x, p.y - 4, w * 1.3); g.addColorStop(0, '#fff3a0'); g.addColorStop(0.4, '#ff9a3d'); g.addColorStop(1, '#ff9a3d00'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(p.x, p.y - 6, w * 0.9, h * 0.45, 0, 0, 7); ctx.fill(); }
  },
  smokeAt(ctx, p, time, col = '#ffffff'){
    for(let k = 0; k < 5; k++){ const t = (time * 0.45 + k / 5) % 1; ctx.globalAlpha = (1 - t) * 0.85; ctx.fillStyle = col; ctx.beginPath(); ctx.arc(p.x + Math.sin(t * 6 + k) * 7 + t * 10, p.y - 6 - t * 60, 5 + t * 11, 0, 7); ctx.fill(); }
    ctx.globalAlpha = 1;
  },
  sack(ctx, x, y, z, col = '#e8d4a8'){
    const d = this.dome(ctx, x, y, 11, 22, col, z);
    ctx.strokeStyle = this.shade(col, 0.6); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(d.x - 5, d.y + 5); ctx.lineTo(d.x + 5, d.y + 5); ctx.stroke();
  },
  wheel(ctx, p, r, col, time, spin){
    ctx.save(); ctx.translate(p.x, p.y); ctx.scale(0.62, 1); ctx.rotate(spin ? time * 3 : 0);
    ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(0, 0, r + 2, 0, 7); ctx.fill();
    ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = 3;
    for(let i = 0; i < 6; i++){ const a = i * Math.PI / 3; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke(); }
    ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(0, 0, 4, 0, 7); ctx.fill();
    ctx.restore();
  },
  // Каменная площадка под завод.
  pad(ctx, x, y, w, d){
    this.box(ctx, x, y, w, d, 10, '#9c9180', '#d9cfba', { flat: true, noPlanks: true });
    ctx.save(); ctx.translate(0, -10); ctx.transform(1, 0.5, -1, 0.5, 0, 0);
    ctx.strokeStyle = '#b9ae98'; ctx.lineWidth = 2;
    for(let i = 1; i < 4; i++){ ctx.beginPath(); ctx.moveTo(x + w * i / 4, y + 3); ctx.lineTo(x + w * i / 4, y + d - 3); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + 3, y + d * i / 4); ctx.lineTo(x + w - 3, y + d * i / 4); ctx.stroke(); }
    ctx.restore();
  },
  post(ctx, p, icon){
    ctx.fillStyle = '#6b4220'; ctx.fillRect(p.x - 2.5, p.y - 38, 5, 38);
    this.sign(ctx, p.x, p.y - 46, icon, 14);
  },

  /* ---------- сами заводы ---------- */
  MACHINES: {
    feedmill(A, c, cx, cy, z, run, t){
      A.boxZ(c, cx - 40, cy - 34, 76, 70, 48, '#c98f4f', '#a86d34', z, true);
      A.faceYZ(c, cx - 40, cy - 34, 76, 70, z, 26, 50, 0, 32, '#6b4226', A.OL);
      const f = A.frustum(c, cx - 2, cy + 1, 16, 38, 36, '#7cb342', z + 48, '#f2c94c');
      c.fillStyle = '#e0b53a'; for(let i = 0; i < 6; i++){ c.beginPath(); c.arc(f.x - 18 + i * 7, f.y + (i % 2) * 3, 3, 0, 7); c.fill(); }
      A.sack(c, cx - 50, cy + 44, z); A.sack(c, cx - 30, cy + 54, z, '#d9c08c'); A.sack(c, cx + 46, cy + 46, z);
      return { smoke: run ? { x: f.x, y: f.y - 4 } : null };
    },
    bakery(A, c, cx, cy, z, run, t){
      A.cyl(c, cx - 34, cy - 34, 8, 52, '#9c4a32', z + 30, '#3a2a1a');
      const d = A.dome(c, cx - 6, cy - 6, 44, 74, '#d9733f', z);
      c.strokeStyle = '#b3552a'; c.lineWidth = 1.5;
      for(let k = 1; k < 4; k++){ c.beginPath(); c.ellipse(d.x, d.by, d.rx * (1 - k * 0.18), 74 * (1 - k * 0.22), 0, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
      A.archAt(c, { x: d.x, y: d.by + d.ry - 4 }, 16, 40, '#3a1f10', run);
      A.boxZ(c, cx + 26, cy + 30, 36, 24, 22, '#a86d34', '#c98f4f', z);
      ['#d99a4e', '#c7843c'].forEach((col, i) => A.dome(c, cx + 36 + i * 14, cy + 38 + i * 4, 7, 9, col, z + 22));
      const ch = A.G(cx - 34, cy - 34, z + 82);
      return { smoke: run ? ch : null };
    },
    dairy(A, c, cx, cy, z, run, t){
      A.cyl(c, cx - 30, cy - 30, 22, 76, '#cfd8dc', z, '#eceff1');
      A.cyl(c, cx + 6, cy - 44, 16, 60, '#b0bec5', z, '#eceff1');
      c.strokeStyle = '#78909c'; c.lineWidth = 6; c.lineCap = 'round';
      const p1 = A.G(cx - 30, cy - 30, z + 46), p2 = A.G(cx - 8, cy + 6, z + 36); c.beginPath(); c.moveTo(p1.x + 20, p1.y + 8); c.lineTo(p2.x, p2.y); c.stroke();
      A.boxZ(c, cx - 14, cy + 2, 54, 44, 38, '#4a7fb5', '#90caf9', z);
      A.faceYZ(c, cx - 14, cy + 2, 54, 44, z, 8, 26, 14, 30, '#e3f2fd', A.OL);
      A.faceYZ(c, cx - 14, cy + 2, 54, 44, z, 32, 46, 18, 26, run ? '#7ad04f' : '#e5533d');
      A.cyl(c, cx + 50, cy + 48, 7, 18, '#eceff1', z, '#b0bec5');
      return { smoke: run ? A.G(cx - 30, cy - 30, z + 80) : null };
    },
    sugarmill(A, c, cx, cy, z, run, t){
      A.boxZ(c, cx - 42, cy - 32, 80, 62, 54, '#f3e6f0', '#d8a7c7', z, true);
      A.wheel(c, A.G(cx - 4, cy + 30, z + 30), 22, '#b04a8a', t, run);
      A.frustum(c, cx - 2, cy - 1, 12, 26, 26, '#b04a8a', z + 54, '#ffffff');
      A.sack(c, cx + 46, cy + 44, z, '#ffffff'); A.sack(c, cx + 30, cy + 54, z, '#f8e1f0');
      return { smoke: null };
    },
    juicer(A, c, cx, cy, z, run, t){
      const v = A.cyl(c, cx - 8, cy - 8, 40, 46, '#a0602a', z, '#e5533d');
      A.hoop(c, v, 10); A.hoop(c, v, 34);
      if(run){ c.fillStyle = '#ff8a65'; c.beginPath(); c.ellipse(v.x, v.y, v.rx * 0.5, v.ry * 0.5, 0, 0, 7); c.fill(); }
      const top = A.G(cx - 8, cy - 8, z + 46);
      c.fillStyle = '#5a5a5a'; c.fillRect(top.x - 3, top.y - 40, 6, 40);
      c.strokeStyle = '#3a3a3a'; c.lineWidth = 5; c.lineCap = 'round'; const sp = run ? Math.sin(t * 3) * 14 : 14; c.beginPath(); c.moveTo(top.x - sp, top.y - 40); c.lineTo(top.x + sp, top.y - 40); c.stroke();
      [0, 1, 2].forEach(i => A.cyl(c, cx + 34 + i * 9, cy + 40 - i * 6, 5, 18, '#e8402d', z, '#2b2b2b'));
      return { smoke: null };
    },
    sweets(A, c, cx, cy, z, run, t){
      A.boxZ(c, cx - 44, cy - 38, 86, 74, 30, '#fbe1ea', '#f8bbd0', z);
      A.faceYZ(c, cx - 44, cy - 38, 86, 74, z, 30, 56, 4, 24, '#3a1f10', A.OL);
      A.cyl(c, cx - 2, cy - 2, 32, 18, '#ffffff', z + 30, '#ff8fb3');
      A.cyl(c, cx - 2, cy - 2, 22, 16, '#ff8fb3', z + 48, '#ffffff');
      const s = A.cyl(c, cx - 2, cy - 2, 12, 14, '#ffffff', z + 64, '#ff5d8f');
      c.fillStyle = '#d62f4b'; c.beginPath(); c.arc(s.x, s.y - 5, 6, 0, 7); c.fill(); c.fillStyle = '#ffffffaa'; c.beginPath(); c.arc(s.x - 2, s.y - 7, 2, 0, 7); c.fill();
      return { smoke: null };
    },
    loom(A, c, cx, cy, z, run, t){
      const P = (x, y, h) => A.G(x, y, z + h);
      const post = (x, y) => { const b = P(x, y, 0), tp = P(x, y, 74); c.fillStyle = '#7a4a22'; c.fillRect(b.x - 4, tp.y, 8, b.y - tp.y); c.fillStyle = '#a86d34'; c.fillRect(b.x - 4, tp.y, 4, b.y - tp.y); };
      post(cx - 40, cy - 22); post(cx + 36, cy - 22);
      const beam = (y, h) => { const a = P(cx - 40, y, h), b = P(cx + 36, y, h); c.strokeStyle = '#6b4220'; c.lineWidth = 7; c.lineCap = 'round'; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); };
      beam(cy - 22, 74); beam(cy + 22, 30);
      const cols = ['#6b58b5', '#e5533d', '#ffd23f', '#4caf50', '#4a90e2', '#ff8fb3'];
      for(let i = 0; i < 12; i++){ const u = cx - 34 + i * 6, a = P(u, cy - 22, 72), b = P(u, cy + 22, 30); c.strokeStyle = cols[i % 6]; c.lineWidth = 2; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); }
      const q = [P(cx - 34, cy + 2, 50), P(cx + 30, cy + 2, 50), P(cx + 30, cy + 22, 30), P(cx - 34, cy + 22, 30)];
      A.poly(c, q, '#8e7cc3', A.OL);
      post(cx - 40, cy + 22); post(cx + 36, cy + 22);
      const sh = P(cx - 6 + (run ? Math.sin(t * 4) * 26 : 0), cy + 12, 44); c.fillStyle = '#c98f4f'; c.beginPath(); c.ellipse(sh.x, sh.y, 9, 4, 0.45, 0, 7); c.fill();
      A.sack(c, cx + 48, cy + 46, z, '#efe9ff');
      return { smoke: null };
    },
    popcornpot(A, c, cx, cy, z, run, t){
      A.boxZ(c, cx - 40, cy - 34, 78, 68, 14, '#c0392b', '#e74c3c', z);
      [[cx - 40, cy + 20], [cx + 30, cy + 34]].forEach(([x, y]) => { const p = A.G(x, y, z + 6); c.fillStyle = '#2b2b2b'; c.beginPath(); c.ellipse(p.x, p.y, 7, 10, 0.4, 0, 7); c.fill(); c.fillStyle = '#ffd23f'; c.beginPath(); c.arc(p.x, p.y, 3, 0, 7); c.fill(); });
      const pot = A.cyl(c, cx - 2, cy - 2, 32, 48, '#e5533d', z + 14, '#fff3c4');
      A.cylStripes(c, pot, 48, '#ffffff', 12);
      c.strokeStyle = A.OL; c.lineWidth = 1.5; c.beginPath(); c.ellipse(pot.x, pot.y, pot.rx, pot.ry, 0, 0, 7); c.stroke();
      const r = rnd(5), j = run ? Math.abs(Math.sin(t * 6)) * 4 : 0;
      for(let i = 0; i < 26; i++){ const a = r() * 6.28, d = r(); c.fillStyle = r() < 0.75 ? '#fffaf0' : '#ffe066'; c.beginPath(); c.arc(pot.x + Math.cos(a) * pot.rx * 0.8 * d, pot.y - 6 - (1 - d) * 16 + Math.sin(a) * pot.ry * 0.6 * d - j * r(), 5, 0, 7); c.fill(); }
      return { smoke: null };
    },
    grill(A, c, cx, cy, z, run, t){
      A.boxZ(c, cx + 22, cy + 18, 34, 32, 30, '#a86d34', '#c98f4f', z);
      const g0 = A.G(cx - 8, cy - 8, z); c.strokeStyle = '#2b2b2b'; c.lineWidth = 4;
      [[-26, 0], [26, 0], [0, 12]].forEach(([dx, dy]) => { c.beginPath(); c.moveTo(g0.x + dx, g0.y + dy); c.lineTo(g0.x + dx * 0.6, g0.y - 36); c.stroke(); });
      const bowl = A.cyl(c, cx - 8, cy - 8, 30, 20, '#2f2f2f', z + 34, '#6b6b6b');
      c.strokeStyle = '#999'; c.lineWidth = 1.5; for(let i = -3; i <= 3; i++){ c.beginPath(); c.moveTo(bowl.x + i * 9 - 10, bowl.y - 4); c.lineTo(bowl.x + i * 9 + 10, bowl.y + 4); c.stroke(); }
      const lid = A.dome(c, cx - 26, cy - 26, 24, 34, '#3a3a3a', z + 56);
      c.fillStyle = '#c0c0c0'; c.fillRect(lid.x - 6, lid.y - 6, 12, 5);
      if(run){ ['#e5533d', '#fbc02d', '#43a047'].forEach((col, i) => { const p = A.G(cx - 2 + i * 10, cy, z + 56); c.fillStyle = col; c.beginPath(); c.ellipse(p.x, p.y, 5, 3, 0.4, 0, 7); c.fill(); }); }
      return { smoke: run ? A.G(cx - 8, cy - 8, z + 60) : null, smokeCol: '#d8d8d8' };
    },
    pieoven(A, c, cx, cy, z, run, t){
      A.cyl(c, cx - 30, cy - 30, 8, 40, '#7b6f63', z + 56, '#3a2a1a');
      const bx = cx - 44, by = cy - 36;
      A.boxZ(c, bx, by, 86, 72, 56, '#b5532c', '#8d7b6a', z);
      c.save(); c.translate(0, -z); c.strokeStyle = '#8d3f22'; c.lineWidth = 1.2;
      for(let v = 8; v < 56; v += 8){ const a = A.up(A.P(bx, by + 72), v), b = A.up(A.P(bx + 86, by + 72), v), e = A.up(A.P(bx + 86, by), v); c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.lineTo(e.x, e.y); c.stroke(); }
      c.restore();
      const door = A.G(bx + 43, by + 72, z); A.archAt(c, { x: door.x, y: door.y - 4 }, 15, 38, '#3a1f10', run);
      A.dome(c, cx + 46, cy + 48, 9, 9, '#e8b04a', z);
      return { smoke: run ? A.G(cx - 30, cy - 30, z + 96) : null };
    },
    icecream(A, c, cx, cy, z, run, t){
      const bx = cx - 36, by = cy - 26;
      A.boxZ(c, bx, by, 72, 52, 40, '#e3f4fb', '#ffffff', z);
      A.faceYZ(c, bx, by, 72, 52, z, 6, 66, 14, 30, '#ff8fb3');
      [[bx + 6, by + 52], [bx + 66, by + 52]].forEach(([x, y]) => { const p = A.G(x, y, z + 6); c.fillStyle = '#2b2b2b'; c.beginPath(); c.ellipse(p.x, p.y, 8, 11, 0.4, 0, 7); c.fill(); c.fillStyle = '#ccc'; c.beginPath(); c.arc(p.x, p.y, 3, 0, 7); c.fill(); });
      const a = A.G(cx - 20, cy - 10, z + 40), b = A.G(cx - 20, cy - 10, z + 112); c.strokeStyle = '#8b5a2b'; c.lineWidth = 4; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke();
      A.cone(c, cx - 20, cy - 10, 46, 26, '#ff8fb3', z + 96, '#ffffff');
      const k = A.G(cx + 16, cy + 6, z + 40);
      c.fillStyle = '#e0a458'; c.beginPath(); c.moveTo(k.x - 9, k.y - 22); c.lineTo(k.x + 9, k.y - 22); c.lineTo(k.x, k.y); c.fill();
      ['#fff3e0', '#ff8fb3'].forEach((col, i) => { c.fillStyle = col; c.beginPath(); c.arc(k.x, k.y - 28 - i * 10, 10 - i * 2, 0, 7); c.fill(); });
      return { smoke: null };
    },
    pizzeria(A, c, cx, cy, z, run, t){
      A.cyl(c, cx - 30, cy - 30, 8, 46, '#8d8478', z + 40, '#3a2a1a');
      const d = A.dome(c, cx - 8, cy - 8, 42, 64, '#b0a090', z);
      c.fillStyle = '#9a8a7a'; const r = rnd(9); for(let i = 0; i < 16; i++){ c.beginPath(); c.ellipse(d.x - d.rx * 0.7 + r() * d.rx * 1.4, d.by - 8 - r() * 50, 6, 3.5, 0, 0, 7); c.fill(); }
      A.archAt(c, { x: d.x, y: d.by + d.ry - 4 }, 16, 32, '#2b1608', true);
      if(run){ c.fillStyle = '#ffb300'; c.beginPath(); c.moveTo(d.x - 8, d.by + d.ry - 6); c.quadraticCurveTo(d.x, d.by + d.ry - 30 - Math.sin(t * 8) * 4, d.x + 8, d.by + d.ry - 6); c.fill(); }
      A.boxZ(c, cx + 26, cy + 26, 34, 30, 24, '#2e8b57', '#f3e9d2', z);
      const pz = A.G(cx + 43, cy + 41, z + 24); c.fillStyle = '#f2c14e'; c.beginPath(); c.ellipse(pz.x, pz.y, 14, 7, 0, 0, 7); c.fill(); c.fillStyle = '#d62f2f'; [[-5, -1], [4, 1], [0, -3]].forEach(([dx, dy]) => { c.beginPath(); c.arc(pz.x + dx, pz.y + dy, 2.2, 0, 7); c.fill(); });
      return { smoke: run ? A.G(cx - 30, cy - 30, z + 86) : null };
    },
    soupkitchen(A, c, cx, cy, z, run, t){
      const P = (x, y, h) => A.G(x, y, z + h);
      const post = (x, y) => { const b = P(x, y, 0), tp = P(x, y, 88); c.fillStyle = '#6b4220'; c.fillRect(b.x - 3.5, tp.y, 7, b.y - tp.y); };
      post(cx - 44, cy - 40); post(cx + 40, cy - 40);
      // огонь и котёл
      const f = P(cx, cy, 0);
      c.fillStyle = '#5c3416'; [[-14, 0], [10, 2]].forEach(([dx, dy]) => { c.save(); c.translate(f.x + dx, f.y + dy); c.rotate(0.4); c.fillRect(-16, -3, 32, 6); c.restore(); });
      if(run){ for(let i = 0; i < 3; i++){ c.fillStyle = ['#ff7043', '#ffb300', '#ffe082'][i]; c.beginPath(); c.moveTo(f.x - 14 + i * 4, f.y); c.quadraticCurveTo(f.x, f.y - 28 + i * 6 - Math.sin(t * 9 + i) * 4, f.x + 14 - i * 4, f.y); c.fill(); } }
      const pot = A.cyl(c, cx, cy, 28, 30, '#3a3a3a', z + 14, '#e8a33d');
      c.fillStyle = '#7cb342'; c.beginPath(); c.arc(pot.x - 8, pot.y, 3, 0, 7); c.fill(); c.fillStyle = '#e5533d'; c.beginPath(); c.arc(pot.x + 6, pot.y + 2, 3, 0, 7); c.fill();
      post(cx - 44, cy + 36); post(cx + 40, cy + 36);
      const roof = [P(cx - 50, cy - 46, 90), P(cx + 46, cy - 46, 90), P(cx + 46, cy + 42, 90), P(cx - 50, cy + 42, 90)];
      A.poly(c, roof, '#d2691e', A.OL); A.poly(c, [roof[3], roof[2], { x: roof[2].x, y: roof[2].y + 8 }, { x: roof[3].x, y: roof[3].y + 8 }], '#a0501a', A.OL);
      A.poly(c, [roof[2], roof[1], { x: roof[1].x, y: roof[1].y + 8 }, { x: roof[2].x, y: roof[2].y + 8 }], '#7a3c14', A.OL);
      return { smoke: run ? { x: pot.x, y: pot.y - 2 } : null, smokeCol: '#f5f5f5' };
    },
    pastamaker(A, c, cx, cy, z, run, t){
      const bx = cx - 40, by = cy - 30;
      A.boxZ(c, bx, by, 78, 60, 48, '#fff8dc', '#e0c070', z);
      A.faceYZ(c, bx, by, 78, 60, z, 6, 72, 34, 42, '#c0392b');
      [-10, 8].forEach(dy => { const a = A.G(cx - 36, cy + dy, z + 58), b = A.G(cx + 34, cy + dy, z + 58); c.lineCap = 'round'; c.strokeStyle = '#7b7b7b'; c.lineWidth = 15; c.beginPath(); c.moveTo(a.x, a.y); c.lineTo(b.x, b.y); c.stroke(); c.strokeStyle = '#d9d9d9'; c.lineWidth = 6; c.beginPath(); c.moveTo(a.x, a.y - 3); c.lineTo(b.x, b.y - 3); c.stroke(); });
      c.strokeStyle = '#f6c945'; c.lineWidth = 2.5;
      for(let i = 0; i < 7; i++){ const p = A.G(bx + 12 + i * 9, by + 60, z + 30); c.beginPath(); c.moveTo(p.x, p.y); c.quadraticCurveTo(p.x + 4, p.y + 10, p.x, p.y + 20 + (run ? Math.sin(t * 5 + i) * 3 : 0)); c.stroke(); }
      const h = A.G(cx + 38, cy - 20, z + 50); c.strokeStyle = '#555'; c.lineWidth = 4; const a = run ? t * 4 : 0.6; c.beginPath(); c.moveTo(h.x, h.y); c.lineTo(h.x + Math.cos(a) * 14, h.y + Math.sin(a) * 7); c.stroke();
      return { smoke: null };
    },
    fryer(A, c, cx, cy, z, run, t){
      const bx = cx - 38, by = cy - 32;
      A.boxZ(c, bx, by, 76, 64, 44, '#c0c7cf', '#9aa3ad', z);
      c.save(); c.translate(0, -z - 44); c.transform(1, 0.5, -1, 0.5, 0, 0); c.fillStyle = run ? '#ffb300' : '#f4c430'; c.fillRect(bx + 10, by + 10, 56, 44); c.strokeStyle = '#5f6670'; c.lineWidth = 4; c.strokeRect(bx + 10, by + 10, 56, 44); c.restore();
      if(run){ c.fillStyle = '#fff8'; for(let i = 0; i < 5; i++){ const p = A.G(bx + 20 + i * 9, by + 30, z + 46 + Math.abs(Math.sin(t * 7 + i)) * 6); c.beginPath(); c.arc(p.x, p.y, 2.5, 0, 7); c.fill(); } }
      const hb = A.G(bx + 38, by + 32, z + 44); c.strokeStyle = '#333'; c.lineWidth = 4; c.beginPath(); c.moveTo(hb.x, hb.y); c.lineTo(hb.x + 26, hb.y - 26); c.stroke();
      const bag = A.G(cx + 46, cy + 46, z); c.fillStyle = '#e53935'; c.beginPath(); c.moveTo(bag.x - 10, bag.y); c.lineTo(bag.x - 12, bag.y - 22); c.lineTo(bag.x + 12, bag.y - 22); c.lineTo(bag.x + 10, bag.y); c.fill();
      c.fillStyle = '#ffd54f'; for(let i = 0; i < 5; i++) c.fillRect(bag.x - 9 + i * 4, bag.y - 32 + (i % 2) * 3, 3, 12);
      return { smoke: run ? A.G(cx, cy, z + 50) : null, smokeCol: '#fafafa' };
    },
    blender(A, c, cx, cy, z, run, t){
      A.boxZ(c, cx - 28, cy - 28, 52, 52, 30, '#2aa198', '#1e7f78', z);
      A.faceYZ(c, cx - 28, cy - 28, 52, 52, z, 16, 36, 10, 20, '#ffffff', A.OL);
      const lvl = run ? 40 + Math.sin(t * 4) * 4 : 40;
      A.cyl(c, cx - 2, cy - 2, 18, lvl, '#e9334f', z + 32, '#ff6b81');
      c.globalAlpha = 0.45; A.cyl(c, cx - 2, cy - 2, 21, 72, '#d8f0ff', z + 32, '#eaf7ff'); c.globalAlpha = 1;
      A.cyl(c, cx - 2, cy - 2, 22, 8, '#263238', z + 104, '#37474f');
      [['#4caf50', 30, 40], ['#ffb300', 44, 30]].forEach(([col, dx, dy]) => A.cyl(c, cx + dx, cy + dy, 6, 22, col, z, '#ffffff'));
      return { smoke: null };
    },
    saucery(A, c, cx, cy, z, run, t){
      const tank = A.cyl(c, cx - 22, cy - 22, 28, 72, '#b03a2e', z, '#7d241b');
      A.hoop(c, tank, 20, '#7d241b'); A.hoop(c, tank, 52, '#7d241b');
      c.strokeStyle = '#90a4ae'; c.lineWidth = 6; c.lineCap = 'round'; const p1 = A.G(cx - 4, cy - 4, z + 24), p2 = A.G(cx + 20, cy + 20, z + 34); c.beginPath(); c.moveTo(p1.x, p1.y); c.lineTo(p2.x, p2.y); c.stroke();
      A.boxZ(c, cx + 8, cy + 18, 52, 30, 30, '#a86d34', '#c98f4f', z);
      [0, 1, 2, 3].forEach(i => A.cyl(c, cx + 16 + i * 11, cy + 30 - i * 2, 5, 20, i % 2 ? '#e8402d' : '#ff7043', z + 30, '#2b2b2b'));
      return { smoke: run ? A.G(cx - 22, cy - 22, z + 76) : null, smokeCol: '#f5e0dc' };
    },
    sewing(A, c, cx, cy, z, run, t){
      A.boxZ(c, cx - 46, cy - 24, 90, 48, 34, '#a86d34', '#c98f4f', z, true);
      c.save(); c.translate(0, -z - 34); c.transform(1, 0.5, -1, 0.5, 0, 0); c.fillStyle = '#ffd23f'; c.fillRect(cx - 40, cy - 4, 40, 24); c.fillStyle = '#e5533d'; for(let i = 0; i < 4; i++) c.fillRect(cx - 40 + i * 10, cy - 4, 5, 24); c.restore();
      A.boxZ(c, cx - 26, cy - 14, 58, 22, 14, '#3f6fd8', '#5b8def', z + 34);
      A.boxZ(c, cx + 20, cy - 14, 14, 22, 40, '#3f6fd8', '#5b8def', z + 48);
      A.boxZ(c, cx - 24, cy - 14, 58, 22, 14, '#3f6fd8', '#5b8def', z + 88);
      const n = A.G(cx - 18, cy - 3, z + 88); c.strokeStyle = '#ddd'; c.lineWidth = 2; c.beginPath(); c.moveTo(n.x, n.y); c.lineTo(n.x, n.y + 20 + (run ? Math.abs(Math.sin(t * 12)) * 6 : 0)); c.stroke();
      A.cyl(c, cx + 6, cy - 3, 5, 12, '#e5533d', z + 102, '#ffffff');
      const wh = A.G(cx + 36, cy - 3, z + 72); A.wheel(c, wh, 10, '#c0c0c0', t, run);
      return { smoke: null };
    },
  },
});

// Завод = площадка + свой механизм + табличка. Для неизвестного — домик, как раньше.
Art.houseFactory = Art.factory;
Art.factory = function(ctx, x, y, W, H, B, working, time, key){
  const m = this.MACHINES[key];
  if(!m) return this.houseFactory(ctx, x, y, W, H, B, working, time);
  const i = 7, px = x + i, py = y + i, pw = W - i * 2, ph = H - i * 2;
  this.pad(ctx, px, py, pw, ph);
  // механизм чуть крупнее — чтобы заполнял площадку, как в Hay Day
  const o = this.G(x + W / 2, y + H / 2, 10), k = 1.18;
  ctx.save(); ctx.translate(o.x, o.y); ctx.scale(k, k); ctx.translate(-o.x, -o.y);
  const res = m(this, ctx, x + W / 2, y + H / 2, 10, working, time) || {};
  if(res.smoke) this.smokeAt(ctx, res.smoke, time, res.smokeCol);
  ctx.restore();
  this.post(ctx, this.G(px + 10, py + ph - 10, 10), B.e);
};

/* ---------- окрестности хутора: дом фермера, силос, лес вокруг ---------- */
Object.assign(Art, {
  scenery: null,
  makeScenery(){
    const T = TILE, r = rnd(77), back = [], front = [];
    const put = (arr, x, y, kind) => arr.push({ x, y, kind, seed: r() * 10 });
    // лес за задним правым краем (y < 0)
    for(let row = 0; row < 3; row++) for(let x = -2; x < MAP_W + 4; x += 1.7){
      const y = -6.6 - row * 1.6 + (r() - 0.5) * 0.8, xx = x + (r() - 0.5) * 0.9;
      if(row === 0 && xx > 5 && xx < 14.5) continue;   // место для дома фермера
      put(back, xx * T, y * T, r() < 0.35 ? 'pine' : 'oak');
    }
    // лес за левым краем (x < 0), кроме дороги
    for(let row = 0; row < 3; row++) for(let y = -6; y < MAP_H + 4; y += 1.7){
      const x = -9 - row * 1.6 + (r() - 0.5) * 0.8, yy = y + (r() - 0.5) * 0.9;
      if(yy > 4.6 && yy < 9.4) continue;
      put(back, x * T, yy * T, r() < 0.35 ? 'pine' : 'oak');
    }
    // кусты и деревья внизу, за обрывом
    for(let x = 1; x < MAP_W + 3; x += 2.3) put(front, (x + r()) * T, (MAP_H + 2.4 + r() * 1.5) * T, r() < 0.5 ? 'bush' : 'oak');
    for(let y = 1; y < MAP_H; y += 2.3) put(front, (MAP_W + 2.4 + r() * 1.5) * T, (y + r()) * T, r() < 0.5 ? 'bush' : 'oak');
    back.sort((a, b) => (a.x + a.y) - (b.x + b.y)); front.sort((a, b) => (a.x + a.y) - (b.x + b.y));
    this.scenery = { back, front };
  },
  inView(p, v, m = 160){ return p.x > v.x0 - m && p.x < v.x1 + m && p.y > v.y0 - m && p.y < v.y1 + m * 1.5; },
  drawTrees(ctx, list, time, v){
    for(const t of list){
      const p = this.P(t.x, t.y); if(!this.inView(p, v)) continue;
      if(t.kind === 'bush') this.bush(ctx, p.x, p.y, t.seed);
      else this.tree(ctx, p.x, p.y, t.kind, time, t.seed);
    }
  },
  bush(ctx, x, y, seed){
    ctx.fillStyle = '#00000022'; ctx.beginPath(); ctx.ellipse(x + 4, y + 2, 26, 10, 0, 0, 7); ctx.fill();
    const b = [[-12, -10, 12], [10, -10, 12], [0, -18, 14]];
    ctx.fillStyle = '#1f5e25'; b.forEach(([dx, dy, rr]) => { ctx.beginPath(); ctx.arc(x + dx, y + dy, rr + 2, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#3b9a3c'; b.forEach(([dx, dy, rr]) => { ctx.beginPath(); ctx.arc(x + dx, y + dy, rr, 0, 7); ctx.fill(); });
    ctx.fillStyle = '#6cc35a'; ctx.beginPath(); ctx.arc(x - 4, y - 24, 6, 0, 7); ctx.fill();
    if(seed > 5){ ctx.fillStyle = '#ff6b9a'; [[-10, -14], [8, -20], [12, -8]].forEach(([dx, dy]) => { ctx.beginPath(); ctx.arc(x + dx, y + dy, 2.6, 0, 7); ctx.fill(); }); }
  },
  farmhouse(ctx, time){
    const T = TILE, x = 7.6 * T, y = -5.4 * T, W = 4.4 * T, H = 3.6 * T;
    // дорожка к дому
    ctx.save(); ctx.transform(1, 0.5, -1, 0.5, 0, 0); ctx.fillStyle = '#e2c084'; ctx.beginPath(); ctx.roundRect(x + W / 2 - 18, y + H - 4, 36, -y - H + 10, 8); ctx.fill();
    ctx.fillStyle = '#00000020'; ctx.beginPath(); ctx.roundRect(x + 4, y + 10, W + 10, H + 6, 14); ctx.fill(); ctx.restore();
    this.box(ctx, x, y, W, H, 74, '#f6e7c8', '#c8442f', { roofH: 58 });
    this.door(ctx, x, y, W, H, W / 2, 30, 46, '#8c3b2a');
    this.awning(ctx, x, y, W, H, W / 2 - 30, W / 2 + 30, 60, '#2e8b57');
    this.window(ctx, 'y', x, y, W, H, 22, 48, 26, 50, '#2e8b57', true);
    this.window(ctx, 'y', x, y, W, H, W - 48, W - 22, 26, 50, '#2e8b57', true);
    this.window(ctx, 'x', x, y, W, H, 30, 58, 26, 50, '#2e8b57');
    this.window(ctx, 'x', x, y, W, H, H - 58, H - 30, 26, 50, '#2e8b57');
    const ch = this.up(this.P(x + W * 0.25, y + H * 0.3), 74 + 40);
    ctx.fillStyle = '#9c4a32'; ctx.fillRect(ch.x - 8, ch.y - 26, 16, 34); ctx.fillStyle = '#5a3a2a'; ctx.fillRect(ch.x - 10, ch.y - 30, 20, 6);
    this.smokeAt(ctx, { x: ch.x, y: ch.y - 30 }, time * 0.6, '#f2f2f2');
    // почтовый ящик
    const mb = this.P(x + W + 14, y + H + 10); ctx.fillStyle = '#6b4220'; ctx.fillRect(mb.x - 2, mb.y - 30, 4, 30);
    ctx.fillStyle = '#4a90e2'; ctx.beginPath(); ctx.roundRect(mb.x - 9, mb.y - 42, 18, 13, [6, 6, 2, 2]); ctx.fill(); ctx.fillStyle = '#e5533d'; ctx.fillRect(mb.x + 7, mb.y - 46, 3, 10);
  },
  silo(ctx){
    const T = TILE;
    [[1.2, -1.8, 0.85, 120], [3.0, -2.6, 0.7, 100]].forEach(([gx, gy, r, h]) => {
      const s = this.cyl(ctx, gx * T, gy * T, r * T, h, '#a9c4d4', 0, '#8aa6b8');
      ctx.strokeStyle = '#7f98a8'; ctx.lineWidth = 1.5; for(let v = 20; v < h; v += 20){ ctx.beginPath(); ctx.ellipse(s.x, s.by - v, s.rx, s.ry, 0, 0, Math.PI); ctx.stroke(); }
      this.dome(ctx, gx * T, gy * T, r * T, 30, '#c8442f', h);
    });
  },
});
