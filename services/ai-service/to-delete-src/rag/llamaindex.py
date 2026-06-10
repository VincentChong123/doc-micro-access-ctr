"""
LlamaIndex script for indexing markdown documents into a pgvector database.

This script provides a command-line interface to:
1. Connect to a PostgreSQL database with the pgvector extension.
2. Read all markdown files from a specified input directory.
3. Generate embeddings for the documents using a Gemini embedding model.
4. Store the documents, metadata, and their embeddings in a specified table.

Usage:
    python -m src.rag.llamaindex --table-name your_table_name --input-dir path/to/your/docs

To force a rebuild of the database (e.g., after changing dimensions):
    python -m src.rag.llamaindex --table-name your_table_name --input-dir path/to/your/docs --recreate-db

Database connection is configured via environment variables:
- db_HOST: The database host.
- db_PORT: The database port.
- db_USER: The database username.
- db_PASSWORD: The database password.
- db_DATABASE: The database name. (This will be the database where tables are created, potentially the same as table_name if no specific DB is needed)

The Gemini API key is loaded from Google Cloud Secret Manager.
"""

import os
import argparse
import asyncio
from dotenv import load_dotenv

import asyncpg  # Added for database creation check
import logfire

from llama_index.core import (
    VectorStoreIndex,
    SimpleDirectoryReader,
    StorageContext,
)

from llama_index.core import Settings as llama_index_core_settings

# from llama_index.embeddings.gemini import GeminiEmbedding
from llama_index.embeddings.google_genai import GoogleGenAIEmbedding
from google.genai.types import EmbedContentConfig

from llama_index.vector_stores.postgres import PGVectorStore
from google.cloud import secretmanager

from src.core.config import settings

# # Configure logfire to include filename and line number in console output
# logfire.configure(send_to_logfire='if-token-present', console=logfire.ConsoleOptions(verbose=settings.is_logfire_verbose))

# Load environment variables from .env file for database credentials
load_dotenv(dotenv_path="/home/vin/01-prj/chatbot_pydantic/env")


# --- Configuration ---
DEFAULT_TABLE_NAME = settings.db_table_name


async def _ensure_database_exists(host: str, port: int, user: str, password: str, dbname: str, recreate: bool = False):
    """Ensures the target PostgreSQL database exists, creating it if necessary."""
    default_dsn = f"postgresql://{user}:{password}@{host}:{port}/postgres"
    conn = None
    try:
        conn = await asyncpg.connect(default_dsn)

        if recreate:
            logfire.info(f"Recreate flag is set. Dropping database '{dbname}'...")
            await conn.execute(f'DROP DATABASE IF EXISTS "{dbname}" WITH (FORCE)')
            logfire.info(f"Database '{dbname}' dropped.")

        db_exists = await conn.fetchval("SELECT 1 FROM pg_database WHERE datname = $1", dbname)

        if not db_exists:
            logfire.info(f"Database '{dbname}' does not exist. Creating...")
            await conn.execute(f'CREATE DATABASE "{dbname}"')
            logfire.info(f"Database '{dbname}' created successfully.")
        else:
            logfire.info(f"Database '{dbname}' already exists.")
    except Exception as e:
        logfire.error(f"Error ensuring database '{dbname}' exists: {e}")
        raise
    finally:
        if conn:
            await conn.close()


def access_secret_version(secret_version_id: str) -> str:
    # ... (rest of the function is unchanged)
    logfire.info(f"Accessing secret: {secret_version_id}")
    try:
        client = secretmanager.SecretManagerServiceClient()
        response = client.access_secret_version(name=secret_version_id)
        payload = response.payload.data.decode("UTF-8")
        return payload
    except Exception as e:
        logfire.error(f"Error accessing secret manager: {e}")
        raise


async def build_index(table_name: str, input_dir: str, recreate_db: bool):
    """
    Builds a vector index from markdown files and stores it in pgvector.

    Args:
        table_name: The name of the table in the pgvector database.
        input_dir: The path to the directory containing markdown files to index.
        recreate_db: Flag to force drop and recreate the database.
    """
    logfire.info("--- Starting LlamaIndex pgvector Indexing ---")
    logfire.info(f"Target table: '{table_name}'")
    logfire.info(f"Input directory: '{input_dir}'")
    if recreate_db:
        logfire.info("Recreate DB flag: ENABLED")

    # Ensure the target database exists, or recreate it
    try:
        await _ensure_database_exists(
            host=settings.db_host,
            port=settings.db_port,
            user=settings.db_user,
            password=settings.db_password,
            dbname=settings.db_database_name,
            recreate=recreate_db,
        )
    except Exception as e:
        logfire.error("Aborting due to database existence check failure. {e}")
        return

    # Configure the vector database connection for LlamaIndex
    try:
        # LlamaIndex defaults to a schema that matches our Industrial RAG schema
        logfire.info(f"embedding_dim {settings.embedding_dim}")
        vector_store = PGVectorStore.from_params(
            database=settings.db_database_name,
            host=settings.db_host,
            port=settings.db_port,
            user=settings.db_user,
            password=settings.db_password,
            table_name=settings.db_table_name,
            embed_dim=settings.embedding_dim,
            # Configurable table name prefix, allowing it to be dropped if set to empty string.
            # table_name_prefix=settings.db_table_prefix,
        )
    except Exception as e:
        logfire.error(f"Error configuring PGVectorStore: {e}")
        return

    # Configure the embedding model globally using LlamaIndex's Settings
    llama_index_core_settings.embed_model = GoogleGenAIEmbedding(
        model_name=settings.embedding_model, embedding_config=EmbedContentConfig(output_dimensionality=settings.embedding_dim)
    )
    llama_index_core_settings.chunk_size = settings.chunk_size
    llama_index_core_settings.chunk_overlap = settings.chunk_overlap

    logfire.info(f"Loading documents from '{input_dir}'...")
    try:
        documents = SimpleDirectoryReader(input_dir).load_data()
        if not documents:
            logfire.warning(f"Warning: No documents found in '{input_dir}'.")
            return
        logfire.info(f"Loaded {len(documents)} document(s).")
    except Exception as e:
        logfire.error(f"Error loading documents: {e}")
        return

    def sanitize_document(doc):
        """Sanitize Document for pgvector by removing NUL bytes."""
        if hasattr(doc, 'set_content'):
            content = doc.get_content()  # Or doc.text to read
            clean_content = content.replace('\x00', ' ').strip() if isinstance(content, str) else content
            doc.set_content(clean_content)

        # Sanitize metadata
        for k, v in doc.metadata.items():
            if isinstance(v, str):
                doc.metadata[k] = v.replace('\x00', ' ').strip()

        return doc

    # In build_index(), after documents = SimpleDirectoryReader...load_data()
    documents = [sanitize_document(doc) for doc in documents]  # Docs are BaseNode-like

    # Then proceed to VectorStoreIndex...

    storage_context = StorageContext.from_defaults(vector_store=vector_store)

    logfire.info("Building index... This may take a few moments.")
    try:
        VectorStoreIndex.from_documents(documents, storage_context=storage_context, show_progress=True)
    except Exception as e:
        logfire.error(f"Error building index: {e}")
        return

    logfire.info("--- Indexing Complete! ---")
    logfire.info(f"LlamaIndex has embedded and stored the documents in the '{table_naame}' table.")

    # --- Read back 2 rows and print database info ---
    prefix = settings.llamaindex_table_name_prefix if settings.is_llamaindex_built else ""
    full_table_name = f"{prefix}{table_name}"
    logfire.info("\n--- Database Information ---")
    logfire.info(f"Database Name: {settings.db_database_name}")
    logfire.info(f"Table Name:    {full_table_name}")
    logfire.info(f"Port Number:   {settings.db_port}")

    logfire.info("\n--- Reading back 2 rows from the database ---")
    dsn = f"postgresql://{settings.db_user}:{settings.db_password}@{settings.db_host}:{settings.db_port}/{settings.db_database_name}"
    conn = None
    try:
        logfire.info(f"read back 2 rows with dimension {settings.embedding_dim}")
        conn = await asyncpg.connect(dsn)
        try:
            rows = await conn.fetch(f'SELECT * FROM "{full_table_name}" LIMIT 2')
        except asyncpg.UndefinedTableError:
            logfire.error(f"Error: Table '{full_table_name}' not found.")
            rows = []

        if not rows:
            logfire.info("No rows found in the table.")
        for i, row in enumerate(rows):
            logfire.info(f"\nRow {i+1}:")
            for key, value in row.items():
                if key == "embedding" and value is not None:
                    # Print vector length instead of full array for readability
                    logfire.info(f"  {key}: <Vector of length {len(value)}>")
                elif (key == "text" or key == "content") and value:
                    # Snip long text
                    snip = str(value)[:100].replace("\n", " ") + "..." if len(str(value)) > 100 else value
                    logfire.info(f"  {key}: {snip}")
                else:
                    logfire.info(f"  {key}: {value}")
    except Exception as e:
        logfire.error(f"Error reading back rows: {e}")
    finally:
        if conn:
            await conn.close()


def main():
    """Main function to parse arguments and run the indexing script."""
    parser = argparse.ArgumentParser(description="Index markdown files into a pgvector database using LlamaIndex.")
    parser.add_argument(
        "--table-name",
        type=str,
        default=DEFAULT_TABLE_NAME,
        help=f"The name of the target table in pgvector. Defaults to '{DEFAULT_TABLE_NAME}'.",
    )
    parser.add_argument(
        "--input-dir",
        type=str,
        required=True,
        help="The path to the directory containing the markdown files to be indexed.",
    )
    parser.add_argument(
        "--recreate-db",
        action="store_true",
        help="If set, the script will drop the entire database and recreate it before indexing.",
    )
    args = parser.parse_args()

    asyncio.run(build_index(table_name=args.table_name, input_dir=args.input_dir, recreate_db=args.recreate_db))


if __name__ == "__main__":
    # # for logging
    # os.mkdir("/home/vin/01-prj/chatbot_pydantic/tmp/logfire/docs")
    main()
