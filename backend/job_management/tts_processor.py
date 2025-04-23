
import os
import asyncio
import edge_tts
import logging

logger = logging.getLogger(__name__)

AUDIO_DIR = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "audio_files")
os.makedirs(AUDIO_DIR, exist_ok=True)

async def process_tts_request(job_id: str, text: str, voice: str, pitch: str, speed: str, volume: str) -> None:
    # Format TTS parameters
    pitch_value = "+0Hz" if pitch == "0" else f"{pitch}Hz"
    if not pitch_value.startswith("+") and not pitch_value.startswith("-"):
        pitch_value = f"+{pitch_value}"
        
    speed_percentage = int((float(speed) - 1) * 100)
    rate_value = f"+{speed_percentage}%" if speed_percentage >= 0 else f"{speed_percentage}%"
    
    volume_percentage = int(float(volume)) - 100
    volume_value = f"+{volume_percentage}%" if volume_percentage >= 0 else f"{volume_percentage}%"
    
    communicate = edge_tts.Communicate(
        text=text,
        voice=voice,
        rate=rate_value,
        volume=volume_value,
        pitch=pitch_value
    )
    
    filename = os.path.join(AUDIO_DIR, f"{job_id}.mp3")
    
    try:
        await asyncio.wait_for(communicate.save(filename), timeout=60.0)
        
        if not os.path.exists(filename) or os.path.getsize(filename) == 0:
            raise Exception(f"Failed to generate audio file for job {job_id}")
            
        logger.info(f"Job {job_id}: TTS conversion saved to {filename} ({os.path.getsize(filename)} bytes)")
    except asyncio.TimeoutError:
        raise Exception(f"TTS generation timed out for job {job_id}")
