#!/usr/bin/env python3
"""Generate all 280 voice clips for Ship It! Ep.1 (movies scenario).
Voice casting (Meta AI, American English):
  JAKE (agent lines) -> avocado_v2:ronan   (M, Casual)
  LUCY (agent lines) -> avocado_v2:myrtle  (F, Kindly)
  MIA  (user lines)  -> avocado_v2:MAI_01   (Aria, F, Warm)
Output: audio/movies/movies-NNN-{agent,user}.mp3
Also writes /tmp/voice-ep1/movies-manifest-section.json for manifest rebuild.
"""
import json, os, re, subprocess, hashlib, sys, time
from concurrent.futures import ThreadPoolExecutor

WORK = '/home/hatch/workspace/speak-or-boom'
SCENARIO_JS = WORK + '/scenarios/movies.js'
OUT_DIR = WORK + '/audio/movies'
MANIFEST_OUT = '/tmp/voice-ep1/movies-manifest-section.json'
LOG = '/tmp/voice-ep1/progress.log'

VOICES = {'JAKE': 'avocado_v2:ronan', 'LUCY': 'avocado_v2:myrtle', 'MIA': 'avocado_v2:MAI_01'}
TTS = '/opt/hatch/bin/tts'
MAX_WORKERS = 6

os.makedirs(OUT_DIR, exist_ok=True)
os.makedirs(os.path.dirname(MANIFEST_OUT), exist_ok=True)

def log(msg):
    line = '[%s] %s' % (time.strftime('%H:%M:%S'), msg)
    print(line, flush=True)
    with open(LOG, 'a') as f:
        f.write(line + '\n')

# --- parse rounds from scenario JS via node ---
node_code = """
const fs=require('fs');
const src=fs.readFileSync(%s,'utf8');
const fn=new Function('window',src+'; return window.SPEAK_OR_BOOM_SCENARIOS;');
const rounds=fn({}).movies.rounds;
console.log(JSON.stringify(rounds.map(r=>({id:r.id,speaker:r.speaker,agent:r.agent,user:r.user}))));
""" % json.dumps(SCENARIO_JS)
out = subprocess.run(['node','-e',node_code],capture_output=True,text=True)
if out.returncode != 0:
    log('FATAL: node parse failed: '+out.stderr[:500]); sys.exit(1)
rounds = json.loads(out.stdout)
log('parsed %d rounds' % len(rounds))

def ffprobe_duration(path):
    r = subprocess.run(['ffprobe','-v','error','-show_entries','format=duration',
                        '-of','csv=p=0',path],capture_output=True,text=True,timeout=30)
    return round(float(r.stdout.strip()),3)

def sha256_file(path):
    h=hashlib.sha256()
    with open(path,'rb') as f:
        for c in iter(lambda:f.read(65536),b''): h.update(c)
    return h.hexdigest()

def gen_one(text, voice, path):
    """Generate one clip with one retry. Returns (ok, err)."""
    for attempt in (1,2):
        try:
            p = subprocess.run([TTS,'speak','--voice',voice,'--output',path,'--text-stdin'],
                               input=text.encode('utf-8'),capture_output=True,timeout=240)
            if p.returncode==0 and os.path.getsize(path)>1000:
                return True, ''
            err = (p.stderr or p.stdout).decode('utf-8','ignore')[:200]
        except Exception as e:
            err = str(e)[:200]
        log('retry %s attempt %d: %s' % (os.path.basename(path),attempt,err))
        time.sleep(5)
    return False, err

jobs=[]
for r in rounds:
    rid=r['id']
    jobs.append((r['agent'], VOICES[r['speaker']], os.path.join(OUT_DIR,rid+'-agent.mp3'), rid,'agent',r['agent']))
    jobs.append((r['user'],  VOICES['MIA'],        os.path.join(OUT_DIR,rid+'-user.mp3'),  rid,'user', r['user']))
log('total jobs: %d' % len(jobs))

failed=[]
done=[0]
def run(job):
    text,voice,path,rid,role,orig_text=job
    ok,err=gen_one(text,voice,path)
    done[0]+=1
    if not ok:
        failed.append((path,err))
    if done[0]%40==0:
        log('progress %d/%d' % (done[0],len(jobs)))
    return ok

t0=time.time()
with ThreadPoolExecutor(max_workers=MAX_WORKERS) as ex:
    list(ex.map(run,jobs))
log('generation done in %.0fs, failed=%d' % (time.time()-t0,len(failed)))
if failed:
    for p,e in failed: log('FAILED %s :: %s'%(p,e))
    sys.exit(2)

# --- verify + build manifest section ---
section={}
for r in rounds:
    rid=r['id']
    entry={}
    for role,text in (('agent',r['agent']),('user',r['user'])):
        path=os.path.join(OUT_DIR,rid+'-'+role+'.mp3')
        # validate MP3 header
        with open(path,'rb') as f: head=f.read(4)
        assert head[:3]==b'ID3' or head[:2]==b'\xff\xfb' or head[0]==0xFF, 'bad mp3 '+path
        voice = VOICES[r['speaker']] if role=='agent' else VOICES['MIA']
        entry[role]={'seconds':ffprobe_duration(path),'voice':voice,'text':text,
                     'bytes':os.path.getsize(path),'sha256':sha256_file(path),
                     'src':'audio/movies/'+rid+'-'+role+'.mp3'}
    section[rid]=entry

with open(MANIFEST_OUT,'w',encoding='utf-8') as f:
    json.dump(section,f,ensure_ascii=False)
log('manifest section written: %s (%d rounds)'%(MANIFEST_OUT,len(section)))

# final count check
files=[f for f in os.listdir(OUT_DIR) if f.endswith('.mp3')]
log('mp3 files in %s: %d'%(OUT_DIR,len(files)))
assert len(files)>=280, 'expected >=280 mp3 files'
log('ALL DONE')
