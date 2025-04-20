# crew_assets/tools.py
"""Custom CrewAI tools for image & audio processing plus simple Git tasks.
All classes inherit `BaseTool` (Pydantic v2) so every overridden attribute has
an explicit type annotation.  No external CLI calls are made inside the helper
methods except in `AudioSpriteTool` and `GitOpsTool`, where `subprocess` is
used with graceful error handling.  Make sure `ffmpeg` & `ffprobe` are on the
PATH if you use those two tools.
"""

from __future__ import annotations

import json
import os
import pathlib
import subprocess
import uuid
from typing import List

import requests
from crewai.tools import BaseTool
from PIL import Image, ImageOps
from pydub import AudioSegment

# ---------------------------------------------------------------------------
# Directories
# ---------------------------------------------------------------------------
ASSET_DIR = pathlib.Path("assets")
IMG_DIR = ASSET_DIR / "images"
AUD_DIR = ASSET_DIR / "audio"
IMG_DIR.mkdir(parents=True, exist_ok=True)
AUD_DIR.mkdir(parents=True, exist_ok=True)

# ---------------------------------------------------------------------------
# Image Tools
# ---------------------------------------------------------------------------

class ImageResponsiveTool(BaseTool):
    name: str = "image_responsive_tool"
    description: str = (
        "Create three aspect‑ratio variants (16:9, 3:2, 1:1) from a source PNG "
        "and return their absolute file paths as a list [16:9, 3:2, 1:1]."
    )

    def _run(self, png_path: str, max_width: int = 1024) -> List[str]:
        src = Image.open(png_path).convert("RGBA")
        variants = {
            "169": (16, 9),
            "32": (3, 2),
            "11": (1, 1),
        }
        out_paths: List[str] = []
        for key, (w_ratio, h_ratio) in variants.items():
            target_w = max_width
            target_h = int(target_w * h_ratio / w_ratio)
            variant = ImageOps.fit(src, (target_w, target_h), Image.Resampling.LANCZOS)
            out_name = (
                IMG_DIR / f"{pathlib.Path(png_path).stem}_{key}.png"
            ).as_posix()
            variant.save(out_name, format="PNG", optimize=True)
            out_paths.append(out_name)
        return out_paths


class ImageCompressTool(BaseTool):
    name: str = "image_compress_tool"
    description: str = "Convert PNG to AVIF/WebP under 200 KB and return path."

    def _run(self, png_path: str, fmt: str = "AVIF", target_size_kb: int = 200) -> str:
        fmt = fmt.upper()
        if fmt not in {"AVIF", "WEBP"}:
            raise ValueError("fmt must be 'AVIF' or 'WEBP'")
        im = Image.open(png_path).convert("RGBA")
        quality = 80
        out_file = pathlib.Path(png_path).with_suffix(f".{fmt.lower()}")
        while quality >= 10:
            im.save(out_file, format=fmt, quality=quality)
            size_kb = out_file.stat().st_size // 1024
            if size_kb <= target_size_kb:
                break
            quality -= 10
        return out_file.as_posix()


# ---------------------------------------------------------------------------
# Audio Tools
# ---------------------------------------------------------------------------

class AudioNormalizeTool(BaseTool):
    name: str = "audio_normalize_tool"
    description: str = (
        "Loudness‑normalize a clip to approx. −14 LUFS, trim silence, export "
        "OGG + MP3, and return path to the OGG file."
    )

    def _run(self, wav_or_mp3_path: str, target_lufs: float = -14.0) -> str:
        sound = AudioSegment.from_file(wav_or_mp3_path)
        change_needed = target_lufs - sound.dBFS
        sound = sound.apply_gain(change_needed)
        sound = sound.strip_silence(silence_len=200, silence_thresh=-40)
        out_base = AUD_DIR / pathlib.Path(wav_or_mp3_path).stem
        ogg_path = f"{out_base}.ogg"
        mp3_path = f"{out_base}.mp3"
        sound.export(ogg_path, format="ogg", bitrate="96k")
        sound.export(mp3_path, format="mp3", bitrate="128k")
        return ogg_path


class AudioSpriteTool(BaseTool):
    """Concatenate multiple short clips into one spritesheet and cue map."""

    name: str = "audio_sprite_tool"
    description: str = (
        "Combine clips into one OGG and generate a JSON cue map. Expects at "
        "least two input paths. Returns path to the sprite file."
    )

    def _run(self, *paths: str) -> str:
        if len(paths) < 2:
            raise ValueError("Need ≥2 clips to create a sprite sheet.")

        sprite_id = uuid.uuid4().hex
        concat_txt = AUD_DIR / f"{sprite_id}.txt"
        cue_map = {}
        cursor = 0.0

        with concat_txt.open("w", encoding="utf‑8") as fh:
            for p in paths:
                fh.write(f"file '{p}'\n")
                # duration via ffprobe
                try:
                    dur = float(
                        subprocess.check_output(
                            [
                                "ffprobe",
                                "-v",
                                "error",
                                "-show_entries",
                                "format=duration",
                                "-of",
                                "default=nw=1:nk=1",
                                p,
                            ],
                            text=True,
                        ).strip()
                    )
                except Exception as exc:
                    raise RuntimeError(f"ffprobe failed for {p}: {exc}") from exc
                cue_map[pathlib.Path(p).stem] = [cursor, dur]
                cursor += dur

        sprite_path = AUD_DIR / f"{sprite_id}.ogg"
        subprocess.check_call(
            [
                "ffmpeg",
                "-y",
                "-f",
                "concat",
                "-safe",
                "0",
                "-i",
                concat_txt,
                "-c:a",
                "libvorbis",
                sprite_path,
            ]
        )
        concat_txt.unlink(missing_ok=True)
        (sprite_path.with_suffix(".json")).write_text(json.dumps(cue_map, indent=2))
        return sprite_path.as_posix()


# ---------------------------------------------------------------------------
# Git helper
# ---------------------------------------------------------------------------

class GitOpsTool(BaseTool):
    name: str = "git_ops_tool"
    description: str = (
        "Stage modified files, commit with given message, and push (if remote)"
    )

    def _run(self, commit_message: str = "asset‑update") -> str:
        repo_root = pathlib.Path(__file__).resolve().parents[3]

        def _git(*args):
            return subprocess.check_output(["git", *args], cwd=repo_root, text=True)

        try:
            _git("add", ".")
            _git("commit", "-m", commit_message)
            try:
                _git("push")
                return "Committed & pushed."
            except subprocess.CalledProcessError:
                return "Committed locally (no remote/push failed)."
        except subprocess.CalledProcessError as e:
            return f"Git error: {e.output.strip()}"
