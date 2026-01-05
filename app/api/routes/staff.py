# app/api/routes/staff.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.api.deps import get_db  # bỏ require_role

router = APIRouter()

@router.post("/invoices")  # NV1
def create_invoice(
    ma_hoa_don: str,
    ma_kh: str,
    hinh_thuc: str,
    ma_nv: str,  # tạm thời truyền từ client
    db: Session = Depends(get_db),
):
    # Trigger trg_HOADON_NhanVienLap_BanHang sẽ chặn nếu ma_nv không phải NV bán hàng
    db.execute(
        text("""
            INSERT INTO HOADON(MaHoaDon, NhanVienLap, MaKH, HinhThucThanhToan, KhuyenMai, TongTien)
            VALUES(:hd, :nv, :kh, :ht, 0, 0)
        """),
        {"hd": ma_hoa_don, "nv": ma_nv, "kh": ma_kh, "ht": hinh_thuc},
    )
    db.commit()
    return {"ok": True, "MaHoaDon": ma_hoa_don}


@router.get("/vaccines")  # NV2
def list_vaccines(db: Session = Depends(get_db)):
    rows = db.execute(text("SELECT * FROM VACCINE")).mappings().all()
    return {"items": rows}


@router.get("/reports/revenue/daily")  # NV3
def revenue_daily(date: str, ma_cn: str, db: Session = Depends(get_db)):
    # date: 'YYYY-MM-DD'
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
    return {"items": rows}


@router.get("/schedule/vaccinations")  # NV4
def vaccinations_today(date: str, ma_cn: str, db: Session = Depends(get_db)):
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
    return {"items": rows}


@router.get("/schedule/exams")  # NV5
def exams_today(date: str, ma_cn: str, db: Session = Depends(get_db)):
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
    return {"items": rows}


@router.get("/invoices")  # NV6
def search_invoices(from_date: str, to_date: str, ma_cn: str, ma_kh: str = None, db: Session = Depends(get_db)):
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
    return {"items": rows}


@router.get("/inventory")  # NV7
def inventory(ma_cn: str, db: Session = Depends(get_db)):
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


@router.post("/inventory/products/import")  # NV8
def import_product_stock(ma_cn: str, ma_sp: str, so_luong: int, db: Session = Depends(get_db)):
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
