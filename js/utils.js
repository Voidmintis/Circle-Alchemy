// ══════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════
import { R, startOffsets, state } from './state.js';
import { els, area } from './dom.js';

export function getCenter(e){
  const ar=area.getBoundingClientRect(),r=e.getBoundingClientRect();
  return{x:r.left+r.width/2-ar.left,y:r.top+r.height/2-ar.top,rad:r.width/2};
}
export function isTouching(a,b){const ca=getCenter(a),cb=getCenter(b);return Math.hypot(ca.x-cb.x,ca.y-cb.y)<ca.rad+cb.rad+6}
export function setPos(e,x,y){e.style.left=x+'px';e.style.top=y+'px'}
export function getPos(e){return{x:parseFloat(e.style.left)||0,y:parseFloat(e.style.top)||0}}
export function cW(){return area.clientWidth}
export function cH(){return area.clientHeight}

export function resetPositions(){
  const w=cW(), h=cH();
  if(w<10||h<10){
    requestAnimationFrame(resetPositions);
    return;
  }
  [els.red,els.blue,els.green].forEach((e,i)=>{
    const cx=w/2, cy=h/2;
    setPos(e,cx+startOffsets[i].dx-R, cy+startOffsets[i].dy-R);
    e.classList.remove('fading','hidden','knocked');
    ['opacity','transform','pointerEvents','transition','zIndex'].forEach(p=>e.style[p]='');
  });
  state.gravVels=[{x:0,y:0},{x:0,y:0},{x:0,y:0}];
}

export function hideGold(){
  if(state.orbPersonalityTimer){clearInterval(state.orbPersonalityTimer);state.orbPersonalityTimer=null;}
  els.gold.classList.remove('visible');els.gold.style.pointerEvents='none';
  els.gold.style.marginTop='';
  els.hole.classList.remove('visible');els.hole.style.boxShadow='';
  els.ring.classList.remove('show');
  state.blackHoleActive=false;
}

export function setStatus(txt,cls=''){els.status.textContent=txt;els.status.className=cls}

export function setPips(rb,bg,rg){
  els.pr.classList.toggle('active',rb||rg);
  els.pb.classList.toggle('active',rb||bg);
  els.pg.classList.toggle('active',bg||rg);
}

export function flashScreen(color='rgba(255,220,80,.38)',duration=160){
  els.flash.style.background=color;els.flash.classList.add('pop');
  setTimeout(()=>els.flash.classList.remove('pop'),duration);
}

export function shake(level='sm'){
  document.body.classList.add('shake-'+level);
  setTimeout(()=>document.body.classList.remove('shake-'+level),level==='lg'?750:level==='md'?520:370);
}

export function showMsg(title,sub,color='var(--gold)'){
  els.fusionTitle.textContent=title;els.fusionSub.textContent=sub;
  els.fusionTitle.style.color=color;
  els.fusionMsg.classList.add('show');setTimeout(()=>els.fusionMsg.classList.remove('show'),2400);
}

export function toast(txt,color='var(--gold)'){
  const t=document.createElement('div');t.className='discovery-toast';
  t.style.color=color;t.style.borderColor=color;t.textContent=txt;
  els.discoveryLog.appendChild(t);setTimeout(()=>t.remove(),2800);
}

export function modeHint(){
  return{fusion:'DRAG ALL THREE CIRCLES TOGETHER',puzzle:'NAVIGATE AROUND OBSTACLES',gravity:'DRAG WHILE THEY FALL — COLLIDE TO FUSE',scifi:'DRAG ALL THREE CIRCLES INTO THE REACTOR',adventure:'FUSE CIRCLES TO EARN ENERGY',boss:'FUSE THE ELEMENTS — IF YOU DARE',orbfight:''}[state.mode]??'DRAG THE CIRCLES TOGETHER';
}

export function bumpCombo(){
  state.comboCount++;
  if(state.comboTimer)clearTimeout(state.comboTimer);
  state.comboTimer=setTimeout(()=>{state.comboCount=0;els.comboDisplay.classList.remove('show');},8000);
  if(state.comboCount>1){
    const labels=['','','✦ COMBO x2','✦✦ COMBO x3 — HOT STREAK!','✦✦✦ COMBO x4 — ON FIRE!','⚡ COMBO x5 — UNSTOPPABLE!'];
    els.comboDisplay.textContent=labels[Math.min(state.comboCount,5)]||`⚡ COMBO x${state.comboCount} — LEGENDARY!`;
    els.comboDisplay.classList.add('show');
  }
  return state.comboCount;
}

export function isPerfectFusion(){
  const cr=getCenter(els.red),cb=getCenter(els.blue),cg=getCenter(els.green);
  const cx=(cr.x+cb.x+cg.x)/3,cy=(cr.y+cb.y+cg.y)/3;
  return[cr,cb,cg].every(c=>Math.hypot(c.x-cx,c.y-cy)<38);
}
