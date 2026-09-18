# 🎵 استودیو متاتیون (Metatune Studio)

<p align="center">
  <strong>استودیوی مدرن و هوشمند تگ‌گذاری موزیک و ویدیو با قدرت تشخیص شزم و لیریکس همگام.</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/لایسنس-MIT-blue.svg?style=flat-square" alt="License: MIT"></a>
  <a href="https://www.python.org/"><img src="https://img.shields.io/badge/پایتون-3.10+-3776AB.svg?style=flat-square&logo=python&logoColor=white" alt="Python 3.10+"></a>
  <img src="https://img.shields.io/badge/پلتفرم-Linux%20%7C%20macOS%20%7C%20Windows-555555.svg?style=flat-square" alt="Platform">
  <a href="README.md"><img src="https://img.shields.io/badge/Language-English-blue.svg?style=flat-square" alt="Language: English"></a>
</p>

> 🌍 **زبان / Language:** **فارسی** | [English](README.md)

یک استودیوی مستقل، سریع، مدرن و شیک تحت وب (طراحی تیره و گلس‌مورفیک) برای مدیریت متادیتا، شناسایی خودکار آهنگ‌ها با شزم، جستجوی هم‌زمان در چند مرجع آنلاین، دریافت لیریکس هماهنگ‌شده (Synced LRC)، پخش زنده و سازمان‌دهی فایل‌های صوتی و ویدیوها.

<p align="center">
  <img src="docs/images/preview-main.webp" alt="محیط اصلی متاتیون استودیو" width="100%">
</p>

<p align="center">
  <img src="docs/images/preview-modal.webp" alt="پنجره جستجو و انتخاب متادیتای متاتیون استودیو" width="90%">
</p>

---

## ✨ ویژگی‌های برجسته

- ⚡ **شناسایی خودکار قطعه با شزم (Shazam & Audio Fingerprinting):**
  - تشخیص آنی نام ترانه، خواننده، آلبوم و کاور باکیفیت حتی برای فایل‌هایی با نام‌های به هم ریخته یا موزیک‌ویدیوهای ضبط شده.
- 🎬 **پشتیبانی کامل از فایل‌های صوتی و موزیک‌ویدیوها:**
  - ویرایش مستقیم متادیتا و کاور برای فایل‌های **صوتی** (`MP3`, `FLAC`, `M4A`, `OGG`, `OPUS`, `WAV`) و **تصویری** (`MP4`, `MKV`, `WEBM`).
- 🔍 **جستجوی متادیتا در چند منبع معتبر (Multi-Source Search):**
  - 🍎 **Apple iTunes API:** کاور آرت باکیفیت 1200x1200px، متادیتای دقیق و استاندارد.
  - 🎵 **Deezer API:** پوشش گسترده آهنگ‌های خارجی با کاورهای XL 1000x1000px.
  - 🧠 **MusicBrainz API:** پایگاه‌داده غنی برای آرشیو و آهنگ‌های ایرانی، سنتی و خاص.
- 📝 **دریافت متن ترانه و ویرایشگر توکار (Synced Lyrics / LRC):**
  - دریافت خودکار لیریکس همگام (Synced LRC) یا متنی از LRCLib و سرویس‌های متن ترانه.
  - ویرایشگر متن درون برنامه با امکان ذخیره خودکار فایل `.lrc` در کنار موزیک.
- ⚖️ **پیش‌نمایش مقایسه‌ای تگ‌ها (Diff Preview):**
  - مقایسه متادیتای فعلی فایل با متادیتای آنلاین قبل از ذخیره، با امکان انتخاب تک‌تک فیلدها.
- 📤 **آپلود مستقیم فایل و دانلود از لینک (Direct Upload & URL Fetch):**
  - آپلود آسان از طریق کشیدن و رها کردن (Drag & Drop) یا دانلود مستقیم از لینک اینترنتی.
- 🏷️ **تغییر نام هوشمند فایل:**
  - تغییر نام خودکار فایل به الگوی تمیز و استاندارد `Artist - Title.ext`.
- ⌨️ **کلیدهای میانبر کیبورد:**
  - `Enter`: اعمال تگ‌ها و رفتن به فایل بعدی (Apply & Next)
  - `Space`: رد شدن از فایل فعلی (Skip)
  - `J` / `K` یا کلیدهای جهت‌نما: جابه‌جایی سریع میان لیست فایل‌ها

---

## 🚀 نحوه اجرا و لانچر بومی (Native Launcher)

این پروژه مجهز به منوی ترمینالی تعاملی (TUI) دو زبانه برای لینوکس، مکینتاش و ویندوز است.

### 🐧 لینوکس و مکینتاش (Linux & macOS)

```bash
chmod +x start.sh
./start.sh
```

اسکریپت به صورت خودکار در صورت نیاز محیط مجازی `.venv` و وابستگی‌ها را نصب کرده، سرور را اجرا و مرورگر شما را باز می‌کند.

گزینه‌ها و دستورات اختیاری:
```bash
./start.sh 8080            # اجرا روی پورت دلخواه (پیش‌فرض: 7860)
./start.sh --no-browser    # اجرا بدون باز کردن خودکار مرورگر
./start.sh install         # نصب و پیکربندی اولیه محیط و وابستگی‌ها
./start.sh update          # بروزرسانی بسته‌ها به آخرین نسخه
./start.sh check           # بررسی سلامت سیستم، ابزارهای ffmpeg و پایتون
```

### 🪟 ویندوز (Windows PowerShell)

```powershell
.\start.ps1
```

پارامترهای اختیاری:
```powershell
.\start.ps1 -Port 8080
.\start.ps1 -NoBrowser
.\start.ps1 -Action install
.\start.ps1 -Action update
.\start.ps1 -Action check
```

---

## 🛠️ پیش‌نیازها و نصب دستی

لانچر به صورت خودکار محیط مجازی `.venv` را ساخته و وابستگی‌ها را با `uv` یا `pip` نصب می‌کند. در صورت تمایل به راه‌اندازی دستی:

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python3 app.py
```

### پیش‌نیازهای اختیاری
- **FFmpeg (`ffmpeg`):** برای استخراج صوت از فایل‌های ویدیویی جهت شناسایی با شزم.
- **Chromaprint (`fpcalc`):** برای تولید اثرانگشت صوتی AcoustID.

---

## 📄 لایسنس

این پروژه تحت مجوز [MIT](LICENSE) به صورت متن‌باز منتشر شده است.
