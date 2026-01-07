USE PetCareX;
GO
/* --- 1. Hàm tính giá gói tiêm --- */
CREATE OR ALTER FUNCTION dbo.fn_GiaGoiTiemPhong(@MaGoi VARCHAR(10))
RETURNS DECIMAL(18,2) AS
BEGIN
    DECLARE @GiaGoc DECIMAL(18,2), @KM FLOAT;
    SELECT @KM = KhuyenMai FROM GOITIEMPHONG WHERE MaGoi = @MaGoi;
    SELECT @GiaGoc = SUM(gtpv.SoLieu * vc.DonGia) FROM GOITIEMPHONG_VACCINE gtpv
    JOIN VACCINE vc ON vc.MaVC = gtpv.MaVC WHERE gtpv.MaGoi = @MaGoi;
    RETURN COALESCE(@GiaGoc, 0) * (1 - (COALESCE(@KM, 0)/100.0));
END;
GO

/* --- 2. Hàm MASTER tính tổng tiền Hóa Đơn --- */
CREATE OR ALTER FUNCTION dbo.fn_CalculateHoaDonTotal(@MaHoaDon VARCHAR(10))
RETURNS DECIMAL(18,2) AS
BEGIN
    DECLARE @Tong DECIMAL(18,2) = 0, @KM_HD FLOAT;
    SELECT @KM_HD = KhuyenMai FROM HOADON WHERE MaHoaDon = @MaHoaDon;
    -- Dịch vụ
    SELECT @Tong += SUM(GiaTien) FROM PHIENDICHVU WHERE MaHoaDon = @MaHoaDon;
    -- Thuốc
    SELECT @Tong += SUM(tt.Soluong * sp.DonGia) FROM PHIENDICHVU pd JOIN TOATHUOC tt ON pd.MaPhien = tt.MaPhien JOIN SANPHAM sp ON tt.MaThuoc = sp.MaSP WHERE pd.MaHoaDon = @MaHoaDon;
    -- Mua hàng
    SELECT @Tong += SUM(mh.SoLuong * sp.DonGia) FROM PHIENDICHVU pd JOIN MUAHANG mh ON pd.MaPhien = mh.MaPhien JOIN SANPHAM sp ON mh.MaSP = sp.MaSP WHERE pd.MaHoaDon = @MaHoaDon;
    -- Tiêm lẻ
    SELECT @Tong += SUM(tp.SoLieu * vc.DonGia) FROM PHIENDICHVU pd JOIN TIEMPHONG tp ON pd.MaPhien = tp.MaPhien JOIN VACCINE vc ON tp.MaVC = vc.MaVC WHERE pd.MaHoaDon = @MaHoaDon AND tp.MaGoi IS NULL;
    -- Gói mới
    SELECT @Tong += SUM(dbo.fn_GiaGoiTiemPhong(mg.MaGoi)) FROM MUA_GOI mg WHERE mg.MaHoaDon = @MaHoaDon;

    RETURN COALESCE(@Tong, 0) * (1 - (COALESCE(@KM_HD, 0)/100.0));
END;
GO

/* --- 3. TRIGGER CẬP NHẬT TIỀN TỰ ĐỘNG (SET-BASED) --- */
CREATE OR ALTER TRIGGER trg_RecalcHD_Direct ON PHIENDICHVU AFTER INSERT, UPDATE, DELETE AS
BEGIN
    UPDATE HOADON SET TongTien = dbo.fn_CalculateHoaDonTotal(MaHoaDon) WHERE MaHoaDon IN (SELECT MaHoaDon FROM inserted UNION SELECT MaHoaDon FROM deleted);
END;
GO

CREATE OR ALTER TRIGGER trg_RecalcHD_Indirect ON TOATHUOC AFTER INSERT, UPDATE, DELETE AS
BEGIN
    UPDATE HOADON SET TongTien = dbo.fn_CalculateHoaDonTotal(MaHoaDon) WHERE MaHoaDon IN (SELECT DISTINCT pd.MaHoaDon FROM PHIENDICHVU pd INNER JOIN (SELECT MaPhien FROM inserted UNION SELECT MaPhien FROM deleted) AS t ON pd.MaPhien = t.MaPhien);
END;
GO

CREATE OR ALTER TRIGGER trg_RecalcHD_Indirect_MH ON MUAHANG AFTER INSERT, UPDATE, DELETE AS
BEGIN
    UPDATE HOADON SET TongTien = dbo.fn_CalculateHoaDonTotal(MaHoaDon) WHERE MaHoaDon IN (SELECT DISTINCT pd.MaHoaDon FROM PHIENDICHVU pd INNER JOIN (SELECT MaPhien FROM inserted UNION SELECT MaPhien FROM deleted) AS t ON pd.MaPhien = t.MaPhien);
END;
GO

CREATE OR ALTER TRIGGER trg_RecalcHD_Indirect_TP ON TIEMPHONG AFTER INSERT, UPDATE, DELETE AS
BEGIN
    UPDATE HOADON SET TongTien = dbo.fn_CalculateHoaDonTotal(MaHoaDon) WHERE MaHoaDon IN (SELECT DISTINCT pd.MaHoaDon FROM PHIENDICHVU pd INNER JOIN (SELECT MaPhien FROM inserted UNION SELECT MaPhien FROM deleted) AS t ON pd.MaPhien = t.MaPhien);
END;
GO

CREATE OR ALTER TRIGGER trg_RecalcHD_MuaGoi ON MUA_GOI AFTER INSERT, UPDATE, DELETE AS
BEGIN
    UPDATE HOADON SET TongTien = dbo.fn_CalculateHoaDonTotal(MaHoaDon) WHERE MaHoaDon IN (SELECT MaHoaDon FROM inserted UNION SELECT MaHoaDon FROM deleted);
END;
GO




-- Procedure kê thuốc & trừ kho
CREATE OR ALTER PROCEDURE sp_KeThuoc @MaPhien VARCHAR(10), @MaThuoc VARCHAR(10), @SoLuong INT AS
BEGIN
    DECLARE @MaCN VARCHAR(10) = (SELECT nv.MaCN FROM PHIENDICHVU pd JOIN HOADON h ON pd.MaHoaDon = h.MaHoaDon JOIN NHANVIEN nv ON h.NhanVienLap = nv.MaNV WHERE pd.MaPhien = @MaPhien);
    IF (SELECT SoLuongTonKho FROM CHINHANH_SANPHAM WHERE MaCN = @MaCN AND MaSP = @MaThuoc) < @SoLuong THROW 50001, N'Kho không đủ thuốc!', 1;
    INSERT INTO TOATHUOC (MaPhien, MaThuoc, Soluong) VALUES (@MaPhien, @MaThuoc, @SoLuong);
    UPDATE CHINHANH_SANPHAM SET SoLuongTonKho -= @SoLuong WHERE MaCN = @MaCN AND MaSP = @MaThuoc;
END;
GO

-- Ràng buộc: MaKH trong MUA_GOI phải khớp với HOADON
CREATE OR ALTER TRIGGER trg_Check_MuaGoi_KH ON MUA_GOI AFTER INSERT, UPDATE AS
BEGIN
    IF EXISTS (SELECT 1 FROM inserted i JOIN HOADON h ON i.MaHoaDon = h.MaHoaDon WHERE i.MaKH <> h.MaKH)
    BEGIN RAISERROR(N'Lỗi: Mã khách hàng không khớp với hóa đơn!', 16, 1); ROLLBACK; END
END;
GO