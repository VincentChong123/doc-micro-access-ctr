from pydantic_settings import BaseSettings, SettingsConfigDict

# Fix: use the correct import path relative to the microservice root
from utils.secret_manager import access_secret_version


class Settings(BaseSettings):
    # This will load from .env or docker env_file first
    groq_api_key: str = ""
    groq_model: str = "groq:openai/gpt-oss-120b"
    gcp_project_id: str = "543095975317"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

# If the key is missing (e.g. running natively on Cloud Run), fetch it from Secret Manager!
if not settings.groq_api_key or settings.groq_api_key.startswith("gsk_csEN"):
    gcp_secret = access_secret_version(settings.gcp_project_id, "GROQ_API_KEY", "1")
    if gcp_secret:
        settings.groq_api_key = gcp_secret
        print("✅ Successfully loaded GROQ_API_KEY from Google Cloud Secret Manager!")
