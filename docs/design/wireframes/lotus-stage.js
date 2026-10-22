import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const VALUES=['sathya','dharma','shanti','prema','ahimsa'];
const lerp=(a,b,t)=>a+(b-a)*t;
const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const smooth=t=>t*t*(3-2*t);

const REST=0.30,BEND=0.20;
const easeIO=t=>t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;
// row table from the model spec: start, span .5, closed→open rot.x, closed scale
const ROWS={
  outer:{start:0,closed:-0.01,open:1.14,size:0.94},
  mid:{start:0.15,closed:-0.02,open:1.05,size:0.72},
  inner:{start:0.34,closed:-0.06,open:0.86,size:0.60},
  heart:{start:0.50,closed:-0.10,open:0.78,size:0.54}
};
const rowT=(row,b)=>easeIO(clamp((b-row.start)/0.5,0,1));
const rowX=(row,t)=>row.closed+(row.open-row.closed)*t;
const rowS=(row,t)=>lerp(row.size,1,t);
const rowW=t=>lerp(0.78,1,t);

const state={bloom:REST,bend:BEND,exposure:0,focus:-1,shift:0,spin:0};
const shown={bloom:REST,exposure:0,focus:-1,shift:0,spin:0};
// ease-serene, matching the page's --ease-serene, for the act→petal camera move
const SERENE=[.22,.61,.36,1],FOCUS_DUR=1250;
function bezier(x,[p1x,p1y,p2x,p2y]){
  const cx=3*p1x,bx=3*(p2x-p1x)-cx,ax=1-cx-bx;
  const cy=3*p1y,by=3*(p2y-p1y)-cy,ay=1-cy-by;
  let t=x;
  for(let i=0;i<8;i++){const fx=((ax*t+bx)*t+cx)*t-x,d=(3*ax*t+2*bx)*t+cx;if(Math.abs(fx)<1e-5||!d)break;t-=fx/d}
  return ((ay*t+by)*t+cy)*t;
}
let fTween={from:-1,to:-1,t0:0},sTween={from:0,to:0,t0:0};
const tw=t=>t.from+(t.to-t.from)*bezier(clamp((performance.now()-t.t0)/FOCUS_DUR,0,1),SERENE);
// per-value camera offsets so each petal zoom reads as its own frame despite 5-fold symmetry
const V_RAD=[2.32,2.44,2.22,2.40,2.26],V_AZ=[0,.07,-.06,.05,-.08];
const TOP=Math.PI/2;
let azPrev=0;
const unwrap=(target,prev)=>{const d=((target-prev+Math.PI)%(Math.PI*2)+Math.PI*2)%(Math.PI*2)-Math.PI;return prev+d};
const pick=(arr,f)=>{const i=clamp(Math.floor(f),0,4),j=clamp(i+1,0,4);return lerp(arr[i],arr[j],clamp(f-i,0,1))};
let renderer,scene,camera,dirLight,ambient,coreLight,rimLight,fillLight,root,petals=[],glowMats=[],ready=false;
const camUp=new THREE.Vector3(0,0,1);
const camPos=new THREE.Vector3(),camTgt=new THREE.Vector3(),pA=new THREE.Vector3(),tA=new THREE.Vector3(),pB=new THREE.Vector3(),tB=new THREE.Vector3();
let shownFov=42;
// orbit a target point: azimuth, pitch (0 = level with target, PI/2 = straight overhead)
function orbit(out,tgt,az,pitch,r){
  const cp=Math.cos(pitch);
  out.set(tgt.x+Math.sin(az)*cp*r,tgt.y+Math.sin(pitch)*r,tgt.z+Math.cos(az)*cp*r);
}

function makeSets(model){
  const up=new THREE.Vector3(0,1,0);
  const add=(name,row,valueIndex)=>{
    const o=model.getObjectByName(name);if(!o)return;
    const base=o.quaternion.clone();
    const tip=up.clone().applyQuaternion(base);
    // tilt axis comes from where the petal sits in the ring, not from its tip:
    // near-vertical petals give a degenerate tip×up cross product
    const radial=new THREE.Vector3(o.position.x,0,o.position.z);
    if(radial.lengthSq()<1e-8)radial.copy(new THREE.Vector3(tip.x,0,tip.z));
    if(radial.lengthSq()<1e-8)radial.set(1,0,0);
    radial.normalize();
    const axis=new THREE.Vector3().crossVectors(up,radial).normalize();
    const tilt=Math.atan2(new THREE.Vector3(tip.x,0,tip.z).dot(radial),tip.y);
    petals.push({o,base,axis,tilt,row,valueIndex,q:new THREE.Quaternion()});
  };
  VALUES.forEach((v,i)=>add('petal_pivot_'+v,ROWS.outer,i));
  for(let i=0;i<9;i++)add('petal_pivot_mid_'+i,ROWS.mid,-1);
  for(let i=0;i<12;i++)add('petal_pivot_inner_'+i,ROWS.inner,-1);
  for(let i=0;i<10;i++)add('petal_pivot_heart_'+i,ROWS.heart,-1);
  // calibrate against the pose the GLB was baked at, per row, so lean and jitter survive
  const byRow=new Map();
  for(const p of petals){const a=byRow.get(p.row)||[];a.push(p);byRow.set(p.row,a)}
  byRow.forEach((list,row)=>{
    const avg=list.reduce((s,p)=>s+p.tilt,0)/list.length;
    const t0=clamp((avg-row.closed)/(row.open-row.closed),0,1);
    row.t0=t0;
    for(const p of list)p.lean=p.tilt-rowX(row,t0);
  });
}

export async function init(canvas,url){
  renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,preserveDrawingBuffer:true});
  renderer.setPixelRatio(Math.min(2,window.devicePixelRatio||1));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=.92;
  renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
  scene=new THREE.Scene();
  camera=new THREE.PerspectiveCamera(38,1,.1,60);
  ambient=new THREE.HemisphereLight(0xdfe9ff,0x3a3340,0);scene.add(ambient);
  dirLight=new THREE.DirectionalLight(0xfff3dc,0);
  dirLight.position.set(3.1,3.6,1.7);dirLight.castShadow=true;
  dirLight.shadow.mapSize.set(1024,1024);
  const c=dirLight.shadow.camera;c.left=-3;c.right=3;c.top=3;c.bottom=-3;c.near=.5;c.far=12;
  dirLight.shadow.bias=-0.0016;scene.add(dirLight);
  const rim=new THREE.DirectionalLight(0xbcd4ff,0);rim.position.set(-3,1.6,-2.5);scene.add(rim);rimLight=rim;
  fillLight=new THREE.DirectionalLight(0xffe9d2,0);fillLight.position.set(-1.4,1.1,3.2);scene.add(fillLight);
  coreLight=new THREE.PointLight(0xffd79a,0,4,2);coreLight.position.set(0,.62,0);scene.add(coreLight);

  const gltf=await new GLTFLoader().loadAsync(url);
  root=gltf.scene;
  root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;
    if(/gold/.test(o.material.name||'')){o.material=o.material.clone();o.material.emissive=new THREE.Color(0xffc46b);o.material.emissiveIntensity=0;glowMats.push(o.material);}
    else{o.material=o.material.clone();o.material.emissive=new THREE.Color(0xff9ec2);o.material.emissiveIntensity=0;}
  }});
  scene.add(root);
  makeSets(root);
  ready=true;
  resize();window.addEventListener('resize',resize);
  renderer.setAnimationLoop(frame);
  return true;
}

function resize(){
  if(!renderer)return;
  const w=window.innerWidth,h=window.innerHeight;
  renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
}

export function set(next){
  if(next.focus!==undefined&&Math.abs(next.focus-state.focus)>.01){
    let to=next.focus;
    // non-adjacent jumps (rail clicks) take the shortest way round the ring
    if(shown.focus>=0&&to>=0&&Math.abs(to-shown.focus)>1.2){
      const d=((to-shown.focus+2.5)%5+5)%5-2.5;to=shown.focus+d;
    }
    fTween={from:shown.focus,to,t0:performance.now()};
  }
  if(next.shift!==undefined&&Math.abs(next.shift-state.shift)>.005){
    sTween={from:shown.shift,to:next.shift,t0:performance.now()};
  }
  Object.assign(state,next);
}
// screen-space position + apparent size of the flower's heart, so the page can
// pin a 2D emblem over the middle of the model
export const heart={x:0,y:0,size:0};
const hp=new THREE.Vector3();
export function getBloom(){return shown.bloom}
export function setBend(v){state.bend=v}
export function isReady(){return ready}

function frame(){
  const k=.12;
  shown.bloom=lerp(shown.bloom,state.bloom,k);
  shown.spin=lerp(shown.spin,state.spin,k);
  shown.exposure=lerp(shown.exposure,state.exposure,k);
  shown.shift=tw(sTween);
  shown.focus=tw(fTween);

  const b=shown.bloom,e=shown.exposure;
  for(const p of petals){
    const t=rowT(p.row,b);
    let boost=0;
    const target=rowX(p.row,t)+p.lean+boost;
    p.q.setFromAxisAngle(p.axis,target-p.tilt);
    p.o.quaternion.copy(p.q).multiply(p.base);
  }

  ambient.intensity=lerp(0,.52,e);
  ambient.color.setHSL(lerp(.62,.11,e),lerp(.35,.30,e),lerp(.42,.80,e));
  dirLight.intensity=lerp(0,1.45,e);
  dirLight.color.setHSL(lerp(.6,.1,e),lerp(.3,.32,e),lerp(.6,.74,e));
  rimLight.intensity=lerp(0,.5,e);
  fillLight.intensity=lerp(0,.34,e);
  coreLight.intensity=lerp(0,4.6,smooth(clamp((b-.25)/.75,0,1)))*lerp(0,1,Math.min(1,e*2.2));
  const glow=smooth(clamp((b-.35)/.65,0,1));
  for(const m of glowMats)m.emissiveIntensity=glow*.42*Math.min(1,e*2.2);

  // --- camera ---
  // Act I: a low three-quarter view climbs to look down into the opening bloom.
  const bs=smooth(clamp((b-REST)/(1-REST),0,1));
  const azA=lerp(-.22+shown.spin*.6,0,bs);
  tA.set(0,lerp(.40,.66,bs),0);
  orbit(pA,tA,azA,lerp(.10,1.03,bs),lerp(6.9,3.55,bs));
  // Petal acts: hold a plan view straight overhead, rolling so the focused petal
  // points to the top of frame; the whole bloom stays legible.
  const f=shown.focus<0?0:shown.focus;
  const a2=clamp(shown.focus+1,0,1);
  const fm=((f%5)+5)%5;
  const azB=azPrev=unwrap(fm*(Math.PI*2/5)+pick(V_AZ,fm),azPrev);
  tB.set(Math.sin(azB)*.58,.55,Math.cos(azB)*.58);
  orbit(pB,tB,azB,TOP,pick(V_RAD,fm));
  camPos.copy(pA).lerp(pB,a2);
  camTgt.copy(tA).lerp(tB,a2);
  // straight down, rolled 90° from the petal axis
  camUp.set(-Math.cos(azB)*a2,1-a2,Math.sin(azB)*a2);
  if(camUp.lengthSq()<1e-6)camUp.set(0,1,0);
  camera.up.copy(camUp.normalize());
  const fov=lerp(42,36,a2);
  if(Math.abs(fov-shownFov)>.01){shownFov=fov;camera.fov=fov;camera.updateProjectionMatrix()}
  camera.position.copy(camPos);
  camera.lookAt(camTgt);
  camera.translateX(shown.shift);
  renderer.render(scene,camera);

  const w=window.innerWidth,h=window.innerHeight;
  hp.set(0,.62,0);
  const dist=camera.position.distanceTo(hp);
  hp.project(camera);
  heart.x=(hp.x*.5+.5)*w;
  heart.y=(-hp.y*.5+.5)*h;
  heart.size=.95*(h/(2*Math.tan(camera.fov*Math.PI/360)*Math.max(.001,dist)));
}
