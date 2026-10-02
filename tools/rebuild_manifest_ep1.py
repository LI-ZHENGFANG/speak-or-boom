#!/usr/bin/env python3
"""Rebuild voice-manifest.js: replace the movies scenario section with the
newly generated Ep.1 clips, keep all other scenarios untouched.
Also refreshes the top-level engine note for provenance honesty.
"""
import json, re, sys

WORK = '/home/hatch/workspace/speak-or-boom'
MANIFEST = WORK + '/voice-manifest.js'
SECTION = '/tmp/voice-ep1/movies-manifest-section.json'

raw = open(MANIFEST, encoding='utf-8').read()
m = re.match(r'window\.SPEAK_OR_BOOM_AUDIO = (\{.*\})\s*;?\s*$', raw, re.S)
if not m:
    print('FATAL: manifest wrapper not recognized'); sys.exit(1)
manifest = json.loads(m.group(1))

section = json.load(open(SECTION, encoding='utf-8'))
assert len(section) == 140, 'section has %d rounds, expected 140' % len(section)

# sanity: every round has agent+user with all fields, text matches scenario JS
node_check = """const fs=require('fs');
const src=fs.readFileSync(%s,'utf8');
const fn=new Function('window',src+'; return window.SPEAK_OR_BOOM_SCENARIOS;');
const rounds=fn({}).movies.rounds;
const sec=JSON.parse(fs.readFileSync(%s,'utf8'));
let bad=0;
for(const r of rounds){
  const e=sec[r.id];
  if(!e){console.log('missing '+r.id);bad++;}
  else{
    if(e.agent.text!==r.agent){console.log('agent text mismatch '+r.id);bad++;}
    if(e.user.text!==r.user){console.log('user text mismatch '+r.id);bad++;}
    for(const role of ['agent','user'])
      for(const k of ['seconds','voice','text','bytes','sha256','src'])
        if(!(k in e[role])){console.log('missing field '+r.id+' '+role+' '+k);bad++;}
  }
}
console.log(bad?('FAIL '+bad):'TEXT MATCH OK');
""" % (json.dumps(WORK + '/scenarios/movies.js'), json.dumps(SECTION))
import subprocess
out = subprocess.run(['node', '-e', node_check], capture_output=True, text=True)
print(out.stdout.strip())
if 'FAIL' in out.stdout:
    sys.exit(1)

old_n = len(manifest['scenarios']['movies'])
manifest['scenarios']['movies'] = section
manifest['engine'] = 'Kokoro-82M v1.0 + Meta AI TTS (movies Ep.1; see VOICE-NOTICE.txt)'

with open(MANIFEST, 'w', encoding='utf-8') as f:
    f.write('window.SPEAK_OR_BOOM_AUDIO = ')
    json.dump(manifest, f, ensure_ascii=False)
    f.write(';')

print('rebuilt: movies %d -> %d rounds; engine=%s' % (old_n, len(section), manifest['engine']))
print('scenarios now:', sorted(manifest['scenarios'].keys()))
