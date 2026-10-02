"""Alternate model download from the documented ONNX Community model repository."""
from pathlib import Path
import urllib.request
import time

root = Path(__file__).resolve().parent / 'voice-model'
root.mkdir(parents=True, exist_ok=True)
url = 'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX/resolve/main/onnx/model.onnx'
target = root / 'community-model.onnx'
temporary = target.with_suffix('.part')
started = time.time()
with urllib.request.urlopen(url, timeout=30) as response, temporary.open('wb') as output:
    size = int(response.headers['Content-Length'])
    count = 0
    next_report = 5000000
    while count < size:
        chunk = response.read(256 * 1024)
        if not chunk:
            break
        output.write(chunk)
        count += len(chunk)
        if count >= next_report:
            output.flush()
            print('{} / {} MB, {:.0f}s'.format(count // 1000000, size // 1000000, time.time() - started), flush=True)
            next_report += 5000000
    if count != size:
        raise ValueError('Incomplete model download')
temporary.replace(target)
print('Model complete.', flush=True)
