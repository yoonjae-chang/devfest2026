import zipfile
import io
from fastapi import FastAPI, Path, Depends, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from pathlib import Path
import os
from routers.generate_schema import generate_router
from routers.customize_schema import customize_router
from routers.generate_music import generate_music_router
from routers.generate_album_cover import generate_album_cover_router
from mp3_to_midi import router as mp3_to_midi_router
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
app.include_router(generate_album_cover_router)
app.include_router(mp3_to_midi_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[   
        "http://localhost:3000" 
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],  # Expose Authorization header for CORS
)


class MusicPrompt(BaseModel):
    prompt: str
    length_ms: int = 10000


class LyricsPrompt(BaseModel):
    prompt: str


from services.auth import get_current_user

MUSIC_DIR = Path(__file__).parent / "music"

@app.get("/")
async def read_root(user: dict = Depends(get_current_user)):
    return {
        "message": "Welcome to the Music API",
        "user_id": user["user_id"],
        "email": user["email"]
    }


@app.get("/generate-music/download-run/{run_id}")
async def download_run_music_zip(run_id: str, user: dict = Depends(get_current_user)):
    """Download all final compositions for a run as a zip. Only returns compositions belonging to the authenticated user."""
    response = supabase.table("final_compositions").select("*").eq("run_id", run_id).eq("user_id", user["user_id"]).order("created_at").execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="No compositions found for this run")
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for row in response.data:
            audio_filename = row.get("audio_filename")
            if not audio_filename:
                continue
            
            storage_path = row.get("storage_path")
            
            # Try to get from Supabase storage first
            if storage_path:
                try:
                    file_data = supabase.storage.from_("music").download(storage_path)
                    if file_data:
                        zf.writestr(audio_filename, file_data)
                        continue
                except Exception as e:
                    print(f"Error downloading {audio_filename} from storage: {e}")
                    # Fall back to local file
            
            # Fall back to local file
            audio_path = MUSIC_DIR / audio_filename
            if audio_path.exists():
                zf.write(audio_path, audio_filename)
    buf.seek(0)
    return StreamingResponse(buf, media_type="application/zip", headers={"Content-Disposition": f"attachment; filename=run-{run_id}-music.zip"})
