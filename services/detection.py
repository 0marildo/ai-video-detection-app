import asyncio
import random
from decouple import config

API_KEY = config("TRUTH_SCAN_API_KEY", default = None)
MOCK_MODE = API_KEY is None

async def submit_video(file_bytes: bytes, filename: str) -> str:
    if MOCK_MODE:
        return f"mock-id-{random.randint(10000, 99999)}"

    import httpx
    async with httpx.AsyncClient() as client:
        response = await client.post(
        "https://detect-video.truthscan.com/detect-file",
        headers={"key": API_KEY},
        files={"file": (filename, file_bytes, "video/mp4")}
        )
        response.raise_for_status()
        return response.json()["id"]

async def query_response(job_id: str) -> dict:
    if MOCK_MODE:
        await asyncio.sleep(2)
        score = round(random.uniform(0.0, 1.0), 3)
        return {
            "status": "done",
            "result": score,
            "label": "ai generated" if score>= 0.5 else "human"
        }
    import httpx
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://detect-video.truthscan.com/query",
            json={"id": job_id}
        )
        response.raise_for_status()
        data = response.json()
        return {
            "status": data["status"],
            "result": data.get("result", 0),
            "label": "ai_generated" if data.get("result", 0) >= 0.5 else "human"
        }