// Gera src/data/countries.json (polígonos simplificados + código ISO-2 + nome pt-BR)
// e assets/globe/earth.jpg (textura equirretangular da Terra) a partir do Natural Earth (world-atlas).
const fs = require('fs');
const path = require('path');
const topojson = require('topojson-client');
const countriesLib = require('i18n-iso-countries');
const { createCanvas } = require('@napi-rs/canvas');

countriesLib.registerLocale(require('i18n-iso-countries/langs/pt.json'));
const topo = require('world-atlas/countries-50m.json');
const fc = topojson.feature(topo, topo.objects.countries);

const round = (n) => Math.round(n * 100) / 100;
const out = [];
for (const f of fc.features) {
  const numeric = String(f.id ?? '').padStart(3, '0');
  const code = f.id != null ? countriesLib.numericToAlpha2(numeric) : undefined;
  const name = code ? countriesLib.getName(code, 'pt') : f.properties.name;
  const polys = f.geometry.type === 'Polygon' ? [f.geometry.coordinates] : f.geometry.coordinates;
  // mantém apenas o anel externo + furos (para point-in-polygon e contorno)
  const simplified = polys.map((rings) =>
    rings.map((ring) => {
      const r = [];
      let last = null;
      for (const [x, y] of ring) {
        const p = [round(x), round(y)];
        if (!last || last[0] !== p[0] || last[1] !== p[1]) { r.push(p); last = p; }
      }
      return r.flat();
    })
  );
  out.push({ code: code ? code.toLowerCase() : null, name: name || f.properties.name, polygons: simplified });
}
fs.writeFileSync(path.join(__dirname, '../src/data/countries.json'), JSON.stringify(out));
console.log('countries:', out.length, 'size KB:', Math.round(fs.statSync(path.join(__dirname, '../src/data/countries.json')).size / 1024));

// ---- textura ----
const W = 4096, H = 2048;
const cv = createCanvas(W, H);
const ctx = cv.getContext('2d');
const X = (lon) => ((lon + 180) / 360) * W;
const Y = (lat) => ((90 - lat) / 180) * H;

// oceano: mais escuro no fundo, mais claro perto da costa (efeito simples por gradiente de latitude)
const og = ctx.createLinearGradient(0, 0, 0, H);
og.addColorStop(0, '#0b2a4a'); og.addColorStop(0.5, '#0d3b66'); og.addColorStop(1, '#0b2a4a');
ctx.fillStyle = og; ctx.fillRect(0, 0, W, H);

// cor suave por latitude (interpolada)
const stops=[[0,[47,107,58]],[14,[120,140,70]],[22,[182,154,95]],[32,[165,150,95]],[42,[90,128,66]],[56,[79,115,68]],[66,[110,130,100]],[72,[225,232,236]],[90,[240,244,247]]];
function landColor(lat){const a=Math.abs(lat);for(let i=1;i<stops.length;i++){if(a<=stops[i][0]){const [a0,c0]=stops[i-1],[a1,c1]=stops[i];const t=(a-a0)/(a1-a0);return 'rgb('+c0.map((v,k)=>Math.round(v+(c1[k]-v)*t)).join(',')+')';}}return 'rgb(240,244,247)';}
function unwrap(ring){const r=[ring[0],ring[1]];let off=0;for(let i=2;i<ring.length;i+=2){const d=ring[i]-ring[i-2];if(d>180)off-=360;else if(d<-180)off+=360;r.push(ring[i]+off,ring[i+1]);}return r;}
function trace(poly,dx){ctx.beginPath();for(const ring0 of poly){const ring=unwrap(ring0);for(let i=0;i<ring.length;i+=2){const x=X(ring[i])+dx,y=Y(ring[i+1]);i===0?ctx.moveTo(x,y):ctx.lineTo(x,y);}ctx.closePath();}}
const lg=ctx.createLinearGradient(0,0,0,H);for(let lat=90;lat>=-90;lat-=3)lg.addColorStop((90-lat)/180,landColor(lat));
for(const c of out)for(const poly of c.polygons)for(const dx of [-W,0,W]){trace(poly,dx);ctx.fillStyle=lg;ctx.fill('evenodd');ctx.strokeStyle='rgba(255,255,255,0.3)';ctx.lineWidth=1.1;ctx.lineJoin='round';ctx.stroke();}
const img=ctx.getImageData(0,0,W,H);
for(let i=0;i<img.data.length;i+=4){const n=(Math.random()-0.5)*12;img.data[i]+=n;img.data[i+1]+=n;img.data[i+2]+=n;}
ctx.putImageData(img,0,0);
fs.writeFileSync(path.join(__dirname,'../assets/globe/earth.jpg'),cv.toBuffer('image/jpeg',88));
console.log('texture ok');
