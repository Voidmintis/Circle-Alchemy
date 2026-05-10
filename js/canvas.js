// ══════════════════════════════════════════
// CANVAS — particles, shockwaves, main loop
// ══════════════════════════════════════════
import { R, state } from './state.js';
import { els, area } from './dom.js';
import SFX from './sfx.js';
import { getCenter, setPos, cW, cH } from './utils.js';

// ── Resize ──
export function resizeCanvases(){
  [els.pCanvas,els.swCanvas].forEach(c=>{c.width=area.clientWidth;c.height=area.clientHeight});
}

// ── Particles ──
export function spawnParticles(x,y,color,n=40,speed=5){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2,spd=Math.random()*speed+1;
    state.particles.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:Math.random()*4+1.5,life:1,decay:Math.random()*.03+.01,color});
  }
}

export function spawnSparks(x,y,color,n=12){
  for(let i=0;i<n;i++){
    const a=Math.random()*Math.PI*2,spd=Math.random()*8+3;
    state.particles.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:Math.random()*2+1,life:1,decay:.04+Math.random()*.04,color,spark:true});
  }
}

export function updateParticles(){
  const ctx=els.pCanvas.getContext('2d');
  ctx.clearRect(0,0,els.pCanvas.width,els.pCanvas.height);
  state.particles=state.particles.filter(p=>{
    p.x+=p.vx;p.y+=p.vy;p.vy+=p.spark?.06:.13;p.vx*=.97;p.life-=p.decay;
    if(p.life<=0)return false;
    ctx.save();ctx.globalAlpha=p.life;
    ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
    ctx.fillStyle=p.color;ctx.shadowColor=p.color;ctx.shadowBlur=p.spark?14:8;ctx.fill();
    ctx.restore();return true;
  });
}

// ── Shockwaves ──
export function spawnShockwave(x,y,color='rgba(255,180,50,',maxR=250,speed=6){
  state.shockwaves.push({x,y,r:0,maxR,speed,color,life:1});
  const now=Date.now();
  if(now-state._lastSwSfx>320){state._lastSwSfx=now;SFX.shockwave();}
}

export function updateShockwaves(){
  const ctx=els.swCanvas.getContext('2d');
  ctx.clearRect(0,0,els.swCanvas.width,els.swCanvas.height);
  state.shockwaves=state.shockwaves.filter(sw=>{
    sw.r+=sw.speed;sw.life=1-sw.r/sw.maxR;
    if(sw.life<=0)return false;
    ctx.save();
    ctx.beginPath();ctx.arc(sw.x,sw.y,sw.r,0,Math.PI*2);
    ctx.strokeStyle=sw.color+sw.life*.8+')';
    ctx.lineWidth=3+sw.life*4;
    ctx.shadowColor=sw.color+'0.6)';ctx.shadowBlur=15;
    ctx.stroke();ctx.restore();
    return true;
  });
  // Knock circles if shockwave from boss hits them
  if(state.bossAlive){
    state.shockwaves.forEach(sw=>{
      if(sw.fromBoss){
        [els.red,els.blue,els.green].forEach(e=>{
          if(e.classList.contains('fading'))return;
          const c=getCenter(e);
          const d=Math.hypot(c.x-sw.x,c.y-sw.y);
          if(Math.abs(d-sw.r)<30){
            const ang=Math.atan2(c.y-sw.y,c.x-sw.x);
            const force=25;
            let px=parseFloat(e.style.left)||0,py=parseFloat(e.style.top)||0;
            px+=Math.cos(ang)*force;py+=Math.sin(ang)*force;
            px=Math.max(0,Math.min(cW()-R*2,px));
            py=Math.max(0,Math.min(cH()-R*2,py));
            e.classList.add('knocked');
            setPos(e,px,py);
            setTimeout(()=>e.classList.remove('knocked'),350);
          }
        });
      }
    });
  }
}

// ── Main render loop ──
// The loop calls drawInfChains/updateStormBullets when infinite mode is active.
// Those are injected via registerLoopHook so canvas.js doesn't import infinite.js directly.
const loopHooks = [];
export function registerLoopHook(fn){ loopHooks.push(fn); }

export function startMainLoop(){
  (function loop(){
    updateParticles();
    updateShockwaves();
    loopHooks.forEach(fn=>fn());
    requestAnimationFrame(loop);
  })();
}
