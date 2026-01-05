# app/api/routes/company.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.api.deps import get_db  # bỏ require_role

router = APIRouter()

@router.get("/revenue/by-branch")  # CT1
def revenue_by_branch(db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT nv.MaCN, SUM(h.TongTien) AS DoanhThu
            FROM HOADON h
            JOIN NHANVIEN nv ON nv.MaNV = h.NhanVienLap
            GROUP BY nv.MaCN
            ORDER BY DoanhThu DESC
        """)
    ).mappings().all()
    return {"items": rows}

@router.get("/revenue/total")  # CT2
def revenue_total(db: Session = Depends(get_db)):
    row = db.execute(text("SELECT SUM(TongTien) AS TongDoanhThu FROM HOADON")).mappings().first()
    return row or {"TongDoanhThu": 0}

@router.get("/services/top")  # CT3: top dịch vụ (months=6)
def top_services(months: int = 6, db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT TOP 10 pd.MaDV, dv.TenDV, COUNT(*) AS SoLan
            FROM PHIENDICHVU pd
            JOIN DICHVU dv ON dv.MaDV = pd.MaDV
            JOIN HOADON h ON h.MaHoaDon = pd.MaHoaDon
            WHERE h.NgayLap >= DATEADD(MONTH, -:m, GETDATE())
            GROUP BY pd.MaDV, dv.TenDV
            ORDER BY SoLan DESC
        """),
        {"m": months},
    ).mappings().all()
    return {"items": rows}

@router.get("/memberships/stats")  # CT4
def membership_stats(db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT Bac, COUNT(*) AS SoLuong
            FROM KHACHHANG
            GROUP BY Bac
            ORDER BY SoLuong DESC
        """)
    ).mappings().all()
    return {"items": rows}

@router.get("/customers/by-branch")  # CT7
def customers_by_branch(db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT nv.MaCN, COUNT(DISTINCT h.MaKH) AS SoKhach
            FROM HOADON h
            JOIN NHANVIEN nv ON nv.MaNV = h.NhanVienLap
            GROUP BY nv.MaCN
            ORDER BY SoKhach DESC
        """)
    ).mappings().all()
    return {"items": rows}

@router.get("/pets/stats")  # CT8
def pets_stats(db: Session = Depends(get_db)):
    rows = db.execute(
        text("""
            SELECT Loai, COUNT(*) AS SoLuong
            FROM THUCUNG
            GROUP BY Loai
            ORDER BY SoLuong DESC
        """)
    ).mappings().all()
    return {"items": rows}
