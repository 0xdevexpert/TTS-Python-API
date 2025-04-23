
import enum
import time
from typing import Optional
from pydantic import BaseModel

class JobStatus(enum.Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"

class TTSRequest(BaseModel):
    text: str
    voice: Optional[str] = "en-US-AriaNeural"
    pitch: Optional[str] = "0"
    speed: Optional[str] = "1"
    volume: Optional[str] = "100"

class JobResult(BaseModel):
    job_id: str
    status: str
    message: Optional[str] = None
    processing_time: Optional[float] = None

class JobInfo:
    def __init__(self, job_id: str, request: TTSRequest):
        self.job_id = job_id
        self.request = request
        self.status = JobStatus.QUEUED
        self.start_time: Optional[float] = None
        self.end_time: Optional[float] = None
        self.error_message: Optional[str] = None
        self.created_at = time.time()

    @property
    def processing_time(self) -> Optional[float]:
        if self.start_time and self.end_time:
            return self.end_time - self.start_time
        return None
        
    @property
    def age(self) -> float:
        return time.time() - self.created_at
