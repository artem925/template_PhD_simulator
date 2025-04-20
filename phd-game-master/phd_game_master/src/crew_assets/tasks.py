# crew_assets/tasks.py
"""Defines the Task objects consumed by the CrewAI pipeline.
Each task now includes the required *expected_output* field (CrewAI ≥ 0.5).
"""
from __future__ import annotations

from crewai import Task

# Local import kept indirect to avoid circular‑import during module init
from . import agents as ag

# ---------------------------------------------------------------------------
# Helper factory – cuts down boilerplate and guarantees expected_output exists
# ---------------------------------------------------------------------------

def T(desc: str, *, agent, output: str | None = None) -> Task:  # noqa: N802
    """Return a Task with a default expected_output if none supplied."""
    return Task(
        description=desc,
        agent=agent,
        expected_output=output or "Path(s) to generated asset(s) or confirmation log.",
    )

# ---------------------------------------------------------------------------
# IMAGE‑GENERATION TASKS
# ---------------------------------------------------------------------------
image_tasks: list[Task] = [
    T(
        "Generate startup screen art (logo + title); deliver 1024×1024 plus "
        "512×512 & 256×256 versions.",
        agent=ag.image_agent,
        output="assets/images/startup_{1024,512,256}.png",
    ),
    T(
        "Produce sprite‑sheet for main character (4×4 frames, 128 px cells).",
        agent=ag.image_agent,
        output="assets/images/sprites/main_character.png",
    ),
    T(
        "Generate button/icon pack (play, settings, help) on transparent PNG.",
        agent=ag.image_agent,
        output="assets/images/icons/*.png",
    ),
]

# ---------------------------------------------------------------------------
# AUDIO‑GENERATION TASKS
# ---------------------------------------------------------------------------

audio_tasks: list[Task] = [
    T(
        "Find a chiptune loop (CC0/CC‑BY) and prep 30‑second OGG, −14 LUFS.",
        agent=ag.audio_agent,
        output="assets/audio/bgm/chiptune_loop.ogg",
    ),
    T(
        "Create or fetch ‘tap’ and ‘game‑over’ SFX (<15 KB each).",
        agent=ag.audio_agent,
        output="assets/audio/sfx/{tap,game_over}.ogg",
    ),
]

# ---------------------------------------------------------------------------
# INTEGRATION / BUILD‑PIPELINE TASKS
# ---------------------------------------------------------------------------

integration_tasks: list[Task] = [
    T(
        "Compress images to WebP/AVIF, generate <picture> srcset snippets, "
        "and update CSS media queries (16:9, 3:2, 1:1).",
        agent=ag.integrator_agent,
        output="index.html updated with responsive <picture> tags",
    ),
    T(
        "Add JS to preload audio, expose playSound(id), and wire events in "
        "game.js.",
        agent=ag.integrator_agent,
        output="game.js updated with preloadAudio() helper",
    ),
    T(
        "Generate docs/asset_catalog.md with thumbnails and licence info plus "
        "assets_manifest.json.",
        agent=ag.integrator_agent,
        output="docs/asset_catalog.md + assets_manifest.json",
    ),
]

__all__ = [
    "image_tasks",
    "audio_tasks",
    "integration_tasks",
]
