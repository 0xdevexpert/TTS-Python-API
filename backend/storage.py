
import json
import os
import datetime
from typing import List, Dict, Any

JOBS_FILE = "jobs_data.json"
JOBS_CACHE = {}
JOBS_CACHE_LAST_WRITE = 0
JOBS_WRITE_INTERVAL = 10  # seconds between writes for batching

def load_jobs() -> List[Dict[str, Any]]:
    global JOBS_CACHE, JOBS_CACHE_LAST_WRITE
    
    if JOBS_CACHE and (datetime.datetime.now().timestamp() - JOBS_CACHE_LAST_WRITE) < 60:
        return JOBS_CACHE.copy()
        
    if os.path.exists(JOBS_FILE):
        try:
            with open(JOBS_FILE, 'r') as f:
                JOBS_CACHE = json.load(f)
                JOBS_CACHE_LAST_WRITE = datetime.datetime.now().timestamp()
                return JOBS_CACHE.copy()
        except json.JSONDecodeError:
            JOBS_CACHE = []
            return []
    return []

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
            print(f"Error saving jobs: {e}")

# Initialize jobs file if it doesn't exist
if not os.path.exists(JOBS_FILE):
    with open(JOBS_FILE, 'w') as f:
        json.dump([], f)

