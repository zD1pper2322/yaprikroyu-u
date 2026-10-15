// 3D: люди, собака, лодка, сундук, декор, забор, кормушка.
import * as THREE from 'three';
import { MODELS, H } from './models.js';
const T = H.T;
const { g, add, rbox, cyl, sph, cone, mat, shade, tex, planksTex, shinglesTex, stoneTex } = H;
const wood = (c = '#a86d34') => mat(c, { map: planksTex(c, 1, 1) });

// Человечек смотрит в сторону +x. frame 0/1 — шаг.
function person(look, hat, frame){ return { anchor: [0, 0], shadowOpacity: 0.3, build(){ const p = g(), skin = mat('#f2c29b', { r: 0.7 });
  const sw = frame ? 0.35 : -0.35;
  [-1, 1].forEach(s => { const l = g(); add(l, cyl(0.045, 0.045, 0.38, 10), mat(look[1]), 0, -0.19, 0); add(l, rbox(0.14, 0.06, 0.09, 0.03), mat('#3e2723'), 0.03, -0.38, 0); l.position.set(0, 0.42, s * 0.07); l.rotation.z = s * sw; p.add(l); });
  add(p, rbox(0.22, 0.34, 0.26, 0.08), mat(look[0], { r: 0.8 }), 0, 0.6, 0);
  add(p, rbox(0.23, 0.2, 0.27, 0.06), mat(look[1], { r: 0.8 }), 0.005, 0.5, 0);
  [-1, 1].forEach(s => { const a = g(); add(a, cyl(0.035, 0.035, 0.28, 8), mat(look[0]), 0, -0.14, 0); add(a, sph(0.045, 10, 8), skin, 0, -0.29, 0); a.position.set(0, 0.74, s * 0.17); a.rotation.z = -s * sw; p.add(a); });
  add(p, sph(0.13, 20, 16), skin, 0.01, 0.92, 0);
  [-1, 1].forEach(s => add(p, sph(0.018, 8, 6), mat('#222'), 0.12, 0.94, s * 0.045));
  add(p, sph(0.025, 8, 6), mat('#e57373'), 0.135, 0.89, 0);
  if(hat){ add(p, cyl(0.26, 0.26, 0.03, 24), mat('#e8c35a', { r: 0.9 }), 0, 1.0, 0); add(p, cyl(0.13, 0.14, 0.12, 20), mat('#e8c35a', { r: 0.9 }), 0, 1.07, 0); add(p, cyl(0.142, 0.142, 0.04, 20), mat('#c0392b'), 0, 1.03, 0); }
  else add(p, sph(0.14, 18, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat(look[2]), -0.01, 0.94, 0);
  return p; } }; }
const LOOKS = [['#e53935', '#3f6fd8', '#6d4c41'], ['#e53935', '#3949ab', '#6d4c41'], ['#43a047', '#5d4037', '#212121'], ['#8e24aa', '#00897b', '#f9a825'], ['#fb8c00', '#455a64', '#4e342e']];
LOOKS.forEach((lk, i) => [0, 1].forEach(f => { MODELS[`person${i}_${f}`] = person(lk, i === 0, f); }));
[0, 1].forEach(f => { MODELS[`dog_${f}`] = { anchor: [0, 0], shadowOpacity: 0.3, build(){ const p = g(), fur = mat('#a1683f', { r: 0.9 }), lt = mat('#fff3e0', { r: 0.9 });
  const sw = f ? 0.4 : -0.4;
  [[0.15, 0.08], [0.15, -0.08], [-0.15, 0.08], [-0.15, -0.08]].forEach(([x, z], i) => { const l = add(p, cyl(0.03, 0.03, 0.2, 8), mat('#6d4c41'), x, 0.1, z); l.rotation.z = (i % 2 ? 1 : -1) * sw * (x > 0 ? 1 : -1); });
  add(p, rbox(0.45, 0.2, 0.22, 0.09), fur, 0, 0.28, 0); add(p, rbox(0.3, 0.08, 0.16, 0.04), lt, 0.02, 0.2, 0);
  add(p, sph(0.12, 16, 12), fur, 0.27, 0.42, 0); add(p, rbox(0.12, 0.08, 0.1, 0.04), lt, 0.37, 0.38, 0); add(p, sph(0.025, 8, 6), mat('#222'), 0.44, 0.4, 0);
  [-1, 1].forEach(s => { add(p, sph(0.06, 10, 8), mat('#6d4c41'), 0.23, 0.45, s * 0.1, 0, 0, 0, [0.5, 1.1, 0.4]); add(p, sph(0.018, 8, 6), mat('#111'), 0.36, 0.46, s * 0.05); });
  add(p, cyl(0.022, 0.016, 0.2, 8), fur, -0.27, 0.38, 0, 0, 0, 0.8 + sw * 0.5);
  return p; } }; });

MODELS.boat = { anchor: [0, 0], shadow: false, build(){ const p = g();
  const hull = new T.Shape(); hull.moveTo(-1.3, 0.3); hull.lineTo(1.3, 0.3); hull.quadraticCurveTo(1.25, -0.1, 0.95, -0.25); hull.lineTo(-1.0, -0.25); hull.quadraticCurveTo(-1.3, -0.1, -1.3, 0.3);
  const hg = new T.ExtrudeGeometry(hull, { depth: 0.9, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06, bevelSegments: 3 });
  const hm = add(p, hg, mat('#8c3b2a', { map: planksTex('#8c3b2a', 3, 1) }), 0, 0.15, -0.45);
  add(p, rbox(2.5, 0.06, 0.85, 0.02), wood('#c98f4f'), 0, 0.42, 0);
  add(p, new T.BoxGeometry(2.7, 0.06, 0.98), mat('#f2ead8'), 0, 0.47, 0);
  add(p, cyl(0.05, 0.06, 2.1, 12), wood('#6b4220'), 0.15, 1.5, 0);
  const sail = new T.Shape(); sail.moveTo(0, 0); sail.quadraticCurveTo(0.9, 0.8, 0, 1.6); sail.closePath();
  add(p, new T.ShapeGeometry(sail), mat('#fffdf6', { side: T.DoubleSide, r: 0.9 }), 0.2, 0.75, 0.01);
  const s2 = new T.Shape(); s2.moveTo(0, 0); s2.quadraticCurveTo(-0.6, 0.6, 0, 1.3); s2.closePath();
  add(p, new T.ShapeGeometry(s2), mat('#f1efe6', { side: T.DoubleSide, r: 0.9 }), 0.1, 0.85, 0.02);
  const fl = new T.Shape(); fl.moveTo(0, 0); fl.lineTo(0.35, -0.1); fl.lineTo(0, -0.2); add(p, new T.ShapeGeometry(fl), mat('#e5533d', { side: T.DoubleSide }), 0.18, 2.55, 0);
  [-0.85, -0.4, 0.55].forEach((x, i) => add(p, rbox(0.36, 0.3, 0.36, 0.03), wood('#d8a35a'), x, 0.66, i === 1 ? 0.15 : -0.1));
  return p; } };
MODELS.chest = { anchor: [0, 0], build(){ const p = g();
  add(p, rbox(0.55, 0.32, 0.38, 0.04), wood('#8a5a2b'), 0, 0.16, 0);
  add(p, cyl(0.19, 0.19, 0.55, 20, 1, false, 0, Math.PI), wood('#a86d34'), 0, 0.32, 0, 0, 0, Math.PI / 2);
  const gold = mat('#f4c542', { r: 0.25, m: 0.7 });
  [-0.18, 0.18].forEach(x => { add(p, new T.BoxGeometry(0.06, 0.33, 0.4), gold, x, 0.165, 0); add(p, cyl(0.2, 0.2, 0.06, 20, 1, false, 0, Math.PI), gold, x, 0.32, 0, 0, 0, Math.PI / 2); });
  add(p, rbox(0.1, 0.12, 0.04, 0.02), gold, 0, 0.3, 0.2);
  return p; } };
// Декор
MODELS.d_flowers = { anchor: [0.5, 0.5], build(){ const p = g(); add(p, cyl(0.42, 0.45, 0.12, 24), mat('#8a5428'), 0.5, 0.06, 0.5); const cols = ['#ff6b9a', '#ffd23f', '#a78bfa', '#ff8f4a', '#ffffff', '#ff6b9a', '#ffd23f'];
  for(let i = 0; i < 7; i++){ const a = i * 0.9, d = i ? 0.24 : 0, x = 0.5 + Math.cos(a) * d, z = 0.5 + Math.sin(a) * d; add(p, cyl(0.01, 0.01, 0.22, 6), mat('#3f8f35'), x, 0.22, z); add(p, sph(0.06, 8, 6), mat('#3f8f35'), x, 0.17, z, 0, 0, 0, [1.4, 0.4, 1]); for(let k = 0; k < 5; k++){ const b = k * 1.256; add(p, sph(0.035, 8, 6), mat(cols[i]), x + Math.cos(b) * 0.04, 0.34, z + Math.sin(b) * 0.04); } add(p, sph(0.025, 8, 6), mat('#ffe36a'), x, 0.35, z); }
  return p; } };
MODELS.d_sunflower = { anchor: [0.5, 0.5], build(){ const p = g(); [[0.35, 0.4], [0.62, 0.6], [0.5, 0.3]].forEach(([x, z], i) => { const h = 0.7 + i * 0.12; add(p, cyl(0.018, 0.022, h, 8), mat('#3f8f35'), x, h / 2, z); add(p, sph(0.07, 8, 6), mat('#4caf3a'), x, h * 0.5, z + 0.04, 0, 0, 0, [1.4, 0.3, 0.8]); const hd = g(); for(let k = 0; k < 12; k++){ add(hd, sph(0.045, 8, 6), mat('#ffc93a'), Math.cos(k * 0.52) * 0.09, Math.sin(k * 0.52) * 0.09, 0, 0, 0, 0, [1.4, 0.6, 0.3]); } add(hd, cyl(0.07, 0.07, 0.03, 16), mat('#6b4220'), 0, 0, 0.01, Math.PI / 2); hd.position.set(x, h, z); hd.rotation.y = 0.78; hd.rotation.x = -0.3; p.add(hd); }); return p; } };
MODELS.d_bench = { anchor: [1, 0.5], build(){ const p = g(); [[0.4, 0.35], [1.6, 0.35], [0.4, 0.65], [1.6, 0.65]].forEach(([x, z]) => add(p, rbox(0.06, 0.3, 0.06, 0.01), mat('#5c3416'), x, 0.15, z)); add(p, rbox(1.5, 0.06, 0.4, 0.02), wood('#a0693a'), 1, 0.32, 0.5); add(p, rbox(1.5, 0.22, 0.05, 0.02), wood('#8b5a2b'), 1, 0.5, 0.32); [0.4, 1.6].forEach(x => add(p, rbox(0.06, 0.45, 0.06, 0.01), mat('#5c3416'), x, 0.42, 0.32)); return p; } };
MODELS.d_hay = { anchor: [0.5, 0.5], build(){ const p = g(); const hm = mat('#e8c35a', { map: tex('hay2', 64, 64, (c, W, Hh) => { c.fillStyle = '#e8c35a'; c.fillRect(0, 0, W, Hh); c.strokeStyle = '#c99b30'; for(let i = 0; i < 40; i++){ c.beginPath(); c.moveTo((i * 11) % W, 0); c.lineTo((i * 11 + 6) % W, Hh); c.stroke(); } }), r: 1 }); add(p, sph(0.42, 20, 14, 0, Math.PI * 2, 0, Math.PI / 2), hm, 0.5, 0, 0.5, 0, 0, 0, [1, 1.3, 1]); add(p, torus3(0.4), mat('#a8741a'), 0.5, 0.2, 0.5, Math.PI / 2); return p; } };
function torus3(R){ return new T.TorusGeometry(R, 0.02, 8, 32); }
MODELS.d_well = { anchor: [1, 1], build(){ const p = g(); add(p, cyl(0.5, 0.52, 0.45, 28), mat('#9aa3ad', { map: stoneTex(3, 1) }), 1, 0.225, 1); add(p, cyl(0.42, 0.42, 0.02, 24), mat('#3f8fc4', { r: 0.1 }), 1, 0.42, 1);
  [0.45, 1.55].forEach(x => add(p, rbox(0.08, 1.0, 0.08, 0.02), mat('#8b5a2b'), x, 0.7, 1)); add(p, cyl(0.04, 0.04, 1.2, 10), mat('#6b4220'), 1, 1.0, 1, 0, 0, Math.PI / 2);
  [-1, 1].forEach(s => { const r = add(p, rbox(1.4, 0.06, 0.6, 0.02), mat('#bc4b2c', { map: shinglesTex('#bc4b2c', 2, 1) }), 1, 1.33, 1 + s * 0.22); r.rotation.x = s * 0.6; });
  add(p, cyl(0.1, 0.08, 0.14, 14), wood('#8b5a2b'), 1.1, 0.75, 1); return p; } };
MODELS.trough = { anchor: [0.6, 0.25], build(){ const p = g(); add(p, rbox(1.15, 0.24, 0.45, 0.03), wood('#8b5a2b'), 0.6, 0.12, 0.25); add(p, new T.BoxGeometry(1.0, 0.04, 0.32), mat('#e6c35c', { r: 1 }), 0.6, 0.23, 0.25); return p; } };
// Забор: пролёт длиной 1 клетка вдоль x и вдоль z, со столбиком в начале.
function fence(axis){ return { anchor: [0, 0], shadowOpacity: 0.22, build(){ const p = g(), m = wood('#b8783c'), post = mat('#8a5428');
  const L = 1, dir = axis === 'x' ? [1, 0] : [0, 1];
  const pst = (t) => { add(p, rbox(0.1, 0.55, 0.1, 0.02), post, dir[0] * t, 0.275, dir[1] * t); add(p, cone(0.075, 0.08, 4), post, dir[0] * t, 0.59, dir[1] * t, 0, Math.PI / 4, 0); };
  pst(0);
  [0.2, 0.42].forEach(y => { const r = add(p, rbox(L, 0.08, 0.05, 0.02), m, dir[0] * L / 2, y, dir[1] * L / 2); if(axis !== 'x') r.rotation.y = Math.PI / 2; });
  return p; } }; }
MODELS.fence_x = fence('x'); MODELS.fence_z = fence('z');
MODELS.fence_post = { anchor: [0, 0], shadowOpacity: 0.22, build(){ const p = g(), post = mat('#8a5428'); add(p, rbox(0.1, 0.55, 0.1, 0.02), post, 0, 0.275, 0); add(p, cone(0.075, 0.08, 4), post, 0, 0.59, 0, 0, Math.PI / 4, 0); return p; } };
