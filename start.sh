#!/usr/bin/env bash
# ==============================================================================
# Music Auto-Tagger Web Studio - Native TUI Manager (Linux & macOS)
# لانچر و مدیر بومی سامانه تحت وب تگ‌گذاری خودکار موزیک
# ==============================================================================

set -e

# مسیر اجرای اسکریپت
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# مسیرهای PID و لاگ و فایل استارت‌آپ خودکار
DATA_DIR="$SCRIPT_DIR/data"
PID_FILE="$DATA_DIR/tagger_web.pid"
LOG_FILE="$DATA_DIR/tagger_web.log"
AUTOSTART_DIR="$HOME/.config/autostart"
AUTOSTART_FILE="$AUTOSTART_DIR/music-tagger-web.desktop"

# رنگ‌بندی ترمینال
BOLD='\033[1m'
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
GRAY='\033[0;90m'
WHITE='\033[1;37m'
NC='\033[0m' # No Color

PORT="${PORT:-7860}"
NO_BROWSER=0

# پارس کردن آرگومان‌ها
ACTION=""
for arg in "$@"; do
    case "$arg" in
        --no-browser)
            NO_BROWSER=1
            ;;
        --port=*)
            PORT="${arg#*=}"
            ;;
        *)
            if [ -z "$ACTION" ]; then
                ACTION="$arg"
            elif [[ "$arg" =~ ^[0-9]+$ ]]; then
                PORT="$arg"
            fi
            ;;
    esac
done

# ──────────────────────────────────────────────────────────────────────────────
# توابع چاپ دو زبانه و شکیل
# ──────────────────────────────────────────────────────────────────────────────

log_info() {
    local label="$1" en="$2" fa="$3"
    echo -e "  [${CYAN}${label}${NC}] ${WHITE}${en}${NC} | ${GRAY}${fa}${NC}"
}

log_ok() {
    local label="$1" en="$2" fa="$3"
    echo -e "  [${GREEN}OK${NC}] ${WHITE}${label}:${NC} ${WHITE}${en}${NC} | ${GRAY}${fa}${NC}"
}

log_warn() {
    local label="$1" en="$2" fa="$3"
    echo -e "  [${YELLOW}WARN${NC}] ${WHITE}${label}:${NC} ${WHITE}${en}${NC} | ${GRAY}${fa}${NC}"
}

log_err() {
    local label="$1" en="$2" fa="$3"
    echo -e "  [${RED}ERROR${NC}] ${WHITE}${label}:${NC} ${WHITE}${en}${NC} | ${GRAY}${fa}${NC}"
}

open_browser_url() {
    local url="$1"
    if [ "$NO_BROWSER" -eq 0 ]; then
        log_info "Browser" "Opening browser at $url..." "در حال باز کردن مرورگر..."
        if command -v xdg-open >/dev/null 2>&1; then
            (sleep 1 && xdg-open "$url" >/dev/null 2>&1) &
        elif command -v open >/dev/null 2>&1; then
            (sleep 1 && open "$url" >/dev/null 2>&1) &
        else
            log_warn "Browser" "Failed to open browser automatically." "خطا در باز کردن خودکار مرورگر."
        fi
    fi
}

ensure_uv() {
    export PATH="$HOME/.cargo/bin:$HOME/.local/bin:$HOME/.astral/bin:$PATH"
    if command -v uv >/dev/null 2>&1; then
        return 0
    fi

    log_warn "Astral uv" "Astral uv tool not found. Installing..." "ابزار uv یافت نشد. در حال نصب..."
    
    if command -v curl >/dev/null 2>&1 && curl -LsSf https://astral.sh/uv/install.sh | sh >/dev/null 2>&1; then
        export PATH="$HOME/.cargo/bin:$HOME/.local/bin:$HOME/.astral/bin:$PATH"
    elif command -v python3 >/dev/null 2>&1 && python3 -m pip install --quiet uv >/dev/null 2>&1; then
        export PATH="$HOME/.local/bin:$PATH"
    fi

    if command -v uv >/dev/null 2>&1; then
        log_ok "Astral uv" "Installed successfully." "با موفقیت نصب شد."
        return 0
    else
        log_warn "Astral uv" "Installation failed. Falling back to python3-venv." "نصب uv ناموفق بود؛ استفاده از venv پیش‌فرض."
        return 1
    fi
}

ensure_venv() {
    ensure_uv || true
    if [ ! -f ".venv/bin/python" ]; then
        log_info "SETUP" "Creating virtual environment (.venv)..." "در حال ساخت محیط مجازی (.venv)..."
        if command -v uv >/dev/null 2>&1; then
            uv venv .venv >/dev/null 2>&1
        else
            python3 -m venv .venv
        fi
        if [ ! -f ".venv/bin/python" ]; then
            log_err "VENV" "Failed to create virtual environment." "ساخت محیط مجازی با خطا مواجه شد."
            return 1
        fi
        log_ok "VENV" "Virtual environment created." "محیط مجازی ساخته شد."
    fi
    return 0
}

ensure_dirs() {
    mkdir -p "$DATA_DIR"
}

install_deps() {
    ensure_venv || return 1
    ensure_dirs
    log_info "PACKAGES" "Installing dependencies..." "در حال نصب وابستگی‌ها..."
    if command -v uv >/dev/null 2>&1; then
        uv pip install -r requirements.txt --python .venv/bin/python
    else
        .venv/bin/python -m pip install --quiet --upgrade pip
        .venv/bin/python -m pip install --quiet -r requirements.txt
    fi
    log_ok "PACKAGES" "All dependencies installed successfully." "تمامی وابستگی‌ها نصب شدند."
}

update_deps() {
    ensure_venv || return 1
    log_info "PACKAGES" "Updating packages..." "در حال بروزرسانی بسته‌ها..."
    if command -v uv >/dev/null 2>&1; then
        uv pip install --upgrade -r requirements.txt --python .venv/bin/python
    else
        .venv/bin/python -m pip install --quiet --upgrade -r requirements.txt
    fi
    log_ok "PACKAGES" "All packages updated successfully." "تمامی بسته‌ها بروزرسانی شدند."
}

# بررسی پروسه‌های فعال وب سرور
get_active_process() {
    WEB_PID=""

    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE" 2>/dev/null || echo "")
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            WEB_PID="$pid"
        fi
    fi

    if [ -z "$WEB_PID" ]; then
        WEB_PID=$(pgrep -f "python.*app.py" | head -n 1 || echo "")
    fi
}

get_server_status() {
    get_active_process
    local has_active=0

    if [ -n "$WEB_PID" ]; then
        echo -e "  [${GREEN}OK${NC}] ${WHITE}Web Server:${NC} ${GREEN}ACTIVE (PID: ${WEB_PID})${NC} | ${GRAY}وب‌سرور فعال است${NC}"
        echo -e "       ${WHITE}Panel URL:${NC} ${CYAN}http://localhost:${PORT}${NC}"
        has_active=1
    else
        echo -e "  [${YELLOW}INFO${NC}] ${WHITE}Web Server:${NC} ${YELLOW}INACTIVE${NC} | ${GRAY}وب‌سرور فعال نیست${NC}"
    fi

    return 0
}

health_check() {
    echo -e "\n${CYAN}══════════════════════════════════════════════════════════════════════${NC}"
    echo -e "  ${CYAN}System Health Check | پایش سلامت سیستم${NC}"
    echo -e "${CYAN}══════════════════════════════════════════════════════════════════════${NC}"

    # Python
    if command -v python3 >/dev/null 2>&1; then
        PY_VER=$(python3 --version 2>&1)
        log_ok "Python" "$PY_VER" "پایتون آماده است"
    else
        log_err "Python" "Not Installed!" "پایتون نصب نیست!"
    fi

    # uv
    if command -v uv >/dev/null 2>&1; then
        UV_VER=$(uv --version 2>&1)
        log_ok "Astral uv" "$UV_VER" "ابزار uv آماده است"
    else
        log_warn "Astral uv" "Not found (using pip/venv)" "ابزار uv یافت نشد"
    fi

    # .venv
    if [ -f ".venv/bin/python" ]; then
        log_ok "Virtual Env" "Ready (.venv)" "محیط مجازی آماده است"
    else
        log_warn "Virtual Env" "Missing (.venv)" "محیط مجازی موجود نیست (با گزینه 7 نصب کنید)"
    fi

    # ffmpeg (برای استخراج صوت و شناسایی شزم موزیک‌ویدیوها)
    if command -v ffmpeg >/dev/null 2>&1; then
        log_ok "FFmpeg" "Installed (Video Recognition & Audio Streaming)" "ابزار ffmpeg نصب است"
    else
        log_warn "FFmpeg" "Not found (Video auto-shazam recognition disabled)" "ابزار ffmpeg جهت شناسایی شزم ویدیو یافت نشد"
    fi

    # fpcalc (Chromaprint / AcoustID)
    if command -v fpcalc >/dev/null 2>&1; then
        log_ok "Chromaprint" "fpcalc installed" "ابزار اثرانگشت صوتی نصب است"
    else
        log_warn "Chromaprint" "fpcalc optional / not installed" "ابزار fpcalc نصب نیست (اختیاری)"
    fi

    echo -e "${CYAN}──────────────────────────────────────────────────────────────────────${NC}"
    echo -e "  ${WHITE}Service & System Status | وضعیت سرویس‌ها:${NC}"
    get_server_status

    echo -n "  Linux Auto-Start: "
    if [ -f "$AUTOSTART_FILE" ]; then
        echo -e "${GREEN}ENABLED | فعال است${NC}"
    else
        echo -e "${YELLOW}DISABLED | غیرفعال است${NC}"
    fi
    echo -e "${CYAN}══════════════════════════════════════════════════════════════════════${NC}\n"
    return 0
}

start_server() {
    if [ ! -f ".venv/bin/python" ]; then
        log_warn "Server" "Virtual env missing. Setting up..." "محیط مجازی یافت نشد..."
        install_deps
    fi
    ensure_dirs

    echo -e "\n${GREEN}══════════════════════════════════════════════════════════════════════${NC}"
    echo -e "  ${GREEN}🎵 Music Auto-Tagger Web Studio Running${NC}"
    echo -e "  ${CYAN}Panel URL: http://localhost:${PORT}${NC}"
    echo -e "  ${YELLOW}Press Ctrl+C to Stop the Server${NC}"
    echo -e "${GREEN}══════════════════════════════════════════════════════════════════════${NC}\n"

    open_browser_url "http://localhost:${PORT}"

    log_info "Web" "Starting web server on port $PORT..." "در حال اجرای سرور روی پورت $PORT..."
    trap 'echo -e "\n${YELLOW}[MusicTagger] Stopping web server...${NC}"' EXIT INT TERM

    PORT="$PORT" .venv/bin/python app.py --port "$PORT"
    return 0
}

start_server_background() {
    if [ ! -f ".venv/bin/python" ]; then
        log_warn "Server" "Virtual env missing. Setting up..." "محیط مجازی یافت نشد..."
        install_deps
    fi
    ensure_dirs

    get_active_process
    if [ -n "$WEB_PID" ]; then
        log_warn "Server" "Background web service already running (PID $WEB_PID)." "سرویس وب پس‌زمینه قبلاً راه‌اندازی شده است."
        get_server_status
        open_browser_url "http://localhost:${PORT}"
        return 0
    fi

    log_info "Server" "Launching background web service..." "در حال راه‌اندازی پس‌زمینه سرور وب..."

    nohup env PORT="$PORT" .venv/bin/python app.py --port "$PORT" > "$LOG_FILE" 2>&1 &
    WEB_PID=$!

    if [ -n "$WEB_PID" ] && kill -0 "$WEB_PID" 2>/dev/null; then
        echo "$WEB_PID" > "$PID_FILE"
        log_ok "Web" "Background web service started (PID $WEB_PID)" "سرویس وب پس‌زمینه با موفقیت اجرا شد"
    else
        log_err "Web" "Failed to start background web service." "راه‌اندازی سرویس وب ناموفق بود."
    fi

    echo -e "  ${GREEN}Panel URL: http://localhost:${PORT}${NC}"
    echo -e "  ${YELLOW}Note: You can safely close this terminal.${NC}"
    open_browser_url "http://localhost:${PORT}"
    return 0
}

stop_server() {
    log_info "Server" "Stopping web background service..." "در حال توقف سرویس وب پس‌زمینه..."
    local stopped=0

    if [ -f "$PID_FILE" ]; then
        local pid
        pid=$(cat "$PID_FILE" 2>/dev/null || echo "")
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null || kill -9 "$pid" 2>/dev/null || true
            log_ok "Web" "Stopped background web service (PID $pid)" "سرویس وب پس‌زمینه متوقف شد"
            stopped=1
        fi
        rm -f "$PID_FILE"
    fi

    # Fallback cleanup with pgrep
    local web_pids
    web_pids=$(pgrep -f "python.*app.py" || echo "")
    if [ -n "$web_pids" ]; then
        for p in $web_pids; do
            kill "$p" 2>/dev/null || kill -9 "$p" 2>/dev/null || true
            log_ok "Web" "Terminated tagger process (PID $p)" "پروسه سرور متوقف شد"
            stopped=1
        done
    fi

    if [ "$stopped" -eq 0 ]; then
        echo -e "  ${YELLOW}[INFO] No active background services found | هیچ سرویس پسزمینه‌ای فعال نبود${NC}"
    fi
    return 0
}

enable_startup() {
    log_info "Startup" "Enabling Linux Auto-Start..." "در حال تنظیم راه‌اندازی خودکار..."
    mkdir -p "$AUTOSTART_DIR"
    cat <<EOF > "$AUTOSTART_FILE"
[Desktop Entry]
Type=Application
Name=Music Auto-Tagger Web
Comment=Music Auto-Tagger Background Service
Exec=bash -c "cd '$SCRIPT_DIR' && ./start.sh start-bg --no-browser"
Terminal=false
X-GNOME-Autostart-enabled=true
EOF
    chmod +x "$AUTOSTART_FILE"
    log_ok "Startup" "Auto-Start enabled successfully." "راه‌اندازی خودکار فعال شد."
}

disable_startup() {
    if [ -f "$AUTOSTART_FILE" ]; then
        rm -f "$AUTOSTART_FILE"
        log_ok "Startup" "Auto-Start disabled." "راه‌اندازی خودکار غیرفعال شد."
    else
        echo -e "  ${YELLOW}[INFO] Auto-Start was not enabled | راه‌اندازی خودکار فعال نبود${NC}"
    fi
}

show_menu() {
    while true; do
        clear 2>/dev/null || true
        get_active_process
        local bg_status=" [INACTIVE]"
        if [ -n "$WEB_PID" ]; then
            bg_status=" [ACTIVE]"
        fi

        local startup_status=" [DISABLED]"
        if [ -f "$AUTOSTART_FILE" ]; then
            startup_status=" [ENABLED]"
        fi

        echo -e "${CYAN}══════════════════════════════════════════════════════════════════════${NC}"
        echo -e "         ${MAGENTA}🎵 Music Auto-Tagger Web Studio - Native Manager (TUI)${NC}"
        echo -e "        ${GRAY}مدیریت بومی و استقرار سامانه تگ‌گذاری موزیک | System Manager${NC}"
        echo -e "${CYAN}══════════════════════════════════════════════════════════════════════${NC}"
        echo -e "  ${WHITE}[1] Start Foreground Console    | اجرای مستقیم در کنسول${NC}"
        
        echo -n -e "  ${WHITE}[2] Start Background Service   | اجرای سرویس پس‌زمینه${NC}"
        if [ -n "$WEB_PID" ]; then
            echo -e "${GREEN}${bg_status}${NC}"
        else
            echo -e "${GRAY}${bg_status}${NC}"
        fi

        echo -e "  ${WHITE}[3] Stop Background Service    | توقف سرویس پس‌زمینه${NC}"
        echo -e "  ${WHITE}[4] Check Service Status       | مشاهده وضعیت سرویس${NC}"
        
        echo -n -e "  ${WHITE}[5] Enable Linux Startup       | فعالسازی اجرای خودکار${NC}"
        if [ -f "$AUTOSTART_FILE" ]; then
            echo -e "${GREEN}${startup_status}${NC}"
        else
            echo -e "${GRAY}${startup_status}${NC}"
        fi

        echo -e "  ${WHITE}[6] Disable Linux Startup      | غیرفعالسازی اجرای خودکار${NC}"
        echo -e "  ${WHITE}[7] Full Setup and Install     | نصب و پیکربندی اولیه (venv + deps)${NC}"
        echo -e "  ${WHITE}[8] Update Packages            | بروزرسانی بسته‌ها${NC}"
        echo -e "  ${WHITE}[9] System Health Check        | بررسی سلامت سیستم${NC}"
        echo -e "  ${WHITE}[0] Exit                       | خروج${NC}"
        echo -e "${CYAN}══════════════════════════════════════════════════════════════════════${NC}"
        
        read -rp "Select Option [0-9] | انتخاب گزینه: " choice

        case "$choice" in
            1)
                start_server
                break
                ;;
            2)
                start_server_background
                read -rp "Press Enter to return | جهت بازگشت کلید Enter را بزنید..."
                ;;
            3)
                stop_server
                read -rp "Press Enter to return | جهت بازگشت کلید Enter را بزنید..."
                ;;
            4)
                echo -e "\n${CYAN}=== وضعیت سرویس (Service Status) ===${NC}"
                get_server_status
                read -rp "Press Enter to return | جهت بازگشت کلید Enter را بزنید..."
                ;;
            5)
                enable_startup
                read -rp "Press Enter to return | جهت بازگشت کلید Enter را بزنید..."
                ;;
            6)
                disable_startup
                read -rp "Press Enter to return | جهت بازگشت کلید Enter را بزنید..."
                ;;
            7)
                install_deps
                read -rp "Press Enter to return | جهت بازگشت کلید Enter را بزنید..."
                ;;
            8)
                update_deps
                read -rp "Press Enter to return | جهت بازگشت کلید Enter را بزنید..."
                ;;
            9)
                health_check
                read -rp "Press Enter to return | جهت بازگشت کلید Enter را بزنید..."
                ;;
            0)
                echo -e "${GREEN}Goodbye! | خداحافظ!${NC}"
                exit 0
                ;;
            *)
                echo -e "${RED}Invalid choice | گزینه نامعتبر است.${NC}"
                sleep 1
                ;;
        esac
    done
}

# ──────────────────────────────────────────────────────────────────────────────
# ورودی خط فرمان (Non-interactive mode)
# ──────────────────────────────────────────────────────────────────────────────
case "$ACTION" in
    start|1)
        start_server
        ;;
    start-bg|2)
        start_server_background
        ;;
    stop|3)
        stop_server
        ;;
    status|4)
        get_server_status
        ;;
    enable-startup|5)
        enable_startup
        ;;
    disable-startup|6)
        disable_startup
        ;;
    install|7)
        install_deps
        ;;
    update|8)
        update_deps
        ;;
    check|9)
        health_check
        ;;
    help|--help|-h)
        echo "Music Auto-Tagger Web Studio Help:"
        echo "  ./start.sh                           Interactive TUI Menu"
        echo "  ./start.sh start [PORT]              Start Foreground (default: 7860)"
        echo "  ./start.sh start-bg                  Start Background Service"
        echo "  ./start.sh stop                      Stop Background Service"
        echo "  ./start.sh status                    Check Background Status"
        echo "  ./start.sh enable-startup            Enable Auto-Start"
        echo "  ./start.sh disable-startup           Disable Auto-Start"
        echo "  ./start.sh install                   Install Dependencies"
        echo "  ./start.sh update                    Update Packages"
        echo "  ./start.sh check                     System Health Check"
        ;;
    "")
        show_menu
        ;;
    *)
        show_menu
        ;;
esac
