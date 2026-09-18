#Requires -Version 5.1
<#
.SYNOPSIS
    Music Auto-Tagger Web Studio Native Manager (PowerShell TUI - Dual Language)
.DESCRIPTION
    Interactive TUI launcher and environment manager for Music Auto-Tagger Web Studio.
    Supports Persian and English dual-language output with clean layout alignment.
.EXAMPLE
    .\start.ps1
.EXAMPLE
    .\start.ps1 -Action start -Port 7860
#>

[CmdletBinding()]
param(
    [Parameter(Position=0)]
    [ValidateSet("start", "start-bg", "stop", "status", "enable-startup", "disable-startup", "install", "update", "check", "help", "")]
    [string]$Action = "",

    [Parameter(Position=1)]
    [int]$Port = 7860,

    [switch]$NoBrowser
)

# تنظیم انکودینگ خروجی ترمینال به UTF-8
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

$DataDir = Join-Path $ScriptDir "data"
$PidFile = Join-Path $DataDir "tagger_web.pid"
$StartupFolder = [Environment]::GetFolderPath("Startup")
$StartupShortcut = Join-Path $StartupFolder "MusicAutoTaggerWeb.lnk"

# توابع چاپ دو زبانه و شکیل با همترازی تمیز
function Write-LogInfo ($label, $en, $fa) {
    Write-Host "  [$label] " -NoNewline -ForegroundColor Cyan
    Write-Host "$en " -NoNewline -ForegroundColor White
    Write-Host "| $fa" -ForegroundColor Gray
}

function Write-LogOk ($label, $en, $fa) {
    Write-Host "  [OK] " -NoNewline -ForegroundColor Green
    Write-Host "${label}: " -NoNewline -ForegroundColor White
    Write-Host "$en " -NoNewline -ForegroundColor White
    Write-Host "| $fa" -ForegroundColor Gray
}

function Write-LogWarn ($label, $en, $fa) {
    Write-Host "  [WARN] " -NoNewline -ForegroundColor Yellow
    Write-Host "${label}: " -NoNewline -ForegroundColor White
    Write-Host "$en " -NoNewline -ForegroundColor White
    Write-Host "| $fa" -ForegroundColor Gray
}

function Write-LogErr ($label, $en, $fa) {
    Write-Host "  [ERROR] " -NoNewline -ForegroundColor Red
    Write-Host "${label}: " -NoNewline -ForegroundColor White
    Write-Host "$en " -NoNewline -ForegroundColor White
    Write-Host "| $fa" -ForegroundColor Gray
}

# باز کردن خودکار مرورگر
function Open-BrowserUrl ($url) {
    if (-not $NoBrowser) {
        Write-LogInfo "Browser" "Opening browser at $url..." "در حال باز کردن مرورگر..."
        try {
            Start-Process $url
        } catch {
            Write-LogWarn "Browser" "Failed to open browser automatically." "خطا در باز کردن خودکار مرورگر."
        }
    }
}

function Ensure-Uv {
    if (Get-Command uv -ErrorAction SilentlyContinue) {
        return $true
    }
    Write-LogWarn "Astral uv" "Astral uv tool not found. Installing..." "ابزار uv یافت نشد. در حال نصب..."
    try {
        python -m pip install -q uv 2>$null
        if (Get-Command uv -ErrorAction SilentlyContinue) {
            Write-LogOk "Astral uv" "Installed successfully." "با موفقیت نصب شد."
            return $true
        }
    } catch { }
    Write-LogWarn "Astral uv" "Installation failed. Falling back to pip." "نصب uv ناموفق بود؛ استفاده از pip."
    return $false
}

function Ensure-Venv {
    $hasUv = Ensure-Uv
    if (-not (Test-Path ".venv\Scripts\python.exe")) {
        Write-LogInfo "SETUP" "Creating virtual environment (.venv)..." "در حال ساخت محیط مجازی (.venv)..."
        if ($hasUv) {
            uv venv .venv
        } else {
            python -m venv .venv
        }
        if ($LASTEXITCODE -ne 0) {
            Write-LogErr "VENV" "Failed to create virtual environment." "ساخت محیط مجازی با خطا مواجه شد."
            return $false
        }
        Write-LogOk "VENV" "Virtual environment created." "محیط مجازی ساخته شد."
    }
    return $true
}

function Ensure-Dirs {
    if (-not (Test-Path $DataDir)) {
        New-Item -ItemType Directory -Path $DataDir -Force | Out-Null
    }
}

function Install-Dependencies {
    $venvOk = Ensure-Venv
    if (-not $venvOk) { return }
    Ensure-Dirs
    Write-LogInfo "PACKAGES" "Installing dependencies..." "در حال نصب وابستگی‌ها..."
    if (Get-Command uv -ErrorAction SilentlyContinue) {
        uv pip install -r requirements.txt --python .venv\Scripts\python.exe
    } else {
        & .venv\Scripts\python.exe -m pip install -q --upgrade pip
        & .venv\Scripts\python.exe -m pip install -q -r requirements.txt
    }
    Write-LogOk "PACKAGES" "All dependencies installed successfully." "تمامی وابستگی‌ها نصب شدند."
}

function Update-Dependencies {
    $venvOk = Ensure-Venv
    if (-not $venvOk) { return }
    Write-LogInfo "PACKAGES" "Updating packages..." "در حال بروزرسانی بسته‌ها..."
    if (Get-Command uv -ErrorAction SilentlyContinue) {
        uv pip install --upgrade -r requirements.txt --python .venv\Scripts\python.exe
    } else {
        & .venv\Scripts\python.exe -m pip install -q --upgrade -r requirements.txt
    }
    Write-LogOk "PACKAGES" "All packages updated successfully." "تمامی بسته‌ها بروزرسانی شدند."
}

# بررسی پروسه‌های فعال سرور وب
function Get-ActiveServerProcess {
    $webProc = $null

    if (Test-Path $PidFile) {
        $savedPid = Get-Content $PidFile -ErrorAction SilentlyContinue
        if ($savedPid) {
            $webProc = Get-Process -Id $savedPid -ErrorAction SilentlyContinue
        }
    }

    return $webProc
}

function Get-ServerStatus {
    $webProc = Get-ActiveServerProcess

    if ($webProc) {
        Write-Host "  [OK] " -NoNewline -ForegroundColor Green
        Write-Host "Web Server: " -NoNewline -ForegroundColor White
        Write-Host "ACTIVE (PID: $($webProc.Id)) " -NoNewline -ForegroundColor Green
        Write-Host "| سرور وب فعال است" -ForegroundColor Gray
        Write-Host "       Panel URL: " -NoNewline -ForegroundColor White
        Write-Host "http://localhost:$Port" -ForegroundColor Cyan
        return $true
    } else {
        Write-Host "  [INFO] " -NoNewline -ForegroundColor Yellow
        Write-Host "Web Server: " -NoNewline -ForegroundColor White
        Write-Host "INACTIVE " -NoNewline -ForegroundColor Yellow
        Write-Host "| سرور وب فعال نیست" -ForegroundColor Gray
        return $false
    }
}

function Test-HealthCheck {
    Write-Host "`n══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    Write-Host "  System Health Check | پایش سلامت سیستم" -ForegroundColor Cyan
    Write-Host "══════════════════════════════════════════════════════════════════════" -ForegroundColor Cyan
    
    # Python
    $py = Get-Command python -ErrorAction SilentlyContinue
    if ($py) {
        $pyVer = (python --version 2>&1) | Out-String
        $pyVer = $pyVer.Trim()
        Write-LogOk "Python" "$pyVer" "پایتون آماده است"
    } else {
        Write-LogErr "Python" "Not Installed!" "پایتون نصب نیست!"
    }

    # uv
    $uv = Get-Command uv -ErrorAction SilentlyContinue
    if ($uv) {
        $uvVer = (uv --version 2>&1) | Out-String
        $uvVer = $uvVer.Trim()
        Write-LogOk "Astral uv" "$uvVer" "ابزار uv آماده است"
    } else {
        Write-LogWarn "Astral uv" "Not found (using pip)" "ابزار uv یافت نشد"
    }

    # .venv
    if (Test-Path ".venv\Scripts\python.exe") {
        Write-LogOk "Virtual Env" "Ready (.venv)" "محیط مجازی آماده است"
    } else {
        Write-LogWarn "Virtual Env" "Missing (.venv)" "محیط مجازی موجود نیست"
    }

    # ffmpeg
    if (Get-Command ffmpeg -ErrorAction SilentlyContinue) {
        Write-LogOk "FFmpeg" "Installed" "ابزار ffmpeg نصب است"
    } else {
        Write-LogWarn "FFmpeg" "Not found" "ابزار ffmpeg یافت نشد (جهت استخراج صوت ویدیو)"
    }

    # fpcalc
    if (Get-Command fpcalc -ErrorAction SilentlyContinue) {
        Write-LogOk "Chromaprint" "fpcalc installed" "ابزار اثرانگشت صوتی نصب است"
    } else {
        Write-LogWarn "Chromaprint" "fpcalc not found (optional)" "ابزار fpcalc نصب نیست (اختیاری)"
    }

    Write-Host "──────────────────────────────────────────────────────────────────────" -ForegroundColor DarkCyan
    Write-Host '  Service & System Status | وضعیت سرویس‌ها:' -ForegroundColor White
    Get-ServerStatus | Out-Null

    Write-Host "  Windows Auto-Start: " -NoNewline -ForegroundColor White
    if (Test-Path $StartupShortcut) {
        Write-Host "ENABLED | فعال است" -ForegroundColor Green
    } else {
        Write-Host "DISABLED | غیرفعال است" -ForegroundColor Yellow
    }
    Write-Host "══════════════════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
}

# راه‌اندازی در کنسول (Foreground)
function Start-Server {
    if (-not (Test-Path ".venv\Scripts\python.exe")) {
        Write-LogWarn "Server" "Virtual env missing. Installing..." "محیط مجازی یافت نشد..."
        Install-Dependencies
    }
    Ensure-Dirs

    Write-Host "`n══════════════════════════════════════════════════════════════════════" -ForegroundColor Green
    Write-Host "  🎵 Music Auto-Tagger Web Studio Running" -ForegroundColor Green
    Write-Host "  Panel URL: http://localhost:$Port" -ForegroundColor Cyan
    Write-Host "  Press Ctrl+C to Stop the Server" -ForegroundColor Yellow
    Write-Host "══════════════════════════════════════════════════════════════════════`n" -ForegroundColor Green

    Open-BrowserUrl "http://localhost:$Port"

    $env:PORT = "$Port"
    & .venv\Scripts\python.exe app.py --port $Port
}

# راه‌اندازی پس‌زمینه (Background)
function Start-ServerBackground {
    if (-not (Test-Path ".venv\Scripts\python.exe")) {
        Write-LogWarn "Server" "Virtual env missing. Installing..." "محیط مجازی یافت نشد..."
        Install-Dependencies
    }
    Ensure-Dirs

    $webProc = Get-ActiveServerProcess
    if ($webProc) {
        Write-LogWarn "Server" "Background service already running (PID $($webProc.Id))." "سرویس پس‌زمینه قبلاً راه‌اندازی شده است."
        Get-ServerStatus | Out-Null
        Open-BrowserUrl "http://localhost:$Port"
        return
    }

    $pythonPath = Join-Path $ScriptDir ".venv\Scripts\python.exe"
    Write-LogInfo "Server" "Launching web background service..." "در حال راه‌اندازی پس‌زمینه سرور وب..."
    
    $webProc = Start-Process -FilePath $pythonPath -ArgumentList "app.py --port $Port" -WorkingDirectory $ScriptDir -WindowStyle Hidden -PassThru

    if ($webProc -and -not $webProc.HasExited) {
        $webProc.Id | Out-File -FilePath $PidFile -Encoding utf8
        Write-LogOk "Web" "Background web service started (PID $($webProc.Id))" "سرویس وب پس‌زمینه با موفقیت اجرا شد"
    } else {
        Write-LogErr "Web" "Failed to start background web service." "راه‌اندازی سرویس وب ناموفق بود."
    }

    Write-Host "  Panel URL: http://localhost:$Port" -ForegroundColor Green
    Write-Host "  Note: You can safely close this terminal." -ForegroundColor Yellow
    Open-BrowserUrl "http://localhost:$Port"
}

# توقف سرویس پس‌زمینه
function Stop-Server {
    Write-LogInfo "Server" "Stopping web background service..." "در حال توقف سرویس وب پس‌زمینه..."
    $stopped = $false

    if (Test-Path $PidFile) {
        $savedPid = Get-Content $PidFile -ErrorAction SilentlyContinue
        if ($savedPid) {
            $proc = Get-Process -Id $savedPid -ErrorAction SilentlyContinue
            if ($proc) {
                Stop-Process -Id $savedPid -Force -ErrorAction SilentlyContinue
                Write-LogOk "Web" "Stopped background web service (PID $savedPid)" "سرویس وب پس‌زمینه متوقف شد"
                $stopped = $true
            }
        }
        Remove-Item $PidFile -Force -ErrorAction SilentlyContinue
    }

    $pyProcs = Get-Process -Name "python" -ErrorAction SilentlyContinue
    if ($pyProcs) {
        foreach ($p in $pyProcs) {
            try {
                $cmdLine = (Get-CimInstance Win32_Process -Filter "ProcessId = $($p.Id)").CommandLine
                if ($cmdLine -like "*app.py*") {
                    Stop-Process -Id $p.Id -Force -ErrorAction SilentlyContinue
                    Write-LogOk "Web" "Terminated tagger process (PID $($p.Id))" "پروسه سرور متوقف شد"
                    $stopped = $true
                }
            } catch {}
        }
    }

    if (-not $stopped) {
        Write-Host "  [INFO] No active background services found | هیچ سرویس پسزمینهای فعال نبود" -ForegroundColor Yellow
    }
}

function Enable-Startup {
    Write-LogInfo "Startup" "Enabling Windows Auto-Start..." "در حال تنظیم راه‌اندازی خودکار..."
    try {
        $wshShell = New-Object -ComObject WScript.Shell
        $shortcut = $wshShell.CreateShortcut($StartupShortcut)
        $shortcut.TargetPath = "powershell.exe"
        $shortcut.Arguments = "-NoProfile -ExecutionPolicy Bypass -WindowStyle Hidden -File `"$ScriptDir\start.ps1`" -Action start-bg -Port $Port -NoBrowser"
        $shortcut.WorkingDirectory = $ScriptDir
        $shortcut.Description = "Music Auto-Tagger Web Background Service"
        $shortcut.Save()

        Write-LogOk "Startup" "Auto-Start enabled successfully." "راه‌اندازی خودکار فعال شد."
    } catch {
        Write-LogErr "Startup" "Failed to enable Auto-Start: $_" "خطا در فعالسازی استارتآپ"
    }
}

function Disable-Startup {
    if (Test-Path $StartupShortcut) {
        Remove-Item $StartupShortcut -Force
        Write-LogOk "Startup" "Auto-Start disabled." "راه‌اندازی خودکار غیرفعال شد."
    } else {
        Write-Host '  [INFO] Auto-Start was not enabled | راه‌اندازی خودکار فعال نبود' -ForegroundColor Yellow
    }
}

function Show-Menu {
    while ($true) {
        Clear-Host
        $webProc = Get-ActiveServerProcess
        $bgStatus = if ($webProc) { " [ACTIVE]" } else { " [INACTIVE]" }
        $hasStartup = Test-Path $StartupShortcut
        $startupStatus = if ($hasStartup) { " [ENABLED]" } else { " [DISABLED]" }

        Write-Host "══════════════════════════════════════════════════════════════════════" -ForegroundColor DarkCyan
        Write-Host "         🎵 Music Auto-Tagger Web Studio - Native Manager (TUI)" -ForegroundColor Magenta
        Write-Host "        مدیریت بومی و استقرار سامانه تگ‌گذاری موزیک | System Manager" -ForegroundColor Gray
        Write-Host "══════════════════════════════════════════════════════════════════════" -ForegroundColor DarkCyan
        Write-Host "  [1] Start Foreground Console    | اجرای مستقیم در کنسول" -ForegroundColor White
        
        Write-Host "  [2] Start Background Service   | اجرای سرویس پسزمینه" -NoNewline -ForegroundColor White
        if ($webProc) { Write-Host "$bgStatus" -ForegroundColor Green } else { Write-Host "$bgStatus" -ForegroundColor DarkGray }

        Write-Host "  [3] Stop Background Service    | توقف سرویس پسزمینه" -ForegroundColor White
        Write-Host "  [4] Check Service Status       | مشاهده وضعیت سرویس" -ForegroundColor White
        
        Write-Host "  [5] Enable Windows Startup     | فعالسازی اجرای خودکار" -NoNewline -ForegroundColor White
        if ($hasStartup) { Write-Host "$startupStatus" -ForegroundColor Green } else { Write-Host "$startupStatus" -ForegroundColor DarkGray }

        Write-Host "  [6] Disable Windows Startup    | غیرفعالسازی اجرای خودکار" -ForegroundColor White
        Write-Host "  [7] Full Setup and Install     | نصب و پیکربندی اولیه" -ForegroundColor White
        Write-Host "  [8] Update Packages            | بهروزرسانی بستهها" -ForegroundColor White
        Write-Host "  [9] System Health Check        | بررسی سلامت سیستم" -ForegroundColor White
        Write-Host "  [0] Exit                       | خروج" -ForegroundColor White
        Write-Host "══════════════════════════════════════════════════════════════════════" -ForegroundColor DarkCyan
        
        $choice = Read-Host "Select Option [0-9] | انتخاب گزینه"

        switch ($choice) {
            "1" { Start-Server; break }
            "2" {
                Start-ServerBackground
                Read-Host "`nPress Enter to return | جهت بازگشت کلید Enter را بزنید..."
                break
            }
            "3" {
                Stop-Server
                Read-Host "`nPress Enter to return | جهت بازگشت کلید Enter را بزنید..."
                break
            }
            "4" {
                Write-Host "`n=== وضعیت سرویس (Service Status) ===" -ForegroundColor Cyan
                Get-ServerStatus | Out-Null
                Read-Host "`nPress Enter to return | جهت بازگشت کلید Enter را بزنید..."
                break
            }
            "5" {
                Enable-Startup
                Read-Host "`nPress Enter to return | جهت بازگشت کلید Enter را بزنید..."
                break
            }
            "6" {
                Disable-Startup
                Read-Host "`nPress Enter to return | جهت بازگشت کلید Enter را بزنید..."
                break
            }
            "7" {
                Install-Dependencies
                Read-Host "`nPress Enter to return | جهت بازگشت کلید Enter را بزنید..."
                break
            }
            "8" {
                Update-Dependencies
                Read-Host "`nPress Enter to return | جهت بازگشت کلید Enter را بزنید..."
                break
            }
            "9" {
                Test-HealthCheck
                Read-Host "`nPress Enter to return | جهت بازگشت کلید Enter را بزنید..."
                break
            }
            "0" {
                Write-Host "Goodbye! | خداحافظ!" -ForegroundColor Green
                return
            }
            default {
                Write-Host "Invalid choice | گزینه نامعتبر است." -ForegroundColor Red
                Start-Sleep -Seconds 1
            }
        }
    }
}

switch ($Action.ToLower()) {
    "start"           { Start-Server }
    "start-bg"        { Start-ServerBackground }
    "stop"            { Stop-Server }
    "status"          { Get-ServerStatus }
    "enable-startup"  { Enable-Startup }
    "disable-startup" { Disable-Startup }
    "install"         { Install-Dependencies }
    "update"          { Update-Dependencies }
    "check"           { Test-HealthCheck }
    "help"            {
        Write-Host "Music Auto-Tagger Web Help:"
        Write-Host "  .\start.ps1                           Interactive TUI Menu"
        Write-Host "  .\start.ps1 -Action start -Port 7860  Start Foreground"
        Write-Host "  .\start.ps1 -Action start-bg          Start Background Service"
        Write-Host "  .\start.ps1 -Action stop              Stop Background Service"
        Write-Host "  .\start.ps1 -Action status            Check Background Status"
        Write-Host "  .\start.ps1 -Action enable-startup    Enable Auto-Start"
        Write-Host "  .\start.ps1 -Action disable-startup   Disable Auto-Start"
        Write-Host "  .\start.ps1 -Action install           Install Dependencies"
        Write-Host "  .\start.ps1 -Action update            Update Packages"
        Write-Host "  .\start.ps1 -Action check             System Health Check"
    }
    default           { Show-Menu }
}
