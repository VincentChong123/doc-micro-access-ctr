from __future__ import annotations as _annotations

import json
from collections.abc import AsyncIterator
from datetime import datetime, timezone
from typing import Literal

from sqlalchemy.orm import Session
from typing_extensions import TypedDict

from pydantic_ai.messages import BinaryContent
from pydantic_ai import (
    Agent,
    ModelMessage,
    ModelRequest,
    ModelResponse,
    TextPart,
    UnexpectedModelBehavior,
    UserPromptPart,
)

from src.services.app import ChatbotService
from src.models.message import Message
from fastapi import UploadFile


# This function remains here for now as it's closely tied to the chat message formatting
# for the streaming response, which ChatLLMService orchestrates.
class ChatMessage(TypedDict):
    """Format of messages sent to the browser."""

    role: Literal['user', 'model']
    timestamp: str
    content: str


def to_chat_message(m: ModelMessage) -> ChatMessage:
    first_part = m.parts[0]
    if isinstance(m, ModelRequest):
        if isinstance(first_part, UserPromptPart):
            if isinstance(first_part.content, str):
                content = first_part.content
            else:
                parts: list[str] = []
                for p in first_part.content:
                    if isinstance(p, str):
                        parts.append(p)
                    elif hasattr(p, 'media_type'):
                        parts.append(f' [Attached {getattr(p, "media_type", "file")}]')
                content = "".join(parts)
            return {
                'role': 'user',
                'timestamp': first_part.timestamp.isoformat(),
                'content': content,
            }
    elif isinstance(m, ModelResponse):
        if isinstance(first_part, TextPart):
            return {
                'role': 'model',
                'timestamp': m.timestamp.isoformat(),
                'content': first_part.content,
            }
    raise UnexpectedModelBehavior(f'Unexpected message type for chat app: {m}')


# class ChatLLMService:
#     def __init__(self, db_session: Session, agent: Agent):
#         self.db_session = db_session
#         self.agent = agent
#         self.chatbot_service = ChatbotService(db_session)
#         self.user_id = "anonymous"  # Hardcoded for now, can be passed later

#     async def stream_chat_response(self, prompt: str, files: list[UploadFile]) -> AsyncIterator[bytes]:
#         full_prompt, parts_for_agent = await self._prepare_agent_parts(prompt, files)
#         model_messages_history = await self._get_model_messages_history()

#         # 1. Yield the prompt for UI display with a newline
#         yield (
#             json.dumps(
#                 {
#                     'role': 'user',
#                     'timestamp': datetime.now(tz=timezone.utc).isoformat(),
#                     'content': full_prompt,
#                 }
#             ).encode('utf-8')
#             + b'\n'
#         )

#         full_agent_response = ""
#         async with self.agent.run_stream(parts_for_agent, message_history=model_messages_history) as result:
#             async for text in result.stream_output(debounce_by=0.01):
#                 m = ModelResponse(parts=[TextPart(text)], timestamp=result.timestamp())
#                 # 2. Yield chunks with a newline
#                 yield json.dumps(to_chat_message(m)).encode('utf-8') + b'\n'
#                 full_agent_response += text

#         await self.chatbot_service.store_message_history(user_id=self.user_id, user_prompt=full_prompt, agent_response=full_agent_response)

#     async def _prepare_agent_parts(self, prompt: str, files: list[UploadFile]) -> tuple[str, list[str | BinaryContent]]:
#         attached_filenames = []
#         file_binary_parts: list[BinaryContent] = []
#         for f in files:
#             if f.size > 0:
#                 content = await f.read()
#                 file_binary_parts.append(BinaryContent(data=content, media_type=f.content_type))
#                 attached_filenames.append(f.filename)
#         full_prompt = prompt
#         if attached_filenames:
#             full_prompt += f" [Attached: {', '.join(attached_filenames)}]"

#         parts_for_agent: list[str | BinaryContent] = [full_prompt]
#         parts_for_agent.extend(file_binary_parts)
#         return full_prompt, parts_for_agent

#     async def _get_model_messages_history(self) -> list[ModelRequest | ModelResponse]:
#         messages_orm = self.db_session.query(Message).filter_by(user_id=self.user_id).order_by(Message.timestamp).all()

#         model_messages_history = []
#         for m_orm in messages_orm:
#             if m_orm.content is not None:
#                 if m_orm.role == 'user':
#                     model_messages_history.append(ModelRequest(parts=[UserPromptPart(m_orm.content)], timestamp=m_orm.timestamp))
#                 elif m_orm.role == 'assistant':
#                     model_messages_history.append(ModelResponse(parts=[TextPart(m_orm.content)], timestamp=m_orm.timestamp))
#         return model_messages_history
