# app/api/routes/branch.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.api.deps import get_db, require_role

router = APIRouter()

@router.get("/{ma_cn}/revenue")  # CN1
def revenue(ma_cn: str, granularity: str = "day", db: Session = Depends(get_db), token=Depends(require_role("branch_manager"))):
    # branch_manager chỉ xem chi nhánh mình
    if token.get("maCN") != ma_cn:
        return {"items": []}

    if granularity == "month":
        group_expr = "FORMAT(h.NgayLap, 'yyyy-MM')"
    elif granularity == "year":
        group_expr = "FORMAT(h.NgayLap, 'yyyy')"
    else:
        group_expr = "CAST(h.NgayLap AS DATE)"

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
    return {"items": rows}

@router.get("/{ma_cn}/inventory/products")  # CN3 (sản phẩm)
def inv_products(ma_cn: str, db: Session = Depends(get_db), token=Depends(require_role("branch_manager"))):
    if token.get("maCN") != ma_cn:
        return {"items": []}
    rows = db.execute(
        text("""
            SELECT csp.MaSP, sp.TenSP, sp.LoaiSP, csp.SoLuongTonKho
            FROM CHINHANH_SANPHAM csp
            JOIN SANPHAM sp ON sp.MaSP = csp.MaSP
            WHERE csp.MaCN = :cn
        """),
        {"cn": ma_cn},
    ).mappings().all()
    return {"items": rows}

@router.get("/{ma_cn}/inventory/vaccines")  # CN3 (vaccine)
def inv_vaccines(ma_cn: str, db: Session = Depends(get_db), token=Depends(require_role("branch_manager"))):
    if token.get("maCN") != ma_cn:
        return {"items": []}
    rows = db.execute(
        text("""
            SELECT cv.MaVC, v.TenVC, cv.SoLuongTonKho
            FROM CHINHANH_VACCINE cv
            JOIN VACCINE v ON v.MaVC = cv.MaVC
            WHERE cv.MaCN = :cn
        """),
        {"cn": ma_cn},
    ).mappings().all()
    return {"items": rows}

@router.get("/{ma_cn}/vaccinations")  # CN9 (danh sách tiêm trong kỳ)
def vaccinations_in_range(ma_cn: str, from_date: str, to_date: str, db: Session = Depends(get_db), token=Depends(require_role("branch_manager"))):
    if token.get("maCN") != ma_cn:
        return {"items": []}
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
    return {"items": rows}

# Các CN2, CN4, CN5, CN6, CN7, CN8 bạn có thể mở rộng tương tự:
# - vaccines/top-used
# - staff/performance
# - packages/stats
# - pets/{id}/history
# - staff CRUD
# - customers/stats
