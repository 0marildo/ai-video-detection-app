import asyncio
import logging

import httpx
from fastapi import HTTPException
from decouple import config

from services.storage import upload_video, delete_video, s3, R2_BUCKET_NAME

logger = logging.getLogger(__name__)

SIGHTENGINE_API_USER = config("SIGHTENGINE_API_USER", default=None)
SIGHTENGINE_API_SECRET = config("SIGHTENGINE_API_SECRET", default=None)
MOCK_MODE = not SIGHTENGINE_API_USER or not SIGHTENGINE_API_SECRET

async def submit_and_query(file_bytes: bytes, filename: str) -> dict:
    if MOCK_MODE:
        await asyncio.sleep(2)
        import random
        score = round(random.uniform(0.0, 1.0), 3)
        return {
            "status": "done",
            "result": score,
            "label": "ai_generated" if score >= 0.5 else "human"
        }

    object_key = None
    try:
        object_key = upload_video(file_bytes, filename)

        presigned_url = s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': R2_BUCKET_NAME, 'Key': object_key},
            ExpiresIn=300
        )
        logger.info("[DETECTION] presigned_url=%s", presigned_url)

        async with httpx.AsyncClient(timeout=60) as client:
            # Sanity check: verify the presigned URL can be fetched before calling SightEngine.
            try:
                head_resp = await client.head(presigned_url, timeout=10)
                if head_resp.status_code != 200:
                    logger.warning(
                        "[DETECTION] presigned URL HEAD returned %s (body=%s)",
                        head_resp.status_code,
                        head_resp.text,
                    )
            except Exception as e:
                logger.warning("[DETECTION] presigned URL HEAD check failed: %s", e)

            response = await client.post(
                "https://api.sightengine.com/1.0/video/check-sync.json",
                data={
                    "stream_url": presigned_url,
                    "models": "genai",
                    "api_user": SIGHTENGINE_API_USER,
                    "api_secret": SIGHTENGINE_API_SECRET,
                }
            )

            try:
                response.raise_for_status()
            except httpx.HTTPStatusError as e:
                body = "<unable to read response body>"
                try:
                    body = e.response.text
                except Exception:
                    pass
                logger.error(
                    "[DETECTION] SightEngine error status=%s body=%s",
                    e.response.status_code if e.response is not None else "?",
                    body,
                )
                raise

            data = response.json()

        frames = data.get("data", {}).get("frames", [])
        if frames:
            scores = [f.get("type", {}).get("ai_generated", 0.0) for f in frames]
            score = sum(scores) / len(scores)
        else:
            score = 0.0

        return {
            "status": "done",
            "result": round(score, 3),
            "label": "ai_generated" if score >= 0.5 else "human"
        }

    except httpx.TimeoutException:
        logger.exception("[DETECTION] Timeout while querying SightEngine")
        raise HTTPException(status_code=504, detail="Timeout na análise do vídeo. Tente um arquivo menor.")
    except httpx.HTTPStatusError as e:
        status_code = e.response.status_code if e.response is not None else "?"
        raise HTTPException(status_code=502, detail=f"Erro na API de detecção: {status_code}")
    except Exception:
        logger.exception("[DETECTION] Unexpected error")
        raise HTTPException(status_code=500, detail="Erro interno na análise do vídeo.")
    finally:
        if object_key:
            delete_video(object_key)
