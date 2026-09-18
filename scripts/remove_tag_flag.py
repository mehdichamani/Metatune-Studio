#!/usr/bin/env python3
import sys
import argparse
from pathlib import Path

try:
    from mutagen.id3 import ID3
    from mutagen.flac import FLAC
    from mutagen.mp4 import MP4
    from mutagen.oggvorbis import OggVorbis
    from mutagen.oggopus import OggOpus
except ImportError:
    print("Error: mutagen library is required. Run via the wrapper script.")
    sys.exit(1)

SUPPORTED_EXTS = {".mp3", ".flac", ".m4a", ".mp4", ".ogg", ".opus"}
TAG_KEY = "AUTOTAGGED"

def clean_file(file_path: Path) -> bool:
    ext = file_path.suffix.lower()
    if ext not in SUPPORTED_EXTS:
        return False

    removed = False
    try:
        if ext == ".mp3":
            try:
                tags = ID3(file_path)
                changed = False
                for txxx in list(tags.getall("TXXX")):
                    if txxx.desc.upper() == TAG_KEY:
                        tags.delall(f"TXXX:{txxx.desc}")
                        changed = True
                if changed:
                    tags.save(file_path, v2_version=3)
                    removed = True
            except Exception:
                pass

        elif ext == ".flac":
            audio = FLAC(file_path)
            if TAG_KEY in audio:
                del audio[TAG_KEY]
                audio.save()
                removed = True

        elif ext in {".m4a", ".mp4"}:
            audio = MP4(file_path)
            tag_k = f"----:com.apple.iTunes:{TAG_KEY}"
            if tag_k in audio:
                del audio[tag_k]
                audio.save()
                removed = True

        elif ext in {".ogg", ".opus"}:
            audio = OggOpus(file_path) if ext == ".opus" else OggVorbis(file_path)
            if TAG_KEY in audio:
                del audio[TAG_KEY]
                audio.save()
                removed = True

    except Exception as e:
        print(f"Error processing {file_path.name}: {e}")
        return False

    return removed

def main():
    parser = argparse.ArgumentParser(description="Remove the AUTOTAGGED marker from music files.")
    parser.add_argument("folder", nargs="?", default=".", help="Target folder path (default: current directory)")
    parser.add_argument("-r", "--recursive", action="store_true", help="Process subdirectories recursively")
    args = parser.parse_args()

    target_dir = Path(args.folder).expanduser().resolve()
    if not target_dir.exists() or not target_dir.is_dir():
        print(f"Directory not found: {target_dir}")
        sys.exit(1)

    print(f"Scanning folder: {target_dir}")
    print(f"Recursive: {'Yes' if args.recursive else 'No'}")
    print("-" * 50)

    files_iter = target_dir.rglob("*") if args.recursive else target_dir.iterdir()
    count = 0
    scanned = 0

    for f in files_iter:
        if f.is_file() and f.suffix.lower() in SUPPORTED_EXTS:
            scanned += 1
            if clean_file(f):
                count += 1
                print(f"[REMOVED] {f.name}")

    print("-" * 50)
    print(f"Done! Scanned {scanned} audio files. Removed marker from {count} files.")

if __name__ == "__main__":
    main()
