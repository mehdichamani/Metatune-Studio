#!/usr/bin/env python3
"""
Tagger Engine for Music Auto-Tagger Web
Handles metadata extraction, multi-source searching (iTunes, Deezer, MusicBrainz),
lyrics fetching, high-res artwork downloading, and tag embedding via Mutagen.
"""

import os
import re
import base64
import time
import urllib.parse
import urllib.request
import json
from pathlib import Path
from typing import Optional, Dict, Any, List

# Mutagen imports
import mutagen
from mutagen.id3 import ID3, TIT2, TPE1, TALB, TDRC, TRCK, TCON, APIC, USLT, TXXX, error as ID3Error
from mutagen.mp3 import MP3
from mutagen.flac import FLAC, Picture
from mutagen.mp4 import MP4, MP4Cover, MP4FreeForm
from mutagen.oggvorbis import OggVorbis
from mutagen.oggopus import OggOpus

SUPPORTED_EXTENSIONS = {".mp3", ".flac", ".m4a", ".mp4", ".ogg", ".opus"}
TAG_KEY = "AUTOTAGGED"
TAG_VAL = "1"


def clean_filename_for_search(filename: str) -> str:
    """Clean common noise, track numbers, and download tags from filename."""
    name = Path(filename).stem
    name = re.sub(r"^\s*\d{1,3}[\s.\-_]+", "", name)
    name = re.sub(r"\[.*?\]", "", name)
    name = re.sub(r"\(Official\s*(Music\s*)?(Video|Audio|HD|4K|Visualizer|Lyric\s*Video)?.*?\)", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\(Audio\)", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\(Lyric(s)?\)", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\(Music Video\)", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\(Video\)", "", name, flags=re.IGNORECASE)
    name = re.sub(r"\(Remix\)", "Remix", name, flags=re.IGNORECASE)
    name = re.sub(r"\b(320kbps|256kbps|128kbps|flac|mp3|m4a|kbps)\b", "", name, flags=re.IGNORECASE)
    name = re.sub(r"[\-_~]+", " ", name)
    name = re.sub(r"['\"`’‘]", "", name)
    name = re.sub(r"\s+", " ", name).strip()
    return name


def sanitize_filename_part(part: str) -> str:
    """Clean string for safe cross-platform file naming."""
    cleaned = re.sub(r'[\\/*?:"<>|]', "", part)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned


def read_file_metadata(file_path: Path) -> Dict[str, Any]:
    """Read existing audio tags, duration, and embedded artwork preview."""
    ext = file_path.suffix.lower()
    meta: Dict[str, Any] = {
        "title": "",
        "artist": "",
        "album": "",
        "year": "",
        "genre": "",
        "trackNumber": "",
        "lyrics": "",
        "duration": 0,
        "isTagged": False,
        "hasCover": False,
        "coverBase64": "",
        "format": ext.replace(".", "").upper(),
        "filename": file_path.name,
        "fullPath": str(file_path.resolve()),
        "sizeBytes": file_path.stat().st_size if file_path.exists() else 0,
    }

    try:
        if ext == ".mp3":
            try:
                audio = MP3(file_path)
                meta["duration"] = int(audio.info.length)
            except Exception:
                audio = None

            try:
                tags = ID3(file_path)
                meta["title"] = str(tags.get("TIT2", ""))
                meta["artist"] = str(tags.get("TPE1", ""))
                meta["album"] = str(tags.get("TALB", ""))
                meta["year"] = str(tags.get("TDRC", ""))
                meta["genre"] = str(tags.get("TCON", ""))
                meta["trackNumber"] = str(tags.get("TRCK", ""))
                
                # Lyrics
                for uslt in tags.getall("USLT"):
                    if uslt.text:
                        meta["lyrics"] = uslt.text
                        break
                
                # Tagged flag
                for txxx in tags.getall("TXXX"):
                    if txxx.desc.upper() == TAG_KEY and TAG_VAL in txxx.text:
                        meta["isTagged"] = True
                        break

                # Artwork
                for apic in tags.getall("APIC"):
                    if apic.data:
                        meta["hasCover"] = True
                        meta["coverBase64"] = f"data:image/jpeg;base64,{base64.b64encode(apic.data).decode('utf-8')}"
                        break
            except ID3Error:
                pass

        elif ext == ".flac":
            audio = FLAC(file_path)
            meta["duration"] = int(audio.info.length)
            meta["title"] = audio.get("TITLE", [""])[0]
            meta["artist"] = audio.get("ARTIST", [""])[0]
            meta["album"] = audio.get("ALBUM", [""])[0]
            meta["year"] = audio.get("DATE", [""])[0]
            meta["genre"] = audio.get("GENRE", [""])[0]
            meta["trackNumber"] = audio.get("TRACKNUMBER", [""])[0]
            meta["lyrics"] = audio.get("LYRICS", [""])[0]
            meta["isTagged"] = TAG_KEY in audio and TAG_VAL in audio[TAG_KEY]
            if audio.pictures:
                meta["hasCover"] = True
                meta["coverBase64"] = f"data:image/jpeg;base64,{base64.b64encode(audio.pictures[0].data).decode('utf-8')}"

        elif ext in {".m4a", ".mp4"}:
            audio = MP4(file_path)
            meta["duration"] = int(audio.info.length)
            meta["title"] = audio.get("\xa9nam", [""])[0] if "\xa9nam" in audio else ""
            meta["artist"] = audio.get("\xa9ART", [""])[0] if "\xa9ART" in audio else ""
            meta["album"] = audio.get("\xa9alb", [""])[0] if "\xa9alb" in audio else ""
            meta["year"] = audio.get("\xa9day", [""])[0] if "\xa9day" in audio else ""
            meta["genre"] = audio.get("\xa9gen", [""])[0] if "\xa9gen" in audio else ""
            if "trkn" in audio and audio["trkn"]:
                meta["trackNumber"] = str(audio["trkn"][0][0])
            meta["lyrics"] = audio.get("\xa9lyr", [""])[0] if "\xa9lyr" in audio else ""
            tag_k = f"----:com.apple.iTunes:{TAG_KEY}"
            if tag_k in audio:
                meta["isTagged"] = any(TAG_VAL.encode() in v or v == TAG_VAL for v in audio[tag_k])
            if "covr" in audio and audio["covr"]:
                meta["hasCover"] = True
                meta["coverBase64"] = f"data:image/jpeg;base64,{base64.b64encode(bytes(audio['covr'][0])).decode('utf-8')}"

        elif ext in {".ogg", ".opus"}:
            audio = OggOpus(file_path) if ext == ".opus" else OggVorbis(file_path)
            meta["duration"] = int(audio.info.length)
            meta["title"] = audio.get("TITLE", [""])[0]
            meta["artist"] = audio.get("ARTIST", [""])[0]
            meta["album"] = audio.get("ALBUM", [""])[0]
            meta["year"] = audio.get("DATE", [""])[0]
            meta["genre"] = audio.get("GENRE", [""])[0]
            meta["trackNumber"] = audio.get("TRACKNUMBER", [""])[0]
            meta["lyrics"] = audio.get("LYRICS", [""])[0]
            meta["isTagged"] = TAG_KEY in audio and TAG_VAL in audio[TAG_KEY]

    except Exception:
        pass

    # Check for local sidecar .lrc if no lyrics embedded
    if not meta["lyrics"]:
        for lrc in [file_path.parent / f"{file_path.stem}.lrc", file_path.parent / f"{file_path.stem}.en.lrc"]:
            if lrc.exists():
                try:
                    with open(lrc, "r", encoding="utf-8") as f:
                        meta["lyrics"] = f.read().strip()
                        break
                except Exception:
                    pass

    return meta


def lookup_apple_music_url(url: str, limit: int = 15) -> List[Dict[str, Any]]:
    """Parse Apple Music URL (track or album) and retrieve metadata from Apple Lookup API."""
    parsed = urllib.parse.urlparse(url)
    if "music.apple.com" not in parsed.netloc:
        return []

    qs = urllib.parse.parse_qs(parsed.query)
    track_id = qs.get("i", [None])[0]

    parts = [p for p in parsed.path.split("/") if p]
    country = parts[0] if parts and len(parts[0]) == 2 else "us"

    path_id = None
    if parts:
        m = re.search(r"(\d+)$", parts[-1])
        if m:
            path_id = m.group(1)

    target_id = track_id if track_id else path_id
    if not target_id:
        return []

    lookup_url = f"https://itunes.apple.com/lookup?id={target_id}&country={country}&entity=song"
    req = urllib.request.Request(
        lookup_url,
        headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"}
    )
    results = []
    try:
        with urllib.request.urlopen(req, timeout=7) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            items = data.get("results", [])
            # Filter tracks if present
            tracks = [it for it in items if it.get("wrapperType") == "track"]
            if not tracks and items:
                tracks = items

            for item in tracks[:limit]:
                art = item.get("artworkUrl100", "")
                if art:
                    art = re.sub(r"\d+x\d+bb", "1400x1400bb", art)
                results.append({
                    "source": "Apple Music",
                    "title": item.get("trackName") or item.get("collectionName", "Unknown"),
                    "artist": item.get("artistName", "Unknown"),
                    "album": item.get("collectionName", "Unknown"),
                    "genre": item.get("primaryGenreName", ""),
                    "year": str(item.get("releaseDate", ""))[:4],
                    "trackNumber": str(item.get("trackNumber", "")),
                    "trackCount": str(item.get("trackCount", "")),
                    "artworkUrl": art,
                    "previewUrl": item.get("previewUrl", "")
                })
    except Exception as e:
        print(f"[Apple Music lookup error]: {e}")
    return results


def search_itunes(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Search Apple iTunes Music API."""
    if "music.apple.com" in query:
        return lookup_apple_music_url(query, limit=limit)

    params = {"term": query, "entity": "song", "limit": limit}
    url = f"https://itunes.apple.com/search?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"}
    )
    results = []
    try:
        with urllib.request.urlopen(req, timeout=7) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            for item in data.get("results", []):
                art = item.get("artworkUrl100", "")
                if art:
                    art = re.sub(r"\d+x\d+bb", "1400x1400bb", art)
                results.append({
                    "source": "Apple Music",
                    "title": item.get("trackName", "Unknown"),
                    "artist": item.get("artistName", "Unknown"),
                    "album": item.get("collectionName", "Unknown"),
                    "genre": item.get("primaryGenreName", ""),
                    "year": str(item.get("releaseDate", ""))[:4],
                    "trackNumber": str(item.get("trackNumber", "")),
                    "trackCount": str(item.get("trackCount", "")),
                    "artworkUrl": art,
                    "previewUrl": item.get("previewUrl", "")
                })
    except Exception:
        pass
    return results


def search_deezer(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Search Deezer API."""
    url = f"https://api.deezer.com/search?q={urllib.parse.quote(query)}&limit={limit}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    results = []
    try:
        with urllib.request.urlopen(req, timeout=7) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            for item in data.get("data", []):
                album = item.get("album", {})
                artist = item.get("artist", {})
                art_url = album.get("cover_xl") or album.get("cover_big") or album.get("cover_medium") or ""
                results.append({
                    "source": "Deezer",
                    "title": item.get("title", "") or item.get("title_short", ""),
                    "artist": artist.get("name", "Unknown"),
                    "album": album.get("title", "Unknown"),
                    "genre": "",
                    "year": "",
                    "trackNumber": "",
                    "trackCount": "",
                    "artworkUrl": art_url,
                    "previewUrl": item.get("preview", "")
                })
    except Exception:
        pass
    return results


def search_musicbrainz(query: str, limit: int = 5) -> List[Dict[str, Any]]:
    """Search MusicBrainz API."""
    url = f"https://musicbrainz.org/ws/2/recording/?query={urllib.parse.quote(query)}&fmt=json&limit={limit}"
    req = urllib.request.Request(url, headers={"User-Agent": "MusicAutoTaggerWeb/1.0 ( mehdichamani )"})
    results = []
    try:
        with urllib.request.urlopen(req, timeout=7) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            for rec in data.get("recordings", []):
                artist_credit = rec.get("artist-credit", [{}])[0]
                artist_name = artist_credit.get("name", "Unknown") if isinstance(artist_credit, dict) else "Unknown"
                title = rec.get("title", "Unknown")
                album_name = "Single"
                year = ""
                release_id = None
                releases = rec.get("releases", [])
                if releases:
                    first_rel = releases[0]
                    album_name = first_rel.get("title", "Single")
                    year = str(first_rel.get("date", ""))[:4]
                    release_id = first_rel.get("id")

                art_url = f"https://coverartarchive.org/release/{release_id}/front-500" if release_id else ""
                results.append({
                    "source": "MusicBrainz",
                    "title": title,
                    "artist": artist_name,
                    "album": album_name,
                    "genre": "",
                    "year": year,
                    "trackNumber": "",
                    "trackCount": "",
                    "artworkUrl": art_url,
                    "previewUrl": ""
                })
    except Exception:
        pass
    return results


def recognize_audio(file_path: Path, mode: str = "normal") -> List[Dict[str, Any]]:
    """Recognize track metadata from audio file content using Shazam.
    
    Supported modes:
    - 'normal': Standard fast acoustic recognition on the primary file.
    - 'deep': Exhaustive multi-segment scan. If normal fails, slices several key
             points across the track (intro, 25%, 50%, 75%) and tries each until recognized.
    """
    results = []
    if not file_path.exists():
        return results

    try:
        import asyncio
        import shutil
        import subprocess
        import tempfile
        from shazamio import Shazam
        import mutagen

        proxy = os.environ.get("http_proxy") or os.environ.get("HTTP_PROXY") or os.environ.get("all_proxy") or os.environ.get("ALL_PROXY")

        def _parse_track_result(track_info: Dict[str, Any], source_label: str = "Shazam") -> Optional[Dict[str, Any]]:
            track = track_info.get("track")
            if not track:
                return None
            title = track.get("title", "").strip()
            artist = track.get("subtitle", "").strip()
            if not title:
                return None
            album = ""
            year = ""
            label = ""
            genre = track.get("genres", {}).get("primary", "")

            images = track.get("images", {})
            artwork_url = images.get("coverarthq") or images.get("coverart") or ""
            if artwork_url and "400x400" in artwork_url:
                artwork_url = artwork_url.replace("400x400", "1200x1200")

            sections = track.get("sections", [])
            for sec in sections:
                if sec.get("type") == "SONG":
                    for meta in sec.get("metadata", []):
                        m_title = meta.get("title", "").lower()
                        m_val = meta.get("text", "")
                        if "album" in m_title:
                            album = m_val
                        elif "released" in m_title or "year" in m_title:
                            year = m_val[:4]
                        elif "label" in m_title:
                            label = m_val

            return {
                "source": source_label,
                "title": title,
                "artist": artist,
                "album": album or title,
                "year": year,
                "trackNumber": "1",
                "genre": genre,
                "artworkUrl": artwork_url,
                "duration": 0,
                "score": 100,
            }

        async def _shazam_recognize_file(target_file: str) -> Dict[str, Any]:
            shazam = Shazam()
            return await shazam.recognize(target_file, proxy=proxy)

        # 1. First attempt: Standard recognition on whole audio
        out = asyncio.run(_shazam_recognize_file(str(file_path)))
        parsed = _parse_track_result(out, source_label="Shazam")
        if parsed:
            results.append(parsed)
            return results

        # 2. If mode is deep and first attempt found nothing, do multi-segment scan
        if mode == "deep":
            duration = 0.0
            try:
                m_audio = mutagen.File(str(file_path))
                if m_audio and m_audio.info and hasattr(m_audio.info, "length"):
                    duration = float(m_audio.info.length)
            except Exception:
                duration = 0.0

            # Determine sample segments (start_sec, sample_duration)
            segments = []
            if duration >= 70:
                # Samples at 30s, 60s, middle, and 75%
                mid = int(duration * 0.5)
                three_quarter = int(duration * 0.75)
                segments = [
                    (30, 20),
                    (60, 20),
                    (mid, 20),
                    (three_quarter, 20),
                ]
            elif duration >= 30:
                segments = [
                    (15, 15),
                    (int(duration * 0.6), 15),
                ]
            else:
                # Very short track
                segments = [
                    (5, 12),
                ]

            ffmpeg_bin = shutil.which("ffmpeg")
            if ffmpeg_bin:
                with tempfile.TemporaryDirectory() as tmp_dir:
                    for start_sec, seg_len in segments:
                        if start_sec >= duration and duration > 0:
                            continue
                        tmp_out = Path(tmp_dir) / f"segment_{start_sec}.mp3"
                        cmd = [
                            ffmpeg_bin,
                            "-y",
                            "-ss", str(start_sec),
                            "-t", str(seg_len),
                            "-i", str(file_path),
                            "-ac", "2",
                            "-ar", "44100",
                            "-b:a", "192k",
                            str(tmp_out),
                        ]
                        try:
                            proc = subprocess.run(
                                cmd,
                                stdout=subprocess.DEVNULL,
                                stderr=subprocess.DEVNULL,
                                timeout=15,
                            )
                            if proc.returncode == 0 and tmp_out.exists() and tmp_out.stat().st_size > 4000:
                                seg_out = asyncio.run(_shazam_recognize_file(str(tmp_out)))
                                seg_parsed = _parse_track_result(seg_out, source_label="Shazam (Deep Scan)")
                                if seg_parsed:
                                    results.append(seg_parsed)
                                    return results
                        except Exception as seg_err:
                            print(f"[Shazam segment {start_sec}s error]: {seg_err}")
                            continue

    except Exception as e:
        print(f"[Shazam recognition error]: {e}")

    return results


def search_metadata(query: str, source: str = "all", limit: int = 6) -> List[Dict[str, Any]]:
    """Query specific or all sources and return aggregated candidates."""
    query = query.strip()
    if "music.apple.com" in query:
        return lookup_apple_music_url(query, limit=15)

    results = []
    src = source.lower()
    if src == "itunes" or src == "apple":
        results.extend(search_itunes(query, limit))
    elif src == "deezer":
        results.extend(search_deezer(query, limit))
    elif src == "musicbrainz":
        results.extend(search_musicbrainz(query, limit))
    else:
        # Aggregated search: iTunes first, then Deezer, then MusicBrainz
        it = search_itunes(query, 3)
        dz = search_deezer(query, 3)
        results.extend(it)
        results.extend(dz)
        if len(results) < 2:
            results.extend(search_musicbrainz(query, 2))
    return results



def fetch_online_lyrics(artist: str, title: str) -> Dict[str, Any]:
    """Fetch lyrics from LRCLib or lyrics.ovh, returns dict with lyrics and synced status."""
    res = {"lyrics": "", "synced": False, "source": ""}
    query = f"{artist} {title}".strip()
    if not query:
        return res

    # 1. LRCLib (Synced + Plain)
    try:
        url = f"https://lrclib.net/api/search?q={urllib.parse.quote(query)}"
        req = urllib.request.Request(url, headers={"User-Agent": "MusicAutoTaggerWeb/1.0"})
        with urllib.request.urlopen(req, timeout=6) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            if data and isinstance(data, list):
                item = data[0]
                if item.get("syncedLyrics"):
                    res["lyrics"] = item["syncedLyrics"].strip()
                    res["synced"] = True
                    res["source"] = "LRCLib (Synced)"
                    return res
                elif item.get("plainLyrics"):
                    res["lyrics"] = item["plainLyrics"].strip()
                    res["synced"] = False
                    res["source"] = "LRCLib (Plain)"
                    return res
    except Exception:
        pass

    # 2. lyrics.ovh Fallback
    try:
        url = f"https://api.lyrics.ovh/v1/{urllib.parse.quote(artist)}/{urllib.parse.quote(title)}"
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            lyrics = data.get("lyrics", "").strip()
            if lyrics and len(lyrics) > 10:
                res["lyrics"] = lyrics
                res["synced"] = False
                res["source"] = "lyrics.ovh"
                return res
    except Exception:
        pass

    return res


def download_artwork_bytes(artwork_url: str, retries: int = 3, timeout: int = 15) -> Optional[bytes]:
    """Download cover artwork image bytes or decode data URL."""
    if not artwork_url:
        return None

    # If already a base64 data URL from browser frontend, decode directly without network
    if artwork_url.startswith("data:"):
        try:
            _, data = artwork_url.split(",", 1)
            raw = base64.b64decode(data)
            if raw and len(raw) > 50:
                return raw
        except Exception as e:
            print(f"[Artwork] Failed to decode base64 image: {e}")
            return None

    # HTTP/HTTPS URL download with retry mechanism
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(
                artwork_url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
                }
            )
            with urllib.request.urlopen(req, timeout=timeout) as resp:
                data = resp.read()
                if data and len(data) > 100:
                    return data
        except Exception as e:
            print(f"[Artwork Attempt {attempt}/{retries}] Failed to download from {artwork_url[:60]}: {e}")
            if attempt < retries:
                time.sleep(1.0)

    return None


def apply_tags_to_file(
    file_path: Path,
    meta: Dict[str, Any],
    artwork_bytes: Optional[bytes] = None,
    lyrics: str = "",
    rename_file: bool = False,
    save_lrc: bool = False
) -> Dict[str, Any]:
    """Apply updated metadata, artwork, lyrics, and optional rename to audio file."""
    if not file_path.exists():
        return {"success": False, "error": f"File '{file_path}' does not exist"}

    ext = file_path.suffix.lower()
    title = meta.get("title", "").strip()
    artist = meta.get("artist", "").strip()
    album = meta.get("album", "").strip()
    year = str(meta.get("year", "")).strip()[:4]
    genre = meta.get("genre", "").strip()
    track_num = str(meta.get("trackNumber", "")).strip()

    try:
        if ext == ".mp3":
            try:
                tags = ID3(file_path)
            except ID3Error:
                tags = ID3()

            if title:
                tags.add(TIT2(encoding=3, text=[title]))
            if artist:
                tags.add(TPE1(encoding=3, text=[artist]))
            if album:
                tags.add(TALB(encoding=3, text=[album]))
            if year:
                tags.add(TDRC(encoding=3, text=[year]))
            if track_num:
                tags.add(TRCK(encoding=3, text=[track_num]))
            if genre:
                tags.add(TCON(encoding=3, text=[genre]))

            if artwork_bytes:
                is_png = artwork_bytes.startswith(b"\x89PNG\r\n\x1a\n")
                mime_type = "image/png" if is_png else "image/jpeg"
                tags.delall("APIC")
                tags.add(APIC(
                    encoding=3,
                    mime=mime_type,
                    type=3,
                    desc="Front Cover",
                    data=artwork_bytes
                ))

            if lyrics:
                tags.delall("USLT")
                tags.add(USLT(encoding=3, lang="eng", desc="", text=lyrics))

            tags.add(TXXX(encoding=3, desc=TAG_KEY, text=[TAG_VAL]))
            tags.save(file_path, v2_version=3)

        elif ext == ".flac":
            audio = FLAC(file_path)
            if title:
                audio["TITLE"] = [title]
            if artist:
                audio["ARTIST"] = [artist]
            if album:
                audio["ALBUM"] = [album]
            if year:
                audio["DATE"] = [year]
            if track_num:
                audio["TRACKNUMBER"] = [track_num]
            if genre:
                audio["GENRE"] = [genre]
            if lyrics:
                audio["LYRICS"] = [lyrics]

            audio[TAG_KEY] = [TAG_VAL]

            if artwork_bytes:
                is_png = artwork_bytes.startswith(b"\x89PNG\r\n\x1a\n")
                mime_type = "image/png" if is_png else "image/jpeg"
                audio.clear_pictures()
                pic = Picture()
                pic.type = 3
                pic.mime = mime_type
                pic.desc = "Front Cover"
                pic.data = artwork_bytes
                audio.add_picture(pic)

            audio.save()

        elif ext in {".m4a", ".mp4"}:
            audio = MP4(file_path)
            if title:
                audio["\xa9nam"] = [title]
            if artist:
                audio["\xa9ART"] = [artist]
            if album:
                audio["\xa9alb"] = [album]
            if year:
                audio["\xa9day"] = [year]
            if genre:
                audio["\xa9gen"] = [genre]
            if track_num and track_num.isdigit():
                audio["trkn"] = [(int(track_num), 0)]
            if lyrics:
                audio["\xa9lyr"] = [lyrics]

            audio[f"----:com.apple.iTunes:{TAG_KEY}"] = [MP4FreeForm(TAG_VAL.encode("utf-8"))]

            if artwork_bytes:
                is_png = artwork_bytes.startswith(b"\x89PNG\r\n\x1a\n")
                covr_fmt = MP4Cover.FORMAT_PNG if is_png else MP4Cover.FORMAT_JPEG
                audio["covr"] = [MP4Cover(artwork_bytes, imageformat=covr_fmt)]

            audio.save()

        elif ext in {".ogg", ".opus"}:
            audio = OggOpus(file_path) if ext == ".opus" else OggVorbis(file_path)
            if title:
                audio["TITLE"] = [title]
            if artist:
                audio["ARTIST"] = [artist]
            if album:
                audio["ALBUM"] = [album]
            if year:
                audio["DATE"] = [year]
            if track_num:
                audio["TRACKNUMBER"] = [track_num]
            if genre:
                audio["GENRE"] = [genre]
            if lyrics:
                audio["LYRICS"] = [lyrics]

            audio[TAG_KEY] = [TAG_VAL]
            audio.save()

    except Exception as e:
        return {"success": False, "error": f"Failed to embed tags: {str(e)}"}

    # Save sidecar lyrics if requested
    if lyrics and save_lrc:
        try:
            lrc_path = file_path.parent / f"{file_path.stem}.lrc"
            with open(lrc_path, "w", encoding="utf-8") as lf:
                lf.write(lyrics)
        except Exception:
            pass

    # Optional Rename
    new_path = file_path
    renamed = False
    if rename_file and artist and title and artist.lower() != "unknown" and title.lower() != "unknown":
        clean_artist = sanitize_filename_part(artist)
        clean_title = sanitize_filename_part(title)
        if clean_artist and clean_title:
            target_name = f"{clean_artist} - {clean_title}{ext}"
            target_file = file_path.parent / target_name
            if target_file.name != file_path.name and not target_file.exists():
                try:
                    # Rename sidecar lrc
                    old_lrc = file_path.parent / f"{file_path.stem}.lrc"
                    new_lrc = file_path.parent / f"{clean_artist} - {clean_title}.lrc"
                    if old_lrc.exists() and not new_lrc.exists():
                        old_lrc.rename(new_lrc)

                    file_path.rename(target_file)
                    new_path = target_file
                    renamed = True
                except Exception:
                    pass

    return {
        "success": True,
        "renamed": renamed,
        "newPath": str(new_path.resolve()),
        "newFilename": new_path.name
    }
