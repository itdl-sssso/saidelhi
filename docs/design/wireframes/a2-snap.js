/* Bezier-eased one-gesture-per-section snapping for the hero (act I + petals).
   Releases to free scrolling once the Ahimsa petal is passed. */
(function(){
if(window.matchMedia('(prefers-reduced-motion:reduce)').matches)return;
const P1=[0,.40,.70,.93],DUR=760,EASE=[.22,.61,.36,1];
function bezier(x,[p1x,p1y,p2x,p2y]){
 const cx=3*p1x,bx=3*(p2x-p1x)-cx,ax=1-cx-bx;
 const cy=3*p1y,by=3*(p2y-p1y)-cy,ay=1-cy-by;
 let t=x;
 for(let i=0;i<8;i++){const fx=((ax*t+bx)*t+cx)*t-x;const d=(3*ax*t+2*bx)*t+cx;if(Math.abs(fx)<1e-5)break;if(!d)break;t-=fx/d}
 return ((ay*t+by)*t+cy)*t;
}
let targets=[],flowTop=Infinity,anim=null;
function measure(){
 const a1=document.getElementById('act1'),vh=window.innerHeight,flow=document.querySelector('.flow');
 if(!a1||!flow)return false;
 const span=Math.max(1,a1.offsetHeight-vh);
 targets=P1.map(p=>Math.round(a1.offsetTop+p*span));
 document.querySelectorAll('.petal-sec').forEach(el=>targets.push(Math.round(el.offsetTop)));
 flowTop=Math.round(flow.offsetTop);
 return targets.length>1;
}
const inRegion=()=>window.scrollY<flowTop-6;
function glide(to){
 to=Math.max(0,Math.min(to,document.documentElement.scrollHeight-window.innerHeight));
 const from=window.scrollY,d=to-from;
 if(Math.abs(d)<2){anim=null;return}
 const t0=performance.now();
 const step=now=>{
  const k=Math.min(1,(now-t0)/DUR);
  window.scrollTo(0,from+d*bezier(k,EASE));
  if(k<1)anim=requestAnimationFrame(step);else anim=null;
 };
 anim=requestAnimationFrame(step);
}
function move(dir){
 if(anim)return;
 if(!measure())return;
 const y=window.scrollY;
 let cur=0,best=Infinity;
 targets.forEach((t,i)=>{const d=Math.abs(t-y);if(d<best){best=d;cur=i}});
 let to;
 if(best>8){
  to=dir>0?targets.find(t=>t>y+8):[...targets].reverse().find(t=>t<y-8);
  if(to===undefined)to=dir>0?flowTop:0;
 }else{
  const n=cur+dir;
  to=n<0?0:n>=targets.length?flowTop:targets[n];
 }
 glide(to);
}
function onWheel(e){
 if(e.ctrlKey)return;
 if(!inRegion())return;
 e.preventDefault();
 if(anim||Math.abs(e.deltaY)<2)return;
 move(e.deltaY>0?1:-1);
}
let ty=0;
function onKey(e){
 if(!inRegion())return;
 const d={ArrowDown:1,PageDown:1,' ':1,ArrowUp:-1,PageUp:-1}[e.key];
 if(!d)return;
 e.preventDefault();move(d);
}
window.addEventListener('wheel',onWheel,{passive:false});
window.addEventListener('touchstart',e=>{ty=e.touches[0].clientY},{passive:true});
window.addEventListener('touchmove',e=>{if(inRegion())e.preventDefault()},{passive:false});
window.addEventListener('touchend',e=>{
 if(!inRegion())return;
 const dy=ty-(e.changedTouches[0]?e.changedTouches[0].clientY:ty);
 if(Math.abs(dy)>28)move(dy>0?1:-1);
},{passive:true});
window.addEventListener('keydown',onKey);
window.addEventListener('resize',()=>{measure()});
setTimeout(measure,400);setTimeout(measure,1500);
})();
