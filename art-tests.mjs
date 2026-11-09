import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {LEVELS,newRun} from './core.mjs';
const require=createRequire(import.meta.url),T=require('./vendor/three.min.js');
globalThis.window={THREE:T,devicePixelRatio:1};
const canvasContext=new Proxy({}, {get:(_,key)=>key==='createRadialGradient'?()=>({addColorStop(){}}):()=>{}});
globalThis.document={createElement:()=>({getContext:()=>canvasContext})};
const {RelayArt}=await import('./art.mjs');
const sizes=[[320,568],[390,844],[568,320],[844,390]];
let viewport={width:390,height:700};
const view=Object.assign(Object.create(RelayArt.prototype),{
 available:true,canvas:{getBoundingClientRect:()=>viewport},level:-1,elapsed:0,fx:[],
 scene:new T.Scene(),camera:new T.PerspectiveCamera(35,1,.1,140),
 renderer:{render(){},setSize(){},setPixelRatio(){}},dummy:new T.Object3D(),
 fxPool:{count:0,instanceMatrix:{}}
});
view.makeShadow();
let poses=0,openGates=0;
for(let level=0;level<LEVELS.length;level++){
 const r=newRun(level),course=LEVELS[level];r.mode='ride';
 for(const [width,height] of sizes){
  const landscape=width>height;viewport={width:landscape?width-165:width,height:height-(landscape?62:143)};
  view.resize();
  for(const distance of [0,18,46,77,100]){
   r.dist=[distance,100-distance];r.active=distance===100?1:0;
   view.render(r,1/60,'standard',false);view.scene.updateMatrixWorld(true);view.camera.updateMatrixWorld(true);
   for(const bot of view.robots){
    const bounds=new T.Box3().setFromObject(bot.body,true);
    assert.ok(bounds.min.y>=.859,'hover fins stay above the bridge deck');
    for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
     const p=new T.Vector3(x,y,z).project(view.camera);
     assert.ok(Math.abs(p.x)<1&&Math.abs(p.y)<1,'both bot models remain inside the camera');
    }
    poses++;
   }
  }
 }
 for(let lane=0;lane<2;lane++)for(let j=0;j<course.gates[lane].length;j++){
  r.dist=[0,0];r.dist[lane]=course.gates[lane][j]-.04;r.active=lane;
  r.t=(course.period-course.offsets[lane][j]+course.open*.4)%course.period;
  view.render(r,0,'standard',false);view.scene.updateMatrixWorld(true);
  const gate=view.gates[lane][j],bot=new T.Box3().setFromObject(view.robots[lane].body);
  const left=new T.Box3().setFromObject(gate.arms[0]),right=new T.Box3().setFromObject(gate.arms[1]);
  assert.ok(left.max.x<bot.min.x&&right.min.x>bot.max.x,'raised arms clear both sides of the real robot mesh');
  openGates++;
 }
}
console.log('PASS',poses,'real robot framing/bridge poses and',openGates,'open gate clearances');
