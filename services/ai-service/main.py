import uvicorn
from fastapi import FastAPI
from dotenv import load_dotenv

load_dotenv(dotenv_path=".env")

from app.api.routes import router

app = FastAPI(title="Ringisho AI Service")

# Register the routes
app.include_router(router, prefix="/v1")

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
