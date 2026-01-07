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
            WHERE h.MaKH = :kh AND pd.TrangThai = N'CONFIRMED'
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

def kh16_create_booking(db: Session, ma_kh: str, ma_thu_cung: str, ma_dv: str):
    # ---------------------------------------------------
    # 0. TÌM CHI NHÁNH CUNG CẤP DỊCH VỤ
    # ---------------------------------------------------
    ma_cn = db.execute(
        text("""
            SELECT TOP 1 MaCN
            FROM CUNGCAPDICHVU
            WHERE MaDV = :dv
            ORDER BY MaCN
        """),
        {"dv": ma_dv},
    ).scalar()

    if not ma_cn:
        raise HTTPException(
            status_code=400,
            detail="Dịch vụ này hiện chưa được cung cấp tại bất kỳ chi nhánh nào",
        )

    # ---------------------------------------------------
    # 1. KIỂM TRA THÚ CƯNG THUỘC KHÁCH HÀNG
    # ---------------------------------------------------
    pet = db.execute(
        text("""
            SELECT Ten
            FROM THUCUNG
            WHERE MaThuCung = :tc AND MaKH = :kh
        """),
        {"tc": ma_thu_cung, "kh": ma_kh},
    ).fetchone()

    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")

    # ---------------------------------------------------
    # 2. LẤY GIÁ DỊCH VỤ
    # ---------------------------------------------------
    gia = db.execute(
        text("SELECT DonGia FROM DICHVU WHERE MaDV = :dv"),
        {"dv": ma_dv},
    ).scalar()

    if gia is None:
        raise HTTPException(status_code=400, detail="Service price not found")

    try:
        # ===================================================
        # 3. TÌM HOẶC TẠO HÓA ĐƠN
        # ===================================================
        ma_hd = db.execute(
            text("""
                SET NOCOUNT ON; -- Thêm dòng này
                SELECT TOP 1 h.MaHoaDon
                FROM HOADON h
                JOIN PHIENDICHVU pd ON h.MaHoaDon = pd.MaHoaDon
                WHERE h.MaKH = :kh
                  AND pd.TrangThai = N'BOOKING'
                ORDER BY h.NgayLap DESC
            """),
            {"kh": ma_kh},
        ).scalar()

        if not ma_hd:
            ma_hd = db.execute(
                text("""
                    SET NOCOUNT ON; -- QUAN TRỌNG: Tắt thông báo hàng bị tác động
                    DECLARE @out TABLE (ID VARCHAR(10));

                    INSERT INTO HOADON (MaKH, NgayLap, NhanVienLap, HinhThucThanhToan)
                    OUTPUT INSERTED.MaHoaDon INTO @out
                    VALUES (:kh, GETDATE(), 'NV_SYSTEM', N'Tiền mặt');

                    SELECT ID FROM @out;
                """),
                {"kh": ma_kh},
            ).scalar()

        # ===================================================
        # 4. TẠO PHIÊN DỊCH VỤ
        # ===================================================
        ma_phien = db.execute(
            text("""
                SET NOCOUNT ON; -- QUAN TRỌNG: Tắt thông báo hàng bị tác động
                DECLARE @outPhien TABLE (MaPhien VARCHAR(10));

                INSERT INTO PHIENDICHVU (
                    MaHoaDon, MaThuCung, MaDV, GiaTien,
                    TrangThai, MaCN, ThoiDiemBatDau
                )
                OUTPUT INSERTED.MaPhien INTO @outPhien
                VALUES (
                    :mhd, :tc, :dv, :gia,
                    N'BOOKING', :cn, GETDATE()
                );

                SELECT MaPhien FROM @outPhien;
            """),
            {
                "mhd": ma_hd,
                "tc": ma_thu_cung,
                "dv": ma_dv,
                "gia": gia,
                "cn": ma_cn,
            },
        ).scalar()

        # ===================================================
        # 5. CẬP NHẬT TỔNG TIỀN
        # ===================================================
        db.execute(
            text("""
                SET NOCOUNT ON;
                UPDATE HOADON
                SET TongTien = dbo.fn_CalculateHoaDonTotal(:mhd)
                WHERE MaHoaDon = :mhd
            """),
            {"mhd": ma_hd},
        )

        db.commit()

        return {
            "ok": True,
            "MaHoaDon": ma_hd,
            "MaPhien": ma_phien,
            "MaCN": ma_cn,
            "TenThuCung": pet.Ten,
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))



def kh17_my_bookings(db: Session, ma_kh: str):
    return db.execute(
        text("""
            SELECT 
            pd.MaPhien,
            pd.MaHoaDon,
            pd.MaCN,
            pd.TrangThai,

            tc.Ten AS TenThuCung,

            CASE 
                WHEN pd.MaDV = 'DV_RETAIL' THEN
                    STRING_AGG(sp.TenSP + N' ×' + CAST(mh.SoLuong AS NVARCHAR), N', ')
                ELSE dv.TenDV
            END AS TenDV,

            CASE 
                WHEN pd.MaDV = 'DV_RETAIL' THEN
                    SUM(mh.SoLuong * sp.DonGia)
                ELSE pd.GiaTien
            END AS GiaTien

        FROM PHIENDICHVU pd
        JOIN HOADON h ON h.MaHoaDon = pd.MaHoaDon
        LEFT JOIN THUCUNG tc ON pd.MaThuCung = tc.MaThuCung
        JOIN DICHVU dv ON pd.MaDV = dv.MaDV
        LEFT JOIN MUAHANG mh ON mh.MaPhien = pd.MaPhien
        LEFT JOIN SANPHAM sp ON sp.MaSP = mh.MaSP

        WHERE h.MaKH = :kh
        AND pd.TrangThai = N'BOOKING'

        GROUP BY
            pd.MaPhien, pd.MaHoaDon, pd.MaCN, pd.TrangThai,
            tc.Ten, dv.TenDV, pd.MaDV, pd.GiaTien

        ORDER BY pd.MaPhien DESC
        """),
        {"kh": ma_kh},
    ).mappings().all()

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

def kh4_booking_product(db: Session, ma_kh: str, ma_sp: str, so_luong: int):
    # 1. Kiểm tra sản phẩm
    sp = db.execute(
        text("SELECT DonGia, TenSP FROM SANPHAM WHERE MaSP = :sp"),
        {"sp": ma_sp},
    ).fetchone()
    if not sp:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")

    # 2. Tìm chi nhánh còn hàng
    ma_cn = db.execute(
        text("""
            SELECT TOP 1 MaCN
            FROM CHINHANH_SANPHAM
            WHERE MaSP = :sp AND SoLuongTonKho >= :sl
            ORDER BY SoLuongTonKho DESC
        """),
        {"sp": ma_sp, "sl": so_luong},
    ).scalar()

    if not ma_cn:
        raise HTTPException(
            status_code=400,
            detail=f"Sản phẩm {sp.TenSP} đã hết hàng trên toàn hệ thống",
        )

    try:
        # ===================================================
        # 3. TÌM / TẠO HOADON (GIỎ HÀNG)
        # ===================================================
        ma_hd = db.execute(
            text("""
                SET NOCOUNT ON;
                SELECT TOP 1 h.MaHoaDon
                FROM HOADON h
                JOIN PHIENDICHVU pd ON h.MaHoaDon = pd.MaHoaDon
                WHERE h.MaKH = :kh
                  AND pd.TrangThai = N'BOOKING'
                ORDER BY h.NgayLap DESC
            """),
            {"kh": ma_kh},
        ).scalar()

        if not ma_hd:
            ma_hd = db.execute(
                text("""
                    SET NOCOUNT ON;
                    DECLARE @out TABLE (ID VARCHAR(10));

                    INSERT INTO HOADON (MaKH, NhanVienLap, HinhThucThanhToan)
                    OUTPUT INSERTED.MaHoaDon INTO @out
                    VALUES (:kh, 'NV_SYSTEM', N'Tiền mặt');

                    SELECT ID FROM @out;
                """),
                {"kh": ma_kh},
            ).scalar()

        # ===================================================
        # 4. TÌM / TẠO PHIÊN BÁN LẺ (DV_RETAIL)
        # ===================================================
        ma_phien = db.execute(
            text("""
                SET NOCOUNT ON;
                SELECT MaPhien
                FROM PHIENDICHVU
                WHERE MaHoaDon = :mhd
                  AND MaDV = 'DV_RETAIL'
                  AND MaCN = :cn
            """),
            {"mhd": ma_hd, "cn": ma_cn},
        ).scalar()

        if not ma_phien:
            ma_phien = db.execute(
                text("""
                    SET NOCOUNT ON;
                    DECLARE @outP TABLE (ID VARCHAR(10));

                    INSERT INTO PHIENDICHVU (
                        MaHoaDon, MaDV, GiaTien, TrangThai, MaCN, MaThuCung
                    )
                    OUTPUT INSERTED.MaPhien INTO @outP
                    VALUES (
                        :mhd, 'DV_RETAIL', 0, N'BOOKING', :cn, NULL
                    );

                    SELECT ID FROM @outP;
                """),
                {"mhd": ma_hd, "cn": ma_cn},
            ).scalar()

        # ===================================================
        # 5. THÊM / CỘNG SỐ LƯỢNG MUA HÀNG
        # ===================================================
        db.execute(
            text("""
                IF EXISTS (
                    SELECT 1 FROM MUAHANG
                    WHERE MaPhien = :mp AND MaSP = :sp
                )
                    UPDATE MUAHANG
                    SET SoLuong = SoLuong + :sl
                    WHERE MaPhien = :mp AND MaSP = :sp
                ELSE
                    INSERT INTO MUAHANG (MaPhien, MaSP, SoLuong)
                    VALUES (:mp, :sp, :sl)
            """),
            {"mp": ma_phien, "sp": ma_sp, "sl": so_luong},
        )

        # ===================================================
        # 6. CẬP NHẬT TỔNG TIỀN
        # ===================================================
        db.execute(
            text("""
                SET NOCOUNT ON;
                UPDATE HOADON
                SET TongTien = dbo.fn_CalculateHoaDonTotal(:mhd)
                WHERE MaHoaDon = :mhd
            """),
            {"mhd": ma_hd},
        )

        db.commit()
        return {
            "ok": True,
            "MaCN": ma_cn,
            "message": f"Sản phẩm sẽ được lấy từ chi nhánh {ma_cn}",
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
    

def kh_buy_package(
    db: Session,
    ma_kh: str,
    ma_goi: str,
):
    try:
        # ============================================
        # 1. TÌM / TẠO HÓA ĐƠN BOOKING
        # ============================================
        ma_hd = db.execute(
            text("""
                SET NOCOUNT ON;
                SELECT TOP 1 h.MaHoaDon
                FROM HOADON h
                LEFT JOIN PHIENDICHVU pd ON h.MaHoaDon = pd.MaHoaDon
                WHERE h.MaKH = :kh
                  AND (pd.TrangThai = N'BOOKING' OR pd.MaPhien IS NULL)
                ORDER BY h.NgayLap DESC
            """),
            {"kh": ma_kh},
        ).scalar()

        if not ma_hd:
            ma_hd = db.execute(
                text("""
                    SET NOCOUNT ON;
                    DECLARE @out TABLE (ID VARCHAR(10));

                    INSERT INTO HOADON (MaKH, NhanVienLap, HinhThucThanhToan)
                    OUTPUT INSERTED.MaHoaDon INTO @out
                    VALUES (:kh, 'NV_SYSTEM', N'Tiền mặt');

                    SELECT ID FROM @out;
                """),
                {"kh": ma_kh},
            ).scalar()

        # ============================================
        # 2. THÊM GÓI TIÊM
        # ============================================
        db.execute(
            text("""
                INSERT INTO MUA_GOI (MaKH, MaGoi, MaHoaDon)
                VALUES (:kh, :goi, :hd)
            """),
            {"kh": ma_kh, "goi": ma_goi, "hd": ma_hd},
        )

        # ============================================
        # 3. UPDATE TỔNG TIỀN
        # ============================================
        db.execute(
            text("""
                UPDATE HOADON
                SET TongTien = dbo.fn_CalculateHoaDonTotal(:hd)
                WHERE MaHoaDon = :hd
            """),
            {"hd": ma_hd},
        )

        db.commit()
        return {"ok": True, "MaHoaDon": ma_hd}

    except DBAPIError as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e.orig))

def kh_confirm_invoice(
    db: Session,
    ma_hoa_don: str,
    hinh_thuc_thanh_toan: str,
):
    try:
        exec_sp(
            db,
            "EXEC dbo.sp_ConfirmHoaDon "
            "@MaHoaDon=:hd, @HinhThucTT=:httt, @NhanVienLap=:nv",
            {
                "hd": ma_hoa_don,
                "httt": hinh_thuc_thanh_toan,
                "nv": "NV_SYSTEM",
            },
        )
        return {"ok": True}
    except DBAPIError as e:
        raise HTTPException(status_code=400, detail=str(e.orig))
    