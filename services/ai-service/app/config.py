from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    groq_api_key: str = "gsk_placeholder_key"  # Replace in .env
    # groq_model: str = "groq:llama3-70b-8192"  # Pydantic-AI syntax for Groq
    # groq_model: str = "groq:compound-mini"  # Pydantic-AI syntax for Groq
    # groq_model: str = "openai:gpt-oss-120b"  # Pydantic-AI syntax for Groq
    groq_model: str = "groq:openai/gpt-oss-120b"
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")


settings = Settings()
