export const LEVELS = [
 {name:'Sunset Express',word:'SUNSET',speed:16,par:18,period:2.6,open:1.36,gates:[[35,70],[48,80]],offsets:[[.3,1.3],[1.45,1.7]],sky:'#159cf8',dark:'#0744b5'},
 {name:'Lime Loop',word:'LIME',speed:17,par:19,period:2.55,open:1.24,gates:[[24,55,83],[39,69,91]],offsets:[[.2,1.1,1.8],[1,.3,1.5]],sky:'#46c226',dark:'#116944'},
 {name:'Bubblegum Bay',word:'BUBBLE',speed:18,par:19,period:2.35,open:1.16,gates:[[27,51,78],[30,61,86]],offsets:[[1.2,.4,1.65],[.45,1.5,.7]],sky:'#f65bb9',dark:'#922a8f'},
 {name:'Blue Voltage',word:'VOLTAGE',speed:19,par:20,period:2.24,open:1.04,gates:[[22,46,66,88],[32,52,73,92]],offsets:[[.2,1,.47,1.65],[.9,1.4,.2,.7]],sky:'#426aff',dark:'#2925a7'},
 {name:'Mango Melt',word:'MANGO',speed:20,par:21,period:2.14,open:.99,gates:[[23,43,64,84],[28,49,71,92]],offsets:[[.7,1.3,.1,1.53],[1.55,.3,.75,1.2]],sky:'#ff8c26',dark:'#bf263d'},
 {name:'Ultra Finale',word:'FINALE',speed:21,par:22,period:2.03,open:.93,gates:[[20,38,56,75,92],[25,42,63,81,95]],offsets:[[.3,1.17,.12,.63,1.4],[1.34,.6,1.6,.3,.9]],sky:'#9655ff',dark:'#4524a5'}
];
export const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const finite=(n,min,max,fallback=0)=>Number.isFinite(n)?clamp(n,min,max):fallback;
const count=(n,min,max)=>Math.round(finite(n,min,max));
export const newRun=(level=0)=>({level,mode:'ready',t:0,dist:[0,0],active:0,hits:0,combo:0,bestCombo:0,score:0,swaps:0,perfect:0});
export function profile(raw={}){
 raw=raw&&typeof raw==='object'?raw:{};
 const best=LEVELS.map((_,i)=>({stars:count(raw.best?.[i]?.stars,0,3),score:count(raw.best?.[i]?.score,0,999999)}));
 const unlocked=Math.min(LEVELS.length-1,best.reduce((n,b,i)=>b.stars?Math.max(n,i+1):n,0));
 const rewards={like:raw.rewards?.like===true,comment:raw.rewards?.comment===true};
 return {best,unlocked,rewards,music:raw.music!==false,paint:raw.paint==='lime'&&(rewards.like||best.reduce((n,b)=>n+b.stars,0)>=6)?'lime':raw.paint==='pink'&&(rewards.comment||unlocked===5)?'pink':'standard'};
}
export function restore(raw,p){
 const level=count(raw?.level,0,p.unlocked);
 if(!raw||!['ride','win','loss'].includes(raw.mode))return newRun(level);
 const r=newRun(level);
 Object.assign(r,{mode:raw.mode,t:finite(raw.t,0,3600),dist:[finite(raw.dist?.[0],0,100),finite(raw.dist?.[1],0,100)],active:count(raw.active,-1,1),hits:count(raw.hits,0,3),combo:count(raw.combo,0,20),bestCombo:count(raw.bestCombo,0,20),score:count(raw.score,0,999999),swaps:count(raw.swaps,0,99999),perfect:count(raw.perfect,0,20)});
 if(r.dist.every(x=>x===100))r.mode='win';
 else if(r.hits===3)r.mode='loss';
 else if(r.mode!=='ride')return newRun(level);
 if(r.active>=0&&r.dist[r.active]>=100)r.active=r.dist[1-r.active]<100?1-r.active:-1;
 return r;
}
export function begin(r){
 if(r.mode!=='ready')return false;
 r.mode='ride';return true;
}
export function toggle(r){
 if(r.mode!=='ride')return false;
 const both=r.dist.every(x=>x<100);
 if(both)r.active=r.active===0?1:0;
 else r.active=r.active<0?r.dist.findIndex(x=>x<100):-1;
 r.swaps++;return true;
}
export function gateState(level,lane,index,time){
 const L=LEVELS[level],offset=L.offsets[lane][index];
 const phase=((time+offset)%L.period+L.period)%L.period;
 return {open:phase<L.open,phase,perfect:phase>=L.open*.23&&phase<=L.open*.77,warning:phase<L.open&&L.open-phase<.27};
}
export function nextGate(r,lane){
 const gates=LEVELS[r.level].gates[lane],index=gates.findIndex(x=>x>r.dist[lane]);
 return index<0?null:{index,at:gates[index]};
}
export function advance(r,dt){
 if(r.mode!=='ride')return [];
 dt=clamp(dt,0,.08);
 const time=r.t;r.t+=dt;
 if(r.active<0)return [];
 const lane=r.active,L=LEVELS[r.level],before=r.dist[lane],target=Math.min(100,before+L.speed*dt);
 const gate=nextGate(r,lane),events=[];
 if(gate&&target>=gate.at){
  const state=gateState(r.level,lane,gate.index,time+(gate.at-before)/L.speed);
  if(!state.open){
   const prior=L.gates[lane][gate.index-1]??0;
   r.dist[lane]=Math.max(prior,gate.at-7);
   r.hits++;r.combo=0;
   events.push({type:'hit',lane,at:gate.at});
   if(r.hits>=3){r.mode='loss';events.push({type:'finish'});}
   return events;
  }
  r.combo++;r.bestCombo=Math.max(r.bestCombo,r.combo);r.perfect+=Number(state.perfect);
  const points=(state.perfect?170:100)+Math.min(180,(r.combo-1)*20);
  r.score+=points;events.push({type:'gate',lane,at:gate.at,perfect:state.perfect,points});
 }
 r.dist[lane]=target;
 if(target===100){
  r.score+=250;events.push({type:'dock',lane,at:100});
  const other=1-lane;
  if(r.dist[other]>=100){r.mode='win';events.push({type:'finish'});}
  else r.active=other;
 }
 return events;
}
export function stars(r){
 return r.mode==='win'?1+Number(r.hits===0)+Number(r.t<=LEVELS[r.level].par):0;
}
export function commit(r,p){
 if(r.mode!=='win')return p;
 const best=p.best.map((b,i)=>i===r.level?{stars:Math.max(b.stars,stars(r)),score:Math.max(b.score,r.score)}:b);
 return profile({...p,best});
}
export function mergeProfile(local,cloud){
 const remote=profile(cloud);
 return profile({...local,best:local.best.map((b,i)=>({stars:Math.max(b.stars,remote.best[i].stars),score:Math.max(b.score,remote.best[i].score)})),rewards:{like:local.rewards.like||remote.rewards.like,comment:local.rewards.comment||remote.rewards.comment}});
}
