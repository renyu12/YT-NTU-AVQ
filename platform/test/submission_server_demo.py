#!/usr/bin/env python3
"""
Simple jsPsych result receiver (single-file HTTP server)

Production Notice:
This script is a minimal demonstration server for development and local testing.
It should not be used in production environments.

For production deployment, consider:
  - Using a dedicated web framework (e.g., FastAPI, Django, Flask)
  - Running behind a proper web server (e.g., Nginx)
  - Enabling HTTPS
  - Implementing authentication and rate limiting
  - Persisting data in a database or managed storage service

The current implementation writes raw JSON files to disk and provides only
basic size limitations for safety.

How to run:
  1) cd /path/to/your/project
  2) python submission_server_demo.py
  3) Set your frontend config (platform/config/experiment.json):
       "remote_submit_url": "http://localhost:8002/submit",

Test with curl:
  curl -X POST http://localhost:8002/submit \
    -H "Content-Type: application/json" \
    -d '{"hello":"world"}'

Notes:
  - Saves each submission as a JSON file under ./submissions/
  - Returns a random completion_code in JSON response
  - Includes basic CORS headers for local testing
  - Safety limits:
      * MAX_BODY_BYTES: max size per POST
      * MAX_STORAGE_BYTES: max total size of ./submissions/
"""

import json
import os
import time
import secrets
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

HOST = "0.0.0.0"
PORT = 8002

SAVE_DIR = "submissions"

# Safety limits (local testing)
MAX_BODY_BYTES = 512 * 1024            # 512KB per submission
MAX_STORAGE_BYTES = 200 * 1024 * 1024  # 200MB total under SAVE_DIR


def make_code(rand_length: int = 4) -> str:
  """
  Generate completion code in format:
  YYYYMMDD-HHMMSS-RAND
  """
  timestamp = time.strftime("%Y%m%d-%H%M%S")
  rand = secrets.token_hex(4).upper()[:rand_length]
  return f"{timestamp}-{rand}"


def get_directory_size(path: str) -> int:
  """Compute total size (bytes) of all files under a directory."""
  total = 0
  if not os.path.exists(path):
    return 0
  for root, _, files in os.walk(path):
    for name in files:
      fp = os.path.join(root, name)
      try:
        total += os.path.getsize(fp)
      except OSError:
        pass
  return total


class Handler(BaseHTTPRequestHandler):
  server_version = "SimpleJsPsychReceiver/0.2"

  def _set_headers(self, status=200, content_type="application/json"):
    self.send_response(status)
    # CORS: allow fetch() from any origin during local testing
    self.send_header("Access-Control-Allow-Origin", "*")
    self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
    self.send_header("Access-Control-Allow-Headers", "Content-Type")
    self.send_header("Content-Type", content_type)
    self.end_headers()

  def do_OPTIONS(self):
    # Preflight for CORS
    self._set_headers(204, "text/plain")

  def do_POST(self):
    path = urlparse(self.path).path
    if path not in ("/submit", "/"):
      self._set_headers(404)
      self.wfile.write(json.dumps({"error": "not found"}).encode("utf-8"))
      return

    # Read body size
    try:
      length = int(self.headers.get("Content-Length", "0"))
    except ValueError:
      length = 0

    if length <= 0:
      self._set_headers(400)
      self.wfile.write(json.dumps({"error": "empty body"}).encode("utf-8"))
      return

    if length > MAX_BODY_BYTES:
      self._set_headers(413)  # Payload Too Large
      self.wfile.write(json.dumps({
        "error": "payload too large",
        "max_body_bytes": MAX_BODY_BYTES
      }).encode("utf-8"))
      return

    body = self.rfile.read(length)

    # Parse JSON
    try:
      payload = json.loads(body.decode("utf-8"))
    except Exception:
      self._set_headers(400)
      self.wfile.write(json.dumps({"error": "invalid json"}).encode("utf-8"))
      return

    # Ensure save dir exists
    os.makedirs(SAVE_DIR, exist_ok=True)

    # Total storage limit check
    current_size = get_directory_size(SAVE_DIR)
    if current_size >= MAX_STORAGE_BYTES:
      self._set_headers(507)  # Insufficient Storage
      self.wfile.write(json.dumps({
        "error": "storage limit reached",
        "current_bytes": current_size,
        "limit_bytes": MAX_STORAGE_BYTES
      }).encode("utf-8"))
      return

    # Save payload
    ts = time.strftime("%Y%m%d-%H%M%S")
    code = make_code()
    filename = f"{code}.json"
    filepath = os.path.join(SAVE_DIR, filename)

    try:
      with open(filepath, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)
    except OSError as e:
      self._set_headers(500)
      self.wfile.write(json.dumps({
        "error": "failed to write file",
        "detail": str(e)
      }).encode("utf-8"))
      return

    # Respond with completion code
    self._set_headers(200)
    self.wfile.write(json.dumps({
      "ok": True,
      "completion_code": code
    }).encode("utf-8"))

  def log_message(self, fmt, *args):
    # Concise logs
    print("[%s] %s - %s" % (self.log_date_time_string(), self.address_string(), fmt % args))


if __name__ == "__main__":
  httpd = ThreadingHTTPServer((HOST, PORT), Handler)
  print(f"Server running: http://{HOST}:{PORT}/submit")
  print(f"Saving submissions to ./{SAVE_DIR}/")
  print(f"Limits: MAX_BODY_BYTES={MAX_BODY_BYTES}, MAX_STORAGE_BYTES={MAX_STORAGE_BYTES}")
  try:
    httpd.serve_forever()
  except KeyboardInterrupt:
    pass
  finally:
    httpd.server_close()
    print("Server stopped.")