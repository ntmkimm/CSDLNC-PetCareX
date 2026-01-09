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

def kh_get_my_purchased_packages(db: Session, ma_kh: str):
    # Lấy danh sách gói đã thanh toán (HinhThucThanhToan IS NOT NULL)
    rows = db.execute(
        text("""
            WITH GlobalStock AS (
                -- Tính tổng tồn kho của từng loại vaccine trên toàn bộ chi nhánh
                SELECT MaVC, SUM(SoLuongTonKho) as TotalGlobalStock
                FROM CHINHANH_VACCINE
                GROUP BY MaVC
            ),
            PackageDetails AS (
                -- Lấy thông tin chi tiết các liều trong gói của khách hàng
                SELECT 
                    mg.MaHoaDon,
                    mg.MaGoi,
                    gkv.MaVC,
                    v.TenVC,
                    gv.SoLieu AS SoMuiGoc,
                    gkv.Solieuconlai AS SoMuiConLai,
                    ISNULL(gs.TotalGlobalStock, 0) as TonKhoToanHeThong
                FROM MUA_GOI mg
                JOIN GOI_KHACHHANG_VACCINE gkv ON mg.MaKH = gkv.MaKH AND mg.MaGoi = gkv.MaGoi
                JOIN GOITIEMPHONG_VACCINE gv ON mg.MaGoi = gv.MaGoi AND gkv.MaVC = gv.MaVC
                JOIN VACCINE v ON gkv.MaVC = v.MaVC
                LEFT JOIN GlobalStock gs ON gkv.MaVC = gs.MaVC
                WHERE mg.MaKH = :kh
            )
            SELECT 
                h.MaHoaDon,
                h.NgayLap AS NgayMua,
                g.MaGoi,
                g.TenGoi,
                DATEADD(MONTH, g.ThoiGian, h.NgayLap) AS NgayHetHan,
                -- Tổng hợp dữ liệu mũi tiêm
                SUM(pd.SoMuiGoc) as SoMuiTong,
                SUM(pd.SoMuiConLai) as SoMuiConLai,
                SUM(pd.SoMuiGoc - pd.SoMuiConLai) as SoMuiDaDung,
                -- Cảnh báo: Nếu có bất kỳ vaccine nào trong gói hết hàng ở mọi nơi
                MAX(CASE WHEN pd.TonKhoToanHeThong = 0 AND pd.SoMuiConLai > 0 THEN 1 ELSE 0 END) as CoCanhBaoHetHang,
                -- Trạng thái dựa trên thời gian và số mũi
                CASE 
                    WHEN GETDATE() > DATEADD(MONTH, g.ThoiGian, h.NgayLap) THEN N'EXPIRED'
                    WHEN SUM(pd.SoMuiConLai) = 0 THEN N'COMPLETED'
                    ELSE N'ACTIVE'
                END AS TrangThai
            FROM HOADON h
            JOIN MUA_GOI mg ON h.MaHoaDon = mg.MaHoaDon
            JOIN GOITIEMPHONG g ON mg.MaGoi = g.MaGoi
            JOIN PackageDetails pd ON h.MaHoaDon = pd.MaHoaDon AND g.MaGoi = pd.MaGoi
            WHERE h.MaKH = :kh AND h.HinhThucThanhToan IS NOT NULL
            GROUP BY h.MaHoaDon, h.NgayLap, g.MaGoi, g.TenGoi, g.ThoiGian
            ORDER BY h.NgayLap DESC
        """),
        {"kh": ma_kh},
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
    # Kiểm tra quyền sở hữu
    ok = db.execute(
        text("SELECT 1 FROM THUCUNG WHERE MaThuCung=:tc AND MaKH=:kh"),
        {"tc": ma_thu_cung, "kh": ma_kh},
    ).first()
    if not ok:
        raise HTTPException(status_code=404, detail="Pet not found")

    rows = db.execute(
        text("""
            SELECT 
                hd.NgayLap, 
                dv.TenDV,
                kb.ChanDoan, 
                kb.CacTrieuChung, 
                kb.NgayTaiKham,
                /* Lấy danh sách thuốc và gộp lại thành chuỗi */
                (
                    SELECT STRING_AGG(sp.TenSP + N' (SL: ' + CAST(tt.Soluong AS NVARCHAR) + N')', CHAR(13) + CHAR(10))
                    FROM TOATHUOC tt
                    JOIN SANPHAM sp ON tt.MaThuoc = sp.MaSP
                    WHERE tt.MaPhien = pd.MaPhien
                ) AS ToaThuoc
            FROM PHIENDICHVU pd
            JOIN HOADON hd ON hd.MaHoaDon = pd.MaHoaDon
            JOIN DICHVU dv ON pd.MaDV = dv.MaDV
            JOIN KHAMBENH kb ON kb.MaPhien = pd.MaPhien
            WHERE pd.MaThuCung = :pet
            ORDER BY hd.NgayLap DESC
        """),
        {"pet": ma_thu_cung},
    ).mappings().all()
    return rows


# ============================================================
# KH11 - Danh sách hóa đơn đã thanh toán
# ============================================================
def kh11_purchase_history(db: Session, ma_kh: str):
    # Trả về danh sách hóa đơn tổng quát
    rows = db.execute(
        text("""
            SELECT MaHoaDon, NgayLap, TongTien, KhuyenMai, HinhThucThanhToan
            FROM HOADON
            WHERE MaKH = :kh AND HinhThucThanhToan IS NOT NULL
            ORDER BY NgayLap DESC
        """),
        {"kh": ma_kh},
    ).mappings().all()
    return rows


# ============================================================
# KH12 - Chi tiết từng hạng mục trong hóa đơn
# ============================================================
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
            /* 1. Hạng mục Dịch vụ (Khám, Tiêm, Spa...) */
            SELECT dv.TenDV AS TenItem, 1 AS SoLuong, pd.GiaTien AS DonGia, pd.GiaTien AS ThanhTien, 'Service' AS Loai
            FROM PHIENDICHVU pd
            JOIN DICHVU dv ON pd.MaDV = dv.MaDV
            WHERE pd.MaHoaDon = :hd AND pd.MaDV <> 'DV_RETAIL'

            UNION ALL

            /* 2. Hạng mục Thuốc trong Toa thuốc (Quan trọng: Cái này bị thiếu) */
            SELECT sp.TenSP AS TenItem, tt.Soluong, sp.DonGia, (tt.Soluong * sp.DonGia) AS ThanhTien, 'Medicine' AS Loai
            FROM PHIENDICHVU pd
            JOIN TOATHUOC tt ON pd.MaPhien = tt.MaPhien
            JOIN SANPHAM sp ON tt.MaThuoc = sp.MaSP
            WHERE pd.MaHoaDon = :hd

            UNION ALL

            /* 3. Hạng mục Sản phẩm bán lẻ (Mua lẻ) */
            SELECT sp.TenSP AS TenItem, mh.SoLuong, sp.DonGia, (mh.SoLuong * sp.DonGia) AS ThanhTien, 'Product' AS Loai
            FROM PHIENDICHVU pd
            JOIN MUAHANG mh ON pd.MaPhien = mh.MaPhien
            JOIN SANPHAM sp ON mh.MaSP = sp.MaSP
            WHERE pd.MaHoaDon = :hd

            UNION ALL

            /* 4. Hạng mục Gói tiêm */
            SELECT g.TenGoi AS TenItem, 1 AS SoLuong, dbo.fn_GiaGoiTiemPhong(g.MaGoi) AS DonGia, 
                   dbo.fn_GiaGoiTiemPhong(g.MaGoi) AS ThanhTien, 'Package' AS Loai
            FROM MUA_GOI mg
            JOIN GOITIEMPHONG g ON g.MaGoi = mg.MaGoi
            WHERE mg.MaHoaDon = :hd
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

def kh_get_chinhanh_by_product(db: Session, ma_sp: str):
    return db.execute(
        text("""
            SELECT cn.MaCN, cn.TenCN, csp.SoLuongTonKho
            FROM CHINHANH_SANPHAM csp
            JOIN CHINHANH cn ON cn.MaCN = csp.MaCN
            WHERE csp.MaSP = :sp
              AND csp.SoLuongTonKho > 0
        """),
        {"sp": ma_sp},
    ).mappings().all()

def kh_get_chinhanh_by_service(db: Session, ma_dv: str):
    return db.execute(
        text("""
            SELECT cn.MaCN, cn.TenCN
            FROM CUNGCAPDICHVU c
            JOIN CHINHANH cn ON cn.MaCN = c.MaCN
            WHERE c.MaDV = :dv
        """),
        {"dv": ma_dv},
    ).mappings().all()


def kh16_create_booking(
    db: Session,
    ma_kh: str,
    ma_thu_cung: str,
    ma_dv: str,
    ma_cn: str,
    ma_nv: Optional[str] = 'NV_SYSTEM'
):
    # ---------------------------------------------------
    # 0. KIỂM TRA CHI NHÁNH CÓ CUNG CẤP DỊCH VỤ
    # ---------------------------------------------------
    ok_cn = db.execute(
        text("""
            SELECT 1
            FROM CUNGCAPDICHVU
            WHERE MaDV = :dv AND MaCN = :cn
        """),
        {"dv": ma_dv, "cn": ma_cn},
    ).first()

    if not ok_cn:
        raise HTTPException(
            status_code=400,
            detail="Chi nhánh này không cung cấp dịch vụ đã chọn",
        )

    # ---------------------------------------------------
    # 1. KIỂM TRA THÚ CƯNG
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
    # 2. GIÁ DỊCH VỤ
    # ---------------------------------------------------
    gia = db.execute(
        text("SELECT DonGia FROM DICHVU WHERE MaDV = :dv"),
        {"dv": ma_dv},
    ).scalar()

    if gia is None:
        raise HTTPException(status_code=400, detail="Service price not found")

    try:
        # ---------------------------------------------------
        # 3. TÌM / TẠO HÓA ĐƠN BOOKING
        # ---------------------------------------------------
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

                    INSERT INTO HOADON (MaKH, NgayLap, NhanVienLap, HinhThucThanhToan)
                    OUTPUT INSERTED.MaHoaDon INTO @out
                    VALUES (:kh, GETDATE(), :nv, NULL);

                    SELECT ID FROM @out;
                """),
                {"kh": ma_kh, "nv": ma_nv},
            ).scalar()

        # ---------------------------------------------------
        # 4. TẠO PHIÊN DỊCH VỤ
        # ---------------------------------------------------
        ma_phien = db.execute(
            text("""
                SET NOCOUNT ON;
                DECLARE @out TABLE (MaPhien VARCHAR(10));

                INSERT INTO PHIENDICHVU (
                    MaHoaDon, MaThuCung, MaDV,
                    GiaTien, TrangThai, MaCN, ThoiDiemBatDau
                )
                OUTPUT INSERTED.MaPhien INTO @out
                VALUES (
                    :hd, :tc, :dv,
                    :gia, N'BOOKING', :cn, GETDATE()
                );

                SELECT MaPhien FROM @out;
            """),
            {
                "hd": ma_hd,
                "tc": ma_thu_cung,
                "dv": ma_dv,
                "gia": gia,
                "cn": ma_cn,
            },
        ).scalar()

        # ---------------------------------------------------
        # 5. UPDATE TỔNG TIỀN
        # ---------------------------------------------------
        db.execute(
            text("""
                UPDATE HOADON
                SET TongTien = dbo.fn_CalculateHoaDonTotal(:hd)
                WHERE MaHoaDon = :hd
            """),
            {"hd": ma_hd},
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
            SELECT *
            FROM (
                /* ================= PHIÊN DỊCH VỤ / BÁN LẺ ================= */
                SELECT 
                    pd.MaPhien,
                    pd.MaHoaDon,
                    pd.MaCN,
                    pd.TrangThai,
                    tc.Ten AS TenThuCung,

                    CASE 
                        WHEN pd.MaDV = 'DV_RETAIL' THEN
                            STRING_AGG(
                                sp.TenSP + N' ×' + CAST(mh.SoLuong AS NVARCHAR),
                                N', '
                            )
                        ELSE dv.TenDV
                    END AS TenDV,

                    CASE 
                        WHEN pd.MaDV = 'DV_RETAIL' THEN
                            SUM(mh.SoLuong * sp.DonGia)
                        ELSE pd.GiaTien
                    END AS GiaTien,

                    h.NgayLap AS SortDate,
                    1 AS SortType

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
                    tc.Ten, dv.TenDV, pd.MaDV, pd.GiaTien, h.NgayLap

                UNION ALL

                /* ================= GÓI TIÊM ================= */
                SELECT
                    NULL AS MaPhien,
                    h.MaHoaDon,
                    NULL AS MaCN,
                    N'BOOKING' AS TrangThai,
                    NULL AS TenThuCung,
                    g.TenGoi AS TenDV,
                    dbo.fn_GiaGoiTiemPhong(g.MaGoi) AS GiaTien,
                    h.NgayLap AS SortDate,
                    2 AS SortType

                FROM MUA_GOI mg
                JOIN GOITIEMPHONG g ON g.MaGoi = mg.MaGoi
                JOIN HOADON h ON h.MaHoaDon = mg.MaHoaDon
                WHERE h.MaKH = :kh
                AND h.HinhThucThanhToan IS NULL
            ) x
            ORDER BY x.SortDate DESC, x.SortType, x.MaPhien DESC
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

def kh4_booking_product(
    db: Session,
    ma_kh: str,
    ma_sp: str,
    so_luong: int,
    ma_cn: str,
    ma_nv: Optional[str] = 'NV_SYSTEM',
):
    # ---------------------------------------------------
    # 1. KIỂM TRA SẢN PHẨM
    # ---------------------------------------------------
    sp = db.execute(
        text("SELECT TenSP FROM SANPHAM WHERE MaSP = :sp"),
        {"sp": ma_sp},
    ).fetchone()

    if not sp:
        raise HTTPException(status_code=404, detail="Sản phẩm không tồn tại")

    # ---------------------------------------------------
    # 2. KIỂM TRA TỒN KHO TẠI CHI NHÁNH
    # ---------------------------------------------------
    ton = db.execute(
        text("""
            SELECT SoLuongTonKho
            FROM CHINHANH_SANPHAM
            WHERE MaSP = :sp AND MaCN = :cn
        """),
        {"sp": ma_sp, "cn": ma_cn},
    ).scalar()

    if ton is None or ton < so_luong:
        raise HTTPException(
            status_code=400,
            detail=f"Sản phẩm {sp.TenSP} không đủ tồn kho tại chi nhánh {ma_cn}",
        )

    try:
        # ---------------------------------------------------
        # 3. TÌM / TẠO HÓA ĐƠN BOOKING
        # ---------------------------------------------------
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
                    VALUES (:kh, :nv, NULL);

                    SELECT ID FROM @out;
                """),
                {"kh": ma_kh, "nv": ma_nv},
            ).scalar()

        # ---------------------------------------------------
        # 4. TÌM / TẠO PHIÊN DV_RETAIL (THEO CHI NHÁNH)
        # ---------------------------------------------------
        ma_phien = db.execute(
            text("""
                SELECT MaPhien
                FROM PHIENDICHVU
                WHERE MaHoaDon = :hd
                  AND MaDV = 'DV_RETAIL'
                  AND MaCN = :cn
            """),
            {"hd": ma_hd, "cn": ma_cn},
        ).scalar()

        if not ma_phien:
            ma_phien = db.execute(
                text("""
                    SET NOCOUNT ON;
                    DECLARE @out TABLE (ID VARCHAR(10));

                    INSERT INTO PHIENDICHVU (
                        MaHoaDon, MaDV, GiaTien,
                        TrangThai, MaCN, MaThuCung
                    )
                    OUTPUT INSERTED.MaPhien INTO @out
                    VALUES (
                        :hd, 'DV_RETAIL', 0, N'BOOKING', :cn, NULL
                    );

                    SELECT ID FROM @out;
                """),
                {"hd": ma_hd, "cn": ma_cn},
            ).scalar()

        # ---------------------------------------------------
        # 5. THÊM / CỘNG SỐ LƯỢNG
        # ---------------------------------------------------
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

        # ---------------------------------------------------
        # 6. UPDATE TỔNG TIỀN
        # ---------------------------------------------------
        db.execute(
            text("""
                UPDATE HOADON
                SET TongTien = dbo.fn_CalculateHoaDonTotal(:hd)
                WHERE MaHoaDon = :hd
            """),
            {"hd": ma_hd},
        )

        db.commit()
        return {"ok": True, "MaCN": ma_cn}

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))


def kh_buy_package(db: Session, ma_kh: str, ma_goi: str):
    try:
        # 1. Tìm hóa đơn CHƯA THANH TOÁN của khách hàng này
        ma_hd = db.execute(
            text("""
                SELECT TOP 1 MaHoaDon
                FROM HOADON
                WHERE MaKH = :kh AND HinhThucThanhToan IS NULL
                ORDER BY NgayLap DESC
            """),
            {"kh": ma_kh},
        ).scalar()

        # 2. Nếu không có hóa đơn chờ, tạo mới và phải có GETDATE()
        if not ma_hd:
            ma_hd = db.execute(
                text("""
                    SET NOCOUNT ON;
                    DECLARE @out TABLE (ID VARCHAR(10));
                    INSERT INTO HOADON (MaKH, NgayLap, NhanVienLap, HinhThucThanhToan, TongTien)
                    OUTPUT INSERTED.MaHoaDon INTO @out
                    VALUES (:kh, GETDATE(), 'NV_SYSTEM', NULL, 0);
                    SELECT ID FROM @out;
                """),
                {"kh": ma_kh},
            ).scalar()

        # 3. Thêm gói vào MUA_GOI
        db.execute(
            text("""
                INSERT INTO MUA_GOI (MaKH, MaGoi, MaHoaDon)
                VALUES (:kh, :goi, :hd)
            """),
            {"kh": ma_kh, "goi": ma_goi, "hd": ma_hd},
        )

        # 4. Cập nhật lại tổng tiền cho hóa đơn
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

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=400, detail=str(e))

def kh_get_purchased_package_details(db: Session, ma_kh: str, ma_goi: str):
    rows = db.execute(
        text("""
            SELECT 
                -- 1. Lấy tên vaccine, nếu bảng danh mục bị xóa thì hiện mã để debug
                ISNULL(v.TenVC, N'Vaccine lỗi/đã xóa (' + gkv.MaVC + ')') AS TenVC,
                
                -- 2. Liều lượng (thay cho LoaiVC bị lỗi lúc nãy)
                v.LieuLuong,

                -- 3. Lấy số liều gốc từ định nghĩa gói (GOITIEMPHONG_VACCINE)
                -- Nếu mất định nghĩa gốc, tạm lấy số còn lại làm mốc
                ISNULL(gv.SoLieu, gkv.Solieuconlai) AS TongSoMui,
                
                -- 4. Số mũi khách hàng chưa tiêm
                gkv.Solieuconlai AS SoMuiConLai,
                
                -- 5. Tính số mũi đã tiêm (Gốc - Còn lại)
                (ISNULL(gv.SoLieu, gkv.Solieuconlai) - gkv.Solieuconlai) AS SoMuiDaDung,
                
                -- 6. Tính tổng tồn kho trên toàn bộ chi nhánh
                ISNULL((
                    SELECT SUM(SoLuongTonKho) 
                    FROM CHINHANH_VACCINE 
                    WHERE MaVC = gkv.MaVC
                ), 0) as TonKhoHeThong
                
            FROM GOI_KHACHHANG_VACCINE gkv
            -- Sử dụng LEFT JOIN để đảm bảo record của khách luôn hiện lên
            LEFT JOIN VACCINE v ON gkv.MaVC = v.MaVC
            LEFT JOIN GOITIEMPHONG_VACCINE gv ON gkv.MaGoi = gv.MaGoi AND gkv.MaVC = gv.MaVC
            
            WHERE gkv.MaKH = :kh AND gkv.MaGoi = :goi
        """),
        {"kh": ma_kh, "goi": ma_goi},
    ).mappings().all()
    return rows

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
        db.commit()
        return {"ok": True}
    except DBAPIError as e:
        raise HTTPException(status_code=400, detail=str(e.orig))
    