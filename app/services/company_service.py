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

# CT5: Tra cứu nhân sự [cite: 105, 137]
def search_staff(db: Session, keyword: str = None):
    sql = """
        SELECT nv.MaNV, nv.HoTen, nv.ChucVu, cn.TenCN, nv.Luong
        FROM NHANVIEN nv
        LEFT JOIN CHINHANH cn ON nv.MaCN = cn.MaCN
        WHERE 1=1
    """
    params = {}
    if keyword:
        sql += " AND (nv.HoTen LIKE :kw OR nv.MaNV = :kw_raw)"
        params = {"kw": f"%{keyword}%", "kw_raw": keyword}
    
    return db.execute(text(sql), params).mappings().all()

# CT6: Quản lý nhân sự (cập nhật lương, phân công chi nhánh) [cite: 106, 137]
def update_staff_assignment(db: Session, ma_nv: str, ma_cn_moi: str, luong_moi: float):
    # Cập nhật thông tin nhân viên
    query = text("""
        UPDATE NHANVIEN 
        SET MaCN = :ma_cn, Luong = :luong
        WHERE MaNV = :ma_nv
    """)
    db.execute(query, {"ma_cn": ma_cn_moi, "luong": luong_moi, "ma_nv": ma_nv})
    db.commit()
    return {"status": "success", "message": f"Đã điều chuyển nhân viên {ma_nv}"}

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