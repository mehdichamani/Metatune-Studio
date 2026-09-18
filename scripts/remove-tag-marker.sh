#!/usr/bin/env bash
set -e

# Resolve script directory (project root)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [ -f "$SCRIPT_DIR/.venv/bin/python3" ]; then
    PYTHON_BIN="$SCRIPT_DIR/.venv/bin/python3"
elif [ -f "$SCRIPT_DIR/venv/bin/python3" ]; then
    PYTHON_BIN="$SCRIPT_DIR/venv/bin/python3"
elif command -v python3 &>/dev/null; then
    PYTHON_BIN="$(command -v python3)"
else
    echo "Error: No Python environment found."
    exit 1
fi

"$PYTHON_BIN" "$SCRIPT_DIR/scripts/remove_tag_flag.py" "$@"
