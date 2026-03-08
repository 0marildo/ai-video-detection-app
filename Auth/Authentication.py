import jwt
from fastapi import HTTPException, Security
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from decouple import config
import bcrypt
from datetime import datetime, timedelta, timezone

SECRET_KEY = config("SECRET_KEY")
ALGORITHM = "HS256"

def create_jwt_token(user_id: str):
    experation = datetime.now(timezone.utc) + timedelta(minutes=60)
    payload = {"sub": user_id, "exp": experation}
    token = jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)
    
    return token

def decode_jwt_token(token: str):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get("sub")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=403, detail="Token Experied")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
    
oauth2_scheme = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials =Security(oauth2_scheme)):
    token = credentials.credentials
    user_id = decode_jwt_token(token)
    if user_id is None:
        raise HTTPException(status_code=401, detail="Could not validade credentials")
    return user_id

def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8")
    )
