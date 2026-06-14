import yaml
import re
from pathlib import Path

# Setup paths relative to this script
BASE_DIR = Path(__file__).resolve().parent.parent
SPEC_PATH = BASE_DIR / "specs" / "architecture-spec.yaml"
COMPOSE_PATH = BASE_DIR / "infrastructure" / "docker-compose.yml"
AI_SCRIPT = BASE_DIR / "services" / "ai_service" / "run_docker_ai_service.sh"
DOC_SCRIPT = BASE_DIR / "services" / "document_service" / "run_docker_document_service.sh"
API_SCRIPT = BASE_DIR / "gateway" / "api_gateway" / "run_api_gateway.sh"
MINIO_SCRIPT = BASE_DIR / "infrastructure" / "run_minio.sh"

def sync_docker():
    print("Reading architecture-spec.yaml...")
    with open(SPEC_PATH, "r") as f:
        spec = yaml.safe_load(f)

    # Extract our single source of truth
    infra = spec.get("x-infrastructure", {})
    network_name = infra.get("docker", {}).get("network_name", "ringisho-net")
    services = infra.get("services", {})

    api_gw = services.get("api_gateway", {})
    ai_svc = services.get("ai_service", {})
    doc_svc = services.get("document_service", {})
    minio = services.get("minio", {})

    print("\n--- Syncing docker-compose.yml ---")
    with open(COMPOSE_PATH, "r") as f:
        compose = f.read()

    # Update docker-compose.yml container names
    compose = re.sub(r'container_name:\s*api_gateway.*', f'container_name: {api_gw.get("container_name")}', compose)
    compose = re.sub(r'container_name:\s*ai_service.*', f'container_name: {ai_svc.get("container_name")}', compose)
    compose = re.sub(r'container_name:\s*document_service.*', f'container_name: {doc_svc.get("container_name")}', compose)
    compose = re.sub(r'container_name:\s*minio.*', f'container_name: {minio.get("container_name")}', compose)

    # Update docker-compose.yml environment URLs
    compose = re.sub(r'AI_SERVICE_URL=http://.*:\d+', f'AI_SERVICE_URL=http://{ai_svc.get("container_name")}:{ai_svc.get("port")}', compose)
    compose = re.sub(r'DOC_SERVICE_URL=http://.*:\d+', f'DOC_SERVICE_URL=http://{doc_svc.get("container_name")}:{doc_svc.get("port")}', compose)

    with open(COMPOSE_PATH, "w") as f:
        f.write(compose)

    print("--- Syncing bash scripts ---")

    def update_script_ports_and_names(script_path, service_info, is_gateway=False):
        if not script_path.exists():
            print(f"  [Skipped] {script_path.name} not found.")
            return

        with open(script_path, "r") as f:
            content = f.read()

        # Update container name
        content = re.sub(r'--name\s+[^\s\\]+', f'--name {service_info.get("container_name")}', content)
        # Update network
        content = re.sub(r'--network\s+[^\s\\]+', f'--network {network_name}', content)

        # Update port (simplistic regex for standard scripts)
        if "port" in service_info:
            content = re.sub(r'-p\s+\d+:\d+', f'-p {service_info.get("port")}:{service_info.get("port")}', content)
            content = re.sub(r'PORT_NUM=\$\{1:-\d+\}', f'PORT_NUM=${{1:-{service_info.get("port")}}}', content)

        # Inject dynamic URLs for Gateway
        if is_gateway:
            content = re.sub(r'AI_SERVICE_URL=\$\{1:-http://.*:\d+\}', f'AI_SERVICE_URL=${{1:-http://{ai_svc.get("container_name")}:{ai_svc.get("port")}}}', content)
            content = re.sub(r'DOC_SERVICE_URL=\$\{2:-http://.*:\d+\}', f'DOC_SERVICE_URL=${{2:-http://{doc_svc.get("container_name")}:{doc_svc.get("port")}}}', content)

        with open(script_path, "w") as f:
            f.write(content)
        print(f"  [Updated] {script_path.name}")

    update_script_ports_and_names(AI_SCRIPT, ai_svc)
    update_script_ports_and_names(DOC_SCRIPT, doc_svc)
    update_script_ports_and_names(API_SCRIPT, api_gw, is_gateway=True)

    # Custom update for Minio due to multiple ports
    if MINIO_SCRIPT.exists():
        with open(MINIO_SCRIPT, "r") as f:
            content = f.read()
        content = re.sub(r'--name\s+[^\s\\]+', f'--name {minio.get("container_name")}', content)
        content = re.sub(r'--network\s+[^\s\\]+', f'--network {network_name}', content)
        # Hard replacing the exact 9000/9001 bindings just for clarity
        content = re.sub(r'-p\s+\d+:\d+\s+\\\n\s+-p\s+\d+:\d+', f'-p {minio.get("port_api")}:{minio.get("port_api")} \\\n  -p {minio.get("port_console")}:{minio.get("port_console")}', content)

        with open(MINIO_SCRIPT, "w") as f:
            f.write(content)
        print(f"  [Updated] {MINIO_SCRIPT.name}")

    print("\n✅ All docker configuration files successfully synchronized with architecture-spec.yaml!")

if __name__ == "__main__":
    sync_docker()
