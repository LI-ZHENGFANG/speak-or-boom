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
c.Math.random=()=>{throw new Error('Random dialogue order is forbidden');};
vm.createContext(c);
for(const file of ['coffee-script.js',...fs.readdirSync('scenarios').filter(f=>f.endsWith('.js')).map(f=>'scenarios/'+f)])
  vm.runInContext(fs.readFileSync(file,'utf8'),c);
c.getScenario=id=>c.window.SPEAK_OR_BOOM_SCENARIOS[id];
c.currentRound=()=>c.G.rounds[c.G.roundIdx];
function part(a,b){return source.slice(source.indexOf(a),source.indexOf(b));}
vm.runInContext(part('function agentLine(', '/* ---- KTV')+
  part('async function beginSession()', 'function startTimerLoop()')+
  part('function completeLine()', '/* ================= session control'),c);
(async()=>{
  let verified=0;
  for(const [scenarioId,story] of Object.entries(c.window.SPEAK_OR_BOOM_SCENARIOS)){
  c.G.scenarioId=scenarioId;c.store.data.balance=10;c.nodes['reverse-roles']={checked:false,style:{}};
  const ids=story.rounds.map(r=>r.id).join(',');
  assert.equal(story.ordered,true,scenarioId+' must declare ordered:true');
  await c.beginSession();
  assert.equal(c.G.rounds.map(r=>r.id).join(','),ids,'First session must start at scene 1 and keep the entire story order');
  c.G.roundIdx=story.rounds.length-1;c.completeLine();
  assert.equal(c.G.loop,2);assert.equal(c.G.roundIdx,0);
  assert.equal(c.G.rounds.map(r=>r.id).join(','),ids,'Replay must also preserve the plot');
  assert.match(c.notice,/按剧情顺序重播/);
  c.nodes['reverse-roles'].checked=true;await c.beginSession();
  assert.equal(c.G.rounds.map(r=>r.id).join(','),ids,'Reversal must not shuffle the story');
  for(let i=0;i<story.rounds.length;i++){
    const r=c.G.rounds[i],o=story.rounds[i];
    assert.equal(r.agent,o.user);assert.equal(r.user,o.agent);
    assert.equal(r.audioAgentRole,'user');assert.equal(r.audioUserRole,'agent');
  }
  verified++;
  }
  assert.equal(verified,7);
  const drills=[{id:'a',chapter:'A'},{id:'b',chapter:'B'},{id:'c',chapter:'B'}];
  assert.equal(c.buildPlayOrder(drills,{}).map(r=>r.id).join(','),'a,b,c','Even a future scenario without ordered metadata must preserve order');
  console.log('PASS: all seven actual session starts, full replays and reversed roles preserve every dialogue; no random fallback.');
})().catch(e=>{console.error(e);process.exitCode=1;});
