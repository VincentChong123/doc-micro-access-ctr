import asyncpg
import logfire
import pydantic_core

from src.core.context_provider_interface import ContextProvider
from src.rag.embedder import embedder  # Correctly import the instance

from src.core.config import settings

# logfire.configure(send_to_logfire='if-token-present', console=logfire.ConsoleOptions(verbose=settings.is_logfire_verbose))

FULL_TABLE_NAME = settings.full_table_name


class RAGContextProvider(ContextProvider):
    """A context provider that retrieves information from a vector database."""

    def __init__(self, pool: asyncpg.Pool):
        self.pool = pool
        self.embedder = embedder  # Use the imported instance

    @property
    def name(self) -> str:
        return "INTERNAL_DOCUMENTATION"

    @logfire.instrument
    async def get_context(self, user_message: str) -> str:
        """
        Retrieves the most relevant document section from the vector DB.
        """
        # Industrial RAG best practice: avoid vector search for trivial/unrelated queries
        keywords = ['fastapi', 'pydantic', 'rag', 'database', 'postgres', 'llamaindex', "logfire"]
        if not any(kw in user_message.lower() for kw in keywords):
            return ""

        embedding_result = await self.embedder.embed_query(user_message)
        embedding = embedding_result.embeddings[0]
        embedding_json = pydantic_core.to_json(embedding).decode()

        async with self.pool.acquire() as conn:
            # Use the <-> operator for L2 distance, quoting the table name
            result = await conn.fetchrow(
                f'SELECT text FROM "{FULL_TABLE_NAME}" ORDER BY embedding <-> $1::vector LIMIT 1',
                embedding_json,
            )

        if result:
            # LlamaIndex stores text in 'text' column, while custom schema might use 'content'
            # The new Industrial Schema uses 'text' to match LlamaIndex.
            content = result['text']
            print({"retrieved_chunk_length": len(content)})
            return content
        else:
            return ""
