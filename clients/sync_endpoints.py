import yaml
import re
from pathlib import Path

# Setup paths relative to this script
BASE_DIR = Path(__file__).resolve().parent.parent
SPEC_PATH = BASE_DIR / "docs" / "architecture-spec.yaml"
CONFIG_PATH = Path(__file__).resolve().parent / "google-sheets-ui/Config.js"


def sync_endpoints():
    print("Reading architecture-spec.yaml...")
    with open(SPEC_PATH, "r") as f:
        spec = yaml.safe_load(f)

    ai_endpoint = ""
    workflow_endpoint = ""

    # Search for the relevant paths
    for path in spec.get("paths", {}).keys():
        if path.startswith("/api/ai/"):
            ai_endpoint = path
        elif path.startswith("/api/workflow/"):
            workflow_endpoint = path

    print("\n--- 1. Extracted from architecture-spec.yaml ---")
    print(f"  AI_ENDPOINT       -> {ai_endpoint}")
    print(f"  WORKFLOW_ENDPOINT -> {workflow_endpoint}")
    print("------------------------------------------------\n")

    print("Updating Config.js...")
    with open(CONFIG_PATH, "r") as f:
        config_js = f.read()

    # Regex update the exact endpoint values dynamically
    config_js = re.sub(
        r'AI_ENDPOINT:\s*".*?"', f'AI_ENDPOINT: "{ai_endpoint}"', config_js
    )
    config_js = re.sub(
        r'WORKFLOW_ENDPOINT:\s*".*?"',
        f'WORKFLOW_ENDPOINT: "{workflow_endpoint}"',
        config_js,
    )

    with open(CONFIG_PATH, "w") as f:
        f.write(config_js)

    # Verify and print what was written to Config.js
    final_ai = re.search(r'AI_ENDPOINT:\s*"(.*?)"', config_js).group(1)
    final_wf = re.search(r'WORKFLOW_ENDPOINT:\s*"(.*?)"', config_js).group(1)
    
    print("\n--- 2. Written to Config.js ---")
    print(f"  AI_ENDPOINT       -> {final_ai}")
    print(f"  WORKFLOW_ENDPOINT -> {final_wf}")
    print("-------------------------------\n")

    print("✅ Config.js successfully synchronized with architecture-spec.yaml!")


if __name__ == "__main__":
    sync_endpoints()
