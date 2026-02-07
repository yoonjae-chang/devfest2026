"""
Authentication service for verifying Supabase JWT tokens
"""
from fastapi import HTTPException, Security, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from supabase import create_client, Client
import os
from dotenv import load_dotenv
from pathlib import Path

env_path = Path(".") / ".env.local"
load_dotenv(dotenv_path=env_path)

SUPABASE_URL = os.environ.get("SUPABASE_URL")
SUPABASE_SECRET_KEY = os.environ.get("SUPABASE_SECRET_KEY")

security = HTTPBearer()


async def verify_token(credentials: HTTPAuthorizationCredentials = Security(security)) -> dict:
    """
    Verify Supabase JWT token and return user information
    Raises HTTPException if token is invalid or missing
    """
    if not credentials:
        raise HTTPException(
            status_code=401,
            detail="Authentication required. Missing authorization header."
        )
    
    token = credentials.credentials
    
    if not SUPABASE_URL or not SUPABASE_SECRET_KEY:
        raise HTTPException(
            status_code=500,
            detail="Server configuration error. Supabase credentials not set."
        )
    
    try:
        # Use Supabase client to verify the token
        supabase: Client = create_client(SUPABASE_URL, SUPABASE_SECRET_KEY)
        
        # Verify the token by getting the user
        response = supabase.auth.get_user(token)
        
        if not response.user:
            raise HTTPException(
                status_code=401,
                detail="Invalid or expired token."
            )
        
        return {
            "user_id": response.user.id,
            "email": response.user.email,
            "token": token
        }
    except Exception as e:
        raise HTTPException(
            status_code=401,
            detail=f"Authentication failed: {str(e)}"
        )


# Dependency to get current user
async def get_current_user(user_data: dict = Depends(verify_token)) -> dict:
    """
    Get current authenticated user
    """
    return user_data
