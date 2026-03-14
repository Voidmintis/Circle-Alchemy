// ══════════════════════════════════════════
// 🚀 ADVENTURE MODE
// ══════════════════════════════════════════

import { R, state, modeActions } from '../state.js';
import { els, area, el } from '../dom.js';
import { getCenter, setPos, cW, cH, setStatus, showMsg, flashScreen, shake, hideGold, resetPositions, modeHint, toast } from '../utils.js';
import { spawnParticles, spawnSparks, spawnShockwave } from '../canvas.js';
import SFX from '../sfx.js';

// ── PERSISTENT STATE (localStorage, versioned) ──
const ADV_KEY='circlealchemy_adv_v3';

function advDefaultState(){
  return{
    energy:0,
    upgrades:{
      stableFusion:0,
      energyBoost:0,
      fasterDrag:0,
      strongerFusion:1,
      singularityChance:2,
      // Phobos upgrades
      fusionBurst:0,      // max 3: laser hits multiple enemies
      coreShield:0,       // max 2: 10%/20% chance to resist meltdown entirely
      gravityPulse:0,     // max 3: every 3rd fusion auto-sucks nearby enemies
    },
    mars:{
      currentMission:0,
      missionProgress:new Array(6).fill(0),
      bossDefeated:false,
    },
    phobos:{
      currentMission:0,
      missionProgress:new Array(5).fill(0),
      bossDefeated:false,
    },
    deimos:{
      currentMission:0,
      missionProgress:new Array(4).fill(0),
      bossDefeated:false,
    },
    phobosUnlocked:false,
    deimosUnlocked:false,
    totalFusions:0,
    unlockedMars:false,
  };
}

function advLoad(){
  try{
    const d=localStorage.getItem(ADV_KEY);
    if(!d) return advDefaultState();
    const saved=JSON.parse(d);
    const def=advDefaultState();
    return Object.assign({},def,saved,{
      upgrades:Object.assign({},def.upgrades,saved.upgrades||{}),
      mars:Object.assign({},def.mars,saved.mars||{}),
      phobos:Object.assign({},def.phobos,saved.phobos||{}),
      deimos:Object.assign({},def.deimos,saved.deimos||{}),
    });
  }catch(e){ return advDefaultState(); }
}

function advSave(){
  try{ localStorage.setItem(ADV_KEY,JSON.stringify(advState)); }catch(e){}
}

function advResetProgress(){
  if(!confirm('Delete all Adventure progress and start fresh?')) return;
  try{ localStorage.removeItem(ADV_KEY); }catch(e){}
  advState=advDefaultState();
  advSave();
  // Refresh the map UI cleanly
  advShowMap();
  toast('↺ PROGRESS RESET','#ff8866');
}

let advState=advLoad();

// Mars battle state
let marsEnemies=[];
let marsBoss=null;
let marsLoop=null;
let advCurrentPlanet='mars';  // which battle planet we're on
let marsFusionCount=0;  // fusions done this visit
let marsGoldActive=false;
let marsGoldX=0,marsGoldY=0,marsGoldLife=0;
let marsGoldTimer=null;
let marsEnemyCanvas=null,marsEnemyCtx=null;
let marsDustTimer=null;
let marsSpawnTimer=null;
let marsBossAttackTimer=null;

// Missions are keyed by planet. Each planet has its own currentMission index.
const PLANET_MISSIONS={
  mars:[
    {label:'M1',desc:'Defeat 5 Rogue Orbs',      target:5,  type:'kills',  reward:30},
    {label:'M2',desc:'Perform 3 Fusions',         target:3,  type:'fusions',reward:25},
    {label:'M3',desc:'Defeat 10 enemies',         target:10, type:'kills',  reward:45},
    {label:'M4',desc:'Survive 5 Fusions',         target:5,  type:'fusions',reward:30},
    {label:'M5',desc:'Destroy 15 enemies',        target:15, type:'kills',  reward:60},
    {label:'M6',desc:'Defeat the Crimson Core',   target:1,  type:'boss',   reward:100, bossId:'crimson'},
  ],
  phobos:[
    {label:'P1',desc:'Defeat 8 Phantom Orbs',     target:8,  type:'kills',  reward:50},
    {label:'P2',desc:'Chain 4 Fusions',           target:4,  type:'fusions',reward:40},
    {label:'P3',desc:'Defeat 12 enemies',         target:12, type:'kills',  reward:65},
    {label:'P4',desc:'Defeat 20 enemies',         target:20, type:'kills',  reward:80},
    {label:'P5',desc:'Defeat the Iron Sentinel',  target:1,  type:'boss',   reward:130, bossId:'sentinel'},
  ],
  deimos:[
    {label:'D1',desc:'Defeat 10 Gravity Orbs',    target:10, type:'kills',  reward:70},
    {label:'D2',desc:'Perform 6 Fusions',         target:6,  type:'fusions',reward:55},
    {label:'D3',desc:'Destroy 25 enemies',        target:25, type:'kills',  reward:90},
    {label:'D4',desc:'Defeat the Void Remnant',   target:1,  type:'boss',   reward:200, bossId:'void'},
  ],
};

// Keep MISSIONS as the legacy alias for mars missions (for backward compat)
const MISSIONS=PLANET_MISSIONS.mars;

const UPGRADES=[
  // ── Earth upgrades ──
  {key:'stableFusion',   name:'STABLE FUSION',  desc:'Reduce meltdown chance',       costs:[20,35,50], maxLvl:3, planet:'earth'},
  {key:'energyBoost',    name:'ENERGY BOOST',   desc:'+5 energy per fusion',          costs:[15,28,45], maxLvl:3, planet:'earth'},
  {key:'fasterDrag',     name:'QUICK DRAG',     desc:'Circles feel more responsive',  costs:[18,38],    maxLvl:2, planet:'earth'},
  {key:'strongerFusion', name:'STRONG FUSION',  desc:'Gold orb lasts longer',         costs:[12,25,40], maxLvl:3, planet:'earth'},
  {key:'singularityChance',name:'SINGULARITY CTRL',desc:'Singularity odds: 0=off 1=rare 2=normal 3=high',costs:[25,40,60],maxLvl:3,planet:'earth'},
  // ── Phobos upgrades (unlocked after reaching Phobos) ──
  {key:'fusionBurst',    name:'FUSION BURST',   desc:'Laser hits 2/3/all enemies',    costs:[40,65,90], maxLvl:3, planet:'phobos'},
  {key:'coreShield',     name:'CORE SHIELD',    desc:'10%/20% chance to block meltdown',costs:[50,80], maxLvl:2, planet:'phobos'},
  {key:'gravityPulse',   name:'GRAVITY PULSE',  desc:'Every 3rd fusion auto-sucks enemies',costs:[45,70,100],maxLvl:3,planet:'phobos'},
];

const ENEMY_TYPES={
  mars:[
    {name:'ROGUE',   color:'#ff4422',r:16,speed:1.4,hp:1,maxHp:1},
    {name:'SPLIT',   color:'#ff8800',r:20,speed:1.0,hp:2,maxHp:2},
    {name:'SHIELD',  color:'#4488ff',r:19,speed:0.7,hp:3,maxHp:3,shielded:true},
  ],
  phobos:[
    {name:'PHANTOM', color:'#aa44ff',r:15,speed:2.0,hp:1,maxHp:1,phantom:true},
    {name:'IRON',    color:'#aabbcc',r:22,speed:0.6,hp:4,maxHp:4,shielded:true},
    {name:'SPLITTER',color:'#ff6600',r:18,speed:1.2,hp:2,maxHp:2},
  ],
  deimos:[
    {name:'GRAVITY', color:'#4444ff',r:20,speed:0.5,hp:3,maxHp:3,gravPull:true},
    {name:'MIRROR',  color:'#ccffcc',r:16,speed:1.8,hp:1,maxHp:1,mirror:true},
    {name:'PHANTOM', color:'#aa44ff',r:15,speed:2.2,hp:1,maxHp:1,phantom:true},
    {name:'IRON',    color:'#aabbcc',r:24,speed:0.5,hp:5,maxHp:5,shielded:true},
  ],
};

// ── CIRCLE VISIBILITY ──
function advSetCirclesVisible(visible){
  [els.red,els.blue,els.green].forEach(e=>{
    e.style.opacity = visible ? '' : '0';
    e.style.pointerEvents = visible ? '' : 'none';
  });
}

// ── ENTRY POINT ──
// ── STAR MAP (no canvas — pure CSS background via #adv-map) ──
function advDrawStarMap(){
  // Star map background is handled entirely by CSS — nothing to draw
}

// ── EVENT TEXT (battle overlay) ──
function advShowEvent(msg,color='#ffffff'){
  const el=document.getElementById('adv-event-text');
  if(!el)return;
  el.textContent=msg;
  el.style.color=color;
  el.style.textShadow=`0 0 30px ${color}`;
  el.classList.add('show');
  setTimeout(()=>el.classList.remove('show'),2200);
}

export function advEnter(){
  state.advActive=true;
  advState=advLoad();
  [els.red,els.blue,els.green].forEach(e=>e.classList.add('hidden'));
  document.getElementById('adv-overlay').style.display='flex';
  advShowMap();
}

export function advExit(){
  state.advActive=false;
  advStopMars();
  [els.red,els.blue,els.green].forEach(e=>e.classList.remove('hidden'));
  document.getElementById('adv-overlay').style.display='none';
  document.body.classList.remove('adv-mars-bg');
  advSetCirclesVisible(true); // restore when leaving adventure
}

function advOpenMap(){ advShowMap(); }

function advShowMap(){
  state.advScene='map';

  // Hide circles — we don't need them on the map
  advSetCirclesVisible(false);

  // Show ONLY the map, hide everything else
  document.getElementById('adv-overlay').style.display='flex';
  document.getElementById('adv-map').style.display='flex';
  document.getElementById('adv-earth-hub').style.display='none';
  document.getElementById('adv-mars-hub').style.display='none';
  document.getElementById('adv-launch-screen').style.display='none';
  document.getElementById('adv-mission-complete').style.display='none';
  document.body.classList.remove('adv-mars-bg');

  // Energy HUD
  const evalEl=document.getElementById('adv-energy-val');
  if(evalEl) evalEl.textContent=advState.energy;

  // Mars status
  const mi=advState.mars.currentMission;
  const marsSub=document.getElementById('adv-mars-sub');
  const marsBadge=document.getElementById('adv-mars-status-badge');
  const conquered=advState.mars.bossDefeated;
  if(marsSub) marsSub.textContent=conquered?'✓ CONQUERED':mi>0?`Mission ${mi+1}`:'Battle Zone';
  if(marsBadge){
    marsBadge.textContent=conquered?'✓ DONE':'AVAILABLE';
    marsBadge.style.color=conquered?'#44ff88':'#ff9977';
  }

  // Phobos — unlock if flag is true
  const phobosEl=document.getElementById('adv-planet-phobos');
  const phobosStatus=document.getElementById('adv-phobos-status');
  if(phobosEl){
    if(advState.phobosUnlocked){
      phobosEl.classList.remove('locked');
      phobosEl.style.opacity='';
      phobosEl.style.cursor='pointer';
      phobosEl.onclick=()=>advGo('phobos');
      if(phobosStatus){phobosStatus.textContent='AVAILABLE';phobosStatus.style.color='#44ff88';}
    } else {
      phobosEl.classList.add('locked');
      phobosEl.onclick=null;
    }
  }

  // Deimos — unlock if flag is true
  const deimosEl=document.getElementById('adv-planet-deimos');
  if(deimosEl){
    if(advState.deimosUnlocked){
      deimosEl.classList.remove('locked');
      deimosEl.style.opacity='';
      deimosEl.style.cursor='pointer';
      deimosEl.onclick=()=>advGo('deimos');
      const dsStat=deimosEl.querySelector('.amp-status');
      if(dsStat){dsStat.textContent='AVAILABLE';dsStat.style.color='#ff6644';}
    } else {
      deimosEl.classList.add('locked');
      deimosEl.onclick=null;
    }
  }
}

function advGo(planet){
  if(planet==='earth') advShowEarth();
  else if(planet==='mars') advLaunchToMars('mars');
  else if(planet==='phobos'&&advState.phobosUnlocked) advLaunchToMars('phobos');
  else if(planet==='deimos'&&advState.deimosUnlocked) advLaunchToMars('deimos');
}

// ── EARTH HUB ──
function advShowEarth(){
  state.advScene='earth';
  document.getElementById('adv-map').style.display='none';
  document.getElementById('adv-earth-hub').style.display='flex';
  document.getElementById('adv-mars-hub').style.display='none';
  document.getElementById('adv-launch-screen').style.display='none';
  document.body.classList.remove('adv-mars-bg');
  advRenderShop();
  advUpdateEarthEnergy();
  // Show circles so player can fuse on Earth to earn energy
  state.merged=false;
  resetPositions();
  advSetCirclesVisible(true);
  const hint=document.getElementById('adv-earth-fuse-hint');
  if(hint) hint.textContent=`DRAG ALL THREE CIRCLES TOGETHER ↓  (${advState.totalFusions} total fusions)`;
}

function advUpdateEarthEnergy(){
  const e=advState.energy;
  const pct=Math.min(100,(e/200)*100);
  document.getElementById('adv-fe-fill').style.width=pct+'%';
  document.getElementById('adv-fe-val').textContent=`${e} ENERGY`;
  advUpdateEnergyHud();
}

function advUpdateEnergyHud(){
  document.getElementById('adv-energy-val').textContent=advState.energy;
}

function advRenderShop(){
  const container=document.getElementById('adv-upgrades');
  container.innerHTML='';
  const visible=UPGRADES.filter(u=>u.planet==='earth'||(u.planet==='phobos'&&advState.phobosUnlocked));
  visible.forEach(u=>{
    const lvl=advState.upgrades[u.key]||0;
    const maxed=lvl>=u.maxLvl;
    const cost=maxed?0:u.costs[lvl];
    const canAfford=advState.energy>=cost;
    const div=document.createElement('div');
    div.className='adv-upgrade'+(maxed?' maxed':'')+((!maxed&&!canAfford)?' locked':'');
    const tag=u.planet==='phobos'?'<span style="font-size:.38rem;color:#44ffaa;margin-left:5px;opacity:.8">PHOBOS</span>':'';
    div.innerHTML=`
      <div class="adv-upg-row">
        <span class="adv-upg-name">${u.name}${tag}</span>
        <span class="adv-upg-level">${maxed?'MAX ✓':'Lv '+lvl+'/'+u.maxLvl}</span>
      </div>
      <div class="adv-upg-desc">${u.desc}</div>
      <div class="adv-upg-cost">${maxed?'✓ MAXED':'⚡ '+cost+' energy'}</div>
    `;
    if(!maxed&&canAfford) div.onclick=()=>advBuyUpgrade(u.key,cost);
    container.appendChild(div);
  });
}

function advBuyUpgrade(key,cost){
  if(advState.energy<cost)return;
  advState.energy-=cost;
  advState.upgrades[key]=(advState.upgrades[key]||0)+1;
  advSave();
  advRenderShop();
  advUpdateEarthEnergy();
  SFX.upgrade();
  toast(`✓ UPGRADE PURCHASED`,'#88ff88');
  spawnParticles(cW()/2,cH()/2,'#f5c842',30);
}

// Called when fusion completes in adventure mode (earth)
function advOnEarthFusion(){
  const bonus=[0,5,10,15][advState.upgrades.energyBoost||0];
  const gained=10+bonus;
  advState.energy+=gained;
  advState.totalFusions++;
  advState.unlockedMars=true;
  advSave();
  advUpdateEarthEnergy();
  toast(`⚡ +${gained} FUSION ENERGY`,'#f5c842');
  const hint=document.getElementById('adv-earth-fuse-hint');
  if(hint) hint.textContent=`+${gained} ENERGY! Total fusions: ${advState.totalFusions}`;
}

// ── LAUNCH TO MARS ──
function advLaunchToMars(planet='mars'){
  advCurrentPlanet=planet;
  state.advScene='launch';
  document.getElementById('adv-map').style.display='none';
  document.getElementById('adv-earth-hub').style.display='none';
  document.getElementById('adv-launch-screen').style.display='flex';
  const destNames={mars:'MARS',phobos:'PHOBOS',deimos:'DEIMOS'};
  const launchText=document.getElementById('adv-launch-text');
  if(launchText) launchText.textContent=`LAUNCHING TO ${destNames[planet]||'MARS'}...`;
  const ls=document.getElementById('adv-launch-stars');
  ls.innerHTML='';
  for(let i=0;i<60;i++){
    const s=document.createElement('div');s.className='ls';
    const size=Math.random()*3+1;
    s.style.cssText=`width:${size}px;height:${size}px;left:${Math.random()*100}%;top:${Math.random()*100}%;animation-duration:${.4+Math.random()*.8}s;animation-delay:${Math.random()*.5}s`;
    ls.appendChild(s);
  }
  setTimeout(()=>advShowMars(),2200);
}

// ── MARS BATTLE ──
function advShowMars(){
  state.advScene='mars';
  document.getElementById('adv-launch-screen').style.display='none';
  document.getElementById('adv-mars-hub').style.display='flex';
  document.getElementById('adv-map').style.display='none';
  document.body.classList.add('adv-mars-bg');

  // Set title from current planet
  const titles={mars:'🔴 MARS — BATTLE ZONE',phobos:'🌑 PHOBOS — OUTPOST SIEGE',deimos:'☄️ DEIMOS — DANGER ZONE'};
  const titleEl=document.getElementById('adv-mars-title');
  if(titleEl) titleEl.textContent=titles[advCurrentPlanet]||titles.mars;

  // Reset boss bar
  const bossBar=document.getElementById('adv-boss-bar');
  if(bossBar) bossBar.style.display='none';

  marsEnemyCanvas=document.getElementById('adv-enemy-canvas');
  marsEnemyCtx=marsEnemyCanvas.getContext('2d');
  const hub=document.getElementById('adv-mars-hub');
  const rect=hub.getBoundingClientRect();
  marsEnemyCanvas.width=rect.width;marsEnemyCanvas.height=rect.height;

  marsFusionCount=0;
  marsEnemies=[];marsBoss=null;marsGoldActive=false;

  advUpdateMissionUI();

  marsDustTimer=setInterval(advDustStorm,12000);
  advStartEnemySpawning();
  marsLoop=setInterval(advMarsUpdate,50);

  document.getElementById('adv-mars-status').textContent='FUSE YOUR CIRCLES TO ATTACK!';

  state.merged=false;
  [els.red,els.blue,els.green].forEach(e=>{
    e.classList.remove('fading','hidden');
    ['transform','filter'].forEach(p=>e.style[p]='');
  });
  resetPositions();
  advSetCirclesVisible(true);
}

function advStopMars(){
  clearInterval(marsLoop);clearInterval(marsDustTimer);clearInterval(marsSpawnTimer);
  marsLoop=null;marsDustTimer=null;marsSpawnTimer=null;
  marsEnemies=[];marsBoss=null;marsGoldActive=false;
  if(marsGoldTimer)clearTimeout(marsGoldTimer);
  const ds=document.getElementById('adv-dust-storm');
  if(ds)ds.classList.remove('active');
  if(marsEnemyCtx&&marsEnemyCanvas)
    marsEnemyCtx.clearRect(0,0,marsEnemyCanvas.width,marsEnemyCanvas.height);
  if(state.advActive) advSetCirclesVisible(false); // hide when leaving mars
}

function advGetCurrentMissions(){
  return PLANET_MISSIONS[advCurrentPlanet]||PLANET_MISSIONS.mars;
}
function advGetCurrentPlanetState(){
  return advState[advCurrentPlanet]||advState.mars;
}

function advStartEnemySpawning(){
  const missions=advGetCurrentMissions();
  const ps=advGetCurrentPlanetState();
  const mission=missions[ps.currentMission]||missions[0];
  if(mission.type==='boss'){
    setTimeout(()=>advSpawnMarsBoss(mission.bossId),1500);
    return;
  }
  const spawnRate=mission.type==='fusions'?4000:2000;
  advSpawnEnemy();
  marsSpawnTimer=setInterval(()=>{
    if(marsEnemies.length<7) advSpawnEnemy();
  },spawnRate);
}


function advSpawnEnemy(){
  const canvas=marsEnemyCanvas;
  if(!canvas)return;
  const pool=ENEMY_TYPES[advCurrentPlanet]||ENEMY_TYPES.mars;
  const type=pool[Math.floor(Math.random()*pool.length)];
  const side=Math.floor(Math.random()*4);
  let x,y;
  if(side===0){x=Math.random()*canvas.width;y=-30;}
  else if(side===1){x=canvas.width+30;y=Math.random()*canvas.height;}
  else if(side===2){x=Math.random()*canvas.width;y=canvas.height+30;}
  else{x=-30;y=Math.random()*canvas.height;}
  marsEnemies.push({...type,x,y,vx:0,vy:0,id:Date.now()+Math.random()});
}

function advSpawnMarsBoss(bossId){
  const canvas=marsEnemyCanvas;if(!canvas)return;
  const configs={
    crimson:{name:'CRIMSON CORE',  hp:20, r:48, color:'#cc1100', glow:'#ff2200', phase:'PHASE 1 — AWAKENING'},
    sentinel:{name:'IRON SENTINEL',hp:35, r:56, color:'#668899', glow:'#aabbff', phase:'SENTINEL ONLINE'},
    void:    {name:'VOID REMNANT', hp:50, r:64, color:'#220033', glow:'#cc00ff', phase:'PHASE 1 — DORMANT'},
  };
  const cfg=configs[bossId]||configs.crimson;
  marsBoss={
    x:canvas.width/2,y:canvas.height*.22,
    r:cfg.r,hp:cfg.hp,maxHp:cfg.hp,
    color:cfg.color,glow:cfg.glow,
    bossId:bossId||'crimson',
    pulseT:0,spawnTimer:0,phase:1,
    // Void Remnant projectile system
    projectiles:[],projectileTimer:0,
  };
  const bar=document.getElementById('adv-boss-bar');
  if(bar){
    bar.style.display='block';
    document.getElementById('adv-boss-bar-fill').style.width='100%';
    document.getElementById('adv-boss-bar-fill').style.background=
      bossId==='void'?'linear-gradient(90deg,#220033,#8800cc,#cc44ff)':
      bossId==='sentinel'?'linear-gradient(90deg,#334455,#6699aa,#aaddff)':
      'linear-gradient(90deg,#660000,#ff2200,#ff7722)';
    document.getElementById('adv-boss-bar-phase').textContent=cfg.phase;
    document.getElementById('adv-boss-bar-name').textContent=cfg.name;
    document.getElementById('adv-boss-bar-name').style.color=
      bossId==='void'?'#cc44ff':bossId==='sentinel'?'#aabbff':'#ff6644';
  }
  const msgs={crimson:'THE CRIMSON CORE AWAKENS!',sentinel:'⚡ IRON SENTINEL ONLINE — SHIELDS ACTIVE',void:'◉ VOID REMNANT MATERIALISES...'};
  document.getElementById('adv-mars-status').textContent=msgs[bossId]||msgs.crimson;
  advShowEvent(msgs[bossId]||msgs.crimson, cfg.glow.replace('rgba(','').split(',').slice(0,3).join(','));
}

function advMarsUpdate(){
  if(!marsEnemyCtx||!marsEnemyCanvas)return;
  const cvs=marsEnemyCanvas,ctx=marsEnemyCtx;
  ctx.clearRect(0,0,cvs.width,cvs.height);

  // Move enemies toward center
  const cx=cvs.width/2,cy=cvs.height*.6;
  marsEnemies.forEach(e=>{
    const ang=Math.atan2(cy-e.y,cx-e.x);
    e.vx=Math.cos(ang)*e.speed;e.vy=Math.sin(ang)*e.speed;
    e.x+=e.vx;e.y+=e.vy;
  });

  // Boss behaviour
  if(marsBoss){
    marsBoss.pulseT+=.05;
    marsBoss.spawnTimer++;
    const spawnRate=marsBoss.bossId==='void'?40:marsBoss.bossId==='sentinel'?70:60;
    if(marsBoss.spawnTimer%spawnRate===0&&marsEnemies.length<6) advSpawnEnemy();

    // Phase transitions
    const hpPct=marsBoss.hp/marsBoss.maxHp;
    if(hpPct<=0.6&&marsBoss.phase===1){
      marsBoss.phase=2;
      const p2msgs={crimson:'PHASE 2 — AGGRESSION',sentinel:'SENTINEL OVERCLOCKED',void:'PHASE 2 — AWAKENING'};
      document.getElementById('adv-boss-bar-phase').textContent=p2msgs[marsBoss.bossId]||'PHASE 2';
      advShowEvent('⚠ PHASE 2!','#ff4422');shake('md');
    }
    if(hpPct<=0.25&&marsBoss.phase===2){
      marsBoss.phase=3;
      const p3msgs={crimson:'PHASE 3 — OVERLOAD',sentinel:'SENTINEL CRITICAL',void:'PHASE 3 — FINAL FORM'};
      document.getElementById('adv-boss-bar-phase').textContent=p3msgs[marsBoss.bossId]||'PHASE 3';
      advShowEvent('⚠ PHASE 3 — FINAL FORM!','#ff2200');shake('lg');
    }

    // Speed scales with phase
    const driftSpd=0.7+marsBoss.phase*0.5;
    marsBoss.x+=Math.sin(marsBoss.pulseT*.4)*driftSpd;
    marsBoss.y+=Math.sin(marsBoss.pulseT*.3+1)*driftSpd*.6;
    marsBoss.x=Math.max(marsBoss.r,Math.min(cvs.width-marsBoss.r,marsBoss.x));
    marsBoss.y=Math.max(marsBoss.r,Math.min(cvs.height*.5,marsBoss.y));

    // Void Remnant: shoot projectiles in phase 2+
    if(marsBoss.bossId==='void'&&marsBoss.phase>=2){
      marsBoss.projectileTimer++;
      const fireRate=marsBoss.phase===3?50:80;
      if(marsBoss.projectileTimer%fireRate===0){
        const count=marsBoss.phase===3?6:3;
        for(let i=0;i<count;i++){
          const a=(i/count)*Math.PI*2+marsBoss.pulseT;
          marsBoss.projectiles.push({
            x:marsBoss.x,y:marsBoss.y,
            vx:Math.cos(a)*3,vy:Math.sin(a)*3,
            r:6,life:1,
          });
        }
      }
      // Move + draw projectiles
      marsBoss.projectiles=marsBoss.projectiles.filter(p=>{
        p.x+=p.vx;p.y+=p.vy;p.life-=0.012;
        if(p.x<0||p.x>cvs.width||p.y<0||p.y>cvs.height||p.life<=0)return false;
        ctx.save();ctx.globalAlpha=p.life;
        ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);
        ctx.fillStyle='#cc44ff';ctx.shadowColor='#8800ff';ctx.shadowBlur=10;ctx.fill();
        ctx.restore();
        return true;
      });
    }

    // Iron Sentinel: shield absorbs first hit each 5s
    if(marsBoss.bossId==='sentinel'&&!marsBoss.shieldCooldown){
      marsBoss.shieldActive=true;
    }

    advDrawBoss(ctx);
    advUpdateBossHpBar();
  }

  // Gold orb visual only — damage already applied at fire time in advFireGoldBlast
  if(marsGoldActive){
    marsGoldLife-=2;
    if(marsGoldLife<=0){marsGoldActive=false;}
    else{
      ctx.save();
      ctx.globalAlpha=marsGoldLife/100;
      ctx.beginPath();ctx.arc(marsGoldX,marsGoldY,50,0,Math.PI*2);
      const g=ctx.createRadialGradient(marsGoldX,marsGoldY,0,marsGoldX,marsGoldY,50);
      g.addColorStop(0,'rgba(255,255,200,.9)');g.addColorStop(.5,'rgba(245,200,66,.6)');g.addColorStop(1,'rgba(200,100,0,0)');
      ctx.fillStyle=g;ctx.shadowColor='#f5c842';ctx.shadowBlur=30;ctx.fill();
      ctx.restore();
    }
  }

  // Draw enemies
  marsEnemies.forEach(e=>advDrawEnemy(ctx,e));

  // Update mission progress UI
  const _ps=advGetCurrentPlanetState();
  const _missions=advGetCurrentMissions();
  const _prog=_ps.missionProgress[_ps.currentMission]||0;
  const _target=_missions[_ps.currentMission]?.target||'?';
  document.getElementById('adv-mission-progress').textContent=`${_prog}/${_target}`;
}

function advDrawEnemy(ctx,e){
  ctx.save();
  const pulse=.85+.15*Math.sin(Date.now()*.004);
  ctx.beginPath();ctx.arc(e.x,e.y,e.r*pulse,0,Math.PI*2);
  if(e.shielded){
    ctx.fillStyle='rgba(60,100,255,.2)';ctx.strokeStyle='#4488ff';
    ctx.lineWidth=3;ctx.fill();ctx.stroke();
    // shield ring
    ctx.beginPath();ctx.arc(e.x,e.y,e.r+8,0,Math.PI*2);
    ctx.strokeStyle='rgba(100,150,255,.4)';ctx.lineWidth=2;ctx.stroke();
  } else {
    ctx.fillStyle=e.color;
    ctx.shadowColor=e.color;ctx.shadowBlur=18;ctx.fill();
  }
  // hp pips
  for(let i=0;i<e.maxHp;i++){
    ctx.beginPath();ctx.arc(e.x-((e.maxHp-1)*5)+i*10,e.y+e.r+7,3,0,Math.PI*2);
    ctx.fillStyle=i<e.hp?'#fff':'rgba(255,255,255,.2)';ctx.fill();
  }
  ctx.restore();
}

function advDrawBoss(ctx){
  const b=marsBoss,pulse=.9+.1*Math.sin(b.pulseT);
  ctx.save();
  // Outer glow
  const glowR=b.r*1.9;
  const glowCol=b.bossId==='void'?'rgba(140,0,200,':b.bossId==='sentinel'?'rgba(100,150,220,':'rgba(255,40,0,';
  const gg=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,glowR);
  gg.addColorStop(0,glowCol+'0.3)');gg.addColorStop(1,glowCol+'0)');
  ctx.beginPath();ctx.arc(b.x,b.y,glowR,0,Math.PI*2);ctx.fillStyle=gg;ctx.fill();

  // Body
  ctx.beginPath();ctx.arc(b.x,b.y,b.r*pulse,0,Math.PI*2);
  let bg;
  if(b.bossId==='sentinel'){
    bg=ctx.createRadialGradient(b.x-.3*b.r,b.y-.3*b.r,0,b.x,b.y,b.r);
    bg.addColorStop(0,'#ccddee');bg.addColorStop(.5,'#5577aa');bg.addColorStop(1,'#223344');
    ctx.fillStyle=bg;ctx.shadowColor='#aabbff';ctx.shadowBlur=30;
    // Shield ring when active
    if(b.shieldActive){
      ctx.fill();
      ctx.beginPath();ctx.arc(b.x,b.y,b.r*1.2,0,Math.PI*2);
      ctx.strokeStyle='rgba(150,200,255,.6)';ctx.lineWidth=3;ctx.stroke();
    } else ctx.fill();
    // Hex pattern
    ctx.strokeStyle='rgba(180,220,255,.2)';ctx.lineWidth=1;
    for(let i=0;i<6;i++){
      const a=(i/6)*Math.PI*2+b.pulseT*.1;
      ctx.beginPath();ctx.moveTo(b.x,b.y);
      ctx.lineTo(b.x+Math.cos(a)*b.r*.9,b.y+Math.sin(a)*b.r*.9);ctx.stroke();
    }
  } else if(b.bossId==='void'){
    bg=ctx.createRadialGradient(b.x,b.y,0,b.x,b.y,b.r);
    bg.addColorStop(0,'#000000');bg.addColorStop(.4,'#220033');bg.addColorStop(1,'#440066');
    ctx.fillStyle=bg;ctx.shadowColor='#cc00ff';ctx.shadowBlur=40;ctx.fill();
    // Swirling void lines
    ctx.strokeStyle=`rgba(180,0,255,${0.3+0.3*Math.sin(b.pulseT)})`;ctx.lineWidth=1.5;
    ctx.setLineDash([4,4]);
    ctx.beginPath();ctx.arc(b.x,b.y,b.r*.6,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(b.x,b.y,b.r*.3,0,Math.PI*2);ctx.stroke();
    ctx.setLineDash([]);
    // Void eye
    ctx.beginPath();ctx.arc(b.x,b.y,b.r*.15,0,Math.PI*2);
    ctx.fillStyle=`rgba(220,0,255,${0.6+0.4*Math.sin(b.pulseT*2)})`;ctx.fill();
  } else {
    // Crimson Core (default)
    bg=ctx.createRadialGradient(b.x-.3*b.r,b.y-.3*b.r,0,b.x,b.y,b.r);
    bg.addColorStop(0,'#ff6633');bg.addColorStop(.5,'#cc1100');bg.addColorStop(1,'#440000');
    ctx.fillStyle=bg;ctx.shadowColor='#ff2200';ctx.shadowBlur=40;ctx.fill();
    ctx.strokeStyle='rgba(255,200,100,.4)';ctx.lineWidth=1.5;
    for(let i=0;i<5;i++){
      const a=(i/5)*Math.PI*2+b.pulseT*.2;
      ctx.beginPath();ctx.moveTo(b.x,b.y);
      ctx.lineTo(b.x+Math.cos(a)*(b.r*.8),b.y+Math.sin(a)*(b.r*.8));ctx.stroke();
    }
  }
  // Boss label
  const names={crimson:'CRIMSON CORE',sentinel:'IRON SENTINEL',void:'VOID REMNANT'};
  ctx.fillStyle='rgba(255,230,220,.9)';ctx.font=`bold ${Math.max(9,b.r*.2)}px Orbitron,monospace`;
  ctx.textAlign='center';ctx.textBaseline='middle';ctx.shadowBlur=0;
  ctx.fillText(names[b.bossId]||'BOSS',b.x,b.y);
  ctx.restore();
}

function advUpdateBossHpBar(){
  if(!marsBoss)return;
  const pct=(marsBoss.hp/marsBoss.maxHp)*100;
  const fill=document.getElementById('adv-boss-bar-fill');
  if(!fill)return;
  fill.style.width=pct+'%';
  if(marsBoss.bossId==='void'){
    fill.style.background=pct>50?'linear-gradient(90deg,#220033,#8800cc,#cc44ff)':pct>25?'linear-gradient(90deg,#110022,#550099)':'linear-gradient(90deg,#0a0015,#330066)';
  } else if(marsBoss.bossId==='sentinel'){
    fill.style.background=pct>50?'linear-gradient(90deg,#334455,#6699aa,#aaddff)':pct>25?'linear-gradient(90deg,#223344,#4477aa)':'linear-gradient(90deg,#112233,#224466)';
  } else {
    fill.style.background=pct>50?'linear-gradient(90deg,#660000,#ff2200,#ff7722)':pct>25?'linear-gradient(90deg,#440000,#cc1100)':'linear-gradient(90deg,#220000,#880000)';
  }
}

function advEnemyKilled(e){
  SFX.enemyKill();
  const missions=advGetCurrentMissions();
  const ps=advGetCurrentPlanetState();
  const mi=ps.currentMission;
  const mission=missions[mi];
  if(mission&&mission.type==='kills'){
    ps.missionProgress[mi]=(ps.missionProgress[mi]||0)+1;
    if(ps.missionProgress[mi]>=mission.target){
      advSave();setTimeout(advMissionComplete,600);
    } else advSave();
  }
  spawnSparks(e.x,e.y,'#ff6622',10);
}

function advOnMarsFusion(){
  const missions=advGetCurrentMissions();
  const ps=advGetCurrentPlanetState();
  const mi=ps.currentMission;
  const mission=missions[mi];
  marsFusionCount++;
  if(mission&&mission.type==='fusions'){
    ps.missionProgress[mi]=(ps.missionProgress[mi]||0)+1;
    if(ps.missionProgress[mi]>=mission.target){
      advSave();setTimeout(advMissionComplete,1200);
    } else advSave();
  }

  // Roll for singularity
  const singChance=advSingularityChance();
  if(singChance>0&&Math.random()<singChance){
    advSingularityStrike();
    return;
  }

  // Normal blast
  advFireGoldBlast();
  setTimeout(()=>{
    state.merged=false;
    [els.red,els.blue,els.green].forEach(e=>{
      e.classList.remove('fading','hidden');
      ['transform','filter'].forEach(p=>e.style[p]='');
    });
    resetPositions();
    advSetCirclesVisible(true);
  },400);
}

function advMissionProgress(){
  const ps=advGetCurrentPlanetState();
  return ps.missionProgress[ps.currentMission]||0;
}

function advFireGoldBlast(){
  SFX.laser();
  const canvas=marsEnemyCanvas;if(!canvas)return;

  // Pick best target: closest enemy to the player-circle centroid, or boss
  let target=null,bestDist=Infinity;
  const px=canvas.width/2,py=canvas.height*.65;
  marsEnemies.forEach(e=>{
    const d=Math.hypot(e.x-px,e.y-py);
    if(d<bestDist){bestDist=d;target=e;}
  });
  if(marsBoss){
    const d=Math.hypot(marsBoss.x-px,marsBoss.y-py);
    if(d<bestDist){target=marsBoss;}
  }
  const tx=target?target.x:px;
  const ty=target?target.y:py*.5;

  // ── ONE-SHOT AoE at target position ──
  // Kill enemies in blast radius immediately (no repeated loop hits)
  const orbR=55;
  marsEnemies=marsEnemies.filter(e=>{
    const dist=Math.hypot(tx-e.x,ty-e.y);
    if(dist<orbR+e.r){
      if(e.shielded&&e.hp>0){e.shielded=false;e.color='#ff6622';return true;}
      advEnemyKilled(e);return false;
    }
    return true;
  });
  if(marsBoss&&Math.hypot(tx-marsBoss.x,ty-marsBoss.y)<orbR+marsBoss.r){
    // Iron Sentinel absorbs first hit if shield is active
    if(marsBoss.bossId==='sentinel'&&marsBoss.shieldActive){
      marsBoss.shieldActive=false;
      marsBoss.shieldCooldown=true;
      setTimeout(()=>{ if(marsBoss) marsBoss.shieldCooldown=false; },5000);
      advShowEvent('⚡ SHIELD ABSORBED!','#aabbff');
    } else {
      marsBoss.hp=Math.max(0,marsBoss.hp-1);
      if(marsBoss.hp<=0) advBossDefeated();
    }
  }

  // ── Visual: short-lived blast orb (purely cosmetic, no further damage) ──
  marsGoldActive=true;marsGoldX=tx;marsGoldY=ty;marsGoldLife=80;

  // Laser beams from circles to target
  const ctx=marsEnemyCtx;
  const circles=[els.red,els.blue,els.green];
  const colors=['rgba(255,80,80,0.9)','rgba(80,120,255,0.9)','rgba(80,255,120,0.9)'];
  let laserAlpha=1,laserFrames=0;
  const areaRect=canvas.getBoundingClientRect();
  const laserAnim=setInterval(()=>{
    laserFrames++;laserAlpha=Math.max(0,1-laserFrames/12);
    circles.forEach((c,i)=>{
      const rect=c.getBoundingClientRect();
      const sx=rect.left+rect.width/2-areaRect.left;
      const sy=rect.top+rect.height/2-areaRect.top;
      ctx.save();
      ctx.globalAlpha=laserAlpha;
      ctx.strokeStyle=colors[i];ctx.lineWidth=3+laserAlpha*3;
      ctx.shadowColor=colors[i];ctx.shadowBlur=20;
      ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(tx,ty);ctx.stroke();
      ctx.strokeStyle='rgba(255,255,255,.9)';ctx.lineWidth=1.5;ctx.shadowBlur=8;
      ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(tx,ty);ctx.stroke();
      ctx.restore();
    });
    ctx.save();ctx.globalAlpha=laserAlpha;
    const ig=ctx.createRadialGradient(tx,ty,0,tx,ty,40);
    ig.addColorStop(0,'rgba(255,255,180,.95)');ig.addColorStop(.4,'rgba(245,200,66,.7)');ig.addColorStop(1,'rgba(200,100,0,0)');
    ctx.beginPath();ctx.arc(tx,ty,40,0,Math.PI*2);ctx.fillStyle=ig;ctx.fill();
    ctx.restore();
    if(laserFrames>=14)clearInterval(laserAnim);
  },30);

  document.getElementById('adv-mars-status').textContent='⚡ GOLD ORB FIRED!';
  setTimeout(()=>{if(state.advScene==='mars')document.getElementById('adv-mars-status').textContent='FUSE AGAIN TO ATTACK!';},1000);
}

function advBossDefeated(){
  marsBoss=null;
  clearInterval(marsLoop);clearInterval(marsSpawnTimer);clearInterval(marsDustTimer);
  clearTimeout(marsBossAttackTimer);
  marsLoop=null;
  const ps=advGetCurrentPlanetState();
  ps.bossDefeated=true;
  ps.missionProgress[ps.currentMission]=1;
  advSave();
  const bar=document.getElementById('adv-boss-bar');
  if(bar) bar.style.display='none';
  setTimeout(advMissionComplete,800);
}

function advUpdateMissionUI(){
  const missions=advGetCurrentMissions();
  const ps=advGetCurrentPlanetState();
  const mi=ps.currentMission;
  const mission=missions[Math.min(mi,missions.length-1)];
  if(!mission)return;
  document.getElementById('adv-mission-label').textContent=mission.label;
  document.getElementById('adv-mission-desc').textContent=mission.desc;
  document.getElementById('adv-mission-progress').textContent=
    `${ps.missionProgress[mi]||0}/${mission.target}`;
}

function advMissionComplete(){
  advStopMars();
  const missions=advGetCurrentMissions();
  const ps=advGetCurrentPlanetState();
  const mi=ps.currentMission;
  const mission=missions[Math.min(mi,missions.length-1)];
  if(!mission)return;
  advState.energy+=mission.reward;
  SFX.missionComplete();

  // Unlocks on boss defeats
  let unlockMsg='';
  const bossNames={crimson:'CRIMSON CORE',sentinel:'IRON SENTINEL',void:'VOID REMNANT'};
  if(mission.type==='boss'){
    if(advCurrentPlanet==='mars'&&!advState.phobosUnlocked){
      advState.phobosUnlocked=true;
      advState.deimosUnlocked=true;
      unlockMsg='🌑 NEW SECTORS UNLOCKED: PHOBOS & DEIMOS';
    } else if(advCurrentPlanet==='phobos'){
      unlockMsg='☄️ PHOBOS CONQUERED — DEIMOS AWAITS';
    } else if(advCurrentPlanet==='deimos'){
      unlockMsg='🏆 ALL SECTORS CONQUERED — LEGEND STATUS';
    }
  }
  advSave();

  const mc=document.getElementById('adv-mission-complete');
  mc.style.display='flex';

  const bossVictoryTitles={
    crimson:'CRIMSON CORE DESTROYED!',
    sentinel:'IRON SENTINEL DEFEATED!',
    void:'VOID REMNANT BANISHED!',
  };
  const planetComplete={mars:'MARS SECTOR CONQUERED',phobos:'PHOBOS OUTPOST CLEARED',deimos:'DEIMOS STRONGHOLD FALLEN'};

  const icon=document.getElementById('adv-mc-icon');
  const title=document.getElementById('adv-mc-title');
  const sub=document.getElementById('adv-mc-sub');
  const reward=document.getElementById('adv-mc-reward');
  const unlockEl=document.getElementById('adv-mc-unlock');

  if(mission.type==='boss'){
    if(icon) icon.textContent='🏆';
    if(title){title.textContent=bossVictoryTitles[mission.bossId]||'BOSS DEFEATED!';title.style.color='#ff6644';}
    if(sub) sub.textContent=planetComplete[advCurrentPlanet]||'SECTOR CLEARED';
  } else {
    if(icon) icon.textContent='✓';
    if(title){title.textContent='MISSION COMPLETE';title.style.color='#f5c842';}
    if(sub) sub.textContent=mission.label+' — '+mission.desc;
  }
  if(reward) reward.textContent=`+${mission.reward} FUSION ENERGY EARNED`;
  if(unlockEl) unlockEl.textContent=unlockMsg;
}

export function advNextMission(){
  document.getElementById('adv-mission-complete').style.display='none';
  const missions=advGetCurrentMissions();
  const ps=advGetCurrentPlanetState();
  if(ps.currentMission<missions.length-1){
    ps.currentMission++;
    advSave();
  }
  advShowMap();
}

function advDustStorm(){
  const ds=document.getElementById('adv-dust-storm');
  if(!ds||state.advScene!=='mars')return;
  ds.classList.add('active');
  setTimeout(()=>ds.classList.remove('active'),4000);
}

export function advReturnToEarth(){
  advStopMars();
  advShowMap();
}

// ── HOOK INTO FUSION EVENTS ──
// Called from triggerGoldOrb when in adventure mode
function advHandleFusion(){
  if(!state.advActive)return;
  if(state.advScene==='earth') advOnEarthFusion();
  else if(state.advScene==='mars') advOnMarsFusion();
}

// ── MELTDOWN CHANCE MODIFIER ──
function advMeltdownChance(){
  // Base 10%, reduced by stableFusion upgrade
  const reductions=[0,.10,.20,.30];
  return 0.10-reductions[advState.upgrades.stableFusion||0];
}

// ── GOLD ORB LIFETIME MODIFIER (for stronger fusion) ──
export function advGoldOrbDuration(){
  const bonuses=[0,400,800,1400];
  return bonuses[advState.upgrades.strongerFusion||0];
}

// ── SINGULARITY CHANCE MODIFIER ──
// Returns % chance of triggering singularity on a Mars fusion.
// Upgrade level: 0=off, 1=rare(5%), 2=normal(12%), 3=boosted(22%)
export function advSingularityChance(){
  if(!state.advActive) return 0;
  const lvl=advState.upgrades.singularityChance??2;
  return [0,0.05,0.12,0.22][lvl]??0.12;
}

// ── ADVENTURE SINGULARITY STRIKE ──
// Triggered from Mars fusion when the singularity roll succeeds.
// Sucked enemies and boss are handled entirely within canvas coordinates.
// Boss takes 30–40% of maxHp as damage after suck.
function advSingularityStrike(){
  if(!state.advActive||state.advScene!=='mars'||!marsEnemyCanvas)return;
  const cvs=marsEnemyCanvas;
  const ctx=marsEnemyCtx;
  const cx=cvs.width/2, cy=cvs.height*.55;

  // Pause the main mars loop so our suck interval has sole control of enemy positions
  clearInterval(marsLoop); marsLoop=null;

  advShowEvent('◉ SINGULARITY STRIKE!','#cc44ff');
  document.getElementById('adv-mars-status').textContent='⚠ SINGULARITY — GRAVITY WELL FORMING!';
  shake('md');

  // Suck phase: pull enemies + boss toward cx,cy over 0.8s
  let elapsed=0;
  const SUCK_MS=800;
  const suckInterval=setInterval(()=>{
    elapsed+=50;
    ctx.clearRect(0,0,cvs.width,cvs.height);

    // Draw singularity vortex at center
    const prog=elapsed/SUCK_MS;
    const vortexR=20+prog*80;
    const vg=ctx.createRadialGradient(cx,cy,0,cx,cy,vortexR);
    vg.addColorStop(0,'rgba(0,0,0,0.95)');
    vg.addColorStop(0.4,'rgba(100,0,200,0.6)');
    vg.addColorStop(1,'rgba(100,0,200,0)');
    ctx.beginPath();ctx.arc(cx,cy,vortexR,0,Math.PI*2);
    ctx.fillStyle=vg;ctx.fill();
    // Spinning ring
    ctx.save();ctx.translate(cx,cy);ctx.rotate(elapsed*0.008);
    ctx.strokeStyle=`rgba(180,0,255,${0.4+prog*0.5})`;
    ctx.lineWidth=2;ctx.setLineDash([8,6]);
    ctx.beginPath();ctx.arc(0,0,vortexR*.8,0,Math.PI*2);ctx.stroke();
    ctx.restore();

    // Pull enemies
    marsEnemies.forEach(e=>{
      const ang=Math.atan2(cy-e.y,cx-e.x);
      const dist=Math.hypot(e.x-cx,e.y-cy);
      const force=Math.min(18,8+(1-dist/cvs.width)*20);
      e.x+=Math.cos(ang)*force; e.y+=Math.sin(ang)*force;
      // Draw with purple tint while being sucked
      ctx.save();
      ctx.globalAlpha=0.7;
      ctx.beginPath();ctx.arc(e.x,e.y,e.r,0,Math.PI*2);
      ctx.fillStyle='#aa44ff';ctx.shadowColor='#8800ff';ctx.shadowBlur=12;ctx.fill();
      ctx.restore();
    });

    // Pull boss
    if(marsBoss){
      const ang=Math.atan2(cy-marsBoss.y,cx-marsBoss.x);
      const force=Math.min(5,2+(elapsed/SUCK_MS)*4);
      marsBoss.x+=Math.cos(ang)*force; marsBoss.y+=Math.sin(ang)*force;
      marsBoss.x=Math.max(marsBoss.r,Math.min(cvs.width-marsBoss.r,marsBoss.x));
      marsBoss.y=Math.max(marsBoss.r,Math.min(cvs.height*.7,marsBoss.y));
      advDrawBoss(ctx);
    }

    if(elapsed>=SUCK_MS){
      clearInterval(suckInterval);
      _advSingularityFling(cx,cy,cvs);
    }
  },50);
}

function _advSingularityFling(cx,cy,cvs){
  // Batch-kill enemies without triggering per-kill mission checks mid-animation
  const killed=marsEnemies.length;
  marsEnemies.forEach(e=>{ SFX.enemyKill(); spawnSparks(e.x,e.y,'#ff6622',6); });
  marsEnemies=[];

  // Expanding shockwave ring on battle canvas
  const ctx=marsEnemyCtx;
  let flingT=0;
  const flingAnim=setInterval(()=>{
    flingT+=30;
    ctx.clearRect(0,0,cvs.width,cvs.height);
    const r=flingT*3.5;
    const alpha=Math.max(0,1-flingT/400);
    ctx.save();
    ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);
    ctx.strokeStyle=`rgba(200,80,255,${alpha})`;
    ctx.lineWidth=Math.max(1,6-flingT/120);
    ctx.shadowColor='rgba(200,80,255,.8)';ctx.shadowBlur=20;
    ctx.stroke();ctx.restore();
    if(marsBoss) advDrawBoss(ctx);
    if(flingT>=420) clearInterval(flingAnim);
  },30);

  // Boss damage: 30–40% maxHp
  let bossKilled=false;
  if(marsBoss){
    const dmgPct=0.30+Math.random()*0.10;
    const dmg=Math.max(1,Math.ceil(marsBoss.maxHp*dmgPct));
    marsBoss.hp=Math.max(0,marsBoss.hp-dmg);
    advShowEvent(`◉ BOSS STRUCK — ${Math.round(dmgPct*100)}% DAMAGE!`,'#cc44ff');
    shake('lg');
    flashScreen('rgba(140,0,220,.5)');
    spawnParticles(cW()/2,cH()/2,'#cc44ff',80,10);
    spawnShockwave(cW()/2,cH()/2,'rgba(160,0,240,',300,10);
    advUpdateBossHpBar();
    if(marsBoss.hp<=0) bossKilled=true;
  } else {
    flashScreen('rgba(140,0,220,.4)');
    spawnParticles(cW()/2,cH()/2,'#8800ff',60,8);
    spawnShockwave(cW()/2,cH()/2,'rgba(180,0,255,',cW()*.5,8);
  }

  SFX.supernova();
  toast(`◉ SINGULARITY: ${killed} enemies vaporized${(marsBoss||bossKilled)?' + boss struck!':''}!`,'#cc44ff');

  // After animation settles: resolve kills + boss death, then resume loop
  setTimeout(()=>{
    if(!state.advActive||state.advScene!=='mars') return;

    if(bossKilled){ advBossDefeated(); return; }

    // Deferred mission progress for batch kills — use planet-aware state
    const _ps=advGetCurrentPlanetState();
    const _missions=advGetCurrentMissions();
    const _mi=_ps.currentMission;
    const _mission=_missions[_mi];
    if(_mission&&_mission.type==='kills'&&killed>0){
      _ps.missionProgress[_mi]=(_ps.missionProgress[_mi]||0)+killed;
      advSave();
      if(_ps.missionProgress[_mi]>=_mission.target){ advMissionComplete(); return; }
    }

    // Resume normal battle loop
    if(!marsLoop) marsLoop=setInterval(advMarsUpdate,50);
    document.getElementById('adv-mars-status').textContent='SINGULARITY DISCHARGED — FUSE TO CONTINUE!';
    state.merged=false;
    [els.red,els.blue,els.green].forEach(e=>{
      e.classList.remove('fading','hidden');
      ['transform','filter'].forEach(p=>e.style[p]='');
    });
    resetPositions();
    advSetCirclesVisible(true);
  },700);
}

// ── REGISTER WITH modeActions ──
modeActions.advHandleFusion = advHandleFusion;
modeActions.advMeltdownChance = advMeltdownChance;
