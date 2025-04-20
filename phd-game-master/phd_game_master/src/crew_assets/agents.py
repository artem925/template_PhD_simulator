"""crew_assets/agents.py
Agents responsible for generating and integrating visual & audio assets for the
16‑bit PhD‑Writing‑Simulator.
"""
import os 
from crewai import Agent
from crewai_tools import (
    DallETool,
    FileReadTool,
    FileWriterTool,
    CodeInterpreterTool,
)
from .tools import (
    ImageResponsiveTool,
    ImageCompressTool,
    AudioNormalizeTool,
    AudioSpriteTool,
    GitOpsTool,
)

image_model = os.getenv("IMAGE_MODEL", "dall-e-2")  # fallback to DALL·E 2

image_asset_agent = Agent(
    name="ImageAssetAgent",
    role="16‑bit Pixel‑Artist & UI Designer",
    goal=(
        "Generate cohesive retro‑pixel art (sprite‑sheets, UI, backgrounds) "
        "in multiple resolutions (<200 KB each) and store under assets/images/."
    ),
    backstory=(
        "Veteran game artist experienced in SNES‑era aesthetics, fluent in "
        "Stable‑Diffusion via ComfyUI and DALL·E 3."
    ),
    tools=[
        DallETool(model=image_model),
        ImageResponsiveTool(),
        ImageCompressTool(),
        FileWriterTool(),
    ],
)

audio_asset_agent = Agent(
    name="AudioAssetAgent",
    role="Indie Sound Designer & Mastering Engineer",
    goal=(
        "Source CC0/CC‑BY background loops & SFX, normalise to −14 LUFS, "
        "export OGG+MP3, and deposit in assets/audio/."
    ),
    backstory="Curates lo‑fi chiptune tracks and synthesises retro SFX.",
    tools=[
        AudioNormalizeTool(),
        AudioSpriteTool(),
        FileWriterTool(),
    ],
)

asset_integration_agent = Agent(
    name="AssetIntegrationAgent",
    role="Front‑End Build Engineer & Release Bot",
    goal=(
        "Integrate visual & audio assets into HTML/CSS/JS with responsive "
        "images, lazy loading, touch‑friendly UI, and update docs/manifests."
    ),
    backstory="Automates asset pipelines and pushes commits to Git.",
    allow_code_execution=True,
    tools=[
        FileReadTool(),
        FileWriterTool(),
        CodeInterpreterTool(),
        GitOpsTool(),
    ],
)

image_agent = image_asset_agent
audio_agent = audio_asset_agent
integrator_agent = asset_integration_agent

__all__ = [
    "image_asset_agent",
    "audio_asset_agent",
    "asset_integration_agent",
    "image_agent",
    "audio_agent",
    "integrator_agent",
]
