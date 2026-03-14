import { state, modeActions } from '../state.js';
import { els, area, el } from '../dom.js';
import { getCenter, cW, cH, setStatus, showMsg, flashScreen, shake, toast, setPos, resetPositions } from '../utils.js';
import { spawnParticles, spawnSparks, spawnShockwave } from '../canvas.js';
import SFX from '../sfx.js';
import { popCirclesOut, triggerGoldOrb } from '../fusion.js';

// ══════════════════════════════════════════
// ⚡ SCI-FI REACTOR SYSTEM
// ══════════════════════════════════════════
const SCIFI={
  active:false,
  phase:'idle',       // idle | doors | fusion | core | charging | charged | launch | instability
  coreType:null,
  chargeLevel:0,
  chargeTimer:null,
  instabilityTimer:null,
  bgCtx:null,
  rcCtx:null,
  bgStars:[],
  rings:[],           // spinning reactor rings
  arcNodes:[],        // electricity arc nodes
  lastArcT:0,

  CORE_TYPES:[
    {id:'standard',  name:'STANDARD CORE',   color:'#44aaff', color2:'#0055cc', glow:'rgba(68,170,255,', rarity:'COMMON',    desc:'Stable energy output\nReliable fusion result',       weight:40},
    {id:'overcharge', name:'OVERCHARGED CORE',color:'#ffaa22', color2:'#ff5500', glow:'rgba(255,160,30,', rarity:'UNCOMMON',  desc:'Excess energy detected\nUnstable but powerful',       weight:25},
    {id:'quantum',   name:'QUANTUM CORE',     color:'#cc44ff', color2:'#660099', glow:'rgba(200,80,255,', rarity:'RARE',      desc:'Quantum superposition\nFlickers between states',      weight:18},
    {id:'singularity',name:'SINGULARITY CORE',color:'#222222', color2:'#440066', glow:'rgba(120,0,200,',  rarity:'EPIC',      desc:'Micro-gravity detected\nDo not approach',             weight:10},
    {id:'plasma',    name:'PLASMA CORE',      color:'#ff4422', color2:'#ff8800', glow:'rgba(255,100,20,', rarity:'UNCOMMON',  desc:'Plasma containment field\nExtreme heat warning',      weight:25},
    {id:'ion',       name:'ION CORE',         color:'#44ffcc', color2:'#00aa88', glow:'rgba(68,255,200,', rarity:'RARE',      desc:'Ion discharge active\nElectric arc hazard',           weight:18},
    {id:'mega',      name:'⚡ MEGA CORE',     color:'#ffffff', color2:'#ffcc00', glow:'rgba(255,240,200,', rarity:'LEGENDARY', desc:'Perfect alignment achieved\nMaximum energy output',   weight:0}, // triggered only by perfect fusion
  ],

  pickCoreType(perfect){
    if(perfect) return this.CORE_TYPES.find(c=>c.id==='mega');
    const pool=this.CORE_TYPES.filter(c=>c.id!=='mega');
    // Singularity weight is overridden by adventure upgrade when in adv mode
    // In adventure mode, singularity chance is controlled by upgrade (already handled
    // in advOnMarsFusion roll). Outside adventure, use normal weight of 10.
    const singWeight=10;
    const total=pool.reduce((s,c)=>s+(c.id==='singularity'?singWeight:c.weight),0);
    let r=Math.random()*total;
    for(const c of pool){
      const w=c.id==='singularity'?singWeight:c.weight;
      r-=w; if(r<=0) return c;
    }
    return pool[0];
  },

  init(){
    // Build bg canvas once
    const bg=document.getElementById('scifi-bg-canvas');
    if(!bg)return;
    bg.width=area.clientWidth;bg.height=area.clientHeight;
    this.bgCtx=bg.getContext('2d');
    // Scatter twinkling grid dots
    this.bgStars=[];
    for(let i=0;i<60;i++) this.bgStars.push({
      x:Math.random()*bg.width,y:Math.random()*bg.height,
      r:Math.random()*.8+.2,phase:Math.random()*Math.PI*2,spd:Math.random()*.02+.005
    });
    // Reactor canvas
    const rc=document.getElementById('reactor-canvas');
    if(rc){ rc.width=220;rc.height=220; this.rcCtx=rc.getContext('2d'); }
    // Build rings
    this.rings=[
      {r:65, speed:.012, angle:0,  width:2, color:'rgba(68,170,255,',  opacity:.35},
      {r:80, speed:-.008,angle:1,  width:1.5,color:'rgba(100,200,255,',opacity:.25},
      {r:52, speed:.02,  angle:2,  width:1, color:'rgba(68,255,200,',  opacity:.2},
    ];
    this.active=true;
    document.body.classList.add('scifi-active');
    this.showTerminal();
    this.aiSay('SYSTEM ONLINE','dim');
    setTimeout(()=>this.aiSay('REACTOR READY'),400);
    setTimeout(()=>this.aiSay('INSERT ENERGY SOURCES'),900);
    this.phase='idle';
    this.showChargeBadge(false);
    document.getElementById('reactor-charge-bar').classList.remove('show');
    document.getElementById('core-type-badge').classList.remove('show');
    document.getElementById('launch-tube').classList.remove('open');
    document.getElementById('reactor-chamber').classList.remove('open','doors-closing');
    this.loop();
  },

  stop(){
    this.active=false;
    document.body.classList.remove('scifi-active');
    clearInterval(this.chargeTimer);
    clearTimeout(this.instabilityTimer);
    this.phase='idle';
    this.coreType=null;
    this.chargeLevel=0;
    document.getElementById('ai-terminal')?.classList.remove('show');
    document.getElementById('reactor-charge-bar')?.classList.remove('show');
    document.getElementById('core-type-badge')?.classList.remove('show');
    document.getElementById('launch-tube')?.classList.remove('open');
    document.getElementById('reactor-chamber')?.classList.remove('open','doors-closing');
    const el=document.getElementById('ai-terminal-lines');if(el)el.innerHTML='';
    this._resetOrbLabels();
  },

  showTerminal(){
    document.getElementById('ai-terminal').classList.add('show');
  },

  aiSay(msg, cls=''){
    const lines=document.getElementById('ai-terminal-lines');
    if(!lines)return;
    const d=document.createElement('div');
    d.className='ai-line'+(cls?' '+cls:'');
    d.textContent='> '+msg;
    lines.appendChild(d);
    // Keep max 8 lines
    while(lines.children.length>8) lines.removeChild(lines.firstChild);
    lines.scrollTop=lines.scrollHeight;
    SFX.aiBeep();
  },

  showChargeBadge(show){
    const el=document.getElementById('core-type-badge');
    if(!el)return;
    if(!show){el.classList.remove('show');return;}
    const c=this.coreType;
    el.innerHTML=`<div id="core-type-name" style="color:${c.color}">${c.name}</div>
      <div id="core-type-desc" style="white-space:pre">${c.desc}</div>
      <div id="core-type-rarity" style="color:${c.color}">${c.rarity}</div>`;
    el.style.borderColor=c.color+'88';
    el.classList.add('show');
  },

  onFusion(cx,cy,perfect){
    if(this.phase!=='idle')return;
    this.phase='doors';
    this.coreType=this.pickCoreType(perfect);
    const c=this.coreType;

    this.aiSay('FUSION INITIATED','warn');
    setTimeout(()=>this.aiSay('CONTAINMENT FIELD ACTIVE'),300);
    setTimeout(()=>this.aiSay(`CORE TYPE: ${c.id.toUpperCase()}`,c.id==='mega'?'warn':''),700);

    // Close doors
    const chamber=document.getElementById('reactor-chamber');
    chamber.classList.add('doors-closing');
    setTimeout(()=>{
      // Doors closed → start fusion sequence
      this.phase='fusion';
      this.aiSay('DOORS SEALED — FUSION ACTIVE','warn');
      shake('sm');
      // Speed up rings
      this.rings.forEach(r=>{ r._baseSpeed=r.speed; r.speed*=6; });

      // After 1.4s → core appears
      setTimeout(()=>this.spawnCore(cx,cy,perfect),1400);
    },650);
  },

  spawnCore(cx,cy,perfect){
    this.phase='core';
    const c=this.coreType;
    shake('md');
    flashScreen(`${c.glow}.5)`,200);
    spawnParticles(cx,cy,c.color,80,9);
    spawnParticles(cx,cy,'#ffffff',30,12);
    spawnShockwave(cx,cy,c.glow,200,10);

    const pulseMap={
      standard:'pulse-core-std',overcharge:'pulse-core-over',quantum:'pulse-core-quantum',
      singularity:'pulse-core-sing',plasma:'pulse-core-plasma',ion:'pulse-core-ion',mega:'pulse-core-mega'
    };
    const pulseAnim=pulseMap[c.id]||'pulse-core-std';

    // Style gold orb as core — no animation yet, set background first
    const size=c.id==='mega'?170:140;
    const bgStyle=this._coreBackground(c);
    Object.assign(els.gold.style,{
      width:size+'px',height:size+'px',left:cx+'px',top:cy+'px',
      background:bgStyle,
      boxShadow:`0 0 60px 25px ${c.glow}.7),0 0 120px 60px ${c.glow}.3)`,
      animation:`${pulseAnim} 1.4s ease-in-out infinite`,
      filter:'',transition:'opacity .4s',pointerEvents:'none',cursor:'default',
    });

    // Label: white text for all cores (non-gold backgrounds)
    els.orbText.style.color=c.id==='singularity'?'rgba(200,150,255,.9)':c.id==='mega'?'rgba(60,30,0,.9)':'rgba(220,240,255,.95)';
    els.orbIcon.style.color=els.orbText.style.color;
    els.orbText.textContent=c.name;
    els.orbIcon.textContent={mega:'⚡',singularity:'◉',quantum:'⟨ψ⟩',plasma:'🔥',ion:'⚡',overcharge:'⬆',standard:'◈'}[c.id]||'◈';
    els.bossPhaseLabel.textContent='';
    els.gold.classList.add('visible');

    // Open doors
    document.getElementById('reactor-chamber').classList.remove('doors-closing');
    document.getElementById('reactor-chamber').classList.add('open');
    document.getElementById('launch-tube').classList.add('open');

    // Show core type badge
    this.showChargeBadge(true);

    const msgTitle=c.id==='mega'?'⚡ MEGA CORE FORMED':c.id==='singularity'?'◉ SINGULARITY CORE':'CORE STABILIZED';
    showMsg(msgTitle,`${c.name} — CHARGING...`,c.color);
    setStatus(`◈ ${c.name} — CHARGING TO LAUNCH`,'merged');
    this.aiSay('CORE STABILIZED');
    setTimeout(()=>this.aiSay(`${c.rarity} CLASSIFICATION`,c.id==='mega'?'warn':c.id==='singularity'?'err':''),400);

    SFX.reactorCore();

    // Special per-type effects
    this._coreSpecialEffect(cx,cy,c);

    // Singularity: skip charging, go straight to black-hole suck → explode
    if(c.id==='singularity'){
      setTimeout(()=>this.triggerSingularityEvent(cx,cy),1200);
      return;
    }

    // Begin charging
    setTimeout(()=>this.startCharging(cx,cy),600);
  },

  triggerSingularityEvent(cx,cy){
    this.phase='launch'; // lock out other interactions
    this.aiSay('⚠ SINGULARITY THRESHOLD REACHED','err');
    this.aiSay('GRAVITY CONTAINMENT FAILING','err');
    setStatus('◉ SINGULARITY — CONTAINMENT FAILING','danger');
    shake('md');

    // Phase 1: suck circles in (1.5s)
    let t=0;
    const suckInterval=setInterval(()=>{
      t+=50;
      [els.red,els.blue,els.green].forEach(e=>{
        if(e.classList.contains('fading'))return;
        const ctr=getCenter(e);
        const ang=Math.atan2(cy-ctr.y,cx-ctr.x);
        const dist=Math.hypot(ctr.x-cx,ctr.y-cy);
        const force=Math.max(4,18-(dist*.04));
        setPos(e,parseFloat(e.style.left)+Math.cos(ang)*force,parseFloat(e.style.top)+Math.sin(ang)*force);
        if(Math.random()<.3) spawnSparks(ctr.x,ctr.y,'#cc44ff',2);
      });
      // Orb grows and darkens as it absorbs
      const grow=140+t*.04;
      els.gold.style.width=grow+'px';els.gold.style.height=grow+'px';
      spawnSparks(cx+(-80+Math.random()*160),cy+(-80+Math.random()*160),'#220066',2);
      if(t>=1500){
        clearInterval(suckInterval);
        // Circles collapse into orb
        [els.red,els.blue,els.green].forEach(e=>e.classList.add('fading'));
        flashScreen('rgba(0,0,0,.95)',400);
        shake('lg');
        SFX.singularity();
        // Adventure mode: trigger enemy/boss strike
        if(state.advActive&&state.advScene==='mars') advSingularityStrike();
        // Phase 2: explode like supernova (t+0.6s)
        setTimeout(()=>this._singularityExplosion(cx,cy),600);
      }
    },50);
  },

  _singularityExplosion(cx,cy){
    this.aiSay('CRITICAL FAILURE — CORE OVERLOAD','err');
    // Hide the orb
    els.gold.classList.remove('visible');
    els.gold.style.animation='';
    // Big explosion sequence
    const colors=['#cc00ff','#8800ff','#4400cc','#ffffff','#ff44ff','#aa00ff'];
    for(let i=0;i<8;i++){
      setTimeout(()=>{
        flashScreen(`rgba(${80+i*18},0,${200+i*6},.7)`,80);
        shake(i<4?'lg':'md');
        spawnParticles(cx+(-120+Math.random()*240),cy+(-120+Math.random()*240),colors[i%6],80);
        spawnParticles(cx,cy,'#ffffff',50);
        spawnSparks(cx,cy,'#cc44ff',20);
        spawnShockwave(cx,cy,'rgba(180,0,255,',cW()*(0.5+i*.12),10+i);
      },i*180);
    }
    SFX.supernova();
    // Aftermath + reset
    setTimeout(()=>{
      document.getElementById('reactor-charge-bar').classList.remove('show');
      document.getElementById('core-type-badge').classList.remove('show');
      document.getElementById('launch-tube').classList.remove('open');
      document.getElementById('reactor-chamber').classList.remove('open');
      this.aiSay('CONTAINMENT RESTORED','dim');
      showMsg('SINGULARITY COLLAPSED','GRAVITY EVENT CONCLUDED','#cc44ff');
      setStatus('◈ SINGULARITY DISCHARGED — REACTOR RESETTING','merged');
    },1500);
    setTimeout(()=>{
      state.merged=false;this.phase='idle';this.coreType=null;this.chargeLevel=0;
      this.rings.forEach(r=>{ if(r._baseSpeed) r.speed=r._baseSpeed; });
      this._resetOrbLabels();
      popCirclesOut();
      setStatus('DRAG ALL THREE CIRCLES INTO THE REACTOR');
      this.aiSay('SYSTEM READY','dim');
    },3500);
  },

  _resetOrbLabels(){
    // Reset label colors back to default gold for non-scifi use
    els.orbText.style.color='';
    els.orbIcon.style.color='';
    els.orbText.textContent='GOLD';
    els.orbIcon.textContent='✦';
  },

  _coreBackground(c){
    const map={
      standard:  'radial-gradient(circle at 38% 35%,#aaddff,#2266cc 45%,#001144)',
      overcharge:'radial-gradient(circle at 38% 35%,#ffffff,#ffaa22 40%,#cc3300)',
      quantum:   'radial-gradient(circle at 38% 35%,#eeccff,#9933cc 45%,#220044)',
      singularity:'radial-gradient(circle at 50% 50%,#000000 25%,#220033 55%,#440066 75%,transparent)',
      plasma:    'radial-gradient(circle at 38% 35%,#ffeecc,#ff4400 45%,#880000)',
      ion:       'radial-gradient(circle at 38% 35%,#ccffee,#22cc99 45%,#004433)',
      mega:      'radial-gradient(circle at 38% 35%,#ffffff,#ffee66 30%,#ffaa00 60%,#cc5500)',
    };
    return map[c.id]||map.standard;
  },

  _coreSpecialEffect(cx,cy,c){
    if(c.id==='singularity'){
      // Gravity pull aura
      const interval=setInterval(()=>{
        if(this.phase!=='charging'&&this.phase!=='charged'){clearInterval(interval);return;}
        [els.red,els.blue,els.green].forEach(e=>{
          if(e.classList.contains('fading'))return;
          const ctr=getCenter(e);
          const ang=Math.atan2(cy-ctr.y,cx-ctr.x);
          const dist=Math.hypot(ctr.x-cx,ctr.y-cy);
          const pull=Math.max(0,(180-dist)*0.012);
          setPos(e,parseFloat(e.style.left)+Math.cos(ang)*pull,parseFloat(e.style.top)+Math.sin(ang)*pull);
        });
      },50);
    }
    if(c.id==='ion'){
      // Random sparks from core
      const interval=setInterval(()=>{
        if(this.phase!=='charging'&&this.phase!=='charged'){clearInterval(interval);return;}
        const a=Math.random()*Math.PI*2, d=50+Math.random()*80;
        spawnSparks(cx+Math.cos(a)*d,cy+Math.sin(a)*d,'#44ffcc',4);
      },200);
    }
    if(c.id==='quantum'){
      // Flicker effect on orb
      const interval=setInterval(()=>{
        if(this.phase!=='charging'&&this.phase!=='charged'){clearInterval(interval);return;}
        if(Math.random()<.25){
          els.gold.style.opacity=(0.4+Math.random()*.6).toString();
          setTimeout(()=>{ if(els.gold.classList.contains('visible')) els.gold.style.opacity='1'; },80);
        }
      },150);
    }
  },

  startCharging(cx,cy){
    this.phase='charging';
    this.chargeLevel=0;
    document.getElementById('reactor-charge-bar').classList.add('show');
    const fill=document.getElementById('reactor-charge-fill');
    const pct=document.getElementById('reactor-charge-pct');
    this.aiSay('CORE CHARGING...','dim');

    // Decide if instability occurs (30% chance, not for mega)
    const unstable=this.coreType.id!=='mega' && Math.random()<.30;
    let instabilityFired=false;

    this.chargeTimer=setInterval(()=>{
      if(this.phase!=='charging')return;
      this.chargeLevel=Math.min(100,this.chargeLevel+.5);
      fill.style.width=this.chargeLevel+'%';
      pct.textContent=Math.round(this.chargeLevel)+'%';
      SFX.sepPulse(this.chargeLevel);

      // Emit particles as charge rises
      if(Math.random()<.08){
        const a=Math.random()*Math.PI*2,r=55+this.chargeLevel*.6;
        spawnSparks(cx+Math.cos(a)*r,cy+Math.sin(a)*r,this.coreType.color,3);
      }

      // Instability event at ~50-70% charge
      if(unstable&&!instabilityFired&&this.chargeLevel>=50+Math.random()*20){
        instabilityFired=true;
        this.triggerInstability(cx,cy);
      }

      if(this.chargeLevel>=100){
        clearInterval(this.chargeTimer);
        this.coreFullyCharged(cx,cy);
      }
    },40);
  },

  triggerInstability(cx,cy){
    this.phase='instability';
    clearInterval(this.chargeTimer);
    this.aiSay('⚠ CORE INSTABILITY DETECTED','err');
    this.aiSay('CONTAINMENT WARNING','warn');
    shake('md');flashScreen('rgba(255,80,0,.4)');

    let pulses=0;
    const warnLoop=setInterval(()=>{
      pulses++;
      flashScreen('rgba(255,40,0,.25)',120);
      shake('sm');
      spawnSparks(cx+(-80+Math.random()*160),cy+(-80+Math.random()*160),this.coreType.color,6);
      spawnShockwave(cx,cy,this.coreType.glow,100+pulses*20,4);
      SFX.meltdownWarn();
      if(pulses>=4){
        clearInterval(warnLoop);
        // 60% stabilize, 40% fail
        if(Math.random()<.6){
          this.aiSay('STABILIZING...','warn');
          setTimeout(()=>{
            this.aiSay('CORE RESTABILIZED');
            showMsg('CORE RESTABILIZED','EXTRA CHARGE BONUS — +20%',this.coreType.color);
            this.chargeLevel=Math.min(100,this.chargeLevel+20);
            this.phase='charging';
            this.startCharging(cx,cy); // resume
          },800);
        } else {
          this.aiSay('CONTAINMENT FAILURE','err');
          setTimeout(()=>{
            this.phase='idle';
            clearInterval(this.chargeTimer);
            triggerMeltdown(cx,cy);
          },600);
        }
      }
    },350);
  },

  coreFullyCharged(cx,cy){
    this.phase='charged';
    const c=this.coreType;
    const pulseMap={standard:'pulse-core-std',overcharge:'pulse-core-over',quantum:'pulse-core-quantum',
      singularity:'pulse-core-sing',plasma:'pulse-core-plasma',ion:'pulse-core-ion',mega:'pulse-core-mega'};
    this.aiSay('CORE FULLY CHARGED');
    this.aiSay('ENERGY OUTPUT MAXIMUM','warn');
    shake('md');
    flashScreen(`${c.glow}.6)`);
    spawnParticles(cx,cy,c.color,100,12);
    spawnShockwave(cx,cy,c.glow,300,12);
    showMsg('CORE FULLY CHARGED','ENERGY OUTPUT MAXIMUM — CLICK TO LAUNCH',c.color);
    setStatus(`◈ ${c.name} CHARGED — CLICK TO LAUNCH`,'merged');
    SFX.reactorCharged();

    // Fast pulsing glow with correct core color
    els.gold.style.animation=`${pulseMap[c.id]||'pulse-core-std'} .5s ease-in-out infinite`;
    els.gold.style.pointerEvents='all';
    els.gold.style.cursor='pointer';
    els.gold.onclick=()=>this.launchCore(cx,cy);
    document.getElementById('reactor-charge-fill').style.background=`linear-gradient(90deg,${c.color},#ffffff,${c.color})`;
    document.getElementById('reactor-charge-pct').style.color=c.color;
  },

  launchCore(cx,cy){
    if(this.phase!=='charged')return;
    this.phase='launch';
    const c=this.coreType;
    this.aiSay('LAUNCH SEQUENCE INITIATED','warn');
    this.aiSay('DEPLOYING TO ORBIT...');
    SFX.reactorLaunch();

    els.gold.style.pointerEvents='none';
    els.gold.onclick=null;

    // Orb shoots upward
    const startTop=parseFloat(els.gold.style.top);
    let t=0;
    const launchAnim=setInterval(()=>{
      t+=16;
      const p=t/800;
      els.gold.style.top=(startTop - p*p*cH()*1.5)+'px';
      els.gold.style.opacity=(1-p*1.2).toString();
      els.gold.style.transform=`translate(-50%,-50%) scale(${1-p*.5})`;
      spawnSparks(cx,startTop-p*p*cH()*1.5,c.color,4);
      if(t>=800){
        clearInterval(launchAnim);
        els.gold.classList.remove('visible');
        els.gold.style.opacity='';els.gold.style.transform='';
        this.afterLaunch(cx,cy);
      }
    },16);
  },

  afterLaunch(cx,cy){
    const c=this.coreType;
    flashScreen(`${c.glow}.4)`);
    shake('sm');
    spawnParticles(cx,cH()*0.1,c.color,80,8);
    showMsg('CORE LAUNCHED','PAYLOAD DELIVERED TO ORBIT',c.color);
    this.aiSay('PAYLOAD DELIVERED TO ORBIT');
    this.aiSay('REACTOR READY FOR NEXT CYCLE','dim');
    setStatus(`◈ ${c.name} LAUNCHED — REACTOR READY`,'merged');
    document.getElementById('reactor-charge-bar').classList.remove('show');
    document.getElementById('core-type-badge').classList.remove('show');
    document.getElementById('launch-tube').classList.remove('open');
    document.getElementById('reactor-chamber').classList.remove('open');

    // Reset for next fusion
    setTimeout(()=>{
      state.merged=false;
      this.phase='idle';
      this.coreType=null;
      this.chargeLevel=0;
      // Reset rings speed
      this.rings.forEach(r=>{ if(r._baseSpeed) r.speed=r._baseSpeed; });
      this._resetOrbLabels();
      popCirclesOut();
      setStatus('DRAG ALL THREE CIRCLES INTO THE REACTOR');
      this.aiSay('SYSTEM READY','dim');
    },1800);
  },

  loop(){
    if(!this.active)return;
    this._drawBg();
    this._drawReactor();
    requestAnimationFrame(()=>this.loop());
  },

  _drawBg(){
    const ctx=this.bgCtx;
    if(!ctx)return;
    const W=ctx.canvas.width,H=ctx.canvas.height;
    ctx.clearRect(0,0,W,H);
    // Twinkling stars
    const now=Date.now()*.001;
    this.bgStars.forEach(s=>{
      s.phase+=s.spd;
      const a=.15+.3*(Math.sin(s.phase)*0.5+0.5);
      ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);
      ctx.fillStyle=`rgba(100,200,255,${a})`;ctx.fill();
    });
    // Horizontal scan lines
    ctx.strokeStyle='rgba(68,170,255,0.04)';ctx.lineWidth=1;
    for(let y=0;y<H;y+=18){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(W,y);ctx.stroke();}
    // Corner brackets
    const bS=30;
    ctx.strokeStyle='rgba(68,170,255,0.3)';ctx.lineWidth=1.5;
    [[0,0,1,1],[W,0,-1,1],[0,H,1,-1],[W,H,-1,-1]].forEach(([x,y,sx,sy])=>{
      ctx.beginPath();ctx.moveTo(x+sx*bS,y);ctx.lineTo(x,y);ctx.lineTo(x,y+sy*bS);ctx.stroke();
    });
  },

  _drawReactor(){
    const ctx=this.rcCtx;
    if(!ctx)return;
    const W=220,H=220,cx=110,cy=110;
    ctx.clearRect(0,0,W,H);

    const isActive=this.phase!=='idle';
    const now=Date.now()*.001;

    // Speed up rings during fusion
    const speedMult=(this.phase==='fusion'||this.phase==='charging')?1:1;
    this.rings.forEach(r=>{
      r.angle+=r.speed*(isActive?2.5:1);
      // Draw elliptical ring (3D tilt effect)
      ctx.save();
      ctx.translate(cx,cy);
      ctx.rotate(r.angle);
      ctx.scale(1,.35);
      ctx.beginPath();ctx.arc(0,0,r.r,0,Math.PI*2);
      ctx.strokeStyle=r.color+(r.opacity*(isActive?2:1)+')');
      ctx.lineWidth=r.width*(isActive?2:1);
      ctx.shadowColor=r.color+'0.6)';ctx.shadowBlur=isActive?16:6;
      ctx.stroke();
      ctx.restore();

      // Glow node on ring
      if(isActive){
        const nx=cx+Math.cos(r.angle)*r.r;
        const ny=cy+Math.sin(r.angle)*r.r*0.35;
        ctx.beginPath();ctx.arc(nx,ny,3,0,Math.PI*2);
        ctx.fillStyle=r.color+'0.9)';ctx.fill();
      }
    });

    // Core glow in center when active
    if(isActive&&this.coreType){
      const c=this.coreType;
      const pulse=0.7+0.3*Math.sin(now*4);
      const grad=ctx.createRadialGradient(cx,cy,0,cx,cy,45);
      grad.addColorStop(0,c.glow+(0.5*pulse)+')');
      grad.addColorStop(1,c.glow+'0)');
      ctx.beginPath();ctx.arc(cx,cy,45,0,Math.PI*2);
      ctx.fillStyle=grad;ctx.fill();
    }

    // Lightning arcs during fusion phase
    if(this.phase==='fusion'||this.phase==='charging'){
      if(now-this.lastArcT>0.08){
        this.lastArcT=now;
        this._drawArc(ctx,cx,cy);
      }
    }
  },

  _drawArc(ctx,cx,cy){
    const c=this.coreType;if(!c)return;
    ctx.save();
    ctx.strokeStyle=c.color;ctx.lineWidth=1;ctx.globalAlpha=0.6+Math.random()*.4;
    ctx.shadowColor=c.color;ctx.shadowBlur=8;
    // Random zigzag from edge to center
    const a=Math.random()*Math.PI*2;
    const startX=cx+Math.cos(a)*90,startY=cy+Math.sin(a)*90;
    ctx.beginPath();ctx.moveTo(startX,startY);
    let px=startX,py=startY;
    for(let i=0;i<5;i++){
      const p=(i+1)/5;
      const tx=startX+(cx-startX)*p,ty=startY+(cy-startY)*p;
      px=tx+(-15+Math.random()*30);py=ty+(-15+Math.random()*30);
      ctx.lineTo(px,py);
    }
    ctx.lineTo(cx,cy);ctx.stroke();ctx.restore();
  },
};

// Register fusion action handler
modeActions.scifiOnFusion = (cx,cy,perfect) => SCIFI.onFusion(cx,cy,perfect);

// Expose phase accessors on state for external coordination
state._scifiPhase = () => SCIFI.phase;
state._scifiResetPhase = () => { SCIFI.phase = 'idle'; };

export default SCIFI;
