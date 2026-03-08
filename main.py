from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from api.api import router
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError


limiter = Limiter(key_func=get_remote_address)

app = FastAPI(title="AI Video Detector", version="1.0.0")

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

@app.exception_handler(RequestValidationError)
async def validation_exception_hadler(request: Request, exc: RequestValidationError):
    return JSONResponse(
        status_code=422,
        content={"detail": "Erro de validação nos dados enviados"}
    )

@app.exception_handler(Exception)
async def geral_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={"detail": "Erro interno do servidor"}
    )

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "https://ai-video-detection-omtcu1yae-0marildos-projects.vercel.app",
        "https://ai-video-detection-app.vercel.app"
    ],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=True,
)

app.include_router(router)

@app.get("/health")
@limiter.limit("60/minute")
async def health(request: Request):
    return {"status": "ok"}