from __future__ import annotations as _annotations

import asyncpg
import logfire

from src.core.config import settings

# pyright: reportUnknownMemberType=false
# pyright: reportUnknownVariableType=false

async def database_connect(
    create_db: bool = False,
    localhost: str | None = "127.0.0.1",
    db_port: int | None = None,
    db_user: str | None = None,
    db_password: str | None = None,
    db_database_name: str | None = None,
) -> asyncpg.Pool:
    host = localhost
    port = db_port
    user = db_user
    password = db_password
    database = db_database_name

    server_dsn = f'postgresql://{user}:{password}@{host}:{port}'  # pragma: allowlist secret

    if create_db:
        with logfire.span('check and create DB'):
            conn = await asyncpg.connect(server_dsn)
            try:
                db_exists = await conn.fetchval('SELECT 1 FROM pg_database WHERE datname = $1', database)
                if not db_exists:
                    await conn.execute(f'CREATE DATABASE {database}')
            finally:
                await conn.close()

    pool = await asyncpg.create_pool(f'{server_dsn}/{database}')

    # Proactively verify connection and apply schema to ensure readiness
    try:
        async with pool.acquire() as conn:
            await conn.execute(DB_SCHEMA)
        logfire.info(f"RAG Database connection ready and schema verified for table: {FULL_TABLE_NAME}")
    except Exception as e:
        logfire.error(f"RAG Database readiness check failed: {e}")
        await pool.close()
        raise e

    return pool


# Get the full table name from settings, accounting for LlamaIndex's automatic prefixing
PREFIX = settings.llamaindex_table_name_prefix if settings.is_llamaindex_built else ""
FULL_TABLE_NAME = f"{PREFIX}{settings.db_table_name}"

DB_SCHEMA = f"""
CREATE EXTENSION IF NOT EXISTS vector;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'manifest_status') THEN
        CREATE TYPE manifest_status AS ENUM ('active', 'pending', 'rolled_back', 'deprecated');
    END IF;
END $$;

-- Metadata Control Plane Table
CREATE TABLE IF NOT EXISTS node_manifests (
    id SERIAL PRIMARY KEY,
    node_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    payload JSONB NOT NULL,
    status manifest_status DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(node_id, version)
);

-- Use a more standard schema for Industrial RAG
CREATE TABLE IF NOT EXISTS {FULL_TABLE_NAME} (
    id UUID PRIMARY KEY,
    text TEXT NOT NULL,
    metadata_ JSONB NOT NULL,
    node_id TEXT,
    embedding vector({settings.embedding_dim}) NOT NULL
);

-- HNSW Index for fast similarity search
CREATE INDEX IF NOT EXISTS idx_{FULL_TABLE_NAME}_embedding
ON {FULL_TABLE_NAME} USING hnsw (embedding vector_cosine_ops);
"""
