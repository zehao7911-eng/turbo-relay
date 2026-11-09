const hz=midi=>440*2**((midi-69)/12);
const bass=[33,33,45,33,36,36,31,43];
const melody=[69,72,76,79,67,71,74,76,72,76,79,81,71,74,76,79];
export class RelayAudio {
 unlock(){
  try{
   if(!this.ctx){
    const Ctx=window.AudioContext||window.webkitAudioContext;if(!Ctx)return;
    const c=this.ctx=new Ctx(),master=c.createDynamicsCompressor();
    master.threshold.value=-16;master.ratio.value=6;master.connect(c.destination);
    this.music=c.createGain();this.music.gain.value=0;this.music.connect(master);
    this.effects=c.createGain();this.effects.gain.value=.72;this.effects.connect(master);
    this.noise=c.createBuffer(1,c.sampleRate*.24,c.sampleRate);
    const samples=this.noise.getChannelData(0);
    let seed=1827;
    for(let i=0;i<samples.length;i++){seed=(1664525*seed+1013904223)>>>0;samples[i]=seed/2147483648-1;}
    this.step=0;this.next=c.currentTime+.035;
   }
   this.ctx.resume().catch(()=>{});
  }catch{}
 }
 tone(start,hz0,hz1,length,amp,type,bus,cutoff){
  const c=this.ctx,o=c.createOscillator(),g=c.createGain();
  o.type=type;o.frequency.setValueAtTime(hz0,start);o.frequency.exponentialRampToValueAtTime(hz1,start+length);
  g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(amp,start+.008);
  g.gain.exponentialRampToValueAtTime(.0001,start+length);o.connect(g);
  if(cutoff){const f=c.createBiquadFilter();f.type='lowpass';f.frequency.value=cutoff;g.connect(f);f.connect(bus);}else g.connect(bus);
  o.start(start);o.stop(start+length+.015);
 }
 drum(start,frequency,length,amp,bus){
  const c=this.ctx,n=c.createBufferSource(),g=c.createGain(),f=c.createBiquadFilter();
  n.buffer=this.noise;f.type='highpass';f.frequency.value=frequency;
  g.gain.setValueAtTime(amp,start);g.gain.exponentialRampToValueAtTime(.0001,start+length);
  n.connect(f);f.connect(g);g.connect(bus);n.start(start);n.stop(start+length+.004);
 }
 update(active,intensity=0){
  const c=this.ctx;if(!c||c.state!=='running')return;
  const now=c.currentTime;
  if(active!==this.playing){
   this.playing=active;this.music.gain.cancelScheduledValues(now);this.music.gain.setTargetAtTime(active?.57:0,now,.042);
   if(active)this.next=now+.026;
  }
  if(!active)return;
  if(this.next<now-.03)this.next=now+.024;
  for(let n=0;this.next<now+.09&&n<4;n++){
   const s=this.step++,i=s%16,bar=Math.floor(s/16)%4,t=this.next;
   this.next+=60/168/4;
   if([0,6,10,14].includes(i))this.tone(t,131,43,.145,i===0?.48:.30,'sine',this.music);
   if(i===4||i===12){this.drum(t,1400,.15,.24,this.music);this.tone(t,200,98,.11,.19,'triangle',this.music);}
   if(i%2===0||i===15)this.drum(t,6500,i%4===2?.065:.032,i%4===2?.12:.073,this.music);
   if([0,2,3,6,8,10,11,14].includes(i)){
    const note=bass[(bar*2+(i>=8?1:0))%bass.length];
    this.tone(t,hz(note),hz(note)*.987,.16,.14,'sawtooth',this.music,420+intensity*550);
    this.tone(t,hz(note-12),hz(note-12),.15,.135,'sine',this.music);
   }
   if([1,5,9,13].includes(i)){
    const note=melody[bar*4+(i-1)/4];
    this.tone(t,hz(note),hz(note)*.998,.12,.066,'square',this.music,1750);
    if(intensity>.57)this.tone(t+.027,hz(note+12),hz(note+12),.09,.035,'triangle',this.music);
   }
  }
 }
 sfx(type){
  const c=this.ctx;if(!c||c.state!=='running')return;
  const t=c.currentTime,b=this.effects;
  if(type==='hit'){this.drum(t,420,.17,.32,b);this.tone(t,210,62,.20,.23,'sawtooth',b,700);return;}
  if(type==='switch'){this.tone(t,310,620,.085,.12,'triangle',b);return;}
  const seq={gate:[650,870],perfect:[660,990,1320],dock:[523,659,784],win:[523,659,784,1047],loss:[370,262,185],start:[330,440,660]}[type];
  seq?.forEach((f,i)=>this.tone(t+i*.061,f,f*.99,.16,.095,'triangle',b));
 }
}
