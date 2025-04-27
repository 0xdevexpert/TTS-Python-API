
import logging
import asyncio
import aiohttp
from .models import JobResult

logger = logging.getLogger(__name__)

async def send_webhook(webhook_url: str, result: JobResult) -> None:
    if not webhook_url:
        return
        
    async with aiohttp.ClientSession() as session:
        try:
            payload = {
                "job_id": result.job_id,
                "status": result.status,
                "timestamp": result.timestamp.isoformat() if result.timestamp else None
            }
            if result.message:
                payload["message"] = result.message
            if result.processing_time:
                payload["processing_time_seconds"] = result.processing_time
                
            # Retry logic for webhook delivery
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    async with session.post(webhook_url, json=payload, timeout=5.0) as resp:
                        if resp.status == 200:
                            logger.info(f"Webhook notification sent for job {result.job_id}")
                            break
                        else:
                            logger.warning(f"Webhook attempt {attempt + 1} failed with status {resp.status}")
                            if attempt == max_retries - 1:
                                logger.error(f"All webhook attempts failed for job {result.job_id}")
                except Exception as e:
                    if attempt == max_retries - 1:
                        raise e
                    await asyncio.sleep(1 * (attempt + 1))  # Exponential backoff
        except Exception as e:
            logger.error(f"Failed to send webhook for job {result.job_id}: {e}")

