import {LEVELS,newRun,profile,restore,begin,toggle,advance,stars,commit,mergeProfile,gateState,nextGate} from './core.mjs';
import {bridge} from './sdk.mjs';
import {RelayArt} from './art.mjs';
import {RelayAudio} from './audio.mjs';
const $=id=>document.getElementById(id);
const key='turbo-relay-v1',reduced=matchMedia('(prefers-reduced-motion: reduce)');
let disk;try{disk=JSON.parse(localStorage.getItem(key)||'null');}catch{}
const own=disk?.game==='turbo-relay'&&disk.v===1;
let p=profile(own?disk.profile:undefined),r=restore(own?disk.round:null,p);
let panel=r.mode==='ride'?'pause':r.mode==='ready'?'':'result',checkpoint=0,noticeUntil=0,previous=0,uiAt=0;
const art=new RelayArt($('track')),audio=new RelayAudio();
function persist(){
 try{localStorage.setItem(key,JSON.stringify({game:'turbo-relay',v:1,profile:p,round:r}));}catch{}
}
const host=bridge({
 read:()=>p,
 write:(data,merge)=>{p=merge?mergeProfile(p,data):profile(data);persist();paint();if(panel==='settings')drawPanel();},
 changed:e=>{
  if(e.type==='support'&&panel==='settings')drawPanel();
  if(e.type==='reward'){announce(e.kind==='like'?'LIME PAINT!':'PINK PAINT!','dock');audio.sfx('perfect');}
 }
});
function saveProfile(){persist();host.save();}
const button=(label,action,primary=true)=>'<button type="button" class="'+(primary?'primary':'secondary')+'" data-action="'+action+'">'+label+(primary?' <b aria-hidden="true">→</b>':'')+'</button>';
function announce(text,kind='gate'){
 $('callout').textContent=text;$('callout').dataset.kind=kind;noticeUntil=performance.now()+850;
}
function drawPanel(){
 const node=$('panel');node.hidden=!panel;if(!panel)return;
 const L=LEVELS[r.level];let html='';
 if(panel==='result'){
  const win=r.mode==='win',rank=stars(r);
  html='<small>CIRCUIT '+String(r.level+1).padStart(2,'0')+' · '+L.word+'</small><h2>'+(win?(r.level===5?'RELAY CHAMP!':'BOTH DOCKED!'):'FUSES OUT!')+'</h2>'+
   '<div class="stars" aria-label="'+rank+' stars">'+'★'.repeat(rank)+'☆'.repeat(3-rank)+'</div>'+
   '<div class="stats"><span>SCORE<strong>'+r.score+'</strong></span><span>TIME<strong>'+r.t.toFixed(1)+'s</strong></span><span>CHAIN<strong>×'+r.bestCombo+'</strong></span></div>'+
   button(win&&r.level<5?'NEXT CIRCUIT':win?'CIRCUIT SELECT':'TRY AGAIN',win&&r.level<5?'next':win?'select':'retry')+
   '<div class="row">'+button(win?'REPLAY':'CIRCUITS',win?'retry':'select',false)+button('SETTINGS','settings',false)+'</div>';
 }else if(panel==='pause'){
  html='<small>TAKE A BREATHER</small><h2>RELAY PAUSED</h2><p>Both bots are holding position.</p>'+button('RESUME RELAY','resume')+'<div class="row">'+button('CIRCUITS','select',false)+button('SETTINGS','settings',false)+'</div>';
 }else if(panel==='select'){
  html='<small>SELECT A CIRCUIT</small><h2>RELAY MAP</h2><div class="stage-list">'+LEVELS.map((level,i)=>'<button type="button" data-action="level'+i+'" aria-label="'+level.name+'" '+(i>p.unlocked?'disabled':'')+'>'+String(i+1).padStart(2,'0')+' '+(p.best[i].stars?'★'+p.best[i].stars:i>p.unlocked?'▣':'→')+'</button>').join('')+'</div>'+button('BACK','back');
 }else{
  const total=p.best.reduce((n,b)=>n+b.stars,0),support=host.support();
  const lime=p.rewards.like||total>=6,pink=p.rewards.comment||p.unlocked>=5;
  const unlocked=['standard',...(lime?['lime']:[]),...(pink?['pink']:[])];
  html='<small>RELAY GARAGE · '+total+'/18 STARS</small><h2>SETTINGS</h2><div class="row">'+button(p.music?'MUSIC ON':'MUSIC OFF','music',false)+button('PAINT: '+p.paint.toUpperCase(),'paint',false)+'</div>'+
   '<p>'+(unlocked.length>1?'Tap paint to cycle unlocked looks.':'Earn 6 stars for Lime. Reach the finale for Pink.')+'</p>';
  if(support.like&&!p.rewards.like)html+='<p>GameWave like unlocks Lime paint.</p>';
  if(support.comment&&!p.rewards.comment)html+='<p>GameWave direct comment unlocks Pink paint.</p>';
  html+=button('BACK','back')+'<div class="row">'+button('CIRCUITS','select',false)+'</div>';
 }
 node.innerHTML=html;
}
function paint(){
 const L=LEVELS[r.level],num=String(r.level+1).padStart(2,'0');
 $('circuit').textContent='CIRCUIT '+num;$('stage-num').textContent=num;$('stage-name').textContent=L.name.toUpperCase();
 $('meter-a').style.setProperty('--fill',r.dist[0]+'%');$('meter-b').style.setProperty('--fill',r.dist[1]+'%');
 $('fuses').textContent='◆'.repeat(3-r.hits)+'◇'.repeat(r.hits);$('fuses').setAttribute('aria-label',(3-r.hits)+' fuses');
 $('music').setAttribute('aria-pressed',String(p.music));$('music').setAttribute('aria-label',p.music?'Music on':'Music off');
 const a=$('action'),cue=$('cue'),both=r.dist.every(x=>x<100);
 a.disabled=!!panel;
 const word=r.mode==='ready'?'GO LIVE':both?'SWITCH POWER':r.active<0?'GO':'BRAKE';
 if(a.dataset.label!==word){a.dataset.label=word;a.innerHTML=word+' <b aria-hidden="true">'+(both&&r.mode==='ride'?'⇄':r.active>=0&&!both?'■':'→')+'</b>';}
 a.dataset.lane=r.active===1?'b':'a';
 let note='GREEN = GO · RED = SWITCH',danger=false;
 if(r.mode==='ride'){
  const lane=r.active<0?r.dist.findIndex(x=>x<100):r.active,g=nextGate(r,lane);
  if(g){
   const eta=(g.at-r.dist[lane])/L.speed,arrival=gateState(r.level,lane,g.index,r.t+eta);
   danger=eta<.78&&!arrival.open;
   if(r.active<0)note=arrival.open?'GREEN WINDOW · GO':'WAIT FOR GREEN';
   else if(danger)note=both?'RED AHEAD · SWITCH!':'RED AHEAD · BRAKE!';
   else note=(lane?'◆ B':'▲ A')+' POWERED'+(both?' · SWITCH TO CHANGE':' · LAST BOT');
  }else note='CLEAR TO DOCK';
 }
 cue.textContent=note;cue.dataset.danger=String(danger);
}
function pause(which='pause'){
 panel=which;audio.update(false);persist();drawPanel();paint();
}
function back(){
 panel=r.mode==='ride'?'pause':r.mode==='ready'?'':'result';drawPanel();paint();
}
function load(index){
 if(r.mode==='ride')host.end();
 host.prepare();r=newRun(index);panel='';art.fx.length=0;$('callout').textContent='';
 checkpoint=0;persist();drawPanel();paint();
}
function action(){
 if(panel)return;
 audio.unlock();
 if(begin(r)){host.start();audio.sfx('start');}
 else if(toggle(r)){audio.sfx('switch');}
 else return;
 persist();paint();
}
function musicToggle(){audio.unlock();p=profile({...p,music:!p.music});saveProfile();paint();if(panel==='settings')drawPanel();}
$('action').addEventListener('click',action);
$('music').addEventListener('click',musicToggle);
$('menu').addEventListener('click',()=>{audio.unlock();panel==='settings'?back():pause(r.mode==='ride'&&!panel?'pause':'settings');});
$('panel').addEventListener('click',e=>{
 const id=e.target.closest('button')?.dataset.action;if(!id)return;
 audio.unlock();
 if(id==='resume'){panel='';host.start();drawPanel();paint();}
 else if(id==='next')load(Math.min(p.unlocked,r.level+1));
 else if(id==='retry')load(r.level);
 else if(id==='back')back();
 else if(id==='select'||id==='settings')pause(id);
 else if(id==='music')musicToggle();
 else if(id==='paint'){
  const choices=['standard',...(p.rewards.like||p.best.reduce((n,b)=>n+b.stars,0)>=6?['lime']:[]),...(p.rewards.comment||p.unlocked>=5?['pink']:[])];
  p=profile({...p,paint:choices[(choices.indexOf(p.paint)+1)%choices.length]});saveProfile();drawPanel();
 }else if(id.startsWith('level')){const i=Number(id.slice(5));if(Number.isInteger(i)&&i>=0&&i<=p.unlocked)load(i);}
});
window.addEventListener('keydown',e=>{
 if(e.repeat)return;
 if(e.key==='Escape'){if(panel==='pause'){panel='';host.start();drawPanel();paint();}else if(panel)back();else if(r.mode==='ride')pause();return;}
 if((e.code==='Space'||e.code==='Enter')&&!e.target.closest?.('button')&&!panel){e.preventDefault();action();}
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&r.mode==='ride'&&!panel)pause();});
window.addEventListener('pagehide',()=>{audio.update(false);persist();host.stop();});
window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
function frame(now){
 requestAnimationFrame(frame);
 const dt=Math.min(.06,(now-(previous||now))/1000);previous=now;
 if(document.hidden){audio.update(false);return;}
 const playing=r.mode==='ride'&&!panel;
 audio.update(playing&&p.music,Math.min(1,(r.dist[0]+r.dist[1])/180+r.combo*.03));
 if(playing){
  for(const ev of advance(r,dt)){
   if(ev.type==='finish'){
    host.end();p=commit(r,p);saveProfile();panel='result';drawPanel();paint();
    audio.sfx(r.mode==='win'?'win':'loss');audio.update(false);
   }else{
    art.burst(ev);
    if(ev.type==='hit'){announce('FUSE LOST!','hit');audio.sfx('hit');}
    else if(ev.type==='dock'){announce((ev.lane?'B':'A')+' DOCKED!','dock');audio.sfx('dock');}
    else{announce(ev.perfect?'PERFECT! +'+ev.points:'CLEAR! +'+ev.points);audio.sfx(ev.perfect?'perfect':'gate');}
    persist();
   }
  }
  if(now-checkpoint>750){persist();checkpoint=now;}
 }
 if(noticeUntil&&now>noticeUntil){$('callout').textContent='';noticeUntil=0;}
 if(now-uiAt>80){paint();uiAt=now;}
 art.render(r,panel||reduced.matches?0:dt,p.paint,reduced.matches);
}
paint();drawPanel();requestAnimationFrame(frame);
