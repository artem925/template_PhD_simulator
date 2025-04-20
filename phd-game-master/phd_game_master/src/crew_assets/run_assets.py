# crew_assets/run_assets.py
import dotenv, os, pathlib
from crewai import Crew
from .agents import image_agent, audio_agent, integrator_agent
from .tasks  import image_tasks, audio_tasks, integration_tasks

# Load your .env so OPENAI_API_KEY etc. are present
dotenv.load_dotenv()

crew = Crew(
    agents=[image_agent, audio_agent, integrator_agent],
    tasks=image_tasks + audio_tasks + integration_tasks,
    verbose=True,
    max_rpm=3,          # avoid rate‑limit
)

if __name__ == "__main__":
    summary = crew.kickoff()
    print("\n✔ Asset pipeline finished\n")
    print(summary)
