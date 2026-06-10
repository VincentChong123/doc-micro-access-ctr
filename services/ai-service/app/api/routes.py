from fastapi import APIRouter
from fastapi.responses import JSONResponse
from app.models.schemas import SheetPromptRequest
from app.agents.simple_agent import generate_summary

router = APIRouter()

@router.post("/sheet-chat")
async def post_sheet_chat(request: SheetPromptRequest):
    """The synchronous endpoint called by Google Sheets"""
    
    # Call your Pydantic-AI Agent
    final_text = await generate_summary(request.prompt, request.context)
    
    # Return standard JSON back to Apps Script
    return JSONResponse(content={"result": final_text})
