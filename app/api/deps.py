# app/api/deps.py
from typing import Generator, Optional, Dict, Any
from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.db.session import SessionLocal
from app.core.config import settings

def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def decode_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALG])
        return payload
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

def require_role(*roles: str):
    """
    Usage: current = Depends(require_role("customer", "staff"))
    Token payload expected: {"sub": "...", "role": "...", ...}
    """
    from fastapi.security import OAuth2PasswordBearer
    oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

    def _dep(token: str = Depends(oauth2_scheme)) -> Dict[str, Any]:
        payload = decode_token(token)
        role = payload.get("role")
        if role not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Forbidden")
        return payload

    return _dep
