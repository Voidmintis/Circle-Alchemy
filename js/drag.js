// ══════════════════════════════════════════
// DRAG HANDLERS
// ══════════════════════════════════════════
import { R, state, modeActions } from './state.js';
import { els, area } from './dom.js';
import { cW, cH } from './utils.js';
import { checkCollisions } from './collision.js';
import SFX from './sfx.js';

export function initDrag(){
  [els.red,els.blue,els.green].forEach(e=>{
    e.addEventListener('mousedown',startDrag);
    e.addEventListener('touchstart',startDrag,{passive:false});
  });
  document.addEventListener('mousemove',moveDrag);
  document.addEventListener('touchmove',moveDrag,{passive:false});
  document.addEventListener('mouseup',endDrag);
  document.addEventListener('touchend',endDrag);
}

function startDrag(e){
  e.preventDefault();
  if(state.merged||state.blackHoleActive)return;
  if(state.advActive&&state.advScene!=='earth'&&state.advScene!=='mars')return;
  state.dragging=e.currentTarget;
  const rect=state.dragging.getBoundingClientRect();
  const touch=e.touches?e.touches[0]:e;
  state.ox=touch.clientX-rect.left;
  state.oy=touch.clientY-rect.top;
  state.dragging.style.zIndex=10;
  state.dragging.style.transition='box-shadow .2s ease';
  state.dragHistory=[];
  if(state.mode==='gravity'){
    const idx=[els.red,els.blue,els.green].indexOf(state.dragging);
    if(idx>=0) state.gravVels[idx]={x:0,y:0};
  }
  SFX.pick();
}

function moveDrag(e){
  if(!state.dragging)return;
  e.preventDefault();
  const touch=e.touches?e.touches[0]:e;
  const ar=area.getBoundingClientRect();
  let nx=touch.clientX-state.ox-ar.left;
  let ny=touch.clientY-state.oy-ar.top;
  if(state.mode==='puzzle'&&modeActions.applyWallCollision)[nx,ny]=modeActions.applyWallCollision(nx,ny);
  nx=Math.max(-R*.3,Math.min(cW()-R*1.7,nx));
  ny=Math.max(-R*.3,Math.min(cH()-R*1.7,ny));
  state.dragging.style.left=nx+'px';state.dragging.style.top=ny+'px';
  const now=performance.now();
  state.dragHistory.push({x:nx,y:ny,t:now});
  if(state.dragHistory.length>8)state.dragHistory.shift();
  if(state.infiniteActive&&modeActions.checkInfiniteSeparation) modeActions.checkInfiniteSeparation();
  else checkCollisions();
}

function endDrag(){
  if(state.dragging){
    // Apply fling velocity in gravity mode
    if(state.mode==='gravity'&&state.dragHistory.length>=2){
      const idx=[els.red,els.blue,els.green].indexOf(state.dragging);
      if(idx>=0){
        const now=performance.now();
        const recent=state.dragHistory.filter(h=>now-h.t<80);
        if(recent.length>=2){
          const a=recent[0],b=recent[recent.length-1];
          const dt=(b.t-a.t)/1000;
          if(dt>0){
            const vx=(b.x-a.x)/dt*0.016;
            const vy=(b.y-a.y)/dt*0.016;
            const maxSpd=28;
            state.gravVels[idx].x=Math.max(-maxSpd,Math.min(maxSpd,vx));
            state.gravVels[idx].y=Math.max(-maxSpd,Math.min(maxSpd,vy));
          }
        }
      }
    }
    state.dragHistory=[];
    state.dragging.style.zIndex='';state.dragging=null;
    checkCollisions();
  }
}
