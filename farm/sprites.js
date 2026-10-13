// «Хуторок» — объёмные картинки. Каждая постройка, животное, дерево и грядка собраны как 3D-модель
// и отрендерены с мягким светом и тенью (папка sprites). Пока картинка грузится — рисуется старый вариант.
'use strict';

const SPRITES_V = 4;
const Sprites = {
  man: null, imgs: {},
  init(){
    fetch(`sprites/sprites.json?v=${SPRITES_V}`, { cache: 'no-cache' }).then(r => r.json()).then(m => { this.man = m; }).catch(() => {});
  },
  has(name){ return !!(this.man && this.man[name]); },
  get(name){
    if(!this.man || !this.man[name]) return null;
    let im = this.imgs[name];
    if(!im){ im = new Image(); im.decoding = 'async'; im.src = `sprites/${name}.webp?v=${SPRITES_V}`; this.imgs[name] = im; }
    return im.complete && im.naturalWidth ? im : null;
  },
  // Рисует спрайт так, чтобы его «якорь» (центр основания) попал в точку x,y экрана игры.
  draw(ctx, name, x, y, scale = 1, flip = false){
    const im = this.get(name); if(!im) return false;
    const m = this.man[name], s = scale / (m.res || 2);
    if(flip){ ctx.save(); ctx.translate(x, y); ctx.scale(-1, 1); ctx.drawImage(im, -m.ax * s, -m.ay * s, m.w * s, m.h * s); ctx.restore(); }
    else ctx.drawImage(im, x - m.ax * s, y - m.ay * s, m.w * s, m.h * s);
    return true;
  },
};
Sprites.init();
window.Sprites = Sprites;

/* ---------- подмена рисованных объектов на объёмные ---------- */
{
  const T = TILE;
  const wrap = (name, fn) => { const old = Art[name]; Art[name] = function(...a){ return fn.call(this, old, ...a); }; };

  wrap('factory', function(old, ctx, x, y, W, H, B, working, time, key){
    const name = 'f_' + key, c = this.P(x + W / 2, y + H / 2);
    if(!Sprites.draw(ctx, name, c.x, c.y)) return old.call(this, ctx, x, y, W, H, B, working, time, key);
    const sm = Sprites.man[name].pts && Sprites.man[name].pts.smoke;
    if(working && sm) this.smokeAt(ctx, { x: c.x + sm[0], y: c.y + sm[1] }, time);
    this.post(ctx, this.P(x + 14, y + H - 14), B.e);
  });
  wrap('barn', function(old, ctx, x, y, W, H){
    const c = this.P(x + W / 2, y + H / 2);
    if(!Sprites.draw(ctx, 'storage', c.x, c.y)) return old.call(this, ctx, x, y, W, H);
    this.sign(ctx, c.x + 4, c.y - 150, '📦', 15);
  });
  wrap('shelter', function(old, ctx, x, y, W, H, B){
    const key = 'shelter_' + ({ chicken: 'coop', cow: 'barn', sheep: 'fold' }[B.animal] || 'coop');
    const c = this.P(x + W / 2, y + H / 2);
    if(!Sprites.draw(ctx, key, c.x, c.y)) return old.call(this, ctx, x, y, W, H, B);
    this.sign(ctx, c.x - 22, c.y - 34, B.e, 12);
  });
  wrap('board', function(old, ctx, x, y){
    const c = this.P(x + T, y + T);
    if(!Sprites.draw(ctx, 'board', c.x, c.y)) return old.call(this, ctx, x, y);
  });
  wrap('truck', function(old, ctx, x, y, flip, cargo){
    if(!Sprites.draw(ctx, cargo ? 'truck_cargo' : 'truck', x, y + 8)) return old.call(this, ctx, x, y, flip, cargo);
  });
  wrap('tree', function(old, ctx, px, py, kind, time, seed){
    const name = kind === 'pine' ? 'pine' : kind === 'oak' ? 'oak' : 'tree';
    // лёгкое покачивание кроны на ветру
    const sw = Math.sin(time * 1.3 + (seed || 0)) * 0.012;
    ctx.save(); ctx.translate(px, py); ctx.transform(1, 0, sw, 1, 0, 0);
    const ok = Sprites.draw(ctx, name, 0, 0);
    ctx.restore();
    if(!ok) return old.call(this, ctx, px, py, kind, time, seed);
  });
  wrap('bush', function(old, ctx, x, y, seed){ if(!Sprites.draw(ctx, 'bush', x, y)) return old.call(this, ctx, x, y, seed); });
  wrap('silo', function(old, ctx){ const c = this.P(1.2 * T, -1.8 * T); if(!Sprites.draw(ctx, 'silo', c.x, c.y)) return old.call(this, ctx); });
  wrap('farmhouse', function(old, ctx, time){
    const x = 7.6 * T, y = -5.4 * T, W = 4.4 * T, H = 3.6 * T, c = this.P(x + W / 2, y + H / 2);
    if(!Sprites.has('farmhouse') || !Sprites.get('farmhouse')) return old.call(this, ctx, time);
    // дорожка к дому
    ctx.save(); ctx.transform(1, 0.5, -1, 0.5, 0, 0); ctx.fillStyle = '#e2c084'; ctx.beginPath(); ctx.roundRect(x + W / 2 - 18, y + H + 10, 36, -y - H, 8); ctx.fill(); ctx.restore();
    Sprites.draw(ctx, 'farmhouse', c.x, c.y);
    const ch = this.up(this.P(x + 1.1 * T, y + 1.0 * T), 168);
    this.smokeAt(ctx, ch, time * 0.6, '#f2f2f2');
  });
  wrap('animal', function(old, ctx, kind, x, y, dir, t, state){
    if(!Sprites.get(kind)) return old.call(this, ctx, kind, x, y, dir, t, state);
    const bob = t ? Math.abs(Math.sin(t * 10)) * 1.6 : 0;
    const idle = performance.now() / 1000 + x * 0.01;
    const breathe = t ? 1 : 1 + Math.sin(idle * 2) * 0.015;
    ctx.save(); ctx.translate(x, y); ctx.scale(dir < 0 ? -1 : 1, breathe);
    Sprites.draw(ctx, kind, 0, -bob, 1);
    ctx.restore();
  });
}

// Какой спрайт у грядки сейчас: пустая или с урожаем нужной стадии.
function plotSprite(p){
  if(!p.crop) return 'plot';
  const ps = plotState(p), stage = ps.s === 'ready' ? 3 : ps.pct < 0.33 ? 0 : ps.pct < 0.66 ? 1 : 2;
  return `crop_${p.crop}_${stage}`;
}

/* ---------- люди, собака, лодка, сундук, декор, забор ---------- */
{
  const T = TILE;
  const wrap = (obj, name, fn) => { const old = obj[name]; obj[name] = function(...a){ return fn.call(this, old, ...a); }; };
  wrap(Life, 'person', function(old, c, p, m, time, look, hat, li = 0){
    const fr = m.walk ? Math.floor(time * 6) % 2 : 0;
    if(!Sprites.draw(c, `person${li}_${fr}`, p.x, p.y, 1, m.dir < 0)) return old.call(this, c, p, m, time, look, hat);
  });
  wrap(Life, 'dogDraw', function(old, c, p, g, time){
    const fr = g.walk ? Math.floor(time * 9) % 2 : 0;
    if(!Sprites.draw(c, `dog_${fr}`, p.x, p.y, 1, g.dir < 0)) return old.call(this, c, p, g, time);
  });
  wrap(Art, 'boat', function(old, ctx, x, y, time, crates){
    const bob = Math.sin(time * 1.6) * 2.5;
    if(!Sprites.draw(ctx, 'boat', x, y + 18 + bob)) return old.call(this, ctx, x, y, time, crates);
  });
  wrap(Art, 'chest', function(old, ctx, x, y, time){
    const q = this.P(x, y), j = Math.max(0, Math.sin(time * 2.2)) ** 8 * 6;
    if(!Sprites.draw(ctx, 'chest', q.x, q.y - j, 1.3)) return old.call(this, ctx, x, y, time);
    ctx.fillStyle = `rgba(255,248,200,${0.5 + 0.5 * Math.sin(time * 4)})`; this.star(ctx, q.x + 22, q.y - 50 - j, 7); this.star(ctx, q.x - 24, q.y - 40 - j, 5);
  });
  wrap(Art, 'trough', function(old, ctx, x, y){ const q = this.P(x + 0.6 * T, y + 0.25 * T); if(!Sprites.draw(ctx, 'trough', q.x, q.y)) return old.call(this, ctx, x, y); });
  wrap(Art, 'decorUp', function(old, ctx, kind, x, y, w, h, time){
    if(['flowers', 'sunflower', 'bench', 'hay', 'well'].includes(kind)){ const q = this.P(x + w / 2, y + h / 2); if(Sprites.draw(ctx, 'd_' + kind, q.x, q.y)) return; }
    return old.call(this, ctx, kind, x, y, w, h, time);
  });
  wrap(Art, 'fenceLine', function(old, ctx, ax, ay, bx, by, gap){
    const along = ay === by ? 'x' : 'z';
    if(!Sprites.get('fence_' + along) || !Sprites.get('fence_post')) return old.call(this, ctx, ax, ay, bx, by, gap);
    const len = Math.hypot(bx - ax, by - ay), n = Math.max(1, Math.round(len / T));
    const pts = []; for(let i = 0; i <= n; i++) pts.push({ gx: ax + (bx - ax) * i / n, gy: ay + (by - ay) * i / n });
    const skip = a => gap && a.gy > gap[0] && a.gy < gap[1] && a.gx < 2;
    for(let i = 0; i < n; i++){
      if(skip(pts[i]) || skip(pts[i + 1])){ if(!skip(pts[i])){ const q = this.P(pts[i].gx, pts[i].gy); Sprites.draw(ctx, 'fence_post', q.x, q.y); } continue; }
      const q = this.P(pts[i].gx, pts[i].gy); Sprites.draw(ctx, 'fence_' + along, q.x, q.y, len / n / T);
    }
    const e = pts[n]; if(!skip(e)){ const q = this.P(e.gx, e.gy); Sprites.draw(ctx, 'fence_post', q.x, q.y); }
  });
}
