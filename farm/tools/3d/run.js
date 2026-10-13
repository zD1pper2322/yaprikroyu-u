const {chromium}=require('playwright');const fs=require('fs');
const OUT=process.argv[2], only=(process.argv[3]||'').split(',').filter(Boolean);
(async()=>{const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist']});
const p=await b.newPage();p.on('pageerror',e=>console.log('ERR',e.message));p.on('console',m=>{if(m.type()==='error')console.log('CERR',m.text())});
await p.goto('http://localhost:8790/tool/index.html');await p.waitForFunction(()=>window.ready,null,{timeout:30000});
const names=only.length?only:await p.evaluate(()=>modelNames());
fs.mkdirSync(OUT,{recursive:true});
const manPath=OUT+'/sprites.json';const man=fs.existsSync(manPath)?JSON.parse(fs.readFileSync(manPath)):{};
for(const n of names){const t0=Date.now();
  try{const r=await p.evaluate(n=>renderSprite(n),n);
    fs.writeFileSync(`${OUT}/${n}.webp`,Buffer.from(r.url.split(',')[1],'base64'));
    man[n]={w:r.w,h:r.h,ax:r.ax,ay:r.ay,res:r.res||2};if(Object.keys(r.pts||{}).length)man[n].pts=r.pts;console.log(n,r.w+'x'+r.h,'anchor',r.ax,r.ay,(Date.now()-t0)+'ms',Math.round(fs.statSync(`${OUT}/${n}.webp`).size/1024)+'KB');
  }catch(e){console.log('FAIL',n,e.message.slice(0,200));}}
fs.writeFileSync(manPath,JSON.stringify(man));await b.close();})();
