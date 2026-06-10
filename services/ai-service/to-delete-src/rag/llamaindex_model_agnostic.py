"""
Model-agnostic API for LlamaIndex embeddings.
Wraps GoogleGenAIEmbedding and Hugging Face Inference API into a single interface.
"""

from detect_secrets import settings
import logfire
import numpy as np
from typing import Any, List, Optional
from llama_index.core.embeddings import BaseEmbedding
from llama_index.embeddings.google_genai import GoogleGenAIEmbedding
from google.genai.types import EmbedContentConfig
from huggingface_hub import InferenceClient, AsyncInferenceClient
from pydantic import Field, PrivateAttr

from src.core.config import settings


class HuggingFaceInferenceAPIEmbedding(BaseEmbedding):
    """
    Hugging Face Inference API Embedding model implementation for LlamaIndex.
    """

    api_key: Optional[str] = Field(default=None, description="Hugging Face API Key")
    model_name: str = Field(description="Hugging Face model name")

    _client: InferenceClient = PrivateAttr()
    _async_client: AsyncInferenceClient = PrivateAttr()

    def __init__(
        self, model_name: str, api_key: Optional[str] = None, **kwargs: Any
    ) -> None:
        super().__init__(model_name=model_name, **kwargs)
        self.api_key = api_key
        self._client = InferenceClient(api_key=self.api_key)
        self._async_client = AsyncInferenceClient(api_key=self.api_key)

    def _get_query_embedding(self, query: str) -> List[float]:
        """Get query embedding."""
        try:
            result = self._client.feature_extraction(query, model=self.model_name)
            if isinstance(result, np.ndarray):
                return result.tolist()
            return result
        except Exception as e:
            logfire.error(f"Hugging Face sync query embedding failed: {e}")
            raise

    def _get_text_embedding(self, text: str) -> List[float]:
        """Get text embedding."""
        try:
            result = self._client.feature_extraction(text, model=self.model_name)
            if isinstance(result, np.ndarray):
                return result.tolist()
            return result
        except Exception as e:
            logfire.error(f"Hugging Face sync text embedding failed: {e}")
            raise

    def _get_embeddings(self, list_of_text: List[str]) -> List[List[float]]:
        """Get a list of text embeddings."""
        return [self._get_text_embedding(text) for text in list_of_text]

    async def _aget_query_embedding(self, query: str) -> List[float]:
        """Asynchronously get query embedding."""
        try:
            result = await self._async_client.feature_extraction(
                query, model=self.model_name
            )
            if isinstance(result, np.ndarray):
                return result.tolist()
            return result
        except Exception as e:
            logfire.error(f"Hugging Face async query embedding failed: {e}")
            raise

    async def _aget_text_embedding(self, text: str) -> List[float]:
        """Asynchronously get text embedding."""
        try:
            result = await self._async_client.feature_extraction(
                text, model=self.model_name
            )
            if isinstance(result, np.ndarray):
                return result.tolist()
            return result
        except Exception as e:
            logfire.error(f"Hugging Face async text embedding failed: {e}")
            raise


def get_embedding_model(
    provider: Optional[str] = None,
    model_name: Optional[str] = None,
    embedding_dim: Optional[int] = None,
):
    """
    Returns a model-agnostic embedding model based on settings or provided arguments.

    Args:
        provider: 'google' or 'huggingface'. Defaults to settings.embedding_provider.
        model_name: Specific model ID.
        embedding_dim: Dimensionality (primarily for Google models).
    """
    provider = (provider or settings.embedding_provider).lower()

    if provider == "google":
        model = model_name or settings.embedding_model
        dim = embedding_dim or settings.embedding_dim
        logfire.info(f"Initializing Google GenAI Embedding: {model} (dim={dim})")
        return GoogleGenAIEmbedding(
            model_name=model,
            embedding_config=EmbedContentConfig(output_dimensionality=dim),
        )
    elif provider == "huggingface":
        model = model_name or settings.hf_embedding_model
        logfire.info(f"Initializing Hugging Face Inference API Embedding: {model}")
        return HuggingFaceInferenceAPIEmbedding(
            model_name=model, api_key=settings.hf_api_key
        )
    else:
        logfire.error(f"Unsupported embedding provider requested: {provider}")
        raise ValueError(f"Unsupported embedding provider: {provider}")


if __name__ == "__main__":
    # Quick test harness
    import asyncio

    async def test():
        print("--- Testing Model Agnostic Embeddings ---")

        # 1. Test Hugging Face via Agnostic API
        try:
            print("\nTesting Hugging Face Provider via get_embedding_model...")
            # Ensure we have a key for the test if not in settings
            # if not settings.hf_api_key:
            #     import os

            #     os.environ["HF_API_KEY"] =

            model = get_embedding_model(provider="huggingface")
            emb = await model.aget_query_embedding(
                "Institutional reasoning for risk mitigation."
            )
            print(f"✅ Hugging Face embedding success. Length: {len(emb)}")
            print(f"   Preview (last 3): {emb[-3:]}")
        except Exception as e:
            print(f"❌ Hugging Face embedding failed: {e}")

        # 2. Test Hugging Face
        # Use provided sample key if environment is not set up
        # hf_key =
        try:
            print("\nTesting Hugging Face Provider...")
            model = HuggingFaceInferenceAPIEmbedding(
                model_name="sentence-transformers/all-MiniLM-L6-v2", api_key=hf_key
            )
            emb = await model.aget_query_embedding(
                "The Air Canada test for hallucination mitigation."
            )
            print(f"✅ Hugging Face embedding success. Length: {len(emb)}")
            print(f"   Preview (last 3): {emb[-3:]}")
        except Exception as e:
            print(f"❌ Hugging Face embedding failed: {e}")

    asyncio.run(test())
