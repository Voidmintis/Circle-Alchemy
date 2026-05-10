// ══════════════════════════════════════════
// ████ THE INFINITE CIRCLE — TRUE FINAL BOSS ████
// ══════════════════════════════════════════
import { R, state, modeActions } from '../state.js';
import { els, area, el } from '../dom.js';
import { getCenter, setPos, cW, cH, setStatus, showMsg, flashScreen, shake, hideGold, toast } from '../utils.js';
import { spawnParticles, spawnSparks, spawnShockwave, registerLoopHook } from '../canvas.js';
import { popCirclesOut } from '../fusion.js';
import SFX from '../sfx.js';

// ── Module-level infinite-specific state ──
let infPhase         = 0;      // 1-5
let infSepPower      = 0;      // 0-100, win at 100
let infSepReady      = false;  // grace period before sep can count
let infShieldActive  = false;  // chain shield engaged
let infClonesActive  = false;
let infFakeDeath     = false;  // in fake-death swirl
let infGravPull      = false;
let infiniteSize     = 0;
let infX=0, infY=0;

// interval handles
let inf_grow=null, inf_spark=null, inf_attack=null,
    inf_rumble=null, inf_phase2=null, inf_phase3=null,
    inf_storm=null, inf_sep=null;

// bullet circles for circle storm
let stormBullets = [];   // {x,y,vx,vy,r,color,life}

// energy chains
let infChains = [];   // {x1,y1,x2,y2,life,broken}

// laser state
let infLaserActive = false;

const infEl={
  orb:()=>document.getElementById('infinite-orb'),
  hpbar:()=>document.getElementById('infinite-hpbar'),
  phaseInd:()=>document.getElementById('infinite-phase-ind'),
  hint:()=>document.getElementById('inf-hint'),
  sepMeter:()=>document.getElementById('sep-meter'),
  sepFill:()=>document.getElementById('sep-fill'),
  sepVal:()=>document.getElementById('sep-val'),
  reveal:()=>document.getElementById('reveal-overlay'),
  rl1:()=>document.getElementById('reveal-line1'),
  rl2:()=>document.getElementById('reveal-line2'),
  rl3:()=>document.getElementById('reveal-line3'),
};

// ── STEP 1: REVEAL TEXT ──
function triggerInfiniteSequence(){
  els.bossVignette.classList.remove('show');
  document.body.classList.remove('ultimate-arena');
  document.body.classList.add('infinite-arena');

  const rev=infEl.reveal();
  rev.classList.add('show');
  setTimeout(()=>{ infEl.rl1().style.opacity='1'; },500);
  setTimeout(()=>{ infEl.rl2().style.opacity='1'; shake('md'); flashScreen('rgba(120,80,255,.5)'); },2000);
  setTimeout(()=>{ infEl.rl3().style.opacity='1'; },3600);
  setTimeout(()=>{
    rev.classList.remove('show');
    [infEl.rl1(),infEl.rl2(),infEl.rl3()].forEach(l=>l.style.opacity='0');
    setTimeout(()=>infFusionSwirl(),600);
  },5400);
}

// ── STEP 2: FUSION SWIRL (circles spiral in) ──
function infFusionSwirl(){
  // Lock player out during swirl
  state.merged=true;
  popCirclesOut();   // start them at scatter positions

  const circles=[els.red,els.blue,els.green];
  const orb=infEl.orb();
  const cx=cW()/2, cy=cH()/2;

  // show vignette
  els.bossVignette.classList.add('show');
  showMsg('FUSION UNSTOPPABLE','THE ELEMENTS BETRAY YOU','#cc66ff');
  flashScreen('rgba(100,0,200,.4)');

  // Animate circles spiraling toward center over 3s
  let t=0;
  const startPositions=circles.map(e=>getCenter(e));
  const swirl=setInterval(()=>{
    t+=16;
    const progress=Math.min(1, t/3000);
    const eased=progress<1 ? 1-Math.pow(1-progress,3) : 1;
    const angle=progress*Math.PI*8;  // spin 4 full rotations

    circles.forEach((e,i)=>{
      const sp=startPositions[i];
      const baseAngle=(i/3)*Math.PI*2 + angle;
      const dist=(1-eased)*180 + eased*0;
      const nx= cx + Math.cos(baseAngle)*dist - R;
      const ny= cy + Math.sin(baseAngle)*dist - R;
      setPos(e, nx, ny);
      // burst particles as they converge
      if(Math.random()<.12){
        const colors=['#ff4455','#4488ff','#44ee88'];
        spawnSparks(nx+R,ny+R,colors[i],2);
      }
    });

    if(progress>=1){
      clearInterval(swirl);
      // hide circles
      circles.forEach(e=>{ e.style.opacity='0'; e.style.pointerEvents='none'; });
      // big merge flash
      flashScreen('rgba(200,150,255,.85)');
      shake('lg');
      spawnParticles(cx,cy,'#aa55ff',100);
      spawnParticles(cx,cy,'#ffffff',60);
      spawnShockwave(cx,cy,'rgba(180,120,255,',cW()*.9,10);
      setTimeout(()=>spawnInfiniteCircle(),700);
    }
  },16);
}

// ── STEP 3: SPAWN & PHASE SYSTEM ──
function spawnInfiniteCircle(){
  state.infiniteActive=true;
  infPhase=1;
  infSepPower=0;
  infShieldActive=false;
  infClonesActive=false;
  infFakeDeath=false;
  infGravPull=false;
  infX=cW()/2; infY=cH()/2;
  infiniteSize=10;
  stormBullets=[];
  infChains=[];

  const orb=infEl.orb();
  Object.assign(orb.style,{
    width:'10px',height:'10px',left:infX+'px',top:infY+'px',
    transition:'opacity .8s,transform .8s cubic-bezier(.175,.885,.32,1.4)',
  });
  orb.classList.add('visible');

  infEl.hpbar().classList.add('show');
  infEl.phaseInd().textContent='PHASE 1 — AWAKENING';
  infEl.sepMeter().classList.add('show');
  infEl.sepFill().style.width='0%';
  infEl.sepVal().textContent='0%';
  infEl.hint().textContent='SEPARATE THE CIRCLES';
  els.sepBarBig.classList.add('show');
  els.sepBarBigFill.style.width='0%';
  els.sepBarBigPct.textContent='0%';

  // pop circles back visible
  state.merged=false;
  popCirclesOut();
  setStatus('∞ SPREAD THE CIRCLES APART TO WIN','blackhole');
  SFX.infiniteSpawn();

  // Grow loop
  inf_grow=setInterval(()=>{
    if(!state.infiniteActive)return;
    const cap=infPhase===5? cW()*.65 : infPhase===4? cW()*.55 : infPhase===3? cW()*.45 : cW()*.35;
    if(infiniteSize<cap) infiniteSize=Math.min(infiniteSize+0.35*(1+infPhase*.2), cap);
    orb.style.width=infiniteSize+'px';
    orb.style.height=infiniteSize+'px';
    orb.style.left=infX+'px';
    orb.style.top=infY+'px';
    // Update hint
    if(infShieldActive) infEl.hint().textContent='⛓ CLICK GOLD DOTS TO BREAK CHAINS';
    else if(infGravPull) infEl.hint().textContent='🧲 DRAG CIRCLES AWAY FROM CENTER!';
    else if(infClonesActive) infEl.hint().textContent='👥 IGNORE FAKES — SPREAD CIRCLES!';
    else if(infSepPower>80) infEl.hint().textContent='⚡ HOLD THEM APART — ALMOST DONE!';
    else if(infSepPower>40) infEl.hint().textContent='↔ DRAG EACH CIRCLE TO A DIFFERENT CORNER';
    else infEl.hint().textContent='↔ DRAG ALL 3 CIRCLES AS FAR APART AS POSSIBLE';
  },100);

  // Sparks
  inf_spark=setInterval(()=>{
    if(!state.infiniteActive)return;
    const colors=['#8855ff','#ffffff','#cc88ff','#4444ff'];
    spawnSparks(infX,infY,colors[Math.floor(Math.random()*colors.length)],3+infPhase);
    if(infPhase>=3) spawnSparks(
      infX+(-infiniteSize*.4+Math.random()*infiniteSize*.8),
      infY+(-infiniteSize*.4+Math.random()*infiniteSize*.8),
      '#cc66ff', 2
    );
  },400);

  // Main attack ticker - starts slow, phases speed it up
  inf_attack=setInterval(()=>{
    if(!state.infiniteActive||infFakeDeath)return;
    infDoAttack();
  },4000);

  // Rumble
  inf_rumble=setInterval(()=>{
    if(!state.infiniteActive)return;
    shake(infPhase>=4?'md':'sm');
    flashScreen('rgba(80,40,180,.15)',80);
    spawnShockwave(infX,infY,'rgba(120,60,255,', 80+infiniteSize*.5, 3+infPhase);
  },3500);

  // Separation checker — delayed start so initial scatter positions don't count
  infSepPower=0;
  infSepReady=false;
  setTimeout(()=>{
    infSepReady=true;
    inf_sep=setInterval(()=>{ if(state.infiniteActive) checkInfiniteSeparation(); },80);
  },3000);

  // Phase escalation timer
  infSchedulePhaseUps();
}

function infSchedulePhaseUps(){
  setTimeout(()=>{ if(state.infiniteActive&&infPhase===1) infSetPhase(2); },8000);
  setTimeout(()=>{ if(state.infiniteActive&&infPhase===2) infSetPhase(3); },18000);
  setTimeout(()=>{ if(state.infiniteActive&&infPhase===3) infSetPhase(4); },30000);
  setTimeout(()=>{ if(state.infiniteActive&&infPhase===4) infSetPhase(5); },45000);
}

function infSetPhase(p){
  if(infPhase>=p||!state.infiniteActive)return;
  infPhase=p;
  const names=['','AWAKENING','CLONE ILLUSION','GRAVITY STORM','CHAOS SURGE','FINAL FORM'];
  const colors=['','#aa88ff','#ff88cc','#ff4400','#ff0000','#ffffff'];
  infEl.phaseInd().textContent=`PHASE ${p} — ${names[p]}`;
  infEl.phaseInd().style.color=colors[p];
  showMsg(`∞ PHASE ${p}`,names[p],'#cc88ff');
  shake('lg'); flashScreen('rgba(140,60,255,.6)');
  spawnParticles(infX,infY,'#cc66ff',80);
  spawnShockwave(infX,infY,'rgba(180,100,255,',cW(),10);
  toast(`⚡ PHASE ${p} — ${names[p]}`,'#cc88ff');
  SFX.infinitePhase();

  // Speed up attacks per phase
  clearInterval(inf_attack);
  const attackDelay=[0,4000,3200,2500,1800,1200][p]||1200;
  inf_attack=setInterval(()=>{ if(state.infiniteActive&&!infFakeDeath) infDoAttack(); },attackDelay);

  // Per-phase specials
  if(p===2) setTimeout(()=>infSpawnClones(),2000);
  if(p===3) setInterval(()=>{ if(state.infiniteActive&&infPhase>=3) infGravitySurge(); },8000);
  if(p===4){
    setTimeout(()=>infCircleStorm(),3000);
  }
  if(p===5){
    // repeated fake deaths
    setTimeout(()=>infFakeDeathTrap(),4000);
    setTimeout(()=>infFakeDeathTrap(),20000);
  }
}

// ── ATTACK DISPATCHER ──
function infDoAttack(){
  const attacks=[infShockwaveAttack, infMagnetPull, infAntiSepShield];
  if(infPhase>=3) attacks.push(infAnnihilationLaser);
  if(infPhase>=4) attacks.push(infCircleStorm);
  const fn=attacks[Math.floor(Math.random()*attacks.length)];
  fn();
}

// ── ATTACK: ANNIHILATION LASER ──
function infAnnihilationLaser(){
  if(!state.infiniteActive||infLaserActive||infFakeDeath)return;
  infLaserActive=true;

  // ── Phase 1: Charge (2s) ──
  toast('⚠ INFINITE ENERGY SURGE DETECTED','#ffffff');
  setStatus('⚠ INFINITE ENERGY SURGE — INCOMING LASER!','danger');
  shake('sm');

  // Darken screen during charge
  const darkEl=document.createElement('div');
  darkEl.id='inf-laser-dark';
  darkEl.style.cssText='position:fixed;inset:0;z-index:45;pointer-events:none;background:rgba(0,0,0,0);transition:background 1.8s ease;';
  document.body.appendChild(darkEl);
  requestAnimationFrame(()=>{ darkEl.style.background='rgba(0,0,0,.55)'; });

  // Orb brightens during charge — pulsing white glow
  const orb=infEl.orb();
  const origBoxShadow=orb.style.boxShadow;
  orb.style.transition='box-shadow .3s,filter .3s';
  let chargeT=0;
  const chargeGlow=setInterval(()=>{
    if(!state.infiniteActive){clearInterval(chargeGlow);return;}
    chargeT+=0.18;
    const intensity=0.5+chargeT*.08;
    orb.style.filter=`brightness(${Math.min(3.5,1+chargeT*.15)}) saturate(0.3)`;
    orb.style.boxShadow=`0 0 ${100+chargeT*30}px ${40+chargeT*15}px rgba(255,255,255,${Math.min(.95,intensity)}),0 0 ${200+chargeT*60}px ${80+chargeT*25}px rgba(200,160,255,${Math.min(.6,intensity*.5)})`;
    if(Math.random()<.4+chargeT*.04){
      spawnSparks(infX+(-100+Math.random()*200),infY+(-100+Math.random()*200),'#ffffff',3);
      spawnSparks(infX+(-60+Math.random()*120),infY+(-60+Math.random()*120),'#cc88ff',2);
    }
  },60);

  // ── Phase 2: FIRE (after 2.2s) ──
  setTimeout(()=>{
    clearInterval(chargeGlow);
    if(!state.infiniteActive){ infLaserActive=false; darkEl.remove(); return; }

    // Restore orb appearance
    orb.style.filter='';
    orb.style.boxShadow=origBoxShadow;

    // Pick a random angle for the laser
    const angle=Math.random()*Math.PI; // 0-180° — always horizontal-ish
    _fireAnnihilationLaser(angle);
  },2200);
}

function _fireAnnihilationLaser(angle){
  if(!state.infiniteActive){ infLaserActive=false; document.getElementById('inf-laser-dark')?.remove(); return; }

  shake('lg');setTimeout(()=>shake('lg'),120);setTimeout(()=>shake('md'),350);
  flashScreen('rgba(255,255,255,.85)',60);
  SFX.infinitePhase();

  // Build the beam parameters
  const beamW=70+infPhase*15;   // very wide
  const cx=infX,cy=infY;
  const cos=Math.cos(angle),sin=Math.sin(angle);
  const reach=Math.max(cW(),cH())*1.5; // extends past screen edges

  // How long beam lasts
  const BEAM_MS=1400;
  const startT=Date.now();
  const ctx=els.swCanvas.getContext('2d');

  showMsg('∞ ANNIHILATION LASER','INFINITE ENERGY DISCHARGE','#ffffff');

  // Draw beam on shockwave canvas each frame
  const beamLoop=setInterval(()=>{
    if(!state.infiniteActive){ clearInterval(beamLoop); infLaserActive=false; return; }
    const elapsed=Date.now()-startT;
    const prog=elapsed/BEAM_MS;
    if(prog>=1){
      clearInterval(beamLoop);
      _laserAftermath(cx,cy,angle,reach);
      return;
    }

    // Fade out toward end
    const alpha=prog<0.7?1:1-(prog-0.7)/0.3;

    // Draw beam — bi-directional from orb center
    ctx.save();
    ctx.translate(cx,cy);ctx.rotate(angle);

    // Core beam (white hot center)
    ctx.beginPath();ctx.moveTo(-reach,0);ctx.lineTo(reach,0);
    ctx.strokeStyle=`rgba(255,255,255,${alpha*.95})`;
    ctx.lineWidth=beamW*.35;
    ctx.shadowColor='rgba(255,255,255,1)';ctx.shadowBlur=40;
    ctx.stroke();

    // Mid glow (purple energy)
    ctx.beginPath();ctx.moveTo(-reach,0);ctx.lineTo(reach,0);
    ctx.strokeStyle=`rgba(200,140,255,${alpha*.8})`;
    ctx.lineWidth=beamW*.7;ctx.shadowBlur=60;
    ctx.stroke();

    // Outer bloom
    ctx.beginPath();ctx.moveTo(-reach,0);ctx.lineTo(reach,0);
    ctx.strokeStyle=`rgba(120,60,255,${alpha*.4})`;
    ctx.lineWidth=beamW*1.4;ctx.shadowBlur=80;
    ctx.stroke();

    ctx.restore();

    // Crackling particles along beam
    if(Math.random()<.6){
      const t=(-1+Math.random()*2)*reach;
      const px=cx+cos*t, py=cy+sin*t;
      const perpX=-sin,perpY=cos;
      const off=(-beamW*.4+Math.random()*beamW*.8);
      spawnSparks(px+perpX*off,py+perpY*off,'#ffffff',2);
      if(Math.random()<.4) spawnSparks(px+perpX*off*1.5,py+perpY*off*1.5,'#cc88ff',1);
    }

    // Push player circles away from beam if they're inside it
    [els.red,els.blue,els.green].forEach(e=>{
      if(e.classList.contains('fading'))return;
      const c=getCenter(e);
      // Distance from circle center to beam line
      const dx=c.x-cx,dy=c.y-cy;
      const along=dx*cos+dy*sin;     // projection along beam
      const perp=Math.abs(-dx*sin+dy*cos); // distance from beam axis
      if(perp<beamW*.6+R){           // inside beam width
        const pushDir=(-dx*sin+dy*cos)<0?-1:1;
        const pushAmt=4+alpha*6;
        let px=parseFloat(e.style.left)+(- sin*pushDir*pushAmt);
        let py=parseFloat(e.style.top)+(  cos*pushDir*pushAmt);
        px=Math.max(0,Math.min(cW()-R*2,px));
        py=Math.max(0,Math.min(cH()-R*2,py));
        setPos(e,px,py);
        if(infSepPower>0) infSepPower=Math.max(0,infSepPower-1.5);
        infUpdateBar();
      }
    });
  },16);
}

function _laserAftermath(cx,cy,angle,reach){
  infLaserActive=false;
  // Remove darkness
  const darkEl=document.getElementById('inf-laser-dark');
  if(darkEl){ darkEl.style.background='rgba(0,0,0,0)'; setTimeout(()=>darkEl.remove(),800); }

  // Residual glow particles along beam path
  const cos=Math.cos(angle),sin=Math.sin(angle);
  for(let i=0;i<20;i++){
    setTimeout(()=>{
      const t=(-1+Math.random()*2)*reach;
      spawnParticles(cx+cos*t,cy+sin*t,'#cc88ff',8,3);
      spawnSparks(cx+cos*t,cy+sin*t,'#ffffff',3);
    },i*60);
  }

  setStatus('∞ SPREAD THE CIRCLES APART TO WIN','blackhole');
  shake('sm');
}

// ── ATTACK: SHOCKWAVE ──
function infShockwaveAttack(){
  const count=infPhase>=4?3:1;
  for(let i=0;i<count;i++){
    setTimeout(()=>{
      spawnShockwave(infX,infY,'rgba(150,80,255,',220+infiniteSize*.6,5+infPhase,true);
      flashScreen('rgba(100,50,200,.15)',80);
    },i*600);
  }
}

// ── ATTACK: MAGNET PULL ──
function infMagnetPull(){
  if(infGravPull)return;
  infGravPull=true;
  toast('🧲 GRAVITY SURGE — FIGHT IT!','#ff88aa');
  setStatus('🧲 GRAVITY SURGE — DRAG CIRCLES TO CORNERS!','danger');
  shake('md');
  spawnShockwave(infX,infY,'rgba(180,80,255,',cW()*.7,8);

  const pullInterval=setInterval(()=>{
    if(!state.infiniteActive||!infGravPull){clearInterval(pullInterval);return;}
    [els.red,els.blue,els.green].forEach(e=>{
      if(e===state.dragging)return; // never pull the one being actively dragged
      const c=getCenter(e);
      const ang=Math.atan2(infY-c.y,infX-c.x);
      const dist=Math.hypot(c.x-infX,c.y-infY);
      // Weak pull — player can easily overcome by dragging
      const pull=Math.max(0.5, 4-(dist*.008));
      let px=parseFloat(e.style.left)+Math.cos(ang)*pull;
      let py=parseFloat(e.style.top)+Math.sin(ang)*pull;
      px=Math.max(0,Math.min(cW()-R*2,px));
      py=Math.max(0,Math.min(cH()-R*2,py));
      setPos(e,px,py);
    });
  },120);

  // Lasts 4 seconds
  setTimeout(()=>{
    infGravPull=false;
    clearInterval(pullInterval);
    setStatus('∞ SPREAD THE CIRCLES APART TO WIN','blackhole');
    toast('✓ GRAVITY ENDED — KEEP SPREADING!','#88aaff');
  },4000);
}

// ── ATTACK: ANTI-SEP SHIELD (energy chains) ──
function infAntiSepShield(){
  if(infShieldActive)return;
  infShieldActive=true;
  toast('⛓ ENERGY CHAINS — CLICK TO BREAK!','#ffcc44');
  setStatus('⛓ CLICK THE GLOWING CHAINS TO BREAK THEM!','danger');

  // draw chains on shockwave canvas via infChains array
  infChains=[];
  const cs=[els.red,els.blue,els.green];
  for(let i=0;i<cs.length;i++){
    for(let j=i+1;j<cs.length;j++){
      const ca=getCenter(cs[i]), cb=getCenter(cs[j]);
      const mx=(ca.x+cb.x)/2, my=(ca.y+cb.y)/2;
      infChains.push({x1:ca.x,y1:ca.y,x2:cb.x,y2:cb.y,
        mx,my,broken:false,life:1,id:`${i}-${j}`});
    }
  }

  // Gentle pull toward each other while shield is up
  const chainPull=setInterval(()=>{
    if(!state.infiniteActive||!infShieldActive){clearInterval(chainPull);return;}
    for(let i=0;i<cs.length;i++){
      for(let j=i+1;j<cs.length;j++){
        const ca=getCenter(cs[i]),cb=getCenter(cs[j]);
        const ang=Math.atan2(cb.y-ca.y,cb.x-ca.x);
        const pull=1.5; // very gentle
        for(const[e,a] of [[cs[i],ang],[cs[j],-ang]]){
          if(e===state.dragging)continue;
          let px=parseFloat(e.style.left)+Math.cos(a)*pull;
          let py=parseFloat(e.style.top)+Math.sin(a)*pull;
          px=Math.max(0,Math.min(cW()-R*2,px));
          py=Math.max(0,Math.min(cH()-R*2,py));
          setPos(e,px,py);
        }
      }
    }
    // refresh chain positions
    infChains.forEach((ch,idx)=>{
      if(ch.broken)return;
      const ca=getCenter(cs[parseInt(ch.id[0])]);
      const cb=getCenter(cs[parseInt(ch.id[2])]);
      ch.x1=ca.x;ch.y1=ca.y;ch.x2=cb.x;ch.y2=cb.y;
      ch.mx=(ca.x+cb.x)/2;ch.my=(ca.y+cb.y)/2;
    });
  },50);

  // Auto-break after 12s anyway
  setTimeout(()=>{
    if(infShieldActive) infBreakAllChains();
  },12000);
}

function infBreakAllChains(){
  infShieldActive=false;
  infChains.forEach(ch=>{
    if(!ch.broken){
      spawnSparks(ch.mx,ch.my,'#ffcc44',10);
      ch.broken=true;
    }
  });
  infChains=[];
  setStatus('∞ SPREAD THE CIRCLES APART TO WIN','blackhole');
  toast('✓ CHAINS BROKEN','#88ffaa');
}

// Handle clicks on chains
area.addEventListener('click',e=>{
  if(!infShieldActive||!infChains.length)return;
  const ar=area.getBoundingClientRect();
  const mx=e.clientX-ar.left, my=e.clientY-ar.top;
  let anyBroken=false;
  infChains.forEach(ch=>{
    if(ch.broken)return;
    // distance from click to chain midpoint
    const d=Math.hypot(mx-ch.mx,my-ch.my);
    if(d<40){
      ch.broken=true; anyBroken=true;
      spawnSparks(ch.mx,ch.my,'#ffdd44',16);
      spawnParticles(ch.mx,ch.my,'#ffaa00',12);
      flashScreen('rgba(255,200,50,.3)',60);
    }
  });
  if(anyBroken && infChains.every(c=>c.broken)){
    infBreakAllChains();
  }
});

// ── GRAVITY SURGE (Phase 3 special) ──
function infGravitySurge(){
  if(!state.infiniteActive||infGravPull)return;
  toast('🌀 GRAVITY SURGE','#ff8844');
  infMagnetPull();
}

// ── CIRCLE STORM ──
function infCircleStorm(){
  if(!state.infiniteActive)return;
  toast('🌌 CIRCLE STORM — DODGE!','#ff4466');
  setStatus('🌌 CIRCLE STORM — KEEP SPREADING!','danger');
  shake('lg');
  const colors=['#ff4455','#4488ff','#44ee88','#ff88ff','#ffcc00'];
  for(let i=0;i<24;i++){
    setTimeout(()=>{
      if(!state.infiniteActive)return;
      const ang=Math.random()*Math.PI*2;
      const spd=3+Math.random()*4;
      stormBullets.push({
        x:infX,y:infY,
        vx:Math.cos(ang)*spd,vy:Math.sin(ang)*spd,
        r:8+Math.random()*12,
        color:colors[Math.floor(Math.random()*colors.length)],
        life:1
      });
    },i*100);
  }
  setTimeout(()=>{ if(state.infiniteActive) setStatus('∞ SPREAD THE CIRCLES APART TO WIN','blackhole'); },6000);
}

// ── FAKE DEATH TRAP ──
function infFakeDeathTrap(){
  if(!state.infiniteActive||infFakeDeath)return;
  infFakeDeath=true;
  setStatus('∞ THE CIRCLE IS DYING?!','blackhole');
  toast('⚠ SOMETHING IS WRONG...','#ffcc44');

  const orb=infEl.orb();
  // fade and shrink
  orb.style.transition='width 2s ease,height 2s ease,opacity 2s ease';
  orb.style.opacity='.2';
  orb.style.width='30px';
  orb.style.height='30px';
  shake('sm');

  setTimeout(()=>{
    if(!state.infiniteActive)return;
    // FAKE! IT COMES BACK STRONGER
    flashScreen('rgba(255,0,0,.75)');
    shake('lg');
    orb.style.transition='width .6s ease,height .6s ease,opacity .4s ease';
    orb.style.opacity='1';
    const newSize=Math.min(infiniteSize*1.15, cW()*.65);
    infiniteSize=newSize;
    orb.style.width=newSize+'px';
    orb.style.height=newSize+'px';
    spawnParticles(infX,infY,'#cc44ff',120);
    spawnShockwave(infX,infY,'rgba(200,80,255,',cW(),14);
    showMsg('IT WAS A TRAP!','THE CIRCLE GROWS STRONGER','#ff4444');
    toast('💀 FAKE DEATH — IT RETURNS STRONGER!','#ff3300');
    infFakeDeath=false;
    setStatus('∞ STILL ALIVE — KEEP SEPARATING!','danger');
  },2800);
}

// ── CLONE ILLUSION ──
function infSpawnClones(){
  if(!state.infiniteActive||infClonesActive)return;
  infClonesActive=true;
  toast('👥 CLONE ILLUSION — FIND THE REAL ONE!','#cc88ff');
  setStatus('👥 CLICK THE REAL BOSS — FAKES FLICKER','danger');

  const cloneCount=4;
  const clones=[];
  const area2=document.getElementById('canvas-area');

  // create fake divs
  for(let i=0;i<cloneCount;i++){
    const c=document.createElement('div');
    c.className='inf-clone';
    const ang=(i/cloneCount)*Math.PI*2;
    const dist=120+Math.random()*60;
    const cx2=infX+Math.cos(ang)*dist;
    const cy2=infY+Math.sin(ang)*dist;
    const sz=infiniteSize*.5+20;
    c.style.cssText=`position:absolute;border-radius:50%;z-index:9;pointer-events:all;cursor:pointer;
      width:${sz}px;height:${sz}px;left:${cx2}px;top:${cy2}px;transform:translate(-50%,-50%);
      background:radial-gradient(circle at 38% 35%,#aaaaff,#5500ff 50%,#000);
      box-shadow:0 0 30px 10px rgba(100,60,200,.5);
      animation:flicker-clone .4s ease-in-out infinite alternate;opacity:.6;`;
    c.onclick=()=>{
      // fake! explode it
      const cr=c.getBoundingClientRect(),ar2=area2.getBoundingClientRect();
      spawnParticles(cr.left-ar2.left+cr.width/2,cr.top-ar2.top+cr.height/2,'#8855ff',35);
      spawnSparks(cr.left-ar2.left+cr.width/2,cr.top-ar2.top+cr.height/2,'#ffffff',12);
      flashScreen('rgba(100,60,200,.35)',60);
      toast('FAKE! Keep looking...','#aa88ff');
      c.remove();
      clones.splice(clones.indexOf(c),1);
    };
    area2.appendChild(c);
    clones.push(c);
  }

  // After 8s remove clones and end illusion
  setTimeout(()=>{
    clones.forEach(c=>c.remove());
    infClonesActive=false;
    infEl.orb().style.opacity='1';
    setStatus('∞ SPREAD THE CIRCLES APART TO WIN','blackhole');
    toast('CLONES GONE — BOSS RETURNS!','#cc88ff');
  },8000);
}

// ── SEPARATION CHECKER ──
function checkInfiniteSeparation(){
  if(!state.infiniteActive||infFakeDeath||!infSepReady)return;
  const circles=[els.red,els.blue,els.green];
  // All three must be visible
  const visible=circles.filter(e=>!e.classList.contains('fading')&&parseFloat(e.style.opacity||1)>0.1);
  if(visible.length<3){infSepPower=Math.max(0,infSepPower-0.3);infUpdateBar();return;}

  // Measure spread: average distance between each pair of circles
  const centers=circles.map(e=>getCenter(e));
  const d01=Math.hypot(centers[0].x-centers[1].x,centers[0].y-centers[1].y);
  const d12=Math.hypot(centers[1].x-centers[2].x,centers[1].y-centers[2].y);
  const d02=Math.hypot(centers[0].x-centers[2].x,centers[0].y-centers[2].y);
  const avgDist=(d01+d12+d02)/3;

  // Win when circles are spread very far apart — must drag them to opposite corners
  const winDist=Math.min(cW(),cH())*.58;
  let raw=Math.min(100,(avgDist/winDist)*100);

  // Shield slightly resists (but doesn't wipe progress)
  if(infShieldActive) raw=Math.max(0,raw-0.5);

  // Separation power builds up gradually — it's sticky (doesn't reset instantly)
  if(raw>infSepPower) infSepPower=Math.min(100,infSepPower+Math.min(2,raw-infSepPower));
  else infSepPower=Math.max(0,infSepPower-0.8);

  infUpdateBar();
  if(infSepPower>=100) infiniteDefeated();
}

function infUpdateBar(){
  const pct=Math.round(infSepPower);
  SFX.sepPulse(pct);
  // small bar (existing)
  infEl.sepFill().style.width=pct+'%';
  infEl.sepVal().textContent=pct+'%';
  // big bottom bar
  els.sepBarBigFill.style.width=pct+'%';
  els.sepBarBigPct.textContent=pct+'%';
  els.sepBarBigFill.classList.toggle('winning',pct>75);
  // Hint text in big bar
  if(infShieldActive) els.sepBarBigHint.textContent='⛓ BREAK THE CHAINS FIRST — CLICK THE GOLD DOTS';
  else if(infGravPull) els.sepBarBigHint.textContent='🧲 FIGHT THE PULL — DRAG CIRCLES TO OPPOSITE CORNERS';
  else if(pct>80) els.sepBarBigHint.textContent='⚡ HOLD THEM APART — ALMOST THERE!';
  else if(pct>40) els.sepBarBigHint.textContent='↔ EACH CIRCLE TO A DIFFERENT CORNER OF THE SCREEN';
  else els.sepBarBigHint.textContent='↔ DRAG ALL 3 CIRCLES AS FAR APART AS POSSIBLE';
  // color shift
  const hue=280-pct*1.5;
  infEl.sepFill().style.background=`linear-gradient(90deg,hsl(${hue},80%,35%),hsl(${hue+40},90%,60%),#fff)`;
}

// ── DEFEAT ──
function infiniteDefeated(){
  if(!state.infiniteActive)return;
  state.infiniteActive=false;
  clearInterval(inf_grow);clearInterval(inf_spark);clearInterval(inf_attack);
  clearInterval(inf_rumble);clearInterval(inf_sep);
  document.querySelectorAll('.inf-clone').forEach(c=>c.remove());

  const orb=infEl.orb();

  // Phase 1: cracking apart
  shake('lg');
  for(let i=0;i<10;i++){
    setTimeout(()=>{
      flashScreen(`rgba(${180+i*7},${100+i*5},255,.7)`,70);
      if(i%2===0) shake('md');
      spawnParticles(infX+(-150+Math.random()*300),infY+(-150+Math.random()*300),'#8855ff',60);
      spawnParticles(infX,infY,'#ffffff',50);
      spawnSparks(infX,infY,'#cc99ff',15);
      spawnShockwave(infX,infY,'rgba(180,120,255,',cW()*1.3,14);
    },i*200);
  }

  // Phase 2: orb cracks and shrinks, tiny core rises
  setTimeout(()=>{
    orb.style.transition='opacity 1.2s ease,width 1.5s ease,height 1.5s ease';
    orb.style.opacity='0';
    orb.style.width='0';
    orb.style.height='0';

    // tiny core floats up
    const core=document.createElement('div');
    core.id='inf-core';
    core.style.cssText=`position:absolute;border-radius:50%;width:18px;height:18px;
      left:${infX}px;top:${infY}px;transform:translate(-50%,-50%);z-index:15;pointer-events:none;
      background:radial-gradient(circle,#ffffff,#cc88ff);
      box-shadow:0 0 20px 8px rgba(200,160,255,.9);
      transition:top 3s ease,opacity 3s ease;`;
    area.appendChild(core);
    setTimeout(()=>{ core.style.top='-60px'; core.style.opacity='0'; },100);
    setTimeout(()=>core.remove(),3200);
  },700);

  // Phase 3: victory
  setTimeout(()=>{
    orb.classList.remove('visible');
    infEl.hpbar().classList.remove('show');
    infEl.sepMeter().classList.remove('show');
    document.body.classList.remove('infinite-arena');
    els.bossVignette.classList.remove('show');
    els.bossTier.classList.remove('show');

    state.playerScore+=15000;
    SFX.infiniteDefeat();

    // Big victory moment
    flashScreen('rgba(200,160,255,.6)');
    shake('lg');
    spawnParticles(cW()/2,cH()/2,'#cc99ff',200);
    spawnParticles(cW()/2,cH()/2,'#ffffff',120);
    spawnShockwave(cW()/2,cH()/2,'rgba(200,150,255,',cW()*1.5,16);

    // final text
    const rev=infEl.reveal();
    infEl.rl1().textContent='YOU BROKE THE CIRCLE.';
    infEl.rl2().textContent='UNIVERSE SAVED';
    infEl.rl3().textContent='No force can contain you.';
    infEl.rl1().style.color='#cc99ff';
    infEl.rl2().style.color='#ffffff';
    rev.style.background='rgba(0,0,0,.6)';
    rev.classList.add('show');
    setTimeout(()=>infEl.rl1().style.opacity='1',400);
    setTimeout(()=>{ infEl.rl2().style.opacity='1'; shake('md'); },1600);
    setTimeout(()=>infEl.rl3().style.opacity='1',2800);
    setTimeout(()=>{
      rev.classList.remove('show');
      [infEl.rl1(),infEl.rl2(),infEl.rl3()].forEach(l=>{ l.style.opacity='0'; });
      infEl.rl1().textContent='You thought that was the end?';
      infEl.rl2().textContent='THE INFINITE CIRCLE';
      infEl.rl3().textContent='Separate the elements to break infinity';
      infEl.rl1().style.color='#8866ff';
      infEl.rl2().style.color='#fff';
      rev.style.background='rgba(0,0,0,.9)';
    },5000);

    els.rewardTitle.textContent='∞ INFINITY SHATTERED';
    els.rewardTitle.style.color='#cc99ff';
    els.rewardDesc.innerHTML='You separated the elements<br>and broke the fabric of forever.<br><span style="color:#ffe066;font-size:.9rem">🏆 TRUE LEGEND — CIRCLE BREAKER</span>';
    els.rewardScore.textContent=`TOTAL: ${state.playerScore.toLocaleString()} POINTS`;
    els.rewardSub.textContent='No force in the universe can stop you.';
    els.rewardBanner.style.borderColor='#cc99ff';
    els.rewardBanner.classList.add('show');

    setStatus('∞ INFINITY BROKEN — YOU ARE LEGEND','merged');
    els.status.style.color='#cc99ff';
    els.status.style.borderColor='rgba(180,120,255,.5)';
    els.status.style.boxShadow='0 0 24px rgba(140,80,255,.4)';
    els.restartBtn.classList.add('show');
    state.merged=false;
    popCirclesOut();
  },2200);
}

// ── DRAW CHAINS on shockwave canvas (overlay) ──
function drawInfChains(){
  if(!infChains.length)return;
  const ctx=els.swCanvas.getContext('2d');
  const t=Date.now();
  infChains.forEach(ch=>{
    if(ch.broken)return;
    // animated gold chain
    const pulse=.5+.5*Math.sin(t*.008);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(ch.x1,ch.y1);
    ctx.lineTo(ch.x2,ch.y2);
    ctx.strokeStyle=`rgba(255,200,50,${.6+pulse*.4})`;
    ctx.lineWidth=3+pulse*2;
    ctx.shadowColor='rgba(255,180,0,.8)';
    ctx.shadowBlur=12+pulse*8;
    ctx.setLineDash([12,8]);
    ctx.stroke();
    // clickable midpoint dot
    ctx.beginPath();
    ctx.arc(ch.mx,ch.my,10+pulse*4,0,Math.PI*2);
    ctx.fillStyle=`rgba(255,220,80,${.7+pulse*.3})`;
    ctx.shadowBlur=20;
    ctx.fill();
    ctx.restore();
  });
}

// ── DRAW STORM BULLETS ──
function updateStormBullets(){
  if(!stormBullets.length)return;
  const ctx=els.pCanvas.getContext('2d');
  stormBullets=stormBullets.filter(b=>{
    b.x+=b.vx; b.y+=b.vy;
    // bounce off walls
    if(b.x<b.r||b.x>cW()-b.r) b.vx*=-1;
    if(b.y<b.r||b.y>cH()-b.r) b.vy*=-1;
    b.life-=.003;
    if(b.life<=0)return false;
    ctx.save();
    ctx.globalAlpha=b.life*.8;
    ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);
    ctx.fillStyle=b.color;
    ctx.shadowColor=b.color;ctx.shadowBlur=10;
    ctx.fill();ctx.restore();
    return true;
  });
}

function stopInfinite(){
  state.infiniteActive=false;infSepReady=false;
  clearInterval(inf_grow);clearInterval(inf_spark);clearInterval(inf_attack);
  clearInterval(inf_rumble);clearInterval(inf_sep);
  infChains=[];infShieldActive=false;infClonesActive=false;infGravPull=false;infFakeDeath=false;
  infLaserActive=false;
  document.getElementById('inf-laser-dark')?.remove();
  stormBullets=[];
  document.querySelectorAll('.inf-clone,.inf-core').forEach(c=>c.remove());
  const orb=infEl.orb();
  orb.classList.remove('visible');
  orb.style.opacity='';orb.style.width='10px';orb.style.height='10px';
  infEl.hpbar().classList.remove('show');
  infEl.sepMeter().classList.remove('show');
  els.sepBarBig.classList.remove('show');
  document.body.classList.remove('infinite-arena');
  const rev=infEl.reveal();if(rev)rev.classList.remove('show');
  [infEl.rl1(),infEl.rl2(),infEl.rl3()].forEach(l=>{ l.style.opacity='0'; });
  infEl.rl1().textContent='You thought that was the end?';
  infEl.rl2().textContent='THE INFINITE CIRCLE';
  infEl.rl3().textContent='Separate the elements to break infinity';
  infEl.rl1().style.color='#8866ff';
  infEl.rl2().style.color='#fff';
  if(infEl.reveal())infEl.reveal().style.background='rgba(0,0,0,.9)';
}

// ── Register modeActions ──
modeActions.triggerInfiniteSequence = triggerInfiniteSequence;
modeActions.stopInfinite = stopInfinite;
modeActions.checkInfiniteSeparation = checkInfiniteSeparation;

// ── Register loop hooks ──
registerLoopHook(() => {
  if(state.infiniteActive){
    drawInfChains();
    updateStormBullets();
  }
});

// ── Exports ──
export { triggerInfiniteSequence, stopInfinite, checkInfiniteSeparation };
