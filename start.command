#!/bin/bash
cd "$(dirname "$0")" || exit 1
if ! command -v python3 >/dev/null 2>&1; then
  echo 'Python 3 is required. Install Python 3 and retry.'
  exit 1
fi
(sleep 1; open 'http://127.0.0.1:7574') &
exec python3 server.py
