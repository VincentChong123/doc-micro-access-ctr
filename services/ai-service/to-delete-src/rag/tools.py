from __future__ import annotations as _annotations

import asyncpg
import pydantic_core
from dataclasses import dataclass

from pydantic_ai import Agent, RunContext
from src.rag.embedder import embedder
from src.core.config import settings


@dataclass
class Deps:
    pool: asyncpg.Pool


# Global agent instance for RAG tools
rag_agent = Agent(
    model=settings.rag_gemini_model,
    deps_type=Deps,
    system_prompt='Use the retrieve tool to find information and answer the user\'s question.',
)


# @rag_agent.tool
# async def retrieve(ctx: RunContext[Deps], search_query: str) -> str:
#     """Retrieve documentation sections based on a search query."""
#     print(f"DEBUG: retrieve tool called with search_query: '{search_query}'")
#     embedding_result = await embedder.embed_query(search_query)
#     embedding = embedding_result.embeddings[0]  # 1536‑dim float list
#     embedding_json = pydantic_core.to_json(embedding).decode()

#     rows = await ctx.deps.pool.fetch(
#         'SELECT url, title, content FROM doc_sections ORDER BY embedding <-> $1 LIMIT 8',
#         embedding_json,
#     )

#     results = ''
#     for row in rows:
#         results += f'''# {row["title"]}
#         Documentation URL: {row["url"]}
#         {row["content"]} \n\n'''

#     with open(
#         "/home/vin/01-prj/chatbot_pydantic/log/test_rag.log",
#         "w",
#     ) as f:
#         f.write(results)

#     return results
