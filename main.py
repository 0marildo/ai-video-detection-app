from fastapi import FastAPI
from fastapi import APIRouter
from api.api import router
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="AI Video Detector", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins = ("http://localhost:5173","http://127.0.0.1:8000/",),
    allow_methods = ["*"],
    allow_headers = ["*"],
    allow_credentials = True,
)

app.include_router(router)

@app.get("/health")
async def health():
    return {"status": "ok"}
