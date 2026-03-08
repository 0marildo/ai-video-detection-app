import uuid
import httpx
from fastapi import HTTPException
from decouple import config

SIGHTENGINE_API_USER = config("SIGHTENGINE_API_USER", default=None)
SIGHTENGINE_API_SECRET = config("SIGHTENGINE_API_SECRET", default=None)
MOCK_MODE = not SIGHTENGINE_API_USER or not SIGHTENGINE_API_SECRET

CALLBACK_URL = config(
    "SIGHTENGINE_CALLBACK_URL",
    default="https://ai-video-detection-app-production.up.railway.app/api/v1/callback/sightengine",
)


async def submit_async(file_bytes: bytes, filename: str) -> str:
    if MOCK_MODE:
        return f"mock_media_{uuid.uuid4().hex[:8]}"

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post(
                "https://api.sightengine.com/1.0/video/check.json",
                data={
                    "models": "genai",
                    "api_user": SIGHTENGINE_API_USER,
                    "api_secret": SIGHTENGINE_API_SECRET,
                    "callback_url": CALLBACK_URL,
                },
                files={"media": (filename, file_bytes, "video/mp4")},
            )

            if response.status_code != 200:
                print(f"[SIGHTENGINE ERROR] status={response.status_code} body={response.text}")
                raise HTTPException(status_code=502, detail="Erro ao enviar vídeo para análise.")

            data = response.json()
        media_id = data.get("media", {}).get("id")
        if not media_id:
            raise HTTPException(status_code=502, detail="Resposta inválida da API de detecção.")
        return media_id

    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Timeout na análise do vídeo. Tente um arquivo menor.")
    except httpx.HTTPStatusError as e:
        print(f"[SIGHTENGINE ERROR] status={e.response.status_code} body={e.response.text}")
        raise HTTPException(status_code=502, detail=f"Erro na API de detecção: {e.response.status_code}")
    except Exception as e:
        print(f"[DETECTION ERROR] {type(e).__name__}: {str(e)}")
        raise HTTPException(status_code=500, detail="Erro interno na análise do vídeo.")