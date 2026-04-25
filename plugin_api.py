"""Hermes Pulse plugin — backend API routes."""

from fastapi import APIRouter

router = APIRouter()

@router.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "ok", "plugin": "hermes-pulse"}

# Future: could add custom endpoints that aggregate data from multiple sources
