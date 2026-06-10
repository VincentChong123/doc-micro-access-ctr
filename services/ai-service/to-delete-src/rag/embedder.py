from pydantic_ai import Embedder

from dotenv import load_dotenv
from src.core.config import settings

embedder = Embedder(
    "google-gla:gemini-embedding-2-preview",
    settings={"dimensions": settings.embedding_dim},
)
