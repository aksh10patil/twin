from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
import os
from dotenv import load_dotenv
from typing import Optional, List, Dict
import json
import uuid
from datetime import datetime
from pathlib import Path

# Load environment variables
load_dotenv(override=True)

app = FastAPI()

# Configure CORS
origins = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client
groq_api_key = os.getenv("GROQ_API_KEY")
if not groq_api_key:
    raise ValueError("GROQ_API_KEY environment variable is not set")

client = Groq(api_key=groq_api_key)
GROQ_MODEL = os.getenv("GROQ_MODEL", "qwen/qwen3.8-27b")

# Base and Memory directory
BASE_DIR = Path(__file__).resolve().parent
MEMORY_DIR = (BASE_DIR / "../memory").resolve()
MEMORY_DIR.mkdir(exist_ok=True)


# Load personality details
def load_personality():
    file_path = BASE_DIR / "me.txt"
    if not file_path.exists():
        file_path = Path("me.txt")
    with open(file_path, "r", encoding="utf-8") as f:
        return f.read().strip()


PERSONALITY = load_personality()


# Memory functions
def load_conversation(session_id: str) -> List[Dict]:
    """Load conversation history from file"""
    file_path = MEMORY_DIR / f"{session_id}.json"
    if file_path.exists():
        with open(file_path, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_conversation(session_id: str, messages: List[Dict]):
    """Save conversation history to file"""
    file_path = MEMORY_DIR / f"{session_id}.json"
    with open(file_path, "w", encoding="utf-8") as f:
        json.dump(messages, f, indent=2, ensure_ascii=False)


# Request/Response models
class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None


class ChatResponse(BaseModel):
    response: str
    session_id: str


@app.get("/")
async def root():
    return {"message": "AI Digital Twin API with Memory"}


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        # Generate session ID if not provided
        session_id = request.session_id or str(uuid.uuid4())

        # Load conversation history
        conversation = load_conversation(session_id)

        # Build messages with history
        messages = [{"role": "system", "content": PERSONALITY}]

        # Add conversation history
        for msg in conversation:
            messages.append(msg)

        # Add current message
        messages.append({"role": "user", "content": request.message})

        # Call Groq API
        response = client.chat.completions.create(
            model=GROQ_MODEL,
            messages=messages,
        )

        assistant_response = response.choices[0].message.content

        # Update conversation history
        conversation.append({"role": "user", "content": request.message})
        conversation.append({"role": "assistant", "content": assistant_response})

        # Save updated conversation
        save_conversation(session_id, conversation)

        return ChatResponse(
            response=assistant_response,
            session_id=session_id,
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/sessions")
async def list_sessions():
    """List all conversation sessions"""
    sessions = []
    for file_path in MEMORY_DIR.glob("*.json"):
        session_id = file_path.stem
        with open(file_path, "r", encoding="utf-8") as f:
            conversation = json.load(f)
            sessions.append({
                "session_id": session_id,
                "message_count": len(conversation),
                "last_message": conversation[-1]["content"] if conversation else None,
            })
    return {"sessions": sessions}


@app.get("/sessions/{session_id}")
async def get_session(session_id: str):
    """Get conversation history for a specific session"""
    conversation = load_conversation(session_id)
    if not conversation:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session_id": session_id, "messages": conversation}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
