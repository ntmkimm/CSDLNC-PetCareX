# app/services/customer_service.py
from __future__ import annotations

from typing import Optional

from fastapi import HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError

from app.services.db_utils import exec_sp


# ============================================================
# KH1 - danh sách gói tiêm
# ============================================================
def kh1_list_packages(db: Session):
    rows = db.execute(
        text("SELECT MaGoi, TenGoi, ThoiGian, KhuyenMai FROM GOITIEMPHONG")
    ).mappings().all()
    return rows


# ============================================================
# KH2 - thú cưng
# ============================================================
def kh2_list_pets(db: Session, ma_kh: str):
    rows = db.execute(
        text("SELECT * FROM THUCUNG WHERE MaKH = :makh"),
        {"makh": ma_kh},
    ).mappings().all()
    return rows


def kh2_create_pet(
    db: Session,
    ma_kh: str,
    ma_thu_cung: str,
    ten: str,
    loai: Optional[str] = None,
    giong: Optional[str] = None,
):
    try:
        db.execute(
            text("""
                INSERT INTO THUCUNG(MaThuCung, MaKH, Ten, Loai, Giong)
                VALUES(:id, :makh, :ten, :loai, :giong)
            """),
            {"id": ma_thu_cung, "makh": ma_kh, "ten": ten, "loai": loai, "giong": giong},
        )
        db.commit()
        return {"ok": True, "MaThuCung": ma_thu_cung}
    except DBAPIError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"DB error: {str(e.orig) if e.orig else str(e)}")


def kh2_delete_pet(db: Session, ma_thu_cung: str, ma_kh: str):
    try:
        res = db.execute(
            text("DELETE FROM THUCUNG WHERE MaThuCung = :id AND MaKH = :makh"),
            {"id": ma_thu_cung, "makh": ma_kh},
        )
        db.commit()
    except DBAPIError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"DB error: {str(e.orig) if e.orig else str(e)}")

    if res.rowcount == 0:
        raise HTTPException(status_code=404, detail="Pet not found")
    return {"ok": True}


# ============================================================
# KH3 - lịch sử tiêm của thú cưng
# ============================================================
def kh3_pet_vaccination_history(db: Session, ma_thu_cung: str, ma_kh: str):
    pet = db.execute(
        text("SELECT 1 FROM THUCUNG WHERE MaThuCung = :id AND MaKH = :makh"),
        {"id": ma_thu_cung, "makh": ma_kh},
    ).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")

    rows = db.execute(
        text("""
            SELECT tp.MaPhien, tp.MaVC, vc.TenVC, tp.NgayTiem, tp.SoLieu, tp.MaGoi
            FROM PHIENDICHVU pd
            JOIN TIEMPHONG tp ON tp.MaPhien = pd.MaPhien
            JOIN VACCINE vc ON vc.MaVC = tp.MaVC
            WHERE pd.MaThuCung = :pet
            ORDER BY tp.NgayTiem DESC
        """),
        {"pet": ma_thu_cung},
    ).mappings().all()
    return rows


# ============================================================
# KH6 - đặt dịch vụ (tạo HOADON + PHIENDICHVU) -> dùng SP cho đúng nghiệp vụ
# ============================================================
def kh6_create_appointment(
    db: Session,
    ma_kh: str,
    ma_hoa_don: str,
    nhan_vien_lap: str,
    ma_phien: str,
    ma_thu_cung: str,
    ma_dv: str,
    gia_tien: float,
    hinh_thuc_thanh_toan: str,
):
    # ensure pet belongs to customer
    pet = db.execute(
        text("SELECT 1 FROM THUCUNG WHERE MaThuCung = :id AND MaKH = :makh"),
        {"id": ma_thu_cung, "makh": ma_kh},
    ).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")

    # 1) tạo hóa đơn bằng SP
    exec_sp(
        db,
        "EXEC dbo.sp_TaoHoaDon "
        "@MaHoaDon=:hd, @NhanVienLap=:nv, @MaKH=:kh, @HinhThucThanhToan=:httt, @KhuyenMai=:km",
        {"hd": ma_hoa_don, "nv": nhan_vien_lap, "kh": ma_kh, "httt": hinh_thuc_thanh_toan, "km": 0},
        commit=False,  # gom 2 bước vào 1 transaction
    )

    # 2) tạo phiên dịch vụ bằng SP
    exec_sp(
        db,
        "EXEC dbo.sp_ThemPhienDichVu "
        "@MaPhien=:ph, @MaHoaDon=:hd, @MaThuCung=:pet, @MaDV=:dv, @GiaTien=:gia",
        {"ph": ma_phien, "hd": ma_hoa_don, "pet": ma_thu_cung, "dv": ma_dv, "gia": gia_tien},
        commit=False,
    )

    # commit chung
    try:
        db.commit()
    except DBAPIError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"DB error: {str(e.orig) if e.orig else str(e)}")

    return {"ok": True, "MaHoaDon": ma_hoa_don, "MaPhien": ma_phien}


# ============================================================
# KH4 - mua sản phẩm / mua gói (gọi SP)
# ============================================================
def kh4_buy_product(db: Session, ma_phien: str, ma_sp: str, so_luong: int):
    exec_sp(
        db,
        "EXEC dbo.sp_MuaHang @MaPhien=:p, @MaSP=:sp, @SoLuong=:sl",
        {"p": ma_phien, "sp": ma_sp, "sl": so_luong},
    )
    return {"ok": True}


def kh4_buy_package(db: Session, ma_kh: str, ma_hoa_don: str, ma_goi: str):
    ok = db.execute(
        text("SELECT 1 FROM HOADON WHERE MaHoaDon = :hd AND MaKH = :kh"),
        {"hd": ma_hoa_don, "kh": ma_kh},
    ).first()
    if not ok:
        raise HTTPException(status_code=404, detail="Invoice not found")

    exec_sp(
        db,
        "EXEC dbo.sp_MuaGoiTiemPhong @MaHoaDon=:hd, @MaGoi=:goi",
        {"hd": ma_hoa_don, "goi": ma_goi},
    )
    return {"ok": True}


# ============================================================
# KH5 - loyalty
# ============================================================
def kh5_my_loyalty(db: Session, ma_kh: str):
    row = db.execute(
        text("SELECT MaKH, Hoten, Bac, Tichluy FROM KHACHHANG WHERE MaKH = :kh"),
        {"kh": ma_kh},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Customer not found")
    return row


# ============================================================
# KH7 - đánh giá hoá đơn
# ============================================================
def kh7_review_invoice(
    db: Session,
    ma_hoa_don: str,
    ma_kh: str,
    diem_dv: int,
    muc_do_hailong: int,
    thai_do_nhanvien: Optional[str] = None,
    binh_luan: Optional[str] = None,
):
    try:
        db.execute(
            text("""
                MERGE NHANXET AS t
                USING (SELECT :kh AS MaKH, :hd AS MaHoaDon) AS s
                ON (t.MaKH = s.MaKH AND t.MaHoaDon = s.MaHoaDon)
                WHEN MATCHED THEN UPDATE SET
                    DiemDV = :diem, Mucdohailong = :hl, Thaidonhanvien = :td, Binhluan = :bl
                WHEN NOT MATCHED THEN INSERT(MaKH, MaHoaDon, DiemDV, Mucdohailong, Thaidonhanvien, Binhluan)
                    VALUES(:kh, :hd, :diem, :hl, :td, :bl);
            """),
            {"kh": ma_kh, "hd": ma_hoa_don, "diem": diem_dv, "hl": muc_do_hailong, "td": thai_do_nhanvien, "bl": binh_luan},
        )
        db.commit()
        return {"ok": True}
    except DBAPIError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=f"DB error: {str(e.orig) if e.orig else str(e)}")
