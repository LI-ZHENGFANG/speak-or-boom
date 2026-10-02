"""Read documented float voice data; build the numpy archive used by Kokoro ONNX."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import hashlib
import json
import urllib.request
import numpy as np

ROOT = Path(__file__).resolve().parent / 'voice-model'
BASE = 'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/voices/'

def get_voice(name):
    path = ROOT / (name + '.bin')
    if not path.exists():
        with urllib.request.urlopen(BASE + name + '.bin', timeout=30) as response:
            path.write_bytes(response.read())
    values = np.frombuffer(path.read_bytes(), dtype='<f4').copy()
    if values.size != 510 * 256 or not np.isfinite(values).all():
        raise ValueError('Unexpected voice file: ' + name)
    return name, values.reshape(510, 1, 256)

with ThreadPoolExecutor(max_workers=3) as pool:
    voices = dict(pool.map(get_voice, ['af_heart', 'af_bella', 'am_michael']))
with (ROOT / 'voices-v1.0.bin').open('wb') as output:
    np.savez(output, **voices)
record = {name: {'url': BASE + name + '.bin', 'sha256': hashlib.sha256((ROOT / (name + '.bin')).read_bytes()).hexdigest()} for name in voices}
(ROOT / 'voice-sources.json').write_text(json.dumps(record, indent=2), encoding='utf-8')
print('Three American English voice styles prepared.')
