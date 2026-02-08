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


async def generate_album_cover_internal(
    title: str,
    description: str = "",
    user_id: str = None
) -> dict:
    """
    Internal function to generate album cover without FastAPI dependencies.
    Can be called from other modules.
    """
    try:
        # Check if Gemini is available
        if not GEMINI_AVAILABLE:
            raise ValueError("Google Generative AI package not installed")
        
        gemini_api_key = os.environ.get("GEMINI_API_KEY")
        if not gemini_api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        
        print(f"Generating album cover with Gemini. Title: {title}, Description: {description}")
        
        # Use Gemini to create an enhanced, detailed visual description
        # Try to list available models first to find what's actually available
        model = None
        model_name_to_use = None
        
        try:
            print("Listing available Gemini models...")
            available_models = genai.list_models()
            found_model_names = []
            for m in available_models:
                if hasattr(m, 'supported_generation_methods'):
                    methods = m.supported_generation_methods
                    if methods and 'generateContent' in methods:
                        # Get the model name - it might be in different formats
                        model_name = getattr(m, 'name', None) or getattr(m, 'display_name', None)
                        if model_name:
                            # Remove 'models/' prefix if present
                            clean_name = model_name.replace('models/', '') if model_name.startswith('models/') else model_name
                            found_model_names.append(clean_name)
                            print(f"  - Available model: {clean_name} (original: {model_name})")
            
            if found_model_names:
                # Try preferred models in order
                preferred_order = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-1.0-pro']
                for preferred in preferred_order:
                    # Check if any found model contains the preferred name
                    matching = [name for name in found_model_names if preferred in name.lower()]
                    if matching:
                        model_name_to_use = matching[0]
                        print(f"Using model: {model_name_to_use}")
                        break
                
                # If no preferred match, use first available
                if not model_name_to_use and found_model_names:
                    model_name_to_use = found_model_names[0]
                    print(f"Using first available model: {model_name_to_use}")
        except Exception as list_error:
            print(f"Could not list models: {list_error}, will try direct model names")
        
        # Try to create model with found name or fallback to common names
        if model_name_to_use:
            try:
                model = genai.GenerativeModel(model_name_to_use)
            except Exception as e:
                print(f"Failed to create model {model_name_to_use}: {e}")
                model_name_to_use = None
        
        # Fallback: try common model names directly
        if model is None:
            fallback_models = ['gemini-1.5-flash', 'gemini-1.5-pro', 'gemini-pro', 'gemini-1.0-pro']
            for model_name in fallback_models:
                try:
                    print(f"Trying fallback model: {model_name}")
                    model = genai.GenerativeModel(model_name)
                    print(f"Successfully created model: {model_name}")
                    break
                except Exception as e:
                    print(f"Model {model_name} failed: {e}")
                    continue
        
        if model is None:
            raise ValueError(
                "No working Gemini model found. Please check your GEMINI_API_KEY and ensure it has access to Gemini models. "
                "Try checking the Google AI Studio (https://aistudio.google.com/) to see which models are available for your API key."
            )
        
        # Build prompt parts to avoid backslashes in f-string expressions
        description_part = f"Description: {description}\n" if description else ""
        
        prompt = (
            f"Create a detailed, vivid visual description for an album cover art based on this music track:\n\n"
            f"Title: {title}\n"
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
        
        # Generate content with error handling
        try:
            enhanced_response = model.generate_content(prompt)
            enhanced_description = enhanced_response.text.strip()
        except Exception as gen_error:
            # If generation fails, try to use a fallback model
            print(f"Error generating content with current model: {gen_error}")
            if '404' in str(gen_error) or 'not found' in str(gen_error).lower():
                # Try gemini-pro as fallback
                try:
                    print("Trying fallback model: gemini-pro")
                    fallback_model = genai.GenerativeModel('gemini-pro')
                    enhanced_response = fallback_model.generate_content(prompt)
                    enhanced_description = enhanced_response.text.strip()
                except Exception as fallback_error:
                    raise ValueError(
                        f"Failed to generate content with any available model. "
                        f"Original error: {gen_error}. Fallback error: {fallback_error}. "
                        f"Please check your GEMINI_API_KEY and model availability."
                    )
            else:
                raise
        
        print(f"Enhanced description from Gemini: {enhanced_description}")
        
        # Create final image generation prompt using the enhanced description
        final_image_prompt = (
            f"Professional album cover art: {enhanced_description}. "
            f"Square format (1:1 aspect ratio), modern design, high quality, "
            f"suitable for music streaming platforms, vibrant colors, artistic composition."
        )
        
        # Generate image using the enhanced prompt
        # Check if Vertex AI is configured first
        project_id = os.environ.get("GOOGLE_CLOUD_PROJECT_ID")
        if not project_id:
            # No project ID configured, skip image generation
            print("GOOGLE_CLOUD_PROJECT_ID not configured - skipping image generation")
            return None
        
        image_data = None
        
        # Try Vertex AI Imagen
        try:
            from google.cloud import aiplatform
            from vertexai.preview.vision_models import ImageGenerationModel
            
            location = os.environ.get("GOOGLE_CLOUD_LOCATION", "us-central1")
            aiplatform.init(project=project_id, location=location)
            
            imagen_model = ImageGenerationModel.from_pretrained("models/imagen-4.0-fast-generate-001")
            image_response = imagen_model.generate_images(
                prompt=final_image_prompt,
                number_of_images=1,
                aspect_ratio="1:1",
            )
            
            generated_image = image_response[0]
            image_data = generated_image._image_bytes
            print("Successfully generated image using Vertex AI Imagen")
                
        except (ImportError, ValueError, Exception) as vertex_error:
            print(f"Vertex AI not available: {vertex_error}")
            # If Vertex AI is not configured, we can't generate images
            # Return None to indicate cover generation was skipped
            print("Skipping image generation - Vertex AI not configured. Music generation will continue without cover.")
            return None
        
        if not image_data:
            print("Failed to generate image data - skipping cover generation")
            return None
        
        # Generate unique filename
        file_id = str(uuid.uuid4())
        filename = f"{file_id}.png"
        storage_path = f"{user_id}/{filename}" if user_id else filename
        
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
            raise ValueError(f"Failed to upload cover image to storage: {str(storage_error)}")
            
    except Exception as e:
        print(f"Error generating album cover: {e}")
        import traceback
        traceback.print_exc()
        raise


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
        result = await generate_album_cover_internal(
            title=req.title,
            description=req.description,
            user_id=user['user_id']
        )
        if result is None:
            raise HTTPException(
                status_code=501,
                detail="Image generation requires Vertex AI setup with Imagen API. Please configure GOOGLE_CLOUD_PROJECT_ID and Vertex AI credentials."
            )
        return result
    except ValueError as e:
        if "not installed" in str(e):
            raise HTTPException(
                status_code=503,
                detail="Google Generative AI package not installed. Please install it with: pip install google-generativeai"
            )
        elif "GEMINI_API_KEY" in str(e):
            raise HTTPException(
                status_code=500,
                detail="GEMINI_API_KEY not found in environment variables"
            )
        elif "Vertex AI" in str(e):
            raise HTTPException(
                status_code=501,
                detail=str(e)
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=str(e)
            )
    except Exception as e:
        print(f"Error generating album cover: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error generating album cover: {str(e)}"
        )
