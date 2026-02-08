"""
Generate AI album covers for portfolio items using Google Gemini.
Uses Gemini to create enhanced prompts from title and description, then generates images.
"""

import os
import uuid
from pathlib import Path
from dotenv import load_dotenv
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
import requests
from supabase import create_client, Client
from services.auth import get_current_user

# Try to import google.generativeai, but don't fail if it's not installed
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    genai = None

env_path = Path("../.") / ".env.local"
load_dotenv(dotenv_path=env_path)

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_SECRET_KEY")
supabase: Client = create_client(url, key)

# Only configure Gemini if it's available
if GEMINI_AVAILABLE:
    gemini_api_key: str = os.environ.get("GEMINI_API_KEY")
    if gemini_api_key:
        genai.configure(api_key=gemini_api_key)

generate_album_cover_router = APIRouter(prefix="/generate-album-cover", tags=["generate-album-cover"])

# Storage bucket name for album covers
ALBUM_COVERS_BUCKET = "album-covers"


class GenerateAlbumCoverRequest(BaseModel):
    title: str
    description: str = ""
    artist_name: str = ""


@generate_album_cover_router.post("/generate")
async def generate_album_cover(
    req: GenerateAlbumCoverRequest,
    user: dict = Depends(get_current_user)
):
    """
    Generate an AI album cover using Google Gemini.
    Uses Gemini to create an enhanced visual description from title and description,
    then uses that description to generate the image via Imagen or alternative service.
    Returns the public URL of the uploaded cover image.
    """
    try:
        # Check if Gemini is available
        if not GEMINI_AVAILABLE:
            raise HTTPException(
                status_code=503,
                detail="Google Generative AI package not installed. Please install it with: pip install google-generativeai"
            )
        
        gemini_api_key = os.environ.get("GEMINI_API_KEY")
        if not gemini_api_key:
            raise HTTPException(
                status_code=500,
                detail="GEMINI_API_KEY not found in environment variables"
            )
        
        print(f"Generating album cover with Gemini. Title: {req.title}, Description: {req.description}")
        
        # Use Gemini to create an enhanced, detailed visual description
        model = genai.GenerativeModel('gemini-1.5-pro')
        
        # Build prompt parts to avoid backslashes in f-string expressions
        artist_part = f"Artist: {req.artist_name}\n" if req.artist_name else ""
        description_part = f"Description: {req.description}\n" if req.description else ""
        
        prompt = (
            f"Create a detailed, vivid visual description for an album cover art based on this music track:\n\n"
            f"Title: {req.title}\n"
            f"{artist_part}"
            f"{description_part}"
            f"Generate a detailed visual description (3-4 sentences) for an album cover that:\n"
            f"- Captures the mood, style, and essence of this music\n"
            f"- Is visually striking and artistic\n"
            f"- Uses appropriate colors, composition, and visual elements\n"
            f"- Would work well as a square-format album cover for streaming platforms\n"
            f"- Is modern and professional\n\n"
            f"Focus on specific visual details: colors, imagery, style, mood, composition. "
            f"Be creative and detailed. Return only the visual description, nothing else."
        )
        
        enhanced_response = model.generate_content(prompt)
        enhanced_description = enhanced_response.text.strip()
        
        print(f"Enhanced description from Gemini: {enhanced_description}")
        
        # Create final image generation prompt using the enhanced description
        final_image_prompt = (
            f"Professional album cover art: {enhanced_description}. "
            f"Square format (1:1 aspect ratio), modern design, high quality, "
            f"suitable for music streaming platforms, vibrant colors, artistic composition."
        )
        
        # Generate image using the enhanced prompt
        # Since Gemini API doesn't include direct image generation,
        # we'll use the enhanced prompt with Google's Imagen API via Vertex AI
        
        image_data = None
        
        # Try Vertex AI Imagen first
        try:
            from google.cloud import aiplatform
            from vertexai.preview.vision_models import ImageGenerationModel
            
            project_id = os.environ.get("GOOGLE_CLOUD_PROJECT_ID")
            location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
            
            if project_id:
                aiplatform.init(project=project_id, location=location)
                
                imagen_model = ImageGenerationModel.from_pretrained("imagegeneration@006")
                image_response = imagen_model.generate_images(
                    prompt=final_image_prompt,
                    number_of_images=1,
                    aspect_ratio="1:1",
                )
                
                generated_image = image_response[0]
                image_data = generated_image._image_bytes
                print("Successfully generated image using Vertex AI Imagen")
            else:
                raise ValueError("GOOGLE_CLOUD_PROJECT_ID not configured")
                
        except (ImportError, ValueError, Exception) as vertex_error:
            print(f"Vertex AI not available: {vertex_error}")
            
            # Fallback: Use enhanced description with alternative image generation
            # You can integrate with other services here (e.g., Stability AI, etc.)
            # For now, we'll provide a clear error message with the enhanced prompt
            
            raise HTTPException(
                status_code=501,
                detail=(
                    f"Image generation requires Vertex AI setup with Imagen API. "
                    f"Enhanced prompt from Gemini: '{enhanced_description}'. "
                    f"Please configure GOOGLE_CLOUD_PROJECT_ID and Vertex AI credentials. "
                    f"Alternatively, integrate with another image generation service using the enhanced prompt above."
                )
            )
        
        if not image_data:
            raise HTTPException(
                status_code=500,
                detail="Failed to generate image data"
            )
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        filename = f"{file_id}.png"
        storage_path = f"{user['user_id']}/{filename}"
        
        # Upload to Supabase Storage
        try:
            upload_response = supabase.storage.from_(ALBUM_COVERS_BUCKET).upload(
                path=storage_path,
                file=image_data,
                file_options={
                    "content-type": "image/png",
                    "upsert": "false"
                }
            )
            
            # Get public URL
            public_url = supabase.storage.from_(ALBUM_COVERS_BUCKET).get_public_url(storage_path)
            
            return {
                "cover_image_url": str(public_url),
                "storage_path": storage_path,
                "filename": filename
            }
        except Exception as storage_error:
            print(f"Error uploading to Supabase Storage: {storage_error}")
            raise HTTPException(
                status_code=500,
                detail=f"Failed to upload cover image to storage: {str(storage_error)}"
            )
            
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error generating album cover: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error generating album cover: {str(e)}"
        )
