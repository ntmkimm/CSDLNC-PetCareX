# app/services/branch_service.py
from sqlalchemy.orm import Session
from sqlalchemy import text


def revenue(db: Session, ma_cn: str, granularity: str = "day"):
    # whitelist chống injection (đừng f-string bừa)
    group_map = {
        "day": "CAST(h.NgayLap AS DATE)",
        "month": "FORMAT(h.NgayLap, 'yyyy-MM')",
        "year": "FORMAT(h.NgayLap, 'yyyy')",
    }
    group_expr = group_map.get(granularity, group_map["day"])

    rows = db.execute(
        text(f"""
            SELECT {group_expr} AS Ky, SUM(h.TongTien) AS DoanhThu
            FROM HOADON h
            JOIN NHANVIEN nv ON nv.MaNV = h.NhanVienLap
            WHERE nv.MaCN = :cn
            GROUP BY {group_expr}
            ORDER BY Ky
        """),
        {"cn": ma_cn},
    ).mappings().all()
    return rows


def inv_products(db: Session, ma_cn: str):
    rows = db.execute(
        text("""
            SELECT csp.MaSP, sp.TenSP, sp.LoaiSP, csp.SoLuongTonKho
            FROM CHINHANH_SANPHAM csp
            JOIN SANPHAM sp ON sp.MaSP = csp.MaSP
            WHERE csp.MaCN = :cn
        """),
        {"cn": ma_cn},
    ).mappings().all()
    return rows


def inv_vaccines(db: Session, ma_cn: str):
    rows = db.execute(
        text("""
            SELECT cv.MaVC, v.TenVC, cv.SoLuongTonKho
            FROM CHINHANH_VACCINE cv
            JOIN VACCINE v ON v.MaVC = cv.MaVC
            WHERE cv.MaCN = :cn
        """),
        {"cn": ma_cn},
    ).mappings().all()
    return rows


def vaccinations_in_range(db: Session, ma_cn: str, from_date: str, to_date: str):
    rows = db.execute(
        text("""
            SELECT tp.NgayTiem, tp.MaVC, vc.TenVC, tp.SoLieu, pd.MaThuCung
            FROM TIEMPHONG tp
            JOIN PHIENDICHVU pd ON pd.MaPhien = tp.MaPhien
            JOIN HOADON h ON h.MaHoaDon = pd.MaHoaDon
            JOIN NHANVIEN nv ON nv.MaNV = h.NhanVienLap
            JOIN VACCINE vc ON vc.MaVC = tp.MaVC
            WHERE nv.MaCN = :cn AND tp.NgayTiem BETWEEN :f AND :t
            ORDER BY tp.NgayTiem
        """),
        {"cn": ma_cn, "f": from_date, "t": to_date},
    ).mappings().all()
    return rows
