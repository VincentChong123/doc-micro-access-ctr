import os
import sys
import utils.logger  # Initialize interceptor first
import logging

logger = logging.getLogger(__name__)

from pathlib import Path

# Add the parent directory to sys.path to allow importing from 'utils'
sys.path.append(str(Path(__file__).resolve().parent.parent))

from utils.secret_manager import access_secret_version  # pylint: disable=import-error
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # This will load from .env or docker env_file first
    groq_api_key: str = os.environ.get("GROQ_API_KEY", "")
    groq_model: str = "groq:openai/gpt-oss-120b"
    gcp_project_id: str = "543095975317"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()

# If the key is missing (e.g. running natively on Cloud Run), fetch it from Secret Manager!
if not settings.groq_api_key or settings.groq_api_key.startswith("gsk_csEN"):
    logger.info(f"Trying to fetch secret from GCP project {settings.gcp_project_id}...")

    settings.groq_api_key = access_secret_version(
        settings.gcp_project_id, "GROQ_API_KEY", "1", is_assert_null_secret=True
    )
    logger.info("✅ Successfully loaded GROQ_API_KEY from Google Cloud Secret Manager!")


def test_config():
    """Validates that no internal setting variable is null or empty."""
    for key, value in settings.model_dump().items():
        if value is None or value == "":
            raise ValueError(f"Configuration error: settings.{key} is null or empty!")
    logger.info("✅ All settings validated successfully.")


# Run the test immediately upon importing the config
test_config()


if __name__ == "__main__":

    # Run the test immediately upon importing the config
    test_config()
