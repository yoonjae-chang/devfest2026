"""
Customize a composition plan by pairwise comparison of compositions.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
import pydantic
from fastapi import APIRouter, HTTPException
from supabase import create_client, Client

from services.chatCompletion import chat_completion_json

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
async def compare_compositions(req: ComparingComposition):
    # Determine which composition is better and which is worse
    if req.composition_plan_1_better:
        better_id = req.composition_plan_1_id
        worse_id = req.composition_plan_2_id
    else:
        better_id = req.composition_plan_2_id
        worse_id = req.composition_plan_1_id
    
    # Fetch both composition plans from Supabase
    try:
        better_response = supabase.table("composition_plans").select("composition_plan").eq("id", better_id).execute()
        worse_response = supabase.table("composition_plans").select("composition_plan").eq("id", worse_id).execute()
        
        if not better_response.data or not worse_response.data:
            raise HTTPException(status_code=404, detail="One or both composition plans not found")
        
        composition_plan_better = better_response.data[0]["composition_plan"]
        composition_plan_worse = worse_response.data[0]["composition_plan"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching composition plans: {str(e)}")

    # Generate a new improved composition plan based on the comparison
    new_composition_plan = chat_completion_json(
        system_prompt="""You are a music composer trying to optimize a composition plan by pairwise comparison of compositions. You are given two composition plans - one that is better and one that is worse. You need to create a new composition plan that combines the best aspects of both and improves upon the worse one.

The new composition plan should be a JSON object with the following fields:
- positiveGlobalStyles: list of styles that are positive for the composition
- negativeGlobalStyles: list of styles that are negative for the composition
- description: description of the composition
- lyrics: (if present in either plan) lyrics in order of sections with sectionName and lines

Analyze what makes the better composition plan superior and incorporate those elements while also learning from the worse plan to avoid its weaknesses. Create a composition plan that is better than both.""",
        user_prompt=f"Better composition plan: {composition_plan_better}\n\nWorse composition plan: {composition_plan_worse}\n\nCreate a new improved composition plan that combines the strengths of the better plan while learning from the worse plan."
    )
    
    # Save the new composition plan to Supabase
    saved_id = None
    try:
        response = supabase.table("composition_plans").insert({
            "user_id": req.user_id,
            "run_id": req.run_id,
            "composition_plan": new_composition_plan,
            "better_than_id": worse_id,  # Reference to the worse composition it's improving upon
        }).execute()
        saved_id = response.data[0]["id"] if response.data else None
    except Exception as e:
        print(f"Error saving to Supabase: {e}")
        raise HTTPException(status_code=500, detail=f"Error saving new composition plan: {str(e)}")

    return {"id": saved_id, "composition_plan": new_composition_plan}