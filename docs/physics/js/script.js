const canvas = document.getElementById('sim-canvas');
const ctx = canvas.getContext('2d');

ctx.imageSmoothingEnabled = true;
ctx.imageSmoothingQuality = "high";

function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();

  canvas.width = rect.width * dpr;
  canvas.height = rect.height * dpr;

  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
}

resizeCanvas();
window.addEventListener('resize', resizeCanvas);
let shape = 'cube', activePanel = null;
let planeRegion = null, objRegion = null; // planeRegion = array of 4 pts (trapezoid)

const isDark = () => matchMedia('(prefers-color-scheme: dark)').matches;
function col() {
  return isDark()
    ? { bg:'#111110', tri:'#3a3a36', text:'#c2c0b6', grid:'#1e1e1c', accent:'#7F77DD' }
    : { bg:'#eef2ff', tri:'#e5e3db', text:'#3d3d3a', grid:'#e5e4e0', accent:'#534AB7' };
}

function clamp(v,mn,mx){ return Math.max(mn,Math.min(mx,v)); }
function syncFrom(srcId,tgtId,mn,mx,dec){
  const src=document.getElementById(srcId), tgt=document.getElementById(tgtId);
  let v=parseFloat(src.value); if(isNaN(v)) v=mn;
  v=clamp(v,mn,mx); src.value=v; tgt.value=parseFloat(v.toFixed(dec));
}
function getVal(id){ return parseFloat(document.getElementById(id).value); }

function setShape(s,btn){
  shape=s;
  document.querySelectorAll('.shape-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active'); redraw();
}
function closePanel(which){
  document.getElementById('panel-'+which).classList.remove('open');
  if(activePanel===which) activePanel=null; redraw();
}
function openPanel(which){
  if(activePanel&&activePanel!==which)
    document.getElementById('panel-'+activePanel).classList.remove('open');
  activePanel=which;
  document.getElementById('panel-'+which).classList.add('open');
  document.getElementById('hint-text').style.display='none';
}

function handleClick(e){
  const rect=canvas.getBoundingClientRect();
  const sx=canvas.width/rect.width, sy=canvas.height/rect.height;
  const mx=(e.clientX-rect.left)*sx, my=(e.clientY-rect.top)*sy;
  if(objRegion && pointInCircle(mx,my,objRegion)){ openPanel('obj'); return; }
  if(planeRegion && pointInQuad(mx,my,planeRegion)){ openPanel('plane'); return; }
}

function pointInCircle(mx,my,r){
  const dx=mx-r.cx, dy=my-r.cy; return Math.sqrt(dx*dx+dy*dy)<r.radius;
}
function sign2(p1,p2,p3){ return (p1.x-p3.x)*(p2.y-p3.y)-(p2.x-p3.x)*(p1.y-p3.y); }
function pointInTriangle(mx,my,pts){
  const [A,B,C]=pts;
  const d1=sign2({x:mx,y:my},A,B), d2=sign2({x:mx,y:my},B,C), d3=sign2({x:mx,y:my},C,A);
  return !((d1<0||d2<0||d3<0)&&(d1>0||d2>0||d3>0));
}
function pointInQuad(mx,my,pts){
  // split quad into two triangles
  return pointInTriangle(mx,my,[pts[0],pts[1],pts[2]]) ||
         pointInTriangle(mx,my,[pts[0],pts[2],pts[3]]);
}

function drawArrow(x1,y1,x2,y2,color){
  const dx=x2-x1,dy=y2-y1,len=Math.sqrt(dx*dx+dy*dy);
  if(len<5) return;
  ctx.save(); ctx.strokeStyle=color; ctx.fillStyle=color; ctx.lineWidth=2.5; ctx.lineCap='round';
  ctx.beginPath(); ctx.moveTo(x1,y1); ctx.lineTo(x2,y2); ctx.stroke();
  const a=Math.atan2(dy,dx),hs=10;
  ctx.beginPath(); ctx.moveTo(x2,y2);
  ctx.lineTo(x2-hs*Math.cos(a-0.4),y2-hs*Math.sin(a-0.4));
  ctx.lineTo(x2-hs*Math.cos(a+0.4),y2-hs*Math.sin(a+0.4));
  ctx.closePath(); ctx.fill(); ctx.restore();
}

function drawObject(cx,cy,rad,sz){
  ctx.save(); ctx.translate(cx,cy); ctx.rotate(-rad);
  const fill=isDark()?'#3C3489':'#AFA9EC', stroke=isDark()?'#7F77DD':'#534AB7', top=isDark()?'#4a4480':'#c8c4e8';
  if(activePanel==='obj'){ ctx.shadowColor=stroke; ctx.shadowBlur=14; }
  if(shape==='cube'){
    ctx.fillStyle=fill; ctx.strokeStyle=stroke; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.roundRect(-sz/2,-sz/2,sz,sz,4); ctx.fill(); ctx.stroke();
    ctx.shadowBlur=0; ctx.fillStyle=top;
    ctx.beginPath(); ctx.moveTo(-sz/2,-sz/2); ctx.lineTo(-sz/2+6,-sz/2-6); ctx.lineTo(sz/2+6,-sz/2-6); ctx.lineTo(sz/2,-sz/2); ctx.closePath(); ctx.fill(); ctx.strokeStyle=stroke; ctx.stroke();
  } else if(shape==='sphere'){
    ctx.fillStyle=fill; ctx.strokeStyle=stroke; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.arc(0,0,sz/2,0,Math.PI*2); ctx.fill(); ctx.stroke();
    ctx.shadowBlur=0; ctx.strokeStyle=isDark()?'#5a50a0':'#c0bcdc'; ctx.lineWidth=0.5;
    ctx.beginPath(); ctx.ellipse(0,0,sz/2,sz/6,0,0,Math.PI*2); ctx.stroke();
  } else {
    ctx.fillStyle=fill; ctx.strokeStyle=stroke; ctx.lineWidth=1.5;
    ctx.beginPath(); ctx.roundRect(-sz/3,-sz/2,sz*2/3,sz,4); ctx.fill(); ctx.stroke();
    ctx.shadowBlur=0; ctx.fillStyle=top;
    ctx.beginPath(); ctx.ellipse(0,-sz/2,sz/3,sz/9,0,0,Math.PI*2); ctx.fill(); ctx.strokeStyle=stroke; ctx.stroke();
  }
  ctx.restore();
}

function redraw(){
  const theta = getVal('angle-slider');
  const mu    = getVal('mu-slider');
  const mass  = getVal('mass-slider');
  const grav  = getVal('g-slider');

  const rad   = theta * Math.PI / 180;
  const Fg    = mass * grav;
  const Fn    = Fg * Math.cos(rad);
  const Fpara = Fg * Math.sin(rad);
  const Ff    = mu * Fn;
  const Fr    = Fpara - Ff;
  const maxF  = Fg + 10;

  document.getElementById('f-fg').textContent = Fg.toFixed(2)+' N';
  document.getElementById('f-fn').textContent = Fn.toFixed(2)+' N';
  document.getElementById('f-ff').textContent = Ff.toFixed(2)+' N';
  document.getElementById('f-fr').textContent = Math.abs(Fr).toFixed(2)+' N';
  document.getElementById('b-fg').style.width = (Fg/maxF*100).toFixed(0)+'%';
  document.getElementById('b-fn').style.width = (Fn/maxF*100).toFixed(0)+'%';
  document.getElementById('b-ff').style.width = (Ff/maxF*100).toFixed(0)+'%';
  document.getElementById('b-fr').style.width = (Math.abs(Fr)/maxF*100).toFixed(0)+'%';

  const badge=document.getElementById('status-badge');
  if(Math.abs(Fr)<0.01){ badge.textContent='Equilibrio limite'; badge.className='badge badge-limit'; }
  else if(Fr>0)         { badge.textContent='Scivola ↓';         badge.className='badge badge-slide'; }
  else                  { badge.textContent='Fermo ✓';           badge.className='badge badge-still'; }

  const W=canvas.width, H=canvas.height, c=col();
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle=c.bg; ctx.fillRect(0,0,W,H);

  ctx.strokeStyle=c.grid; ctx.lineWidth=0.5;
  for(let x=0;x<W;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,H);ctx.stroke();}
  for(let y=0;y<H;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}

  const pivX=70, pivY=H-50, planeLen=400;
  const tipX=pivX+planeLen*Math.cos(rad);
  const tipY=pivY-planeLen*Math.sin(rad);

  // Minimum thickness for the plane so it's always clickable at 0°
  const THICKNESS = 14;
  const nx = Math.sin(rad), ny = Math.cos(rad); // normal pointing downward into slab

  // Four corners of the plane slab (trapezoid with fixed thickness)
  const p0 = {x: pivX,           y: pivY};           // bottom-left
  const p1 = {x: tipX,           y: tipY};            // top-right (surface)
  const p2 = {x: tipX+nx*THICKNESS, y: tipY+ny*THICKNESS}; // top-right (bottom face)
  const p3 = {x: pivX+nx*THICKNESS, y: pivY+ny*THICKNESS}; // bottom-left (bottom face)

  ctx.fillStyle=c.tri; ctx.strokeStyle=c.text; ctx.lineWidth=0.5;
  ctx.beginPath();
  ctx.moveTo(p0.x,p0.y); ctx.lineTo(p1.x,p1.y);
  ctx.lineTo(p2.x,p2.y); ctx.lineTo(p3.x,p3.y);
  ctx.closePath(); ctx.fill(); ctx.stroke();

  // Texture lines on surface
  ctx.strokeStyle=isDark()?'#2e2e2b':'#d0cfc8'; ctx.lineWidth=0.5;
  for(let i=0.1;i<1;i+=0.12){
    const sx=pivX+planeLen*i*Math.cos(rad), sy=pivY-planeLen*i*Math.sin(rad);
    ctx.beginPath(); ctx.moveTo(sx,sy); ctx.lineTo(sx+6*Math.sin(rad),sy+6*Math.cos(rad)); ctx.stroke();
  }

  // Highlight outline when panel open
  if(activePanel==='plane'){
    ctx.save(); ctx.strokeStyle=c.accent; ctx.lineWidth=2; ctx.setLineDash([6,4]);
    ctx.beginPath();
    ctx.moveTo(p0.x,p0.y); ctx.lineTo(p1.x,p1.y); ctx.lineTo(p2.x,p2.y); ctx.lineTo(p3.x,p3.y);
    ctx.closePath(); ctx.stroke(); ctx.restore();
  }

  // Store quad hit region
  planeRegion = [p0, p1, p2, p3];

  // Angle arc
  ctx.strokeStyle=c.accent; ctx.lineWidth=1.5;
  ctx.beginPath(); ctx.arc(pivX,pivY,44,-rad,0); ctx.stroke();
  ctx.font='500 13px "Anthropic Sans",sans-serif'; ctx.fillStyle=c.accent;
  ctx.fillText('θ = '+theta.toFixed(1)+'°', pivX+48, pivY-12);

  // Object
  const t=0.52;
  const baseX=pivX+planeLen*t*Math.cos(rad), baseY=pivY-planeLen*t*Math.sin(rad);
  const sz=Math.max(28,Math.min(46,28+Math.sqrt(mass)*3));
  const onx=-Math.sin(rad), ony=-Math.cos(rad);
  const ox=baseX+onx*(sz/2), oy=baseY+ony*(sz/2);
  objRegion={cx:ox,cy:oy,radius:sz/2+10};
  drawObject(ox,oy,rad,sz);

  if(activePanel==='obj'){
    ctx.save(); ctx.strokeStyle=c.accent; ctx.lineWidth=1.5; ctx.setLineDash([4,3]);
    ctx.beginPath(); ctx.arc(ox,oy,sz/2+12,0,Math.PI*2); ctx.stroke(); ctx.restore();
  }

  const sc=0.45;
  drawArrow(ox,oy, ox, oy+Math.min(Fg*sc,100), '#E24B4A');
  drawArrow(ox,oy, ox+onx*Math.min(Fn*sc,85), oy+ony*Math.min(Fn*sc,85), '#378ADD');
  const pdx=Math.cos(rad), pdy=-Math.sin(rad);
  if(Ff>0.5){ const d=Fr>0?1:-1; drawArrow(ox,oy,ox+pdx*Math.min(Ff*sc,75)*d,oy+pdy*Math.min(Ff*sc,75)*d,'#1D9E75'); }
  const frL=Math.min(Math.abs(Fr)*sc,65);
  if(frL>4){ const d=Fr>0?-1:1; drawArrow(ox+6,oy+6,ox+6+pdx*frL*d,oy+6+pdy*frL*d,'#EF9F27'); }

  const leg=[['#E24B4A','Fg'],['#378ADD','N'],['#1D9E75','Ff'],['#EF9F27','Fr']];
  ctx.font='400 11px "Anthropic Sans",sans-serif';
  leg.forEach(([color,label],i)=>{
    const lx=12+i*68, ly=H-12;
    ctx.fillStyle=color; ctx.fillRect(lx,ly-8,14,3);
    ctx.fillStyle=c.text; ctx.fillText(label,lx+18,ly);
  });


}

redraw();
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', redraw);