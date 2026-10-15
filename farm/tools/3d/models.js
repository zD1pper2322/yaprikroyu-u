// 3D-модели «Хуторка». 1 единица = 1 клетка; x и z — как x и y на карте игры, y — вверх.
import * as THREE from 'three';
import { RoundedBoxGeometry } from '../tjs/examples/jsm/geometries/RoundedBoxGeometry.js';
// Все «коробки» чуть скруглены по рёбрам — мягкие игрушечные формы, как в Hay Day.
class SoftBox extends RoundedBoxGeometry { constructor(w = 1, h = 1, d = 1){ const m = Math.min(w, h, d); super(w, h, d, 2, Math.max(0.0005, Math.min(m * 0.22, 0.045, m / 2 - 0.0005))); } }
const T = { ...THREE, BoxGeometry: SoftBox };
export const MODELS = {};

/* ---------- материалы и текстуры ---------- */
const texCache = new Map();
function tex(key, w, h, draw, rx = 1, ry = 1){
  const k = key + rx + 'x' + ry;
  if(texCache.has(k)) return texCache.get(k);
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h;
  draw(cv.getContext('2d'), w, h);
  const t = new T.CanvasTexture(cv); t.colorSpace = T.SRGBColorSpace; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 8;
  texCache.set(k, t); return t;
}
const shade = (hex, k) => { const c = new T.Color(hex); c.multiplyScalar(k); return '#' + c.getHexString(); };
function planksTex(col, rx, ry){ return tex('pl' + col, 128, 128, (c, w, h) => { c.fillStyle = col; c.fillRect(0, 0, w, h); for(let i = 0; i < 4; i++){ c.fillStyle = shade(col, 0.9 + (i % 2) * 0.08); c.fillRect(i * 32, 0, 32, h); c.fillStyle = shade(col, 0.72); c.fillRect(i * 32, 0, 2, h); } for(let i = 0; i < 18; i++){ c.fillStyle = shade(col, 0.82); c.fillRect((i * 37) % w, (i * 53) % h, 1.5, 6); } }, rx, ry); }
function shinglesTex(col, rx, ry){ return tex('sh' + col, 128, 128, (c, w, h) => { c.fillStyle = shade(col, 0.85); c.fillRect(0, 0, w, h); for(let r = 0; r < 6; r++) for(let i = -1; i < 6; i++){ const x = i * 26 + (r % 2) * 13, y = r * 22; c.fillStyle = shade(col, 0.92 + ((i + r) % 3) * 0.06); c.beginPath(); c.moveTo(x, y); c.lineTo(x + 26, y); c.lineTo(x + 26, y + 16); c.quadraticCurveTo(x + 13, y + 26, x, y + 16); c.closePath(); c.fill(); c.strokeStyle = shade(col, 0.7); c.lineWidth = 1.5; c.stroke(); } }, rx, ry); }
function bricksTex(col, rx, ry){ return tex('br' + col, 128, 128, (c, w, h) => { c.fillStyle = '#d9cbb5'; c.fillRect(0, 0, w, h); for(let r = 0; r < 8; r++) for(let i = -1; i < 5; i++){ c.fillStyle = shade(col, 0.88 + ((i * 7 + r * 3) % 5) * 0.05); c.fillRect(i * 32 + (r % 2) * 16 + 1.5, r * 16 + 1.5, 29, 13); } }, rx, ry); }
function stoneTex(rx, ry){ return tex('st', 128, 128, (c, w, h) => { c.fillStyle = '#b8b0a2'; c.fillRect(0, 0, w, h); for(let r = 0; r < 4; r++) for(let i = 0; i < 4; i++){ c.fillStyle = shade('#cfc7b8', 0.9 + ((i + r * 2) % 4) * 0.05); c.beginPath(); c.roundRect(i * 32 + (r % 2) * 10 + 2, r * 32 + 2, 28, 28, 6); c.fill(); } }, rx, ry); }
function soilTex(){ return tex('soil2', 128, 128, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); for(let i = 0; i < 260; i++){ c.fillStyle = ['#ecdccb', '#f6eee4', '#e2cdb6', '#fff8ee'][i % 4]; c.beginPath(); c.arc((i * 73) % w, (i * 151) % h, 1 + (i % 3), 0, 7); c.fill(); } }); }
const MAT = new Map();
// Лёгкое «зерно» на всех поверхностях — как нарисованные текстуры, а не пластик.
function grainTex(){ return tex('grain', 128, 128, (c, w, h) => { const im = c.createImageData(w, h); for(let i = 0; i < w * h; i++){ const v = 238 + Math.floor(Math.random() * 18); im.data[i * 4] = v; im.data[i * 4 + 1] = v; im.data[i * 4 + 2] = v; im.data[i * 4 + 3] = 255; } c.putImageData(im, 0, 0); c.globalAlpha = 0.12; for(let i = 0; i < 40; i++){ c.fillStyle = Math.random() < 0.5 ? '#ffffff' : '#cfcfcf'; c.beginPath(); c.arc(Math.random() * w, Math.random() * h, 4 + Math.random() * 10, 0, 7); c.fill(); } }, 2, 2); }
function mat(col, o = {}){
  const k = col + JSON.stringify(o);
  if(MAT.has(k) && !o.map) return MAT.get(k);
  const m = new T.MeshStandardMaterial({ color: col, roughness: o.r ?? 0.78, metalness: o.m ?? 0, map: o.map || (o.op !== undefined || o.noGrain ? null : grainTex()), transparent: o.op !== undefined, opacity: o.op ?? 1, emissive: o.em || 0x000000, emissiveIntensity: o.emi ?? 1, flatShading: !!o.flat, side: o.side || T.FrontSide });
  if(!o.map) MAT.set(k, m); return m;
}
const g = () => new T.Group();
function add(parent, geo, m, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, s){ const o = new T.Mesh(geo, m); o.position.set(x, y, z); o.rotation.set(rx, ry, rz); if(s) o.scale.set(...s); parent.add(o); return o; }
const rbox = (w, h, d, r = 0.04) => new RoundedBoxGeometry(w, h, d, 3, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001));
const cyl = (rt, rb, h, s = 28, hs = 1, open = false, ts = 0, tl = Math.PI * 2) => new T.CylinderGeometry(rt, rb, h, s, hs, open, ts, tl);
const sph = (r, ws = 24, hs = 16, ps = 0, pl = Math.PI * 2, ts = 0, tl = Math.PI) => new T.SphereGeometry(r, ws, hs, ps, pl, ts, tl);
const cone = (r, h, s = 24) => new T.ConeGeometry(r, h, s);

/* ---------- части домов ---------- */
// Окно на передней (+z) или правой (+x) стене: рама, стекло, переплёт, ставни, ящик с цветами.
function window3(p, face, cx, cy, w, h, wallPos, shutter, flowers){
  const o = g(), t = 0.06;
  add(o, rbox(w + 0.1, h + 0.1, t, 0.02), mat('#fffaf0'));
  add(o, new T.BoxGeometry(w, h, t + 0.01), mat('#6fb8e0', { r: 0.15, m: 0.1 }));
  add(o, new T.BoxGeometry(w, 0.035, t + 0.03), mat('#fffaf0'));
  add(o, new T.BoxGeometry(0.035, h, t + 0.03), mat('#fffaf0'));
  add(o, new T.BoxGeometry(w * 0.4, h * 0.42, t + 0.02), mat('#bfe6f7', { r: 0.1 }), -w * 0.22, h * 0.2, 0.001);
  if(shutter){ [-1, 1].forEach(s => add(o, rbox(w * 0.38, h + 0.06, 0.04, 0.015), mat(shutter), s * (w / 2 + w * 0.22), 0, 0)); }
  if(flowers){ add(o, rbox(w + 0.12, 0.09, 0.12, 0.02), mat('#8b5a2b'), 0, -h / 2 - 0.07, 0.05);
    for(let i = 0; i < 5; i++){ add(o, sph(0.045, 10, 8), mat('#3f9a32'), -w / 2 + 0.05 + i * (w - 0.1) / 4, -h / 2 + 0.0, 0.06); add(o, sph(0.035, 10, 8), mat(['#ff5d8f', '#ffd23f', '#ffffff', '#ff8a3d', '#b39ddb'][i]), -w / 2 + 0.05 + i * (w - 0.1) / 4, -h / 2 + 0.05, 0.08); } }
  if(face === 'z'){ o.position.set(cx, cy, wallPos + 0.02); }
  else { o.rotation.y = Math.PI / 2; o.position.set(wallPos + 0.02, cy, cx); }
  p.add(o); return o;
}
function door3(p, cx, w, h, z, col){
  add(p, rbox(w + 0.12, h + 0.08, 0.05, 0.02), mat('#fffaf0'), cx, h / 2 + 0.04, z + 0.01);
  const d = add(p, rbox(w, h, 0.07, 0.02), mat(col, { map: planksTex(col, 1, 1) }), cx, h / 2, z + 0.03);
  add(p, sph(0.03), mat('#f4c542', { r: 0.3, m: 0.6 }), cx + w * 0.32, h * 0.5, z + 0.08);
  return d;
}
// Двускатная крыша с коньком вдоль x.
function gableRoof(p, x0, x1, z0, z1, y, rh, col, ov = 0.14){
  const len = x1 - x0 + ov * 2, half = (z1 - z0) / 2 + ov, slope = Math.hypot(half, rh), ang = Math.atan2(rh, half), cz = (z0 + z1) / 2, th = 0.1;
  const m = mat(col, { map: shinglesTex(col, len * 1.6, slope * 1.6) });
  [-1, 1].forEach(s => {
    const o = add(p, rbox(len, th, slope, 0.03), m, (x0 + x1) / 2, y + rh / 2, cz + s * half / 2);
    o.rotation.x = s * ang;
  });
  add(p, cyl(0.07, 0.07, len + 0.04, 16), mat(shade(col, 0.7)), (x0 + x1) / 2, y + rh + 0.03, cz, 0, 0, Math.PI / 2);
  // фронтоны
  const sh = new T.Shape(); sh.moveTo(-(z1 - z0) / 2, 0); sh.lineTo((z1 - z0) / 2, 0); sh.lineTo(0, rh); sh.closePath();
  const eg = new T.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false });
  return { eg, cz, ang };
}
// Домик: фундамент, стены из досок, угловые планки, крыша, дверь, окна.
function house(p, o){
  const { x = 0, z = 0, w, d, h, rh, wall, roof, door = true, doorCol, chimney, noWin, foundation = true, winShutter } = o;
  const fh = foundation ? 0.14 : 0;
  if(foundation) add(p, rbox(w + 0.06, fh, d + 0.06, 0.03), mat('#a89f90', { map: stoneTex(w, 0.3) }), x + w / 2, fh / 2, z + d / 2);
  add(p, new T.BoxGeometry(w, h, d), mat(wall, { map: planksTex(wall, w * 1.6, h * 1.2) }), x + w / 2, fh + h / 2, z + d / 2);
  [[x, z], [x + w, z], [x, z + d], [x + w, z + d]].forEach(([cx, cz]) => add(p, new T.BoxGeometry(0.07, h, 0.07), mat('#fffaf0'), cx, fh + h / 2, cz));
  add(p, new T.BoxGeometry(w + 0.04, 0.06, d + 0.04), mat(shade(wall, 0.8)), x + w / 2, fh + h - 0.03, z + d / 2);
  const r = gableRoof(p, x, x + w, z, z + d, fh + h, rh, roof);
  [x - 0.001, x + w - 0.04].forEach(gx => { const gm = add(p, r.eg, mat(wall, { map: planksTex(wall, 2, 1) }), gx, fh + h, r.cz); gm.rotation.y = Math.PI / 2; gm.position.x = gx + 0.04; });
  // круглое окошко во фронтоне
  add(p, cyl(0.13, 0.13, 0.05, 20), mat('#fffaf0'), x + w + 0.02, fh + h + rh * 0.38, z + d / 2, 0, 0, Math.PI / 2);
  add(p, cyl(0.09, 0.09, 0.06, 20), mat('#6fb8e0', { r: 0.15 }), x + w + 0.03, fh + h + rh * 0.38, z + d / 2, 0, 0, Math.PI / 2);
  if(door) door3(p, x + w / 2, Math.min(0.42, w * 0.3), Math.min(0.72, h * 0.8), z + d, doorCol || shade(roof, 0.85));
  if(!noWin){
    if(w > 1.4){ window3(p, 'z', x + w * 0.18, fh + h * 0.55, 0.32, 0.3, z + d, winShutter, true); window3(p, 'z', x + w * 0.82, fh + h * 0.55, 0.32, 0.3, z + d, winShutter, true); }
    window3(p, 'x', z + d * 0.3, fh + h * 0.55, 0.32, 0.3, x + w, winShutter); if(d > 1.4) window3(p, 'x', z + d * 0.72, fh + h * 0.55, 0.32, 0.3, x + w, winShutter);
  }
  if(chimney){ const [cx, cz] = chimney; add(p, rbox(0.26, rh + 0.6, 0.26, 0.03), mat('#a0503a', { map: bricksTex('#a0503a', 1, 2) }), x + cx, fh + h + rh * 0.5 + 0.1, z + cz); add(p, rbox(0.34, 0.08, 0.34, 0.02), mat('#5a3a2a'), x + cx, fh + h + rh + 0.42, z + cz); }
  return fh + h;
}
// Полосатый навес.
function awning3(p, cx, z, y, w, col){
  const n = 6, o = g();
  for(let i = 0; i < n; i++){ const s = add(o, new T.BoxGeometry(w / n, 0.03, 0.38), mat(i % 2 ? '#fffaf0' : col), -w / 2 + (i + 0.5) * w / n, 0, 0.19); }
  for(let i = 0; i < n; i++) add(o, cyl(w / n / 2, w / n / 2, 0.03, 16, 1), mat(i % 2 ? '#fffaf0' : col), -w / 2 + (i + 0.5) * w / n, -0.005, 0.38);
  o.rotation.x = 0.42; o.position.set(cx, y, z); p.add(o); return o;
}
// Каменная площадка под завод.
function pad(p, w, d){ add(p, rbox(w - 0.16, 0.14, d - 0.16, 0.05), mat('#cfc6b4', { map: stoneTex(w, d) }), w / 2, 0.07, d / 2); }
// Табличка-столбик со значком (значок рисуется в игре).

/* ================= грядки и урожай ================= */
function bed(p){
  // мягкая земляная грядка: тёплая светлая земля и пухлые бороздки
  add(p, rbox(1.86, 0.16, 1.86, 0.08), mat('#7a4c28', { noGrain: true }), 1, 0.08, 1);
  add(p, rbox(1.74, 0.06, 1.74, 0.03), mat('#94603a', { map: soilTex() }), 1, 0.17, 1);
  for(let i = 0; i < 4; i++) add(p, new T.CapsuleGeometry(0.11, 1.4, 6, 16), mat('#9e6a40', { map: soilTex() }), 1, 0.2, 0.3 + i * 0.465, 0, 0, Math.PI / 2, [1, 1, 0.55]);
}
const CROP_PTS = []; for(let j = 0; j < 4; j++) for(let i = 0; i < 4; i++) CROP_PTS.push([0.3 + i * 0.465 + (j % 2) * 0.08, 0.3 + j * 0.465]);
function sprout(p, x, z, y){ [-1, 1].forEach(s => add(p, sph(0.05, 10, 8), mat('#6cbf3a'), x + s * 0.04, y + 0.06, z, 0, 0, s * 0.6, [1, 0.45, 0.7])); add(p, cyl(0.01, 0.012, 0.08, 6), mat('#5aa830'), x, y + 0.03, z); }
const CROPS3 = {
  wheat(p, x, z, y, st){ const h = [0, 0.28, 0.45, 0.55][st], col = st === 3 ? '#e9b93e' : '#7cc63f';
    for(let k = 0; k < 7; k++){ const a = k * 0.9, r = k ? 0.075 : 0, dx = Math.cos(a) * r, dz = Math.sin(a) * r, hh = h * (k ? 0.88 + (k % 3) * 0.06 : 1);
      add(p, cyl(0.016, 0.022, hh, 6), mat(col), x + dx, y + hh / 2, z + dz, dz * 2.2, 0, -dx * 2.2);
      if(st >= 2) add(p, sph(0.05, 12, 10), mat(st === 3 ? '#f7cf52' : '#a8d65a', { r: 0.6 }), x + dx * 1.9, y + hh + 0.05, z + dz * 1.9, dz * 2.2, 0, -dx * 2.2, [0.75, 1.9, 0.75]); } },
  corn(p, x, z, y, st){ const h = [0, 0.4, 0.7, 0.85][st]; add(p, cyl(0.025, 0.035, h, 8), mat('#5aa830'), x, y + h / 2, z);
    for(let k = 0; k < 3; k++){ const a = k * 2.1; add(p, sph(0.12, 10, 6), mat('#6cbf3a'), x + Math.cos(a) * 0.09, y + h * (0.35 + k * 0.2), z + Math.sin(a) * 0.09, 0, a, 0.9, [1, 0.12, 0.35]); }
    if(st === 3){ add(p, sph(0.06, 12, 10), mat('#f6c945'), x + 0.06, y + h * 0.55, z + 0.03, 0, 0, -0.3, [0.8, 1.8, 0.8]); add(p, sph(0.06, 10, 8), mat('#8bc34a'), x + 0.05, y + h * 0.5, z + 0.05, 0, 0, -0.3, [0.7, 1.6, 0.5]); } },
  carrot(p, x, z, y, st){ const k = [0, 0.5, 0.8, 1][st]; for(let i = 0; i < 4; i++){ const a = i * 1.57; add(p, sph(0.07, 8, 6), mat('#4caf3a'), x + Math.cos(a) * 0.04, y + 0.1 * k, z + Math.sin(a) * 0.04, Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5, [0.45 * k, 1.8 * k, 0.45 * k]); }
    if(st === 3) add(p, sph(0.065, 14, 10), mat('#f5891f', { r: 0.5 }), x, y + 0.04, z, 0, 0, 0, [1, 0.8, 1]); },
  cane(p, x, z, y, st){ const h = [0, 0.35, 0.6, 0.8][st]; [-0.04, 0.04].forEach(dx => { for(let s = 0; s < 4; s++) add(p, cyl(0.022, 0.022, h / 4 - 0.01, 8), mat(st === 3 ? '#a4d65e' : '#6fb53e'), x + dx, y + h / 8 + s * h / 4, z + dx * 0.5); }); add(p, sph(0.1, 8, 6), mat('#5aa830'), x, y + h, z, 0, 0, 0.6, [1, 0.15, 0.3]); },
  tomato(p, x, z, y, st){ const k = [0, 0.55, 0.85, 1][st]; add(p, sph(0.13 * k, 12, 10), mat('#3f9a32'), x, y + 0.13 * k, z); add(p, sph(0.09 * k, 12, 10), mat('#56b443'), x - 0.04, y + 0.2 * k, z + 0.03);
    if(st === 3) [[0.08, 0.1, 0.05], [-0.06, 0.08, 0.08], [0.02, 0.2, 0.09]].forEach(([dx, dy, dz]) => add(p, sph(0.05, 12, 10), mat('#e8402d', { r: 0.4 }), x + dx, y + dy, z + dz)); },
  strawberry(p, x, z, y, st){ const k = [0, 0.55, 0.85, 1][st]; add(p, sph(0.12 * k, 12, 8), mat('#3f9a32'), x, y + 0.05 * k, z, 0, 0, 0, [1, 0.6, 1]);
    if(st === 3) [[0.08, 0.06], [-0.06, 0.09], [0.03, -0.08]].forEach(([dx, dz]) => add(p, cone(0.035, 0.07, 10), mat('#e9334f', { r: 0.45 }), x + dx, y + 0.06, z + dz, Math.PI)); },
  pumpkin(p, x, z, y, st){ const k = [0, 0.5, 0.8, 1][st]; add(p, sph(0.1 * k, 10, 8), mat('#5fb03a'), x - 0.05, y + 0.04, z, 0, 0, 0, [1.2, 0.5, 1]);
    if(st === 3){ const pm = add(p, sph(0.1, 16, 12), mat('#f08b1c', { r: 0.5 }), x + 0.03, y + 0.07, z + 0.02, 0, 0, 0, [1.25, 0.85, 1.25]); add(p, cyl(0.012, 0.015, 0.05, 6), mat('#6b8e23'), x + 0.03, y + 0.16, z + 0.02); } },
  potato(p, x, z, y, st){ const k = [0, 0.55, 0.85, 1][st]; add(p, sph(0.12 * k, 12, 8), mat('#3f9a32'), x, y + 0.1 * k, z); add(p, sph(0.08 * k, 10, 8), mat('#5cbf45'), x + 0.05, y + 0.14 * k, z - 0.03);
    if(st >= 2) add(p, sph(0.025, 8, 6), mat('#e8dcff'), x - 0.02, y + 0.22 * k, z + 0.05);
    if(st === 3) [[-0.1, 0.06], [0.1, 0.08]].forEach(([dx, dz]) => add(p, sph(0.05, 10, 8), mat('#c99a5b'), x + dx, y + 0.02, z + dz, 0, 0, 0, [1.3, 0.8, 1])); },
  pepper(p, x, z, y, st){ const k = [0, 0.55, 0.85, 1][st]; add(p, cyl(0.015, 0.02, 0.25 * k, 6), mat('#3f8a2a'), x, y + 0.12 * k, z); add(p, sph(0.11 * k, 12, 8), mat('#4caf3a'), x, y + 0.25 * k, z);
    if(st === 3) ['#e53935', '#fbc02d', '#43a047'].forEach((c, i) => add(p, sph(0.04, 10, 8), mat(c, { r: 0.35 }), x - 0.07 + i * 0.07, y + 0.16, z + 0.08, 0, 0, 0, [0.8, 1.4, 0.8])); },
  cotton(p, x, z, y, st){ const h = [0, 0.25, 0.4, 0.5][st]; for(let i = -1; i <= 1; i++) add(p, cyl(0.01, 0.014, h, 6), mat('#6b8e3a'), x + i * 0.04, y + h / 2, z, 0, 0, -i * 0.25);
    add(p, sph(0.07, 8, 6), mat('#5c9a36'), x, y + h * 0.6, z, 0, 0, 0.5, [1, 0.4, 0.6]);
    if(st === 3) [[-0.06, 0], [0.06, 0.02], [0, 0.06]].forEach(([dx, dy]) => add(p, sph(0.055, 12, 10), mat('#ffffff', { r: 0.95 }), x + dx, y + h + dy, z)); },
  onion(p, x, z, y, st){ const h = [0, 0.2, 0.32, 0.38][st]; for(let i = -1; i <= 1; i++) add(p, cyl(0.012, 0.016, h, 6), mat('#4caf3a'), x + i * 0.03, y + h / 2, z, 0, 0, -i * 0.15);
    if(st === 3) add(p, sph(0.065, 12, 10), mat('#c77dbe', { r: 0.45 }), x, y + 0.03, z, 0, 0, 0, [1, 0.85, 1]); },
  lettuce(p, x, z, y, st){ const k = [0, 0.5, 0.8, 1][st]; add(p, sph(0.13 * k, 14, 10), mat('#5cbf45'), x, y + 0.08 * k, z, 0, 0, 0, [1, 0.75, 1]); add(p, sph(0.08 * k, 12, 8), mat('#9be36a'), x, y + 0.13 * k, z); },
  rice(p, x, z, y, st){ const h = [0, 0.25, 0.4, 0.48][st]; for(let i = 0; i < 6; i++){ const a = i * 1.05; add(p, cyl(0.007, 0.01, h, 5), mat(st === 3 ? '#c9b458' : '#7cb342'), x + Math.cos(a) * 0.04, y + h / 2, z + Math.sin(a) * 0.04, Math.sin(a) * 0.3, 0, -Math.cos(a) * 0.3);
    if(st === 3) add(p, sph(0.025, 8, 6), mat('#f3e3a0'), x + Math.cos(a) * 0.1, y + h, z + Math.sin(a) * 0.1, 0, 0, 0, [0.6, 1.6, 0.6]); } },
};
function bushCrop(fruit, tall, small){ return (p, x, z, y, st) => { const k = [0, 0.55, 0.85, 1][st];
  if(tall){ add(p, cyl(0.02, 0.03, 0.25 * k, 8), mat('#7a4a24'), x, y + 0.12 * k, z); }
  add(p, sph(0.15 * k, 14, 10), mat('#2f8a34'), x, y + (tall ? 0.33 : 0.13) * k, z); add(p, sph(0.09 * k, 12, 8), mat('#4caf3a'), x - 0.05, y + (tall ? 0.4 : 0.18) * k, z + 0.04);
  if(st === 3) [[0.1, 0.0, 0.06], [-0.08, 0.06, 0.08], [0.03, 0.12, 0.11], [0.09, 0.1, -0.04]].forEach(([dx, dy, dz]) => add(p, sph(small ? 0.028 : 0.045, 10, 8), mat(fruit, { r: 0.4 }), x + dx, y + (tall ? 0.32 : 0.12) + dy, z + dz, 0, 0, 0, fruit === '#fdd835' ? [1, 1.3, 1] : undefined)); }; }
CROPS3.rose = bushCrop('#e53950', false); CROPS3.apple = bushCrop('#d32f2f', true); CROPS3.lemon = bushCrop('#fdd835', true); CROPS3.coffee = bushCrop('#8d3b1f', false, true);
MODELS.plot = { anchor: [1, 1], build(){ const p = g(); bed(p); return p; } };
for(const kind of Object.keys(CROPS3).concat(['rose', 'apple', 'lemon', 'coffee'])){
  for(let st = 0; st < 4; st++){
    MODELS[`crop_${kind}_${st}`] = { anchor: [1, 1], build(){ const p = g(); bed(p); CROP_PTS.forEach(([x, z], i) => { const pp = g(); pp.rotation.y = (i * 1.7) % 6.28; pp.position.set(x, 0, z); p.add(pp); if(st === 0) sprout(pp, 0, 0, 0.23); else CROPS3[kind](pp, 0, 0, 0.23, st); }); return p; } };
  }
}

/* ================= постройки хутора ================= */
MODELS.storage = { anchor: [1.5, 1.5], build(){
  const p = g(), x = 0.12, z = 0.12, w = 2.76, d = 2.76, h = 1.35, fh = 0.14;
  add(p, rbox(w + 0.06, fh, d + 0.06, 0.03), mat('#a89f90', { map: stoneTex(3, 0.3) }), x + w / 2, fh / 2, z + d / 2);
  add(p, new T.BoxGeometry(w, h, d), mat('#cc3b28', { map: planksTex('#cc3b28', 4, 2) }), x + w / 2, fh + h / 2, z + d / 2);
  [[x, z], [x + w, z], [x, z + d], [x + w, z + d]].forEach(([cx, cz]) => add(p, new T.BoxGeometry(0.09, h, 0.09), mat('#fffaf0'), cx, fh + h / 2, cz));
  // крыша «мансардная»: два уклона с каждой стороны
  const len = w + 0.3, roofCol = '#6d6a72', m = mat(roofCol, { map: shinglesTex(roofCol, 5, 2) });
  [-1, 1].forEach(s => { const a = add(p, rbox(len, 0.1, 0.8, 0.03), m, x + w / 2, fh + h + 0.33, z + d / 2 + s * 1.15); a.rotation.x = s * 1.0;
    const b = add(p, rbox(len, 0.1, 0.95, 0.03), m, x + w / 2, fh + h + 0.86, z + d / 2 + s * 0.45); b.rotation.x = s * 0.42; });
  add(p, cyl(0.07, 0.07, len, 16), mat('#4a474f'), x + w / 2, fh + h + 1.06, z + d / 2, 0, 0, Math.PI / 2);
  const sh = new T.Shape(); sh.moveTo(-d / 2, 0); sh.lineTo(d / 2, 0); sh.lineTo(d / 2 - 0.4, 0.62); sh.lineTo(0, 1.02); sh.lineTo(-d / 2 + 0.4, 0.62); sh.closePath();
  const eg = new T.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: false });
  [x, x + w - 0.04].forEach(gx => { const gm = add(p, eg, mat('#cc3b28', { map: planksTex('#cc3b28', 2, 1) }), gx + 0.04, fh + h, z + d / 2); gm.rotation.y = Math.PI / 2; });
  // ворота с белым крестом
  const dz = z + d + 0.02, dw = 1.1, dh = 1.05;
  add(p, rbox(dw + 0.16, dh + 0.1, 0.06, 0.02), mat('#fffaf0'), x + w / 2, fh + dh / 2, dz);
  add(p, rbox(dw, dh, 0.08, 0.02), mat('#9e2a1c', { map: planksTex('#9e2a1c', 2, 1) }), x + w / 2, fh + dh / 2, dz + 0.02);
  const ang = Math.atan2(dw / 2, dh), L = Math.hypot(dw / 2, dh) - 0.06;
  [-1, 1].forEach(side => [ang, -ang].forEach(r => add(p, new T.BoxGeometry(0.07, L, 0.03), mat('#fffaf0'), x + w / 2 + side * dw / 4, fh + dh / 2, dz + 0.07, 0, 0, r)));
  add(p, new T.BoxGeometry(0.07, dh, 0.04), mat('#fffaf0'), x + w / 2, fh + dh / 2, dz + 0.07);
  add(p, new T.BoxGeometry(dw, 0.07, 0.04), mat('#fffaf0'), x + w / 2, fh + dh - 0.04, dz + 0.07);
  // сеновал на боковой стене
  const hl = g(); add(hl, rbox(0.62, 0.55, 0.05, 0.02), mat('#fffaf0')); add(hl, new T.BoxGeometry(0.52, 0.45, 0.06), mat('#5a1f14')); add(hl, rbox(0.5, 0.18, 0.12, 0.05), mat('#e8c35a'), 0, -0.12, 0.04);
  hl.rotation.y = Math.PI / 2; hl.position.set(x + w + 0.03, fh + h + 0.25, z + d / 2); p.add(hl);
  window3(p, 'x', z + 0.5, fh + h * 0.45, 0.32, 0.3, x + w, null);
  // тюки сена у стены
  [[x + w + 0.25, z + d - 0.35], [x + w + 0.25, z + d - 0.85]].forEach(([hx, hz]) => { const hb = add(p, cyl(0.2, 0.2, 0.42, 20), mat('#e8c35a', { map: tex('hay', 64, 64, (c, W, H) => { c.fillStyle = '#e8c35a'; c.fillRect(0, 0, W, H); c.strokeStyle = '#c99b30'; for(let i = 0; i < 30; i++){ c.beginPath(); c.moveTo((i * 13) % W, 0); c.lineTo((i * 13 + 8) % W, H); c.stroke(); } }) }), hx, 0.2, hz, Math.PI / 2, 0, 0); });
  return p; } };

function shelterModel(wall, roof){ return { anchor: [1, 0.85], build(){ const p = g(); house(p, { x: 0.05, z: 0.05, w: 1.9, d: 1.6, h: 0.72, rh: 0.5, wall, roof, doorCol: '#4a2c16', noWin: false, foundation: true }); return p; } }; }
MODELS.shelter_coop = shelterModel('#e9c46a', '#bc4b2c');
MODELS.shelter_barn = shelterModel('#d9d2c3', '#8c3b2a');
MODELS.shelter_fold = shelterModel('#c9b79c', '#5d6b8a');

MODELS.farmhouse = { anchor: [2.2, 1.8], build(){
  const p = g(); house(p, { x: 0, z: 0, w: 4.4, d: 3.6, h: 1.25, rh: 1.0, wall: '#f6e7c8', roof: '#c8442f', doorCol: '#8c3b2a', chimney: [1.1, 1.0], winShutter: '#2e8b57' });
  awning3(p, 2.2, 3.62, 1.35, 1.1, '#2e8b57');
  // крыльцо
  add(p, rbox(1.4, 0.12, 0.5, 0.03), mat('#b07a45', { map: planksTex('#b07a45', 2, 1) }), 2.2, 0.06, 3.85);
  // почтовый ящик
  add(p, cyl(0.025, 0.025, 0.55, 8), mat('#6b4220'), 4.7, 0.27, 4.0); add(p, rbox(0.3, 0.2, 0.18, 0.06), mat('#4a90e2'), 4.7, 0.62, 4.0); add(p, new T.BoxGeometry(0.03, 0.18, 0.03), mat('#e5533d'), 4.86, 0.7, 4.0);
  return p; } };

MODELS.silo = { anchor: [0, 0], build(){ const p = g();
  [[0, 0, 0.85, 2.0], [1.75, -0.85, 0.7, 1.65]].forEach(([x, z, r, h]) => {
    add(p, cyl(r, r, h, 40), mat('#a9c4d4', { r: 0.45, m: 0.35, map: tex('silo', 128, 64, (c, W, H) => { c.fillStyle = '#a9c4d4'; c.fillRect(0, 0, W, H); for(let i = 0; i < 4; i++){ c.fillStyle = '#8aa6b8'; c.fillRect(0, i * 16, W, 3); } for(let i = 0; i < 16; i++){ c.fillStyle = '#c4d8e4'; c.fillRect(i * 8, 0, 2, H); } }, 1, h * 2) }), x, h / 2, z);
    add(p, sph(r * 1.03, 32, 16, 0, 6.3, 0, Math.PI / 2), mat('#c8442f', { r: 0.5 }), x, h, z, 0, 0, 0, [1, 0.55, 1]);
    add(p, cyl(0.12, 0.12, 0.1, 12), mat('#8a3020'), x, h + r * 0.58, z);
  });
  return p; } };
// SphereGeometry с полусферой
function sphHalf(r){ return new T.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2); }
MODELS.silo.build = function(){ const p = g();
  [[0, 0, 0.85, 2.0], [1.75, -0.85, 0.7, 1.65]].forEach(([x, z, r, h]) => {
    add(p, cyl(r, r, h, 40), mat('#a9c4d4', { r: 0.45, m: 0.3, map: tex('silo', 128, 64, (c, W, H) => { c.fillStyle = '#a9c4d4'; c.fillRect(0, 0, W, H); for(let i = 0; i < 4; i++){ c.fillStyle = '#8aa6b8'; c.fillRect(0, i * 16, W, 3); } for(let i = 0; i < 16; i++){ c.fillStyle = '#c4d8e4'; c.fillRect(i * 8, 0, 2, H); } }, 1, h * 2) }), x, h / 2, z);
    add(p, sphHalf(r * 1.03), mat('#c8442f', { r: 0.5 }), x, h, z, 0, 0, 0, [1, 0.55, 1]);
    add(p, cyl(0.12, 0.12, 0.1, 12), mat('#8a3020'), x, h + r * 0.58, z);
  });
  return p; };

/* ================= деревья и кусты ================= */
// Листва как в Hay Day: плотные «шапки» из сотен листочков с мягкой тенью внутри.
function leafTex(){ return tex('leaf', 128, 128, (c, w, h) => {
  c.clearRect(0, 0, w, h);
  const leaf = (x, y, r, a, col) => { c.save(); c.translate(x, y); c.rotate(a); c.fillStyle = col; c.beginPath(); c.moveTo(0, -r); c.quadraticCurveTo(r * 0.75, -r * 0.2, 0, r); c.quadraticCurveTo(-r * 0.75, -r * 0.2, 0, -r); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.18)'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(0, -r * 0.8); c.lineTo(0, r * 0.8); c.stroke(); c.restore(); };
  let sd = 11; const r = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for(let i = 0; i < 46; i++){ const a = r() * Math.PI * 2, d = Math.sqrt(r()) * 40; const v = 175 + Math.floor(r() * 80); leaf(64 + Math.cos(a) * d, 64 + Math.sin(a) * d, 13 + r() * 9, r() * Math.PI * 2, `rgb(${v},${v},${v})`); }
}); }
const LEAFMAT = new Map();
function leafMat(col){
  if(LEAFMAT.has(col)) return LEAFMAT.get(col);
  const map = leafTex();
  const m = new T.MeshStandardMaterial({ color: col, map, alphaTest: 0.5, side: T.DoubleSide, roughness: 0.85 });
  const dm = new T.MeshDepthMaterial({ depthPacking: T.RGBADepthPacking, map, alphaTest: 0.5 });
  LEAFMAT.set(col, [m, dm]); return [m, dm];
}
function canopy(p, x, y, z, R, cols, seed, density = 1){
  let s = seed || 1; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const blobs = [[0, 0, 0, 1], [0.55, -0.15, 0.2, 0.75], [-0.5, -0.1, 0.25, 0.75], [0.1, 0.35, 0.1, 0.7], [0.2, -0.2, -0.5, 0.7], [-0.25, 0.1, -0.4, 0.65], [0.0, -0.3, 0.55, 0.7]];
  // тёмная серединка, чтобы между листьями не просвечивало
  blobs.forEach(([dx, dy, dz, rr]) => add(p, new T.IcosahedronGeometry(R * rr * 0.84, 2), mat(shade(cols[1] || cols[0], 0.86), { r: 1, noGrain: true }), x + dx * R, y + dy * R, z + dz * R));
  const card = new T.PlaneGeometry(1, 1);
  blobs.forEach(([dx, dy, dz, rr]) => {
    const n = Math.round(130 * rr * rr * density);
    for(let i = 0; i < n; i++){
      const u = rnd() * 2 - 1, th = rnd() * Math.PI * 2, rr2 = Math.sqrt(1 - u * u);
      const nx = rr2 * Math.cos(th), ny = u, nz = rr2 * Math.sin(th);
      const r0 = R * rr * (0.86 + rnd() * 0.2);
      // сверху и на солнце листья светлее
      const light = ny * 0.6 - nx * 0.25 + rnd() * 0.3;
      const col = light > 0.45 ? cols[3] || cols[2] : light > 0.05 ? cols[2] || cols[0] : light > -0.35 ? cols[0] : cols[1] || cols[0];
      const [m, dm] = leafMat(col);
      const o = new T.Mesh(card, m); o.customDepthMaterial = dm;
      const sz = R * rr * (0.34 + rnd() * 0.18);
      o.scale.set(sz, sz, sz);
      o.position.set(x + dx * R + nx * r0, y + dy * R + ny * r0, z + dz * R + nz * r0);
      o.lookAt(o.position.x + nx, o.position.y + ny, o.position.z + nz);
      o.rotateZ(rnd() * Math.PI * 2); o.rotateX((rnd() - 0.5) * 0.9);
      p.add(o);
    }
  });
}
function oak(p, apples){
  add(p, cyl(0.1, 0.16, 1.0, 12), mat('#9a6236'), 0, 0.5, 0);
  add(p, cyl(0.04, 0.06, 0.45, 8), mat('#9a6236'), 0.18, 0.85, 0, 0, 0, -0.7);
  canopy(p, 0, 1.45, 0, 0.62, ['#62b034', '#428c29', '#8fcb44', '#bfe35e'], 7);
  if(apples) [[0.55, 1.3, 0.45], [-0.25, 1.25, 0.62], [0.15, 1.8, 0.55], [0.7, 1.6, 0.05], [-0.55, 1.55, 0.35], [0.3, 1.05, 0.6], [0.05, 1.45, 0.75], [0.65, 1.1, 0.4]].forEach(([ax, ay, az]) => add(p, sph(0.085, 14, 10), mat('#e02b2b', { r: 0.3 }), ax * 1.2, 1.45 + (ay - 1.45) * 1.15, az * 1.2));
}
MODELS.tree = { anchor: [0, 0], build(){ const p = g(); oak(p, true); return p; } };
MODELS.oak = { anchor: [0, 0], build(){ const p = g(); oak(p, false); return p; } };
MODELS.pine = { anchor: [0, 0], build(){ const p = g();
  add(p, cyl(0.08, 0.12, 0.6, 10), mat('#6b4220'), 0, 0.3, 0);
  const needles = tex('needles', 128, 128, (c, w, h) => { c.fillStyle = '#ffffff'; c.fillRect(0, 0, w, h); for(let i = 0; i < 700; i++){ const x = Math.random() * w, y = Math.random() * h; c.strokeStyle = ['#cfd8c8', '#e8f0e0', '#b8c4b0'][i % 3]; c.lineWidth = 1.5; c.beginPath(); c.moveTo(x, y); c.lineTo(x + (Math.random() - 0.5) * 6, y + 8); c.stroke(); } }, 3, 2);
  [[0.78, 0.9, 0.45], [0.63, 0.8, 0.95], [0.47, 0.7, 1.4], [0.31, 0.55, 1.8]].forEach(([r, h, y], i) => {
    const geo = new T.ConeGeometry(r, h, 28, 3); const pos = geo.attributes.position;
    for(let k = 0; k < pos.count; k++){ const py = pos.getY(k); if(py < h / 2 - 0.01){ const a = Math.atan2(pos.getZ(k), pos.getX(k)), j = 1 + Math.sin(a * 14) * 0.07 + Math.sin(a * 5 + i) * 0.05; pos.setX(k, pos.getX(k) * j); pos.setZ(k, pos.getZ(k) * j); if(py < -h / 2 + 0.01) pos.setY(k, py - Math.abs(Math.sin(a * 7)) * 0.08); } }
    geo.computeVertexNormals();
    add(p, geo, mat(['#2f7d3c', '#2a7337', '#348a42', '#3f9a4c'][i], { r: 0.9, map: needles }), 0, y, 0); });
  return p; } };
MODELS.bush = { anchor: [0, 0], build(){ const p = g(); canopy(p, 0, 0.3, 0, 0.32, ['#62b034', '#428c29', '#8fcb44', '#bfe35e'], 3, 0.8); [[0.2, 0.4, 0.2], [-0.15, 0.5, 0.18], [0.05, 0.6, -0.1]].forEach(([x, y, z]) => add(p, sph(0.045, 10, 8), mat('#ff6b9a'), x, y, z)); return p; } };

/* ================= животные (смотрят в сторону +x) ================= */
MODELS.chicken = { anchor: [0, 0], shadowOpacity: 0.3, build(){ const p = g(), W = mat('#fffdf8', { r: 0.95 });
  [-0.05, 0.05].forEach(z => { add(p, cyl(0.012, 0.012, 0.12, 6), mat('#f0a030'), 0, 0.06, z); add(p, rbox(0.07, 0.015, 0.04, 0.007), mat('#f0a030'), 0.02, 0.008, z); });
  add(p, sph(0.16, 20, 16), W, 0, 0.24, 0, 0, 0, 0, [1.25, 1, 1]);
  add(p, sph(0.09, 16, 12), mat('#f2ebdc', { r: 0.95 }), -0.02, 0.25, 0.12, 0, 0, 0.3, [1.4, 0.8, 0.5]);
  add(p, sph(0.09, 16, 12), mat('#f2ebdc', { r: 0.95 }), -0.02, 0.25, -0.12, 0, 0, 0.3, [1.4, 0.8, 0.5]);
  add(p, cone(0.08, 0.2, 12), W, -0.2, 0.34, 0, 0, 0, 1.1);
  add(p, sph(0.1, 18, 14), W, 0.15, 0.42, 0);
  [[0.13, 0.54], [0.17, 0.555], [0.21, 0.54]].forEach(([x, y]) => add(p, sph(0.035, 10, 8), mat('#e53935', { r: 0.5 }), x, y, 0));
  add(p, sph(0.025, 8, 6), mat('#e53935'), 0.24, 0.37, 0, 0, 0, 0, [0.7, 1.4, 0.7]);
  add(p, cone(0.03, 0.08, 10), mat('#ffa726'), 0.27, 0.42, 0, 0, 0, -Math.PI / 2);
  [-1, 1].forEach(s => { add(p, sph(0.018, 8, 6), mat('#1a1a1a', { r: 0.2 }), 0.21, 0.45, s * 0.06); add(p, sph(0.006, 6, 4), mat('#ffffff'), 0.225, 0.455, s * 0.068); });
  return p; } };
MODELS.cow = { anchor: [0, 0], shadowOpacity: 0.3, build(){ const p = g();
  const body = mat('#fbfaf6', { r: 0.85 }), spot = mat('#2b2522', { r: 0.85 });
  [[0.32, 0.13], [0.32, -0.13], [-0.3, 0.13], [-0.3, -0.13]].forEach(([x, z]) => { add(p, cyl(0.055, 0.05, 0.36, 10), body, x, 0.18, z); add(p, cyl(0.058, 0.058, 0.06, 10), mat('#3a2a1a'), x, 0.03, z); });
  add(p, new T.CapsuleGeometry(0.25, 0.42, 8, 20), body, 0, 0.55, 0, 0, 0, Math.PI / 2, [1.0, 1, 0.98]);
  [[0.15, 0.68, 0.2, 0.17], [-0.25, 0.55, 0.22, 0.15], [-0.05, 0.62, -0.22, 0.14], [0.3, 0.5, -0.2, 0.1]].forEach(([x, y, z, r]) => add(p, sph(r, 16, 12), spot, x, y, z, 0, 0, 0, [1, 0.9, 0.25]));
  add(p, sph(0.08, 12, 10), mat('#f4a6a6'), -0.05, 0.32, 0, 0, 0, 0, [1.2, 0.7, 1]);
  add(p, cyl(0.015, 0.015, 0.35, 6), body, -0.48, 0.5, 0, 0, 0, -0.35); add(p, sph(0.04, 8, 6), spot, -0.54, 0.34, 0);
  const h = g(); h.position.set(0.5, 0.72, 0); p.add(h);
  add(h, sph(0.17, 20, 16), body, 0, 0, 0, 0, 0, 0, [1, 1.05, 1]);
  add(h, rbox(0.14, 0.15, 0.24, 0.06), mat('#f2b6b0', { r: 0.6 }), 0.13, -0.07, 0);
  [-1, 1].forEach(s => { add(h, sph(0.018, 8, 6), mat('#9e5a55'), 0.205, -0.06, s * 0.05); add(h, sph(0.025, 10, 8), mat('#111', { r: 0.2 }), 0.12, 0.05, s * 0.1); add(h, sph(0.008, 6, 4), mat('#fff'), 0.135, 0.06, s * 0.11);
    add(h, cone(0.03, 0.12, 10), mat('#e8dcc0'), -0.02, 0.17, s * 0.11, s * 0.4); add(h, sph(0.06, 10, 8), body, -0.05, 0.08, s * 0.18, 0, 0, 0, [0.6, 0.35, 1]); });
  add(h, sph(0.07, 10, 8), spot, -0.04, 0.12, 0.08, 0, 0, 0, [1, 0.5, 0.8]);
  return p; } };
MODELS.sheep = { anchor: [0, 0], shadowOpacity: 0.3, build(){ const p = g(), wool = mat('#fbf8f2', { r: 1 });
  [[0.2, 0.11], [0.2, -0.11], [-0.2, 0.11], [-0.2, -0.11]].forEach(([x, z]) => add(p, cyl(0.035, 0.03, 0.26, 8), mat('#3d3a44'), x, 0.13, z));
  let s = 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for(let i = 0; i < 16; i++){ const a = rnd() * 6.28, b = rnd() * 3.14; add(p, new T.IcosahedronGeometry(0.13 + rnd() * 0.04, 2), wool, Math.cos(a) * Math.sin(b) * 0.25, 0.42 + Math.cos(b) * 0.12, Math.sin(a) * Math.sin(b) * 0.17); }
  const h = g(); h.position.set(0.36, 0.5, 0); p.add(h);
  add(h, sph(0.11, 16, 12), mat('#3d3a44', { r: 0.8 }), 0, 0, 0, 0, 0, -0.3, [1.15, 1, 0.9]);
  add(h, new T.IcosahedronGeometry(0.08, 2), wool, -0.04, 0.09, 0);
  [-1, 1].forEach(s2 => { add(h, sph(0.05, 10, 8), mat('#3d3a44'), -0.02, 0.02, s2 * 0.12, 0, 0, 0, [0.5, 0.3, 1.2]); add(h, sph(0.022, 8, 6), mat('#fff'), 0.08, 0.03, s2 * 0.05); add(h, sph(0.012, 6, 4), mat('#111'), 0.095, 0.03, s2 * 0.055); });
  return p; } };

/* ================= транспорт и доска заказов ================= */
function truckModel(cargo){ return { anchor: [0, 0], build(){ const p = g();
  [[0.5, 0.32], [0.5, -0.32], [-0.35, 0.32], [-0.35, -0.32], [-0.75, 0.32], [-0.75, -0.32]].forEach(([x, z]) => { add(p, cyl(0.15, 0.15, 0.1, 20), mat('#2b2b2b', { r: 0.6 }), x, 0.15, z, Math.PI / 2); add(p, cyl(0.07, 0.07, 0.11, 14), mat('#cfd8dc', { m: 0.5, r: 0.3 }), x, 0.15, z, Math.PI / 2); });
  add(p, rbox(1.75, 0.12, 0.62, 0.03), mat('#555'), -0.12, 0.25, 0);
  add(p, rbox(0.62, 0.6, 0.62, 0.12), mat('#d9473a', { r: 0.4 }), 0.52, 0.6, 0);
  add(p, rbox(0.3, 0.26, 0.64, 0.04), mat('#9fd3ee', { r: 0.1, m: 0.2 }), 0.6, 0.73, 0);
  add(p, rbox(0.2, 0.1, 0.6, 0.03), mat('#f5f5f5', { m: 0.6, r: 0.3 }), 0.86, 0.36, 0);
  [-1, 1].forEach(s => add(p, sph(0.05, 10, 8), mat('#fff9c4', { em: 0xfff3a0, emi: 0.3 }), 0.84, 0.48, s * 0.22));
  add(p, rbox(1.05, 0.62, 0.66, 0.05), mat('#eef2f5', { r: 0.6 }), -0.38, 0.62, 0);
  add(p, new T.BoxGeometry(1.06, 0.08, 0.67), mat('#d9473a'), -0.38, 0.5, 0);
  if(cargo) [[-0.6, 0.12], [-0.2, -0.12], [-0.42, 0]].forEach(([x, z], i) => add(p, rbox(0.3, 0.24, 0.28, 0.03), mat('#d8a35a', { map: planksTex('#d8a35a', 1, 1) }), x, 1.05 + (i === 2 ? 0.24 : 0), z));
  if(cargo) p.rotation.y = Math.PI;   // с грузом уезжает влево по дороге
  return p; } }; }
MODELS.truck = truckModel(false);
MODELS.truck_cargo = truckModel(true);
MODELS.board = { anchor: [1, 1], build(){ const p = g();
  [0.45, 1.55].forEach(x => add(p, rbox(0.1, 1.5, 0.1, 0.02), mat('#7a4a22'), x, 0.75, 1.3));
  add(p, rbox(1.35, 0.85, 0.08, 0.03), mat('#c98f4f', { map: planksTex('#c98f4f', 2, 1) }), 1, 1.05, 1.35);
  add(p, rbox(1.55, 0.08, 0.3, 0.03), mat('#8c3b2a'), 1, 1.55, 1.38, 0.3);
  [[0.66, 1.1], [1.0, 1.15], [1.34, 1.08]].forEach(([x, y], i) => { add(p, new T.BoxGeometry(0.27, 0.36, 0.02), mat('#fffaf0'), x, y, 1.4, 0, 0, (i - 1) * 0.06); add(p, sph(0.025, 8, 6), mat('#e5533d'), x, y + 0.15, 1.42); });
  return p; } };

export const H = { T, g, add, rbox, cyl, sph, cone, mat, shade, tex, planksTex, shinglesTex, bricksTex, stoneTex, house, window3, door3, awning3, pad };
