import {LEVELS,gateState,clamp} from './core.mjs';
const INK='#17123c', PAPER='#fff7d9';
const colors=[['#fcff44','#fbb52e','#ff5b50'],['#53ffff','#17a7f8','#7452f3']];
const mix=(a,b,t)=>a+(b-a)*t;
const lanePoint=(lane,d)=>({x:mix(lane?281:109,lane?238:152,d/100),y:465-d*3.55,s:mix(1.14,.64,d/100),half:mix(63,34,d/100)});
const rng=(n)=>{const x=Math.sin(n*12.9898+78.233)*43758.5453;return x-Math.floor(x)};
export class RelayArt {
 constructor(canvas){
  this.canvas=canvas;this.c=canvas.getContext('2d',{alpha:false});this.fx=[];this.scale=1;this.elapsed=0;
  this.back=document.createElement('canvas');this.back.width=780;this.back.height=1080;
  this.backLevel=-1;this.resize();
  new ResizeObserver(()=>this.resize()).observe(canvas);
 }
 resize(){
  const {width,height}=this.canvas.getBoundingClientRect(),dpr=Math.min(1.7,window.devicePixelRatio||1);
  this.canvas.width=Math.max(1,Math.round(width*dpr));this.canvas.height=Math.max(1,Math.round(height*dpr));
 }
 poly(points,fill,stroke=INK,w=2.7){
  const c=this.c;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fillStyle=fill;c.fill();
  if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}
 }
 round(x,y,w,h,r,fill,stroke=INK,lw=2.7){
  const c=this.c;c.beginPath();c.roundRect(x,y,w,h,r);c.fillStyle=fill;c.fill();
  if(stroke){c.strokeStyle=stroke;c.lineWidth=lw;c.stroke();}
 }
 oval(x,y,rx,ry,fill,stroke=null,w=2){
  const c=this.c;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fillStyle=fill;c.fill();
  if(stroke){c.strokeStyle=stroke;c.lineWidth=w;c.stroke();}
 }
 line(points,color,w=2){
  const c=this.c;c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.strokeStyle=color;c.lineWidth=w;c.stroke();
 }
 text(t,x,y,size,color=PAPER,align='center',italic=false){
  const c=this.c;c.textAlign=align;c.textBaseline='middle';c.fillStyle=color;c.font=(italic?'italic ':'')+'950 '+size+'px system-ui';c.fillText(t,x,y);
 }
 spark(x,y,r,fill,angle=0){
  const a=Array.from({length:8},(_,i)=>{const t=angle+i*Math.PI/4,k=i%2?r*.29:r;return[x+Math.cos(t)*k,y+Math.sin(t)*k]});
  this.poly(a,fill,null);
 }
 backdrop(level){
  const saved=this.c;this.c=this.back.getContext('2d');const c=this.c,L=LEVELS[level];c.setTransform(2,0,0,2,0,0);c.lineJoin='round';c.lineCap='round';
  const sky=c.createLinearGradient(0,0,0,540);sky.addColorStop(0,L.sky);sky.addColorStop(.38,L.dark);sky.addColorStop(1,'#20104d');
  c.fillStyle=sky;c.fillRect(0,0,390,540);
  this.oval(311,57,63,63,'#ffea43');
  for(let i=0;i<18;i++){
   const a=i*Math.PI/9-.2,r=65+i%3*4;
   this.poly([[311+Math.cos(a)*r,57+Math.sin(a)*r],[311+Math.cos(a+.08)*r,57+Math.sin(a+.08)*r],[311+Math.cos(a+.045)*(r+110),57+Math.sin(a+.045)*(r+110)]],'#ffffff26',null);
  }
  for(let y=18;y<210;y+=8)for(let x=4;x<390;x+=8){
   const r=1.1+rng(x+y*29)*1.2;if(x<90||x>315)this.oval(x,y,r,r,'#17123d29');
  }
  for(let i=0;i<19;i++){
   const x=i*23-12,w=18+rng(i+32)*22,h=21+rng(i+89)*62;
   this.poly([[x,125],[x,125-h],[x+w,125-h-4],[x+w,125]],i%2?'#37218a':'#4532b6',null);
   for(let j=0;j<3;j++)this.round(x+5,132-h+j*8,6,3,1,'#bfc0ff74',null);
  }
  this.poly([[0,540],[0,223],[160,108],[237,108],[390,233],[390,540]],'#5430b7',null);
  for(let i=-5;i<=5;i++)this.line([[195+i*10,110],[195+i*100,540]],'#ad8aff3e',1);
  for(const y of [123,148,180,225,283,366,474,536])this.line([[0,y],[390,y]],'#ab85ff35',1);
  for(const s of [-1,1]){
   const side=s<0?0:390;
   this.poly([[side,144],[side+s*-48,160],[side+s*-41,276],[side,302]],s<0?'#ff6b70':'#a36bff',INK,3);
   this.poly([[side,154],[side+s*-35,168],[side+s*-27,239],[side,255]],s<0?'#ffab38':'#c7a8ff',null);
   for(let i=0;i<5;i++)this.line([[side+s*-6,170+i*15],[side+s*-23,165+i*15]],'#291750',2);
   this.poly([[side,381],[side+s*-32,360],[side+s*-48,403],[side+s*-33,540],[side,540]],s<0?'#b940db':'#2bcdd9',INK,3);
   for(let i=0;i<5;i++)this.poly([[side,389+i*26],[side+s*-24,380+i*26],[side+s*-21,391+i*26],[side,403+i*26]],'#ffffff44',null);
  }
  for(let lane=0;lane<2;lane++)this.track(lane);
  this.text('RELAY DISTRICT',195,514,19,'#dbc1ff','center',true);
  this.text('01   /   DUAL PROPULSION SYSTEM',195,533,7,'#c3a1ff');
  for(let i=0;i<55;i++){
   const x=rng(i*11+41)*390,y=rng(i*9+16)*540;
   this.oval(x,y,.8,.8,'#ffffff38');
  }
  this.c=saved;this.backLevel=level;
 }
 track(lane){
  const n=lanePoint(lane,0),f=lanePoint(lane,100),[light,mid,hot]=colors[lane];
  this.poly([[n.x-n.half-5,n.y+19],[f.x-f.half-5,f.y+13],[f.x+f.half+5,f.y+13],[n.x+n.half+5,n.y+19]],'#1d1555',INK,5);
  this.poly([[n.x-n.half,n.y+9],[f.x-f.half,f.y],[f.x+f.half,f.y],[n.x+n.half,n.y+9]],lane?'#244bc4':'#7140a9',INK,4);
  this.poly([[n.x-n.half,n.y+9],[f.x-f.half,f.y],[f.x-f.half+6,f.y],[n.x-n.half+11,n.y+9]],light,INK,1.5);
  this.poly([[n.x+n.half-10,n.y+9],[f.x+f.half-6,f.y],[f.x+f.half,f.y],[n.x+n.half,n.y+9]],mid,INK,1.5);
  for(let d=5;d<99;d+=6){
   const p=lanePoint(lane,d);
   this.line([[p.x-p.half+8*p.s,p.y],[p.x+p.half-7*p.s,p.y]],'#e9d8ff33',1.3);
   if(d%12===5)this.poly([[p.x-13*p.s,p.y+3*p.s],[p.x,p.y-7*p.s],[p.x+13*p.s,p.y+3*p.s],[p.x+6*p.s,p.y+3*p.s],[p.x,p.y-2*p.s],[p.x-6*p.s,p.y+3*p.s]],'#eaddff55',null);
  }
  for(let j=0;j<8;j++)for(let i=0;i<2;i++){
   const x=f.x-26+j*6.5;
   this.poly([[x,f.y+i*5],[x+6.5,f.y+i*5],[x+6.5,f.y+i*5+5],[x,f.y+i*5+5]],(i+j)%2?INK:PAPER,null);
  }
  this.round(f.x-28,f.y-21,56,15,5,light,INK,2);this.text(lane?'◆ B DOCK':'▲ A DOCK',f.x,f.y-13,8,INK);
  this.round(n.x-39,n.y+22,78,21,7,light,INK,3);
  this.text(lane?'◆  B':'▲  A',n.x,n.y+32,14,INK);
 }
 gate(r,lane,index){
  const d=LEVELS[r.level].gates[lane][index],p=lanePoint(lane,d),c=this.c;
  const g=gateState(r.level,lane,index,r.t),open=g.open,past=r.dist[lane]>=d;
  c.save();c.translate(p.x,p.y);c.scale(p.s,p.s);
  const half=p.half/p.s-8,col=past?'#b5b8eb':open?(g.warning?'#ffed55':'#7fff60'):'#ff4f7a';
  this.poly([[-half-6,3],[-half-2,-8],[half+2,-8],[half+6,3]],past?'#9a83b55e':open?'#71ff9270':'#ff437aaf',null);
  this.round(-half-6,-33,12,40,3,'#4c3fb2',INK,2.2);
  this.round(half-6,-33,12,40,3,'#6b5ee4',INK,2.2);
  this.oval(-half,-32,5,5,col,INK,1.6);this.oval(half,-32,5,5,col,INK,1.6);
  if(!past){
   if(open){
    this.line([[-half,-12],[-half-1,-42],[-half+8,-46]],col,6);
    this.line([[half,-12],[half+1,-42],[half-8,-46]],col,6);
   }else{
    this.round(-half,-19,half*2,11,3,col,INK,2.3);
    for(let x=-half+4;x<half-4;x+=13)this.line([[x,-10],[x+5,-17]],'#8c1555',2.4);
    this.round(-10,-23,20,18,4,col,INK,2);
    this.text('×',0,-13,17,INK);
   }
  }
  c.restore();
 }
 bot(r,lane,look){
  const c=this.c,p=lanePoint(lane,r.dist[lane]),live=r.mode==='ride'&&r.active===lane,done=r.dist[lane]>=100;
  const [main,shade,hot]=look==='lime'&&lane===0?['#aaff53','#42c469','#d7ff32']:look==='pink'&&lane===1?['#ffa5ed','#fe4fba','#b82eff']:colors[lane];
  const wave=live?Math.sin(this.elapsed*22):0,bob=live?Math.sin(this.elapsed*22)*2.3:Math.sin(this.elapsed*3+lane)*1.2;
  this.oval(p.x,p.y+5,34*p.s,9*p.s,'#17093889');
  c.save();c.translate(p.x,p.y+bob*p.s);c.scale(p.s,p.s);c.rotate(live?wave*.046:(lane?.045:-.045));
  if(live){
   for(let i=0;i<4;i++)this.line([[(i-1.5)*8,3],[(i-1.5)*10,15+(i%2)*7+wave*2]],i%2?main:PAPER,2.1);
   this.poly([[-12,-7],[0,29+wave*4],[12,-7]],hot,INK,2);
   this.poly([[-7,-8],[0,17],[7,-8]],PAPER,null);
  }
  for(const s of [-1,1]){
   const x=s*19,footY=wave*s*3;
   this.round(x-7,-15+footY,14,14,5,'#2b235d',INK,2.7);
   this.round(x-12,-5+footY,24,10,4,shade,INK,2.7);
   this.line([[x-7,-2+footY],[x+7,-2+footY]],main,2);
  }
  this.poly([[-23,-34],[-36,-26],[-29,-8],[-21,-16]],shade,INK,2.7);
  this.poly([[23,-34],[36,-26],[29,-8],[21,-16]],shade,INK,2.7);
  this.round(-25,-40,50,32,10,shade,INK,3);
  this.round(-15,-32,30,15,5,main,INK,2.2);
  this.text(lane?'◆':'▲',0,-24,11,INK);
  this.line([[5,-66],[12,-78]],INK,3.5);this.oval(12,-80,5,5,live?main:hot,INK,2);
  this.round(-34,-59,15,21,6,hot,INK,2.8);
  this.round(19,-59,15,21,6,hot,INK,2.8);
  this.round(-29,-71,58,42,14,main,INK,3.2);
  this.round(-21,-61,42,24,9,'#211b59',INK,2.2);
  this.line([[-19,-65],[-13,-67],[10,-67]],PAPER,2.7);
  const blink=!live&&Math.sin(this.elapsed*2.1+lane*3)>.992;
  for(const x of [-8,8]){
   if(done)this.line([[x-4,-48],[x,-52],[x+4,-48]],PAPER,2.5);
   else this.round(x-3.2,-54,6.4,blink?2:10,2.7,PAPER,null);
  }
  if(live){this.oval(0,-96,10,10,main,INK,2.2);this.text('↯',0,-96,14,INK);}
  else if(done){this.oval(0,-96,10,10,'#9aff63',INK,2.2);this.text('✓',0,-96,13,INK);}
  c.restore();
 }
 burst(event){
  const p=lanePoint(event.lane,event.at??25),color=event.type==='hit'?'#ff528d':event.lane?'#5effff':'#fcff44';
  for(let i=0;i<18;i++){
   const a=i*2.399,v=40+rng(i+event.at)*112;
   this.fx.push({x:p.x,y:p.y-14,vx:Math.cos(a)*v,vy:Math.sin(a)*v-25,life:.26+rng(i+83)*.34,age:0,color,size:2+rng(i+12)*5});
  }
  if(this.fx.length>84)this.fx.splice(0,this.fx.length-84);
 }
 render(r,dt,look,quiet=false){
  this.elapsed+=dt;
  if(this.backLevel!==r.level)this.backdrop(r.level);
  const c=this.c,w=this.canvas.width,h=this.canvas.height;
  c.setTransform(1,0,0,1,0,0);c.fillStyle=LEVELS[r.level].dark;c.fillRect(0,0,w,h);
  const sx=w/390,sy=h/540,scale=Math.min(sx,sy*1.24),height=h/540;
  c.setTransform(scale,0,0,height,(w-scale*390)/2,0);c.lineJoin='round';c.lineCap='round';
  c.drawImage(this.back,0,0,390,540);
  if(r.mode==='ready'&&r.level===0){
   this.text('ONE BATTERY.',195,56,23,PAPER,'center',true);
   this.text('TWO BOTS.',195,79,23,'#fdff4a','center',true);
  }
  const entities=[];
  LEVELS[r.level].gates.forEach((line,lane)=>line.forEach((d,j)=>entities.push({d,draw:()=>this.gate(r,lane,j)})));
  for(let lane=0;lane<2;lane++)entities.push({d:r.dist[lane],draw:()=>this.bot(r,lane,look)});
  entities.sort((a,b)=>b.d-a.d).forEach(e=>e.draw());
  this.fx=this.fx.filter(f=>f.age<f.life);
  for(const f of this.fx){
   f.age+=dt;f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=200*dt;
   if(!quiet){c.globalAlpha=clamp(1-f.age/f.life,0,1);this.spark(f.x,f.y,f.size,f.color,f.age*8);}
  }
  c.globalAlpha=1;
 }
}
