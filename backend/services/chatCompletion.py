from openai import OpenAI
import os
from pathlib import Path
from dotenv import load_dotenv
import json

# Get the directory where this file is located, then go up to backend directory
script_dir = Path(__file__).parent.parent
env_path = script_dir / ".env.local"
load_dotenv(dotenv_path=env_path)

# Also try loading from current directory as fallback
load_dotenv()

def chat_completion_json(system_prompt: str, user_prompt: str):
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not found in environment variables")
    
    client = OpenAI(api_key=api_key)
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o",  # Using gpt-4o (latest model) instead of invalid "gpt-4.1"
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        content = response.choices[0].message.content
        if not content:
            raise ValueError("Empty response from OpenAI API")
        
        return json.loads(content)
    except json.JSONDecodeError as e:
        raise ValueError(f"Failed to parse JSON response from OpenAI: {e}")
    except Exception as e:
        raise RuntimeError(f"Error calling OpenAI API: {e}")
