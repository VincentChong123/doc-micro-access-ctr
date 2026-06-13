import yaml
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

def get_ai_service_route():
    """
    Parses the architecture-spec.yaml to dynamically determine the route 
    for the AI service. It looks for the path starting with /api/ai/ 
    and strips the Express mount prefix.
    """
    spec_path = Path(__file__).resolve().parent.parent.parent.parent / "docs" / "architecture-spec.yaml"
    try:
        with open(spec_path, "r") as f:
            spec = yaml.safe_load(f)
            
        for path in spec.get("paths", {}).keys():
            if path.startswith("/api/ai/"):
                # Strip the API Gateway Express mount
                backend_path = path.replace("/api/ai", "")
                
                # Split into prefix and endpoint
                # e.g., "/v1/sheet-chat" -> prefix "/v1", endpoint "/sheet-chat"
                parts = backend_path.strip("/").split("/", 1)
                prefix = f"/{parts[0]}"
                endpoint = f"/{parts[1]}" if len(parts) > 1 else ""
                
                logger.info(f"Dynamically loaded route from spec: Prefix='{prefix}', Endpoint='{endpoint}'")
                return prefix, endpoint
                
    except Exception as e:
        logger.error(f"Failed to load dynamic route from spec: {e}")
        
    # Safe Fallback if file parsing fails
    logger.warning("Falling back to hardcoded /v1 and /sheet-chat")
    return "/v1", "/sheet-chat"


if __name__ == "__main__":
    import sys
    # Add the parent directory to sys.path so we can import utils.logger correctly
    sys.path.append(str(Path(__file__).resolve().parent.parent))
    
    # Import the logger config so we see the output cleanly when testing
    import utils.logger
    
    logger.info("Testing route_loader directly...")
    prefix, endpoint = get_ai_service_route()
    logger.info(f"Final extracted Prefix: {prefix}")
    logger.info(f"Final extracted Endpoint: {endpoint}")
