import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from job_management import JobManager
from routes import router, initialize_router

load_dotenv()

# Configuration from environment variables
MAX_CONCURRENT_REQUESTS = int(os.getenv('MAX_CONCURRENT_REQUESTS', '50'))
WEBHOOK_URL = os.getenv('WEBHOOK_URL', '')

# Initialize FastAPI with connection pooling
app = FastAPI(
    title="TTS API", 
    description="High-performance Text-to-Speech API",
    version="1.0.0"
)

# Allow CORS from frontend with optimized settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=86400,  # Cache preflight requests for 24 hours
)

# Initialize job manager with concurrency control
job_manager = JobManager(max_concurrent=MAX_CONCURRENT_REQUESTS, webhook_url=WEBHOOK_URL)

# Initialize router with job manager
initialize_router(job_manager)

# Include the router
app.include_router(router)
