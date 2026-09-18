#!/usr/bin/env python3
"""
Web Server for Music Auto-Tagger Web
Zero-dependency HTTP server utilizing Python standard library.
Provides REST APIs for folder scanning, audio streaming, multi-source searching,
lyrics fetching, and tag writing.
"""

import os
import sys
import json
import urllib.parse
from http.server import ThreadingHTTPServer, BaseHTTPRequestHandler
from pathlib import Path
from typing import Dict, Any

# Import local tagger engine
sys.path.insert(0, str(Path(__file__).parent))
import tagger_engine

STATIC_DIR = Path(__file__).parent / "static"
PORT = int(os.environ.get("PORT", 7860))


class TaggerHTTPHandler(BaseHTTPRequestHandler):
    def end_headers(self):
        # Enable CORS for local dev / testing
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        params = urllib.parse.parse_qs(parsed.query)

        if path == "/" or path == "/index.html":
            self.serve_static("index.html", "text/html; charset=utf-8")
        elif path == "/style.css":
            self.serve_static("style.css", "text/css; charset=utf-8")
        elif path == "/app.js":
            self.serve_static("app.js", "application/javascript; charset=utf-8")
        elif path == "/api/scan":
            self.handle_api_scan(params)
        elif path == "/api/search":
            self.handle_api_search(params)
        elif path == "/api/recognize":
            self.handle_api_recognize(params)
        elif path == "/api/lyrics":
            self.handle_api_lyrics(params)
        elif path == "/api/audio":
            self.handle_api_audio(params)
        else:
            self.send_error(404, "Not Found")

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path

        if path == "/api/apply":
            self.handle_api_apply()
        else:
            self.send_error(404, "Not Found")

    def serve_static(self, rel_path: str, content_type: str):
        target = STATIC_DIR / rel_path
        if not target.exists():
            self.send_error(404, "Static file not found")
            return
        content = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def send_json(self, data: Any, code: int = 200):
        body = json.dumps(data, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def handle_api_scan(self, params: Dict[str, Any]):
        dir_path_str = params.get("path", ["."])[0]
        p = Path(dir_path_str).expanduser().resolve()
        if not p.exists() or not p.is_dir():
            self.send_json({"success": False, "error": f"Path '{p}' does not exist or is not a directory"}, code=400)
            return

        tracks = []
        for item in sorted(p.iterdir()):
            if item.is_file() and item.suffix.lower() in tagger_engine.SUPPORTED_EXTENSIONS:
                meta = tagger_engine.read_file_metadata(item)
                clean_q = tagger_engine.clean_filename_for_search(item.name)
                meta["suggestedQuery"] = clean_q
                tracks.append(meta)

        self.send_json({
            "success": True,
            "directory": str(p),
            "total": len(tracks),
            "tracks": tracks
        })

    def handle_api_search(self, params: Dict[str, Any]):
        query = params.get("q", [""])[0].strip()
        source = params.get("source", ["all"])[0].strip()
        if not query:
            self.send_json({"success": True, "results": []})
            return

        results = tagger_engine.search_metadata(query, source=source, limit=6)
        self.send_json({"success": True, "query": query, "source": source, "results": results})

    def handle_api_recognize(self, params: Dict[str, Any]):
        file_path_str = params.get("path", [""])[0].strip()
        mode = params.get("mode", ["normal"])[0].strip().lower()
        if mode not in ("normal", "deep"):
            mode = "normal"

        if not file_path_str:
            self.send_json({"success": False, "error": "Missing file path"}, code=400)
            return
        target = Path(file_path_str).expanduser().resolve()
        if not target.exists() or not target.is_file():
            self.send_json({"success": False, "error": "File not found"}, code=404)
            return

        results = tagger_engine.recognize_audio(target, mode=mode)
        self.send_json({"success": True, "path": str(target), "mode": mode, "results": results})

    def handle_api_lyrics(self, params: Dict[str, Any]):
        artist = params.get("artist", [""])[0].strip()
        title = params.get("title", [""])[0].strip()
        data = tagger_engine.fetch_online_lyrics(artist, title)
        self.send_json({"success": True, "artist": artist, "title": title, **data})

    def handle_api_audio(self, params: Dict[str, Any]):
        file_path_str = params.get("path", [""])[0]
        if not file_path_str:
            self.send_error(400, "Missing path")
            return
        target = Path(file_path_str).expanduser().resolve()
        if not target.exists() or not target.is_file():
            self.send_error(404, "Audio file not found")
            return

        ext = target.suffix.lower()
        mime_map = {
            ".mp3": "audio/mpeg",
            ".flac": "audio/flac",
            ".m4a": "audio/mp4",
            ".mp4": "audio/mp4",
            ".ogg": "audio/ogg",
            ".opus": "audio/opus",
        }
        content_type = mime_map.get(ext, "application/octet-stream")
        file_size = target.stat().st_size

        # Simple ranged streaming or full delivery
        range_header = self.headers.get("Range")
        if range_header:
            range_match = range_header.strip().replace("bytes=", "").split("-")
            start = int(range_match[0]) if range_match[0] else 0
            end = int(range_match[1]) if len(range_match) > 1 and range_match[1] else file_size - 1
            length = end - start + 1

            self.send_response(206)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
            self.send_header("Content-Length", str(length))
            self.send_header("Accept-Ranges", "bytes")
            self.end_headers()

            with open(target, "rb") as f:
                f.seek(start)
                self.wfile.write(f.read(length))
        else:
            self.send_response(200)
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(file_size))
            self.send_header("Accept-Ranges", "bytes")
            self.end_headers()
            with open(target, "rb") as f:
                self.wfile.write(f.read())

    def handle_api_apply(self):
        content_len = int(self.headers.get("Content-Length", 0))
        post_data = self.rfile.read(content_len)
        try:
            payload = json.loads(post_data.decode("utf-8"))
        except Exception:
            self.send_json({"success": False, "error": "Invalid JSON"}, code=400)
            return

        file_path = Path(payload.get("fullPath", ""))
        meta = payload.get("metadata", {})
        artwork_url = payload.get("artworkUrl", "")
        artwork_base64 = payload.get("artworkBase64", "")
        lyrics = payload.get("lyrics", "")
        rename_file = payload.get("rename", False)
        save_lrc = payload.get("saveLrc", False)

        art_bytes = None
        art_src = artwork_base64 or artwork_url
        if art_src:
            art_bytes = tagger_engine.download_artwork_bytes(art_src)

        res = tagger_engine.apply_tags_to_file(
            file_path=file_path,
            meta=meta,
            artwork_bytes=art_bytes,
            lyrics=lyrics,
            rename_file=rename_file,
            save_lrc=save_lrc
        )
        if art_src and not art_bytes:
            res["warning"] = "تگ‌ها ذخیره شدند اما کاور به دلیل خطای شبکه/پروکسی دانلود نشد."
        self.send_json(res)


def main():
    global PORT
    import argparse
    parser = argparse.ArgumentParser(description="Music Auto-Tagger Web Server")
    parser.add_argument("--port", "-p", type=int, default=PORT, help="Port to run the server on (default: 7860)")
    parser.add_argument("--host", default="", help="Host interface to bind to (default: all interfaces)")
    args, unknown = parser.parse_known_args()
    PORT = args.port

    ThreadingHTTPServer.allow_reuse_address = True
    server_address = (args.host, PORT)
    httpd = ThreadingHTTPServer(server_address, TaggerHTTPHandler)
    print(f"\033[92m✓ Music Auto-Tagger Web Server running at http://localhost:{PORT}\033[0m")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping server...")
        httpd.server_close()


if __name__ == "__main__":
    main()

