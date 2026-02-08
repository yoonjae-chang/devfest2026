"""
Generate music from a composition plan.
"""

import os
import json
from pathlib import Path
from dotenv import load_dotenv
import pydantic
from fastapi import APIRouter, HTTPException, Depends
from supabase import create_client, Client
from elevenlabs import ElevenLabs
from services.chatCompletion import chat_completion_json
from services.auth import get_current_user

env_path = Path("../.") / ".env.local"
load_dotenv(dotenv_path=env_path)

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SECRET_KEY")
supabase: Client = create_client(url, key)
elevenlabs_api_key: str = os.environ.get("ELEVENLABS_API_KEY")

if not elevenlabs_api_key:
    raise ValueError("ELEVENLABS_API_KEY not found in environment variables")

generate_music_router = APIRouter(prefix="/generate-music", tags=["generate-music"])
elevenlabs = ElevenLabs(api_key=elevenlabs_api_key)

BaseModel = pydantic.BaseModel

class GenerateFinalComposition(BaseModel):
    composition_plan_id: int
    user_id: str
    run_id: str

class LyricsSubstitution(BaseModel):
    composition_plan_id: int
    lyrics: dict
    user_id: str
    run_id: str

# Ensure music directory exists
MUSIC_DIR = Path(__file__).parent.parent / "music"
MUSIC_DIR.mkdir(exist_ok=True)

@generate_music_router.post("/lyrics-substitution")
async def lyrics_substitution_endpoint(req: LyricsSubstitution, user: dict = Depends(get_current_user)):
    # Verify that the user_id in the request matches the authenticated user
    if req.user_id != user["user_id"]:
        raise HTTPException(status_code=403, detail="User ID in request does not match authenticated user")
    """Substitute lyrics in a composition plan."""
    try:
        # Fetch composition plan from Supabase
        response = supabase.table("composition_plans").select("composition_plan").eq("id", req.composition_plan_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Composition plan not found")
        
        composition_plan = response.data[0]["composition_plan"]
        
        # Use AI to substitute lyrics
        system_prompt = """You are a music composer. Substitute the lyrics in the following composition plan with the lyrics provided in the lyrics dictionary. Update the duration sections to match the new lyrics. Return the updated composition plan as a JSON object in the same structure as the input composition plan. It is very important to avoid copyright infringement."""
        
        user_prompt = f"""Composition plan: {json.dumps(composition_plan)}\n\nLyrics dictionary: {json.dumps(req.lyrics)}\n\nReturn the updated composition plan with substituted lyrics."""
        
        updated_plan = chat_completion_json(system_prompt=system_prompt, user_prompt=user_prompt)
        
        # Save updated plan to Supabase
        try:
            save_response = supabase.table("composition_plans").insert({
                "user_id": req.user_id,
                "run_id": req.run_id,
                "composition_plan": updated_plan,
                "better_than_id": req.composition_plan_id,
            }).execute()
            saved_id = save_response.data[0]["id"] if save_response.data else None
        except Exception as e:
            print(f"Error saving updated composition plan: {e}")
            saved_id = None
        
        return {"id": saved_id, "composition_plan": updated_plan}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error in lyrics substitution: {str(e)}")

@generate_music_router.post("/generate-final-composition")
async def generate_final_composition_endpoint(req: GenerateFinalComposition, user: dict = Depends(get_current_user)):
    # Verify that the user_id in the request matches the authenticated user
    if req.user_id != user["user_id"]:
        raise HTTPException(status_code=403, detail="User ID in request does not match authenticated user")
    """Generate final music composition from a composition plan and save to Supabase and local storage."""
    try:
        # Fetch composition plan from Supabase
        response = supabase.table("composition_plans").select("composition_plan").eq("id", req.composition_plan_id).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Composition plan not found")
        
        composition_plan = response.data[0]["composition_plan"]
        
        # Generate music using ElevenLabs
        try:
            track = elevenlabs.music.compose(composition_plan=composition_plan)
        except Exception as e:
            error_msg = str(e)
            # Try to extract prompt suggestion if available
            if hasattr(e, 'body') and isinstance(e.body, dict):
                if e.body.get('detail', {}).get('status') == 'bad_prompt':
                    prompt_suggestion = e.body.get('detail', {}).get('data', {}).get('prompt_suggestion')
                    if prompt_suggestion:
                        raise HTTPException(status_code=400, detail=prompt_suggestion)
            raise HTTPException(status_code=500, detail=f"Error generating music: {error_msg}")
        
        # Save audio file locally
        audio_filename = f"{req.run_id}_{req.composition_plan_id}.mp3"
        audio_path = MUSIC_DIR / audio_filename
        
        with open(audio_path, "wb") as f:
            for chunk in track:
                f.write(chunk)
        
        # Convert track metadata to dict if it's a model
        track_data = track.model_dump() if hasattr(track, 'model_dump') else {
            "filename": str(audio_path),
            "duration_ms": getattr(track, 'duration_ms', None),
        }
        
        # Save to Supabase in a new table
        saved_id = None
        try:
            db_response = supabase.table("final_compositions").insert({
                "user_id": req.user_id,
                "run_id": req.run_id,
                "composition_plan_id": req.composition_plan_id,
                "audio_path": str(audio_path),
                "audio_filename": audio_filename,
                "track_metadata": track_data,
            }).execute()
            saved_id = db_response.data[0]["id"] if db_response.data else None
        except Exception as e:
            print(f"Error saving to Supabase: {e}")
            # Continue even if Supabase save fails
        
        return {
            "id": saved_id,
            "composition_plan_id": req.composition_plan_id,
            "audio_path": str(audio_path),
            "audio_filename": audio_filename,
            "track_metadata": track_data,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating final composition: {str(e)}")


@generate_music_router.get("/final-composition/{composition_plan_id}")
async def get_final_composition(composition_plan_id: int, user: dict = Depends(get_current_user)):
    """Get final composition by composition_plan_id. Only returns if it belongs to the authenticated user."""
    try:
        response = supabase.table("final_compositions").select("*").eq("composition_plan_id", composition_plan_id).eq("user_id", user["user_id"]).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Final composition not found")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching final composition: {str(e)}")


@generate_music_router.get("/final-compositions/run/{run_id}")
async def get_final_compositions_by_run(run_id: str, user: dict = Depends(get_current_user)):
    """Get all final compositions for a specific run_id. Only returns compositions belonging to the authenticated user."""
    try:
        response = supabase.table("final_compositions").select("*").eq("run_id", run_id).eq("user_id", user["user_id"]).order("created_at").execute()
        
        if not response.data:
            return []
        
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching final compositions: {str(e)}")
