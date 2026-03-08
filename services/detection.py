import asyncio
import httpx
import subprocess
import tempfile
import os
from fastapi import HTTPException
from decouple import config

SIGHTENGINE_API_USER = config("SIGHTENGINE_API_USER", default=None)
SIGHTENGINE_API_SECRET = config("SIGHTENGINE_API_SECRET", default=None)
MOCK_MODE = not SIGHTENGINE_API_USER or not SIGHTENGINE_API_SECRET

MAX_SYNCHRONOUS_DURATION_SECONDS = 60


def get_video_duration(file_bytes: bytes) -> float:
    """Return video duration in seconds using ffprobe.

    If ffprobe is not available or fails, returns 0.0 (graceful fallback).
    """
    with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4") as tmp:
        tmp.write(file_bytes)
        tmp_path = tmp.name

    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v",
                "error",
                "-show_entries",
                "format=duration",
                "-of",
                "default=noprint_wrappers=1:nokey=1",
                tmp_path,
            ],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            timeout=10,
            check=False,
        )
        output = result.stdout.decode().strip()
        try:
            return float(output)
        except Exception:
            return 0.0
    except FileNotFoundError:
        print("[FFPROBE] ffprobe not found, skipping duration check")
        return 0.0
    except Exception as e:
        print(f"[FFPROBE ERROR] {type(e).__name__}: {e}")
        return 0.0
    finally:
        try:
            os.unlink(tmp_path)
        except OSError:
            pass


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

    duration = get_video_duration(file_bytes)
    if duration > MAX_SYNCHRONOUS_DURATION_SECONDS:
        raise HTTPException(
            status_code=400,
            detail=f"Vídeo muito longo ({int(duration)}s). O limite é {MAX_SYNCHRONOUS_DURATION_SECONDS} segundos para análise."
        )

    try:
        async with httpx.AsyncClient(timeout=120) as client:
            response = await client.post(
                "https://api.sightengine.com/1.0/video/check-sync.json",
                data={
                    "models": "genai",
                    "api_user": SIGHTENGINE_API_USER,
                    "api_secret": SIGHTENGINE_API_SECRET,
                },
                files={"media": (filename, file_bytes, "video/mp4")}
            )

            if response.status_code != 200:
                print(f"[SIGHTENGINE ERROR] status={response.status_code} body={response.text}")
                raise httpx.HTTPStatusError(
                    message=f"status {response.status_code}",
                    request=response.request,
                    response=response
                )

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
        raise HTTPException(status_code=504, detail="Timeout na análise do vídeo. Tente um arquivo menor.")
    except httpx.HTTPStatusError as e:
        print(f"[SIGHTENGINE ERROR] status={e.response.status_code} body={e.response.text}")
        raise HTTPException(status_code=502, detail=f"Erro na API de detecção: {e.response.status_code}")
    except Exception as e:
        print(f"[DETECTION ERROR] {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro interno na análise do vídeo.")