import sys
import runpy
import os
from pathlib import Path

if len(sys.argv) < 2:
    print("Error: No file path provided.")
    sys.exit(1)

# Get the absolute file path from VS Code (${file})
file_path = Path(sys.argv[1]).resolve()

# Start with the current working directory (usually the workspace folder)
workspace_dir = Path(os.getcwd())
root_dir = workspace_dir

# Traverse upwards from the file to find the python project root
# (e.g., the folder containing main.py, requirements.txt, etc.)
current_dir = file_path.parent
while current_dir.is_relative_to(workspace_dir) and current_dir != workspace_dir:
    # Check for common project root markers
    if any((current_dir / marker).exists() for marker in ["main.py", "requirements.txt", "pyproject.toml", "setup.py"]):
        root_dir = current_dir
        break
    current_dir = current_dir.parent

# Fallback: if we still haven't found a root but see an "app" folder, use its parent
if root_dir == workspace_dir and 'app' in file_path.parts:
    app_index = file_path.parts.index('app')
    root_dir = Path(*file_path.parts[:app_index])

# FIX: If GOOGLE_APPLICATION_CREDENTIALS is a relative path (e.g. "./keys/..."), 
# resolve it relative to the workspace root (where .vscode is located), 
# NOT the current working directory, which might already be inside services/ai-service.
workspace_root = Path(__file__).parent.parent.resolve()
if "GOOGLE_APPLICATION_CREDENTIALS" in os.environ:
    cred_path = os.environ["GOOGLE_APPLICATION_CREDENTIALS"]
    if not os.path.isabs(cred_path):
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = str((workspace_root / cred_path).resolve())

# 1. Change the working directory to the python project root so imports work
os.chdir(root_dir)
sys.path.insert(0, str(root_dir))

# 2. Get the relative path from the python project root
try:
    rel_path = file_path.relative_to(root_dir)
except ValueError:
    rel_path = Path(file_path.name)

# 3. Remove the ".py" extension and convert to module notation
if rel_path.suffix == '.py':
    rel_path = rel_path.with_suffix('')

module_name = str(rel_path).replace(os.sep, '.')

# 4. Clean up sys.argv so the target module doesn't see our wrapper arguments
sys.argv = [module_name] + sys.argv[2:]

print(f"--- Debugging module: {module_name} ---")
print(f"--- Working directory: {root_dir} ---")

# 5. Run the module
runpy.run_module(module_name, run_name="__main__", alter_sys=True)
