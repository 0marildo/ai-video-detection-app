import uuid
from sqlalchemy import Column, String, Boolean, DateTime, Float, Enum, Text, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from DB.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    is_active = Column(Boolean, default=True)

class Analysis(Base):
    __tablename__ = "analyses"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    source_type = Column(Enum("url", "upload", name="source_type_enum"), nullable=False)
    source_value = Column(Text, nullable=False)
    status = Column(
        Enum("pending", "done", "failed", name="analysis_status_enum"),
        nullable=False,
        default="pending",
        server_default="pending"
    )
    media_id = Column(String(255), nullable=True, unique=True)
    ai_score = Column(Float, nullable=True)
    result = Column(Enum("ai_generated", "human", "uncertain", name="result_enum"), nullable=True)
    breakdown = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class RefreshToken(Base):
    __tablename__ = "refresh_tokens"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    token_hash = Column(String(255), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    revoked = Column(Boolean, default=False)

