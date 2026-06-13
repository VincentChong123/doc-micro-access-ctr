import uvicorn
import logfire

# Configure Logging early so config.py and secret_manager.py can log properly
import utils.logger

from fastapi import FastAPI
from app.config import settings
import os

from dotenv import load_dotenv

load_dotenv("/home/vin/01-prj/doc-micro-access-ctr/.env")


# BEFORE Pydantic-AI evaluates the Agent!
os.environ["GROQ_API_KEY"] = settings.groq_api_key
# print(
#     "GROQ_API_KEY", os.environ["GROQ_API_KEY"]
# )  # Debug print to verify the key is set (remove in production!)


from app.api.routes import router
from utils.route_loader import get_ai_service_route

PREFIX, _ = get_ai_service_route()

app = FastAPI(title="Ringisho AI Service")

# Instrument FastAPI with Logfire
logfire.instrument_fastapi(app)

# Register the routes dynamically based on architecture-spec.yaml
app.include_router(router, prefix=PREFIX)

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
