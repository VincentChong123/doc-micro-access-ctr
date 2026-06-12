import uvicorn
import logfire
from fastapi import FastAPI
from app.config import settings
import os

# BEFORE Pydantic-AI evaluates the Agent!
os.environ["GROQ_API_KEY"] = settings.groq_api_key
print(
    "GROQ_API_KEY", os.environ["GROQ_API_KEY"]
)  # Debug print to verify the key is set (remove in production!)


# Configure Logfire (must be before routing imports)
logfire.configure(
    send_to_logfire="if-token-present",
    pydantic_plugin=logfire.PydanticPlugin(record="all"),
)

from app.api.routes import router

app = FastAPI(title="Ringisho AI Service")

# Instrument FastAPI with Logfire
logfire.instrument_fastapi(app)

# Register the routes
app.include_router(router, prefix="/v1")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
