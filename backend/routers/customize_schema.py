"""
Customize a composition plan by pairwise comparison of compositions.
"""

import os
import json
from pathlib import Path
from dotenv import load_dotenv
import pydantic
from fastapi import APIRouter, HTTPException, Depends
from supabase import create_client, Client

from services.chatCompletion import chat_completion_json
from services.auth import get_current_user


from services.prompts import (
    GENERATE_IMPROVED_SCHEMA_WITH_LYRICS_SYSTEM_PROMPT,
    GENERATE_IMPROVED_SCHEMA_WITH_LYRICS_USER_PROMPT,
    GENERATE_IMPROVED_SCHEMA_WITHOUT_LYRICS_SYSTEM_PROMPT,
    GENERATE_IMPROVED_SCHEMA_WITHOUT_LYRICS_USER_PROMPT
)
env_path = Path("../.") / ".env.local"
load_dotenv(dotenv_path=env_path)

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SECRET_KEY")
supabase: Client = create_client(url, key)

customize_router = APIRouter(prefix="/customize", tags=["customize"])

BaseModel = pydantic.BaseModel

class ComparingComposition(BaseModel):
    composition_plan_1_id: int
    composition_plan_2_id: int
    composition_plan_1_better: bool  # True if plan 1 is better, False if plan 2 is better
    user_id: str
    run_id: str

@customize_router.post("/compare-compositions")
async def compare_compositions(req: ComparingComposition, user: dict = Depends(get_current_user)):
    # Verify that the user_id in the request matches the authenticated user
    if req.user_id != user["user_id"]:
        raise HTTPException(status_code=403, detail="User ID in request does not match authenticated user")
    # Determine which composition is better and which is worse
    if req.composition_plan_1_better:
        better_id = req.composition_plan_1_id
        worse_id = req.composition_plan_2_id
    else:
        better_id = req.composition_plan_2_id
        worse_id = req.composition_plan_1_id
    
    # Fetch both composition plans from Supabase
    try:
        better_response = supabase.table("composition_plans").select("*").eq("id", better_id).execute()
        worse_response = supabase.table("composition_plans").select("composition_plan").eq("id", worse_id).execute()
        
        if not better_response.data or not worse_response.data:
            raise HTTPException(status_code=404, detail="One or both composition plans not found")
        
        better_plan_data = better_response.data[0]
        composition_plan_better = better_plan_data["composition_plan"]
        composition_plan_worse = worse_response.data[0]["composition_plan"]
        
        # Copy user_prompt, user_styles, and lyrics_exists from the better plan
        user_prompt = better_plan_data.get("user_prompt")
        user_styles = better_plan_data.get("user_styles", [])
        lyrics_exists = better_plan_data.get("lyrics_exists", False)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching composition plans: {str(e)}")

    # Generate a new improved composition plan based on the comparison
    if lyrics_exists:
        new_composition_plan = chat_completion_json(
            system_prompt=GENERATE_IMPROVED_SCHEMA_WITH_LYRICS_SYSTEM_PROMPT,
            user_prompt=GENERATE_IMPROVED_SCHEMA_WITH_LYRICS_USER_PROMPT.replace("{COMPOSITION_PLAN_BETTER}", json.dumps(composition_plan_better)).replace("{COMPOSITION_PLAN_WORSE}", json.dumps(composition_plan_worse))
        )
    else:
        new_composition_plan = chat_completion_json(
            system_prompt=GENERATE_IMPROVED_SCHEMA_WITHOUT_LYRICS_SYSTEM_PROMPT,
            user_prompt=GENERATE_IMPROVED_SCHEMA_WITHOUT_LYRICS_USER_PROMPT.replace("{COMPOSITION_PLAN_BETTER}", json.dumps(composition_plan_better)).replace("{COMPOSITION_PLAN_WORSE}", json.dumps(composition_plan_worse))
        )
    # Save the new composition plan to Supabase
    # Copy user_prompt, user_styles, lyrics_exists is False, and lyrics_exists from the better plan
    saved_id = None
    try:
        insert_data = {
            "user_id": req.user_id,
            "run_id": req.run_id,
            "composition_plan": new_composition_plan,
            "better_than_id": worse_id,  # Reference to the worse composition it's improving upon
        }
        
        # Copy fields from the better plan if they exist
        if user_prompt is not None:
            insert_data["user_prompt"] = user_prompt
        if user_styles is not None:
            insert_data["user_styles"] = user_styles
        if lyrics_exists is not None:
            insert_data["lyrics_exists"] = lyrics_exists
        
        response = supabase.table("composition_plans").insert(insert_data).execute()
        saved_id = response.data[0]["id"] if response.data else None
    except Exception as e:
        print(f"Error saving to Supabase: {e}")
        raise HTTPException(status_code=500, detail=f"Error saving new composition plan: {str(e)}")

    return {"id": saved_id, "composition_plan": new_composition_plan}