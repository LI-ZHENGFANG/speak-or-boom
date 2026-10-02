const fs = require('fs'), vm = require('vm'), assert = require('assert');
const source = fs.readFileSync('app.js','utf8');
let utterance, timeout, cleared=false;
const context = {
  window:{speechSynthesis:{}},
  speechSynthesis:{cancel(){},speak(u){utterance=u;}},
  SpeechSynthesisUtterance:class {constructor(text){this.text=text;}},
  pickVoice:()=>null,
  voicePrefs:{rate:0.75},
  setTimeout(fn){timeout=fn;return 1;},
  clearTimeout(){cleared=true;}, Math
};
vm.createContext(context);
vm.runInContext(source.slice(source.indexOf('function speakSystemVoice('),source.indexOf('async function testBaristaVoice')),context);
(async()=>{
  let resolved=false;
  const ok=context.speakSystemVoice('Hello').then(()=>{resolved=true;});
  assert.strictEqual(utterance.rate,0.75);
  await Promise.resolve();
  assert.strictEqual(resolved,false,'No user turn until actual TTS completion');
  utterance.onend();await ok;
  assert.ok(cleared);
  context.pickVoice=()=>({lang:'en-GB'});
  context.voicePrefs.rate=0.6;
  const british=context.speakSystemVoice('Welcome');
  assert.strictEqual(utterance.lang,'en-GB');
  assert.strictEqual(utterance.rate,0.6);
  utterance.onend();await british;
  const error=context.speakSystemVoice('Hello');
  utterance.onerror({error:'language-unavailable'});
  await assert.rejects(error,/language-unavailable/);
  const stalled=context.speakSystemVoice('Hello');timeout();
  await assert.rejects(stalled,/超时/);
  console.log('PASS: TTS requires onend; engine errors and timeouts are failures, not completed barista turns.');
})().catch(e=>{console.error(e);process.exitCode=1;});
