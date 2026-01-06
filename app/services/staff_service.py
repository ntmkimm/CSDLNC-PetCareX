# app/services/staff_service.py
from __future__ import annotations

from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from app.services.db_utils import exec_sp


# ============================================================
# OPS / COMMANDS (nghiệp vụ) - gọi Stored Procedure
# ============================================================

def tao_hoa_don(
    db: Session,
    ma_hoa_don: str,
    nhan_vien_lap: str,
    ma_kh: str,
    hinh_thuc_thanh_toan: str,
    khuyen_mai: float = 0,
) -> None:
    exec_sp(
        db,
        "EXEC dbo.sp_TaoHoaDon "
        "@MaHoaDon=:mahd, @NhanVienLap=:nvl, @MaKH=:makh, "
        "@HinhThucThanhToan=:httt, @KhuyenMai=:km",
        {"mahd": ma_hoa_don, "nvl": nhan_vien_lap, "makh": ma_kh, "httt": hinh_thuc_thanh_toan, "km": khuyen_mai},
    )


def them_phien_dich_vu(
    db: Session,
    ma_phien: str,
    ma_hoa_don: str,
    ma_thu_cung: str,
    ma_dv: str,
    gia_tien: float,
) -> None:
    exec_sp(
        db,
        "EXEC dbo.sp_ThemPhienDichVu "
        "@MaPhien=:mp, @MaHoaDon=:mahd, @MaThuCung=:mtc, @MaDV=:madv, @GiaTien=:gt",
        {"mp": ma_phien, "mahd": ma_hoa_don, "mtc": ma_thu_cung, "madv": ma_dv, "gt": gia_tien},
    )


def ke_thuoc(db: Session, ma_phien: str, ma_thuoc: str, so_luong: int) -> None:
    exec_sp(
        db,
        "EXEC dbo.sp_KeThuoc @MaPhien=:mp, @MaThuoc=:mt, @SoLuong=:sl",
        {"mp": ma_phien, "mt": ma_thuoc, "sl": so_luong},
    )


def mua_hang(db: Session, ma_phien: str, ma_sp: str, so_luong: int) -> None:
    exec_sp(
        db,
        "EXEC dbo.sp_MuaHang @MaPhien=:mp, @MaSP=:msp, @SoLuong=:sl",
        {"mp": ma_phien, "msp": ma_sp, "sl": so_luong},
    )


def mua_goi_tiem_phong(db: Session, ma_hoa_don: str, ma_goi: str) -> None:
    exec_sp(
        db,
        "EXEC dbo.sp_MuaGoiTiemPhong @MaHoaDon=:mahd, @MaGoi=:mg",
        {"mahd": ma_hoa_don, "mg": ma_goi},
    )


def tiem_phong(
    db: Session,
    ma_phien: str,
    ma_vc: str,
    bac_si_phu_trach: str,
    ngay_tiem: str,  # 'YYYY-MM-DD'
    so_lieu: float,
    ma_goi: str | None = None,
) -> None:
    exec_sp(
        db,
        "EXEC dbo.sp_TiemPhong "
        "@MaPhien=:mp, @MaVC=:mvc, @MaGoi=:mg, @BacSiPhuTrach=:bs, "
        "@NgayTiem=:nt, @SoLieu=:sl",
        {"mp": ma_phien, "mvc": ma_vc, "mg": ma_goi, "bs": bac_si_phu_trach, "nt": ngay_tiem, "sl": so_lieu},
    )


# ============================================================
# API USE-CASES cho STAFF (NV1–NV8) - route gọi thẳng hàm này
# (Không require_role)
# ============================================================

# NV1
def nv1_create_invoice(db: Session, ma_hoa_don: str, ma_kh: str, hinh_thuc: str, ma_nv: str):
    # dùng SP để đảm bảo TongTien luôn đúng (Recalc) + trigger/ràng buộc vẫn chạy
    tao_hoa_don(db, ma_hoa_don, ma_nv, ma_kh, hinh_thuc, khuyen_mai=0)
    return {"ok": True, "MaHoaDon": ma_hoa_don}


# NV2
def nv2_list_vaccines(db: Session):
    rows = db.execute(text("SELECT * FROM VACCINE")).mappings().all()
    return rows


# NV3
def nv3_revenue_daily(db: Session, date: str, ma_cn: str):
    rows = db.execute(
        text("""
            SELECT CAST(h.NgayLap AS DATE) AS Ngay, SUM(h.TongTien) AS DoanhThu
            FROM HOADON h
            JOIN NHANVIEN nv ON nv.MaNV = h.NhanVienLap
            WHERE nv.MaCN = :cn AND CAST(h.NgayLap AS DATE) = :d
            GROUP BY CAST(h.NgayLap AS DATE)
        """),
        {"cn": ma_cn, "d": date},
    ).mappings().all()
    return rows


# NV4
def nv4_vaccinations_on_date(db: Session, date: str, ma_cn: str):
    rows = db.execute(
        text("""
            SELECT tp.MaPhien, tp.NgayTiem, tp.MaVC, vc.TenVC, tp.SoLieu, pd.MaThuCung
            FROM TIEMPHONG tp
            JOIN PHIENDICHVU pd ON pd.MaPhien = tp.MaPhien
            JOIN HOADON h ON h.MaHoaDon = pd.MaHoaDon
            JOIN NHANVIEN nv ON nv.MaNV = h.NhanVienLap
            JOIN VACCINE vc ON vc.MaVC = tp.MaVC
            WHERE nv.MaCN = :cn AND tp.NgayTiem = :d
            ORDER BY tp.NgayTiem
        """),
        {"cn": ma_cn, "d": date},
    ).mappings().all()
    return rows


# NV5
def nv5_exams_on_date(db: Session, date: str, ma_cn: str):
    rows = db.execute(
        text("""
            SELECT kb.MaPhien, pd.MaThuCung, kb.BacSiPhuTrach, kb.ChanDoan, kb.NgayTaiKham
            FROM KHAMBENH kb
            JOIN PHIENDICHVU pd ON pd.MaPhien = kb.MaPhien
            JOIN HOADON h ON h.MaHoaDon = pd.MaHoaDon
            JOIN NHANVIEN nv ON nv.MaNV = h.NhanVienLap
            WHERE nv.MaCN = :cn AND CAST(h.NgayLap AS DATE) = :d
            ORDER BY kb.MaPhien
        """),
        {"cn": ma_cn, "d": date},
    ).mappings().all()
    return rows


# NV6
def nv6_search_invoices(
    db: Session,
    from_date: str,
    to_date: str,
    ma_cn: str,
    ma_kh: Optional[str] = None,
):
    q = """
        SELECT h.*
        FROM HOADON h
        JOIN NHANVIEN nv ON nv.MaNV = h.NhanVienLap
        WHERE nv.MaCN = :cn
          AND CAST(h.NgayLap AS DATE) BETWEEN :f AND :t
    """
    params = {"cn": ma_cn, "f": from_date, "t": to_date}
    if ma_kh:
        q += " AND h.MaKH = :kh"
        params["kh"] = ma_kh

    rows = db.execute(text(q), params).mappings().all()
    return rows


# NV7
def nv7_inventory(db: Session, ma_cn: str):
    sp = db.execute(
        text("""
            SELECT csp.MaSP, sp.TenSP, sp.LoaiSP, sp.DonGia, csp.SoLuongTonKho
            FROM CHINHANH_SANPHAM csp
            JOIN SANPHAM sp ON sp.MaSP = csp.MaSP
            WHERE csp.MaCN = :cn
        """),
        {"cn": ma_cn},
    ).mappings().all()

    vc = db.execute(
        text("""
            SELECT cv.MaVC, v.TenVC, v.DonGia, cv.SoLuongTonKho
            FROM CHINHANH_VACCINE cv
            JOIN VACCINE v ON v.MaVC = cv.MaVC
            WHERE cv.MaCN = :cn
        """),
        {"cn": ma_cn},
    ).mappings().all()

    return {"products": sp, "vaccines": vc}


# NV8
def nv8_import_product_stock(db: Session, ma_cn: str, ma_sp: str, so_luong: int):
    if so_luong <= 0:
        raise HTTPException(status_code=400, detail="so_luong must be > 0")

    try:
        db.execute(
            text("""
                MERGE CHINHANH_SANPHAM AS t
                USING (SELECT :cn AS MaCN, :sp AS MaSP) AS s
                ON (t.MaCN = s.MaCN AND t.MaSP = s.MaSP)
                WHEN MATCHED THEN UPDATE SET SoLuongTonKho = t.SoLuongTonKho + :sl
                WHEN NOT MATCHED THEN INSERT(MaCN, MaSP, SoLuongTonKho) VALUES(:cn, :sp, :sl);
            """),
            {"cn": ma_cn, "sp": ma_sp, "sl": so_luong},
        )
        db.commit()
        return {"ok": True}
    except DBAPIError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"DB error: {str(e.orig) if e.orig else str(e)}")
