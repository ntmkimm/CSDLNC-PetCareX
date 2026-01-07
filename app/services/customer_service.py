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


def kh2_create_pet(db: Session, ma_kh: str, ten: str, loai=None, giong=None):
    try:
        row = db.execute(
            text("""
                INSERT INTO THUCUNG (MaKH, Ten, Loai, Giong)
                OUTPUT INSERTED.MaThuCung
                VALUES (:makh, :ten, :loai, :giong)
            """),
            {"makh": ma_kh, "ten": ten, "loai": loai, "giong": giong},
        ).scalar_one()
        db.commit()
        return {"ok": True, "MaThuCung": row}

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


def kh8_search_products(db: Session, keyword: str | None, loai: str | None):
    rows = db.execute(
        text("""
            SELECT MaSP, TenSP, LoaiSP, DonGia
            FROM SANPHAM
            WHERE (:kw IS NULL OR TenSP LIKE N'%' + :kw + N'%')
              AND (:loai IS NULL OR LoaiSP = :loai)
        """),
        {"kw": keyword, "loai": loai},
    ).mappings().all()
    return rows


def kh10_pet_medical_history(db: Session, ma_thu_cung: str, ma_kh: str):
    ok = db.execute(
        text("SELECT 1 FROM THUCUNG WHERE MaThuCung=:tc AND MaKH=:kh"),
        {"tc": ma_thu_cung, "kh": ma_kh},
    ).first()
    if not ok:
        raise HTTPException(status_code=404, detail="Pet not found")

    rows = db.execute(
        text("""
            SELECT hd.NgayLap, dv.TenDV,
                   kb.ChanDoan, kb.CacTrieuChung, kb.NgayTaiKham
            FROM PHIENDICHVU pd
            JOIN HOADON hd ON hd.MaHoaDon = pd.MaHoaDon
            JOIN DICHVU dv ON dv.MaDV = pd.MaDV
            JOIN KHAMBENH kb ON kb.MaPhien = pd.MaPhien
            WHERE pd.MaThuCung = :pet
            ORDER BY hd.NgayLap DESC
        """),
        {"pet": ma_thu_cung},
    ).mappings().all()
    return rows


def kh11_purchase_history(db: Session, ma_kh: str):
    rows = db.execute(
        text("""
            SELECT h.MaHoaDon, h.NgayLap,
                   sp.MaSP, sp.TenSP,
                   mh.SoLuong, sp.DonGia,
                   (mh.SoLuong * sp.DonGia) AS ThanhTien
            FROM HOADON h
            JOIN PHIENDICHVU pd ON h.MaHoaDon = pd.MaHoaDon
            JOIN MUAHANG mh ON pd.MaPhien = mh.MaPhien
            JOIN SANPHAM sp ON mh.MaSP = sp.MaSP
            WHERE h.MaKH = :kh
            ORDER BY h.NgayLap DESC
        """),
        {"kh": ma_kh},
    ).mappings().all()
    return rows


def kh12_invoice_detail(db: Session, ma_hoa_don: str, ma_kh: str):
    header = db.execute(
        text("""
            SELECT MaHoaDon, NgayLap, TongTien, KhuyenMai, HinhThucThanhToan
            FROM HOADON
            WHERE MaHoaDon = :hd AND MaKH = :kh
        """),
        {"hd": ma_hoa_don, "kh": ma_kh},
    ).mappings().first()

    if not header:
        raise HTTPException(status_code=404, detail="Invoice not found")

    items = db.execute(
        text("""
            SELECT dv.TenDV, pd.GiaTien
            FROM PHIENDICHVU pd
            JOIN DICHVU dv ON pd.MaDV = dv.MaDV
            WHERE pd.MaHoaDon = :hd
        """),
        {"hd": ma_hoa_don},
    ).mappings().all()

    return {"header": header, "items": items}


def kh13_list_services(db: Session):
    return db.execute(
        text("SELECT MaDV, TenDV FROM DICHVU")
    ).mappings().all()


def kh14_my_appointments(db: Session, ma_kh: str):
    rows = db.execute(
        text("""
            SELECT h.MaHoaDon, h.NgayLap,
                   tc.MaThuCung, tc.Ten AS TenThuCung,
                   dv.TenDV, pd.GiaTien
            FROM HOADON h
            JOIN PHIENDICHVU pd ON h.MaHoaDon = pd.MaHoaDon
            JOIN THUCUNG tc ON pd.MaThuCung = tc.MaThuCung
            JOIN DICHVU dv ON pd.MaDV = dv.MaDV
            WHERE h.MaKH = :kh
            ORDER BY h.NgayLap DESC
        """),
        {"kh": ma_kh},
    ).mappings().all()
    return rows


def kh15_cancel_appointment(db: Session, ma_phien: str, ma_kh: str):
    res = db.execute(
        text("""
            UPDATE pd
            SET TrangThai = N'CANCELLED'
            FROM PHIENDICHVU pd
            JOIN THUCUNG tc ON pd.MaThuCung = tc.MaThuCung
            WHERE pd.MaPhien = :ph
              AND tc.MaKH = :kh
              AND pd.TrangThai = N'BOOKING'
        """),
        {"ph": ma_phien, "kh": ma_kh},
    )
    db.commit()

    if res.rowcount == 0:
        raise HTTPException(status_code=400, detail="Cannot cancel this appointment")

    return {"ok": True}


def kh16_create_booking(
    db: Session,
    ma_kh: str,
    ma_thu_cung: str,
    ma_dv: str,
):
    # check pet ownership
    ok = db.execute(
        text("SELECT 1 FROM THUCUNG WHERE MaThuCung=:tc AND MaKH=:kh"),
        {"tc": ma_thu_cung, "kh": ma_kh},
    ).first()
    if not ok:
        raise HTTPException(status_code=404, detail="Pet not found")

    # 🔥 lấy giá dịch vụ
    gia = db.execute(
        text("SELECT DonGia FROM DICHVU WHERE MaDV = :dv"),
        {"dv": ma_dv},
    ).scalar()

    if gia is None:
        raise HTTPException(status_code=400, detail="Service price not found")

    # SQL sửa lại để tương thích với Trigger và tránh đóng Result Set sớm
    query = text("""
        SET NOCOUNT ON; -- Quan trọng 1: Chặn tin nhắn phụ từ Trigger
        
        -- Khai báo biến bảng để hứng kết quả
        DECLARE @TempOutput TABLE (NewMaPhien VARCHAR(10));

        INSERT INTO PHIENDICHVU (MaThuCung, MaDV, GiaTien, TrangThai)
        OUTPUT INSERTED.MaPhien INTO @TempOutput -- Quan trọng 2: OUTPUT vào biến (bắt buộc khi có Trigger)
        VALUES (:tc, :dv, :gia, N'BOOKING');

        -- Trả về giá trị từ biến bảng
        SELECT NewMaPhien FROM @TempOutput;
    """)

    try:
        # Thực thi và lấy kết quả duy nhất
        result = db.execute(
            query,
            {"tc": ma_thu_cung, "dv": ma_dv, "gia": gia},
        )
        
        # Lấy giá trị MaPhien
        ma_phien = result.scalar()

        db.commit()
        return {"ok": True, "MaPhien": ma_phien}
    except Exception as e:
        db.rollback()
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))



def kh17_my_bookings(db: Session, ma_kh: str):
    return db.execute(
        text("""
            SELECT 
                pd.MaPhien,
                pd.TrangThai,
                pd.GiaTien,
                tc.Ten AS TenThuCung,
                dv.TenDV
            FROM PHIENDICHVU pd
            JOIN THUCUNG tc ON pd.MaThuCung = tc.MaThuCung
            JOIN DICHVU dv ON pd.MaDV = dv.MaDV
            WHERE tc.MaKH = :kh
              AND pd.TrangThai = N'BOOKING'
            ORDER BY pd.MaPhien DESC
        """),
        {"kh": ma_kh},
    ).mappings().all()
    
def kh18_confirm_booking(
    db: Session,
    ma_phien: str,
    hinh_thuc_thanh_toan: str,
):
    try:
        exec_sp(
            db,
            "EXEC dbo.sp_ConfirmPhienDichVu "
            "@MaPhien=:ph, @NhanVienLap=:nv, @HinhThucTT=:httt, @KhuyenMai=:km",
            {
                "ph": ma_phien,
                "nv": None,  # 👈 web payment
                "httt": hinh_thuc_thanh_toan,
                "km": 0,
            },
        )
        return {"ok": True}
    except DBAPIError as e:
        raise HTTPException(status_code=400, detail=str(e.orig))


