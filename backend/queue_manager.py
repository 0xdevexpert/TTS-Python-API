
import asyncio
import uuid
import logging
import os
from typing import Optional, Dict, Any
import aiohttp
import edge_tts
from pydantic import BaseModel

logger = logging.getLogger(__name__)

# Create a directory for storing audio files
AUDIO_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "audio_files")
os.makedirs(AUDIO_DIR, exist_ok=True)

class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "en-US-AriaNeural"
    pitch: Optional[str] = "0"
    speed: Optional[str] = "1"
    volume: Optional[str] = "100"


class JobResult(BaseModel):
    job_id: str
    status: str  # "success" or "failure"
    message: Optional[str] = None


class JobManager:
    def __init__(self, max_concurrent: int, webhook_url: str):
        self.max_concurrent = max_concurrent
        self.webhook_url = webhook_url
        self.queue = asyncio.Queue()
        self.semaphore = asyncio.Semaphore(self.max_concurrent)
        self.running = False

    async def start(self):
        if not self.running:
            self.running = True
            asyncio.create_task(self._worker())

    async def add_job(self, tts_request: TTSRequest) -> str:
        job_id = str(uuid.uuid4())
        await self.queue.put((job_id, tts_request))
        return job_id

    async def _worker(self):
        while True:
            job_id, tts_request = await self.queue.get()
            await self.semaphore.acquire()
            asyncio.create_task(self._process_job(job_id, tts_request))

    async def _process_job(self, job_id: str, tts_request: TTSRequest):
        try:
            logger.info(f"Processing job {job_id}")
            await self._run_tts(tts_request, job_id)
            result = JobResult(job_id=job_id, status="success")
        except Exception as e:
            logger.error(f"Job {job_id} failed: {e}")
            result = JobResult(job_id=job_id, status="failure", message=str(e))
        finally:
            await self._send_webhook(result)
            self.semaphore.release()

    async def _run_tts(self, tts_request: TTSRequest, job_id: str):
        # Generate output filename in the audio_files directory
        filename = os.path.join(AUDIO_DIR, f"{job_id}.mp3")
        
        # Format parameters according to edge-tts expectations
        # For pitch: convert from our numeric format to +XHz/-XHz format
        pitch_value = "+0Hz" if tts_request.pitch == "0" else f"{tts_request.pitch}Hz"
        if not pitch_value.startswith("+") and not pitch_value.startswith("-"):
            pitch_value = f"+{pitch_value}"
            
        # For rate: convert our decimal format (e.g. 1.5) to percentage format (+50%)
        speed_percentage = int((float(tts_request.speed) - 1) * 100)
        rate_value = f"+{speed_percentage}%" if speed_percentage >= 0 else f"{speed_percentage}%"
        
        # For volume: convert from percentage to +X%/-X% format
        volume_percentage = int(float(tts_request.volume)) - 100
        volume_value = f"+{volume_percentage}%" if volume_percentage >= 0 else f"{volume_percentage}%"
        
        # Create the communicate object with direct parameters
        communicate = edge_tts.Communicate(
            text=tts_request.text,
            voice=tts_request.voice,
            rate=rate_value,
            volume=volume_value,
            pitch=pitch_value
        )
        
        # Save audio to file
        await communicate.save(filename)
        
        logger.info(f"Job {job_id}: TTS conversion saved to {filename}")

    async def _send_webhook(self, result: JobResult):
        if not self.webhook_url or self.webhook_url.startswith("https://your-webhook"):
            logger.info("No valid webhook URL configured; skipping notification")
            return
        async with aiohttp.ClientSession() as session:
            try:
                payload = {
                    "job_id": result.job_id,
                    "status": result.status,
                }
                if result.message:
                    payload["message"] = result.message
                async with session.post(self.webhook_url, json=payload) as resp:
                    if resp.status != 200:
                        logger.warning(f"Webhook post returned non-200 status {resp.status}")
                    else:
                        logger.info(f"Webhook notified for job {result.job_id}")
            except Exception as e:
                logger.error(f"Failed to send webhook for job {result.job_id}: {e}")

