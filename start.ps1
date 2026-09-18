#Requires -Version 5.1
<#
.SYNOPSIS
    MetaTune Studio Launcher & Setup Script (PowerShell)
.DESCRIPTION
    Simple, direct foreground launcher for MetaTune Studio on Windows.
.EXAMPLE
    .\start.ps1
.EXAMPLE
    .\start.ps1 -Port 8080
.EXAMPLE
    .\start.ps1 -Action check
#>

[CmdletBinding()]
param(
    [Parameter(Position=0)]
    [ValidateSet("install", "update", "check", "help", "")]
    [string]$Action = "",

    [Parameter(Position=1)]
    [int]$Port = 7860,

    [switch]$NoBrowser
)

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
Set-Location $ScriptDir

$DataDir = Join-Path $ScriptDir "data"

function Ensure-Uv {
    if (Get-Command uv -ErrorAction SilentlyContinue) {
        return $true
    }
    return $false
}

function Ensure-Venv {
    if (-not (Test-Path ".venv\Scripts\python.exe")) {
        Write-Host "🔧 Creating virtual environment (.venv)... | در حال ساخت محیط مجازی..." -ForegroundColor Cyan
        if (Ensure-Uv) {
            uv venv .venv
        } else {
            python -m venv .venv
        }
    }
}

function Install-Deps {
    Ensure-Venv
    if (-not (Test-Path $DataDir)) { New-Item -ItemType Directory -Path $DataDir -Force | Out-Null }
    Write-Host "📦 Installing dependencies... | در حال نصب وابستگی‌ها..." -ForegroundColor Cyan
    if (Ensure-Uv) {
        uv pip install -r requirements.txt --python .venv\Scripts\python.exe
    } else {
        .venv\Scripts\python.exe -m pip install --quiet --upgrade pip
        .venv\Scripts\python.exe -m pip install --quiet -r requirements.txt
    }
    Write-Host "✅ Dependencies ready. | وابستگی‌ها با موفقیت نصب شدند." -ForegroundColor Green
}

function Update-Deps {
    Ensure-Venv
    Write-Host "🔄 Updating packages... | در حال بروزرسانی بسته‌ها..." -ForegroundColor Cyan
    if (Ensure-Uv) {
        uv pip install --upgrade -r requirements.txt --python .venv\Scripts\python.exe
    } else {
        .venv\Scripts\python.exe -m pip install --quiet --upgrade -r requirements.txt
    }
    Write-Host "✅ Packages updated. | بسته‌ها با موفقیت بروزرسانی شدند." -ForegroundColor Green
}

function Test-HealthCheck {
    Write-Host "`n======================================================================" -ForegroundColor Cyan
    Write-Host "  System Health Check | بررسی سلامت سیستم" -ForegroundColor Cyan
    Write-Host "======================================================================" -ForegroundColor Cyan

    if (Get-Command python -ErrorAction SilentlyContinue) {
        $pyVer = python --version 2>&1
        Write-Host "  [OK] Python: $pyVer" -ForegroundColor Green
    } else {
        Write-Host "  [ERROR] Python is NOT installed!" -ForegroundColor Red
    }

    if (Ensure-Uv) {
        $uvVer = uv --version 2>&1
        Write-Host "  [OK] Astral uv: $uvVer" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Astral uv not found (using pip/venv)" -ForegroundColor Yellow
    }

    if (Test-Path ".venv\Scripts\python.exe") {
        Write-Host "  [OK] Virtual Env: Ready (.venv)" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] Virtual Env: Missing (.venv)" -ForegroundColor Yellow
    }

    if (Get-Command ffmpeg -ErrorAction SilentlyContinue) {
        Write-Host "  [OK] FFmpeg: Installed" -ForegroundColor Green
    } else {
        Write-Host "  [WARN] FFmpeg: Not found" -ForegroundColor Yellow
    }

    if (Get-Command fpcalc -ErrorAction SilentlyContinue) {
        Write-Host "  [OK] Chromaprint: fpcalc installed" -ForegroundColor Green
    } else {
        Write-Host "  [INFO] Chromaprint: fpcalc optional / not installed" -ForegroundColor Gray
    }
    Write-Host "======================================================================`n" -ForegroundColor Cyan
}

function Open-BrowserUrl ($url) {
    if (-not $NoBrowser) {
        try {
            Start-Process $url
        } catch { }
    }
}

function Start-App {
    if (-not (Test-Path ".venv\Scripts\python.exe")) {
        Install-Deps
    }
    if (-not (Test-Path $DataDir)) { New-Item -ItemType Directory -Path $DataDir -Force | Out-Null }

    Write-Host "`n======================================================================" -ForegroundColor Cyan
    Write-Host "  🎵 MetaTune Studio is launching..." -ForegroundColor Magenta
    Write-Host "  ➜ Local URL: http://localhost:$Port" -ForegroundColor Green
    Write-Host "  ➜ Press Ctrl+C anytime to exit" -ForegroundColor Yellow
    Write-Host "======================================================================`n" -ForegroundColor Cyan

    Open-BrowserUrl "http://localhost:$Port"
    $env:PORT = "$Port"
    & ".venv\Scripts\python.exe" app.py --port $Port
}

switch ($Action) {
    "install" { Install-Deps }
    "update"  { Update-Deps }
    "check"   { Test-HealthCheck }
    "help"    {
        Write-Host "MetaTune Studio Launcher (PowerShell):"
        Write-Host "  .\start.ps1                 Direct run"
        Write-Host "  .\start.ps1 -Port 8080      Run on custom port"
        Write-Host "  .\start.ps1 -NoBrowser      Run without opening browser"
        Write-Host "  .\start.ps1 -Action install Setup virtualenv and dependencies"
        Write-Host "  .\start.ps1 -Action update  Update dependencies"
        Write-Host "  .\start.ps1 -Action check   Health check"
    }
    default   { Start-App }
}
