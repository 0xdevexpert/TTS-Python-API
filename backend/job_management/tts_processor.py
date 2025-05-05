
import os
import asyncio
import edge_tts
import logging
import traceback

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
    
    # Log the job parameters for debugging
    logger.info(f"Processing TTS job {job_id}: voice={voice}, text length={len(text)}")
    
    try:
        communicate = edge_tts.Communicate(
            text=text,
            voice=voice,
            rate=rate_value,
            volume=volume_value,
            pitch=pitch_value
        )
        
        filename = os.path.join(AUDIO_DIR, f"{job_id}.mp3")
        
        # Use a shorter timeout to prevent long-running jobs
        # Break the process into steps for better error tracking
        try:
            # Using a shorter timeout for TTS generation
            await asyncio.wait_for(communicate.save(filename), timeout=30.0)
            
            if not os.path.exists(filename) or os.path.getsize(filename) == 0:
                error_msg = f"Failed to generate audio file for job {job_id} - file is empty or not created"
                logger.error(error_msg)
                raise Exception(error_msg)
                
            file_size = os.path.getsize(filename)
            logger.info(f"Job {job_id}: TTS conversion saved to {filename} ({file_size} bytes)")
            
            # Add a small delay to ensure the file is properly written to disk
            await asyncio.sleep(0.5)
            
        except asyncio.TimeoutError:
            error_msg = f"TTS generation timed out for job {job_id} (30 second timeout exceeded)"
            logger.error(error_msg)
            raise Exception(error_msg)
        except Exception as e:
            # Log the full stack trace for debugging
            logger.error(f"Error during TTS file save for job {job_id}: {str(e)}\n{traceback.format_exc()}")
            raise
    except Exception as e:
        logger.error(f"Error processing TTS for job {job_id}: {str(e)}\n{traceback.format_exc()}")
        raise

