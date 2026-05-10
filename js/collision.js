// ══════════════════════════════════════════
// COLLISIONS + MAGNETIC ATTRACTION
// ══════════════════════════════════════════
import { state } from './state.js';
import { els } from './dom.js';
import { getCenter, isTouching, cW, cH, setStatus, setPips, modeHint, toast } from './utils.js';
import { spawnParticles } from './canvas.js';
import { startFusionCharge, cancelFusionCharge, triggerFusion } from './fusion.js';
import SFX from './sfx.js';

// ── Beam / Energy helpers (used by scifi mode collision check) ──
export function updateBeams(rb,bg,rg){
  const cr=getCenter(els.red),cb=getCenter(els.blue),cg=getCenter(els.green);
  function setB(line,c1,c2,active,col){
    if(active){line.setAttribute('x1',c1.x);line.setAttribute('y1',c1.y);line.setAttribute('x2',c2.x);line.setAttribute('y2',c2.y);line.setAttribute('stroke',col);line.style.opacity='.9';}
    else line.style.opacity='0';
  }
  setB(els.beamRB,cr,cb,rb,'#ff88aa');setB(els.beamRG,cr,cg,rg,'#88ffaa');setB(els.beamBG,cb,cg,bg,'#88aaff');
  els.beamSvg.classList.toggle('show',rb||bg||rg);
}

export function updateEnergy(rb,bg,rg){
  const pct=(rb?33:0)+(bg?33:0)+(rg?34:0);
  els.energyFill.style.width=pct+'%';els.energyVal.textContent=pct+'%';
}

export function handlePairDiscovery(rb,bg,rg){
  if(rb&&!state.discoveredPairs.purple){state.discoveredPairs.purple=true;toast('🔴+🔵 → MYSTIC PURPLE!','#cc44ff');spawnParticles(getCenter(els.red).x,getCenter(els.red).y,'#cc44ff',20);spawnParticles(getCenter(els.blue).x,getCenter(els.blue).y,'#cc44ff',20);}
  if(rg&&!state.discoveredPairs.yellow){state.discoveredPairs.yellow=true;toast('🔴+🟢 → SOLAR YELLOW!','#ffee44');spawnParticles(getCenter(els.red).x,getCenter(els.red).y,'#ffee44',20);spawnParticles(getCenter(els.green).x,getCenter(els.green).y,'#ffee44',20);}
  if(bg&&!state.discoveredPairs.cyan){state.discoveredPairs.cyan=true;toast('🔵+🟢 → STORM CYAN!','#44eeff');spawnParticles(getCenter(els.blue).x,getCenter(els.blue).y,'#44eeff',20);spawnParticles(getCenter(els.green).x,getCenter(els.green).y,'#44eeff',20);}
}

export function isBlackHoleTrigger(){
  const cx=cW()/2,cy=cH()/2;
  return[els.red,els.blue,els.green].every(e=>{const c=getCenter(e);return Math.hypot(c.x-cx,c.y-cy)<52;});
}

export function isNear(a,b,extraPx=60){
  const ca=getCenter(a),cb=getCenter(b);
  return Math.hypot(ca.x-cb.x,ca.y-cb.y)<ca.rad+cb.rad+extraPx;
}

export function checkCollisions(){
  if(state.merged||state.blackHoleActive)return;
  // Skip if circles are hidden (adventure map, orbfight overlay, etc.)
  if(els.red.classList.contains('hidden'))return;
  const rb=isTouching(els.red,els.blue),bg=isTouching(els.blue,els.green),rg=isTouching(els.red,els.green);
  const all=rb&&bg&&rg;
  setPips(rb,bg,rg);
  if(state.mode==='scifi'){updateEnergy(rb,bg,rg);updateBeams(rb,bg,rg);}
  if(state.mode==='discovery'&&!all)handlePairDiscovery(rb,bg,rg);

  // Magnetic glow when near
  const pairs=[[els.red,els.blue],[els.blue,els.green],[els.red,els.green]];
  pairs.forEach(([a,b])=>{
    const near=isNear(a,b,55);
    a.classList.toggle('magnetic',near);
    b.classList.toggle('magnetic',near);
  });

  if(all){
    // Fusion/gravity/scifi get a charge meter — other modes fire instantly
    if(state.mode==='fusion'||state.mode==='gravity'||state.mode==='scifi'){
      if(state.mode==='scifi'&&state._scifiPhase&&state._scifiPhase()!=='idle')return; // don't re-trigger mid-sequence
      if(!state.fusionCharging) SFX.touch();
      startFusionCharge();
    } else {
      cancelFusionCharge();
      triggerFusion();
    }
  } else {
    cancelFusionCharge();
    [els.red,els.blue,els.green].forEach(e=>e.classList.remove('magnetic'));
    const n=(rb?1:0)+(bg?1:0)+(rg?1:0);
    if(n===0)setStatus(modeHint());
    else if(n===1)setStatus('ONE LINK — KEEP GOING');
    else setStatus('TWO LINKS — ALMOST THERE!');
  }
}
