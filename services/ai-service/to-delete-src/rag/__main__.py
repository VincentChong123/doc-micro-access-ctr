from __future__ import annotations as _annotations

import os
import asyncio
import httpx
import logfire
import sys
import asyncpg
import pydantic_core

from src.rag import database
from src.rag.database import database_connect
from src.rag.models import DocsSection, sections_ta
from src.rag.embedder import embedder
from src.rag.tools import rag_agent, Deps

# --- Start API Key Check ---
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
print(f"DEBUG: GOOGLE_API_KEY found in environment: {GOOGLE_API_KEY}")  # pragma: allowlist secret
if not GOOGLE_API_KEY or GOOGLE_API_KEY == "YOUR_API_KEY":  # pragma: allowlist secret
    raise ValueError(
        "The GOOGLE_API_KEY environment variable is not set or is set to the placeholder value. " "Please set it to your valid Google Gemini API key."
    )
os.environ["GEMINI_API_KEY"] = GOOGLE_API_KEY  # pragma: allowlist secret
# --- End API Key Check ---


# JSON document from
# https://gist.githubusercontent.com/samuelcolvin/4b5bb9bb163b1122ff17e29e48c10992/raw/80c5925c42f1442c24963aaf5eb1a324d47afe95/logfire_docs.json'
DOCS_JSON = (
    'https://gist.githubusercontent.com/'
    'samuelcolvin/4b5bb9bb163b1122ff17e29e48c10992/raw/'
    '80c5925c42f1442c24963aaf5eb1a324d47afe95/logfire_docs.json'
)


async def build_search_db():
    async with httpx.AsyncClient() as client:
        response = await client.get(DOCS_JSON)
        response.raise_for_status()
    sections = sections_ta.validate_json(response.content)

    async with database_connect(True) as pool:
        with logfire.span('create schema'):
            async with pool.acquire() as conn:
                async with conn.transaction():
                    await conn.execute(database.DB_SCHEMA)

        sem = asyncio.Semaphore(10)

        tasks = [asyncio.create_task(insert_doc_section(sem, pool, section)) for section in sections]
        done, _ = await asyncio.wait(tasks, return_when=asyncio.ALL_COMPLETED)
        for future in done:
            exc = future.exception()
            if exc:
                print(f"Task raised {exc}")


async def insert_doc_section(
    sem: asyncio.Semaphore,
    pool: asyncpg.Pool,
    section: DocsSection,
) -> None:
    async with sem:
        url = section.url()
        exists = await pool.fetchval('SELECT 1 FROM doc_sections WHERE url = $1', url)
        if exists:
            logfire.info('Skipping {url=}', url=url)
            return

        with logfire.span('create embedding for {url=}', url=url):
            result = await embedder.embed_query(section.embedding_content())
            embedding = result.embeddings[0]

        embedding_json = pydantic_core.to_json(embedding).decode()
        await pool.execute(
            'INSERT INTO doc_sections (url, title, content, embedding) VALUES ($1, $2, $3, $4)',
            url,
            section.title,
            section.content,
            embedding_json,
        )


async def run_search(question: str):
    """Run a standalone search using the RAG tool for testing."""
    async with database_connect(False) as pool:
        # Use the global rag_agent
        answer = await rag_agent.run(question, deps=Deps(pool=pool))
        print(f'Question: "{question}"')
        print(f'Answer: {answer.output}')


if __name__ == '__main__':
    action = sys.argv[1] if len(sys.argv) > 1 else None
    if action == 'build':
        asyncio.run(build_search_db())
    elif action == 'search':
        q = sys.argv[2] if len(sys.argv) == 3 else 'How do I configure logfire to work with FastAPI?'
        asyncio.run(run_search(q))
    else:
        print(
            'Usage: python -m src.rag build|search [question]',
            file=sys.stderr,
        )
        sys.exit(1)
