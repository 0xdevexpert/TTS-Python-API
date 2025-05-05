
import os
from fastapi import FastAPI, Security, HTTPException, Depends
from fastapi.security.api_key import APIKeyHeader
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv
from job_management import JobManager
from routes import router, initialize_router
from urllib.parse import urlparse

load_dotenv()

# Configuration from environment variables
MAX_CONCURRENT_REQUESTS = int(os.getenv('MAX_CONCURRENT_REQUESTS', '50'))
WEBHOOK_URL = os.getenv('WEBHOOK_URL', '')
API_KEY = os.getenv('API_KEY')
AUTO_DELETE_DELAY = int(os.getenv('AUTO_DELETE_DELAY', '300'))  # 5 minutes default

if not API_KEY:
    raise ValueError("API_KEY must be set in environment variables")

# API Key security
api_key_header = APIKeyHeader(name="api-key", auto_error=True)

async def get_api_key(api_key_header: str = Security(api_key_header)):
    if api_key_header != API_KEY:
        raise HTTPException(
            status_code=403, 
            detail="Invalid API key"
        )
    return api_key_header

# Validate WEBHOOK_URL
if WEBHOOK_URL:
    parsed_url = urlparse(WEBHOOK_URL)
    if not all([parsed_url.scheme, parsed_url.netloc]):
        print(f"Warning: Invalid WEBHOOK_URL format: {WEBHOOK_URL}")

# Initialize FastAPI with connection pooling
app = FastAPI(
    title="TTS API", 
    description="High-performance Text-to-Speech API",
    version="1.0.0",
    dependencies=[Depends(get_api_key)]  # Apply API key check globally
)

# Allow CORS from all approved frontend sources
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:8080",  # Local development
        "https://vocal-craft-orchestrator.vercel.app",  # Production domain
        "https://speechma.com",  # Customer production domain
        "http://speechma.com",  # Customer production domain (http)
        "https://www.speechma.com",  # Customer production www subdomain
        "http://www.speechma.com",  # Customer production www subdomain (http)
        "http://lightgray-ibis-796203.hostingersite.com",  # Testing domain
        "https://lightgray-ibis-796203.hostingersite.com",  # Testing domain (https)
        "*"  # Allow all origins temporarily for debugging
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    max_age=86400  # Cache preflight requests for 24 hours
)

# Initialize job manager with concurrency control and auto-delete delay
job_manager = JobManager(
    max_concurrent=MAX_CONCURRENT_REQUESTS,
    webhook_url=WEBHOOK_URL,
    auto_delete_delay=AUTO_DELETE_DELAY
)

# Initialize router with job manager
initialize_router(job_manager)

# Include the router
app.include_router(router)
