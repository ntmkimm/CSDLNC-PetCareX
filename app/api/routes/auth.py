# app/api/routes/auth.py
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import text
from jose import jwt
from passlib.context import CryptContext

from app.api.deps import get_db
from app.core.config import settings
import uuid

router = APIRouter()
# pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def create_access_token(payload: dict, expires_minutes: int = 60) -> str:
    to_encode = payload.copy()
    expire = datetime.utcnow() + timedelta(minutes=expires_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.JWT_SECRET, algorithm=settings.JWT_ALG)

@router.post("/login")
def login(username: str, password: str, db: Session = Depends(get_db)):
    """
    DEMO customer login:
    - username = TAIKHOAN_MATKHAU.Tendangnhap
    - password = so khớp trực tiếp với Matkhau (plain)
    """
    row = db.execute(
        text("""
            SELECT tk.MaKH, tk.Matkhau
            FROM TAIKHOAN_MATKHAU tk
            WHERE tk.Tendangnhap = :u
        """),
        {"u": username},
    ).mappings().first()

    # so khớp trực tiếp
    if not row or (row["Matkhau"] is None) or (password != row["Matkhau"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bad credentials")

    token = create_access_token(
        {"sub": row["MaKH"], "role": "customer"},
        expires_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
    )
    return {"access_token": token, "token_type": "bearer"}

@router.post("/staff-login")
def staff_login(ma_nv: str, password: str, db: Session = Depends(get_db)):
    """
    Minimal staff login stub.
    Khuyến nghị: tạo bảng TAIKHOAN_NHANVIEN sau.
    Tạm thời: password == 'admin' cho demo, và role dựa theo ChucVu.
    """
    nv = db.execute(
        text("SELECT MaNV, ChucVu, MaCN FROM NHANVIEN WHERE MaNV = :id"),
        {"id": ma_nv},
    ).mappings().first()

    if not nv or password != "admin":
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Bad credentials")

    role = "staff"
    if nv["ChucVu"] == "Quản lí":
        role = "branch_manager"

    token = create_access_token(
        {"sub": nv["MaNV"], "role": role, "maCN": nv["MaCN"], "chucvu": nv["ChucVu"]},
        expires_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
    )
    return {"access_token": token, "token_type": "bearer"}
