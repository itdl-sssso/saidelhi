// Sky layer: a twinkling starfield over the night, which gives way to drifting
// pink petals once the lotus has opened. Driven by the page via Skyfield.set().
(function(){
const cv=document.getElementById('starfield');if(!cv)return;
const ctx=cv.getContext('2d');
const reduce=window.matchMedia('(prefers-reduced-motion:reduce)').matches;
const rnd=(a,b)=>a+Math.random()*(b-a);
let w=0,h=0,dpr=1,stars=[],petals=[],raf;
const s={dawn:0,petals:0};
const shown={dawn:0,petals:0};

function build(){
 dpr=Math.min(2,window.devicePixelRatio||1);
 w=window.innerWidth;h=window.innerHeight;
 cv.width=Math.round(w*dpr);cv.height=Math.round(h*dpr);
 ctx.setTransform(dpr,0,0,dpr,0,0);
 stars=[];petals=[];
 const ns=Math.round(Math.min(300,w*h/4200));
 for(let i=0;i<ns;i++){
  const near=Math.random()<.16;
  stars.push({x:rnd(0,w),y:rnd(0,h),r:near?rnd(1.1,1.8):rnd(.35,1),
   a:rnd(.3,.95),sp:rnd(.35,1.5),ph:rnd(0,Math.PI*2),
   dx:rnd(-.006,.006),dy:rnd(.002,.012),
   hue:Math.random()<.22?rnd(24,44):rnd(200,224)});
 }
 const np=Math.round(Math.min(90,w*h/14000));
 for(let i=0;i<np;i++)petals.push(newPetal(rnd(-h*.2,h)));
}
function newPetal(y){
 return {x:rnd(0,w),y,L:rnd(5,11),a:rnd(.35,.85),
  vy:rnd(.16,.42),sway:rnd(.25,.75),swaySp:rnd(.0006,.0016),ph:rnd(0,6.28),
  rot:rnd(0,6.28),rotSp:rnd(-.006,.006),
  hue:rnd(340,358),sat:rnd(38,64),lig:rnd(78,90)};
}
function petalPath(g,L){
 const W=L*.62;
 g.beginPath();g.moveTo(0,-L);
 g.bezierCurveTo(W,-L*.45,W*.72,L*.5,0,L);
 g.bezierCurveTo(-W*.72,L*.5,-W,-L*.45,0,-L);
 g.closePath();
}
function draw(t){
 shown.dawn+=(s.dawn-shown.dawn)*.08;
 shown.petals+=(s.petals-shown.petals)*.08;
 const sa=Math.max(0,1-shown.dawn),pa=shown.petals;
 ctx.clearRect(0,0,w,h);
 if(sa>.004){
  for(const p of stars){
   if(!reduce){p.x+=p.dx;p.y+=p.dy;if(p.y>h+2){p.y=-2;p.x=rnd(0,w)}if(p.x<-2)p.x=w+2;if(p.x>w+2)p.x=-2}
   const tw=reduce?1:.62+.38*Math.sin(t*.001*p.sp+p.ph);
   const a=p.a*tw*sa;
   ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,6.2832);
   ctx.fillStyle='hsla('+p.hue.toFixed(0)+',70%,'+(p.hue<60?84:92)+'%,'+a.toFixed(3)+')';ctx.fill();
   if(p.r>1){ctx.beginPath();ctx.arc(p.x,p.y,p.r*3.4,0,6.2832);
    ctx.fillStyle='hsla('+p.hue.toFixed(0)+',70%,88%,'+(a*.09).toFixed(3)+')';ctx.fill()}
  }
 }
 if(pa>.004){
  for(const p of petals){
   if(!reduce){
    p.y+=p.vy;p.x+=Math.sin(t*p.swaySp+p.ph)*p.sway;p.rot+=p.rotSp;
    if(p.y>h+16)Object.assign(p,newPetal(-16));
   }
   ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.rot);
   const sq=reduce?1:.55+.45*Math.abs(Math.cos(p.rot*.9));
   ctx.scale(sq,1);
   petalPath(ctx,p.L);
   ctx.fillStyle='hsla('+p.hue.toFixed(0)+','+p.sat.toFixed(0)+'%,'+p.lig.toFixed(0)+'%,'+(p.a*pa).toFixed(3)+')';
   ctx.fill();
   ctx.restore();
  }
 }
 raf=requestAnimationFrame(draw);
}
window.Skyfield={set(n){Object.assign(s,n)}};
build();window.addEventListener('resize',build);
if(reduce){shown.dawn=s.dawn;shown.petals=s.petals;draw(0);cancelAnimationFrame(raf)}
else raf=requestAnimationFrame(draw);
})();
