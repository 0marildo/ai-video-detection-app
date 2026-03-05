from pydantic import BaseModel, EmailStr
from uuid import UUID
from datetime import datetime

class UserCreate(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: UUID
    email: str
    created_at: datetime
    is_active: bool

    class Config:
        from_attributes = True



class AnalysisCreate(BaseModel):
    source_type: str
    source_value: str

class AnalysisResponse(BaseModel):
    id: UUID
    source_type: str
    source_value: str
    ai_score: float
    result: str
    created_at: datetime

    class Config:
        from_attributes = True

class TokenResponse(BaseModel):
    access_token: str
    refresh_token: str = None
    token_type: str = "bearer"

class RefreshRequest(BaseModel):
    refresh_token: str