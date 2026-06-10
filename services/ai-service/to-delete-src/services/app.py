from datetime import datetime, timezone
from typing import List, Annotated, AsyncIterator

import asyncio
import logfire
import json
from sqlalchemy.orm import Session
from fastapi import Depends
from opentelemetry import trace

from pydantic_ai import Agent, WebSearchTool, WebFetchTool
from pydantic_ai.messages import BinaryContent  # Import BinaryContent
from fastapi import UploadFile
from src.core.context_provider_interface import ContextProvider
from src.rag.retrieval_service import RAGContextProvider
from src.rag.database import database_connect
from src.core.database import get_db
from src.models.message import Message

from src.core.config import settings

# --- Placeholder Implementations for the Orchestrator Pattern ---


class WebSearchContextProvider(ContextProvider):
    """Provides web search context using a Gemini Agent."""

    def __init__(self, agent: Agent):
        self.agent = agent
        self.span = trace.get_current_span()

    @property
    def name(self) -> str:
        return "WEB_SEARCH_RESULTS"

    @logfire.instrument
    async def get_context(self, user_message: str) -> str:
        self.span.set_attributes({"search_query": user_message})

        # Formulate a prompt for the agent to use web search
        web_search_prompt = f"Perform a web search for: {user_message}. Summarize the findings concisely."

        f = open("./dump_apppy_WebSearchContextProvider_get_context.md", encoding="utf-8", mode="a")
        f.write(f"{user_message}")
        f.write(f"{'-'*10}")
        full_agent_response = ""
        # Use the agent.run_stream logic, collecting output into a single string
        async with self.agent.run_stream([web_search_prompt]) as result:
            async for text in result.stream_output(debounce_by=0.01):
                # The 'text' variable from stream_output contains the CUMULATIVE response.
                # We just need to capture the last version of it.
                full_agent_response = text
        f.write("full_agent_response\n\n")
        f.close()
        return full_agent_response


class CoreLLMService:
    """Service that calls the final LLM agent with the composed context."""

    def __init__(self, agent: Agent):  # Modified to accept an Agent
        self.agent = agent
        self.span = trace.get_current_span()  # Removed for consistency with self.span.set_attributes
        print("self.span {self.span}")

    @logfire.instrument
    async def query(self, final_prompt: str) -> str:
        """Asks the LLM agent a question and returns the full response as a single string."""
        self.span.set_attributes({"final_prompt_length": len(final_prompt)})  # Changed from self.span.set_attributes
        print("--- Sending to CoreLLMService ---")
        print(final_prompt)
        print("---------------------------------")

        full_agent_response = ""
        # Use the agent.run_stream logic, collecting output into a single string
        async with self.agent.run_stream([final_prompt]) as result:
            async for text in result.stream_output(debounce_by=0.01):
                full_agent_response += text

        self.span.set_attributes({"final_response_length": len(full_agent_response)})
        return full_agent_response


# --- The Main ChatbotService, now acting as an Orchestrator ---


class ChatbotService:
    def __init__(self, db_session: Session, plugins: List[ContextProvider], core_llm: CoreLLMService):
        self.db_session = db_session
        self.plugins = plugins
        self.core_llm = core_llm
        self.span = trace.get_current_span()  # Removed for consistency with self.span.set_attributes

    @logfire.instrument('Process User Message (Orchestrator)')
    async def process_user_message_stream(self, user_id: str, prompt: str, files: list[UploadFile] = []) -> AsyncIterator[bytes]:
        """
        Orchestrates context retrieval, streams the LLM response, and stores history.
        """
        # Immediately yield the user's prompt for quick UI feedback

        # 1. Extract file bytes and filenames
        attached_filenames = []
        file_binary_parts: list[BinaryContent] = []
        for f in files:
            if f.size > 0:
                content = await f.read()
                file_binary_parts.append(BinaryContent(data=content, media_type=f.content_type))
                attached_filenames.append(f.filename)

        # 2. Prepare the prompt for the UI feedback
        display_prompt = prompt
        if attached_filenames:
            display_prompt += f" [Attached: {', '.join(attached_filenames)}]"

        yield (
            json.dumps(
                {
                    "role": "user",
                    "timestamp": datetime.now(tz=timezone.utc).isoformat(),
                    "content": display_prompt,
                }
            ).encode("utf-8")
            + b"\n"
        )

        # 1. FAN OUT: Get context from all plugins in parallel
        tasks = [plugin.get_context(prompt) for plugin in self.plugins]
        plugin_contexts = await asyncio.gather(*tasks, return_exceptions=True)

        # 2. FAN IN: Compose the final prompt
        final_prompt_parts = [f"\nQuestion: {prompt} Use the following contexts to answer the question:\n"]
        for i, context in enumerate(plugin_contexts):
            plugin_name = self.plugins[i].name
            if isinstance(context, Exception):
                logfire.warn(f"Plugin {plugin_name} failed during context retrieval", error=str(context))
                final_prompt_parts.append(f"\n-- START {plugin_name} CONTEXT --CONTEXT RETRIEVAL FAILED -- END {plugin_name} CONTEXT --\n")
            elif context:
                final_prompt_parts.append(f"\n-- START {plugin_name} CONTEXT --{context}-- END {plugin_name} CONTEXT --\n")
        final_prompt = "\n".join(final_prompt_parts)
        logfire.info(f"Final Prompt:\n{final_prompt}")

        # 5. Construct Multi-modal parts for the Agent
        # The first part is the text context, followed by the binary file data
        parts_for_agent: list[str | BinaryContent] = [final_prompt]
        parts_for_agent.extend(file_binary_parts)

        # 3. FINAL QUERY: Stream the response from the core LLM service
        full_agent_response = ""
        try:
            async with self.core_llm.agent.run_stream(parts_for_agent) as result:
                response_timestamp = result.timestamp().isoformat()
                async for cumulative_text in result.stream_output(debounce_by=0.01):
                    full_agent_response = cumulative_text
                    message = {
                        "role": "assistant",
                        "content": cumulative_text,
                        "timestamp": response_timestamp,
                    }
                    yield json.dumps(message).encode('utf-8') + b'\n'
        finally:
            # 4. Store the full message history after streaming is complete
            await self.store_message_history(user_id=user_id, user_prompt=prompt, agent_response=full_agent_response)

    @logfire.instrument('Store Message History')
    async def store_message_history(self, user_id: str, user_prompt: str, agent_response: str):
        """
        Stores the user's prompt and the agent's full response in the database.
        """
        self.span.set_attributes(
            {"user_id": user_id, "user_prompt_length": len(user_prompt), "agent_response_length": len(agent_response)}
        )  # Changed from self.span.set_attributes
        user_message_record = Message(user_id=user_id, role="user", content=user_prompt, timestamp=datetime.now(timezone.utc))
        self.db_session.add(user_message_record)

        agent_message_record = Message(
            user_id=user_id,
            role="assistant",
            content=agent_response,
            timestamp=datetime.now(timezone.utc),
        )
        self.db_session.add(agent_message_record)

        self.db_session.commit()
        self.db_session.refresh(user_message_record)
        self.db_session.refresh(agent_message_record)


# --- Example of how to build and get the service ---
# In a real app, this would be managed by a dependency injection framework.

_db_pool = None


async def get_db_pool():
    """
    Returns the database pool, attempting to connect if it doesn't exist.
    """
    global _db_pool
    if _db_pool is None:
        try:
            _db_pool = await database_connect(
                # create_db: bool = False,
                localhost=settings.db_host,
                db_port=settings.db_port,
                db_user=settings.db_user,
                db_password=settings.db_password,
                db_database_name=settings.db_database_name,
            )
        except Exception as e:
            logfire.error("Failed to connect to RAG database. RAG features will be disabled.", error=str(e))
            return None
    return _db_pool


async def get_chatbot_service(db_session: Annotated[Session, Depends(get_db)]) -> ChatbotService:
    """Factory function to build and then return the orchestrated chat service."""
    db_pool = await get_db_pool()

    # Create the real agent
    agent = Agent(
        settings.chatbot_gemini_model,
        name="get_chatbot_service_Agent",
        builtin_tools=[
            WebSearchTool(),
            WebFetchTool(
                allowed_domains=['*'],
                max_uses=10,
                enable_citations=True,
                max_content_tokens=50000,
            ),
        ],
    )

    plugins = []
    # Only add RAG plugin if the database pool is actually available
    if db_pool:
        plugins.append(RAGContextProvider(pool=db_pool))

    # Always add Web Search
    plugins.append(WebSearchContextProvider(agent=agent))

    core_llm = CoreLLMService(agent=agent)

    return ChatbotService(db_session=db_session, plugins=plugins, core_llm=core_llm)
