"""
Main entry point for the FastAPI application.
This file allows uvicorn to run with: uvicorn main:app
"""

from backendapi import app

__all__ = ["app"]
