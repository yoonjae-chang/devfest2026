from fastapi import FastAPI, Path
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
import openai 
import json
load_dotenv()


import os
from supabase import create_client, Client

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)
elevenlabs_api_key: str = os.environ.get("ELEVENLABS_API_KEY")

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=[   
        "http://localhost:3000" 
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class MusicPrompt(BaseModel):
    prompt: str
    length_ms: int = 10000

def generate_composition_plan(prompt: str, length_ms: int):
    system_prompt = """
You generate music composition plans in STRICT JSON.
No explanations.
No markdown.
No copyrighted artists or songs.
Follow this schema exactly:
{
  "positiveGlobalStyles": [],
  "negativeGlobalStyles": [],
  "sections": [
    {
      "sectionName": "",
      "positiveLocalStyles": [],
      "negativeLocalStyles": [],
      "durationMs": 0,
      "lines": []
    }
  ]
}
"""

    response = openai.chat.completions.create(
        model="gpt-4.1",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        temperature=0.7,
    )

    return json.loads(response.choices[0].message.content)

def generate_music_from_plan(plan):
    audio_stream = elevenlabs.music.compose(
        composition_plan=plan
    )
    return audio_stream

@app.get("/")
def read_root():
    return {"message": "Welcome to the Music API"}

@app.get("/fetchbyproductid/{product_id}")
def read_tool(product_id: int = Path(..., gt=0)):
    response = (
        supabase.table("music")
        .select("*")
        .eq("id", product_id)
        .execute()
    )
    return response.data[0]

@app.get("/fetchbycategory/")
def get_tool(category: str | None=None):
    response = (
        supabase.table("music")
        .select("*")
        .eq("category", category)
        .execute()
    )
    return response.data


@app.post("/songs")
def create_song(song: Song):
    response = (
        supabase.table("songs")
        .insert({"name": tool.name, "price": tool.price, "category": tool.category})
        .execute()
    )
    return response.data[0]

@app.put("/tools/{product_id}")
def update_music(product_id: int, tool: UpdateTool):
    update_data = {k: v for k, v in tool.dict().items() if v is not None}

    if not update_data:
        return {"error": "No fields to update"}

    response = (
        supabase
        .table("music")
        .update(update_data)
        .eq("id", product_id)
        .execute()
    )

    return {"message": "tool updated successfully"}
    
@app.get("/deletebyproductid/{product_id}")
def read_tool(product_id: int = Path(..., gt=0)):
    response = (
        supabase.table("music")
        .delete()
        .eq("id", product_id)
        .execute()
    )
    return response.data[0]


