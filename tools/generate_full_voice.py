"""Generate every scripted line. Python 3.8 syntax; run in the approved TTS tool environment."""
import argparse
import hashlib
import json
import time
from pathlib import Path

import lameenc
import numpy as np
from kokoro_onnx import Kokoro

ROOT = Path(__file__).resolve().parent
DIST = ROOT / 'speak-or-boom-product' / 'dist'
MODEL = ROOT / 'voice-model'
RATE = 0.95
SCENE_VOICES = {
    'coffee': ('af_heart', 'af_bella'),
    'airport': ('af_bella', 'af_heart'),
    'hotel': ('af_heart', 'af_bella'),
    'interview': ('am_michael', 'af_heart'),
    'movies': ('am_michael', 'af_heart'),
    'restaurant': ('am_michael', 'af_bella'),
}

def encode(samples, sample_rate):
    encoder = lameenc.Encoder()
    encoder.set_bit_rate(96)
    encoder.set_in_sample_rate(sample_rate)
    encoder.set_channels(1)
    encoder.set_quality(2)
    pcm = (np.clip(samples, -1, 1) * 32767).astype('<i2').tobytes()
    return bytes(encoder.encode(pcm)) + bytes(encoder.flush())

def generate(model, text, voice, path):
    signature = hashlib.sha256((text + '\n' + voice + '\n' + str(RATE)).encode('utf-8')).hexdigest()
    record_path = ROOT / 'voice-quality' / path.parent.name / (path.stem + '.json')
    record_path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and record_path.exists():
        previous = json.loads(record_path.read_text(encoding='utf-8'))
        if previous.get('signature') == signature and previous.get('bytes') == path.stat().st_size:
            return previous
    samples, sample_rate = model.create(text, voice=voice, speed=RATE, lang='en-us')
    samples = np.asarray(samples, dtype=np.float32).flatten()
    if not samples.size or not np.isfinite(samples).all():
        raise ValueError('Invalid waveform for ' + text)
    rms = float(np.sqrt(np.mean(samples * samples)))
    if rms < 0.001:
        raise ValueError('Unexpectedly silent waveform: ' + text)
    duration = len(samples) / float(sample_rate)
    if duration < 0.25 or duration > max(30, len(text.split()) * 2):
        raise ValueError('Unexpected duration {}: {}'.format(duration, text))
    payload = encode(samples, sample_rate)
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.part')
    temporary.write_bytes(payload)
    temporary.replace(path)
    result = {'signature': signature, 'seconds': round(duration, 3), 'voice': voice, 'text': text,
              'bytes': len(payload), 'sha256': hashlib.sha256(payload).hexdigest(), 'rms': round(rms, 5)}
    record_path.write_text(json.dumps(result, ensure_ascii=False), encoding='utf-8')
    return result

def main():
    global DIST, MODEL
    parser = argparse.ArgumentParser()
    parser.add_argument('--samples', action='store_true')
    parser.add_argument('--scene')
    parser.add_argument('--app-dir', type=Path)
    parser.add_argument('--model-dir', type=Path)
    args = parser.parse_args()
    if args.app_dir:
        DIST = args.app_dir.resolve()
    if args.model_dir:
        MODEL = args.model_dir.resolve()
    print('Loading full precision Kokoro model...', flush=True)
    import onnxruntime as rt
    options = rt.SessionOptions()
    options.intra_op_num_threads = 4
    options.inter_op_num_threads = 1
    session = rt.InferenceSession(str(MODEL / 'community-model.onnx'), sess_options=options, providers=['CPUExecutionProvider'])
    model = Kokoro.from_session(session, str(MODEL / 'voices-v1.0.bin'))
    if args.samples:
        text = 'Hi! What can I get for you? For here, or to go? Take your time. There is no rush.'
        for voice in ['af_heart', 'af_bella', 'am_michael']:
            target = ROOT.parent / 'outputs' / ('英语配音样本-' + voice + '.mp3')
            data = generate(model, text, voice, target)
            print('{}: {} seconds'.format(voice, data['seconds']), flush=True)
        return
    rounds = json.loads((ROOT / 'voice-script-manifest.json').read_text(encoding='utf-8'))
    manifest = {'version': 1, 'engine': 'Kokoro-82M v1.0', 'nativeSpeed': RATE, 'scenarios': {}}
    started = time.time()
    completed = 0
    for item in rounds:
        if args.scene and item['scene'] != args.scene:
            continue
        scene = item['scene']
        line = {}
        for role, voice in zip(['agent', 'user'], SCENE_VOICES[scene]):
            name = '{}-{}.mp3'.format(item['id'], role)
            path = DIST / 'audio' / scene / name
            # Quality records stay in work, not in the reader's audio directory.
            result = generate(model, item[role], voice, path)
            line[role] = {'src': path.relative_to(DIST).as_posix(), 'seconds': result['seconds'], 'voice': voice,
                          'text': item[role], 'bytes': result['bytes'], 'sha256': result['sha256']}
            completed += 1
            if completed % 20 == 0:
                print('{} files complete, {:.0f}s elapsed; {} / {}'.format(completed, time.time() - started, scene, item['id']), flush=True)
        manifest['scenarios'].setdefault(scene, {})[str(item['id'])] = line
        (ROOT / 'voice-generation-progress.json').write_text(json.dumps({'completed': completed, 'scene': scene, 'id': item['id'], 'elapsed': round(time.time() - started)}), encoding='utf-8')
    target = ROOT / ('voice-manifest-' + (args.scene or 'all') + '.json')
    target.write_text(json.dumps(manifest, ensure_ascii=False, indent=2), encoding='utf-8')
    print('DONE: {} lines in {:.0f} seconds'.format(completed, time.time() - started), flush=True)

if __name__ == '__main__':
    main()
