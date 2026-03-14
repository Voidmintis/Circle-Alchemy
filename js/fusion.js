// ══════════════════════════════════════════
// FUSION — charge, trigger, gold orb, diamond, meltdown, black hole, split
// ══════════════════════════════════════════
import { R, FUSION_CHARGE_DURATION, state, modeActions } from './state.js';
import { els, area } from './dom.js';
import {
  getCenter, setPos, cW, cH, setStatus, showMsg, flashScreen, shake,
  hideGold, modeHint, bumpCombo, isPerfectFusion, toast
} from './utils.js';
import { spawnParticles, spawnSparks, spawnShockwave } from './canvas.js';
import SFX from './sfx.js';
import { isBlackHoleTrigger } from './collision.js';

// ══════════════════════════════════════════
// FUSION CHARGE METER
// ══════════════════════════════════════════
export function startFusionCharge(){
  if(state.fusionCharging)return;
  state.fusionCharging=true;
  state.fusionChargeStart=Date.now();
  state.fusionChargePct=0;
  setStatus(state.mode==='scifi'?'⚡ HOLD — REACTOR CHARGING...':'⚡ HOLD — CHARGING FUSION...','merged');

  const isSci=state.mode==='scifi';
  const arcColor0=isSci?'#44aaff':'#f5c842';
  const arcColor1=isSci?'#44ffee':'#ffffff';
  const bgRingColor=isSci?'rgba(68,170,255,.15)':'rgba(245,200,66,.15)';
  const shadowColor=isSci?'rgba(68,200,255,.9)':'rgba(245,200,66,.9)';
  const sparkColor=isSci?'#44aaff':'#f5c842';

  const canvas=els.fusionChargeCvs;
  canvas.width=area.clientWidth; canvas.height=area.clientHeight;

  state.fusionChargeTimer=setInterval(()=>{
    if(!state.fusionCharging){clearInterval(state.fusionChargeTimer);return;}
    const elapsed=Date.now()-state.fusionChargeStart;
    state.fusionChargePct=Math.min(1,elapsed/FUSION_CHARGE_DURATION);

    const cr=getCenter(els.red),cb=getCenter(els.blue),cg=getCenter(els.green);
    const cx=(cr.x+cb.x+cg.x)/3,cy=(cr.y+cb.y+cg.y)/3;
    const r=70+state.fusionChargePct*18;

    const ctx=canvas.getContext('2d');
    ctx.clearRect(0,0,canvas.width,canvas.height);

    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.strokeStyle=bgRingColor;ctx.lineWidth=8;ctx.stroke();

    ctx.beginPath();ctx.arc(cx,cy,r,-Math.PI/2,-Math.PI/2+Math.PI*2*state.fusionChargePct);
    const grad=ctx.createLinearGradient(cx-r,cy,cx+r,cy);
    grad.addColorStop(0,arcColor0);grad.addColorStop(1,arcColor1);
    ctx.strokeStyle=grad;ctx.lineWidth=7;
    ctx.shadowColor=shadowColor;ctx.shadowBlur=18;ctx.stroke();

    if(Math.random()<.3){
      const tipAngle=-Math.PI/2+Math.PI*2*state.fusionChargePct;
      spawnSparks(cx+Math.cos(tipAngle)*r,cy+Math.sin(tipAngle)*r,sparkColor,2);
      SFX.charge(state.fusionChargePct*100);
    }

    if(state.fusionChargePct>=1){
      clearInterval(state.fusionChargeTimer);
      ctx.clearRect(0,0,canvas.width,canvas.height);
      state.fusionCharging=false;
      triggerFusion();
    }
  },16);
}

export function cancelFusionCharge(){
  if(!state.fusionCharging)return;
  state.fusionCharging=false;
  clearInterval(state.fusionChargeTimer);
  state.fusionChargePct=0;
  const ctx=els.fusionChargeCvs.getContext('2d');
  ctx.clearRect(0,0,els.fusionChargeCvs.width,els.fusionChargeCvs.height);
}

// ══════════════════════════════════════════
// FUSION TRIGGER
// ══════════════════════════════════════════
export function triggerFusion(){
  if(state.infiniteActive)return;
  state.merged=true;state.dragging=null;
  modeActions.stopGravity?.();
  modeActions.stopTimer?.();
  [els.red,els.blue,els.green].forEach(e=>e.classList.remove('magnetic'));

  const cr=getCenter(els.red),cb=getCenter(els.blue),cg=getCenter(els.green);
  const cx=(cr.x+cb.x+cg.x)/3,cy=(cr.y+cb.y+cg.y)/3;
  const bh=state.mode!=='boss'&&isBlackHoleTrigger();
  const perfect=isPerfectFusion();

  if((state.mode==='fusion'||state.mode==='gravity'||state.mode==='scifi')&&!bh){
    doFusionSwirl(cx,cy,perfect,()=>{
      state.mode==='boss'?modeActions.triggerBoss?.(cx,cy):triggerGoldOrb(cx,cy,perfect);
    });
  } else {
    spawnParticles(cx,cy,'#f5c842',70);spawnParticles(cx,cy,'#ff8844',35);spawnParticles(cx,cy,'#ffffff',25);
    [els.red,els.blue,els.green].forEach(e=>e.classList.add('fading'));
    flashScreen(bh?'rgba(80,0,160,.55)':'rgba(255,220,80,.45)');
    setTimeout(()=>bh?triggerBlackHole(cx,cy):state.mode==='boss'?modeActions.triggerBoss?.(cx,cy):triggerGoldOrb(cx,cy,false),400);
  }
}

// ══════════════════════════════════════════
// FUSION SWIRL
// ══════════════════════════════════════════
function doFusionSwirl(cx,cy,perfect,callback){
  const circles=[els.red,els.blue,els.green];
  const colors=['#ff4455','#4488ff','#44ee88'];
  const startPositions=circles.map(e=>getCenter(e));
  const startAngles=startPositions.map(c=>Math.atan2(c.y-cy,c.x-cx));
  const startDists=startPositions.map(c=>Math.max(20,Math.hypot(c.x-cx,c.y-cy)));

  let t=0;
  const SWIRL_MS=520;
  circles.forEach(e=>{e.style.pointerEvents='none';e.style.transition='none';});

  const swirlLoop=setInterval(()=>{
    t+=16;
    const p=Math.min(1,t/SWIRL_MS);
    const ease=1-Math.pow(1-p,3);
    const spin=p*Math.PI*3.5;

    circles.forEach((e,i)=>{
      const ang=startAngles[i]+spin;
      const dist=startDists[i]*(1-ease);
      const nx=cx+Math.cos(ang)*dist-R;
      const ny=cy+Math.sin(ang)*dist-R;
      setPos(e,nx,ny);
      if(Math.random()<p*.4) spawnSparks(nx+R,ny+R,colors[i],2);
    });

    const ctx=els.fusionChargeCvs.getContext('2d');
    ctx.clearRect(0,0,els.fusionChargeCvs.width,els.fusionChargeCvs.height);
    const ringR=20+ease*55;
    const ringColor=state.mode==='scifi'?`rgba(68,200,255,${.3+ease*.7})`:`rgba(245,200,66,${.3+ease*.7})`;
    const ringShadow=state.mode==='scifi'?'rgba(68,200,255,.8)':'rgba(245,200,66,.8)';
    ctx.beginPath();ctx.arc(cx,cy,ringR,0,Math.PI*2);
    ctx.strokeStyle=ringColor;
    ctx.lineWidth=4+ease*6;
    ctx.shadowColor=ringShadow;ctx.shadowBlur=18;ctx.stroke();

    if(p>=1){
      clearInterval(swirlLoop);
      ctx.clearRect(0,0,els.fusionChargeCvs.width,els.fusionChargeCvs.height);

      const bangCol=state.mode==='scifi'?'#44aaff':'#f5c842';
      const bangCol2=state.mode==='scifi'?'#44ffee':'#ff8844';
      spawnParticles(cx,cy,bangCol,80);spawnParticles(cx,cy,bangCol2,40);spawnParticles(cx,cy,'#ffffff',30);
      if(perfect){spawnParticles(cx,cy,'#ffffff',60);spawnShockwave(cx,cy,state.mode==='scifi'?'rgba(68,200,255,':'rgba(255,230,100,',160,8);}
      flashScreen(state.mode==='scifi'?'rgba(68,170,255,.5)':perfect?'rgba(255,255,200,.7)':'rgba(255,220,80,.5)');
      shake(perfect?'md':'sm');
      circles.forEach(e=>e.classList.add('fading'));
      setTimeout(()=>callback(),350);
    }
  },16);
}

// ══════════════════════════════════════════
// NON-BOSS GOLD ORB
// ══════════════════════════════════════════
export function triggerGoldOrb(cx,cy,perfect=false){
  // Diamond fusion: 5% chance in gravity/puzzle/scifi (not boss/adventure/infinite)
  if(!perfect&&!state.advActive&&!state.infiniteActive&&(state.mode==='gravity'||state.mode==='puzzle'||state.mode==='scifi')){
    if(Math.random()<0.05){
      triggerDiamondFusion(cx,cy);
      return;
    }
  }

  // 10% meltdown chance (not in boss, puzzle, or scifi modes)
  if(state.mode==='fusion'||state.mode==='gravity'||state.mode==='discovery'||state.mode==='adventure'){
    const chance=state.advActive&&modeActions.advMeltdownChance?modeActions.advMeltdownChance():0.10;
    if(Math.random()<chance){
      triggerMeltdown(cx,cy);
      return;
    }
  }

  if(state.mode==='scifi'){
    modeActions.scifiOnFusion?.(cx,cy,perfect);
    return;
  }

  const combo=bumpCombo();
  const size=perfect?138:122;

  const glow=perfect
    ?'0 0 80px 30px rgba(255,255,200,.9),0 0 160px 70px rgba(245,200,66,.6),inset 0 2px 0 rgba(255,255,255,.7)'
    :'0 0 60px 20px rgba(245,200,66,.7),0 0 120px 50px rgba(245,200,66,.3),inset 0 2px 0 rgba(255,255,255,.5)';
  const bg=perfect
    ?'radial-gradient(circle at 38% 35%,#ffffff,#fff8aa 25%,#f5c842 55%,#c87800)'
    :'radial-gradient(circle at 38% 35%,#fffde0,#f5c842 40%,#c87800)';

  Object.assign(els.gold.style,{
    width:size+'px',height:size+'px',left:cx+'px',top:cy+'px',
    background:bg,boxShadow:glow,animation:'',filter:'',
    transition:'opacity .4s,transform .5s cubic-bezier(.175,.885,.32,1.4)',
  });

  if(state.mode==='scifi'){
    els.orbText.textContent='POWER CORE'; els.orbIcon.textContent='⚡';
  } else if(perfect){
    els.orbText.textContent='PERFECT'; els.orbIcon.textContent='✦✦';
  } else {
    els.orbText.textContent='GOLD'; els.orbIcon.textContent='✦';
  }
  els.bossPhaseLabel.textContent=combo>1?`COMBO x${combo}`:'';

  els.gold.style.pointerEvents='all';els.gold.style.cursor='pointer';
  els.gold.classList.add('visible');
  setTimeout(()=>startOrbPersonality(perfect),500);
  els.gold.onclick=splitApart;

  if(perfect){
    spawnParticles(cx,cy,'#ffffff',60);spawnParticles(cx,cy,'#f5c842',40);
    spawnShockwave(cx,cy,'rgba(255,230,100,',180,9);
    flashScreen('rgba(255,255,200,.6)');
    shake('md');
    showMsg('✦ PERFECT FUSION','ALL ELEMENTS ALIGNED — GOLD BONUS!','#ffffff');
    setStatus('✦ PERFECT FUSION — CLICK ORB TO SPLIT','merged');
    SFX.perfectFusion();
  } else if(state.mode==='scifi'){
    showMsg('RGB ENERGY SYNCHRONIZED','CORE CREATED — CLICK TO SPLIT','#44aaff');
    setStatus('CORE CREATED — CLICK TO SPLIT','merged');
    els.energyFill.style.width='100%'; els.energyVal.textContent='100%';
    SFX.fusion();
  } else {
    if(combo>1){
      showMsg(`COMBO x${combo} — FUSION CHAIN!`,'TRANSMUTATION SUCCESSFUL','#ffcc44');
      SFX.combo(combo);
    } else {
      showMsg('FUSION COMPLETE','TRANSMUTATION SUCCESSFUL — CLICK ORB TO SPLIT');
      SFX.fusion();
    }
    setStatus('✦ FUSION COMPLETE — CLICK ORB TO SPLIT','merged');
  }

  flashScreen('rgba(255,220,80,.45)');
  modeActions.advHandleFusion?.();
  if(state.mode==='puzzle'){
    if(state.puzzleLevel<4) setTimeout(()=>modeActions.nextPuzzleLevel?.(),1900);
    else {
      showMsg('🏆 PUZZLE COMPLETE','ALL LEVELS CLEARED!','var(--gold)');
      setStatus('🏆 ALL LEVELS CLEARED — WELL DONE!','merged');
      els.restartBtn.classList.add('show');
    }
  }
}

// ══════════════════════════════════════════
// ORB PERSONALITY (float + pulse)
// ══════════════════════════════════════════
function startOrbPersonality(perfect){
  if(state.orbPersonalityTimer)clearInterval(state.orbPersonalityTimer);
  const pulse=perfect?'pulse-perfect 1.4s ease-in-out infinite':'pulse-gold 2.2s ease-in-out infinite';
  els.gold.style.animation=pulse;
  els.gold.style.marginTop='0px';
  let t=0;
  state.orbPersonalityTimer=setInterval(()=>{
    if(!els.gold.classList.contains('visible')){clearInterval(state.orbPersonalityTimer);return;}
    t+=0.04;
    els.gold.style.marginTop=(Math.sin(t)*4)+'px';
    if(Math.random()<.07){
      const cx=parseFloat(els.gold.style.left);
      const cy=parseFloat(els.gold.style.top);
      spawnSparks(cx+(-40+Math.random()*80),cy+(-40+Math.random()*80),'#f5c842',2);
    }
  },50);
}

// ══════════════════════════════════════════
// DIAMOND FUSION — 5% rare event
// ══════════════════════════════════════════
function triggerDiamondFusion(cx,cy){
  state.merged=true;
  SFX.diamondFusion();

  Object.assign(els.gold.style,{
    width:'130px',height:'130px',left:cx+'px',top:cy+'px',
    background:'radial-gradient(circle at 32% 28%,#ffffff,#ccf4ff 25%,#88ddff 50%,#22aadd 75%,#004466)',
    animation:'diamond-pulse .8s ease-in-out infinite',
    filter:'',transition:'opacity .3s',pointerEvents:'none',cursor:'default',
  });
  els.orbText.textContent='DIAMOND';els.orbIcon.textContent='💎';els.bossPhaseLabel.textContent='';
  els.orbText.style.color='rgba(200,240,255,.95)';els.orbIcon.style.color='rgba(200,240,255,.95)';
  els.gold.classList.add('visible');

  flashScreen('rgba(180,240,255,.6)');
  shake('sm');
  spawnParticles(cx,cy,'#aaeeff',80,10);spawnParticles(cx,cy,'#ffffff',50,14);
  spawnShockwave(cx,cy,'rgba(180,240,255,',220,10);
  showMsg('💎 DIAMOND FUSION','CRYSTAL CORE FORMED','#aaeeff');
  setStatus('💎 DIAMOND FUSION — RARE EVENT!','merged');

  for(let i=0;i<12;i++){
    setTimeout(()=>{
      const a=(i/12)*Math.PI*2;
      const hue=Math.floor(Math.random()*360);
      spawnSparks(cx+Math.cos(a)*90,cy+Math.sin(a)*90,`hsl(${hue},100%,80%)`,4);
    },i*60);
  }

  setTimeout(()=>{
    flashScreen('rgba(200,250,255,.5)',100);
    shake('md');
    _diamondRain(cx,cy);
    SFX.diamondRain?.();
  },800);

  setTimeout(()=>{
    _diamondShatter(cx,cy);
  },2800);
}

function _diamondRain(cx,cy){
  const W=cW(),H=cH();
  const count=60;
  for(let i=0;i<count;i++){
    setTimeout(()=>{
      const d=document.createElement('div');
      const x=Math.random()*W;
      const size=4+Math.random()*8;
      const hue=180+Math.floor(Math.random()*60);
      const dur=800+Math.random()*1000;
      d.style.cssText=`
        position:absolute;left:${x}px;top:-10px;width:${size}px;height:${size}px;
        background:hsl(${hue},80%,75%);border-radius:2px;z-index:11;pointer-events:none;
        transform:rotate(45deg);box-shadow:0 0 ${size}px hsl(${hue},100%,85%);
        animation:diamond-shard ${dur}ms ease-in forwards;
        --sx:${-30+Math.random()*60}px;--sy:${H*0.6+Math.random()*H*0.4}px;--sr:${Math.random()*360}deg;
      `;
      area.appendChild(d);
      setTimeout(()=>d.remove(),dur+100);
      if(Math.random()<0.4) setTimeout(()=>SFX.diamondTinkle(),dur*0.8);
    },i*25);
  }
  for(let i=0;i<8;i++){
    setTimeout(()=>{
      const rx=Math.random()*W,ry=Math.random()*H;
      spawnParticles(rx,ry,'#aaffee',15,6);
      spawnSparks(rx,ry,'#ffffff',6);
    },i*200);
  }
}

function _diamondShatter(cx,cy){
  els.gold.style.animation='diamond-crack .6s ease-in forwards';
  shake('md');

  setTimeout(()=>{
    const colors=['#aaeeff','#88ddff','#ccffff','#ffffff','#66ccee','#ffaaff'];
    for(let i=0;i<16;i++){
      const a=(i/16)*Math.PI*2+Math.random()*.3;
      const speed=4+Math.random()*8;
      const col=colors[i%colors.length];
      state.particles.push({
        x:cx,y:cy,
        vx:Math.cos(a)*speed,vy:Math.sin(a)*speed-2,
        r:3+Math.random()*5,life:1,decay:.025+Math.random()*.02,
        color:col,spark:false
      });
    }
    spawnParticles(cx,cy,'#aaeeff',60,12);
    spawnParticles(cx,cy,'#ffffff',30,8);
    spawnShockwave(cx,cy,'rgba(170,238,255,',260,10);
    flashScreen('rgba(200,255,255,.7)');
    SFX.diamondShatter();

    els.gold.classList.remove('visible');
    els.gold.style.animation='';
    els.gold.style.opacity='';
    els.orbText.style.color='';els.orbIcon.style.color='';

    setTimeout(()=>{
      state.merged=false;
      popCirclesOut();
      setStatus(modeHint());
      modeActions.startGravity?.();
      if(state.mode==='scifi'){
        state._scifiResetPhase?.();
        els.energyFill.style.width='0%';els.energyVal.textContent='0%';
      }
    },400);
  },600);
}

// ══════════════════════════════════════════
// MELTDOWN
// ══════════════════════════════════════════
function triggerMeltdown(cx,cy){
  Object.assign(els.gold.style,{
    width:'122px',height:'122px',left:cx+'px',top:cy+'px',
    background:'radial-gradient(circle at 38% 35%,#fffde0,#f5c842 40%,#c87800)',
    boxShadow:'0 0 60px 20px rgba(245,200,66,.7),0 0 120px 50px rgba(245,200,66,.3),inset 0 2px 0 rgba(255,255,255,.5)',
    animation:'',filter:'',transition:'opacity .4s,transform .5s cubic-bezier(.175,.885,.32,1.4)',pointerEvents:'none',
  });
  els.orbText.textContent='GOLD';els.orbIcon.textContent='✦';els.bossPhaseLabel.textContent='';
  els.gold.classList.add('visible');
  flashScreen('rgba(255,220,80,.45)');
  setStatus('✦ FUSION COMPLETE — CLICK ORB TO—','merged');
  showMsg('FUSION COMPLE—','','var(--gold)');

  setTimeout(()=>{
    els.fusionMsg.classList.remove('show');
    els.fusionTitle.textContent='FUSION COMPLE—';
    els.fusionTitle.style.color='#ff5533';
    els.fusionSub.textContent='CRITICAL INSTABILITY DETECTED';
    els.fusionMsg.classList.add('show');
    setStatus('⚠ CORE UNSTABLE — CRITICAL FAILURE IMMINENT','danger');
    els.gold.classList.add('trembling');
    shake('sm');
    spawnSparks(cx,cy,'#ff4422',10);spawnSparks(cx,cy,'#ffffff',6);
    SFX.meltdownWarn();
  },700);

  setTimeout(()=>{
    els.fusionMsg.classList.remove('show');
    setStatus('☠ SINGULARITY FORMING — EVACUATE','danger');
    els.gold.classList.remove('trembling');
    flashScreen('rgba(255,60,30,.5)');shake('md');
    const collapseStart=Date.now();
    const loop=setInterval(()=>{
      const p=Math.min(1,(Date.now()-collapseStart)/850);
      const e2=p*p;
      const s=122*(1-e2*.98);
      const br=1+e2*4;
      Object.assign(els.gold.style,{
        width:s+'px',height:s+'px',
        filter:`brightness(${br}) saturate(${1+e2*5})`,
        boxShadow:`0 0 ${25+e2*90}px ${8+e2*60}px rgba(255,${Math.floor(200-e2*190)},${Math.floor(80-e2*80)},.95)`,
      });
      if(Math.random()<.25+e2*.5){
        const a=Math.random()*Math.PI*2,d=30+Math.random()*70;
        spawnSparks(cx+Math.cos(a)*d,cy+Math.sin(a)*d,'#ffaa00',2);
      }
      if(p>=1){clearInterval(loop);els.gold.classList.remove('visible');doSingularity(cx,cy);}
    },16);
  },1400);
}

function doSingularity(cx,cy){
  flashScreen('rgba(0,0,0,.92)',350);shake('lg');
  SFX.singularity();

  els.spaceDistort.style.setProperty('--bx',(cx/window.innerWidth*100)+'%');
  els.spaceDistort.style.setProperty('--by',(cy/window.innerHeight*100)+'%');
  els.spaceDistort.classList.add('show');
  document.body.classList.add('meltdown-warp');
  els.stars.classList.add('pulling');

  const pull=setInterval(()=>{
    [els.red,els.blue,els.green].forEach(e=>{
      const c=getCenter(e);
      const ang=Math.atan2(cy-c.y,cx-c.x);
      const dist=Math.hypot(c.x-cx,c.y-cy);
      const f=Math.max(3,22-(dist*.04));
      setPos(e,parseFloat(e.style.left)+Math.cos(ang)*f,parseFloat(e.style.top)+Math.sin(ang)*f);
      if(Math.random()<.2) spawnSparks(c.x,c.y,['#ff4455','#4488ff','#44ee88'][~~(Math.random()*3)],2);
    });
    spawnSparks(cx+(-90+Math.random()*180),cy+(-90+Math.random()*180),'#ffffff',1);
  },55);

  const dot=document.createElement('div');
  dot.id='meltdown-dot';
  dot.style.cssText=`position:absolute;border-radius:50%;z-index:78;pointer-events:none;
    left:${cx}px;top:${cy}px;width:4px;height:4px;transform:translate(-50%,-50%);
    background:#000;box-shadow:0 0 10px 4px rgba(100,0,200,.9),0 0 0 2px #fff;
    transition:width 1.8s ease,height 1.8s ease,box-shadow 1.8s ease;`;
  area.appendChild(dot);
  setTimeout(()=>{
    dot.style.width='24px';dot.style.height='24px';
    dot.style.boxShadow='0 0 50px 24px rgba(60,0,160,.95),0 0 100px 50px rgba(20,0,80,.6),0 0 0 3px rgba(200,150,255,.6)';
  },60);

  els.meltdownLine1.textContent='SINGULARITY';els.meltdownLine1.style.color='#cc66ff';
  els.meltdownLine2.textContent='GRAVITY BEYOND CONTAINMENT';els.meltdownLine2.style.color='rgba(210,170,255,.7)';
  els.meltdownOverlay.classList.add('show');
  setTimeout(()=>els.meltdownLine1.style.opacity='1',200);
  setTimeout(()=>els.meltdownLine2.style.opacity='1',1000);

  setTimeout(()=>{
    clearInterval(pull);
    els.meltdownLine1.textContent='⚠';els.meltdownLine1.style.color='#fff';
    els.meltdownLine2.style.opacity='0';
    flashScreen('rgba(255,255,255,.15)',600);
  },2400);

  setTimeout(()=>{ dot.remove(); doSupernova(cx,cy); },2900);
}

function doSupernova(cx,cy){
  els.meltdownLine1.textContent='SUPERNOVA';
  els.meltdownLine1.style.fontSize='clamp(2rem,9vw,5rem)';
  els.meltdownLine1.style.textShadow='0 0 60px #fff,0 0 130px rgba(255,180,80,.9)';
  els.meltdownLine2.textContent='CONTAINMENT FAILED';
  els.meltdownLine2.style.opacity='1';els.meltdownLine2.style.color='rgba(255,220,180,.6)';
  SFX.supernova();

  const sn=els.supernovaFlash;
  sn.style.transition='none';sn.style.opacity='1';
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
    sn.style.transition='opacity 2s ease';sn.style.opacity='0';
  }));

  shake('lg');setTimeout(()=>shake('lg'),180);setTimeout(()=>shake('md'),450);setTimeout(()=>shake('sm'),700);

  const cols=['#ffffff','#ffee88','#ff8844','#ff5533','#cc44ff','#44aaff'];
  for(let w=0;w<6;w++){
    setTimeout(()=>{
      flashScreen(`rgba(255,${180-w*20},${100-w*12},.5)`,90);
      spawnParticles(cx,cy,cols[w],80,10+w*2);
      spawnSparks(cx,cy,cols[w],20);
      spawnShockwave(cx,cy,`rgba(255,${180-w*25},255,`,cW()*.75+w*90,9+w);
    },w*175);
  }
  for(let i=0;i<8;i++){
    setTimeout(()=>{
      const a=(i/8)*Math.PI*2;
      spawnParticles(cx+Math.cos(a)*110,cy+Math.sin(a)*110,cols[i%6],45,7);
    },i*130);
  }

  setTimeout(()=>{
    els.meltdownLine1.style.opacity='0';
    els.meltdownLine2.textContent='…stabilizing…';
    els.meltdownLine2.style.color='rgba(180,220,255,.4)';
    document.body.classList.remove('meltdown-warp');
    els.spaceDistort.classList.remove('show');
    els.stars.classList.remove('pulling');
    els.stars.classList.add('restoring');
    setTimeout(()=>els.stars.classList.remove('restoring'),3500);

    popCirclesOut();
    [els.red,els.blue,els.green].forEach(e=>{
      e.classList.remove('fading');
      ['opacity','transform','pointerEvents','transition'].forEach(p=>e.style[p]='');
    });
    setStatus('…NORMAL SPACE RESTORED…','merged');
  },2200);

  setTimeout(()=>{
    els.meltdownLine2.style.opacity='0';
    setTimeout(()=>{
      els.meltdownOverlay.classList.remove('show');
      els.meltdownLine1.style.opacity='0';
      els.meltdownLine1.style.fontSize='';els.meltdownLine1.style.textShadow='';
    },600);
    state.merged=false;
    setStatus(modeHint());
  },5000);
}

// ══════════════════════════════════════════
// BLACK HOLE
// ══════════════════════════════════════════
function triggerBlackHole(cx,cy){
  state.blackHoleActive=true;
  Object.assign(els.hole.style,{width:'200px',height:'200px',left:cx+'px',top:cy+'px',boxShadow:'0 0 80px 40px rgba(80,0,180,.85),0 0 200px 100px rgba(40,0,110,.5),inset 0 0 60px rgba(0,0,0,1)'});
  els.hole.classList.add('visible');els.warp.classList.add('active');
  shake('lg');flashScreen('rgba(60,0,140,.6)');
  showMsg('BLACK HOLE FORMED','ALL MATTER CONSUMED','#aa44ff');
  setStatus('▼ BLACK HOLE — REALITY WARPS ▼','blackhole');
  spawnParticles(cx,cy,'#6600cc',90);spawnParticles(cx,cy,'#cc00ff',60);spawnParticles(cx,cy,'#ffffff',25);
  SFX.blackHole();

  setTimeout(()=>{
    els.hole.style.transition='width .8s ease,height .8s ease,opacity .8s ease';
    els.hole.style.width='0';els.hole.style.height='0';els.hole.style.opacity='0';
    els.warp.classList.remove('active');
    flashScreen('rgba(180,100,255,.5)');
    shake('md');
    spawnParticles(cx,cy,'#cc44ff',60);
    spawnShockwave(cx,cy,'rgba(140,60,255,',cW()*.6,8);
    showMsg('SINGULARITY DISPERSED','SPACE-TIME RESTORED','#aa44ff');
    setStatus(modeHint());
  },3500);

  setTimeout(()=>{
    state.blackHoleActive=false;
    els.hole.classList.remove('visible');
    els.hole.style.transition='';els.hole.style.width='';els.hole.style.height='';els.hole.style.opacity='';
    state.merged=false;
    popCirclesOut();
    setStatus(modeHint());
    modeActions.startGravity?.();
  },4500);
}

// ══════════════════════════════════════════
// SPLIT APART + POP CIRCLES
// ══════════════════════════════════════════
export function splitApart(){
  if(state.mode==='boss')return;
  SFX.split();
  cancelFusionCharge();
  if(state.orbPersonalityTimer){clearInterval(state.orbPersonalityTimer);state.orbPersonalityTimer=null;}
  hideGold();els.restartBtn.classList.remove('show');state.merged=false;
  els.status.className='';
  [els.red,els.blue,els.green].forEach((e,i)=>{
    e.classList.remove('fading','magnetic');
    ['opacity','transform','pointerEvents','transition','marginTop'].forEach(p=>e.style[p]='');
    const cx=cW()/2,cy=cH()/2,angle=(i/3)*Math.PI*2+.3;
    setPos(e,cx+Math.cos(angle)*140-R,cy+Math.sin(angle)*140-R);
  });
  setStatus(modeHint());
  modeActions.startGravity?.();
  if(state.mode==='scifi'){els.energyFill.style.width='0%';els.energyVal.textContent='0%';}
}

export function popCirclesOut(){
  [els.red,els.blue,els.green].forEach((e,i)=>{
    e.classList.remove('fading','knocked');
    ['opacity','transform','pointerEvents','transition'].forEach(p=>e.style[p]='');
    const angle=(i/3)*Math.PI*2+.3;
    setPos(e,cW()/2+Math.cos(angle)*160-R,cH()/2+Math.sin(angle)*160-R);
  });
}
