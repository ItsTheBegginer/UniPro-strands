"""Serve the local Demo University portal: http://localhost:8080/login.html"""
import functools
import http.server
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent / "demo_university"

if __name__ == "__main__":
    handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT))
    print("Demo University portal on http://localhost:8080/login.html  (Ctrl+C to stop)")
    http.server.ThreadingHTTPServer(("127.0.0.1", 8080), handler).serve_forever()
