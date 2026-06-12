import uuid
import time
import logfire
from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.models.schemas import SheetPromptRequest
from app.agents.simple_agent import generate_summary

router = APIRouter()


@router.post("/sheet-chat")
async def post_sheet_chat(request: SheetPromptRequest):
    """The synchronous endpoint called by Google Sheets"""
    start_time = time.time()
    run_id = str(uuid.uuid4())
    prompt_id = str(uuid.uuid4())

    # Add a Logfire Span to capture all requested variables
    with logfire.span("AI_Generation_Run", session_id=request.user, run_id=run_id, prompt_id=prompt_id, timestamp=start_time):
        logfire.info(f"User {request.user} requested AI generation.")
        # Call your Pydantic-AI Agent
        final_text = await generate_summary(request.prompt, request.context)

    latency_ms = int((time.time() - start_time) * 1000)

    # Return standard JSON back to Apps Script with LLMOps Traceability
    return JSONResponse(
        content={
            "result": final_text,
            "meta": {
                "run_id": run_id,
                "latency_ms": latency_ms,
                "model_invoked": "groq:llama3-70b-8192",
                "agent_name": "summary_agent",
                "timestamp": time.time(),
            },
        }
    )
