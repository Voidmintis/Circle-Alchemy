// ══════════════════════════════════════════
// ██████ BOSS SYSTEM ██████
// ══════════════════════════════════════════
import { R, state, modeActions } from '../state.js';
import { els, area } from '../dom.js';
import { getCenter, setPos, cW, cH, setStatus, showMsg, flashScreen, shake, hideGold, toast } from '../utils.js';
import { spawnParticles, spawnSparks, spawnShockwave } from '../canvas.js';
import { popCirclesOut } from '../fusion.js';
import SFX from '../sfx.js';

export const BOSS_TIERS=[
  {name:'GOLD TYRANT',  color:'#f5c842',color2:'#c87800',glow:'rgba(245,200,66,',ring:'#ffcc00',hp:100,ringSize:1.5},
  {name:'GIANT OVERLORD',color:'#ff8800',color2:'#cc4400',glow:'rgba(255,120,0,', ring:'#ff6600',hp:150,ringSize:1.6},
  {name:'PRISMATIC RGB', color:'#ff44ff',color2:'#4444ff',glow:'rgba(200,100,255,',ring:'#aa44ff',hp:200,ringSize:1.7},
  {name:'VOID EMPEROR',  color:'#222244',color2:'#000011',glow:'rgba(80,40,200,', ring:'#6644ff',hp:250,ringSize:1.8},
];

// ══════════════════════════════════════════
// ULTIMATE BOSS (run 5)
// ══════════════════════════════════════════
export const ULTIMATE_TIER={name:'THE ULTIMATE',color:'#ffffff',color2:'#8800ff',glow:'rgba(200,150,255,',ring:'#cc88ff',hp:300,ringSize:2.0};

let bossGrowAnim=null;
let runBannerTimeout=null;

export function getBossTier(){
  if(state.bossRun===5) return ULTIMATE_TIER;
  return BOSS_TIERS[Math.min(state.bossRun-1, BOSS_TIERS.length-1)];
}

export function triggerBoss(cx,cy){
  state.bossRun++;
  // bossRun 1-4 = normal tiers, 5 = ultimate (triggered automatically after run 4 is defeated)
  // if somehow player triggers a 6th fuse after ultimate, just loop back to run 4 difficulty
  if(state.bossRun>5) state.bossRun=4;
  const tier=getBossTier();
  state.bossMaxHp=tier.hp;
  state.bossCurrentHp=tier.hp;
  state.bossPhase=0;state.bossPhase2Reached=false;state.bossPhase3Reached=false;
  state.bossAlive=true;
  state.bossX=cx;state.bossY=cy;
  state.bossSize=90;state.bossTargetSize=130;

  // Set up orb appearance
  els.orbIcon.textContent='☠';
  els.orbText.textContent=tier.name;
  els.bossPhaseLabel.textContent='';

  // Position and initial size
  Object.assign(els.gold.style,{
    width:'90px',height:'90px',left:cx+'px',top:cy+'px',
    background:`radial-gradient(circle at 38% 35%,#ffffff,${tier.color} 40%,${tier.color2})`,
    boxShadow:`0 0 20px 8px ${tier.glow}0.5),0 0 40px 16px ${tier.glow}0.2)`,
    animation:'none',pointerEvents:'all',cursor:'pointer',transition:'opacity .4s,width .1s,height .1s,left .1s,top .1s',
  });
  els.gold.classList.add('visible');
  els.gold.onclick=bossClick;

  // Show HP bar
  els.bossHpBar.classList.add('show');
  els.bossHpFill.style.width='100%';
  els.bossHpFill.style.background=`linear-gradient(90deg,${tier.color2},${tier.color})`;
  els.bossPhaseInd.textContent='PHASE 1 — AWAKENING';
  els.bossPhaseInd.style.color='#ff9955';

  // Boss tier badge
  els.bossTier.textContent=`RUN #${state.bossRun} — ${tier.name}`;
  els.bossTier.classList.add('show');

  // Arena darkening
  document.body.classList.add('boss-arena');
  els.header.classList.add('boss-header');
  document.querySelector('.tab:last-child').classList.add('boss-active');
  els.bossVignette.classList.add('show');

  // Grow animation
  growBoss();

  // Show awakening overlay after a brief flash
  flashScreen('rgba(255,100,0,.6)');shake('md');
  setTimeout(()=>{
    els.bossOverlay.classList.add('show');
    els.bossWarningText.textContent=state.bossRun===1?'BOSS AWAKENED':state.bossRun===2?'TITAN RISES':state.bossRun===3?'CHAOS UNLEASHED':state.bossRun===4?'VOID STIRS':'ULTIMATE AWAKENS';
    els.bossWarningText.style.color=state.bossRun>=4?'#cc88ff':'#ff4400';
    els.bossWarningSub.textContent=tier.name+' — GOLD CORE UNSTABLE';
    setTimeout(()=>els.bossOverlay.classList.remove('show'),2500);
  },300);

  setStatus('CLICK THE BOSS TO DAMAGE IT!','boss-status');

  // Start phase 1 sparks
  bossStartPhase1();
}

// ── GROW BOSS ──
function growBoss(){
  // Grow orb from small → phase 1 size → phase 2 → phase 3 based on damage taken
  const phase1Size=160+(state.bossRun*15);
  state.bossTargetSize=phase1Size;
  animateBossSize();
}

function animateBossSize(){
  if(bossGrowAnim)clearInterval(bossGrowAnim);
  bossGrowAnim=setInterval(()=>{
    if(!state.bossAlive){clearInterval(bossGrowAnim);return;}
    const diff=state.bossTargetSize-state.bossSize;
    if(Math.abs(diff)<1){state.bossSize=state.bossTargetSize;clearInterval(bossGrowAnim);return;}
    state.bossSize+=diff*.12;
    applyBossOrbSize();
  },16);
}

function applyBossOrbSize(){
  const half=state.bossSize/2;
  els.gold.style.width=state.bossSize+'px';
  els.gold.style.height=state.bossSize+'px';
  els.gold.style.left=(state.bossX-half)+'px'; // note: boss is NOT using translate(-50%,-50%) here — we manage manually
  // Actually the orb uses translate(-50%) in CSS, so just set left/top to center
  els.gold.style.left=state.bossX+'px';
  els.gold.style.top=state.bossY+'px';
  // Update ring
  const ringSize=state.bossSize*1.5;
  Object.assign(els.ring.style,{width:ringSize+'px',height:ringSize+'px',left:state.bossX+'px',top:state.bossY+'px'});
}

// ── PHASE 1: AWAKENING ──
function bossStartPhase1(){
  state.bossPhase=1;
  const tier=getBossTier();
  els.gold.style.animation=`pulse-gold 2s ease-in-out infinite`;

  // Spawn ring
  const ringSize=state.bossTargetSize*1.5;
  Object.assign(els.ring.style,{
    width:ringSize+'px',height:ringSize+'px',left:state.bossX+'px',top:state.bossY+'px',
    borderColor:tier.ring,
    boxShadow:`0 0 12px ${tier.ring},inset 0 0 8px ${tier.ring}`,
    borderStyle:'dashed',
  });
  els.ring.classList.add('show');

  // Continuous ambient sparks
  state.bossSparkInterval=setInterval(()=>{
    if(!state.bossAlive)return;
    spawnSparks(state.bossX,state.bossY,tier.color,4);
  },400);

  // Periodic rumble
  state.bossRumbleInterval=setInterval(()=>{
    if(!state.bossAlive)return;
    if(state.bossPhase>=2){shake('sm');spawnShockwave(state.bossX,state.bossY,tier.glow,160,5);}
  },4000);

  // Attack: shockwave every 5s
  state.bossAttackInterval=setInterval(()=>{
    if(!state.bossAlive||state.bossPhase<2)return;
    bossAttack();
  },3500);
}

// ── PHASE 2: ANGRY ──
function bossStartPhase2(){
  if(state.bossPhase2Reached)return;
  state.bossPhase2Reached=true;state.bossPhase=2;
  const tier=getBossTier();
  const p2Size=(160+state.bossRun*15)*1.35;
  state.bossTargetSize=p2Size;animateBossSize();

  document.body.classList.remove('boss-arena');document.body.classList.add('boss-phase2');
  els.bossPhaseInd.textContent='PHASE 2 — ANGRY MODE';els.bossPhaseInd.style.color='#ff5522';
  els.bossHpFill.style.background=`linear-gradient(90deg,#aa0000,${tier.color2},${tier.color})`;

  els.gold.style.animation='pulse-gold .8s ease-in-out infinite';
  els.ring.style.borderStyle='solid';els.ring.style.animation='spin-ring 1s linear infinite';

  shake('md');flashScreen('rgba(255,60,0,.5)');
  spawnParticles(state.bossX,state.bossY,tier.color,50);
  showMsg('PHASE 2','BOSS IS ANGRY — ATTACKS INCOMING','#ff6622');
  setStatus('⚠ ANGRY MODE — HIT IT FASTER!','danger');
  toast('⚡ BOSS ENTERS ANGRY MODE!','#ff6633');
  SFX.bossPhase(2);

  // Start moving the boss around the arena
  let mdir=Math.random()*Math.PI*2;
  let mspeed=1.2+state.bossRun*.3;
  state.bossMoveInterval=setInterval(()=>{
    if(!state.bossAlive||state.bossPhase<2){clearInterval(state.bossMoveInterval);return;}
    mdir+=(.3-Math.random()*.6);
    const newX=state.bossX+Math.cos(mdir)*mspeed;
    const newY=state.bossY+Math.sin(mdir)*mspeed;
    const margin=state.bossSize/2+20;
    const W=cW(),H=cH();
    state.bossX=Math.max(margin,Math.min(W-margin,newX));
    state.bossY=Math.max(margin+40,Math.min(H-margin,newY));
    applyBossOrbSize();
    // Also update ring position
    els.ring.style.left=state.bossX+'px';els.ring.style.top=state.bossY+'px';
  },16);
}

// ── PHASE 3: OVERLOAD ──
function bossStartPhase3(){
  if(state.bossPhase3Reached)return;
  state.bossPhase3Reached=true;state.bossPhase=3;
  const tier=getBossTier();
  const p3Size=(160+state.bossRun*15)*1.7;
  state.bossTargetSize=p3Size;animateBossSize();

  document.body.classList.remove('boss-phase2');document.body.classList.add('boss-phase3');
  els.bossPhaseInd.textContent='⚠ PHASE 3 — OVERLOAD ⚠';els.bossPhaseInd.style.color='#ff2200';
  els.bossHpFill.style.background='linear-gradient(90deg,#ff0000,#ff4400,#ff8800)';

  els.gold.style.animation='pulse-gold .4s ease-in-out infinite';
  els.ring.style.animation='spin-ring .5s linear infinite';
  els.ring.style.borderWidth='5px';

  shake('lg');flashScreen('rgba(255,0,0,.65)');
  spawnParticles(state.bossX,state.bossY,tier.color,100);spawnParticles(state.bossX,state.bossY,'#ffffff',50);
  spawnShockwave(state.bossX,state.bossY,tier.glow,cW()*.8,8);
  showMsg('⚠ OVERLOAD','BOSS IS UNSTABLE — FINISH IT NOW!','#ff2200');
  setStatus('⚠ OVERLOAD — STRIKE NOW!','danger');
  toast('💥 PHASE 3 — OVERLOAD!','#ff3300');
  SFX.bossPhase(3);

  // Heavy periodic rumble + flash
  clearInterval(state.bossRumbleInterval);
  state.bossRumbleInterval=setInterval(()=>{
    if(!state.bossAlive)return;
    shake(Math.random()>.5?'md':'sm');
    flashScreen('rgba(255,40,0,.2)',80);
    spawnSparks(state.bossX,state.bossY,tier.color,8);
    spawnShockwave(state.bossX,state.bossY,tier.glow,200,7);
  },1800);
}

// ── BOSS ATTACK ──
function bossAttack(){
  const tier=getBossTier();
  const attackType=state.bossPhase===3?Math.floor(Math.random()*3):Math.floor(Math.random()*2);
  if(attackType===0){
    // Shockwave
    const r=state.bossPhase===3?300:220;
    const sw={x:state.bossX,y:state.bossY,r:state.bossSize/2,maxR:r,speed:state.bossPhase===3?7:5,color:tier.glow,life:1,fromBoss:true};
    state.shockwaves.push(sw);
    flashScreen('rgba(255,100,0,.15)',100);
  } else if(attackType===1){
    // Magnet pull — move circles toward boss
    [els.red,els.blue,els.green].forEach(e=>{
      if(e.classList.contains('fading'))return;
      const c=getCenter(e);
      const ang=Math.atan2(state.bossY-c.y,state.bossX-c.x);
      const pull=20+state.bossPhase*8;
      let px=parseFloat(e.style.left),py=parseFloat(e.style.top);
      px+=Math.cos(ang)*pull;py+=Math.sin(ang)*pull;
      px=Math.max(0,Math.min(cW()-R*2,px));py=Math.max(0,Math.min(cH()-R*2,py));
      setPos(e,px,py);
    });
    toast('☠ MAGNET PULL!','#ff8844');
  } else {
    // Orb rain — particle burst from top
    for(let i=0;i<6;i++){
      setTimeout(()=>{
        const rx=Math.random()*cW();
        spawnSparks(rx,0,tier.color,8);
      },i*150);
    }
    toast('☠ ORB RAIN!','#ffaa44');
  }
}

// ── BOSS CLICK (damage) ──
function bossClick(e){
  if(!state.bossAlive)return;
  e.stopPropagation();
  const tier=getBossTier();
  const dmg=10;
  state.bossCurrentHp=Math.max(0,state.bossCurrentHp-dmg);
  const pct=(state.bossCurrentHp/state.bossMaxHp)*100;
  els.bossHpFill.style.width=pct+'%';

  // Hit flash
  els.gold.style.filter='brightness(3) saturate(0)';
  setTimeout(()=>els.gold.style.filter='',120);
  SFX.bossHit();

  // Hit sparks at click position
  const ar=area.getBoundingClientRect();
  const hx=e.clientX-ar.left,hy=e.clientY-ar.top;
  spawnSparks(hx,hy,'#ffffff',14);spawnSparks(hx,hy,tier.color,10);
  shake('sm');

  // Phase transitions
  if(state.bossCurrentHp<=state.bossMaxHp*.6&&!state.bossPhase2Reached) bossStartPhase2();
  if(state.bossCurrentHp<=state.bossMaxHp*.25&&!state.bossPhase3Reached) bossStartPhase3();

  // Update label
  const phaseName=['','AWAKENING','ANGRY','OVERLOAD'][state.bossPhase]||'';
  els.bossPhaseLabel.textContent=`${phaseName} — ${Math.round(pct)}%`;

  if(state.bossCurrentHp<=0) bossDefeat();
}

// ── RUN BANNER ──
function showRunBanner(runNum,tierName,tierColor){
  // Remove any existing banner
  const old=document.getElementById('run-banner');if(old)old.remove();
  const b=document.createElement('div');b.id='run-banner';
  b.style.cssText=`position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(0);z-index:70;text-align:center;pointer-events:none;
    background:rgba(8,4,0,.95);border:2px solid ${tierColor};border-radius:10px;padding:20px 40px;
    box-shadow:0 0 50px ${tierColor}55,inset 0 1px 0 rgba(255,255,255,.05);
    transition:transform .4s cubic-bezier(.175,.885,.32,1.5),opacity .4s;opacity:0;`;
  b.innerHTML=`
    <div style="font-family:'Orbitron',monospace;font-size:clamp(.6rem,2vw,.9rem);letter-spacing:.35em;color:${tierColor};text-shadow:0 0 16px ${tierColor};margin-bottom:8px">▶ ROUND ${runNum}</div>
    <div style="font-family:'Orbitron',monospace;font-size:clamp(1rem,4vw,2rem);font-weight:900;letter-spacing:.2em;color:#fff;text-shadow:0 0 24px ${tierColor}">${tierName}</div>
    <div style="font-family:'Rajdhani',sans-serif;font-size:.75rem;letter-spacing:.25em;color:rgba(255,255,255,.5);margin-top:6px">FUSE THE ELEMENTS TO BEGIN</div>`;
  document.body.appendChild(b);
  requestAnimationFrame(()=>{requestAnimationFrame(()=>{b.style.transform='translate(-50%,-50%) scale(1)';b.style.opacity='1';});});
  if(runBannerTimeout)clearTimeout(runBannerTimeout);
  runBannerTimeout=setTimeout(()=>{b.style.opacity='0';b.style.transform='translate(-50%,-50%) scale(.9)';setTimeout(()=>b.remove(),400);},3000);
}

// ── BOSS DEFEAT ──
function bossDefeat(){
  state.bossAlive=false;
  clearInterval(state.bossMoveInterval);clearInterval(state.bossAttackInterval);
  clearInterval(state.bossRumbleInterval);clearInterval(state.bossSparkInterval);
  if(bossGrowAnim)clearInterval(bossGrowAnim);

  const tier=getBossTier();
  // bossRun at this point: 1=Gold Tyrant, 2=Giant, 3=Prismatic RGB, 4=Void, 5=Ultimate
  const isUltimate = state.bossRun===5;

  // MEGA explosion
  shake('lg');
  SFX.bossDefeat();
  for(let i=0;i<6;i++){
    setTimeout(()=>{
      flashScreen(`rgba(255,${140+i*18},${i*25},.7)`,80);
      shake('md');
      spawnParticles(state.bossX+(-90+Math.random()*180),state.bossY+(-90+Math.random()*180),tier.color,80);
      spawnParticles(state.bossX,state.bossY,'#ffffff',60);
      spawnSparks(state.bossX,state.bossY,'#ffcc00',20);
      spawnShockwave(state.bossX,state.bossY,tier.glow,cW(),10);
    },i*180);
  }

  setTimeout(()=>{
    hideGold();els.ring.classList.remove('show');
    els.bossHpBar.classList.remove('show');
    document.body.classList.remove('boss-arena','boss-phase2','boss-phase3','ultimate-arena');
    els.header.classList.remove('boss-header');
    document.querySelector('.tab:last-child')?.classList.remove('boss-active');

    state.playerScore += state.bossMaxHp * 10 * state.bossRun;

    // ── ULTIMATE BOSS → triggers Infinite sequence ──
    if(isUltimate){
      modeActions.triggerInfiniteSequence?.();
      return;
    }

    // ── All 4 normal bosses defeated → spawn Ultimate ──
    const allNormalDefeated = state.bossRun >= 4;
    const rewards=['','⚔ WARRIOR TITLE','🏆 GIANT SLAYER','✦ CHAOS MASTER','🌑 VOID BREAKER'];
    els.rewardTitle.textContent='BOSS DEFEATED!';
    els.rewardTitle.style.color=tier.color;
    els.rewardDesc.innerHTML=`<span style="color:${tier.color}">${tier.name}</span> has fallen<br><span style="color:#ffddaa">${rewards[Math.min(state.bossRun,4)]}</span>`;
    els.rewardScore.textContent=`+ ${state.bossMaxHp*10*state.bossRun} PTS  |  TOTAL: ${state.playerScore.toLocaleString()}`;
    els.rewardSub.textContent = allNormalDefeated
      ? '⚠ THE ULTIMATE AWAKENS — PREPARE YOURSELF...'
      : `NEXT: ${BOSS_TIERS[Math.min(state.bossRun, BOSS_TIERS.length-1)].name} awaits`;
    els.rewardBanner.classList.add('show');
    setTimeout(()=>els.rewardBanner.classList.remove('show'), allNormalDefeated?4200:2800);

    if(allNormalDefeated){
      // Reset player state so circles are visible during the ominous wait
      state.merged=false;
      popCirclesOut();
      // Arena darkens, ominous wait, then Ultimate spawns automatically
      setStatus('⚠ SOMETHING FAR WORSE IS COMING...','danger');
      els.bossVignette.classList.add('show');
      setTimeout(()=>{
        triggerUltimateBoss();
      }, 3800);
    } else {
      // ── AUTO-RESET: no restart needed, circles pop out immediately ──
      state.merged = false;
      els.bossVignette.classList.remove('show');
      popCirclesOut();

      // Show prominent "ROUND X" banner
      const nextRun = state.bossRun + 1;
      const nextTier = BOSS_TIERS[Math.min(state.bossRun, BOSS_TIERS.length-1)];
      setTimeout(()=>{
        showRunBanner(nextRun, nextTier.name, nextTier.color);
        setStatus(`⚔ ROUND ${nextRun} — FUSE THE ELEMENTS!`, 'boss-status');
      }, 600);
    }

  }, 1100);
}

function triggerUltimateBoss(){
  // Ultimate boss uses the same triggerBoss machinery but with special tier
  state.bossRun=5;
  const tier=ULTIMATE_TIER;
  state.bossMaxHp=300;state.bossCurrentHp=300;
  state.bossPhase=0;state.bossPhase2Reached=false;state.bossPhase3Reached=false;
  state.bossAlive=true;
  state.bossX=cW()/2;state.bossY=cH()/2;
  state.bossSize=110;state.bossTargetSize=175;

  document.body.classList.add('ultimate-arena');
  els.header.classList.add('boss-header');
  document.querySelector('.tab:last-child').classList.add('boss-active');
  els.bossVignette.classList.add('show');

  // style orb
  els.orbIcon.textContent='⬡';
  els.orbText.textContent='ULTIMATE';
  els.bossPhaseLabel.textContent='';
  Object.assign(els.gold.style,{
    width:'110px',height:'110px',left:state.bossX+'px',top:state.bossY+'px',
    background:`radial-gradient(circle at 38% 35%,#ffffff,${tier.color2} 50%,#000033)`,
    boxShadow:`0 0 40px 15px rgba(200,150,255,.8),0 0 80px 30px rgba(100,0,255,.4)`,
    animation:'none',pointerEvents:'all',cursor:'pointer',
    transition:'opacity .4s,width .1s,height .1s',
  });
  els.gold.classList.add('visible');
  els.gold.onclick=bossClick;

  els.bossHpBar.classList.add('show');
  els.bossHpFill.style.width='100%';
  els.bossHpFill.style.background='linear-gradient(90deg,#330099,#8800ff,#cc88ff,#ffffff)';
  els.bossPhaseInd.textContent='THE ULTIMATE — FINAL BOSS';
  els.bossPhaseInd.style.color='#cc88ff';
  els.bossTier.textContent='⚡ ULTIMATE BOSS — RUN 5';
  els.bossTier.classList.add('show');

  animateBossSize();

  flashScreen('rgba(150,80,255,.7)');shake('lg');
  setTimeout(()=>{
    els.bossOverlay.classList.add('show');
    els.bossWarningText.textContent='THE ULTIMATE AWAKENS';
    els.bossWarningText.style.color='#cc88ff';
    els.bossWarningSub.textContent='ALL PREVIOUS FORMS COMBINED';
    setTimeout(()=>els.bossOverlay.classList.remove('show'),2800);
  },300);

  setStatus('⚡ THE ULTIMATE BOSS — CLICK TO STRIKE!','boss-status');
  bossStartPhase1();
}

// ══════════════════════════════════════════
// STOP BOSS INTERVALS
// ══════════════════════════════════════════
export function stopBoss(){
  state.bossAlive=false;
  clearInterval(state.bossMoveInterval);clearInterval(state.bossAttackInterval);
  clearInterval(state.bossRumbleInterval);clearInterval(state.bossSparkInterval);
  if(bossGrowAnim)clearInterval(bossGrowAnim);
  modeActions.stopInfinite?.();
  document.body.classList.remove('boss-arena','boss-phase2','boss-phase3','ultimate-arena','infinite-arena');
  els.header.classList.remove('boss-header');
  document.querySelector('.tab:last-child')?.classList.remove('boss-active');
  els.bossVignette.classList.remove('show');
  els.bossHpBar.classList.remove('show');
  els.ring.classList.remove('show');
  els.bossTier.classList.remove('show');
  const rev=document.getElementById('reveal-overlay');if(rev)rev.classList.remove('show');
  els.status.style.color='';els.status.style.borderColor='';els.status.style.boxShadow='';
}

// Register with modeActions so other modules can call triggerBoss via modeActions
modeActions.triggerBoss = triggerBoss;
