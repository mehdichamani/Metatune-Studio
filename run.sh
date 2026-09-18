#!/usr/bin/env bash
# Runner script for Music Auto-Tagger Web Studio

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT=7860

# Find python with virtualenv support
PYTHON_BIN="python3"
if [ -f "$DIR/.venv/bin/python" ]; then
    PYTHON_BIN="$DIR/.venv/bin/python"
elif [ -f "$HOME/.venv/bin/python" ]; then
    PYTHON_BIN="$HOME/.venv/bin/python"
fi

echo -e "\033[96m🎵 Starting Music Auto-Tagger Web Studio...\033[0m"
echo -e "\033[90mRunning with: $PYTHON_BIN\033[0m"
echo -e "\033[92mOpening http://localhost:$PORT in your browser...\033[0m"

# Open browser in background if xdg-open exists
if command -v xdg-open &>/dev/null; then
    (sleep 1 && xdg-open "http://localhost:$PORT") &
fi

exec "$PYTHON_BIN" "$DIR/app.py"
