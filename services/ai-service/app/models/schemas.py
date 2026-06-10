from pydantic import BaseModel

class SheetPromptRequest(BaseModel):
    prompt: str
    context: str = ""
