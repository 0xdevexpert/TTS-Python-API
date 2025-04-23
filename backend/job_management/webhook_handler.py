import logging
import aiohttp
from job_management.models import JobResult

logger = logging.getLogger(__name__)

async def send_webhook(webhook_url: str, result: JobResult) -> None:
    if not webhook_url or webhook_url.startswith("https://your-webhook"):
        return
        
    async with aiohttp.ClientSession() as session:
        try:
            payload = {
                "job_id": result.job_id,
                "status": result.status,
            }
            if result.message:
                payload["message"] = result.message
            if result.processing_time:
                payload["processing_time_seconds"] = result.processing_time
                
            async with session.post(webhook_url, json=payload, timeout=5.0) as resp:
                if resp.status != 200:
                    logger.warning(f"Webhook post returned non-200 status {resp.status}")
                else:
                    logger.info(f"Webhook notified for job {result.job_id}")
        except Exception as e:
            logger.error(f"Failed to send webhook for job {result.job_id}: {e}")
