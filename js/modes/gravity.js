import { R, state, modeActions } from '../state.js';
import { els } from '../dom.js';
import { getPos, setPos, cW, cH } from '../utils.js';
import { spawnShockwave } from '../canvas.js';
import { checkCollisions } from '../collision.js';
import SFX from '../sfx.js';

// ══════════════════════════════════════════
// GRAVITY
// ══════════════════════════════════════════
export function startGravity(){
  state.gravityActive=true;
  state.gravVels=[{x:0,y:0},{x:0,y:0},{x:0,y:0}];
  const GRAVITY=0.38;
  const BOUNCE_FLOOR=0.72;   // energy kept on floor bounce
  const BOUNCE_WALL=0.78;    // energy kept on wall bounce
  const FRICTION=0.994;      // air friction per frame
  const MIN_BOUNCE_SPD=1.2;  // below this, don't play sound or spark

  let lastBounceSound=0;

  (function loop(){
    if(!state.gravityActive)return;
    const circles=[els.red,els.blue,els.green];
    circles.forEach((e,i)=>{
      if(e.classList.contains('fading')||state.dragging===e){
        // While dragged, zero out velocity so it doesn't fly on release w/ old vel
        return;
      }
      const v=state.gravVels[i];
      v.y+=GRAVITY;
      v.x*=FRICTION;
      let p=getPos(e);
      p.x+=v.x;p.y+=v.y;

      // Floor bounce
      if(p.y+R*2>=cH()){
        p.y=cH()-R*2;
        const spd=Math.abs(v.y);
        v.y=-spd*BOUNCE_FLOOR;
        v.x*=0.88; // floor friction on x
        if(spd>MIN_BOUNCE_SPD){
          gravBounceEffect(p.x+R,cH(),'floor',spd,i);
          lastBounceSound=gravBounceSound(spd,lastBounceSound);
        }
        // Kill tiny bounces to settle
        if(Math.abs(v.y)<0.5) v.y=0;
      }
      // Ceiling bounce
      if(p.y<=0){
        p.y=0;
        const spd=Math.abs(v.y);
        v.y=spd*0.5;
        if(spd>MIN_BOUNCE_SPD) lastBounceSound=gravBounceSound(spd*0.5,lastBounceSound);
      }
      // Left wall
      if(p.x<=0){
        p.x=0;
        const spd=Math.abs(v.x);
        v.x=spd*BOUNCE_WALL;
        if(spd>MIN_BOUNCE_SPD){
          gravBounceEffect(0,p.y+R,'left',spd,i);
          lastBounceSound=gravBounceSound(spd,lastBounceSound);
        }
      }
      // Right wall
      if(p.x+R*2>=cW()){
        p.x=cW()-R*2;
        const spd=Math.abs(v.x);
        v.x=-spd*BOUNCE_WALL;
        if(spd>MIN_BOUNCE_SPD){
          gravBounceEffect(cW(),p.y+R,'right',spd,i);
          lastBounceSound=gravBounceSound(spd,lastBounceSound);
        }
      }

      setPos(e,p.x,p.y);
    });
    checkCollisions();
    requestAnimationFrame(loop);
  })();
}

function gravBounceEffect(x,y,wall,speed,circleIdx){
  const colors=['#ff6644','#4488ff','#44ee88'];
  const col=colors[circleIdx];
  const n=Math.min(12,Math.floor(speed*0.8));
  // Sparks angled away from wall
  const baseAngle=wall==='floor'?-Math.PI/2:wall==='left'?0:Math.PI;
  for(let i=0;i<n;i++){
    const a=baseAngle+(-0.6+Math.random()*1.2);
    const spd=2+Math.random()*speed*0.25;
    state.particles.push({x,y,vx:Math.cos(a)*spd,vy:Math.sin(a)*spd,r:Math.random()*3+1,life:1,decay:.05+Math.random()*.04,color:col});
  }
  // Small shockwave ring at impact
  if(speed>5) spawnShockwave(x,y,'rgba(255,200,100,',40+speed*3,speed*.6);
}

function gravBounceSound(speed,lastTime){
  const now=Date.now();
  if(now-lastTime<60)return lastTime; // throttle
  // Pitch and volume scale with speed
  const vol=Math.min(0.28,0.06+speed*0.01);
  const freq=120+speed*8;
  SFX.bounce(freq,vol);
  return now;
}

export function stopGravity(){state.gravityActive=false;}

modeActions.startGravity = startGravity;
modeActions.stopGravity = stopGravity;
