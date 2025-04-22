
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
import asyncio
from queue_manager import JobManager, TTSRequest

load_dotenv()

MAX_CONCURRENT_REQUESTS = int(os.getenv("MAX_CONCURRENT_REQUESTS", "50"))
WEBHOOK_URL = os.getenv("WEBHOOK_URL", "")

app = FastAPI()

# Allow CORS from frontend (adjust origins as needed)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For development, restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

job_manager = JobManager(max_concurrent=MAX_CONCURRENT_REQUESTS, webhook_url=WEBHOOK_URL)

@app.on_event("startup")
async def startup_event():
    await job_manager.start()


class TTSRequestModel(BaseModel):
    text: str
    voice: str = "en-US-AriaNeural"
    pitch: str = "0"
    speed: str = "1"
    volume: str = "100"


class TTSResponseModel(BaseModel):
    job_id: str


@app.post("/tts", response_model=TTSResponseModel)
async def tts_endpoint(request: TTSRequestModel):
    if not request.text or request.text.strip() == "":
        raise HTTPException(status_code=400, detail="Text is required")

    job_id = await job_manager.add_job(
        TTSRequest(
            text=request.text.strip(),
            voice=request.voice,
            pitch=request.pitch,
            speed=request.speed,
            volume=request.volume,
        )
    )
    return TTSResponseModel(job_id=job_id)

