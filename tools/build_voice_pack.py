"""Verify generated MP3 assets and build the web manifest. CPython 3.8."""
import argparse
import hashlib
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DIST = ROOT / 'speak-or-boom-product' / 'dist'


def main():
    global DIST
    parser = argparse.ArgumentParser()
    parser.add_argument('--preview', action='store_true')
    parser.add_argument('--app-dir', type=Path)
    args = parser.parse_args()
    if args.app_dir:
        DIST = args.app_dir.resolve()
    rows = json.loads((ROOT / 'voice-script-manifest.json').read_text(encoding='utf-8'))
    manifest = {'version': 1, 'engine': 'Kokoro-82M v1.0', 'nativeSpeed': 0.95, 'scenarios': {}}
    count = 0
    total = 0
    for row in rows:
        line = {}
        for role in ('agent', 'user'):
            name = '{}-{}'.format(row['id'], role)
            record = ROOT / 'voice-quality' / row['scene'] / (name + '.json')
            if not record.exists() and args.preview:
                continue
            data = json.loads(record.read_text(encoding='utf-8'))
            path = DIST / 'audio' / row['scene'] / (name + '.mp3')
            payload = path.read_bytes()
            assert data['text'] == row[role], str(path) + ': wrong text'
            assert data['bytes'] == len(payload), str(path) + ': truncated'
            assert hashlib.sha256(payload).hexdigest() == data['sha256'], str(path) + ': changed'
            assert payload[0] == 255 and payload[1] & 224 == 224, str(path) + ': MP3 header'
            assert data['rms'] >= 0.001 and data['seconds'] >= 0.25, str(path) + ': empty audio'
            line[role] = {key: data[key] for key in ('seconds', 'voice', 'text', 'bytes', 'sha256')}
            line[role]['src'] = path.relative_to(DIST).as_posix()
            count += 1
            total += len(payload)
        if len(line) == 2:
            manifest['scenarios'].setdefault(row['scene'], {})[str(row['id'])] = line
    if not args.preview:
        assert count == len(rows) * 2 == 1608
        assert sum(len(scene) for scene in manifest['scenarios'].values()) == 804
    manifest['complete'] = not args.preview
    target = DIST / 'voice-manifest.js'
    target.write_text('window.SPEAK_OR_BOOM_AUDIO = ' + json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + ';\n', encoding='utf-8')
    if not args.preview:
        (ROOT / 'voice-pack-verification.json').write_text(json.dumps({'clips': count, 'rounds': len(rows), 'bytes': total, 'checks': ['text match', 'file size', 'sha256', 'MP3 header', 'waveform RMS and duration']}, ensure_ascii=False, indent=2), encoding='utf-8')
    print('{}: {} clips, {} bytes'.format('PREVIEW ONLY' if args.preview else 'COMPLETE VERIFIED', count, total))


if __name__ == '__main__':
    main()
