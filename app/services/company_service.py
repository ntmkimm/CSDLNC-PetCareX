from sqlalchemy.orm import Session
from sqlalchemy import text

# CT1: Doanh thu của từng chi nhánh [cite: 103, 134]
def get_revenue_by_branch(db: Session):
    query = text("""
        SELECT cn.MaCN, cn.TenCN, COALESCE(SUM(h.TongTien), 0) AS DoanhThu
        FROM CHINHANH cn
        LEFT JOIN NHANVIEN nv ON cn.MaCN = nv.MaCN
        LEFT JOIN HOADON h ON nv.MaNV = h.NhanVienLap
        GROUP BY cn.MaCN, cn.TenCN
        ORDER BY DoanhThu DESC
    """)
    return db.execute(query).mappings().all()

# CT2: Tổng doanh thu của các chi nhánh [cite: 103, 135]
def get_total_revenue(db: Session):
    query = text("SELECT COALESCE(SUM(TongTien), 0) AS TongDoanhThu FROM HOADON")
    return db.execute(query).mappings().first()

# CT3: Dịch vụ mang lại doanh thu cao nhất trong 6 tháng gần nhất [cite: 104, 136]
def get_top_revenue_services(db: Session):
    # CT3: Dịch vụ mang lại doanh thu cao nhất trong 6 tháng gần nhất [cite: 104]
    # Logic: Tính tổng GiaTien của phiên + tiền thuốc + tiền vaccine lẻ + tiền hàng hóa đi kèm
    query = text("""
        SELECT TOP 5 
            dv.MaDV, 
            dv.TenDV, 
            SUM(
                ISNULL(pd.GiaTien, 0) + 
                ISNULL(sub_costs.ExtraCost, 0)
            ) AS DoanhThuDichVu
        FROM PHIENDICHVU pd
        JOIN DICHVU dv ON pd.MaDV = dv.MaDV
        JOIN HOADON h ON h.MaHoaDon = pd.MaHoaDon
        -- Truy vấn con để tính tổng chi phí phụ thu (Thuốc, Vaccine lẻ, Mua hàng) cho mỗi phiên
        LEFT JOIN (
            SELECT MaPhien, SUM(Cost) AS ExtraCost
            FROM (
                -- Tiền thuốc từ toa thuốc [cite: 27]
                SELECT MaPhien, SUM(tt.Soluong * sp.DonGia) AS Cost
                FROM TOATHUOC tt 
                JOIN SANPHAM sp ON tt.MaThuoc = sp.MaSP
                GROUP BY MaPhien
                UNION ALL
                -- Tiền vaccine từ tiêm lẻ (không thuộc gói) [cite: 29]
                SELECT MaPhien, SUM(tp.SoLieu * vc.DonGia) AS Cost
                FROM TIEMPHONG tp 
                JOIN VACCINE vc ON tp.MaVC = vc.MaVC
                WHERE tp.MaGoi IS NULL
                GROUP BY MaPhien
                UNION ALL
                -- Tiền sản phẩm mua kèm trong phiên [cite: 32]
                SELECT MaPhien, SUM(mh.SoLuong * sp.DonGia) AS Cost
                FROM MUAHANG mh 
                JOIN SANPHAM sp ON mh.MaSP = sp.MaSP
                GROUP BY MaPhien
            ) all_extras
            GROUP BY MaPhien
        ) sub_costs ON pd.MaPhien = sub_costs.MaPhien
        WHERE h.NgayLap >= DATEADD(MONTH, -6, GETDATE())
          AND pd.TrangThai = N'CONFIRMED' -- Chỉ tính các phiên đã hoàn tất thanh toán
        GROUP BY dv.MaDV, dv.TenDV
        ORDER BY DoanhThuDichVu DESC
    """)
    return db.execute(query).mappings().all()

# CT4: Tình hình hội viên (Cơ bản / Thân thiết / VIP) [cite: 105, 137]
def get_membership_stats(db: Session):
    query = text("""
        SELECT Bac, COUNT(*) AS SoLuong,
               CAST(COUNT(*) * 100.0 / (SELECT COUNT(*) FROM KHACHHANG) AS DECIMAL(5,2)) AS TyLe
        FROM KHACHHANG
        GROUP BY Bac
    """)
    return db.execute(query).mappings().all()
from sqlalchemy.orm import Session
from sqlalchemy import text

# CT5: Tra cứu nhân sự (Bổ sung TenCN để hiển thị lên bảng Front-end)
def search_staff(db: Session, keyword: str = ""):
    query = text("""
        SELECT nv.*, cn.TenCN 
        FROM NHANVIEN nv
        LEFT JOIN CHINHANH cn ON nv.MaCN = cn.MaCN
        WHERE nv.HoTen LIKE :kw OR nv.MaNV LIKE :kw
    """)
    result = db.execute(query, {"kw": f"%{keyword}%"})
    return result.mappings().all()

# CT5: Thêm nhân viên mới
def create_staff(db: Session, staff_data: dict):
    query = text("""
        INSERT INTO NHANVIEN (MaNV, HoTen, NgaySinh, GioiTinh, ChucVu, MaCN, Luong)
        VALUES (:ma_nv, :ho_ten, :ngay_sinh, :gioi_tinh, :chuc_vu, :ma_cn, :luong)
    """)
    db.execute(query, {
        "ma_nv": staff_data.get('MaNV'),
        "ho_ten": staff_data.get('HoTen'),
        "ngay_sinh": staff_data.get('NgaySinh'),
        "gioi_tinh": staff_data.get('GioiTinh'),
        "chuc_vu": staff_data.get('ChucVu'),
        "ma_cn": staff_data.get('MaCN'),
        "luong": staff_data.get('Luong')
    })
    db.commit()
    return {"status": "success"}

# CT5 & CT6: Chỉnh sửa lương và chi nhánh (Hàm linh hoạt)
def update_staff(db: Session, ma_nv: str, ma_cn: str, luong: float):
    query = text("""
        UPDATE NHANVIEN 
        SET MaCN = :ma_cn, Luong = :luong
        WHERE MaNV = :ma_nv
    """)
    db.execute(query, {"ma_cn": ma_cn, "luong": luong, "ma_nv": ma_nv})
    db.commit()
    return {"status": "success"}

# CT5: Xóa nhân viên
def delete_staff(db: Session, ma_nv: str):
    query = text("DELETE FROM NHANVIEN WHERE MaNV = :ma_nv")
    db.execute(query, {"ma_nv": ma_nv})
    db.commit()
    return {"status": "success"}

# CT7: Tra cứu số khách hàng của từng chi nhánh [cite: 107, 137]
def get_customer_count_by_branch(db: Session):
    query = text("""
        SELECT cn.MaCN, cn.TenCN, COUNT(DISTINCT h.MaKH) AS SoKhachHang
        FROM CHINHANH cn
        LEFT JOIN NHANVIEN nv ON cn.MaCN = nv.MaCN
        LEFT JOIN HOADON h ON nv.MaNV = h.NhanVienLap
        GROUP BY cn.MaCN, cn.TenCN
        ORDER BY SoKhachHang DESC
    """)
    return db.execute(query).mappings().all()

# CT8: Thống kê về số lượng thú cưng trên toàn hệ thống [cite: 107, 137]
def get_total_pets_stats(db: Session):
    query = text("""
        SELECT Loai, COUNT(*) AS SoLuong
        FROM THUCUNG
        GROUP BY Loai
        UNION ALL
        SELECT N'TỔNG CỘNG', COUNT(*) FROM THUCUNG
    """)
    return db.execute(query).mappings().all()

def get_all_branches(db: Session):
    query = text("SELECT MaCN, TenCN FROM CHINHANH")
    return db.execute(query).mappings().all()