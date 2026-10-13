// Рендер спрайтов «Хуторка»: 3D-модели → гладкие картинки с мягким светом и тенью.
import * as THREE from 'three';
import { MODELS } from './models.js';
import './factories.js';
import './extras.js';

const K = 67.88;          // пикселей на клетку по горизонтали в игре (1×)
const SS = 4;             // рендерим в 4×, на выходе 2×
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
renderer.setPixelRatio(1);
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.setClearColor(0x000000, 0);

function makeScene(){
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xfff6e0, 0x6f8f4a, 1.25));
  const sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
  sun.position.set(-6, 11, 3);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.radius = 6; sun.shadow.blurSamples = 16;
  sun.shadow.bias = -0.0008; sun.shadow.normalBias = 0.02;
  const sc = sun.shadow.camera; sc.left = -8; sc.right = 8; sc.top = 8; sc.bottom = -8; sc.near = 0.5; sc.far = 40;
  scene.add(sun); scene.add(sun.target);
  const fill = new THREE.DirectionalLight(0xcfe6ff, 0.55); fill.position.set(6, 5, 8); scene.add(fill);
  return { scene, sun };
}

window.renderSprite = async function(name, args = {}){
  const def = MODELS[name];
  if(!def) throw new Error('no model ' + name);
  const { scene, sun } = makeScene();
  const obj = def.build(THREE, args);
  obj.traverse(o => { if(o.isMesh){ o.castShadow = true; o.receiveShadow = true; } });
  scene.add(obj);
  const cx = def.anchor ? def.anchor[0] : 0, cz = def.anchor ? def.anchor[1] : 0;
  // ловец тени на прозрачной земле
  if(def.shadow !== false){
    const pl = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: def.shadowOpacity ?? 0.28 }));
    pl.rotation.x = -Math.PI / 2; pl.position.set(cx, 0.001, cz); pl.receiveShadow = true; scene.add(pl);
  }
  sun.target.position.set(cx, 0, cz); sun.position.set(cx - 6, 11, cz + 3);
  // размеры кадра по габаритам модели
  const box = new THREE.Box3().setFromObject(obj);
  const sph = box.getBoundingSphere(new THREE.Sphere());
  const half = Math.max(sph.radius * 1.15, 0.8) + Math.hypot(sph.center.x - cx, sph.center.z - cz, sph.center.y);
  const k = K * SS, size = Math.ceil(half * 2 * k);
  renderer.setSize(size, size, false);
  const cam = new THREE.OrthographicCamera(-half, half, half, -half, 0.1, 200);
  const r = 40, el = Math.PI / 6;
  cam.position.set(cx + r * Math.cos(el) / Math.SQRT2, r * Math.sin(el), cz + r * Math.cos(el) / Math.SQRT2);
  cam.lookAt(cx, 0, cz);
  // масштаб: 1 клетка по x → 0.707·k пикселей по горизонтали
  cam.zoom = 1; cam.updateProjectionMatrix();
  renderer.render(scene, cam);
  const src = renderer.domElement;
  // обрезаем по непрозрачным пикселям
  const tmp = document.createElement('canvas'); tmp.width = size; tmp.height = size;
  const tc = tmp.getContext('2d'); tc.drawImage(src, 0, 0);
  const data = tc.getImageData(0, 0, size, size).data;
  let x0 = size, y0 = size, x1 = 0, y1 = 0;
  for(let y = 0; y < size; y++) for(let x = 0; x < size; x++){ if(data[(y * size + x) * 4 + 3] > 6){ if(x < x0) x0 = x; if(x > x1) x1 = x; if(y < y0) y0 = y; if(y > y1) y1 = y; } }
  x0 = Math.max(0, x0 - 4); y0 = Math.max(0, y0 - 4); x1 = Math.min(size - 1, x1 + 4); y1 = Math.min(size - 1, y1 + 4);
  // якорь: центр основания модели
  const a = new THREE.Vector3(cx, 0, cz).project(cam);
  const ax = (a.x + 1) / 2 * size, ay = (1 - a.y) / 2 * size;
  const OUT = 2 / SS, w = Math.round((x1 - x0 + 1) * OUT), h = Math.round((y1 - y0 + 1) * OUT);
  const out = document.createElement('canvas'); out.width = w; out.height = h;
  const oc = out.getContext('2d'); oc.imageSmoothingEnabled = true; oc.imageSmoothingQuality = 'high';
  // уменьшаем в два шага — мягкие края без ступенек
  const mid = document.createElement('canvas'); mid.width = Math.round((x1 - x0 + 1) / 2); mid.height = Math.round((y1 - y0 + 1) / 2);
  const mc = mid.getContext('2d'); mc.imageSmoothingQuality = 'high'; mc.drawImage(tmp, x0, y0, x1 - x0 + 1, y1 - y0 + 1, 0, 0, mid.width, mid.height);
  oc.drawImage(mid, 0, 0, mid.width, mid.height, 0, 0, w, h);
  scene.traverse(o => { if(o.geometry) o.geometry.dispose(); if(o.material) [].concat(o.material).forEach(m => m.dispose()); });
  // особые точки (труба для дыма и т.п.) — смещение от якоря в пикселях игры
  const pts = {};
  for(const [k, v] of Object.entries(def.points || {})){ const q = new THREE.Vector3(...v).project(cam); pts[k] = [Math.round(((q.x + 1) / 2 * size - ax) * OUT * 5) / 10, Math.round(((1 - q.y) / 2 * size - ay) * OUT * 5) / 10]; }
  return { url: out.toDataURL('image/webp', 0.9), w, h, ax: Math.round((ax - x0) * OUT * 10) / 10, ay: Math.round((ay - y0) * OUT * 10) / 10, pts };
};
window.modelNames = () => Object.keys(MODELS);
window.ready = true;
