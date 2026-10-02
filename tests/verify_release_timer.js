const fs = require('fs');
const vm = require('vm');
const assert = require('assert');
const source = fs.readFileSync('app.js', 'utf8');
const css = fs.readFileSync('style.css', 'utf8');
function between(start, next) {
  return source.slice(source.indexOf('function ' + start), source.indexOf('function ' + next));
}
const nodes = {};
let now = 16000;
const c = {
  G: {state:'waiting', elapsedBeforePause:2000, resumeStamp:3000, stats:{pauses:0,speakMs:0}, rounds:[{}], roundIdx:0},
  performance:{now:()=>now},
  $: id => nodes[id] || (nodes[id] = {}),
  stopRec(){}, clearInterval(){}, boomSound(){}, setTimeout(){},
  stopVoicePlayback(){}, currentRound(){return {user:'Hello'};},
  speechSynthesis:{cancel(){}}, AudioSys:{suspend(){},stop(){},resume(){}},
  window:{}, startTimerLoop(){}, runRound(){c.G.replayCalled=true;},
  show(id){nodes[id] = {visible:true};}, hide(){}, showScreen(){}, rows(){return '';},
  store:{data:{balance:9,fail:0,lost:0,speakMs:0},save(){}},
  fmtClock(s){return Math.floor(s/60).toString().padStart(2,'0') + ':' + Math.floor(s%60).toString().padStart(2,'0');},
  fmtMoney(v){return v.toFixed(2);}, freshStats(){return {pauses:0,speakMs:0};}
};
vm.createContext(c);
vm.runInContext(between('sessionElapsedMs()', 'sessionRemainingMs()') +
  between('pauseSession()', 'resumeSession()') +
  between('doBoom()', 'finishWin()') +
  between('finishFail(reason, exploded)', 'rows(pairs)'), c);
assert.strictEqual(c.sessionElapsedMs(),15000);
c.pauseSession();
assert.strictEqual(c.G.state,'paused');
assert.strictEqual(c.G.elapsedBeforePause,15000);
now = 21000;
assert.strictEqual(c.sessionElapsedMs(),15000);
assert.strictEqual(nodes['paused-overlay'].visible,true);
vm.runInContext(between('resumeSession()', 'endSessionEarly()'), c);
c.G.resumeState='barista';c.resumeSession();
assert.strictEqual(c.G.state,'barista','Resuming an interrupted agent must actually replay, not remain paused');
assert.strictEqual(c.G.replayCalled,true);
c.G.state='waiting'; c.G.resumeStamp=now; now=25000;
c.doBoom();
assert.strictEqual(c.G.elapsedBeforePause,19000);
now=28000; c.finishFail('12 seconds of silence',true);
assert.strictEqual(nodes['fail-sub'].textContent,'You survived 00:19');
assert.ok(/#bomb-overlay\s*\{[^}]*pointer-events:\s*none/.test(css));
console.log('PASS: elapsed time freezes at pause/end; failure retains full duration; warning overlay permits control clicks.');
