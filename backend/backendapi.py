from fastapi import FastAPI, Path
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
load_dotenv()


import os
from supabase import create_client, Client

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=[   
        "https://ai-tool-directory-rose.vercel.app/" 
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class Tool(BaseModel):
    name: str
    price: int
    category: str
class UpdateTool(BaseModel):
    name: str | None=None
    price: int | None=None
    category: str | None=None

@app.get("/")
def read_root():
    return {"message": "Welcome to the AI Tools API"}

@app.get("/fetchbyproductid/{product_id}")
def read_tool(product_id: int = Path(..., gt=0)):
    response = (
        supabase.table("tools")
        .select("*")
        .eq("id", product_id)
        .execute()
    )
    return response.data[0]

@app.get("/fetchbycategory/")
def get_tool(category: str | None=None):
    response = (
        supabase.table("tools")
        .select("*")
        .eq("category", category)
        .execute()
    )
    return response.data


@app.post("/tools")
def create_tool(tool: Tool):
    response = (
        supabase.table("tools")
        .insert({"name": tool.name, "price": tool.price, "category": tool.category})
        .execute()
    )
    return response.data[0]

@app.put("/tools/{product_id}")
def update_student(product_id: int, tool: UpdateTool):
    update_data = {k: v for k, v in tool.dict().items() if v is not None}

    if not update_data:
        return {"error": "No fields to update"}

    response = (
        supabase
        .table("tools")
        .update(update_data)
        .eq("id", product_id)
        .execute()
    )

    return {"message": "tool updated successfully"}
    
@app.get("/deletebyproductid/{product_id}")
def read_tool(product_id: int = Path(..., gt=0)):
    response = (
        supabase.table("tools")
        .delete()
        .eq("id", product_id)
        .execute()
    )
    return response.data[0]


