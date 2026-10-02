const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const source = fs.readFileSync('app.js', 'utf8');
const begin = source.indexOf('const AudioSys =');
const end = source.indexOf('function setMicHud', begin);
let sample = 129, stopped = false, resumes = 0, hud = false;
const connections = [];
const analyser = {fftSize: 0, getByteTimeDomainData(buf){buf.fill(sample);}, connect(node){connections.push(node);}};
const sink = {gain:{value:1}, connect(node){connections.push(node);}};
const track = {stop(){stopped=true;}};
class AC {
  constructor(){this.state='suspended';this.destination={};}
  async resume(){resumes++;this.state='running';}
  createMediaStreamSource(){return {connect(node){connections.push(node);}};}
  createAnalyser(){return analyser;}
  createGain(){return sink;}
  close(){this.state='closed';}
}
const context = {window:{AudioContext:AC},navigator:{mediaDevices:{async getUserMedia(){assert.ok(resumes>0);return {getTracks(){return [track];}};}}},Uint8Array,Math,setMicHud(value){hud=value;}};
vm.createContext(context);
vm.runInContext(source.slice(begin,end)+'\nthis.audio = AudioSys;',context);
(async()=>{
  const audio=context.audio;
  await audio.init();
  assert.strictEqual(sink.gain.value,0,'Live audio must never feed audible microphone playback');
  assert.strictEqual(connections.length,3,'The analyser stays in an active output graph');
  assert.strictEqual(hud,true);
  // RMS 1/128 is below the old 0.025 minimum but is valid quiet speech.
  for(let i=0;i<4;i++)audio.frame(100);
  assert.strictEqual(audio.speaking,true,'Quiet sustained phone speech should count');
  sample=128;
  for(let i=0;i<3;i++)audio.frame(100);
  assert.strictEqual(audio.speaking,false,'Silence must stop speaking detection');
  audio.loudMs=0;audio.quietMs=0;
  sample=129;audio.frame(40);sample=128;audio.frame(30);sample=129;audio.frame(40);
  assert.strictEqual(audio.speaking,true,'Normal syllables separated by brief quiet dips must count');
  audio.speaking=false;audio.loudMs=0;audio.quietMs=0;
  sample=129;audio.frame(40);sample=128;audio.frame(150);
  assert.strictEqual(audio.speaking,false,'One short click must not count as speech');
  audio.ctx.state='suspended';
  await audio.init();
  assert.strictEqual(audio.ctx.state,'running','Existing streams must resume their audio context');
  audio.stop();
  assert.strictEqual(stopped,true);
  assert.strictEqual(audio.stream,null);
  analyser.getFloatTimeDomainData = buf => buf.fill(0.004);
  await audio.init();
  assert.ok(Math.abs(audio.rms()-0.004)<0.000001,'Weak microphone audio needs float precision');
  audio.frame(80);
  assert.strictEqual(audio.speaking,true);
  audio.stop();
  const visible = new Set();
  context.$ = id => ({classList:{add(){visible.delete(id);},remove(){visible.add(id);}}});
  context.window.scrollTo = () => {};
  vm.runInContext(source.slice(source.indexOf('function show(id)'),source.indexOf('let toastTimer')),context);
  context.showScreen('mictest');
  assert.deepStrictEqual(Array.from(visible),['screen-mictest']);
  context.showScreen('start');
  assert.deepStrictEqual(Array.from(visible),['screen-start'],'Returning must hide the calibration screen');
  assert.strictEqual(hud,false);
  context.navigator.mediaDevices.getUserMedia=async()=>{throw new Error('denied');};
  await assert.rejects(()=>audio.init(),/denied/);
  assert.strictEqual(audio.ctx,null,'Denied permission must clean up the context');
  assert.strictEqual(audio.stream,null);
  let advanced=false;
  context.MS_PER_WORD=260;context.clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  context.currentRound=()=>({user:'I am going to make him an offer he cannot refuse'});
  context.G={state:'waiting',lineSpeakMs:3400,silenceMs:1200,kwMatched:{}};
  context.completeLine=()=>{advanced=true;};
  vm.runInContext(source.slice(source.indexOf('function needSpeakMs'),source.indexOf('/* ================= game state')) + source.slice(source.indexOf('function tryCompleteLine()'),source.indexOf('function completeLine()')),context);
  context.tryCompleteLine();
  assert.strictEqual(advanced,true,'A normally paced sentence must advance without Android speech recognition');
  const trialStatus = {textContent:''};
  context.$ = () => trialStatus;
  context.audio.speaking=true;
  // Trial runs the same completion predicate, without stake or bomb paths.
  vm.runInContext('let micTrial = {speakMs:0,silenceMs:0};' + source.slice(source.indexOf('function updateMicTrial'),source.indexOf('function saveMicThreshold')),context);
  for(let i=0;i<24;i++) context.updateMicTrial(100);
  context.audio.speaking=false;
  for(let i=0;i<12;i++) context.updateMicTrial(100);
  assert.ok(trialStatus.textContent.includes('这句已完成'),'Free trial should complete normal speech and release');
  let homeShown=false, micOpened=false, noteVisible=false;
  context.store={data:{balance:0}};
  context.refreshStartScreen=()=>{};
  context.showScreen=name=>{homeShown=name==='start';};
  const lowBalanceNote={style:{},textContent:'',scrollIntoView(){noteVisible=true;}};
  context.$=()=>lowBalanceNote;
  vm.runInContext(source.slice(source.indexOf('async function beginSession()'),source.indexOf('function startTimerLoop()')),context);
  await context.beginSession();
  assert.ok(homeShown && noteVisible && lowBalanceNote.textContent.includes('虚拟余额不足'),'Retry must visibly explain insufficient virtual balance');
  console.log('PASS: quiet speech, silence, silent processing graph, context resume and permission cleanup.');
})().catch(error=>{console.error(error);process.exitCode=1;});
