import assert from 'node:assert/strict';
import {LEVELS,newRun,profile,restore,begin,toggle,advance,stars,commit,mergeProfile,gateState,nextGate,goLane,gateThreat,bothBlocked} from './core.mjs';
let checks=0;
function check(value,message){assert.ok(value,message);checks++;}
function course(r,dt,lead=.78){
 const L=LEVELS[r.level],events=[];let last=-1;
 while(r.mode==='ride'&&r.t<60){
  const lane=r.active<0?goLane(r):r.active,g=nextGate(r,lane);
  const eta=g?(g.at-r.dist[lane])/L.speed:Infinity;
  const open=g?gateState(r.level,lane,g.index,r.t+eta).open:true;
  if(r.t-last>.25&&(r.active<0?!gateThreat(r,lane):eta<lead&&!open)){toggle(r);last=r.t;}
  events.push(...advance(r,dt));
 }
 return events;
}
let progress=profile();
for(const dt of [1/30,1/60,1/120])for(let level=0;level<6;level++){
 const r=newRun(level);check(begin(r)&&!begin(r),'only ready can start');
 const events=course(r,dt);
 check(r.mode==='win'&&r.dist.every(x=>x===100),'guided timing clears both lanes');
 check(events.filter(x=>x.type==='gate').length===LEVELS[level].gates.flat().length,'no unscored gate crossings at frame boundaries');
 check(events.filter(x=>x.type==='dock').length===2&&events.filter(x=>x.type==='finish').length===1,'actual docks and single terminal event');
 check(r.score===500+events.filter(x=>x.type==='gate').reduce((n,e)=>n+e.points,0),'score reconciles with gates and docks');
 check(!toggle(r)&&advance(r,dt).length===0,'terminal state cannot award again');
 progress=commit(r,progress);
 check(restore(JSON.parse(JSON.stringify(r)),progress).mode==='win','terminal receipt restores');
}
check(progress.unlocked===5&&progress.best.every(b=>b.stars>=2),'all six circuits unlock with best scores');
for(let level=0;level<6;level++){
 let found=false;
 for(const lead of [.35,.5,.6,.7,.8,.9,1.05,1.25]){
  const r=newRun(level);begin(r);course(r,1/60,lead);
  if(stars(r)===3){found=true;break;}
 }
 check(found,'a clean three-star timing route exists for circuit '+(level+1));
}
const idle=newRun(1);begin(idle);
while(idle.hits===0)advance(idle,1/60);
check(idle.active===-1,'first crash brakes the battery');
const stopped=idle.dist.slice();
for(let i=0;i<180;i++)advance(idle,1/60);
check(idle.hits===1&&idle.dist.every((x,i)=>x===stopped[i]),'idle after crash does not burn more fuses');
const danger=newRun(3);begin(danger);danger.t=1.2;danger.dist=[21,31];
check(bothBlocked(danger),'dual red-window fixture');
toggle(danger);advance(danger,.05);
check(danger.active===-1&&danger.dist[0]===21&&danger.dist[1]===31,'one brake tap safely stops both bots');
while(gateThreat(danger,goLane(danger)))advance(danger,1/60);
toggle(danger);check(danger.active===goLane(danger),'GO chooses a safe unfinished lane');
const lastFuse=newRun(1);begin(lastFuse);lastFuse.hits=2;let finish=0;
for(let i=0;i<1000&&lastFuse.mode==='ride';i++)finish+=advance(lastFuse,1/60).filter(e=>e.type==='finish').length;
check(lastFuse.mode==='loss'&&lastFuse.hits===3&&finish===1,'third closed-gate hit sends one loss');
const checkpoint=newRun(3);begin(checkpoint);advance(checkpoint,.03);toggle(checkpoint);
const restored=restore(JSON.parse(JSON.stringify(checkpoint)),progress);
assert.deepEqual(restored,checkpoint);checks++;
for(let i=0;i<100;i++){assert.deepEqual(advance(restored,.016),advance(checkpoint,.016));}
assert.deepEqual(restored,checkpoint);checks++;
const merged=mergeProfile(profile({...progress,music:false}),{rewards:{like:true},best:[{score:1,stars:1}]});
check(merged.best[0].score===progress.best[0].score&&!merged.music&&merged.rewards.like,'cloud merges high scores and claims and preserves local settings');
check(profile({paint:'pink'}).paint==='standard'&&profile({paint:'pink',rewards:{comment:true}}).paint==='pink','paint requires earned or confirmed unlock');
check(restore({level:99,mode:'ride',dist:[Infinity,-15]},profile()).level===0,'invalid checkpoint cannot skip stages');
console.log('PASS',checks,'relay checks, 18 full circuits and exact active checkpoint continuation');
