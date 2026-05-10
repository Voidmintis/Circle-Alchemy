// ══════════════════════════════════════════
// STARS
// ══════════════════════════════════════════
export function initStars(){
  const s=document.getElementById('stars');
  for(let i=0;i<130;i++){
    const d=document.createElement('div');d.className='star';
    const sz=Math.random()*2+.4;
    const left=Math.random()*100,top=Math.random()*100;
    const pullX=((50-left)/100*60).toFixed(1),pullY=((50-top)/100*60).toFixed(1);
    d.style.cssText=`width:${sz}px;height:${sz}px;top:${top}%;left:${left}%;--d:${(Math.random()*4+2).toFixed(1)}s;--delay:${(Math.random()*5).toFixed(1)}s;--a1:${(Math.random()*.15).toFixed(2)};--a2:${(Math.random()*.7+.2).toFixed(2)};--pull-x:${pullX}vw;--pull-y:${pullY}vh`;
    s.appendChild(d);
  }
}
