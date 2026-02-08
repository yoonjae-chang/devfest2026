"""
Generate music from a composition plan.
"""

import os
import json
import uuid
from pathlib import Path
from dotenv import load_dotenv
import pydantic
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import FileResponse
from fastapi.responses import FileResponse
from supabase import create_client, Client
from elevenlabs import ElevenLabs
from services.chatCompletion import chat_completion_json
from services.auth import get_current_user
import traceback

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

# Ensure music directory exists
MUSIC_DIR = Path(__file__).parent.parent / "music"
MUSIC_DIR.mkdir(exist_ok=True)

async def lyrics_substitution(composition_plan: dict, composition_plan_from_elevenlabs: dict):        
        
        print("\n\nCOMPOSITION PLAN FROM ELEVENLABS: ", composition_plan_from_elevenlabs)
        print("\n\nCOMPOSITION PLAN: ", composition_plan)
        # Use AI to substitute lyrics
        system_prompt = f"""
        I will provide a 'Composition Plan' and a 'Lyrics Dictionary'. 
        Your task is to integrate the lyrics into the plan and expand missing sections (e.g., Verse 2, Bridge) based on the provided story and description.

        ### RULES:
        1. OUTPUT ONLY VALID JSON. Do not include preamble or explanations.
        2. The output MUST match the keys and structure of the input 'Composition Plan' exactly.
        3. If lyrics for a section are missing, generate them based on the Description: {composition_plan['description']}.

        ### INPUT DATA (HAVE THE OUTPUT IN THE SAME FORMAT AS THE INPUT COMPOSITION PLAN):
        Composition Plan: {composition_plan_from_elevenlabs}
        Lyrics Dictionary: {composition_plan['lyrics']}
        """        
        user_prompt = f"""
        Integrate the lyrics into the plan and expand missing sections (e.g., Verse 2, Bridge) based on the provided story and description.
        """
        print("USER PROMPT: ", user_prompt)
        print("SYSTEM PROMPT: ", system_prompt)
        updated_plan = chat_completion_json(system_prompt=system_prompt, user_prompt=user_prompt)
        return updated_plan

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
        prompt_for_elevenlabs = f"Create a song titled {composition_plan['title']} with a description of {composition_plan['description']}"
        try:
            composition_plan_elevenlabs = elevenlabs.music.composition_plan.create(
                prompt=prompt_for_elevenlabs,
                music_length_ms=10000,
            )
        except Exception as e:
            error_msg = str(e)
            print("ERROR: ", error_msg)
            raise HTTPException(status_code=500, detail=f"Error creating composition plan from ElevenLabs: {error_msg}")
        print("COMPOSITION PLAN: ", composition_plan)
        # Convert composition_plan_elevenlabs to dict if it's a MusicPrompt object
        if not isinstance(composition_plan_elevenlabs, dict):
            composition_plan_elevenlabs = composition_plan_elevenlabs.model_dump()
        
        if 'lyrics' in composition_plan:
            updated_plan = await lyrics_substitution(composition_plan, composition_plan_elevenlabs)
        else:
            updated_plan = composition_plan_elevenlabs
        # Generate music using ElevenLabs
        try:
            track = elevenlabs.music.compose(
                prompt=json.dumps(updated_plan),
                music_length_ms=10000)
            print("TRACK: ", track)
        except Exception as e:
            error_msg = str(e)
            print("ERROR: ", error_msg)
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
        print("AUDIO PATH: ", audio_path)       
        with open(audio_path, "wb") as f:
            print("WRITING TO AUDIO FILE: ", audio_path)
            for chunk in track:
                f.write(chunk)
        print("AUDIO FILE: \n\n", audio_filename)
        # Convert track metadata to dict if it's a model
        # Save to Supabase in a new table
        saved_id = None
        cover_image_path = f"{req.run_id}_{req.composition_plan_id}.png"
        print("SAVED ID: ", saved_id)
        try:
            db_response = supabase.table("final_compositions").insert({
                "uuid": str(uuid.uuid4()),
                "user_id": req.user_id,
                "run_id": req.run_id,
                "composition_plan_id": req.composition_plan_id,
                "title": composition_plan['title'],
                "composition_plan": updated_plan,
                "audio_path": str(audio_path),
                "audio_filename": audio_filename,
                "cover_image_path": cover_image_path,
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


@generate_music_router.get("/audio/{filename}")
async def get_audio_file(filename: str, user: dict = Depends(get_current_user)):
    """Serve audio file. Only allows access if the file belongs to the authenticated user."""
    try:
        # Verify the file belongs to the user by checking final_compositions table
        if not filename.endswith(".mp3"):
            raise HTTPException(status_code=400, detail="Invalid file format")
        
        # Check if this file is associated with the user
        response = supabase.table("final_compositions").select("user_id").eq("audio_filename", filename).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        if response.data[0]["user_id"] != user["user_id"]:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Serve the file
        audio_path = MUSIC_DIR / filename
        if not audio_path.exists():
            raise HTTPException(status_code=404, detail="Audio file not found on server")
        
        return FileResponse(
            path=str(audio_path),
            media_type="audio/mpeg",
            filename=filename
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error serving audio file: {str(e)}")

