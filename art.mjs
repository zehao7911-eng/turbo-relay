import {LEVELS,gateState,clamp} from './core.mjs';
import {block,sphere,cylinder,sign,merge,dispose,material} from './primitives.mjs';
const RT=window.THREE;
const laneX=[-2.02,2.02];
const deck=.86;
const deckZ=d=>9.4-.188*d;
const relayInk='#23175b', cream='#fff7cf';
const bodyColors=[['#fff123','#ff9d16','#ff4b76'],['#36eeff','#167ce9','#ad4dff']];
const themes=[
 ['#1ec6ef','#a6ec42','#ff527f','#6445e6','#16aaf0'],
 ['#20d4a5','#bafa37','#ff944a','#395adb','#24cbb8'],
 ['#50cfff','#c6ed3b','#ff6ac2','#994fe7','#4aaaf2'],
 ['#398bff','#a3ee60','#ff5a9d','#5c4cff','#20a6ed'],
 ['#16cfea','#e6f13a','#ff7d3d','#9953ed','#14afef'],
 ['#6288ff','#b4f63c','#ff45ab','#7643fd','#35afee']
];
const randomSeed=n=>{const q=Math.sin(n*21.817+21.11)*72813.25;return q-Math.floor(q);};
export class RelayArt {
 constructor(canvas){
  this.canvas=canvas;this.available=false;this.fx=[];this.elapsed=0;this.level=-1;
  try{this.renderer=new RT.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});}
  catch{return;}
  this.available=true;
  this.renderer.outputEncoding=RT.sRGBEncoding;
  this.scene=new RT.Scene();
  this.camera=new RT.PerspectiveCamera(35,1,.1,140);
  this.scene.add(new RT.HemisphereLight(0xecf9ff,0x6953a7,.76));
  const sun=new RT.DirectionalLight(0xfff4de,1.16);sun.position.set(-12,24,13);this.scene.add(sun);
  const fill=new RT.DirectionalLight(0x88e6ff,.25);fill.position.set(8,8,-9);this.scene.add(fill);
  this.dummy=new RT.Object3D();this.fxPool=new RT.InstancedMesh(new RT.OctahedronGeometry(.13),new RT.MeshBasicMaterial({color:'#ffffff'}),84);
  this.fxPool.count=0;this.fxPool.frustumCulled=false;this.scene.add(this.fxPool);
  this.makeShadow();
  this.resize();new ResizeObserver(()=>this.resize()).observe(canvas);
 }
 resize(){
  if(!this.available)return;
  const {width,height}=this.canvas.getBoundingClientRect();
  if(!width||!height)return;
  const aspect=width/height;
  this.camera.aspect=aspect;
  this.camera.fov=Math.max(34,2*Math.atan(5.25/(32*aspect))*180/Math.PI);
  this.camera.updateProjectionMatrix();
  this.renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));
  this.renderer.setSize(width,height,false);
 }
 makeShadow(){
  const tile=document.createElement('canvas');tile.width=tile.height=64;
  const ctx=tile.getContext('2d'),fade=ctx.createRadialGradient(32,32,4,32,32,31);
  fade.addColorStop(0,'rgba(29,20,77,.48)');fade.addColorStop(.48,'rgba(29,20,77,.28)');fade.addColorStop(1,'rgba(29,20,77,0)');
  ctx.fillStyle=fade;ctx.fillRect(0,0,64,64);
  this.shadowMaterial=new RT.MeshBasicMaterial({map:new RT.CanvasTexture(tile),transparent:true,depthWrite:false});
  this.shadowGeometry=new RT.PlaneGeometry(1,1);
 }
 shadow(parent,x,y,z,w,d){
  const o=new RT.Mesh(this.shadowGeometry,this.shadowMaterial);o.position.set(x,y,z);o.rotation.x=-Math.PI/2;o.scale.set(w,d,1);
  o.userData.exclude=true;parent.add(o);return o;
 }
 group(parent,x=0,y=0,z=0){
  const o=new RT.Group();o.position.set(x,y,z);parent.add(o);return o;
 }
 water(parent,tint){
  const g=new RT.PlaneGeometry(100,105),m=new RT.ShaderMaterial({
   uniforms:{clock:{value:0},sea:{value:new RT.Color(tint)}},
   vertexShader:'varying vec2 p; void main(){p=position.xy; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
   fragmentShader:`varying vec2 p; uniform float clock; uniform vec3 sea;
    void main(){
     float a=sin(p.x*3.3+p.y*2.0+sin(p.y*1.75-clock*.86)*.63+clock*1.18);
     float b=sin(p.y*4.6-p.x*1.85+sin(p.x*2.1+clock*.6)*.7-clock*.91);
     float wave=smoothstep(.62,.96,a*.66+b*.34);
     float line=smoothstep(.9,.99,sin(p.y*10.0+p.x*2.1+sin(p.x*5.1+clock)*1.2-clock*2.0));
     float channel=1.-smoothstep(3.2,5.4,abs(p.x));
     vec3 c=mix(sea*.49,sea*(.95+wave*.29),.62+.22*channel);
     float foam=1.-smoothstep(.01,.23,abs(abs(p.x)-3.92+sin(p.y*3.1+clock)*.065));
     c=mix(c,vec3(.37,.94,1.),wave*.32+line*.044+foam*.44);
     gl_FragColor=vec4(c,1.);
     #include <encodings_fragment>
    }`
  });
  const o=new RT.Mesh(g,m);o.position.y=-.22;o.rotation.x=-Math.PI/2;
  o.userData.ownGeometry=true;o.userData.ownMaterial=true;parent.add(o);this.waterMaterial=m;
 }
 palm(parent,x,z,scale){
  const p=this.group(parent,x,.24,z);p.scale.setScalar(scale);
  const trunk=cylinder(p,.12,1.35,'#bd6736',0,.67,0,.19,false,9);trunk.rotation.z=.08;
  for(let i=0;i<4;i++)cylinder(p,.13,.032,'#e0974e',.04-i*.012,.42+i*.19,0,.136,false,8);
  for(let i=0;i<6;i++){
   const r=i*Math.PI/3;
   const branch=this.group(p,-.08,1.39,0);branch.rotation.y=r;
   const leaf=sphere(branch,.59,i%2?'#48d941':'#98ef36',0,.09,.42,.37,.24,1.17);
   leaf.rotation.x=.24;
   sphere(branch,.36,'#d2ff58',0,.19,.36,.35,.22,1.1);
  }
  sphere(p,.14,'#f29a33',-.13,1.24,.12);
 }
 hut(parent,x,z,color,roof,width=1.7){
  const b=this.group(parent,x,.28,z);
  block(b,width,.23,1.74,relayInk,0,.12,0,.07);
  block(b,width*.94,1.35,1.55,color,0,.79,0,.055);
  block(b,width*1.11,.22,1.78,roof,0,1.51,0,.11);
  block(b,width*.8,.11,1.30,cream,0,1.68,0,.04);
  block(b,width*.52,.54,.058,relayInk,0,.93,.796,.045);
  for(const s of [-1,1])block(b,width*.215,.35,.06,'#7dfcff',s*width*.12,.94,.84,.02);
  block(b,.42,.56,.068,'#f7d65f',0,.38,.82,.025);
  block(b,.28,.22,.32,roof,width*.31,1.85,-.40,.05);
 }
 stage(i){
  if(this.world){this.scene.remove(this.world);dispose(this.world);}
  this.level=i;this.fx.length=0;
  const [sky,land,pink,frame,sea]=themes[i];
  this.scene.background=new RT.Color(sky);this.scene.fog=new RT.Fog(sky,45,88);
  this.world=this.group(this.scene);
  this.water(this.world,sea);
  const env=this.group(this.world);
  for(const s of [-1,1]){
   const bank=s*6.35;
   block(env,4.8,.52,28.9,'#ffe184',bank,-.065,-2.55,.23);
   block(env,4.52,.22,28.35,land,bank,.207,-2.55,.11);
   block(env,.12,.043,27.5,'#e8fc9e',s*4.09,.332,-2.5,.015);
   for(let j=0;j<37;j++){
    const x=s*(4.30+randomSeed(j+i*39)*1.69),z=11.1-randomSeed(j+77+i*43)*26.8;
    sphere(env,.13+randomSeed(j+17)*.16,j%2?'#79db37':'#d5f25b',x,.321,z,1.18,.06,.89);
   }
   for(let j=0;j<5;j++){
    const z=8.4-j*5.16,off=s*(.35+.47*randomSeed(j+i*12));
    this.palm(env,bank+off,z, .82+randomSeed(j+18)*.32);
    block(env,.54,.23,.43,j%2?pink:'#f0a13d',bank-s*.93,.42,z+.4,.09);
    sphere(env,.17,'#fff7a2',bank-s*.94,.58,z+.41,1,.57,.91);
    for(let k=0;k<2;k++){
     const x=bank-s*(.83+k*.52);
     sphere(env,.19, k?'#5dd32f':'#84e747',x,.4,z-1.35,.92,.72,1.1);
     sphere(env,.053,pink,x-.11,.53,z-1.35);
    }
   }
   this.hut(env,bank-s*.17,-7.8,pink,frame,2);
   this.hut(env,bank+s*.45,3.4,s<0?'#ffb82a':'#5cf5ed',s<0?pink:frame,1.45);
   for(let j=0;j<5;j++){
    const z=-14.2-j*2.2,x=bank+s*(.45+(j%2)*1.4);
    const h=1.6+randomSeed(j+i*9)*2.5;
    block(env,1.4,h,1.5,j%2?frame:'#359dea',x,h/2-.08,z,.08);
    block(env,1.54,.14,1.62,j%2?pink:'#a1ffff',x,h+.04,z,.06);
    for(let k=0;k<3;k++)block(env,.72,.16,.037,'#cdfbff',x,.49+k*.39,z+.765,.014);
   }
  }
  for(let k=0;k<7;k++){
   const x=(k%2?1:-1)*(3.83+randomSeed(k)*.31),z=9.2-k*3.06;
   cylinder(env,.19,.19,relayInk,x,-.025,z,.22,false,10);
   cylinder(env,.16,.22,k%2?'#ffc039':'#ff5a87',x,.13,z,.19,false,10);
   cylinder(env,.125,.08,cream,x,.28,z,.138,false,10);
  }
  for(let lane=0;lane<2;lane++)this.track(env,lane,frame);
  merge(env);
  this.gates=LEVELS[i].gates.map((list,lane)=>list.map(at=>this.barrier(lane,at)));
  this.robots=[this.robot(0),this.robot(1)];
  this.dummy.rotation.set(0,0,0);
 }
 track(parent,lane,frame){
  const x=laneX[lane],[light,mid]=bodyColors[lane];
  for(let j=0;j<5;j++){
   const z=8.5-j*4.3;
   cylinder(parent,.31,.95,'#32246f',x,.31,z,.40,false,10);
   block(parent,2.84,.18,.51,frame,x,.57,z,.07);
  }
  block(parent,2.83,.22,20.45,relayInk,x,.664,0,.08);
  block(parent,2.64,.14,20.3,lane?'#315bdd':'#7250ca',x,.79,0,.05);
  for(const side of [-1,1]){
   block(parent,.13,.12,20.25,side<0?light:mid,x+side*1.27,.885,0,.045);
   for(let j=0;j<14;j++)block(parent,.10,.026,.27,cream,x+side*1.11,.868,8.97-j*1.42,.012);
  }
  for(let j=0;j<9;j++){
   const z=7.95-j*1.97;
   for(const s of [-1,1]){
    const mark=block(parent,.32,.014,.075,lane?'#88b9ff':'#b394f5',x+s*.105,deck+.012,z,.01);mark.rotation.y=s*.70;
   }
  }
  for(let row=0;row<2;row++)for(let col=0;col<8;col++)block(parent,.3,.025,.255,(row+col)%2?relayInk:cream,x-1.05+col*.30,.879,-9.2-row*.255,0);
  for(const s of [-1,1]){
   block(parent,.16,1.87,.21,frame,x+s*1.25,deck+.90,-9.42,.045);
   block(parent,.20,.21,.26,light,x+s*1.25,deck+1.84,-9.42,.055);
  }
  block(parent,2.79,.34,.30,relayInk,x,deck+1.83,-9.42,.085);
  sign(parent,lane?'B  /  DOCK':'A  /  DOCK',x,deck+1.83,-9.256,1.99,light,relayInk,0);
  const badge=sign(parent,lane?'B':'A',x,deck+.027,9.75,.92,light,relayInk,0);
  badge.rotation.x=-Math.PI/2;
 }
 barrier(lane,at){
  const group=this.group(this.world,laneX[lane],deck,deckZ(at));
  block(group,2.5,.019,.32,'#e8e2ff',0,.015,0,.012);
  const arms=[],lamps=[],beams=[];
  for(const side of [-1,1]){
   block(group,.27,.22,.51,relayInk,side*1.11,.11,0,.065);
   block(group,.18,.72,.24,'#5848b7',side*1.11,.45,0,.047);
   const lamp=sphere(group,.125,'#fd467e',side*1.11,.83,0,1,1,1);
   lamps.push(lamp);
   const arm=this.group(group,side*1.11,.58,0);
   const beam=block(arm,1.11,.19,.17,'#ff4274',-side*.54,0,0,.054);beams.push(beam);
   for(let k=0;k<4;k++)block(arm,.079,.16,.029,relayInk,-side*(.2+k*.22),.008,.10,.01).rotation.z=-.48;
   merge(arm,new Set([beam]));arms.push(arm);
  }
  merge(group,new Set([...arms,...lamps]));
  return {arms,lamps,beams};
 }
 robot(lane){
  const [main,shade,pop]=bodyColors[lane];
  const root=this.group(this.world),body=this.group(root);
  block(body,1.06,.62,.68,shade,0,.63,0,.14);
  block(body,.74,.29,.115,main,0,.68,.38,.08);
  block(body,.62,.12,.09,cream,0,.49,.396,.035);
  const mark=block(body,.17,.17,.047,pop,0,.69,.462,.025);mark.rotation.z=Math.PI/4;
  const shells=[];
  shells.push(block(body,1.19,.76,.81,main,0,1.25,.018,.18));
  block(body,1.04,.53,.129,relayInk,0,1.26,.457,.14);
  block(body,.89,.40,.067,'#2e2b6c',0,1.26,.538,.12);
  for(const side of [-1,1]){
   block(body,.165,.22,.058,cream,side*.196,1.265,.586,.059);
   block(body,.085,.041,.015,lane?'#5df7ff':'#ffe748',side*.196,1.203,.624,.013);
   const ear=cylinder(body,.191,.112,pop,side*.641,1.25,0,.191,false,14);ear.rotation.z=Math.PI/2;
   const hub=cylinder(body,.117,.053,cream,side*.715,1.25,0,.117,false,12);hub.rotation.z=Math.PI/2;
   block(body,.22,.31,.37,relayInk,side*.593,.655,0,.058);
   block(body,.227,.28,.42,pop,side*.622,.51,.083,.073);
   block(body,.43,.19,.69,relayInk,side*.28,.24,.026,.066);
   shells.push(block(body,.36,.11,.53,main,side*.28,.36,.063,.048));
   block(body,.31,.065,.42,'#e4fdff',side*.28,.148,.05,.036);
   cylinder(body,.112,.34,pop,side*.27,.58,-.43,.115,false,12);
  }
  cylinder(body,.035,.22,relayInk,.235,1.713,-.05,.038,false,10);
  sphere(body,.102,pop,.235,1.861,-.05);
  block(body,.48,.071,.018,cream,-.13,1.485,.563,.012).rotation.z=.025;
  const flame=cylinder(body,.035,.56,'#ffae32',0,.28,.64,.235,false,9);
  flame.rotation.x=Math.PI/2;
  const inner=cylinder(body,.017,.44,'#fff7b3',0,.28,.67,.142,false,9);
  inner.rotation.x=Math.PI/2;
  const glow=cylinder(root,.69,.016,main,0,.035,0,.69,false,20);
  const shadow=this.shadow(root,0,.025,0,1.62,1.29);
  merge(body,new Set([...shells,flame,inner]));
  return {root,body,flame,inner,glow,shells,shadow};
 }
 burst(e){
  if(!this.available)return;
  const color=e.type==='hit'?'#ff4387':e.lane?'#73ffff':'#fff54b';
  for(let i=0;i<18;i++){
   const a=i*2.399,speed=2.1+randomSeed(i+e.at)*3.4;
   this.fx.push({x:laneX[e.lane],y:deck+.77,z:deckZ(e.at),vx:Math.cos(a)*speed,vy:2.2+randomSeed(i)*3.5,vz:Math.sin(a)*speed,life:.32+randomSeed(i+71)*.30,age:0,color});
  }
  if(this.fx.length>84)this.fx.splice(0,this.fx.length-84);
 }
 render(r,dt,paint,quiet){
  if(!this.available)return;
  if(this.level!==r.level)this.stage(r.level);
  this.elapsed+=dt;this.waterMaterial.uniforms.clock.value=this.elapsed;
  for(let lane=0;lane<2;lane++){
   const bot=this.robots[lane],moving=r.mode==='ride'&&r.active===lane,done=r.dist[lane]===100;
   const t=this.elapsed,lift=quiet?0:Math.sin(t*(moving?15:5)+lane)*.044;
   bot.root.position.set(laneX[lane],deck,deckZ(r.dist[lane]));
   bot.body.position.y=lift;bot.body.rotation.x=moving?-.15:0;
   bot.body.rotation.z=moving&&!quiet?Math.sin(t*11+lane)*.036:0;
   bot.glow.visible=moving||done;bot.glow.scale.setScalar(1+(quiet?0:Math.sin(t*12)*.06));
   bot.flame.visible=bot.inner.visible=moving;
   bot.flame.scale.y=.86+(!quiet?Math.sin(t*28)*.16:0);
   const coat=paint==='lime'&&!lane?'#9fff39':paint==='pink'&&lane?'#ff51c4':bodyColors[lane][0];
   for(const shell of bot.shells)shell.material=material(coat);
   this.gates[lane].forEach(({arms,lamps,beams},j)=>{
    const d=LEVELS[r.level].gates[lane][j],g=gateState(r.level,lane,j,r.t),past=r.dist[lane]>=d;
    arms[0].rotation.z=g.open||past?1.52:0;arms[1].rotation.z=-arms[0].rotation.z;
    const signal=material(past?'#c5b1f5':g.warning?'#ffdf4f':g.open?'#a4ff2e':'#ff3e72');
    for(const part of [...lamps,...beams])part.material=signal;
   });
  }
  this.fx=this.fx.filter(p=>p.age<p.life);
  this.fxPool.count=quiet?0:this.fx.length;
  for(let i=0;i<this.fxPool.count;i++){
   const p=this.fx[i];p.age+=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;p.vy-=12*dt;
   this.dummy.position.set(p.x,p.y,p.z);this.dummy.rotation.set(p.age*4,p.age*7,i);
   this.dummy.scale.setScalar(Math.max(.02,1-p.age/p.life));this.dummy.updateMatrix();
   this.fxPool.setMatrixAt(i,this.dummy.matrix);this.fxPool.setColorAt(i,new RT.Color(p.color));
  }
  this.fxPool.instanceMatrix.needsUpdate=true;if(this.fxPool.instanceColor)this.fxPool.instanceColor.needsUpdate=true;
  const pan=quiet?0:Math.sin(this.elapsed*.46)*.24;
  this.camera.position.set(2.45+pan,18.2,28.8);this.camera.lookAt(0,.40,.15);
  this.renderer.render(this.scene,this.camera);
 }
}
