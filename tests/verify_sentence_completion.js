const fs=require('fs'),vm=require('vm'),assert=require('assert');
const s=fs.readFileSync('app.js','utf8');
const c={Math,Number,Uint8Array,window:{},navigator:{},setMicHud(){},G:{state:'waiting'}};
vm.createContext(c);
vm.runInContext(s.slice(s.indexOf('const AudioSys ='),s.indexOf('function setMicHud'))+'this.audio=AudioSys;'+
  s.slice(s.indexOf('function sentenceCoverage('),s.indexOf('function checkKeywords('))+
  s.slice(s.indexOf('function speechDurationComplete('),s.indexOf('function completeLine(')),c);
let level=.0024;c.audio.rms=()=>level;
// Persistent room noise just below the fixed threshold, with short higher bursts.
for(let i=0;i<200;i++){level=i%20===0?.0034:.0024;c.audio.frame(16);}
assert.equal(c.audio.speaking,false,'Room noise must not permanently hide an end-of-sentence pause');
level=.025;for(let i=0;i<10;i++)c.audio.frame(16);
assert.equal(c.audio.speaking,true,'Normal voice remains detectable after noise adaptation');
level=.0024;for(let i=0;i<60;i++)c.audio.frame(16);
assert.equal(c.audio.speaking,false);
assert.equal(c.speechDurationComplete(1200,600,1200),true);
assert.equal(c.speechDurationComplete(1200,200,1200),false,'Do not advance at a tiny consonant pause');
assert.equal(c.sentenceCoverage('alternate','Is there an alternate view here?')>=.8,false,'One keyword must not count as a whole sentence');
assert.equal(c.sentenceCoverage('regular temperature is fine','Regular temperature is fine.'),1);
assert.equal(c.sentenceCoverage('Can I get a medium latte please','Can I get a medium latte, please?'),1,'Comma does not block coverage');
console.log('PASS: noisy-room pause recovery; speech still detects; short pauses do not finish; full final transcripts ignore punctuation without accepting one keyword.');
