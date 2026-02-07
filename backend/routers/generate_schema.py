"""
Generate a composition plan for a user prompt.
"""

import io
import tempfile
import zipfile
from pathlib import Path as PathLib
import os
from pathlib import Path
from dotenv import load_dotenv
import pydantic
from fastapi import APIRouter, File, HTTPException, UploadFile, Depends
from fastapi.responses import StreamingResponse
from supabase import create_client, Client

from services.chatCompletion import chat_completion_json
from services.auth import get_current_user

env_path = Path("../.") / ".env.local"
load_dotenv(dotenv_path=env_path)

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SECRET_KEY")
supabase: Client = create_client(url, key)

generate_router = APIRouter(prefix="/generate", tags=["generate"])

BaseModel = pydantic.BaseModel

class GenerateInitialSchema(BaseModel):
    user_prompt: str
    styles: list[str]
    lyrics_exists: bool
    user_id: str
    run_id: str
    

@generate_router.post("/composition-plan")
async def generate_initial_schema(req: GenerateInitialSchema, user: dict = Depends(get_current_user)):
    # Verify that the user_id in the request matches the authenticated user
    if req.user_id != user["user_id"]:
        raise HTTPException(status_code=403, detail="User ID in request does not match authenticated user")

    if req.lyrics_exists:
        plan = chat_completion_json(
            system_prompt=f"""You are a music composer. You are given a user prompt, list of styles, and a boolean indicating if lyrics exist. You need to generate a composition schema for the user prompt. The composition schema should be a JSON object with the following fields:
            - positiveGlobalStyles: list of styles that are positive for the composition
            - negativeGlobalStyles: list of styles that are negative for the composition
            - lyrics: lyrics in order of sections in the following format:
                - sectionName: name of the section
                - lines: list of lines in the section
            - description: description of the composition
            Here is an example of an excellent description:
            'A Contemporary R&B, Neo-Soul, Alternative R&B song with a melancholic, hazy, vulnerable mood and an underwater feel, perfect for a late-night drive. Use low-fi distorted sub-bass, muted electric guitar with chorus effect, warbly Rhodes piano, and crisp, dry trap-style drums at a slow tempo (70 BPM). Feature soulful and breathy female vocals with conversational delivery, complex vocal harmonies, slightly behind the beat rhythm, and emotive belts in the chorus, capturing a raw emotional vibe without referencing any specific artist. Include lyrics about introspection and emotional distance, with a track structure that starts with vinyl crackle and lo-fi guitar melody in the intro, minimalistic verses focused on bass and vocals, a lush chorus with layered harmonies and rising emotional intensity, and an outro fading into a low-pass filter and ambient static'
            Here is an example of a composition schema:
            {{
                "positiveGlobalStyles": ["happy", "upbeat"],
                "negativeGlobalStyles": ["sad", "depressing"],
                "lyrics": {{
                    "Verse 1": "Verse 1 lines",
                    "Verse 2": "Verse 2 lines",
                    "Chorus": "Chorus lines",
                    "Bridge": "Bridge lines",
                    "Outro": "Outro lines"
                }},
                "description": "a description of the composition", 
            }}
            """,
            user_prompt=f"User prompt: {req.user_prompt}\nStyles: {req.styles} \nLyrics exist: {req.lyrics_exists}"
        )
    else:
        plan = chat_completion_json(
            system_prompt=f"""You are a music composer. You are given a user prompt, list of styles, and a boolean indicating if lyrics exist. You need to generate a composition schema for the user prompt. The composition schema should be a JSON object with the following fields:
            - positiveGlobalStyles: list of styles that are positive for the composition
            - negativeGlobalStyles: list of styles that are negative for the composition
            - description: description of the composition
            Here is an example of an excellent description:
            'A Contemporary R&B, Neo-Soul, Alternative R&B song with a melancholic, hazy, vulnerable mood and an underwater feel, perfect for a late-night drive. Use low-fi distorted sub-bass, muted electric guitar with chorus effect, warbly Rhodes piano, and crisp, dry trap-style drums at a slow tempo (70 BPM). Feature soulful and breathy female vocals with conversational delivery, complex vocal harmonies, slightly behind the beat rhythm, and emotive belts in the chorus, capturing a raw emotional vibe without referencing any specific artist. Include lyrics about introspection and emotional distance, with a track structure that starts with vinyl crackle and lo-fi guitar melody in the intro, minimalistic verses focused on bass and vocals, a lush chorus with layered harmonies and rising emotional intensity, and an outro fading into a low-pass filter and ambient static'
            Here is an example of a composition schema:
            {{
                "positiveGlobalStyles": ["happy", "upbeat"],
                "negativeGlobalStyles": ["sad", "depressing"],
                "description": "a description of the composition", 
            }}
            """,
            user_prompt=f"User prompt: {req.user_prompt}\nStyles: {req.styles}"
        )

    # Save to Supabase
    saved_id = None
    try:
        response = supabase.table("composition_plans").insert({
            "user_id": req.user_id,
            "run_id": req.run_id,
            "user_prompt": req.user_prompt,
            "user_styles": req.styles,
            "lyrics_exists": req.lyrics_exists,
            "composition_plan": plan,
            "better_than_id": None,  # Initial plans don't improve upon anything
        }).execute()
        saved_id = response.data[0]["id"] if response.data else None
    except Exception as e:
        print(f"Error saving to Supabase: {e}")
        saved_id = None

    return {"id": saved_id, "composition_plan": plan, "user_id": req.user_id, "run_id": req.run_id}