# app/services/company_service.py
from sqlalchemy.orm import Session
from sqlalchemy import text


def revenue_by_branch(db: Session):
    rows = db.execute(
        text("""
            SELECT nv.MaCN, SUM(h.TongTien) AS DoanhThu
            FROM HOADON h
            JOIN NHANVIEN nv ON nv.MaNV = h.NhanVienLap
            GROUP BY nv.MaCN
            ORDER BY DoanhThu DESC
        """)
    ).mappings().all()
    return rows


def revenue_total(db: Session):
    row = db.execute(
        text("SELECT COALESCE(SUM(TongTien), 0) AS TongDoanhThu FROM HOADON")
    ).mappings().first()
    return row


def top_services(db: Session, months: int = 6):
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
    return rows


def membership_stats(db: Session):
    rows = db.execute(
        text("""
            SELECT Bac, COUNT(*) AS SoLuong
            FROM KHACHHANG
            GROUP BY Bac
            ORDER BY SoLuong DESC
        """)
    ).mappings().all()
    return rows


def customers_by_branch(db: Session):
    rows = db.execute(
        text("""
            SELECT nv.MaCN, COUNT(DISTINCT h.MaKH) AS SoKhach
            FROM HOADON h
            JOIN NHANVIEN nv ON nv.MaNV = h.NhanVienLap
            GROUP BY nv.MaCN
            ORDER BY SoKhach DESC
        """)
    ).mappings().all()
    return rows


def pets_stats(db: Session):
    rows = db.execute(
        text("""
            SELECT Loai, COUNT(*) AS SoLuong
            FROM THUCUNG
            GROUP BY Loai
            ORDER BY SoLuong DESC
        """)
    ).mappings().all()
    return rows
