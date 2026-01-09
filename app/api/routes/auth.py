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
    elif nv["ChucVu"] == "Nhân viên bán hàng":
        role = "sales_staff"
    elif nv["ChucVu"] == "Tiếp tân":
        role = "receptionist_staff"
    elif nv["ChucVu"] == "Bác sĩ thú y":
        role = "veterinarian_staff"

    token = create_access_token(
        {"sub": nv["MaNV"], "role": role, "maCN": nv["MaCN"], "chucvu": nv["ChucVu"]},
        expires_minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES,
    )
    return {"access_token": token, "token_type": "bearer"}


@router.post("/register")
def customer_register(
    username: str, 
    password: str, 
    Hoten: str, 
    CCCD: str, 
    Gioitinh: str, 
    Email: str, 
    SDT: str, 
    db: Session = Depends(get_db)
):
    try:
        # 1. Chèn khách hàng và lấy MaKH vừa sinh ra bằng OUTPUT
        sql_kh = text("""
            INSERT INTO KHACHHANG (Hoten, CCCD, Gioitinh, Email, SDT)
            OUTPUT inserted.MaKH
            VALUES (:hoten, :cccd, :gioitinh, :email, :sdt)
        """)
        
        result = db.execute(sql_kh, {
            "hoten": Hoten,
            "cccd": CCCD,
            "gioitinh": Gioitinh,
            "email": Email,
            "sdt": SDT
        })
        
        # Lấy giá trị MaKH từ kết quả trả về
        row = result.fetchone()
        if not row:
            raise Exception("Không thể tạo MaKH")
        new_ma_kh = row[0]

        # 2. Chèn vào bảng tài khoản mật khẩu
        sql_tk = text("""
            INSERT INTO TAIKHOAN_MATKHAU (MaKH, Tendangnhap, Matkhau)
            VALUES (:ma_kh, :username, :password)
        """)
        
        db.execute(sql_tk, {
            "ma_kh": new_ma_kh,
            "username": username,
            "password": password
        })

        db.commit()
        return {"status": "success", "ma_kh": new_ma_kh}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))