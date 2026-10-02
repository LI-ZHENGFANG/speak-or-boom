const fs = require('fs'), vm = require('vm'), assert = require('assert');
const source = fs.readFileSync('app.js','utf8');
function part(start,end){return source.slice(source.indexOf(start),source.indexOf(end));}
const nodes = {}, pending=[]; let microphoneStarts=0, resumes=0, frames=0;
const c={G:{state:'waiting',scenarioId:'coffee',roundIdx:0,rounds:[{id:1,chapter:'Cafe',agent:'Hello',user:'Hi',keywords:['hi']}],stats:{pauses:0}},
  window:{},$:id=>nodes[id]||(nodes[id]={classList:{add(){},remove(){}}}),
  currentRound(){return c.G.rounds[c.G.roundIdx];},agentLine:r=>r.agent,speakerLabel:()=> 'BARISTA',
  stopRec(){},updateHudLine(){},speakBarista(){return new Promise((resolve,reject)=>pending.push({resolve,reject}));},
  AudioSys:{ctx:{async resume(){resumes++;}},frame(){frames++;}}, resetLineCounters(){c.G.silenceMs=0;},
  renderUserLine(){},bombHide(){},startRec(){microphoneStarts++;},
  pauseSession(){c.G.state='paused';c.G.voiceTurn++;},requestAnimationFrame(){},lastT:0,micTesting:false,
  micFeedback(){},updateKtv(){},bombStage(){},tryCompleteLine(){},Math,Promise
};
vm.createContext(c);
vm.runInContext(part('async function runRound()', 'function tryCompleteLine()')+part('function practiceRounds(', 'function speakerLabel(')+part('function tick(t)', 'requestAnimationFrame(tick);\ndocument.addEventListener'),c);
(async()=>{
  const first=c.runRound();
  assert.equal(c.G.state,'barista'); c.tick(100); c.tick(200);
  assert.equal(frames,0,'No VAD or silence timer during audio');
  c.pauseSession(); c.G.state='barista'; const second=c.runRound();
  pending[0].resolve(); await first;
  assert.equal(c.G.state,'barista'); assert.equal(microphoneStarts,0,'Stale finished audio cannot open microphone');
  pending[1].resolve(); await second;
  assert.equal(c.G.state,'waiting'); assert.equal(microphoneStarts,1);
  assert.equal(resumes,1,'Only current audio may resume audio context');
  const third=c.runRound();pending[2].reject(new Error('404')); await third;
  assert.equal(c.G.state,'paused');assert.match(nodes['tts-error'].textContent,/不会开启沉默/);
  c.G.reverseRoles=true;
  const original=c.G.rounds[0], swapped=c.practiceRounds(c.G.rounds);
  assert.equal(swapped[0].agent,'Hi'); assert.equal(swapped[0].user,'Hello');
  assert.equal(swapped[0].audioAgentRole,'user'); assert.equal(swapped[0].audioUserRole,'agent');
  assert.equal(original.user,'Hi','Never mutate original scripts or manifest text');
  console.log('PASS: audio blocks silence/VAD; interrupted stale turns cannot advance; load errors pause; role reversal preserves script and audio mapping.');
})().catch(e=>{console.error(e);process.exitCode=1;});
