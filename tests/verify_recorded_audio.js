const fs=require('fs'),vm=require('vm'),assert=require('assert');
let instance,timeout;
class Media {
  constructor(){instance=this;this.paused=true;}
  play(){this.paused=false;return Promise.resolve();}
  pause(){this.paused=true;}
  removeAttribute(){this.src='';}
  load(){}
}
const c={window:{SPEAK_OR_BOOM_AUDIO:{scenarios:{coffee:{1:{agent:{src:'audio/coffee/1-agent.mp3',seconds:2}}}}}},Audio:Media,setTimeout(fn){timeout=fn;return 1;},clearTimeout(){},Uint8Array,DataView,btoa:s=>Buffer.from(s,'binary').toString('base64'),Math};
vm.createContext(c);
vm.runInContext(fs.readFileSync('recorded-audio.js','utf8'),c);
(async()=>{
  const player=c.window.SOBRecorded;
  const clip=player.entry('coffee',1,'agent');
  assert.strictEqual(clip.src,'audio/coffee/1-agent.mp3');
  player.unlock(); assert.ok(instance.src.startsWith('data:audio/wav;base64,'));
  let ended=false;
  const p=player.play(clip,0.75).then(()=>{ended=true;});
  await Promise.resolve();assert.strictEqual(ended,false);
  assert.strictEqual(instance.playbackRate,0.75);assert.strictEqual(instance.preservesPitch,true);
  instance.onended(); await p;
  const interrupted=player.play(clip,1);player.stop();await assert.rejects(interrupted,/interrupted/);
  const missing=player.play(clip,1);instance.onerror();await assert.rejects(missing,/未能播放/);
  const stalled=player.play(clip,1);timeout();await assert.rejects(stalled,/超时/);
  const rejected=player.play(undefined,1);await assert.rejects(rejected,/尚未加载/);
  console.log('PASS: recorded audio completes only at onended; cancellation, load failure and timeout reject; pitch and rate are preserved.');
})().catch(e=>{console.error(e);process.exitCode=1;});
