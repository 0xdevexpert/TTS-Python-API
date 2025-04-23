import json
import os
import datetime
import logging
from typing import List, Dict, Any

# Configure logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

JOBS_FILE = "jobs_data.json"
JOBS_CACHE = {}
JOBS_CACHE_LAST_WRITE = 0
JOBS_WRITE_INTERVAL = 10  # seconds between writes for batching
AUDIO_DIR = "audio_files"  # Directory containing audio files

def load_jobs() -> List[Dict[str, Any]]:
    global JOBS_CACHE, JOBS_CACHE_LAST_WRITE

    # Load jobs from cache if recent
    if JOBS_CACHE and (datetime.datetime.now().timestamp() - JOBS_CACHE_LAST_WRITE) < 60:
        logger.debug("Returning jobs from cache.")
        return JOBS_CACHE.copy()

    # Load jobs from file
    if os.path.exists(JOBS_FILE):
        try:
            with open(JOBS_FILE, 'r') as f:
                JOBS_CACHE = json.load(f)
        except json.JSONDecodeError:
            logger.error("Failed to decode jobs_data.json. Resetting cache.")
            JOBS_CACHE = []

    # Update jobs with audio file information
    audio_files = set(os.listdir(AUDIO_DIR))
    logger.debug(f"Audio files found: {audio_files}")

    # Filter out jobs without corresponding audio files
    updated_jobs = []
    for job in JOBS_CACHE:
        job_id = job.get("job_id")
        if job_id:
            audio_filename = f"{job_id}.mp3"
            if audio_filename in audio_files:
                job["audio_exists"] = True
                job["status"] = "completed"  # Ensure status is "completed"
                updated_jobs.append(job)
                logger.debug(f"Job {job_id} is valid and retained.")
            else:
                logger.debug(f"Job {job_id} audio file not found. Removing from jobs_data.json.")

    # Add new jobs for audio files not in jobs_data.json
    existing_job_ids = {job.get("job_id") for job in updated_jobs}
    for audio_file in audio_files:
        if audio_file.endswith(".mp3"):
            job_id = os.path.splitext(audio_file)[0]
            if job_id not in existing_job_ids:
                logger.debug(f"Adding new job for audio file {audio_file}.")
                updated_jobs.append({
                    "job_id": job_id,
                    "status": "completed",
                    "audio_exists": True,
                    "created_at": datetime.datetime.now().isoformat()
                })

    # Save updated jobs to file
    with open(JOBS_FILE, 'w') as f:
        json.dump(updated_jobs, f)

    JOBS_CACHE = updated_jobs
    JOBS_CACHE_LAST_WRITE = datetime.datetime.now().timestamp()
    logger.debug("Jobs updated and saved to jobs_data.json.")
    return JOBS_CACHE.copy()

async def save_jobs_async(jobs: List[Dict[str, Any]]) -> None:
    global JOBS_CACHE, JOBS_CACHE_LAST_WRITE
    
    JOBS_CACHE = jobs.copy()
    
    now = datetime.datetime.now().timestamp()
    if now - JOBS_CACHE_LAST_WRITE > JOBS_WRITE_INTERVAL:
        try:
            with open(JOBS_FILE, 'w') as f:
                json.dump(jobs, f)
            JOBS_CACHE_LAST_WRITE = now
        except Exception as e:
            logger.error(f"Error saving jobs: {e}")

# Initialize jobs file if it doesn't exist
if not os.path.exists(JOBS_FILE):
    with open(JOBS_FILE, 'w') as f:
        json.dump([], f)

