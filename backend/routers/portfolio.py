"""
Portfolio items CRUD operations.
Handles creating, reading, updating, and deleting portfolio items with audio files stored in Supabase Storage.
"""

import os
import uuid
import json
from pathlib import Path
from typing import Optional
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Depends, UploadFile, File, Form
from pydantic import BaseModel
from supabase import create_client, Client
from services.auth import get_current_user

env_path = Path("../.") / ".env.local"
load_dotenv(dotenv_path=env_path)

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SECRET_KEY")
supabase: Client = create_client(url, key)

portfolio_router = APIRouter(prefix="/portfolio", tags=["portfolio"])

PORTFOLIO_AUDIO_BUCKET = "portfolio-audio"


class PortfolioItemCreate(BaseModel):
    id: str
    color_class: str
    title: str
    duration: Optional[float] = None
    featured: bool = False
    description: str = ""
    lyrics: str = ""
    file_name: str
    file_size: int
    file_last_modified: int
    cover_image_url: Optional[str] = None


class PortfolioItemUpdate(BaseModel):
    title: Optional[str] = None
    duration: Optional[float] = None
    featured: Optional[bool] = None
    description: Optional[str] = None
    lyrics: Optional[str] = None
    color_class: Optional[str] = None
    cover_image_url: Optional[str] = None


class PortfolioItemResponse(BaseModel):
    id: str
    user_id: str
    color_class: str
    title: str
    duration: Optional[float]
    featured: bool
    description: str
    lyrics: str
    file_name: str
    file_size: int
    file_last_modified: int
    storage_path: str
    cover_image_url: Optional[str]
    created_at: str


@portfolio_router.get("/items", response_model=list[PortfolioItemResponse])
async def get_portfolio_items(user: dict = Depends(get_current_user)):
    """Get all portfolio items for the current user."""
    try:
        response = (
            supabase.table("portfolio_items")
            .select("*")
            .eq("user_id", user["user_id"])
            .order("created_at", desc=True)
            .execute()
        )
        return response.data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch portfolio items: {str(e)}")


@portfolio_router.get("/items/{item_id}", response_model=PortfolioItemResponse)
async def get_portfolio_item(item_id: str, user: dict = Depends(get_current_user)):
    """Get a specific portfolio item by ID."""
    try:
        response = (
            supabase.table("portfolio_items")
            .select("*")
            .eq("id", item_id)
            .eq("user_id", user["user_id"])
            .single()
            .execute()
        )
        if not response.data:
            raise HTTPException(status_code=404, detail="Portfolio item not found")
        return response.data
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch portfolio item: {str(e)}")


@portfolio_router.post("/items", response_model=PortfolioItemResponse)
async def create_portfolio_item(
    audio_file: UploadFile = File(..., alias="audio_file"),
    item_json: str = Form(...),
    user: dict = Depends(get_current_user),
):
    """Create a new portfolio item with an uploaded file."""
    try:
        # Parse the JSON data
        item_data = json.loads(item_json)
        
        # Generate unique storage path
        file_extension = Path(audio_file.filename).suffix if audio_file.filename else ""
        storage_filename = f"{item_data['id']}{file_extension}"
        storage_path = f"{user['user_id']}/{storage_filename}"
        
        # Read file content
        file_content = await audio_file.read()
        
        # Upload to Supabase Storage
        supabase.storage.from_(PORTFOLIO_AUDIO_BUCKET).upload(
            path=storage_path,
            file=file_content,
            file_options={
                "content-type": audio_file.content_type or "application/octet-stream",
                "upsert": "false"
            }
        )
        
        # Create database record
        db_item = {
            "id": item_data["id"],
            "user_id": user["user_id"],
            "color_class": item_data["color_class"],
            "title": item_data["title"],
            "duration": item_data.get("duration"),
            "featured": item_data.get("featured", False),
            "description": item_data.get("description", ""),
            "lyrics": item_data.get("lyrics", ""),
            "file_name": item_data["file_name"],
            "file_size": item_data["file_size"],
            "file_last_modified": item_data["file_last_modified"],
            "storage_path": storage_path,
            "cover_image_url": item_data.get("cover_image_url"),
        }
        
        response = supabase.table("portfolio_items").insert(db_item).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create portfolio item")
        
        return response.data[0]
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON in item_json")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create portfolio item: {str(e)}")


@portfolio_router.put("/items/{item_id}", response_model=PortfolioItemResponse)
async def update_portfolio_item(
    item_id: str,
    item_update: PortfolioItemUpdate,
    user: dict = Depends(get_current_user),
):
    """Update a portfolio item."""
    try:
        # First, get the current portfolio item to find the filename
        current_item_response = (
            supabase.table("portfolio_items")
            .select("file_name")
            .eq("id", item_id)
            .eq("user_id", user["user_id"])
            .single()
            .execute()
        )
        
        if not current_item_response.data:
            raise HTTPException(status_code=404, detail="Portfolio item not found")
        
        file_name = current_item_response.data.get("file_name")
        
        # Try to find matching final_composition by filename
        final_composition = None
        if file_name:
            try:
                comp_response = supabase.table("final_compositions").select("*").eq("audio_filename", file_name).eq("user_id", user["user_id"]).execute()
                if comp_response.data:
                    final_composition = comp_response.data[0]
            except Exception as e:
                print(f"Warning: Could not fetch final_composition: {e}")
        
        # Build update dict with only provided fields
        # Title, description, and lyrics MUST come from final_composition, not from request
        update_data = {}
        
        # Title: always get from final_composition
        if final_composition and final_composition.get("title"):
            update_data["title"] = final_composition["title"]
        
        # Description: always get from final_composition
        if final_composition:
            composition_plan = final_composition.get("composition_plan")
            if composition_plan and isinstance(composition_plan, dict) and composition_plan.get("description"):
                update_data["description"] = str(composition_plan["description"])
        
        # Lyrics: always get from final_composition
        if final_composition:
            composition_plan = final_composition.get("composition_plan")
            if composition_plan and isinstance(composition_plan, dict) and composition_plan.get("lyrics"):
                update_data["lyrics"] = str(composition_plan["lyrics"])
        
        # Other fields can be updated normally from request
        if item_update.duration is not None:
            update_data["duration"] = item_update.duration
        if item_update.featured is not None:
            update_data["featured"] = item_update.featured
        if item_update.color_class is not None:
            update_data["color_class"] = item_update.color_class
        if item_update.cover_image_url is not None:
            update_data["cover_image_url"] = item_update.cover_image_url
        
        if not update_data:
            raise HTTPException(status_code=400, detail="No fields to update")
        
        response = (
            supabase.table("portfolio_items")
            .update(update_data)
            .eq("id", item_id)
            .eq("user_id", user["user_id"])
            .execute()
        )
        
        if not response.data:
            raise HTTPException(status_code=404, detail="Portfolio item not found")
        
        return response.data[0]
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update portfolio item: {str(e)}")


@portfolio_router.delete("/items/{item_id}")
async def delete_portfolio_item(item_id: str, user: dict = Depends(get_current_user)):
    """Delete a portfolio item and its audio file from storage."""
    try:
        # First, get the item to find the storage path
        item_response = (
            supabase.table("portfolio_items")
            .select("storage_path")
            .eq("id", item_id)
            .eq("user_id", user["user_id"])
            .single()
            .execute()
        )
        
        if not item_response.data:
            raise HTTPException(status_code=404, detail="Portfolio item not found")
        
        storage_path = item_response.data.get("storage_path")
        
        # Delete from storage if path exists
        if storage_path:
            try:
                supabase.storage.from_(PORTFOLIO_AUDIO_BUCKET).remove([storage_path])
            except Exception as e:
                # Log but don't fail if storage deletion fails
                print(f"Warning: Failed to delete storage file {storage_path}: {e}")
        
        # Delete from database
        response = (
            supabase.table("portfolio_items")
            .delete()
            .eq("id", item_id)
            .eq("user_id", user["user_id"])
            .execute()
        )
        
        return {"message": "Portfolio item deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete portfolio item: {str(e)}")


@portfolio_router.get("/items/{item_id}/audio")
async def get_portfolio_audio(item_id: str, user: dict = Depends(get_current_user)):
    """Get the audio file for a portfolio item."""
    try:
        # Get the item to find the storage path
        item_response = (
            supabase.table("portfolio_items")
            .select("storage_path")
            .eq("id", item_id)
            .eq("user_id", user["user_id"])
            .single()
            .execute()
        )
        
        if not item_response.data:
            raise HTTPException(status_code=404, detail="Portfolio item not found")
        
        storage_path = item_response.data.get("storage_path")
        
        if not storage_path:
            raise HTTPException(status_code=404, detail="Audio file not found")
        
        # Download from storage
        file_data = supabase.storage.from_(PORTFOLIO_AUDIO_BUCKET).download(storage_path)
        
        # Get file name from path
        file_name = storage_path.split("/")[-1]
        
        from fastapi.responses import Response
        return Response(
            content=file_data,
            media_type="audio/mpeg",
            headers={"Content-Disposition": f'attachment; filename="{file_name}"'},
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get audio file: {str(e)}")
