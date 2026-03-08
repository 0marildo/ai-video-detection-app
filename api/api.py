from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Request
from sqlalchemy.orm import Session
from DB.database import get_db
from DB import models
from DB.schemas import UserCreate, UserResponse, TokenResponse, AnalysisResponse, RefreshRequest
from Auth.Authentication import hash_password, create_jwt_token, get_current_user, verify_password
from services.detection import submit_and_query
import uuid, hashlib, secrets
from datetime import datetime, timedelta, timezone

router = APIRouter(prefix="/api/v1", tags=["Auth"])


@router.get("/analyses", response_model=list[AnalysisResponse])
async def get_analyses(db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    return db.query(models.Analysis).filter(
        models.Analysis.user_id == uuid.UUID(user_id)
    ).order_by(models.Analysis.created_at.desc()).limit(20).all()


@router.get("/dashboard")
async def get_dashboard(db: Session = Depends(get_db), user_id: str = Depends(get_current_user)):
    uid = uuid.UUID(user_id)
    base = db.query(models.Analysis).filter(models.Analysis.user_id == uid)
    return {
        "total_analyses": int(base.count()),
        "ai_generated": int(base.filter(models.Analysis.result == "ai_generated").count()),
        "human": int(base.filter(models.Analysis.result == "human").count())
    }


@router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.email == user_data.email).first():
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    new_user = models.User(email=user_data.email, password_hash=hash_password(user_data.password))
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user


@router.post("/auth/login", response_model=TokenResponse)
async def login(request: Request, user_data: UserCreate, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == user_data.email).first()
    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")

    raw_refresh = secrets.token_hex(32)
    db.add(models.RefreshToken(
        user_id=user.id,
        token_hash=hashlib.sha256(raw_refresh.encode()).hexdigest(),
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        revoked=False
    ))
    db.commit()
    return {"access_token": create_jwt_token(str(user.id)), "refresh_token": raw_refresh, "token_type": "bearer"}


@router.post("/auth/refresh")
async def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    stored = db.query(models.RefreshToken).filter(
        models.RefreshToken.token_hash == hashlib.sha256(body.refresh_token.encode()).hexdigest(),
        models.RefreshToken.revoked == False
    ).first()
    if not stored:
        raise HTTPException(status_code=401, detail="Refresh token inválido")
    if stored.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Refresh token expirado")
    return {"access_token": create_jwt_token(str(stored.user_id)), "token_type": "bearer"}


@router.post("/auth/logout")
async def logout(body: RefreshRequest, db: Session = Depends(get_db)):
    stored = db.query(models.RefreshToken).filter(
        models.RefreshToken.token_hash == hashlib.sha256(body.refresh_token.encode()).hexdigest()
    ).first()
    if stored:
        stored.revoked = True
        db.commit()
    return {"message": "Logout realizado com sucesso"}


@router.post("/analyze/upload", response_model=AnalysisResponse)
async def analyze_upload(
    request: Request,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)
):
    ALLOWED_TYPES = ["video/mp4", "video/quicktime", "video/avi", "video/mkv", "video/webm"]
    if file.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Formato não suportado. Use MP4, MOV, AVI, MKV ou WebM.")

    file_bytes = await file.read()

    if len(file_bytes) > 100 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Arquivo muito grande. Máximo 100MB.")
    if len(file_bytes) < 1024:
        raise HTTPException(status_code=400, detail="Arquivo muito pequeno. Mínimo 1KB.")

    # Envia os bytes diretamente para o SightEngine (sem passar pelo R2)
    result = await submit_and_query(file_bytes, file.filename)

    analysis = models.Analysis(
        user_id=uuid.UUID(user_id),
        source_type="upload",
        source_value=file.filename,
        ai_score=result["result"],
        result=result["label"],
        breakdown={}
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    return analysis