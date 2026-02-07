"""
Standalone MP3-to-MIDI converter server.
Use this for the convert feature when the main backend has dependency issues.

Run: cd backend && source venv/bin/activate && uvicorn run_converter:app --reload --port 8000
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from mp3_to_midi import router as mp3_to_midi_router

app = FastAPI(title="MP3 to MIDI Converter")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(mp3_to_midi_router)


@app.get("/")
def root():
    return {"message": "MP3 to MIDI Converter API", "docs": "/docs"}
