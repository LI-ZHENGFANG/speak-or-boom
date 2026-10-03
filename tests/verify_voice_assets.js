const fs=require('fs'),vm=require('vm'),assert=require('assert'),crypto=require('crypto');
const c={window:{}};vm.createContext(c);
for(const p of ['coffee-script.js',...fs.readdirSync('scenarios').filter(p=>p.endsWith('.js')).map(p=>'scenarios/'+p),'voice-manifest.js'])vm.runInContext(fs.readFileSync(p,'utf8'),c);
const manifest=c.window.SPEAK_OR_BOOM_AUDIO;assert.equal(manifest.complete,true);
let clips=0,bytes=0,rounds=0,episodeSeconds=0;const files=new Set();
for(const [id,scene] of Object.entries(c.window.SPEAK_OR_BOOM_SCENARIOS)){
  const entries=manifest.scenarios[id];assert.equal(Object.keys(entries).length,scene.rounds.length);
  for(const r of scene.rounds){rounds++;
    for(const role of ['agent','user']){
      const e=entries[r.id][role],data=fs.readFileSync(e.src);
      assert.equal(e.text,role==='agent'?(r.agent||r.barista):r.user,`${id}/${r.id}/${role}: subtitle mismatch`);
      assert.equal(data.length,e.bytes);assert.equal(crypto.createHash('sha256').update(data).digest('hex'),e.sha256);
      assert.ok(data.slice(0,3).toString()==='ID3'||(data[0]===255&&(data[1]&224)===224),'MP3 header');
      assert.ok(e.seconds>0.25 && Number.isFinite(e.seconds));
      const words=(e.text.match(/\S+/g)||[]).length;
      assert.ok(e.seconds<Math.max(12,words*1.5+3),`${id}/${r.id}/${role}: unusually long clip for its sentence; check TTS corruption`);
      if(id==='movies'){assert.equal(e.voice,role==='user'?'avocado_v2:MAI_01':r.speaker==='JAKE'?'avocado_v2:ronan':'avocado_v2:myrtle');episodeSeconds+=e.seconds;}
      if(!files.has(e.src)){bytes+=data.length;files.add(e.src);}clips++;
    }
  }
}
assert.equal(clips,2728);assert.equal(rounds,1364);assert.equal(files.size,2168);
const shadow=c.window.SPEAK_OR_BOOM_SCENARIOS.shadow_bond;
assert.equal(shadow.rounds.length,80);assert.equal(shadow.ordered,true);
const chapters=['Midnight Briefing','Gearing Up','Arrival in Monaco','The Casino','Rooftop Chase','The Villa','The Trap','The Escape','Showdown','Debrief'];
shadow.rounds.forEach((r,i)=>{
  assert.equal(r.id,i+1);assert.equal(r.chapter,chapters[Math.floor(i/8)]);assert.equal(r.agent,r.user);
  const e=manifest.scenarios.shadow_bond[r.id];assert.deepEqual(e.agent,e.user);assert.equal(e.agent.voice,'avocado_v2:ronan');
});
assert.equal(fs.readdirSync('audio/shadow_bond').filter(p=>p.endsWith('.mp3')).length,80);
assert.equal(manifest.scenarios.movies['movies-008'].agent.sha256,'5a2b0fc136429ffdcf507f5ec6ee889ea7d23119cf193facf4bacc174988a99e');
assert.equal(fs.readdirSync('audio/movies').filter(p=>p.endsWith('.mp3')).length,280);
console.log(JSON.stringify({roleMappings:clips,uniqueClips:files.size,rounds,bytes,episodeClips:280,episodeSeconds,shadowClips:560,checks:['all text mappings','all SHA256 and sizes','MP3 headers','duration metadata','episode character voice IDs','ten shadowing chapters, identical text and shared files','Lucy repair retained']}));

const expectedShadows=[{"id": "shadow_bond", "title": "Codename: Nightfall", "speaker": "CROSS", "difficulty": "Intermediate", "voice": "avocado_v2:ronan", "rounds": 80, "chapters": ["Midnight Briefing", "Gearing Up", "Arrival in Monaco", "The Casino", "Rooftop Chase", "The Villa", "The Trap", "The Escape", "Showdown", "Debrief"]}, {"id": "shadow_chef", "title": "Fire & Thyme", "speaker": "ROSA", "difficulty": "Beginner", "voice": "avocado_v2:myrtle", "rounds": 80, "chapters": ["Welcome to My Kitchen", "The Ingredients", "First Cut", "Fire", "The Sizzle", "Patience", "The Plate", "The First Bite", "The Secret", "Mangia!"]}, {"id": "shadow_coach", "title": "Fourth Quarter", "speaker": "WEBB", "difficulty": "Beginner", "voice": "avocado_v2:ronan", "rounds": 80, "chapters": ["The Locker Room", "The Score", "No Excuses", "Remember Why", "One Play", "Trust", "The Stand", "The Roar", "Back Out", "The Whistle"]}, {"id": "shadow_comic", "title": "Open Mic", "speaker": "JENNY", "difficulty": "Advanced", "voice": "avocado_v2:MAI_02", "rounds": 80, "chapters": ["The Stage", "The Opener", "Dating Life", "My Parents", "The Day Job", "The Bomb", "The Recovery", "The Closer", "The Laugh", "Encore"]}, {"id": "shadow_court", "title": "The Verdict", "speaker": "COLE", "difficulty": "Advanced", "voice": "avocado_v2:ronan", "rounds": 80, "chapters": ["The Courtroom", "The Accused", "The Evidence", "The Witness", "The Motive", "The Timeline", "Reasonable Doubt", "The Human Cost", "The Ask", "The Verdict"]}, {"id": "shadow_noir", "title": "Midnight Alibi", "speaker": "MARLOWE", "difficulty": "Intermediate", "voice": "avocado_v2:MAI_03", "rounds": 80, "chapters": ["The Client", "The Photograph", "Rain on Fifth Street", "The Bar", "The Lie", "The Partner", "The Warehouse", "The Confession", "The Choice", "Last Cigarette"]}, {"id": "shadow_space", "title": "Starfall Protocol", "speaker": "REYES", "difficulty": "Intermediate", "voice": "avocado_v2:MAI_01", "rounds": 80, "chapters": ["Captain's Log", "The Signal", "Course Correction", "The Storm", "First Contact", "The Message", "The Choice", "The Descent", "The Discovery", "Homeward"]}];

assert.equal(Object.keys(c.window.SPEAK_OR_BOOM_SCENARIOS).length,13);
for(const expected of expectedShadows){
  const scene=c.window.SPEAK_OR_BOOM_SCENARIOS[expected.id];
  assert.equal(scene.rounds.length,80);assert.equal(scene.ordered,true);
  assert.equal(new Set(scene.rounds.map(r=>r.chapter)).size,10);
  scene.rounds.forEach((r,i)=>{
    assert.equal(r.id,i+1);assert.equal(r.agent,r.user);
    assert.equal(r.chapter,scene.rounds[Math.floor(i/8)*8].chapter);
    const e=manifest.scenarios[expected.id][r.id];
    assert.deepEqual(e.agent,e.user);assert.equal(e.agent.voice,expected.voice);
  });
  assert.equal(fs.readdirSync('audio/'+expected.id).filter(f=>f.endsWith('.mp3')).length,80);
}
console.log('PASS: seven shadowing stories, all ten chapter blocks and shared recordings verified.');
