import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import * as core from './core.mjs';
const read=name=>fs.readFileSync(new URL(name,import.meta.url),'utf8');
const adapter=read('./sdk.mjs').replace(/^export /gm,'');
const app=read('./app.mjs').replace(/^import .*?;\s*/gm,'');
let checks=0;
const ok=(v,m)=>{assert.ok(v,m);checks++;};
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
function makeHost(){
 const count={starts:0,ends:0,off:0,writes:[]};
 const sdk={
  gameStart(){count.starts++;},gameOver(){count.ends++;},
  async onLike(fn){count.like=fn;return{code:0,data:{unsubscribe(){count.off++;}}};},
  async onComment(fn){count.comment=fn;return{code:0,data:{unsubscribe(){count.off++;}}};},
  async loadUserGameState(){return{};},
  async saveUserGameState(value){count.writes.push(JSON.parse(JSON.stringify(value)));return{code:0};}
 };
 return {sdk,count};
}
function boot(storage,sdk){
 let time=0,next=0;
 const nodes=new Map(),events=new Map();
 function get(id){
  if(!nodes.has(id))nodes.set(id,{dataset:{},style:{setProperty(){}},attrs:{},listeners:new Map(),addEventListener(n,fn){this.listeners.set(n,fn);},setAttribute(n,v){this.attrs[n]=v;}});
  return nodes.get(id);
 }
 const context={
  ...core,neonlib:sdk,
  document:{getElementById:get,hidden:false,addEventListener(){}},
  localStorage:{getItem(key){assert.equal(key,'turbo-relay-v1');return storage.value;},setItem(key,value){assert.equal(key,'turbo-relay-v1');storage.value=value;}},
  requestAnimationFrame(){},performance:{now:()=>time},matchMedia:()=>({matches:false}),
  setTimeout(){return ++next;},clearTimeout(){},addEventListener(n,fn){events.set(n,fn);},removeEventListener(){},
  RelayArt:class{fx=[];render(){}burst(){}},RelayAudio:class{unlock(){}update(){}sfx(){}}
 };
 context.window=context;
 vm.createContext(context);
 vm.runInContext(adapter+'\n'+app+'\nthis.test={action,frame,pause,get r(){return r},get p(){return p}};',context);
 return {
  context,events,get,test:context.test,
  frame(){time+=1000/60;context.test.frame(time);},
  clickPanel(action){get('panel').listeners.get('click')({target:{closest:()=>({dataset:{action}})}});}
 };
}
const storage={},late=makeHost(),a=boot(storage);
a.test.action();for(let i=0;i<50;i++)a.frame();
ok(a.test.r.mode==='ride'&&a.test.r.dist[0]>10,'app starts before SDK exists');
a.context.neonlib=late.sdk;a.events.get('pointerdown')();await flush();
ok(late.count.starts===1,'late host receives the real start');
late.count.like({project_id:'77',status:false,count:10});late.count.comment({project_id:77,content:'x'});
ok(!a.test.p.rewards.like&&!a.test.p.rewards.comment,'unlike and numeric ID do not reward');
late.count.like({project_id:'77',status:true,count:0});late.count.comment({project_id:'77',content:'',count:0});
await flush();
const writes=late.count.writes.length;
late.count.like({project_id:'77',status:true,count:1});late.count.comment({project_id:'77',content:'again'});
await flush();
ok(a.test.p.rewards.like&&a.test.p.rewards.comment&&late.count.writes.length===writes,'positive like and image comment each save once');
a.test.pause();const paused=JSON.parse(storage.value).round;
a.events.get('pagehide')();
ok(late.count.ends===0&&late.count.off===2,'pause/reload does not fabricate end and releases listeners');
const full=makeHost(),b=boot(storage,full.sdk);await flush();
ok(full.count.starts===0&&b.get('panel').innerHTML.includes('RESUME RELAY'),'active checkpoint opens paused without fake start');
ok(JSON.stringify(b.test.r)===JSON.stringify(paused),'active times and both bot positions restore exactly');
b.clickPanel('resume');ok(full.count.starts===1,'resume begins the actual host visit');
let last=-1;
for(let i=0;i<3500&&b.test.r.mode==='ride';i++){
 const r=b.test.r,lane=r.active<0?core.goLane(r):r.active,red=core.gateThreat(r,lane);
 if(r.t-last>.25&&(r.active<0?!red:red)){b.test.action();last=r.t;}
 b.frame();
}
await flush();
ok(b.test.r.mode==='win'&&full.count.starts===1&&full.count.ends===1,'true controller clear sends one terminal event');
ok(b.test.p.unlocked===1&&b.test.p.best[0].stars===3&&b.test.r.score>=1000,'first circuit awards scores and unlocks second');
ok(full.count.writes.at(-1).game==='turbo-relay'&&!('round' in full.count.writes.at(-1)),'only this profile goes to cloud');
b.frame();b.clickPanel('next');ok(full.count.ends===1&&b.test.r.level===1&&b.test.r.mode==='ready','next circuit does not duplicate end or start');
b.events.get('pagehide')();ok(full.count.off===2,'current subscriptions cleaned');
console.log('PASS',checks,'controller integration checks with mocked host and renderer');
