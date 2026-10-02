"""Local-only launcher for Speak or Boom; CPython 3.8, standard library only."""
import argparse
import functools
import http.server
import os
from pathlib import Path
import subprocess
import sys
import urllib.error
import urllib.request
import webbrowser


class LocalServer(http.server.ThreadingHTTPServer):
    # Windows SO_REUSEADDR can allow two servers to bind the same address.
    allow_reuse_address = False


def open_chrome(url):
    for root_name in ("PROGRAMFILES", "PROGRAMFILES(X86)", "LOCALAPPDATA"):
        root = os.environ.get(root_name)
        if root:
            executable = Path(root) / "Google" / "Chrome" / "Application" / "chrome.exe"
            if executable.is_file():
                subprocess.Popen([str(executable), url])
                return
    webbrowser.open(url)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()
    directory = Path(__file__).resolve().parent
    url = "http://localhost:{}/".format(args.port)
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(directory))
    try:
        server = LocalServer(("127.0.0.1", args.port), handler)
    except OSError as error:
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                body = response.read(65536)
            if body != (directory / 'index.html').read_bytes()[:65536]:
                raise ValueError("Port is serving another folder or an older version")
            for name in ('app.js', 'voice-manifest.js'):
                if not (directory / name).exists():
                    continue
                with urllib.request.urlopen(url + name, timeout=2) as response:
                    if response.read() != (directory / name).read_bytes():
                        raise ValueError("Port is serving an older version")
        except (OSError, urllib.error.URLError, ValueError):
            print("Port {} is serving another app or version. Try: py -3.8 start_local.py --port {}".format(args.port, args.port + 1))
            return 1
        print("Speak or Boom is already running at " + url)
        if not args.no_browser:
            open_chrome(url)
        return 0
    print("Speak or Boom: " + url, flush=True)
    print("Keep this window open. Press Ctrl+C to stop the local server.", flush=True)
    if not args.no_browser:
        open_chrome(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
