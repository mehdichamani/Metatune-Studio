#!/usr/bin/env bash
# ==============================================================================
# MetaTune Studio - Launcher & Setup Script
# اسکریپت ساده و سریع راه‌اندازی و اجرای متاتیون استودیو
# ==============================================================================

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# رنگ‌بندی ترمینال
BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
GRAY='\033[0;90m'
WHITE='\033[1;37m'
NC='\033[0m'

PORT="${PORT:-7860}"
NO_BROWSER=0

# پارس آرگومان‌ها
for arg in "$@"; do
    case "$arg" in
        --no-browser)
            NO_BROWSER=1
            ;;
        --port=*)
            PORT="${arg#*=}"
            ;;
        install|setup)
            ACTION="install"
            ;;
        update)
            ACTION="update"
            ;;
        check)
            ACTION="check"
            ;;
        help|-h|--help)
            ACTION="help"
            ;;
        *)
            if [[ "$arg" =~ ^[0-9]+$ ]]; then
                PORT="$arg"
            fi
            ;;
    esac
done

ensure_uv() {
    export PATH="$HOME/.cargo/bin:$HOME/.local/bin:$HOME/.astral/bin:$PATH"
    if command -v uv >/dev/null 2>&1; then
        return 0
    fi
    return 1
}

ensure_venv() {
    if [ ! -f ".venv/bin/python" ]; then
        echo -e "${CYAN}🔧 Creating virtual environment (.venv)... | در حال ایجاد محیط مجازی...${NC}"
        if ensure_uv; then
            uv venv .venv >/dev/null 2>&1
        else
            python3 -m venv .venv
        fi
    fi
}

install_deps() {
    ensure_venv
    mkdir -p "$SCRIPT_DIR/data"
    echo -e "${CYAN}📦 Installing dependencies... | در حال نصب پیش‌نیازها...${NC}"
    if ensure_uv; then
        uv pip install -r requirements.txt --python .venv/bin/python
    else
        .venv/bin/python -m pip install --quiet --upgrade pip
        .venv/bin/python -m pip install --quiet -r requirements.txt
    fi
    echo -e "${GREEN}✅ Dependencies ready. | پیش‌نیازها با موفقیت آماده شدند.${NC}"
}

update_deps() {
    ensure_venv
    echo -e "${CYAN}🔄 Updating packages... | در حال بروزرسانی بسته‌ها...${NC}"
    if ensure_uv; then
        uv pip install --upgrade -r requirements.txt --python .venv/bin/python
    else
        .venv/bin/python -m pip install --quiet --upgrade -r requirements.txt
    fi
    echo -e "${GREEN}✅ Packages updated. | بسته‌ها با موفقیت بروزرسانی شدند.${NC}"
}

health_check() {
    echo -e "\n${CYAN}══════════════════════════════════════════════════════════════════════${NC}"
    echo -e "  ${CYAN}System Health Check | بررسی وضعیت سیستم${NC}"
    echo -e "${CYAN}══════════════════════════════════════════════════════════════════════${NC}"

    if command -v python3 >/dev/null 2>&1; then
        echo -e "  [${GREEN}OK${NC}] Python: $(python3 --version 2>&1)"
    else
        echo -e "  [${RED}ERROR${NC}] Python is NOT installed!"
    fi

    if ensure_uv; then
        echo -e "  [${GREEN}OK${NC}] uv: $(uv --version 2>&1)"
    else
        echo -e "  [${YELLOW}WARN${NC}] Astral uv not found (using standard pip/venv)"
    fi

    if [ -f ".venv/bin/python" ]; then
        echo -e "  [${GREEN}OK${NC}] Virtual Env: Ready (.venv)"
    else
        echo -e "  [${YELLOW}WARN${NC}] Virtual Env: Not found (will be auto-created on run)"
    fi

    if command -v ffmpeg >/dev/null 2>&1; then
        echo -e "  [${GREEN}OK${NC}] FFmpeg: Installed (audio/video processing ready)"
    else
        echo -e "  [${YELLOW}WARN${NC}] FFmpeg: Not found (video recognition limited)"
    fi

    if command -v fpcalc >/dev/null 2>&1; then
        echo -e "  [${GREEN}OK${NC}] Chromaprint: fpcalc installed"
    else
        echo -e "  [${GRAY}INFO${NC}] Chromaprint: fpcalc optional / not installed"
    fi
    echo -e "${CYAN}══════════════════════════════════════════════════════════════════════${NC}\n"
}

open_browser_url() {
    local url="$1"
    if [ "$NO_BROWSER" -eq 0 ]; then
        if command -v xdg-open >/dev/null 2>&1; then
            (sleep 1 && xdg-open "$url" >/dev/null 2>&1) &
        elif command -v open >/dev/null 2>&1; then
            (sleep 1 && open "$url" >/dev/null 2>&1) &
        fi
    fi
}

start_app() {
    if [ ! -f ".venv/bin/python" ]; then
        install_deps
    fi
    mkdir -p "$SCRIPT_DIR/data"

    echo -e "\n${CYAN}══════════════════════════════════════════════════════════════════════${NC}"
    echo -e "  ${MAGENTA}🎵 MetaTune Studio${NC} ${WHITE}is launching...${NC}"
    echo -e "  ${GREEN}➜ Local URL:${NC} ${WHITE}http://localhost:${PORT}${NC}"
    echo -e "  ${YELLOW}➜ Press Ctrl+C anytime to exit${NC}"
    echo -e "${CYAN}══════════════════════════════════════════════════════════════════════${NC}\n"

    open_browser_url "http://localhost:${PORT}"
    PORT="$PORT" exec .venv/bin/python app.py --port "$PORT"
}

case "$ACTION" in
    install)
        install_deps
        ;;
    update)
        update_deps
        ;;
    check)
        health_check
        ;;
    help)
        echo "MetaTune Studio Launcher:"
        echo "  ./start.sh                  Direct run (auto-installs if needed & opens browser)"
        echo "  ./start.sh [PORT]           Run on specific port (e.g. ./start.sh 8080)"
        echo "  ./start.sh --no-browser     Run without opening browser automatically"
        echo "  ./start.sh install          Setup/install virtual environment & dependencies"
        echo "  ./start.sh update           Update dependencies to latest"
        echo "  ./start.sh check            Check system tools (Python, ffmpeg, uv)"
        ;;
    *)
        start_app
        ;;
esac
