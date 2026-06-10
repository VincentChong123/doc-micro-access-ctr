from __future__ import annotations as _annotations

import json
from contextlib import asynccontextmanager
from typing import Annotated  # , AsyncIterator

# from datetime import datetime, timezone
# import asyncio

import fastapi
import logfire

# from logfire import ScrubbingOptions

from fastapi import Depends  # , Request
from fastapi.responses import Response, StreamingResponse
from fastapi import Form, File, UploadFile  # Add Form, File, UploadFile

from sqlalchemy.orm import Session

from src.core.database import get_db, Base, engine
from src.models.message import Message
from src.services.app import get_chatbot_service, ChatbotService

logfire.instrument_pydantic_ai()


@asynccontextmanager
async def lifespan(app: fastapi.FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


app = fastapi.FastAPI(lifespan=lifespan)
logfire.instrument_fastapi(app)


from pydantic import BaseModel
from fastapi.responses import JSONResponse


# 1. Define exactly what JSON Google Sheets will send
class SheetPromptRequest(BaseModel):
    prompt: str
    context: str = ""  # Optional: Data from _system_md_sheet


# 2. Create the Synchronous Endpoint
@logfire.instrument('Process Google Sheets Formula')
@app.post('/sheet-chat/')
async def post_sheet_chat(request: SheetPromptRequest, chat_service: Annotated[ChatbotService, Depends(get_chatbot_service)]) -> JSONResponse:
    """
    Handles Google Sheets =COMPANY_AI() formulas.
    Waits for the complete LLM response and returns pure JSON.
    """

    # Run the LLM without streaming (Assuming chat_service has a sync/await method)
    # If it only has a stream, we can collect the stream into a single string.
    final_text = ""
    stream_generator = chat_service.process_user_message_stream(user_id="google_sheets_user", prompt=request.prompt)

    async for chunk in stream_generator:
        # The chunk is bytes (e.g., b'{"role": "assistant", "content": "..."}\\n')
        chunk_str = chunk.decode('utf-8').strip()
        if chunk_str:
            try:
                data = json.loads(chunk_str)
                # Because the stream yields cumulative text, the last chunk 
                # will contain the complete, final AI response!
                if data.get("role") == "assistant":
                    final_text = data.get("content", "")
            except json.JSONDecodeError:
                pass

    return JSONResponse(content={"result": final_text})


@app.get('/chat/')
async def get_chat(db_session: Annotated[Session, Depends(get_db)]) -> Response:
    """
    Returns the chat history as newline-delimited JSON (NDJSON).
    """
    messages_orm = db_session.query(Message).order_by(Message.timestamp).all()
    chat_messages = []
    for m in messages_orm:
        chat_messages.append({'role': m.role, 'timestamp': m.timestamp.isoformat(), 'content': m.content})

    # Join each JSON object with a newline character for correct NDJSON formatting
    ndjson_response = b'\n'.join(json.dumps(m).encode('utf-8') for m in chat_messages)
    # Add a trailing newline if there is content
    if ndjson_response:
        ndjson_response += b'\n'

    return Response(
        ndjson_response,
        media_type='application/x-ndjson',
    )


@logfire.instrument('Process User Message (Orchestrator)')
@app.post('/chat/')
async def post_chat(
    chat_service: Annotated[ChatbotService, Depends(get_chatbot_service)],
    prompt: Annotated[str, Form()],
    file: Annotated[list[UploadFile], File()] = [],
) -> StreamingResponse:
    """
    Handles the chat form submission by delegating to the ChatbotService
    to orchestrate context retrieval and stream the LLM response.
    """
    # form = await request.form()
    # prompt = form.get("prompt", "")
    if not isinstance(prompt, str):
        raise fastapi.HTTPException(status_code=400, detail="Invalid prompt format.")

    user_id_placeholder = "default_user"

    # Delegate the entire streaming and orchestration logic to the service
    stream_generator = chat_service.process_user_message_stream(user_id=user_id_placeholder, prompt=prompt, files=file)

    return StreamingResponse(stream_generator, media_type="application/x-ndjson")
