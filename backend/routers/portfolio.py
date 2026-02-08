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
    item_json: str = Form(...),
    audio_file: UploadFile = File(...),
    user: dict = Depends(get_current_user),
):
    """Create a new portfolio item and upload the audio file to storage."""
    try:
        # Parse the JSON item data
        item_data = json.loads(item_json)
        item = PortfolioItemCreate(**item_data)
        
        # Upload audio file to Supabase Storage
        storage_path = f"{user['user_id']}/{item.id}/{item.file_name}"
        
        # Read file content
        file_content = await audio_file.read()
        
        # Upload to storage
        supabase.storage.from_(PORTFOLIO_AUDIO_BUCKET).upload(
            storage_path,
            file_content,
            file_options={"content-type": audio_file.content_type or "audio/mpeg"},
        )
        
        # Get public URL for the file (if bucket is public) or signed URL
        # For now, we'll store the path and generate URLs on the frontend
        file_url = supabase.storage.from_(PORTFOLIO_AUDIO_BUCKET).get_public_url(storage_path)
        
        # Insert into database
        db_item = {
            "id": item.id,
            "user_id": user["user_id"],
            "color_class": item.color_class,
            "title": item.title,
            "duration": item.duration,
            "featured": item.featured,
            "description": item.description,
            "lyrics": item.lyrics,
            "file_name": item.file_name,
            "file_size": item.file_size,
            "file_last_modified": item.file_last_modified,
            "storage_path": storage_path,
            "cover_image_url": item.cover_image_url,
        }
        
        response = supabase.table("portfolio_items").insert(db_item).execute()
        
        if not response.data:
            raise HTTPException(status_code=500, detail="Failed to create portfolio item")
        
        return response.data[0]
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
        # Build update dict with only provided fields
        update_data = {}
        if item_update.title is not None:
            update_data["title"] = item_update.title
        if item_update.duration is not None:
            update_data["duration"] = item_update.duration
        if item_update.featured is not None:
            update_data["featured"] = item_update.featured
        if item_update.description is not None:
            update_data["description"] = item_update.description
        if item_update.lyrics is not None:
            update_data["lyrics"] = item_update.lyrics
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
