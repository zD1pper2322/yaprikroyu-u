// 3D-модели заводов «Хуторка»: каждый — свой механизм на каменной площадке 3×3.
import * as THREE from 'three';
import { MODELS, H } from './models.js';
const T = H.T;
const { g, add, rbox, cyl, sph, cone, mat, shade, tex, planksTex, shinglesTex, bricksTex, stoneTex, house, window3, door3, awning3, pad } = H;

const stripesTex = (col, n = 8) => tex('stripes' + col + n, 128, 32, (c, w, h) => { for(let i = 0; i < n; i++){ c.fillStyle = i % 2 ? '#fffaf0' : col; c.fillRect(i * w / n, 0, w / n + 1, h); } });
const halfSph = (r, s = 28) => new T.SphereGeometry(r, s, 16, 0, Math.PI * 2, 0, Math.PI / 2);
const torus = (R, r, a = Math.PI * 2) => new T.TorusGeometry(R, r, 16, 40, a);
const metal = c => mat(c, { r: 0.32, m: 0.55 });
const wood = (c = '#a86d34') => mat(c, { map: planksTex(c, 1, 1) });

// Ларёк: задняя стенка, прилавок, столбики, полосатая наклонная крыша.
function kiosk(p, wall, roof, goods){
  add(p, rbox(1.9, 1.35, 0.3, 0.04), mat(wall, { map: planksTex(wall, 3, 2) }), 1.5, 0.82, 0.75);
  add(p, rbox(1.9, 0.62, 0.7, 0.04), mat(shade(wall, 0.95), { map: planksTex(shade(wall, 0.95), 3, 1) }), 1.5, 0.45, 1.45);
  add(p, rbox(2.0, 0.07, 0.8, 0.02), mat('#f5ead2'), 1.5, 0.79, 1.45);
  [[0.6, 1.85], [2.4, 1.85]].forEach(([x, z]) => add(p, cyl(0.04, 0.04, 1.4, 10), mat('#6b4220'), x, 0.85, z));
  const r = add(p, new T.BoxGeometry(2.2, 0.05, 1.5), mat(roof, { map: stripesTex(roof, 10) }), 1.5, 1.6, 1.3); r.rotation.x = 0.25;
  for(let i = 0; i < 10; i++) add(p, cyl(0.11, 0.11, 0.05, 16, 1, false, 0, Math.PI), mat(i % 2 ? '#fffaf0' : roof), 0.5 + i * 0.22, 1.43, 2.04, Math.PI / 2, 0, 0);
  (goods || []).forEach((fn, i) => fn(p, 0.85 + i * 0.65, 0.83, 1.45));
  return 1.75;
}
// Навес на столбах с полосатым тентом и столом.
function stall(p, roof, tableTop){
  [[0.45, 0.5], [2.55, 0.5], [0.45, 2.5], [2.55, 2.5]].forEach(([x, z]) => add(p, cyl(0.05, 0.05, 1.7, 10), mat('#6b4220'), x, 0.95, z));
  add(p, rbox(1.8, 0.62, 0.9, 0.04), wood(), 1.5, 0.45, 1.5);
  add(p, rbox(1.9, 0.06, 1.0, 0.02), mat(tableTop || '#c98f4f'), 1.5, 0.78, 1.5);
  add(p, new T.BoxGeometry(2.4, 0.08, 2.4), mat(roof, { map: stripesTex(roof, 12) }), 1.5, 1.82, 1.5);
  for(let i = 0; i < 12; i++){ add(p, cyl(0.1, 0.1, 0.06, 16, 1, false, 0, Math.PI), mat(i % 2 ? '#fffaf0' : roof), 0.4 + i * 0.2, 1.74, 2.72, Math.PI / 2, 0, 0); add(p, cyl(0.1, 0.1, 0.06, 16, 1, false, 0, Math.PI), mat(i % 2 ? '#fffaf0' : roof), 2.72, 1.74, 0.4 + i * 0.2, Math.PI / 2, Math.PI / 2, 0); }
  return 0.81;
}
const sack = (p, x, z, col = '#e8d4a8', y = 0.14) => { add(p, sph(0.2, 18, 12), mat(col, { r: 0.95 }), x, y + 0.17, z, 0, 0, 0, [1, 1.1, 0.9]); add(p, cyl(0.06, 0.09, 0.08, 12), mat(shade(col, 0.8)), x, y + 0.4, z); };
const crate = (p, x, z, y = 0.14) => add(p, rbox(0.42, 0.32, 0.42, 0.02), wood('#c98f4f'), x, y + 0.16, z);
function wheel(p, x, y, z, r, col, axis = 'z'){
  const o = g(); add(o, torus(r, r * 0.12), mat(col)); for(let i = 0; i < 6; i++){ const s = add(o, new T.BoxGeometry(r * 2, r * 0.1, r * 0.1), mat(shade(col, 0.8))); s.rotation.z = i * Math.PI / 6 * 1; }
  add(o, cyl(r * 0.18, r * 0.18, r * 0.3, 14), mat('#3a2a1a'), 0, 0, 0, Math.PI / 2);
  o.position.set(x, y, z); if(axis === 'x') o.rotation.y = Math.PI / 2; p.add(o); return o;
}
function oven(p, x, z, r, h, col, fire){
  const d = add(p, halfSph(r), mat(col, { map: bricksTex(col, 3, 2) }), x, 0.14, z, 0, 0, 0, [1, h / r, 1]);
  const a = g(); add(a, cyl(0.24, 0.24, 0.08, 20, 1, false, 0, Math.PI), mat('#2b1608'), 0, 0, 0, Math.PI / 2); add(a, new T.BoxGeometry(0.48, 0.2, 0.08), mat('#2b1608'), 0, -0.1, 0);
  add(a, torus(0.27, 0.04, Math.PI), mat('#fffaf0'), 0, 0, 0.03);
  if(fire){ add(a, sph(0.14, 12, 8), mat('#ffb300', { em: 0xff8a00, emi: 1.2 }), 0, -0.12, 0.02, 0, 0, 0, [1.3, 0.8, 0.4]); }
  a.position.set(x + r * 0.62, 0.36, z + r * 0.62); a.rotation.y = Math.PI / 4; p.add(a);
  return d;
}
function chimney(p, x, z, base, h, col = '#9c4a32'){ add(p, rbox(0.24, h, 0.24, 0.03), mat(col, { map: bricksTex(col, 1, 2) }), x, base + h / 2, z); add(p, rbox(0.32, 0.08, 0.32, 0.02), mat('#4a3020'), x, base + h + 0.04, z); return [x, base + h + 0.1, z]; }
function tank(p, x, z, r, h, col){ add(p, cyl(r, r, h, 32), metal(col), x, 0.14 + h / 2, z); add(p, halfSph(r), metal(shade(col, 1.08)), x, 0.14 + h, z, 0, 0, 0, [1, 0.45, 1]); [0.25, 0.7].forEach(k => add(p, torus(r + 0.01, 0.025), metal(shade(col, 0.75)), x, 0.14 + h * k, z, Math.PI / 2)); }
function bottle(p, x, z, y, col, s = 1){ add(p, cyl(0.07 * s, 0.07 * s, 0.22 * s, 14), mat(col, { r: 0.3 }), x, y + 0.11 * s, z); add(p, cyl(0.03 * s, 0.05 * s, 0.1 * s, 10), mat(col, { r: 0.3 }), x, y + 0.27 * s, z); add(p, cyl(0.032 * s, 0.032 * s, 0.04 * s, 10), mat('#2b2b2b'), x, y + 0.33 * s, z); }
const def = (build, points) => ({ anchor: [1.5, 1.5], points, build(){ const p = g(); pad(p, 3, 3); build(p); return p; } });

Object.assign(MODELS, {
  f_feedmill: def(p => {
    add(p, rbox(1.5, 1.2, 1.4, 0.04), wood('#c98f4f'), 1.4, 0.74, 1.35);
    door3(p, 1.4, 0.4, 0.7, 2.05, '#6b4226');
    add(p, cyl(0.62, 0.28, 0.6, 28, 1, true), mat('#7cb342', { side: T.DoubleSide }), 1.4, 1.65, 1.35);
    add(p, cyl(0.58, 0.58, 0.05, 28), mat('#f2c94c', { r: 0.95 }), 1.4, 1.88, 1.35);
    add(p, torus(0.62, 0.04), mat('#5a8f2a'), 1.4, 1.95, 1.35, Math.PI / 2);
    const ch = add(p, rbox(0.18, 0.7, 0.18, 0.03), wood('#8b5a2b'), 2.25, 0.9, 1.9); ch.rotation.z = -0.6;
    sack(p, 0.55, 2.45); sack(p, 0.95, 2.6, '#d9c08c'); sack(p, 2.5, 2.45); sack(p, 2.55, 2.0, '#d9c08c');
  }),
  f_bakery: def(p => {
    oven(p, 1.3, 1.25, 0.9, 1.25, '#d9733f', true);
    chimney(p, 0.85, 0.75, 0.9, 0.85);
    add(p, rbox(0.85, 0.55, 0.5, 0.03), wood(), 2.35, 0.42, 2.35);
    [[2.15, 2.3], [2.45, 2.4], [2.6, 2.25]].forEach(([x, z]) => add(p, sph(0.13, 14, 10), mat('#d99a4e', { r: 0.6 }), x, 0.78, z, 0, 0.5, 0, [1.4, 0.7, 0.9]));
  }, { smoke: [0.85, 1.95, 0.75] }),
  f_dairy: def(p => {
    tank(p, 0.85, 0.85, 0.5, 1.4, '#cfd8dc'); tank(p, 1.95, 0.65, 0.38, 1.1, '#b0bec5');
    add(p, rbox(1.2, 0.85, 0.9, 0.06), mat('#4a7fb5', { r: 0.5 }), 1.75, 0.57, 1.95);
    add(p, rbox(0.4, 0.3, 0.05, 0.02), mat('#e3f2fd', { r: 0.2 }), 1.55, 0.7, 2.42); add(p, sph(0.06, 10, 8), mat('#7ad04f', { em: 0x7ad04f, emi: 0.5 }), 2.05, 0.75, 2.42);
    const pipe = add(p, cyl(0.06, 0.06, 1.1, 12), metal('#90a4ae'), 1.25, 1.05, 1.4, 0.9, 0, 0.9);
    add(p, cyl(0.15, 0.15, 0.4, 18), metal('#eceff1'), 0.6, 0.34, 2.45); add(p, cyl(0.08, 0.12, 0.12, 14), metal('#eceff1'), 0.6, 0.6, 2.45);
  }, { smoke: [0.85, 1.75, 0.85] }),
  f_sugarmill: def(p => {
    house(p, { x: 0.55, z: 0.5, w: 1.9, d: 1.6, h: 1.0, rh: 0.6, wall: '#f3e6f0', roof: '#b04a8a', noWin: false });
    wheel(p, 1.5, 0.75, 2.2, 0.42, '#b04a8a');
    add(p, cyl(0.38, 0.15, 0.4, 24, 1, true), mat('#b04a8a', { side: T.DoubleSide }), 1.5, 2.0, 1.3); add(p, cyl(0.35, 0.35, 0.04, 24), mat('#ffffff', { r: 1 }), 1.5, 2.17, 1.3);
    sack(p, 2.6, 2.5, '#ffffff'); sack(p, 2.6, 2.05, '#f8e1f0');
  }),
  f_juicer: def(p => {
    add(p, cyl(0.75, 0.68, 0.95, 32), wood('#a0602a'), 1.35, 0.62, 1.3); [0.3, 0.75].forEach(y => add(p, torus(0.73, 0.04), mat('#4a2c16'), 1.35, 0.14 + y, 1.3, Math.PI / 2));
    add(p, cyl(0.7, 0.7, 0.04, 32), mat('#e5533d', { r: 0.2 }), 1.35, 1.08, 1.3);
    add(p, cyl(0.05, 0.05, 0.9, 10), metal('#555'), 1.35, 1.5, 1.3); add(p, cyl(0.04, 0.04, 0.8, 10), metal('#3a3a3a'), 1.35, 1.95, 1.3, 0, 0, Math.PI / 2);
    add(p, rbox(1.0, 0.1, 0.24, 0.02), wood('#6b4220'), 1.35, 1.88, 1.3);
    [0, 1, 2].forEach(i => bottle(p, 2.2 + i * 0.22, 2.4 - i * 0.12, 0.14, '#e8402d'));
  }),
  f_sweets: def(p => {
    add(p, rbox(2.0, 0.6, 1.7, 0.06), mat('#fbe1ea', { map: planksTex('#fbe1ea', 3, 1) }), 1.5, 0.44, 1.45);
    add(p, rbox(0.55, 0.42, 0.05, 0.03), mat('#3a1f10'), 1.5, 0.45, 2.31);
    [[0.7, 0.32, '#ffffff', '#ff8fb3'], [0.5, 0.3, '#ff8fb3', '#ffffff'], [0.3, 0.28, '#ffffff', '#ff5d8f']].forEach(([r, h, side, top], i, arr) => {
      const y = 0.74 + arr.slice(0, i).reduce((a, b) => a + b[1], 0);
      add(p, cyl(r, r, h, 36), mat(side, { r: 0.55 }), 1.5, y + h / 2, 1.45); add(p, cyl(r + 0.02, r + 0.02, 0.05, 36), mat(top, { r: 0.4 }), 1.5, y + h, 1.45);
      for(let k = 0; k < 12; k++){ const a = k / 12 * Math.PI * 2; add(p, sph(0.045, 10, 8), mat(top), 1.5 + Math.cos(a) * r, y + h, 1.45 + Math.sin(a) * r); }
    });
    add(p, sph(0.09, 14, 10), mat('#d62f4b', { r: 0.25 }), 1.5, 1.74, 1.45);
  }),
  f_loom: def(p => {
    const post = (x, z) => add(p, rbox(0.12, 1.55, 0.12, 0.02), wood('#7a4a22'), x, 0.92, z);
    post(0.55, 0.9); post(2.45, 0.9); post(0.55, 2.1); post(2.45, 2.1);
    add(p, cyl(0.07, 0.07, 2.0, 12), wood('#6b4220'), 1.5, 1.62, 0.9, 0, 0, Math.PI / 2); add(p, cyl(0.07, 0.07, 2.0, 12), wood('#6b4220'), 1.5, 0.75, 2.1, 0, 0, Math.PI / 2);
    const cols = ['#6b58b5', '#e5533d', '#ffd23f', '#4caf50', '#4a90e2', '#ff8fb3'];
    for(let i = 0; i < 16; i++){ const x = 0.7 + i * 0.105; const a = new T.Vector3(x, 1.6, 0.9), b = new T.Vector3(x, 0.78, 2.1); const len = a.distanceTo(b); const th = add(p, cyl(0.012, 0.012, len, 6), mat(cols[i % 6]), x, (a.y + b.y) / 2, (a.z + b.z) / 2); th.rotation.x = Math.atan2(b.z - a.z, a.y - b.y); }
    const cloth = add(p, new T.BoxGeometry(1.7, 0.02, 0.6), mat('#8e7cc3'), 1.5, 0.95, 1.8); cloth.rotation.x = -0.6;
    add(p, rbox(0.7, 0.4, 0.4, 0.04), wood(), 2.4, 0.35, 2.6); sack(p, 0.6, 2.6, '#efe9ff');
  }),
  f_popcornpot: def(p => {
    add(p, rbox(1.9, 0.25, 1.6, 0.05), mat('#c0392b'), 1.5, 0.42, 1.5);
    [[0.75, 2.3], [2.25, 2.3], [0.75, 0.7], [2.25, 0.7]].forEach(([x, z]) => { add(p, cyl(0.2, 0.2, 0.08, 20), mat('#2b2b2b'), x, 0.3, z, Math.PI / 2); add(p, cyl(0.08, 0.08, 0.09, 12), mat('#ffd23f'), x, 0.3, z, Math.PI / 2); });
    add(p, cyl(0.68, 0.6, 0.95, 36), mat('#e5533d', { map: stripesTex('#e5533d', 16), r: 0.5 }), 1.5, 1.02, 1.5);
    add(p, torus(0.69, 0.05), metal('#cfd8dc'), 1.5, 1.5, 1.5, Math.PI / 2);
    let s = 5; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
    for(let i = 0; i < 70; i++){ const a = rnd() * 6.28, d = Math.sqrt(rnd()) * 0.62; add(p, new T.IcosahedronGeometry(0.075, 1), mat(rnd() < 0.8 ? '#fffaf0' : '#ffe066', { r: 1 }), 1.5 + Math.cos(a) * d, 1.52 + (0.62 - d) * 0.55 + rnd() * 0.06, 1.5 + Math.sin(a) * d); }
  }),
  f_grill: def(p => {
    add(p, rbox(0.8, 0.6, 0.7, 0.03), wood(), 2.35, 0.45, 2.3);
    [['#e53935', 2.15], ['#fbc02d', 2.35], ['#43a047', 2.55]].forEach(([c, x]) => add(p, sph(0.08, 12, 10), mat(c, { r: 0.4 }), x, 0.82, 2.3, 0, 0, 0, [1.4, 0.8, 0.8]));
    [0, 2.1, 4.2].forEach(a => { const l = add(p, cyl(0.03, 0.03, 0.85, 8), mat('#2b2b2b'), 1.3 + Math.cos(a) * 0.35, 0.55, 1.3 + Math.sin(a) * 0.35); l.rotation.set(Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3); });
    add(p, sph(0.6, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat('#2f2f2f', { r: 0.35, m: 0.3 }), 1.3, 1.05, 1.3, 0, 0, 0, [1, 0.6, 1]);
    add(p, cyl(0.6, 0.6, 0.03, 28), metal('#888'), 1.3, 1.06, 1.3);
    const lid = add(p, halfSph(0.6), mat('#3a3a3a', { r: 0.35, m: 0.3 }), 1.1, 1.25, 1.0, -0.9, 0.6, 0, [1, 0.75, 1]);
    add(p, cyl(0.04, 0.04, 0.12, 8), metal('#ccc'), 0.95, 1.85, 0.75);
  }, { smoke: [1.3, 1.15, 1.3] }),
  f_pieoven: def(p => {
    add(p, rbox(1.8, 1.25, 1.5, 0.05), mat('#b5532c', { map: bricksTex('#b5532c', 4, 3) }), 1.4, 0.77, 1.35);
    add(p, rbox(1.9, 0.12, 1.6, 0.03), mat('#7b6f63', { map: stoneTex(2, 2) }), 1.4, 1.44, 1.35);
    const a = g(); add(a, cyl(0.26, 0.26, 0.06, 20, 1, false, 0, Math.PI), mat('#2b1608'), 0, 0, 0, Math.PI / 2); add(a, new T.BoxGeometry(0.52, 0.3, 0.06), mat('#2b1608'), 0, -0.15, 0); add(a, sph(0.15, 10, 8), mat('#ffb300', { em: 0xff8a00, emi: 1 }), 0, -0.2, 0.02, 0, 0, 0, [1.3, 0.6, 0.3]); a.position.set(1.4, 0.62, 2.11); p.add(a);
    const sm = chimney(p, 0.8, 0.8, 1.5, 0.6, '#7b6f63');
    add(p, cyl(0.25, 0.22, 0.12, 24), mat('#e8b04a', { r: 0.6 }), 2.55, 0.22, 2.5);
  }, { smoke: [0.8, 2.2, 0.8] }),
  f_icecream: def(p => {
    add(p, rbox(1.6, 0.85, 1.0, 0.08), mat('#e3f4fb', { r: 0.4 }), 1.5, 0.75, 1.5);
    add(p, new T.BoxGeometry(1.62, 0.25, 1.02), mat('#ff8fb3'), 1.5, 0.6, 1.5);
    [[0.85, 2.0], [2.15, 2.0], [0.85, 1.0], [2.15, 1.0]].forEach(([x, z]) => add(p, cyl(0.17, 0.17, 0.08, 20), mat('#2b2b2b'), x, 0.3, z, Math.PI / 2));
    add(p, cyl(0.03, 0.03, 1.6, 8), metal('#ccc'), 1.1, 1.75, 1.2);
    add(p, cone(1.0, 0.5, 24), mat('#ff8fb3', { map: stripesTex('#ff8fb3', 16), side: T.DoubleSide }), 1.1, 2.6, 1.2);
    add(p, cone(0.16, 0.4, 16), mat('#e0a458', { r: 0.7 }), 1.95, 1.4, 1.75, Math.PI); add(p, sph(0.19, 16, 12), mat('#fff3e0'), 1.95, 1.66, 1.75); add(p, sph(0.15, 16, 12), mat('#ff8fb3'), 1.95, 1.88, 1.75);
  }),
  f_pizzeria: def(p => {
    oven(p, 1.25, 1.2, 0.85, 1.1, '#a1887f', true);
    chimney(p, 0.75, 0.7, 0.8, 0.8, '#8d8478');
    add(p, rbox(0.8, 0.55, 0.6, 0.03), mat('#2e8b57'), 2.35, 0.42, 2.35);
    add(p, cyl(0.3, 0.3, 0.04, 28), mat('#f2c14e', { r: 0.6 }), 2.35, 0.72, 2.35); [[-0.1, -0.05], [0.12, 0.06], [0, 0.14], [0.1, -0.12]].forEach(([dx, dz]) => add(p, cyl(0.05, 0.05, 0.02, 12), mat('#c62828'), 2.35 + dx, 0.75, 2.35 + dz));
  }, { smoke: [0.75, 1.75, 0.7] }),
  f_soupkitchen: def(p => {
    [[0.45, 0.45], [2.55, 0.45], [0.45, 2.55], [2.55, 2.55]].forEach(([x, z]) => add(p, rbox(0.1, 1.8, 0.1, 0.02), wood('#6b4220'), x, 1.0, z));
    const roof = add(p, rbox(2.5, 0.1, 2.5, 0.03), mat('#d2691e', { map: shinglesTex('#d2691e', 3, 3) }), 1.5, 1.95, 1.5);
    [[-0.2, 0.3], [0.2, -0.3]].forEach(([dx, r]) => add(p, cyl(0.06, 0.06, 0.6, 10), wood('#5c3416'), 1.5 + dx, 0.22, 1.5, 0, r, Math.PI / 2));
    add(p, sph(0.16, 12, 8), mat('#ff9800', { em: 0xff6d00, emi: 1 }), 1.5, 0.3, 1.5, 0, 0, 0, [1.2, 0.8, 1.2]);
    add(p, sph(0.55, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat('#333', { r: 0.4, m: 0.4 }), 1.5, 0.95, 1.5, 0, 0, 0, [1, 0.9, 1]);
    add(p, cyl(0.53, 0.53, 0.03, 28), mat('#e8a33d', { r: 0.3 }), 1.5, 0.93, 1.5); add(p, torus(0.55, 0.04), metal('#555'), 1.5, 0.95, 1.5, Math.PI / 2);
    [['#7cb342', -0.15, 0.1], ['#e5533d', 0.18, -0.1], ['#f08a24', 0.05, 0.2]].forEach(([c, dx, dz]) => add(p, sph(0.05, 8, 6), mat(c), 1.5 + dx, 0.96, 1.5 + dz));
  }, { smoke: [1.5, 1.0, 1.5] }),
  f_pastamaker: def(p => {
    add(p, rbox(1.7, 1.0, 1.3, 0.06), mat('#fff8dc', { r: 0.5 }), 1.5, 0.64, 1.4);
    add(p, new T.BoxGeometry(1.72, 0.15, 1.32), mat('#c0392b'), 1.5, 0.9, 1.4);
    [1.15, 1.6].forEach(z => add(p, cyl(0.17, 0.17, 1.5, 24), metal('#bdbdbd'), 1.5, 1.32, z, 0, 0, Math.PI / 2));
    for(let i = 0; i < 9; i++) add(p, cyl(0.015, 0.015, 0.5, 6), mat('#f6c945'), 0.85 + i * 0.16, 0.65, 2.08, 0.1);
    const cr = add(p, cyl(0.03, 0.03, 0.4, 8), metal('#555'), 2.4, 1.32, 1.2, 0, 0, Math.PI / 2);
    add(p, cyl(0.03, 0.03, 0.3, 8), metal('#555'), 2.6, 1.45, 1.2);
  }),
  f_fryer: def(p => {
    add(p, rbox(1.6, 1.0, 1.3, 0.06), metal('#c0c7cf'), 1.4, 0.64, 1.4);
    add(p, new T.BoxGeometry(1.2, 0.04, 0.9), mat('#f4b400', { r: 0.15, em: 0x7a5000, emi: 0.3 }), 1.4, 1.15, 1.4);
    add(p, new T.BoxGeometry(1.3, 0.08, 1.0), metal('#5f6670'), 1.4, 1.12, 1.4);
    const b = add(p, rbox(0.5, 0.25, 0.4, 0.03), mat('#9e9e9e', { op: 0.85 }), 1.6, 1.25, 1.3);
    add(p, cyl(0.03, 0.03, 0.6, 8), mat('#333'), 2.0, 1.45, 1.3, 0, 0, -0.9);
    add(p, rbox(0.35, 0.4, 0.25, 0.03), mat('#e53935'), 2.55, 0.34, 2.45);
    for(let i = 0; i < 6; i++) add(p, new T.BoxGeometry(0.04, 0.22, 0.04), mat('#ffd54f'), 2.42 + i * 0.05, 0.62, 2.45);
  }, { smoke: [1.4, 1.2, 1.4] }),
  f_blender: def(p => {
    add(p, rbox(1.1, 0.7, 1.1, 0.1), mat('#2aa198', { r: 0.4 }), 1.4, 0.49, 1.4);
    add(p, cyl(0.35, 0.3, 0.9, 28), mat('#e9334f', { r: 0.3 }), 1.4, 1.3, 1.4);
    add(p, cyl(0.44, 0.38, 1.5, 28, 1, true), mat('#d8f0ff', { op: 0.35, r: 0.05, m: 0.1, side: T.DoubleSide }), 1.4, 1.6, 1.4);
    add(p, cyl(0.46, 0.46, 0.14, 28), mat('#263238', { r: 0.4 }), 1.4, 2.4, 1.4);
    [['#4caf50', 2.4, 2.3], ['#ffb300', 2.65, 1.95]].forEach(([c, x, z]) => { add(p, cyl(0.13, 0.11, 0.45, 18), mat(c, { r: 0.4 }), x, 0.37, z); add(p, cyl(0.02, 0.02, 0.3, 6), mat('#fff'), x + 0.04, 0.68, z, 0, 0, 0.2); });
  }),
  f_saucery: def(p => {
    tank(p, 1.0, 1.0, 0.6, 1.35, '#b03a2e');
    add(p, cyl(0.06, 0.06, 1.0, 12), metal('#90a4ae'), 1.75, 0.95, 1.75, 0.7, 0, -0.7);
    add(p, rbox(1.2, 0.6, 0.55, 0.03), wood(), 2.1, 0.44, 2.35);
    [0, 1, 2, 3].forEach(i => bottle(p, 1.65 + i * 0.28, 2.35, 0.74, i % 2 ? '#e8402d' : '#ff7043'));
  }, { smoke: [1.0, 1.75, 1.0] }),
  f_sewing: def(p => {
    add(p, rbox(2.2, 0.7, 1.1, 0.04), wood(), 1.5, 0.49, 1.5);
    add(p, new T.BoxGeometry(1.0, 0.02, 0.8), mat('#ffd23f', { map: stripesTex('#e5533d', 10) }), 1.0, 0.85, 1.5);
    add(p, rbox(1.2, 0.3, 0.45, 0.06), mat('#3f6fd8', { r: 0.35 }), 1.6, 1.0, 1.35);
    add(p, rbox(0.3, 0.75, 0.45, 0.06), mat('#3f6fd8', { r: 0.35 }), 2.05, 1.5, 1.35);
    add(p, rbox(1.2, 0.28, 0.45, 0.08), mat('#3f6fd8', { r: 0.35 }), 1.55, 1.95, 1.35);
    add(p, cyl(0.012, 0.012, 0.35, 6), metal('#ddd'), 1.05, 1.65, 1.35);
    add(p, cyl(0.08, 0.08, 0.2, 16), mat('#e5533d'), 1.6, 2.2, 1.35);
    add(p, torus(0.18, 0.04), metal('#c0c0c0'), 2.25, 1.6, 1.35, 0, Math.PI / 2, 0);
  }),
  f_chocolatier: def(p => {
    add(p, rbox(2.0, 0.55, 1.7, 0.06), mat('#6d4c41', { r: 0.6 }), 1.5, 0.42, 1.45);
    [[0.65, 0.25], [0.45, 0.25], [0.28, 0.22]].forEach(([r, h], i, arr) => { const y = 0.7 + arr.slice(0, i).reduce((a, b) => a + b[1] + 0.12, 0); add(p, cyl(r, r * 0.9, h, 32), mat('#5d4037', { r: 0.25 }), 1.5, y + h / 2, 1.45); add(p, cyl(r * 0.95, r * 0.95, 0.03, 32), mat('#7b3f20', { r: 0.15 }), 1.5, y + h, 1.45); if(i < 2) add(p, cyl(0.05, 0.05, 0.14, 10), metal('#bbb'), 1.5, y + h + 0.07, 1.45); });
    for(let i = 0; i < 10; i++){ const a = i / 10 * Math.PI * 2; add(p, sph(0.03, 8, 6), mat('#6d3b20', { r: 0.2 }), 1.5 + Math.cos(a) * 0.62, 0.86, 1.45 + Math.sin(a) * 0.62, 0, 0, 0, [1, 2.5, 1]); }
    [0, 1, 2].forEach(i => add(p, rbox(0.4, 0.06, 0.18, 0.02), mat('#4e342e'), 2.55, 0.17 + i * 0.07, 2.4 - i * 0.04));
  }),
  f_donutshop: def(p => {
    const y = kiosk(p, '#ffe0ec', '#ff6fa5', [(p, x, y, z) => add(p, torus(0.12, 0.06), mat('#d99a4e'), x, y + 0.06, z, Math.PI / 2), (p, x, y, z) => add(p, rbox(0.3, 0.05, 0.3, 0.02), mat('#e8b04a'), x, y + 0.04, z), (p, x, y, z) => add(p, torus(0.12, 0.06), mat('#ff8fb3'), x, y + 0.06, z, Math.PI / 2)]);
    const d = g(); add(d, torus(0.42, 0.2), mat('#d99a4e', { r: 0.6 })); add(d, torus(0.42, 0.205, Math.PI * 2), mat('#ff8fb3', { r: 0.35 }), 0, 0, 0.02, 0, 0, 0, [1, 1, 0.6]);
    [['#fff', 0.3, 0.3], ['#7ad04f', -0.4, 0.15], ['#4a90e2', 0.1, -0.5], ['#ffd23f', -0.2, -0.35], ['#fff', 0.5, -0.1]].forEach(([c, x, yy]) => add(d, new T.BoxGeometry(0.1, 0.03, 0.03), mat(c), x, yy, 0.17));
    d.position.set(1.5, 2.25, 0.85); d.rotation.set(-0.35, 0.78, 0); p.add(d);
  }),
  f_omeletstation: def(p => {
    add(p, rbox(1.8, 0.9, 1.3, 0.05), mat('#eceff1', { r: 0.4 }), 1.5, 0.59, 1.45);
    [0.95, 2.05].forEach(x => add(p, rbox(0.45, 0.45, 0.04, 0.02), mat('#263238'), x, 0.5, 2.11));
    add(p, cyl(0.42, 0.38, 0.1, 28), mat('#2b2b2b', { r: 0.4 }), 1.1, 1.1, 1.3); add(p, cyl(0.05, 0.05, 0.6, 8), mat('#2b2b2b'), 0.55, 1.12, 1.6, 0, 0.6, Math.PI / 2);
    add(p, cyl(0.28, 0.28, 0.02, 24), mat('#fffaf0'), 1.1, 1.16, 1.3); add(p, sph(0.11, 14, 10), mat('#ffc107', { r: 0.3 }), 1.12, 1.17, 1.3, 0, 0, 0, [1, 0.5, 1]);
    add(p, cyl(0.26, 0.24, 0.4, 24), metal('#b0bec5'), 2.0, 1.25, 1.2); add(p, cyl(0.27, 0.27, 0.04, 24), metal('#cfd8dc'), 2.0, 1.47, 1.2);
    [[2.6, 2.5], [2.45, 2.65]].forEach(([x, z]) => add(p, sph(0.1, 14, 10), mat('#fffaf0'), x, 0.24, z, 0, 0, 0, [0.85, 1.15, 0.85]));
  }, { smoke: [2.0, 1.55, 1.2] }),
  f_saladbar: def(p => {
    const y = stall(p, '#43a047', '#e8f5e9');
    [['#5cbf45', 0.95], ['#9be36a', 1.5], ['#7cb342', 2.05]].forEach(([c, x]) => { add(p, cyl(0.2, 0.13, 0.12, 20), mat('#fffaf0'), x, y + 0.06, 1.5); add(p, sph(0.17, 14, 10), mat(c), x, y + 0.12, 1.5, 0, 0, 0, [1, 0.45, 1]); add(p, sph(0.04, 8, 6), mat('#e53935'), x + 0.06, y + 0.17, 1.52); });
  }),
  f_florist: def(p => {
    const y = stall(p, '#ec407a', '#fce4ec');
    [['#e53950', 0.95], ['#ffd23f', 1.5], ['#ce93d8', 2.05]].forEach(([c, x]) => { add(p, cyl(0.15, 0.12, 0.25, 16), metal('#90a4ae'), x, y + 0.12, 1.5); for(let k = 0; k < 6; k++){ const a = k * 1.05; add(p, sph(0.06, 10, 8), mat(c, { r: 0.5 }), x + Math.cos(a) * 0.09, y + 0.34 + (k % 2) * 0.05, 1.5 + Math.sin(a) * 0.09); } add(p, sph(0.07, 8, 6), mat('#43a047'), x, y + 0.28, 1.5, 0, 0, 0, [1.6, 0.4, 1.6]); });
    [[2.65, 2.75, '#e53950'], [2.75, 0.4, '#ff8fb3']].forEach(([x, z, c]) => { add(p, cyl(0.15, 0.12, 0.28, 16), mat('#b07a45'), x, 0.28, z); for(let k = 0; k < 5; k++) add(p, sph(0.055, 10, 8), mat(c), x + Math.cos(k * 1.3) * 0.08, 0.48, z + Math.sin(k * 1.3) * 0.08); });
  }),
  f_applepress: def(p => {
    [0.7, 2.1].forEach(x => add(p, rbox(0.15, 1.8, 0.15, 0.02), wood('#7a4a22'), x, 1.03, 1.2));
    add(p, rbox(1.7, 0.18, 0.2, 0.03), wood('#5c3416'), 1.4, 1.95, 1.2);
    add(p, cyl(0.52, 0.48, 0.7, 28), wood('#a0602a'), 1.4, 0.5, 1.2); [0.2, 0.55].forEach(y => add(p, torus(0.51, 0.035), mat('#4a2c16'), 1.4, 0.14 + y, 1.2, Math.PI / 2));
    add(p, cyl(0.46, 0.46, 0.08, 24), wood('#6b4220'), 1.4, 1.2, 1.2); add(p, cyl(0.05, 0.05, 0.75, 10), metal('#666'), 1.4, 1.55, 1.2);
    add(p, cyl(0.47, 0.47, 0.03, 24), mat('#c5e1a5', { r: 0.2 }), 1.4, 0.86, 1.2);
    crate(p, 2.35, 2.35); for(let i = 0; i < 6; i++) add(p, sph(0.09, 12, 10), mat('#d32f2f', { r: 0.35 }), 2.22 + (i % 3) * 0.13, 0.52, 2.27 + Math.floor(i / 3) * 0.15);
  }),
  f_burgerstand: def(p => {
    kiosk(p, '#fff3e0', '#e53935', [(p, x, y, z) => add(p, cyl(0.12, 0.12, 0.12, 16), mat('#e8a04a'), x, y + 0.06, z), (p, x, y, z) => add(p, cyl(0.03, 0.03, 0.3, 10), mat('#e53935'), x, y + 0.04, z, 0, 0, Math.PI / 2), (p, x, y, z) => add(p, cyl(0.08, 0.07, 0.22, 12), mat('#e53935'), x, y + 0.11, z)]);
    const b = g(); [[0, 0.1, 0.42, '#d99a4e'], [0.12, 0.08, 0.45, '#5d4037'], [0.19, 0.04, 0.47, '#7cb342'], [0.23, 0.04, 0.46, '#fbc02d'], [0.27, 0.05, 0.44, '#e53935']].forEach(([y, h, r, c]) => add(b, cyl(r, r, h, 28), mat(c, { r: 0.5 }), 0, y + h / 2, 0));
    add(b, sph(0.44, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), mat('#e8a04a', { r: 0.5 }), 0, 0.32, 0, 0, 0, 0, [1, 0.7, 1]);
    for(let i = 0; i < 10; i++){ const a = i * 0.6, d = 0.15 + (i % 3) * 0.08; add(b, sph(0.025, 6, 4), mat('#fff3c4'), Math.cos(a) * d, 0.32 + 0.3 * Math.sqrt(1 - (d / 0.44) ** 2), Math.sin(a) * d, 0, 0, 0, [1.6, 0.6, 1]); }
    b.position.set(1.5, 1.95, 1.0); p.add(b);
  }, { smoke: [2.2, 1.0, 1.4] }),
  f_hatmaker: def(p => {
    add(p, rbox(2.2, 0.62, 0.9, 0.04), wood(), 1.5, 0.45, 1.4);
    [['#f4d03f', '#e53935', 0.75], ['#7e57c2', '#ffd23f', 1.5], ['#4a90e2', '#ffffff', 2.25]].forEach(([c, band, x]) => { add(p, cyl(0.03, 0.03, 0.55, 8), wood('#6b4220'), x, 1.03, 1.4); add(p, cyl(0.36, 0.36, 0.03, 28), mat(c, { r: 0.8 }), x, 1.32, 1.4); add(p, sph(0.2, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), mat(c, { r: 0.8 }), x, 1.32, 1.4, 0, 0, 0, [1, 1.1, 1]); add(p, cyl(0.205, 0.205, 0.06, 20), mat(band), x, 1.37, 1.4); });
    add(p, cyl(0.15, 0.15, 0.3, 18), mat('#ede7f6'), 2.6, 0.29, 2.5);
  }),
  f_tacokitchen: def(p => {
    add(p, rbox(2.1, 1.15, 1.2, 0.12), mat('#ffcc80', { r: 0.4 }), 1.5, 0.95, 1.45);
    add(p, rbox(1.2, 0.5, 0.04, 0.03), mat('#3e2723'), 1.35, 1.05, 2.06); add(p, rbox(1.3, 0.08, 0.25, 0.02), mat('#ef6c00'), 1.35, 0.76, 2.15);
    [[0.75, 2.05], [2.25, 2.05], [0.75, 0.85], [2.25, 0.85]].forEach(([x, z]) => { add(p, cyl(0.2, 0.2, 0.12, 20), mat('#2b2b2b'), x, 0.36, z, Math.PI / 2); add(p, cyl(0.08, 0.08, 0.13, 12), metal('#bbb'), x, 0.36, z, Math.PI / 2); });
    const t = g(); add(t, cyl(0.45, 0.45, 0.14, 28, 1, false, 0, Math.PI), mat('#f6c945', { r: 0.6 }), 0, 0, 0, Math.PI / 2); add(t, cyl(0.38, 0.38, 0.16, 20, 1, false, 0, Math.PI), mat('#7cb342'), 0, 0.05, 0, Math.PI / 2);
    [-0.2, 0, 0.2].forEach(x => add(t, sph(0.07, 10, 8), mat('#e53935'), x, 0.38, 0)); t.position.set(1.5, 1.6, 1.45); t.rotation.y = 0.78; p.add(t);
    chimney(p, 2.3, 1.2, 1.5, 0.3, '#888');
  }, { smoke: [2.3, 1.95, 1.2] }),
  f_coffeeshop: def(p => {
    kiosk(p, '#efebe9', '#5d4037', [(p, x, y, z) => add(p, cyl(0.08, 0.06, 0.14, 14), mat('#fffaf0'), x, y + 0.07, z), (p, x, y, z) => add(p, cyl(0.09, 0.07, 0.22, 14), mat('#d7ccc8'), x, y + 0.11, z), (p, x, y, z) => add(p, sph(0.09, 12, 8), mat('#e0a458'), x, y + 0.05, z, 0, 0, 0, [1.6, 0.6, 1])]);
    add(p, cyl(0.38, 0.3, 0.55, 28), mat('#fffaf0', { r: 0.3 }), 1.4, 2.2, 0.85); add(p, cyl(0.35, 0.35, 0.03, 28), mat('#6d4c41', { r: 0.2 }), 1.4, 2.46, 0.85);
    add(p, torus(0.14, 0.04), mat('#fffaf0', { r: 0.3 }), 1.82, 2.2, 0.95, 0, 0.7, 0);
  }, { smoke: [1.4, 2.5, 0.85] }),
  f_ricecooker: def(p => {
    add(p, rbox(1.6, 0.5, 1.4, 0.08), mat('#80cbc4'), 1.4, 0.39, 1.4);
    add(p, cyl(0.6, 0.6, 0.7, 32), mat('#fafafa', { r: 0.3 }), 1.4, 0.99, 1.4); add(p, new T.CylinderGeometry(0.61, 0.61, 0.08, 32), mat('#26a69a'), 1.4, 0.85, 1.4);
    add(p, halfSph(0.6), mat('#e0e0e0', { r: 0.3, m: 0.2 }), 1.4, 1.34, 1.4, 0, 0, 0, [1, 0.45, 1]); add(p, cyl(0.08, 0.08, 0.08, 14), mat('#424242'), 1.4, 1.64, 1.4);
    add(p, cyl(0.18, 0.12, 0.13, 18), mat('#ef5350'), 2.45, 0.22, 2.45);
    const o = add(p, cone(0.16, 0.24, 3), mat('#fffaf0', { r: 0.9 }), 2.1, 0.27, 2.6); add(p, new T.BoxGeometry(0.15, 0.1, 0.02), mat('#263238'), 2.1, 0.22, 2.69);
  }, { smoke: [1.4, 1.7, 1.4] }),
  f_wok: def(p => {
    add(p, rbox(1.8, 0.85, 1.3, 0.05), mat('#c62828', { r: 0.5 }), 1.5, 0.57, 1.4);
    add(p, new T.BoxGeometry(1.82, 0.06, 1.32), mat('#424242'), 1.5, 1.02, 1.4);
    add(p, sph(0.15, 12, 8), mat('#ff9800', { em: 0xff6d00, emi: 1 }), 1.3, 1.08, 1.35, 0, 0, 0, [1.4, 0.6, 1.4]);
    add(p, sph(0.5, 28, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat('#2b2b2b', { r: 0.35, m: 0.4, side: T.DoubleSide }), 1.3, 1.45, 1.35, 0, 0, 0, [1, 0.5, 1]);
    add(p, cyl(0.42, 0.42, 0.04, 24), mat('#f6c945', { r: 0.5 }), 1.3, 1.36, 1.35); [['#e53935', -0.1, 0.1], ['#7cb342', 0.15, -0.05]].forEach(([c, dx, dz]) => add(p, sph(0.05, 8, 6), mat(c), 1.3 + dx, 1.4, 1.35 + dz));
    add(p, cyl(0.035, 0.035, 0.55, 8), wood('#5c3416'), 1.95, 1.5, 1.35, 0, 0, Math.PI / 2 - 0.2);
    add(p, rbox(0.3, 0.3, 0.3, 0.03), mat('#fffaf0'), 2.55, 0.3, 2.5);
  }, { smoke: [1.3, 1.5, 1.35] }),
  f_teahouse: def(p => {
    house(p, { x: 0.55, z: 0.55, w: 1.9, d: 1.6, h: 0.95, rh: 0.65, wall: '#f9fbe7', roof: '#9e9d24' });
    add(p, sph(0.3, 22, 16), mat('#ffffff', { r: 0.35 }), 2.55, 0.42, 2.5, 0, 0, 0, [1, 0.85, 1]); add(p, cyl(0.03, 0.06, 0.3, 10), mat('#ffffff'), 2.82, 0.48, 2.5, 0, 0, -0.9); add(p, torus(0.12, 0.03, Math.PI), mat('#ffffff'), 2.3, 0.5, 2.5, 0, 0, Math.PI / 2); add(p, sph(0.06, 10, 8), mat('#9e9d24'), 2.55, 0.68, 2.5);
    add(p, sph(0.09, 12, 8), mat('#fdd835'), 2.2, 0.22, 2.75, 0, 0, 0, [1, 1.3, 1]);
  }, { smoke: [2.88, 0.62, 2.5] }),
  f_toyshop: def(p => {
    kiosk(p, '#fff8e1', '#29b6f6', [(p, x, y, z) => add(p, sph(0.1, 12, 8), mat('#ef5350'), x, y + 0.1, z), (p, x, y, z) => add(p, rbox(0.22, 0.22, 0.22, 0.03), mat('#ffd23f'), x, y + 0.11, z), (p, x, y, z) => add(p, sph(0.1, 12, 8), mat('#66bb6a'), x, y + 0.1, z)]);
    const b = g(), fur = mat('#b07a45', { r: 1 }), muz = mat('#e2b98a', { r: 1 });
    add(b, sph(0.32, 20, 16), fur, 0, 0.3, 0, 0, 0, 0, [1, 1.1, 0.9]); add(b, sph(0.24, 20, 16), fur, 0, 0.78, 0); add(b, sph(0.1, 12, 10), muz, 0.18, 0.72, 0.08);
    [-1, 1].forEach(s => { add(b, sph(0.09, 12, 10), fur, -0.05, 0.98, s * 0.17); add(b, sph(0.12, 12, 10), fur, 0.15, 0.4, s * 0.3); add(b, sph(0.025, 8, 6), mat('#111'), 0.2, 0.83, s * 0.08); });
    add(b, sph(0.13, 12, 10), muz, 0.25, 0.28, 0, 0, 0, 0, [0.5, 1, 1]);
    b.position.set(1.5, 1.85, 0.85); b.rotation.y = 0.78; p.add(b);
    const k = add(p, new T.BoxGeometry(0.4, 0.4, 0.02), mat('#ff7043', { side: T.DoubleSide }), 2.6, 2.5, 2.5, 0.2, 0.78, 0.78);
  }),
  f_soapmaker: def(p => {
    add(p, sph(0.62, 28, 14, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), mat('#6a1b9a', { r: 0.4, m: 0.2 }), 1.2, 0.85, 1.2, 0, 0, 0, [1, 1.1, 1]); add(p, torus(0.62, 0.05), mat('#4a148c'), 1.2, 0.85, 1.2, Math.PI / 2);
    add(p, cyl(0.58, 0.58, 0.03, 28), mat('#ce93d8', { r: 0.15 }), 1.2, 0.82, 1.2);
    [[1.0, 1.1, 1.1, 0.12], [1.35, 1.35, 1.25, 0.09], [1.2, 1.6, 1.0, 0.07], [1.5, 1.05, 1.0, 0.1]].forEach(([x, y, z, r]) => add(p, sph(r, 16, 12), mat('#e1f5fe', { op: 0.45, r: 0.05, m: 0.2 }), x, y, z));
    add(p, rbox(1.0, 0.45, 0.6, 0.03), wood(), 2.2, 0.37, 2.35);
    [['#f48fb1', 1.95], ['#80deea', 2.2], ['#fff59d', 2.45]].forEach(([c, x]) => add(p, rbox(0.2, 0.12, 0.26, 0.04), mat(c, { r: 0.4 }), x, 0.66, 2.35));
  }),
});
