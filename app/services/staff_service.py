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


def nv6_invoice_detail(db: Session, ma_hoa_don: str):
    hoa_don = db.execute(
        text("SELECT * FROM HOADON WHERE MaHoaDon = :m"),
        {"m": ma_hoa_don},
    ).mappings().first()

    if not hoa_don:
        raise HTTPException(404, "Không tìm thấy hoá đơn")

    phien = db.execute(
        text("""
            SELECT pd.MaPhien, pd.MaThuCung, dv.TenDV, pd.GiaTien
            FROM PHIENDICHVU pd
            JOIN DICHVU dv ON dv.MaDV = pd.MaDV
            WHERE pd.MaHoaDon = :m
        """),
        {"m": ma_hoa_don},
    ).mappings().all()

    kham = db.execute(
        text("""
            SELECT kb.*
            FROM KHAMBENH kb
            JOIN PHIENDICHVU pd ON pd.MaPhien = kb.MaPhien
            WHERE pd.MaHoaDon = :m
        """),
        {"m": ma_hoa_don},
    ).mappings().all()

    tiem = db.execute(
        text("""
            SELECT tp.*, vc.TenVC
            FROM TIEMPHONG tp
            JOIN VACCINE vc ON vc.MaVC = tp.MaVC
            JOIN PHIENDICHVU pd ON pd.MaPhien = tp.MaPhien
            WHERE pd.MaHoaDon = :m
        """),
        {"m": ma_hoa_don},
    ).mappings().all()

    thuoc = db.execute(
        text("""
            SELECT
                tt.MaThuoc,
                sp.TenSP AS TenThuoc,
                tt.SoLuong,
                sp.DonGia,
                tt.SoLuong * sp.DonGia AS ThanhTien
            FROM TOATHUOC tt
            JOIN SANPHAM sp ON sp.MaSP = tt.MaThuoc
            JOIN PHIENDICHVU pd ON pd.MaPhien = tt.MaPhien
            WHERE pd.MaHoaDon = :m
        """),
        {"m": ma_hoa_don},
    ).mappings().all()

    return {
        "hoa_don": hoa_don,
        "phien_dich_vu": phien,
        "kham_benh": kham,
        "tiem_phong": tiem,
        "ke_thuoc": thuoc,
    }

def get_exam_history_by_pet(db: Session, ma_thu_cung: str):
    sql = """
        SELECT 
            CAST(p.ThoiDiemKetThuc AS DATE) as NgayKham, 
            kb.ChanDoan, 
            nv.HoTen as TenBacSi,
            -- Gộp tên thuốc và số lượng thành một chuỗi
            (SELECT STRING_AGG(sp.TenSP + ' (x' + CAST(tt.SoLuong AS VARCHAR) + ')', ', ')
             FROM TOATHUOC tt
             JOIN SANPHAM sp ON tt.MaThuoc = sp.MaSP
             WHERE tt.MaPhien = p.MaPhien) as ToaThuoc
        FROM KHAMBENH kb
        JOIN PHIENDICHVU p ON kb.MaPhien = p.MaPhien
        JOIN NHANVIEN nv ON kb.BacSiPhuTrach = nv.MaNV
        WHERE p.MaThuCung = :ma_pet 
        ORDER BY p.ThoiDiemKetThuc DESC
    """
    result = db.execute(text(sql), {"ma_pet": ma_thu_cung})
    return [dict(row) for row in result.mappings()]

def get_vaccine_history_by_pet(db: Session, ma_thu_cung: str):
    sql = """
        SELECT 
            tp.NgayTiem, 
            vc.TenVC as TenVaccine, 
            tp.SoLieu,               -- Khớp với React
            nv.HoTen as TenBacSi,    -- Lấy tên từ bảng NHANVIEN
            tp.MaGoi                 -- Nếu không biết tên bảng gói, cứ lấy cái Mã ra trước
        FROM TIEMPHONG tp
        JOIN VACCINE vc ON tp.MaVC = vc.MaVC
        LEFT JOIN NHANVIEN nv ON tp.BacSiPhuTrach = nv.MaNV
        JOIN PHIENDICHVU pd ON tp.MaPhien = pd.MaPhien
        WHERE pd.MaThuCung = :ma_pet 
        ORDER BY tp.NgayTiem DESC
    """
    result = db.execute(text(sql), {"ma_pet": ma_thu_cung})
    return [dict(row) for row in result.mappings()]

def get_bookings_by_customer(db: Session, ma_cn: str, ma_kh: str = None, ma_dv: str = 'DV001'):
    """
    Lấy danh sách chờ dựa trên mã dịch vụ (DV001: Khám, DV002: Tiêm)
    """
    sql = """
        SELECT 
            p.MaPhien, t.MaKH, p.TrangThai, t.Ten as TenThuCung, 
            p.MaDV, p.MaThuCung
        FROM PHIENDICHVU p
        INNER JOIN THUCUNG t ON p.MaThuCung = t.MaThuCung
        WHERE p.MaCN = :ma_cn 
          AND p.TrangThai = N'IN_SERVICE'  
          AND p.MaDV = :ma_dv 
    """
    params = {"ma_cn": ma_cn, "ma_dv": ma_dv}
    if ma_kh:
        sql += " AND t.MaKH = :ma_kh"
        params["ma_kh"] = ma_kh

    result = db.execute(text(sql), params).mappings().all()
    return [dict(row) for row in result]

def complete_exam_process(db: Session, ma_phien: str, ma_bs: str, trieu_chung: str, chan_doan: str, thuoc_list: list):
    try:
        db.execute(text("""
            IF EXISTS (SELECT 1 FROM KHAMBENH WHERE MaPhien = :mp)
                UPDATE KHAMBENH SET BacSiPhuTrach=:bs, CacTrieuChung=:tc, ChanDoan=:cd WHERE MaPhien=:mp
            ELSE
                INSERT INTO KHAMBENH (MaPhien, BacSiPhuTrach, CacTrieuChung, ChanDoan)
                VALUES (:mp, :bs, :tc, :cd)
        """), {"mp": ma_phien, "bs": ma_bs, "tc": trieu_chung, "cd": chan_doan})

        if thuoc_list:
            db.execute(text("DELETE FROM TOATHUOC WHERE MaPhien = :mp"), {"mp": ma_phien})
            
            for item in thuoc_list:
                db.execute(text("""
                    INSERT INTO TOATHUOC (MaPhien, MaThuoc, Soluong) 
                    VALUES (:mp, :mt, :sl)
                """), {
                    "mp": ma_phien, 
                    "mt": item['MaSP'], 
                    "sl": item['SoLuong']
                })

        db.execute(text("""
            UPDATE PHIENDICHVU 
            SET ThoiDiemKetThuc = GETDATE() 
            WHERE MaPhien = :mp
        """), {"mp": ma_phien})

        db.commit()
        return {"ok": True, "message": "Đã lưu bệnh án và đơn thuốc thành công"}

    except Exception as e:
        db.rollback()
        print(f"Lỗi tại complete_exam_process: {str(e)}")
        raise HTTPException(status_code=400, detail=f"Không thể lưu: {str(e)}")
    
def complete_vaccine_process(db: Session, ma_phien: str, ma_bs: str, danh_sach_tiem: list):
    try:
        db.execute(text("""
            UPDATE PHIENDICHVU 
            SET TrangThai = N'DONE_SERVICE', 
                ThoiDiemKetThuc = GETDATE()
            WHERE MaPhien = :mp
        """), {"mp": ma_phien})

        for item in danh_sach_tiem:
            db.execute(text("""
                INSERT INTO TIEMPHONG (MaPhien, MaVC, MaGoi, BacSiPhuTrach, NgayTiem, SoLieu)
                VALUES (:mp, :mvc, :mgoi, :bs, CAST(GETDATE() AS DATE), :sl)
            """), {
                "mp": ma_phien, 
                "mvc": item['ma_vc'],
                "mgoi": item.get('ma_goi'), 
                "bs": ma_bs,
                "sl": item['so_lieu']
            })

        db.commit()
        return {"ok": True, "message": "Đã lưu lịch sử tiêm phòng"}
    except Exception as e:
        db.rollback()
        raise Exception(f"Lỗi tại Service: {str(e)}")
    
def get_all_medicines(db: Session):
    try:
        query = text("""
            SELECT MaSP, TenSP, CAST(DonGia AS FLOAT) as DonGia
            FROM SANPHAM 
            WHERE LoaiSP = N'Thuốc'
        """)
        result = db.execute(query)
        data = [dict(row) for row in result.mappings()]
        print(f"DEBUG: Đã tải {len(data)} loại thuốc từ SANPHAM")
        return data
    except Exception as e:
        print(f"Lỗi SQL tại get_all_medicines: {e}")
        return []

def start_examination(db: Session, ma_phien: str):
    try:
        phien = db.execute(
            text("SELECT TrangThai FROM PHIENDICHVU WHERE MaPhien = :mp"), 
            {"mp": ma_phien}
        ).fetchone()

        if not phien:
            raise HTTPException(status_code=404, detail="Không tìm thấy phiên")
        
        if phien.TrangThai != 'IN_SERVICE':
            raise HTTPException(status_code=400, detail="Ca này đã có bác sĩ khác nhận hoặc đã hoàn thành")

        db.execute(text("""
            UPDATE PHIENDICHVU 
            SET TrangThai = N'DONE_SERVICE', 
                ThoiDiemBatDau = GETDATE() 
            WHERE MaPhien = :mp
        """), {"mp": ma_phien})
        
        db.commit()
        return {"ok": True}
    except Exception as e:
        db.rollback()
        raise e
    
def get_daily_history_all(db: Session, ma_cn: str, selected_date: str):
    try:
        query_kham = text("""
            SELECT 
                kb.MaPhien, tc.Ten AS TenThuCung, 
                tc.Loai, tc.Giong, tc.NgaySinh, tc.GioiTinh, -- Thêm thông tin thú cưng
                kb.ChanDoan, kb.CacTrieuChung AS TrieuChung, pd.ThoiDiemKetThuc,
                (SELECT STRING_AGG(sp.TenSP, ', ') FROM TOATHUOC tt 
                 JOIN SANPHAM sp ON tt.MaThuoc = sp.MaSP WHERE tt.MaPhien = kb.MaPhien) AS ThuocDaKe
            FROM KHAMBENH kb
            JOIN PHIENDICHVU pd ON kb.MaPhien = pd.MaPhien
            JOIN THUCUNG tc ON pd.MaThuCung = tc.MaThuCung
            WHERE pd.MaCN = :cn AND CAST(pd.ThoiDiemKetThuc AS DATE) = :dt
            ORDER BY pd.ThoiDiemKetThuc DESC
        """)

        query_tiem = text("""
            SELECT 
                tp.MaPhien, tc.Ten AS TenThuCung, 
                tc.Loai, tc.Giong, tc.NgaySinh, tc.GioiTinh, -- Thêm thông tin thú cưng
                vc.TenVC, tp.SoLieu, pd.ThoiDiemKetThuc
            FROM TIEMPHONG tp
            JOIN VACCINE vc ON tp.MaVC = vc.MaVC
            JOIN PHIENDICHVU pd ON tp.MaPhien = pd.MaPhien
            JOIN THUCUNG tc ON pd.MaThuCung = tc.MaThuCung
            WHERE pd.MaCN = :cn AND tp.NgayTiem = :dt
            ORDER BY pd.ThoiDiemKetThuc DESC
        """)

        res_kham = db.execute(query_kham, {"cn": ma_cn, "dt": selected_date}).mappings().all()
        res_tiem = db.execute(query_tiem, {"cn": ma_cn, "dt": selected_date}).mappings().all()

        return {"kham_list": res_kham, "tiem_list": res_tiem}
    except Exception as e:
        raise e