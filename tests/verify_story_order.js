const fs=require('fs'),vm=require('vm'),assert=require('assert');
const source=fs.readFileSync('app.js','utf8');
const c={window:{},Math:Object.create(Math),G:{scenarioId:'movies',lineSpeakMs:1000,silenceMs:600},
  store:{data:{balance:10,sessions:0},save(){}},nodes:{},
  $:id=>c.nodes[id]||(c.nodes[id]={checked:false,style:{}}),
  document:{querySelector(){return {dataset:{min:'60'}};}},
  performance:{now(){return 1;}},AudioSys:{async init(){}},
  freshStats(){return {linesDone:0,speakMs:0,longestSilence:0};},
  showScreen(){},startTimerLoop(){},runRound(){c.started++;},started:0,
  stopRec(){},toast(text){c.notice=text;},parseInt};
c.Math.random=()=>0;
vm.createContext(c);
vm.runInContext(fs.readFileSync('scenarios/movies.js','utf8'),c);
const story=c.window.SPEAK_OR_BOOM_SCENARIOS.movies;
c.getScenario=()=>story;
c.currentRound=()=>c.G.rounds[c.G.roundIdx];
function part(a,b){return source.slice(source.indexOf(a),source.indexOf(b));}
vm.runInContext(part('function agentLine(', '/* ---- KTV')+
  part('async function beginSession()', 'function startTimerLoop()')+
  part('function completeLine()', '/* ================= session control'),c);
(async()=>{
  const ids=story.rounds.map(r=>r.id).join(',');
  assert.equal(story.rounds.length,140);
  assert.equal(new Set(story.rounds.map(r=>r.chapter)).size,10);
  await c.beginSession();
  assert.equal(c.G.rounds.map(r=>r.id).join(','),ids,'First session must start at scene 1 and keep the entire story order');
  c.G.roundIdx=139;c.completeLine();
  assert.equal(c.G.loop,2);assert.equal(c.G.roundIdx,0);
  assert.equal(c.G.rounds.map(r=>r.id).join(','),ids,'Replay must also preserve the plot');
  assert.match(c.notice,/按剧情顺序重播/);
  c.nodes['reverse-roles'].checked=true;await c.beginSession();
  assert.equal(c.G.rounds.map(r=>r.id).join(','),ids,'Reversal must not shuffle the story');
  for(let i=0;i<140;i++){
    const r=c.G.rounds[i],o=story.rounds[i];
    assert.equal(r.agent,o.user);assert.equal(r.user,o.agent);
    assert.equal(r.audioAgentRole,'user');assert.equal(r.audioUserRole,'agent');
  }
  const drills=[{id:'a',chapter:'A'},{id:'b',chapter:'B'},{id:'c',chapter:'B'}];
  assert.equal(c.buildPlayOrder(drills,{}).map(r=>r.id).join(','),'b,c,a','Other scenarios still shuffle chapters, preserving internal order');
  console.log('PASS: actual session start, full story replay and all reversed roles preserve episode order; other drills still shuffle.');
})().catch(e=>{console.error(e);process.exitCode=1;});
