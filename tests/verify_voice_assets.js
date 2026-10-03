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
assert.equal(clips,1768);assert.equal(rounds,884);assert.equal(files.size,1688);
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
console.log(JSON.stringify({roleMappings:clips,uniqueClips:files.size,rounds,bytes,episodeClips:280,episodeSeconds,shadowClips:80,checks:['all text mappings','all SHA256 and sizes','MP3 headers','duration metadata','episode character voice IDs','ten shadowing chapters, identical text and shared files','Lucy repair retained']}));
