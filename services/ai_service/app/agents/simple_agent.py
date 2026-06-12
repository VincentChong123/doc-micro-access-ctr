import asyncio
from pydantic_ai import Agent
from pydantic_ai.models.groq import GroqModel
from pydantic_ai.providers.groq import GroqProvider
from app.config import settings

# Parse the model string
model_name = settings.groq_model.replace("groq:", "")

# Explicitly create the Provider and Model to bypass the Uvicorn/OS environment race condition
groq_provider = GroqProvider(api_key=settings.groq_api_key)
groq_model = GroqModel(model_name=model_name, provider=groq_provider)

# Define your Agent
agent = Agent(
    model=groq_model,
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


async def test_generate_summary():
    prompt = "Summarize the key points of the meeting."
    context = "The meeting discussed Q3 earnings, the new marketing strategy for Q4, and the upcoming product launch. Revenue was up 15%."
    print("Running generate_summary test...")
    summary = await generate_summary(prompt, context)
    print("Summary result:", summary)


if __name__ == "__main__":
    asyncio.run(test_generate_summary())
