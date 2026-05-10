// ══════════════════════════════════════════
// SOUND ENGINE (Web Audio API — no files)
// ══════════════════════════════════════════
const SFX=(()=>{
  let ctx=null;
  let muted=false;

  function ac(){
    if(!ctx) ctx=new(window.AudioContext||window.webkitAudioContext)();
    if(ctx.state==='suspended') ctx.resume();
    return ctx;
  }

  // Master gain helper
  function gain(val,t=0){
    const g=ac().createGain();
    g.gain.setValueAtTime(val,ac().currentTime+t);
    return g;
  }

  // Connect chain to output
  function out(node,vol=0.3){
    const g=gain(vol);
    node.connect(g);g.connect(ac().destination);
    return g;
  }

  // Oscillator one-shot
  function osc(type,freq,dur,vol=0.25,detune=0){
    if(muted)return;
    const o=ac().createOscillator();
    const g=ac().createGain();
    o.type=type; o.frequency.value=freq; o.detune.value=detune;
    const now=ac().currentTime;
    g.gain.setValueAtTime(vol,now);
    g.gain.exponentialRampToValueAtTime(0.0001,now+dur);
    o.connect(g);g.connect(ac().destination);
    o.start(now);o.stop(now+dur);
  }

  // Noise burst
  function noise(dur,vol=0.15,bandFreq=0,bandQ=1){
    if(muted)return;
    const buf=ac().createBuffer(1,ac().sampleRate*dur,ac().sampleRate);
    const d=buf.getChannelData(0);
    for(let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    const src=ac().createBufferSource();src.buffer=buf;
    const g=ac().createGain();
    const now=ac().currentTime;
    g.gain.setValueAtTime(vol,now);
    g.gain.exponentialRampToValueAtTime(0.0001,now+dur);
    if(bandFreq){
      const bf=ac().createBiquadFilter();
      bf.type='bandpass';bf.frequency.value=bandFreq;bf.Q.value=bandQ;
      src.connect(bf);bf.connect(g);
    } else { src.connect(g); }
    g.connect(ac().destination);
    src.start();
  }

  // Freq sweep
  function sweep(type,f0,f1,dur,vol=0.2){
    if(muted)return;
    const o=ac().createOscillator();
    const g=ac().createGain();
    o.type=type;
    const now=ac().currentTime;
    o.frequency.setValueAtTime(f0,now);
    o.frequency.exponentialRampToValueAtTime(f1,now+dur);
    g.gain.setValueAtTime(vol,now);
    g.gain.exponentialRampToValueAtTime(0.0001,now+dur);
    o.connect(g);g.connect(ac().destination);
    o.start(now);o.stop(now+dur);
  }

  // Chord: play multiple notes
  function chord(freqs,type,dur,vol=0.12){
    if(muted)return;
    freqs.forEach((f,i)=>setTimeout(()=>osc(type,f,dur,vol),i*18));
  }

  // ── Named sounds ──
  return {
    toggle(){ muted=!muted; return !muted; },
    isMuted(){ return muted; },

    // Gravity bounce — pitch and volume scale with speed
    bounce(freq=200,vol=0.15){
      sweep('sine',freq*1.4,freq*.4,0.12,vol);
      noise(0.06,vol*0.4,freq*0.5,3);
    },

    // Diamond fusion appears
    diamondFusion(){
      sweep('sine',600,2400,0.4,0.18);
      setTimeout(()=>chord([880,1108,1320,1760],'sine',0.5,0.14),80);
      setTimeout(()=>sweep('sine',1200,3000,0.3,0.08),160);
      setTimeout(()=>noise(0.1,0.05,3000,12),200);
    },

    // Diamond rain tinkle (called many times)
    diamondTinkle(){
      const f=1800+Math.random()*1200;
      osc('sine',f,0.08,0.04);
    },

    // Diamond shatter
    diamondShatter(){
      noise(0.15,0.18,4000,8);
      sweep('sine',2000,200,0.35,0.15);
      setTimeout(()=>noise(0.08,0.1,6000,12),60);
      setTimeout(()=>sweep('sine',1400,100,0.25,0.08),120);
    },

    // AI terminal beep
    aiBeep(){
      osc('square',1200,0.04,0.025);
    },

    // Core appears
    reactorCore(){
      sweep('sine',180,900,0.5,0.18);
      setTimeout(()=>chord([440,554,659,880],'sine',0.4,0.12),120);
      setTimeout(()=>noise(0.1,0.06,1200,6),200);
    },

    // Core fully charged
    reactorCharged(){
      const freqs=[523,659,784,880,1047];
      freqs.forEach((f,i)=>setTimeout(()=>osc('sine',f,0.4,0.16),i*60));
      setTimeout(()=>sweep('sine',400,1600,0.5,0.14),100);
    },

    // Core launch
    reactorLaunch(){
      sweep('sine',200,2000,0.8,0.2);
      setTimeout(()=>noise(0.3,0.12,800,3),100);
      setTimeout(()=>sweep('sawtooth',800,80,0.6,0.1),200);
    },

    // Circle pickup (drag start)
    pick(){
      sweep('sine',320,480,0.08,0.12);
    },

    // Circles touching / near
    touch(){
      osc('sine',660,0.06,0.06);
    },

    // Fusion charge building (called periodically while charging)
    charge(pct){
      const f=200+pct*4;
      osc('sawtooth',f,0.05,0.04);
    },

    // Fusion complete / gold orb appears
    fusion(){
      const now=ac().currentTime;
      // Rising shimmer chord
      sweep('sine',220,880,0.4,0.22);
      setTimeout(()=>sweep('sine',330,1100,0.35,0.16),60);
      setTimeout(()=>chord([523,659,784,1047],'sine',0.5,0.13),120);
      setTimeout(()=>noise(0.15,0.08,2000,8),200);
    },

    // Perfect fusion bonus
    perfectFusion(){
      const freqs=[523,659,784,1047,1319];
      freqs.forEach((f,i)=>setTimeout(()=>osc('sine',f,0.5,0.18),i*55));
      setTimeout(()=>sweep('sine',600,1800,0.6,0.12),100);
    },

    // Orb split / circles scatter
    split(){
      sweep('sine',880,220,0.2,0.2);
      setTimeout(()=>noise(0.08,0.06,800,4),30);
    },

    // Boss hit (click damage)
    bossHit(){
      osc('square',120,0.06,0.18);
      sweep('sawtooth',200,80,0.08,0.1);
    },

    // Boss phase change
    bossPhase(phase){
      const freqs=[[110,138,165],[82,110,130],[55,73,87]];
      const set=freqs[phase-1]||freqs[0];
      set.forEach((f,i)=>setTimeout(()=>osc('sawtooth',f,0.35,0.15),i*80));
      setTimeout(()=>noise(0.2,0.12,300,2),50);
    },

    // Boss defeated
    bossDefeat(){
      const melody=[523,659,784,1047,784,1047,1319];
      melody.forEach((f,i)=>setTimeout(()=>osc('sine',f,0.35,0.18),i*90));
      setTimeout(()=>sweep('sine',200,800,0.8,0.15),200);
      setTimeout(()=>noise(0.3,0.1,600,1),300);
    },

    // Shockwave ring
    shockwave(){
      sweep('sine',180,40,0.25,0.08);
    },

    // Meltdown warning
    meltdownWarn(){
      osc('sawtooth',80,0.3,0.2);
      setTimeout(()=>osc('sawtooth',90,0.3,0.2),160);
      setTimeout(()=>osc('sawtooth',100,0.3,0.2),320);
    },

    // Singularity (low rumble + rising whine)
    singularity(){
      sweep('sawtooth',40,20,2.2,0.25);
      setTimeout(()=>sweep('sine',60,400,1.8,0.12),400);
      setTimeout(()=>noise(2.0,0.15,60,3),200);
    },

    // Supernova BOOM
    supernova(){
      noise(0.5,0.4,80,1);
      sweep('sawtooth',60,20,1.0,0.3);
      setTimeout(()=>noise(0.4,0.25,150,2),80);
      setTimeout(()=>sweep('sine',400,100,0.6,0.15),100);
    },

    // Black hole
    blackHole(){
      sweep('sawtooth',80,20,2.5,0.28);
      setTimeout(()=>sweep('sine',200,30,2.0,0.12),200);
    },

    // Infinite circle spawn
    infiniteSpawn(){
      sweep('sine',40,800,3.0,0.2);
      setTimeout(()=>chord([55,73,110],'sawtooth',2.0,0.12),500);
      setTimeout(()=>noise(0.5,0.08,100,2),1000);
    },

    // Infinite phase up
    infinitePhase(){
      sweep('sawtooth',100,300,0.5,0.18);
      setTimeout(()=>osc('square',60,0.4,0.15),200);
    },

    // Separation bar filling (subtle hum)
    sepPulse(pct){
      if(Math.random()>0.3)return;
      osc('sine',100+pct*3,0.05,0.04);
    },

    // Infinite defeated — epic victory
    infiniteDefeat(){
      const melody=[261,329,392,523,659,784,1047,1319];
      melody.forEach((f,i)=>setTimeout(()=>osc('sine',f,0.8,0.22),i*110));
      setTimeout(()=>sweep('sine',200,1600,2.0,0.18),400);
      setTimeout(()=>chord([261,329,392,523],'sine',1.5,0.14),600);
      setTimeout(()=>noise(0.6,0.1,1000,1),500);
    },

    // Enemy killed (Mars)
    enemyKill(){
      sweep('square',400,100,0.12,0.14);
      noise(0.06,0.06,500,6);
    },

    // Laser fire (Mars fusion)
    laser(){
      sweep('sawtooth',1200,200,0.18,0.22);
      setTimeout(()=>sweep('sine',800,150,0.15,0.12),30);
    },

    // Mission complete
    missionComplete(){
      const notes=[523,659,784,1047];
      notes.forEach((f,i)=>setTimeout(()=>osc('sine',f,0.5,0.2),i*100));
    },

    // UI tab click
    tab(){
      osc('sine',440,0.06,0.08);
    },

    // Upgrade purchased
    upgrade(){
      chord([523,659,784],'sine',0.25,0.15);
    },

    // Combo
    combo(n){
      osc('sine',440+n*60,0.12,0.1,0);
      setTimeout(()=>osc('sine',550+n*60,0.1,0.12),60);
    },

    // ── ORB FIGHT SOUNDS ──

    // Orb fires a projectile (short pew)
    orbShoot(){
      sweep('square',800,200,0.08,0.07);
      noise(0.04,0.04,400,8);
    },

    // Boss orb fires (deeper, heavier pew)
    bossShoot(){
      sweep('sawtooth',300,80,0.12,0.12);
      noise(0.06,0.06,200,4);
      setTimeout(()=>sweep('sine',600,100,0.1,0.06),20);
    },

    // Infinite orb fires (massive deep thud + crackle)
    infiniteShoot(){
      sweep('sawtooth',150,40,0.18,0.18);
      noise(0.08,0.12,100,2);
      setTimeout(()=>sweep('sine',1200,80,0.15,0.08),10);
      setTimeout(()=>noise(0.06,0.08,600,6),30);
    },

    // Projectile hits an orb (sharp crack)
    orbHit(){
      noise(0.05,0.14,1200,10);
      sweep('sine',900,200,0.06,0.06);
    },

    // Orb destroyed explosion
    orbExplode(){
      noise(0.12,0.22,300,3);
      sweep('sawtooth',400,60,0.2,0.16);
      setTimeout(()=>noise(0.08,0.14,150,5),40);
      setTimeout(()=>sweep('sine',200,50,0.15,0.08),60);
    },

    // Boss orb destroyed (big boom)
    bossExplode(){
      noise(0.18,0.3,200,2);
      sweep('sawtooth',300,40,0.35,0.22);
      setTimeout(()=>noise(0.14,0.2,100,3),50);
      setTimeout(()=>sweep('sine',600,30,0.3,0.14),80);
      setTimeout(()=>noise(0.1,0.12,80,4),150);
    },

    // Missile launch (whoosh)
    missileLaunch(){
      sweep('sawtooth',200,600,0.15,0.1);
      noise(0.12,0.08,300,6);
      setTimeout(()=>sweep('sine',600,200,0.25,0.06),50);
    },

    // Missile explosion (large thud + rumble)
    missileExplode(){
      noise(0.15,0.28,150,2);
      sweep('sine',500,30,0.4,0.22);
      setTimeout(()=>noise(0.12,0.2,100,3),30);
      setTimeout(()=>sweep('sawtooth',200,20,0.35,0.16),60);
      setTimeout(()=>noise(0.08,0.1,60,5),120);
      setTimeout(()=>sweep('sine',80,20,0.3,0.08),200);
    },

    // Energy cannon charging (building whine)
    cannonCharge(){
      sweep('sawtooth',200,1800,1.2,0.1);
      setTimeout(()=>sweep('sine',300,2200,1.0,0.08),100);
      setTimeout(()=>noise(0.06,0.06,1000,8),200);
    },

    // Energy cannon fires (massive crack + boom)
    cannonFire(){
      noise(0.08,0.3,80,2);
      sweep('sawtooth',1200,80,0.5,0.25);
      setTimeout(()=>sweep('sine',800,30,0.45,0.2),20);
      setTimeout(()=>noise(0.1,0.22,120,3),40);
      setTimeout(()=>sweep('sine',300,20,0.4,0.14),80);
      setTimeout(()=>noise(0.08,0.14,200,4),150);
    },

    // Annihilation laser charge (deep ominous build)
    laserCharge(){
      sweep('sawtooth',60,400,2.0,0.12);
      setTimeout(()=>sweep('sine',80,600,1.8,0.1),100);
      setTimeout(()=>noise(0.05,0.08,1500,10),300);
      setTimeout(()=>sweep('sawtooth',200,1200,1.2,0.08),600);
    },

    // Annihilation laser fires (earth-shaking beam)
    laserFire(){
      // Deep rumble
      sweep('sawtooth',30,80,3.0,0.25);
      // Mid crackle
      setTimeout(()=>noise(0.1,0.2,2500,6),0);
      // High crackling
      setTimeout(()=>sweep('sine',1500,400,2.8,0.12),20);
      setTimeout(()=>noise(0.08,0.15,2000,12),100);
      // Extra crackle burst
      setTimeout(()=>noise(0.06,0.12,1500,8),400);
      setTimeout(()=>sweep('sawtooth',200,60,2.0,0.1),600);
    },

    // Mothership portal opening (otherworldly hum)
    portalOpen(){
      sweep('sine',40,200,1.2,0.15);
      setTimeout(()=>sweep('sawtooth',60,300,1.0,0.1),100);
      setTimeout(()=>chord([55,73,110],'sine',1.5,0.08),200);
      setTimeout(()=>noise(0.06,0.1,800,12),400);
    },

    // Mothership arrives (massive impact)
    mothershipArrive(){
      noise(0.05,0.4,60,1);
      sweep('sawtooth',500,20,0.8,0.35);
      setTimeout(()=>sweep('sine',800,30,0.7,0.25),20);
      setTimeout(()=>noise(0.1,0.3,100,2),40);
      setTimeout(()=>sweep('sawtooth',300,15,0.6,0.2),80);
      setTimeout(()=>noise(0.08,0.2,200,3),150);
      setTimeout(()=>sweep('sine',200,20,0.5,0.12),250);
    },

    // Mothership hull hit (metallic clang + deep thud)
    mothershipHit(){
      noise(0.04,0.16,80,14);
      sweep('sine',600,150,0.12,0.1);
      setTimeout(()=>noise(0.06,0.1,120,6),20);
      setTimeout(()=>sweep('sawtooth',300,60,0.1,0.06),40);
    },

    // Mothership destroyed (cataclysmic)
    mothershipDestroy(){
      noise(0.05,0.4,50,1);
      sweep('sawtooth',600,20,1.5,0.35);
      setTimeout(()=>noise(0.08,0.35,100,2),30);
      setTimeout(()=>sweep('sine',1000,25,1.3,0.28),50);
      setTimeout(()=>noise(0.1,0.28,150,3),100);
      setTimeout(()=>sweep('sawtooth',400,15,1.2,0.22),150);
      setTimeout(()=>noise(0.08,0.22,200,4),250);
      setTimeout(()=>sweep('sine',300,10,1.0,0.16),350);
      setTimeout(()=>noise(0.06,0.18,300,5),500);
      setTimeout(()=>sweep('sawtooth',150,8,0.8,0.1),700);
    },
  };
})();

export default SFX;
