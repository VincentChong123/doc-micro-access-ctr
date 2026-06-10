from pydantic_ai import Agent
from app.config import settings
# Define your Agent
agent = Agent(
    model=settings.groq_model,
    system_prompt="You are a corporate banking assistant. Summarize the user's prompt concisely.",
)


async def generate_summary(prompt: str, context: str) -> str:
    """Executes the Pydantic-AI Agent synchronously."""
    full_prompt = f"Context: {context}\n\nTask: {prompt}"

    # Run the agent (Non-streaming, perfect for Sheets!)
    result = await agent.run(full_prompt)

    return result.output.strip()


# # TODO
# # FUTURE V2 ASYNC SCHEMA (Do not use this yet)
# class SheetPromptAsyncRequest(BaseModel):
#     prompt: str
#     context: str = ""
#     target_sheet: str  # e.g., "Ringisho"
#     target_cell: str  # e.g., "G1"
