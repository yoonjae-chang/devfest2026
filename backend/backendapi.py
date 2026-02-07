from fastapi import FastAPI, Path
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
import os
from routers.generate_schema import generate_router
from routers.customize_schema import customize_router
from routers.generate_music import generate_music_router
from supabase import create_client, Client

env_path = Path(".") / ".env.local"
load_dotenv(dotenv_path=env_path)

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SECRET_KEY")
supabase: Client = create_client(url, key)
elevenlabs_api_key: str = os.environ.get("ELEVENLABS_API_KEY")

app = FastAPI()

app.include_router(generate_router)
app.include_router(customize_router)
app.include_router(generate_music_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[   
        "http://localhost:3000" 
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MusicPrompt(BaseModel):
    prompt: str
    length_ms: int = 10000


class LyricsPrompt(BaseModel):
    prompt: str


@app.get("/")
def read_root():
    return {"message": "Welcome to the Music API"}
