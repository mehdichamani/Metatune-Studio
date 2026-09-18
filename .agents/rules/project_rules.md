# Project Development & Environment Rules

## 1. Virtual Environment & Python Execution
- Always use the project's local virtual environment located at `.venv/bin/python`. Never use system Python (`/usr/bin/python3`) for running project code or tests.

## 2. Package Management (UV Only)
- **DO NOT** install packages directly using `pip`, `uv pip`, or any install commands.
- Whenever a new dependency or library is needed, explicitly notify the USER so they can add it themselves using `uv add <package>`.
- The user uses `uv` for managing dependencies (`pyproject.toml` / `uv.lock`) and will generate standard export requirements (`requirements.txt`) when needed for public release.

## 3. Public Release Readiness
- Keep the project modular, clean, and portable.
- Avoid hardcoded machine-specific absolute paths in source code (always provide configuration, CLI flags, or dynamic path detection).

## 4. Album Artwork & Image Display Rule (No Square Cropping)
- Never crop album artwork or cover images into square crops (`object-fit: cover` is prohibited for covers).
- Always preserve the full original aspect ratio and show the entire image without cutting off edges (`object-fit: contain` with proper centering inside its container) across all views (Quick Mode, Advanced Mode, Batch Studio, Track Queue sidebar, Candidate Cards, etc.).

## 5. Quick Mode Search Engine & Shortcuts Rule
- Apple Music (`itunes`) is the permanent default search engine in Quick Mode.
- Any manual switch to another engine (Shazam, Deezer, MusicBrainz, All) is temporary for the active track only.
- Upon moving to the next/previous track or confirming/skipping, Quick Mode must automatically revert back to Apple Music as the default engine.
- Keyboard shortcuts in Quick Mode must always remain active: `A` (Apple), `S` (Shazam), `D` (Deezer), `F` (MusicBrainz), `W` (All Sources), `Enter` (Confirm & Next), `Space` (Skip), `P` (Prev), `N` (Next), `R` (Re-search), `C` (Toggle Cover), `T` (Toggle Rename), `M` (Toggle Mode).
