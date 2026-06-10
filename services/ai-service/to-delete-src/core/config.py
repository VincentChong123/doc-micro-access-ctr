from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache
from pathlib import Path
from typing import Optional
import pydantic_ai


class Settings(BaseSettings):
    """
    Application settings for the chatbot-pydantic project.
    Values are loaded in the following priority:
    1. System environment variables (e.g., from GCP Cloud Run)
    2. Values from the .env file
    3. Default values defined in this class
    """

    # Core Application Settings
    is_debug: bool = False
    is_reload_uvicorn: bool = False
    port: int = 8000

    # Database / pgvector Settings
    db_host: str = "127.0.0.1"
    db_port: int = 54320
    db_user: str = "postgres"
    db_password: str = "postgres"
    db_database_name: str = "db_doc_sections_llamaindex"
    db_table_name: str = "table_doc_sections_llamaindex"
    llamaindex_table_name_prefix: str = "data_"  # LlamaIndex default prefix
    is_llamaindex_built: bool = True  # Flag to use the prefix in retrieval

    # RAG Settings
    embedding_provider: str = "huggingface"  # "google" or "huggingface"
    embedding_model: str = "gemini-embedding-2-preview"
    embedding_dim: int = 384  # Updated for sentence-transformers/all-MiniLM-L6-v2

    hf_api_key: Optional[str] = ""
    hf_embedding_model: str = "sentence-transformers/all-MiniLM-L6-v2"

    chunk_size: int = 512
    chunk_overlap: int = 50

    # Secret Management (Inject from GCP Secret Manager in Cloud Run)
    # Using None allows Pydantic AI to fallback to environment variables if not explicitly provided
    # google_api_key: Optional[str] = None
    # rag_gemini_model: str = "google-gla:gemini-3-pro-preview"
    # chatbot_gemini_model: str = 'google-gla:gemini-3-pro-preview'
    rag_gemini_model: str = "google-gla:gemini-2.5-flash-lite"
    chatbot_gemini_model: str = "google-gla:gemini-2.5-flash-lite"

    # Path to the system prompt file

    # system_prompt_path: Path = Path(".gemini/system.md")

    # Pydantic Settings Configuration
    model_config = SettingsConfigDict(
        env_file=".env", env_file_encoding="utf-8", extra="ignore"
    )

    static_dir: str = "src/static"  # The Single Source of Truth

    is_logfire_verbose: bool = True

    # logging
    OTEL_EXPORTER_OTLP_ENDPOINT: str = "http://localhost:4317"
    OTEL_SERVICE_NAME: str = "chatbot_pydantic-local"

    @property
    def full_table_name(self) -> str:
        """
        Returns the full table name, accounting for LlamaIndex's automatic prefixing.
        """
        prefix = self.llamaindex_table_name_prefix if self.is_llamaindex_built else ""
        return f"{prefix}{self.db_table_name}"


@lru_cache()
def get_settings() -> Settings:
    """
    Returns a cached instance of the Settings object.
    """
    return Settings()


# Convenient instance for global use
settings = get_settings()
