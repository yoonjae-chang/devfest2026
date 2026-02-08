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
from services.prompts import (
    GENERATE_INITIAL_SCHEMA_SYSTEM_WITH_LYRICS_SYSTEM_PROMPT,
    GENERATE_INITIAL_SCHEMA_SYSTEM_WITH_LYRICS_USER_PROMPT,
    GENERATE_INITIAL_SCHEMA_SYSTEM_WITHOUT_LYRICS_SYSTEM_PROMPT,
    GENERATE_INITIAL_SCHEMA_SYSTEM_WITHOUT_LYRICS_USER_PROMPT,
    get_genre_lyrics_example,
)
     
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

    # Convert styles list to string for replacement
    styles_str = ", ".join(req.styles) if req.styles else "None"
    
    if req.lyrics_exists:
        genre_example = get_genre_lyrics_example(req.styles)
        system_prompt = GENERATE_INITIAL_SCHEMA_SYSTEM_WITH_LYRICS_SYSTEM_PROMPT.replace("{GENRE_LYRICS_EXAMPLE}", genre_example)
        plan = chat_completion_json(
            system_prompt=system_prompt,
            user_prompt=GENERATE_INITIAL_SCHEMA_SYSTEM_WITH_LYRICS_USER_PROMPT.replace("{USER_PROMPT}", req.user_prompt).replace("{STYLES}", styles_str).replace("{LYRICS_EXISTS}", str(req.lyrics_exists))
        )
    else:
        plan = chat_completion_json(
            system_prompt=GENERATE_INITIAL_SCHEMA_SYSTEM_WITHOUT_LYRICS_SYSTEM_PROMPT,
            user_prompt=GENERATE_INITIAL_SCHEMA_SYSTEM_WITHOUT_LYRICS_USER_PROMPT.replace("{USER_PROMPT}", req.user_prompt).replace("{STYLES}", styles_str)
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


@generate_router.get("/composition-plan/{composition_id}")
async def get_composition_plan(composition_id: int, user: dict = Depends(get_current_user)):
    """Get a composition plan by ID. Only returns if it belongs to the authenticated user."""
    try:
        response = supabase.table("composition_plans").select("*").eq("id", composition_id).eq("user_id", user["user_id"]).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Composition plan not found")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching composition plan: {str(e)}")


@generate_router.get("/composition-plans/run/{run_id}")
async def get_composition_plans_by_run(run_id: str, user: dict = Depends(get_current_user)):
    """Get all composition plans for a specific run_id. Only returns plans belonging to the authenticated user."""
    try:
        response = supabase.table("composition_plans").select("*").eq("run_id", run_id).eq("user_id", user["user_id"]).order("created_at").execute()
        
        if not response.data:
            return []
        
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching composition plans: {str(e)}")


class UpdateCompositionPlan(BaseModel):
    composition_plan: dict  # The updated composition plan JSON
    user_id: str


@generate_router.put("/composition-plan/{composition_id}")
async def update_composition_plan(composition_id: int, req: UpdateCompositionPlan, user: dict = Depends(get_current_user)):
    """Update a composition plan by ID. Only allows updates if it belongs to the authenticated user."""
    # Verify that the user_id in the request matches the authenticated user
    if req.user_id != user["user_id"]:
        raise HTTPException(status_code=403, detail="User ID in request does not match authenticated user")
    
    try:
        # First verify the composition plan exists and belongs to the user
        check_response = supabase.table("composition_plans").select("id").eq("id", composition_id).eq("user_id", user["user_id"]).execute()
        
        if not check_response.data:
            raise HTTPException(status_code=404, detail="Composition plan not found or access denied")
        
        # Update the composition plan
        response = supabase.table("composition_plans").update({
            "composition_plan": req.composition_plan
        }).eq("id", composition_id).eq("user_id", user["user_id"]).execute()
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Composition plan not found")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error updating composition plan: {str(e)}")