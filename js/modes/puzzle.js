import { R, state, modeActions } from '../state.js';
import { els, area } from '../dom.js';
import { cW, cH, setStatus, hideGold, resetPositions, modeHint, toast } from '../utils.js';

// ══════════════════════════════════════════
// TIMER
// ══════════════════════════════════════════
export function startTimer(){
  state.timeLeft=30;els.timerVal.textContent=state.timeLeft;els.timerVal.classList.remove('urgent');
  els.timerDisplay.classList.add('show');
  state.timerInterval=setInterval(()=>{
    state.timeLeft--;els.timerVal.textContent=state.timeLeft;
    if(state.timeLeft<=10)els.timerVal.classList.add('urgent');
    if(state.timeLeft<=0){stopTimer();if(!state.merged){setStatus("⏰ TIME'S UP — TRY AGAIN",'danger');els.restartBtn.classList.add('show');}}
  },1000);
}
export function stopTimer(){clearInterval(state.timerInterval);state.timerInterval=null;}

// ══════════════════════════════════════════
// PUZZLE WALLS
// ══════════════════════════════════════════
export function clearWalls(){document.querySelectorAll('.wall,.mover').forEach(e=>e.remove());clearInterval(state.moverInterval);}
export function buildWalls(lvl){
  clearWalls();const W=cW(),H=cH();if(lvl===1)return;
  if(lvl===2){addWall(W*.28,H*.12,16,H*.48);addWall(W*.54,H*.38,16,H*.48);addWall(W*.1,H*.52,W*.38,16);}
  if(lvl===3){
    addWall(W*.18,H*.08,16,H*.38);addWall(W*.62,H*.08,16,H*.38);addWall(W*.18,H*.58,W*.55,16);
    const m=document.createElement('div');m.className='mover';
    m.style.cssText=`width:78px;height:78px;left:${W*.41}px;top:${H*.28}px;border-radius:50%`;
    m.innerHTML='<span>⚡</span>';area.appendChild(m);
    let mv=0;state.moverDir=1;
    state.moverInterval=setInterval(()=>{mv+=2*state.moverDir;if(mv>100||mv<0)state.moverDir*=-1;m.style.left=(W*.41+mv)+'px';},16);
  }
  if(lvl===4){addWall(W*.22,0,16,H*.42);addWall(W*.48,H*.28,16,H*.5);addWall(W*.72,0,16,H*.52);addWall(0,H*.48,W*.28,16);startTimer();}
}
export function addWall(x,y,w,h){const d=document.createElement('div');d.className='wall';d.style.cssText=`left:${x}px;top:${y}px;width:${w}px;height:${h}px`;area.appendChild(d);}
export function nextPuzzleLevel(){
  if(state.puzzleLevel>=4)return;state.puzzleLevel++;
  state.merged=false;hideGold();els.restartBtn.classList.remove('show');els.gold.onclick=null;
  resetPositions();buildWalls(state.puzzleLevel);
  els.levelBadge.textContent=`LEVEL ${state.puzzleLevel}`;setStatus(modeHint());
  toast(`⬆ LEVEL ${state.puzzleLevel} — ${['','OPEN','MAZE','MOVING','TIMED'][state.puzzleLevel]} MODE`,'var(--gold)');
}

export function applyWallCollision(nx,ny){
  const ar=area.getBoundingClientRect();
  document.querySelectorAll('.wall,.mover').forEach(w=>{
    const wr=w.getBoundingClientRect();
    const wx=wr.left-ar.left,wy=wr.top-ar.top,ww=wr.width,wh=wr.height;
    const cx2=nx+R,cy2=ny+R;
    if(cx2+R>wx&&cx2-R<wx+ww&&cy2+R>wy&&cy2-R<wy+wh){
      const oL=cx2+R-wx,oR=wx+ww-(cx2-R),oT=cy2+R-wy,oB=wy+wh-(cy2-R);
      const mH=Math.min(oL,oR),mV=Math.min(oT,oB);
      if(mH<mV)nx-=(oL<oR?oL:-oR);else ny-=(oT<oB?oT:-oB);
    }
  });
  return[nx,ny];
}

modeActions.stopTimer = stopTimer;
modeActions.nextPuzzleLevel = nextPuzzleLevel;
modeActions.applyWallCollision = applyWallCollision;
