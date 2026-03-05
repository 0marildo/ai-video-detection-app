from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from DB.database import get_db
from DB import models
from DB.schemas import UserCreate, UserResponse, TokenResponse, AnalysisResponse
from Auth.Authentication import hash_password, create_jwt_token, get_current_user, verify_password
from services.detection import submit_video, query_response
import uuid
import asyncio
import hashlib
from datetime import datetime, timedelta, timezone
from DB.schemas import RefreshRequest


router = APIRouter(prefix="/api/v1", tags=["Auth"])


#função de registro de login
@router.post("/auth/register", response_model=UserResponse)
async def register(user_data: UserCreate, db: Session = Depends(get_db)):
    # Verifica se email já existe
    existing_user = db.query(models.User).filter(
        models.User.email == user_data.email
    ).first()
    
    if existing_user:
        raise HTTPException(status_code=400, detail="Email já cadastrado")
    
    # Cria o usuário com senha hasheada
    new_user = models.User(
        email=user_data.email,
        password_hash=hash_password(user_data.password)
    )
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    return new_user

#função login no post
@router.post("/auth/login", response_model=TokenResponse)
async def login(user_data: UserCreate, db: Session = Depends(get_db)):
    # Busca usuário
    user = db.query(models.User).filter(
        models.User.email == user_data.email
    ).first()

    if not user or not verify_password(user_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Email ou senha incorretos")

    # Gera access token
    access_token = create_jwt_token(str(user.id))

    # Gera refresh token
    import secrets
    raw_refresh = secrets.token_hex(32)
    refresh_hash = hashlib.sha256(raw_refresh.encode()).hexdigest()

    refresh_token = models.RefreshToken(
        user_id=user.id,
        token_hash=refresh_hash,
        expires_at=datetime.now(timezone.utc) + timedelta(days=7),
        revoked=False
    )
    db.add(refresh_token)
    db.commit()

    return {
        "access_token": access_token,
        "refresh_token": raw_refresh,
        "token_type": "bearer"
    }

#atualiza a página
@router.post("/auth/refresh")
async def refresh(body: RefreshRequest, db: Session = Depends(get_db)):
    token_hash = hashlib.sha256(body.refresh_token.encode()).hexdigest()
    
    stored = db.query(models.RefreshToken).filter(
        models.RefreshToken.token_hash == token_hash,
        models.RefreshToken.revoked == False
    ).first()

    if not stored:
        raise HTTPException(status_code=401, detail="Refresh token inválido")

    if stored.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Refresh token expirado")

    new_access_token = create_jwt_token(str(stored.user_id))

    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }

@router.post("/auth/logout")
async def logout(body: RefreshRequest, db: Session = Depends(get_db)):
    token_hash = hashlib.sha256(body.refresh_token.encode()).hexdigest()

    stored = db.query(models.RefreshToken).filter(
        models.RefreshToken.token_hash == token_hash
    ).first()

    if stored:
        stored.revoked = True
        db.commit()

    return {"message": "Logout realizado com sucesso"}


@router.post("/analyze/upload", response_model=AnalysisResponse)
async def analyze_Upload(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user)):
    allowed = ["video/mp4", "video/quicktime", "video/avi", "video/mkv", "video/webm"]
    if file.content_type not in allowed:
        raise HTTPException(status_code=400, detail="Por favor coloque um formato válido de arquivo")
    
    file_bytes = await file.read()
    if len(file_bytes) > 100* 1024**2: 
        raise HTTPException(status_code=400, detail="Coloque um arquivo menor, somente abaixo de 100MB")
    if len(file_bytes) < 1024:
        raise HTTPException(status_code=400, detail="Coloque um arquivo maior, somente maior que 1KB")
    job_id = await submit_video(file_bytes, file.filename)

    max_attempts = 67 # 67676767676767
    for attempt in range(max_attempts):
        result = await query_response(job_id)
        if result["status"] == "done":
            break
        if result["status"] == "failed":
            raise HTTPException(status_code=500, detail="O vídeo não pode ser analisado")
        await asyncio.sleep(3)
    else:
        raise HTTPException(status_code=504, detail="Timeout")
    
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
