from fastapi import FastAPI, Path
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import openai
import json
from uuid import uuid4

env_path = Path(".") / ".env.local"
load_dotenv()

from services.generateComposition import generate_composition_plan, generate_music_from_plan

import os
from supabase import create_client, Client

from mp3_to_midi import router as mp3_to_midi_router

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SECRET_KEY")
supabase: Client = create_client(url, key)
elevenlabs_api_key: str = os.environ.get("ELEVENLABS_API_KEY")

app = FastAPI()

app.include_router(mp3_to_midi_router)

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

@app.get("/fetchbyproductid/{product_id}")
def read_tool(product_id: int = Path(..., gt=0)):
    response = (
        supabase.table("music")
        .select("*")
        .eq("id", product_id)
        .execute()
    )
    return response.data[0]

@app.get("/fetchbycategory/")
def get_tool(category: str | None=None):
    response = (
        supabase.table("music")
        .select("*")
        .eq("category", category)
        .execute()
    )
    return response.data

@app.post("/music/generate")
def generate_music(req: MusicPrompt):
    plan = generate_composition_plan(
        req.prompt,
        req.length_ms
    )

    track = generate_music(plan)

    with open(track.filename, "wb") as f:
        f.write(track.audio)

    final_plan = track.json["composition_plan"]

    final_lyrics = {
        section["sectionName"]: section.get("lines", [])
        for section in final_plan.get("sections", [])
        if section.get("lines")
    }

    db = supabase.table("music").insert({
        "prompt": req.prompt,
        "lyrics": final_lyrics,
        "composition_plan": final_plan,
        "song_metadata": track.json,
        "audio_path": track.filename,
    }).execute()

    return {
        "song_id": db.data[0]["id"],
        "lyrics": final_lyrics,
    }


@app.put("/tools/{product_id}")
def update_music(product_id: int, tool: UpdateTool):
    update_data = {k: v for k, v in tool.dict().items() if v is not None}

    if not update_data:
        return {"error": "No fields to update"}

    response = (
        supabase
        .table("music")
        .update(update_data)
        .eq("id", product_id)
        .execute()
    )

    return {"message": "tool updated successfully"}
    
@app.get("/deletebyproductid/{product_id}")
def read_tool(product_id: int = Path(..., gt=0)):
    response = (
        supabase.table("music")
        .delete()
        .eq("id", product_id)
        .execute()
    )
    return response.data[0]


