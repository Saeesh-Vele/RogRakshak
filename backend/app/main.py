import os
from pathlib import Path

from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Load environment variables from backend/.env or root .env
backend_env = Path(__file__).resolve().parent.parent / ".env"
root_env = Path(__file__).resolve().parent.parent.parent / ".env"

if backend_env.exists():
    load_dotenv(backend_env)
elif root_env.exists():
    load_dotenv(root_env)
else:
    load_dotenv()

app = FastAPI(
    title="RogRakshak Backend",
    description="HAI surveillance, contact tracing, and multi-agent outbreak investigation service",
    version="0.1.0",
)

# CORS origins are driven by ALLOWED_ORIGINS (comma-separated). The default
# matches the frontend dev server, which `next dev` serves on port 3000.
DEFAULT_ALLOWED_ORIGINS = "http://localhost:3000,http://127.0.0.1:3000"

origins = [
    origin.strip()
    for origin in os.getenv("ALLOWED_ORIGINS", DEFAULT_ALLOWED_ORIGINS).split(",")
    if origin.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


from app.api.graph import router as graph_router
from app.api.investigations import router as investigations_router

app.include_router(graph_router)
app.include_router(investigations_router)


class HealthResponse(BaseModel):
    status: str
    service: str


@app.get("/health", response_model=HealthResponse)
async def health_check() -> HealthResponse:
    return HealthResponse(status="ok", service="rograkshak-backend")
