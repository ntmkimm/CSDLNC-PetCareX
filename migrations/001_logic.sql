USE PetCareX;
GO

/* =========================================================
   2) FUNCTIONS (tính tiền đúng "tổng chi tiết hóa đơn")
   ========================================================= */

-- Giá gói = SUM(vaccine * SoLieu) * (1 - KhuyenMai%)
CREATE OR ALTER FUNCTION dbo.fn_GiaGoiTiemPhong(@MaGoi VARCHAR(10))
RETURNS DECIMAL(18,2)
AS
BEGIN
    DECLARE @Tong DECIMAL(18,2) = 0;
    DECLARE @KM FLOAT = 0;

    SELECT @KM = COALESCE(KhuyenMai, 0) FROM GOITIEMPHONG WHERE MaGoi = @MaGoi;

    SELECT @Tong = COALESCE(SUM(gtpv.SoLieu * vc.DonGia), 0)
    FROM GOITIEMPHONG_VACCINE gtpv
    JOIN VACCINE vc ON vc.MaVC = gtpv.MaVC
    WHERE gtpv.MaGoi = @MaGoi;

    RETURN @Tong * (1 - (@KM/100.0));
END;
GO

CREATE OR ALTER FUNCTION dbo.fn_TongTienThuocTheoPhien(@MaPhien VARCHAR(10))
RETURNS DECIMAL(18,2)
AS
BEGIN
    DECLARE @Tong DECIMAL(18,2) = 0;
    SELECT @Tong = COALESCE(SUM(tt.Soluong * sp.DonGia), 0)
    FROM TOATHUOC tt
    JOIN SANPHAM sp ON sp.MaSP = tt.MaThuoc
    WHERE tt.MaPhien = @MaPhien;
    RETURN @Tong;
END;
GO

CREATE OR ALTER FUNCTION dbo.fn_TongTienMuaHangTheoPhien(@MaPhien VARCHAR(10))
RETURNS DECIMAL(18,2)
AS
BEGIN
    DECLARE @Tong DECIMAL(18,2) = 0;
    SELECT @Tong = COALESCE(SUM(mh.SoLuong * sp.DonGia), 0)
    FROM MUAHANG mh
    JOIN SANPHAM sp ON sp.MaSP = mh.MaSP
    WHERE mh.MaPhien = @MaPhien;
    RETURN @Tong;
END;
GO

-- Tiêm lẻ (không dùng gói): SoLieu * DonGia vaccine
CREATE OR ALTER FUNCTION dbo.fn_TongTienTiemLeTheoHoaDon(@MaHoaDon VARCHAR(10))
RETURNS DECIMAL(18,2)
AS
BEGIN
    DECLARE @Tong DECIMAL(18,2) = 0;

    SELECT @Tong = COALESCE(SUM(tp.SoLieu * vc.DonGia), 0)
    FROM PHIENDICHVU pd
    JOIN TIEMPHONG tp ON tp.MaPhien = pd.MaPhien
    JOIN VACCINE vc ON vc.MaVC = tp.MaVC
    WHERE pd.MaHoaDon = @MaHoaDon
      AND tp.MaGoi IS NULL;

    RETURN @Tong;
END;
GO

-- Mua gói: tính theo fn_GiaGoiTiemPhong
CREATE OR ALTER FUNCTION dbo.fn_TongTienMuaGoiTheoHoaDon(@MaHoaDon VARCHAR(10))
RETURNS DECIMAL(18,2)
AS
BEGIN
    DECLARE @Tong DECIMAL(18,2) = 0;

    SELECT @Tong = COALESCE(SUM(dbo.fn_GiaGoiTiemPhong(mg.MaGoi)), 0)
    FROM MUA_GOI mg
    WHERE mg.MaHoaDon = @MaHoaDon;

    RETURN @Tong;
END;
GO

-- Tổng tiền hóa đơn (trước KhuyenMai HOADON) = DV + Thuốc + MuaHang + TiêmLẻ + MuaGói
CREATE OR ALTER FUNCTION dbo.fn_TongTienHoaDon_TruocKM(@MaHoaDon VARCHAR(10))
RETURNS DECIMAL(18,2)
AS
BEGIN
    DECLARE @TongDV DECIMAL(18,2) = 0;
    DECLARE @TongThuoc DECIMAL(18,2) = 0;
    DECLARE @TongHang DECIMAL(18,2) = 0;
    DECLARE @TongTiemLe DECIMAL(18,2) = 0;
    DECLARE @TongGoi DECIMAL(18,2) = 0;

    SELECT @TongDV = COALESCE(SUM(pd.GiaTien), 0)
    FROM PHIENDICHVU pd
    WHERE pd.MaHoaDon = @MaHoaDon;

    SELECT
        @TongThuoc = COALESCE(SUM(dbo.fn_TongTienThuocTheoPhien(pd.MaPhien)), 0),
        @TongHang  = COALESCE(SUM(dbo.fn_TongTienMuaHangTheoPhien(pd.MaPhien)), 0)
    FROM PHIENDICHVU pd
    WHERE pd.MaHoaDon = @MaHoaDon;

    SET @TongTiemLe = dbo.fn_TongTienTiemLeTheoHoaDon(@MaHoaDon);
    SET @TongGoi = dbo.fn_TongTienMuaGoiTheoHoaDon(@MaHoaDon);

    RETURN (@TongDV + @TongThuoc + @TongHang + @TongTiemLe + @TongGoi);
END;
GO

-- Tổng tiền hóa đơn sau KM của HOADON (KM%)
CREATE OR ALTER FUNCTION dbo.fn_TongTienHoaDon(@MaHoaDon VARCHAR(10))
RETURNS DECIMAL(18,2)
AS
BEGIN
    DECLARE @TongTruoc DECIMAL(18,2) = dbo.fn_TongTienHoaDon_TruocKM(@MaHoaDon);
    DECLARE @KM FLOAT = (SELECT COALESCE(KhuyenMai,0) FROM HOADON WHERE MaHoaDon = @MaHoaDon);
    RETURN @TongTruoc * (1 - (@KM/100.0));
END;
GO

/* =========================================================
   3) PROCEDURES (nghiệp vụ tối thiểu)
   ========================================================= */

-- Recalc hóa đơn (đúng ràng buộc "TongTien = tổng chi tiết")
CREATE OR ALTER PROCEDURE dbo.sp_RecalcHoaDon
    @MaHoaDon VARCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE HOADON
    SET TongTien = dbo.fn_TongTienHoaDon(@MaHoaDon)
    WHERE MaHoaDon = @MaHoaDon;
END;
GO

-- Tạo hóa đơn
CREATE OR ALTER PROCEDURE dbo.sp_TaoHoaDon
    @MaHoaDon VARCHAR(10),
    @NhanVienLap VARCHAR(10),
    @MaKH VARCHAR(10),
    @HinhThucThanhToan NVARCHAR(50),
    @KhuyenMai FLOAT = 0
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO HOADON(MaHoaDon, NhanVienLap, MaKH, HinhThucThanhToan, KhuyenMai, TongTien)
    VALUES (@MaHoaDon, @NhanVienLap, @MaKH, @HinhThucThanhToan, @KhuyenMai, 0);

    EXEC dbo.sp_RecalcHoaDon @MaHoaDon;
END;
GO

-- Thêm phiên dịch vụ
CREATE OR ALTER PROCEDURE dbo.sp_ThemPhienDichVu
    @MaPhien VARCHAR(10),
    @MaHoaDon VARCHAR(10),
    @MaThuCung VARCHAR(10),
    @MaDV VARCHAR(10),
    @GiaTien DECIMAL(18,2)
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO PHIENDICHVU(MaPhien, MaHoaDon, MaThuCung, MaDV, GiaTien)
    VALUES (@MaPhien, @MaHoaDon, @MaThuCung, @MaDV, @GiaTien);

    EXEC dbo.sp_RecalcHoaDon @MaHoaDon;
END;
GO

-- Kê thuốc (trừ kho chi nhánh của NV lập hóa đơn)
CREATE OR ALTER PROCEDURE dbo.sp_KeThuoc
    @MaPhien VARCHAR(10),
    @MaThuoc VARCHAR(10),
    @SoLuong INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @SoLuong <= 0 THROW 60001, N'Số lượng thuốc phải > 0', 1;

    DECLARE @MaHoaDon VARCHAR(10), @NhanVienLap VARCHAR(10), @MaCN VARCHAR(10);

    SELECT @MaHoaDon = MaHoaDon FROM PHIENDICHVU WHERE MaPhien = @MaPhien;
    IF @MaHoaDon IS NULL THROW 60002, N'Không tìm thấy phiên dịch vụ', 1;

    SELECT @NhanVienLap = NhanVienLap FROM HOADON WHERE MaHoaDon = @MaHoaDon;
    SELECT @MaCN = MaCN FROM NHANVIEN WHERE MaNV = @NhanVienLap;

    IF @MaCN IS NULL THROW 60003, N'Không xác định chi nhánh', 1;

    -- Upsert TOATHUOC
    MERGE TOATHUOC AS t
    USING (SELECT @MaPhien AS MaPhien, @MaThuoc AS MaThuoc) AS s
    ON (t.MaPhien = s.MaPhien AND t.MaThuoc = s.MaThuoc)
    WHEN MATCHED THEN UPDATE SET Soluong = t.Soluong + @SoLuong
    WHEN NOT MATCHED THEN INSERT (MaPhien, MaThuoc, Soluong) VALUES (@MaPhien, @MaThuoc, @SoLuong);

    -- Trừ kho
    UPDATE CHINHANH_SANPHAM
    SET SoLuongTonKho = SoLuongTonKho - @SoLuong
    WHERE MaCN = @MaCN AND MaSP = @MaThuoc;

    IF @@ROWCOUNT = 0 THROW 60004, N'Sản phẩm không có trong kho chi nhánh', 1;

    IF EXISTS (SELECT 1 FROM CHINHANH_SANPHAM WHERE MaCN=@MaCN AND MaSP=@MaThuoc AND SoLuongTonKho < 0)
        THROW 60005, N'Không đủ tồn kho để kê thuốc', 1;

    EXEC dbo.sp_RecalcHoaDon @MaHoaDon;
END;
GO

-- Mua hàng (không phải thuốc) + trừ kho
CREATE OR ALTER PROCEDURE dbo.sp_MuaHang
    @MaPhien VARCHAR(10),
    @MaSP VARCHAR(10),
    @SoLuong INT
AS
BEGIN
    SET NOCOUNT ON;

    IF @SoLuong <= 0 THROW 61001, N'Số lượng mua phải > 0', 1;

    DECLARE @MaHoaDon VARCHAR(10), @NhanVienLap VARCHAR(10), @MaCN VARCHAR(10);

    SELECT @MaHoaDon = MaHoaDon FROM PHIENDICHVU WHERE MaPhien = @MaPhien;
    IF @MaHoaDon IS NULL THROW 61002, N'Không tìm thấy phiên dịch vụ', 1;

    SELECT @NhanVienLap = NhanVienLap FROM HOADON WHERE MaHoaDon = @MaHoaDon;
    SELECT @MaCN = MaCN FROM NHANVIEN WHERE MaNV = @NhanVienLap;
    IF @MaCN IS NULL THROW 61003, N'Không xác định chi nhánh', 1;

    MERGE MUAHANG AS t
    USING (SELECT @MaPhien AS MaPhien, @MaSP AS MaSP) AS s
    ON (t.MaPhien = s.MaPhien AND t.MaSP = s.MaSP)
    WHEN MATCHED THEN UPDATE SET SoLuong = t.SoLuong + @SoLuong
    WHEN NOT MATCHED THEN INSERT (MaPhien, MaSP, SoLuong) VALUES (@MaPhien, @MaSP, @SoLuong);

    UPDATE CHINHANH_SANPHAM
    SET SoLuongTonKho = SoLuongTonKho - @SoLuong
    WHERE MaCN = @MaCN AND MaSP = @MaSP;

    IF @@ROWCOUNT = 0 THROW 61004, N'Sản phẩm không có trong kho chi nhánh', 1;

    IF EXISTS (SELECT 1 FROM CHINHANH_SANPHAM WHERE MaCN=@MaCN AND MaSP=@MaSP AND SoLuongTonKho < 0)
        THROW 61005, N'Không đủ tồn kho để mua hàng', 1;

    EXEC dbo.sp_RecalcHoaDon @MaHoaDon;
END;
GO

-- Mua gói: ghi MUA_GOI + cấp liều vào GOI_KHACHHANG_VACCINE
CREATE OR ALTER PROCEDURE dbo.sp_MuaGoiTiemPhong
    @MaHoaDon VARCHAR(10),
    @MaGoi VARCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;

    DECLARE @MaKH VARCHAR(10);
    SELECT @MaKH = MaKH FROM HOADON WHERE MaHoaDon = @MaHoaDon;
    IF @MaKH IS NULL THROW 62001, N'Không tìm thấy hóa đơn', 1;

    INSERT INTO MUA_GOI(MaKH, MaGoi, MaHoaDon)
    VALUES (@MaKH, @MaGoi, @MaHoaDon);

    MERGE GOI_KHACHHANG_VACCINE AS t
    USING (
        SELECT @MaKH AS MaKH, gtpv.MaGoi, gtpv.MaVC, gtpv.SoLieu
        FROM GOITIEMPHONG_VACCINE gtpv
        WHERE gtpv.MaGoi = @MaGoi
    ) AS s
    ON (t.MaKH = s.MaKH AND t.MaGoi = s.MaGoi AND t.MaVC = s.MaVC)
    WHEN MATCHED THEN UPDATE SET Solieuconlai = t.Solieuconlai + s.SoLieu
    WHEN NOT MATCHED THEN
        INSERT (MaKH, MaGoi, MaVC, Solieuconlai)
        VALUES (s.MaKH, s.MaGoi, s.MaVC, s.SoLieu);

    EXEC dbo.sp_RecalcHoaDon @MaHoaDon;
END;
GO

-- Tiêm phòng: nếu có gói -> trừ liều còn lại; luôn trừ tồn kho vaccine (<= tồn kho)
CREATE OR ALTER PROCEDURE dbo.sp_TiemPhong
    @MaPhien VARCHAR(10),
    @MaVC VARCHAR(10),
    @MaGoi VARCHAR(10) = NULL,
    @BacSiPhuTrach VARCHAR(10),
    @NgayTiem DATE,
    @SoLieu FLOAT
AS
BEGIN
    SET NOCOUNT ON;

    IF @SoLieu <= 0 THROW 63001, N'Số liều phải > 0', 1;

    DECLARE @MaHoaDon VARCHAR(10), @MaKH VARCHAR(10), @NhanVienLap VARCHAR(10), @MaCN VARCHAR(10);

    SELECT @MaHoaDon = MaHoaDon FROM PHIENDICHVU WHERE MaPhien = @MaPhien;
    IF @MaHoaDon IS NULL THROW 63002, N'Không tìm thấy phiên dịch vụ', 1;

    SELECT @MaKH = MaKH, @NhanVienLap = NhanVienLap FROM HOADON WHERE MaHoaDon = @MaHoaDon;
    SELECT @MaCN = MaCN FROM NHANVIEN WHERE MaNV = @NhanVienLap;
    IF @MaCN IS NULL THROW 63003, N'Không xác định chi nhánh', 1;

    -- Nếu dùng gói: phải đủ liều còn lại
    IF @MaGoi IS NOT NULL
    BEGIN
        IF NOT EXISTS (
            SELECT 1
            FROM GOI_KHACHHANG_VACCINE
            WHERE MaKH = @MaKH AND MaGoi = @MaGoi AND MaVC = @MaVC AND Solieuconlai >= @SoLieu
        )
            THROW 63004, N'Không đủ liều còn lại trong gói', 1;

        UPDATE GOI_KHACHHANG_VACCINE
        SET Solieuconlai = Solieuconlai - @SoLieu
        WHERE MaKH = @MaKH AND MaGoi = @MaGoi AND MaVC = @MaVC;
    END

    -- Ghi nhận tiêm
    INSERT INTO TIEMPHONG(MaPhien, MaVC, MaGoi, BacSiPhuTrach, NgayTiem, SoLieu)
    VALUES (@MaPhien, @MaVC, @MaGoi, @BacSiPhuTrach, @NgayTiem, @SoLieu);

    -- Trừ kho vaccine (dùng CEILING để khớp kho đơn vị nguyên)
    UPDATE CHINHANH_VACCINE
    SET SoLuongTonKho = SoLuongTonKho - CONVERT(INT, CEILING(@SoLieu))
    WHERE MaCN = @MaCN AND MaVC = @MaVC;

    IF @@ROWCOUNT = 0 THROW 63005, N'Vaccine không có trong kho chi nhánh', 1;

    IF EXISTS (SELECT 1 FROM CHINHANH_VACCINE WHERE MaCN=@MaCN AND MaVC=@MaVC AND SoLuongTonKho < 0)
        THROW 63006, N'Không đủ tồn kho vaccine', 1;

    EXEC dbo.sp_RecalcHoaDon @MaHoaDon;
END;
GO




















/* =========================================================
   4) TRIGGERS (ràng buộc báo cáo)
   ========================================================= */

-- (A) NhanVienLap phải là "Nhân viên bán hàng"
CREATE OR ALTER TRIGGER dbo.trg_HOADON_NhanVienLap_BanHang
ON HOADON
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF EXISTS (
        SELECT 1
        FROM inserted i
        JOIN NHANVIEN nv ON nv.MaNV = i.NhanVienLap
        WHERE nv.ChucVu <> N'Nhân viên bán hàng'
    )
    BEGIN
        ROLLBACK;
        THROW 70001, N'NhanVienLap phải có ChucVu = Nhân viên bán hàng', 1;
    END
END;
GO

-- (B) MaThuoc phải là SANPHAM.LoaiSP = "Thuốc"
CREATE OR ALTER TRIGGER dbo.trg_TOATHUOC_OnlyDrug
ON TOATHUOC
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted i
        JOIN SANPHAM sp ON sp.MaSP = i.MaThuoc
        WHERE sp.LoaiSP <> N'Thuốc'
    )
    BEGIN
        ROLLBACK;
        THROW 70002, N'MaThuoc phải tham chiếu SANPHAM có LoaiSP = Thuốc', 1;
    END
END;
GO

-- (C) MUAHANG không được mua Thuốc (khuyến nghị để tách đúng nghiệp vụ)
CREATE OR ALTER TRIGGER dbo.trg_MUAHANG_NotDrug
ON MUAHANG
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted i
        JOIN SANPHAM sp ON sp.MaSP = i.MaSP
        WHERE sp.LoaiSP = N'Thuốc'
    )
    BEGIN
        ROLLBACK;
        THROW 70003, N'MUAHANG không dùng cho sản phẩm LoaiSP = Thuốc (hãy dùng TOATHUOC)', 1;
    END
END;
GO

-- (D) MUA_GOI: MaKH phải đúng MaKH của hóa đơn
CREATE OR ALTER TRIGGER dbo.trg_MUA_GOI_MaKH_MatchHoaDon
ON MUA_GOI
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF EXISTS (
        SELECT 1
        FROM inserted i
        JOIN HOADON h ON h.MaHoaDon = i.MaHoaDon
        WHERE h.MaKH <> i.MaKH
    )
    BEGIN
        ROLLBACK;
        THROW 70004, N'MUA_GOI.MaKH phải trùng HOADON.MaKH', 1;
    END
END;
GO

-- (E) LICHSUDIEUDONG: chặn chồng lấn thời gian điều động cho cùng nhân viên
CREATE OR ALTER TRIGGER dbo.trg_LICHSUDIEUDONG_NoOverlap
ON LICHSUDIEUDONG
AFTER INSERT, UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    -- Overlap condition: [a,b) overlaps [c,d) if a < d AND c < b
    IF EXISTS (
        SELECT 1
        FROM inserted i
        JOIN LICHSUDIEUDONG x
          ON x.MaNV = i.MaNV
         AND NOT (x.MaCN = i.MaCN AND x.NgayBD = i.NgayBD) -- tránh tự so sánh cùng bản ghi PK
         AND (i.NgayBD < x.NgayKT AND x.NgayBD < i.NgayKT)
    )
    BEGIN
        ROLLBACK;
        THROW 70005, N'Lịch điều động bị chồng lấn thời gian cho cùng nhân viên', 1;
    END
END;
GO

-- (F) Tự động cập nhật TongTien = tổng chi tiết hóa đơn
CREATE OR ALTER TRIGGER dbo.trg_RecalcHoaDon_OnPHIENDICHVU
ON PHIENDICHVU
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    ;WITH A AS (
        SELECT MaHoaDon FROM inserted
        UNION
        SELECT MaHoaDon FROM deleted
    )
    SELECT DISTINCT MaHoaDon INTO #t FROM A WHERE MaHoaDon IS NOT NULL;

    DECLARE @hd VARCHAR(10);
    DECLARE cur CURSOR LOCAL FAST_FORWARD FOR SELECT MaHoaDon FROM #t;
    OPEN cur;
    FETCH NEXT FROM cur INTO @hd;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC dbo.sp_RecalcHoaDon @hd;
        FETCH NEXT FROM cur INTO @hd;
    END
    CLOSE cur;
    DEALLOCATE cur;
END;
GO

CREATE OR ALTER TRIGGER dbo.trg_RecalcHoaDon_OnTOATHUOC
ON TOATHUOC
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    ;WITH P AS (
        SELECT MaPhien FROM inserted
        UNION
        SELECT MaPhien FROM deleted
    ),
    H AS (
        SELECT DISTINCT pd.MaHoaDon
        FROM P
        JOIN PHIENDICHVU pd ON pd.MaPhien = P.MaPhien
    )
    SELECT MaHoaDon INTO #t FROM H;

    DECLARE @hd VARCHAR(10);
    DECLARE cur CURSOR LOCAL FAST_FORWARD FOR SELECT MaHoaDon FROM #t;
    OPEN cur;
    FETCH NEXT FROM cur INTO @hd;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC dbo.sp_RecalcHoaDon @hd;
        FETCH NEXT FROM cur INTO @hd;
    END
    CLOSE cur;
    DEALLOCATE cur;
END;
GO

CREATE OR ALTER TRIGGER dbo.trg_RecalcHoaDon_OnMUAHANG
ON MUAHANG
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    ;WITH P AS (
        SELECT MaPhien FROM inserted
        UNION
        SELECT MaPhien FROM deleted
    ),
    H AS (
        SELECT DISTINCT pd.MaHoaDon
        FROM P
        JOIN PHIENDICHVU pd ON pd.MaPhien = P.MaPhien
    )
    SELECT MaHoaDon INTO #t FROM H;

    DECLARE @hd VARCHAR(10);
    DECLARE cur CURSOR LOCAL FAST_FORWARD FOR SELECT MaHoaDon FROM #t;
    OPEN cur;
    FETCH NEXT FROM cur INTO @hd;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC dbo.sp_RecalcHoaDon @hd;
        FETCH NEXT FROM cur INTO @hd;
    END
    CLOSE cur;
    DEALLOCATE cur;
END;
GO

CREATE OR ALTER TRIGGER dbo.trg_RecalcHoaDon_OnTIEMPHONG
ON TIEMPHONG
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    ;WITH P AS (
        SELECT MaPhien FROM inserted
        UNION
        SELECT MaPhien FROM deleted
    ),
    H AS (
        SELECT DISTINCT pd.MaHoaDon
        FROM P
        JOIN PHIENDICHVU pd ON pd.MaPhien = P.MaPhien
    )
    SELECT MaHoaDon INTO #t FROM H;

    DECLARE @hd VARCHAR(10);
    DECLARE cur CURSOR LOCAL FAST_FORWARD FOR SELECT MaHoaDon FROM #t;
    OPEN cur;
    FETCH NEXT FROM cur INTO @hd;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC dbo.sp_RecalcHoaDon @hd;
        FETCH NEXT FROM cur INTO @hd;
    END
    CLOSE cur;
    DEALLOCATE cur;
END;
GO

CREATE OR ALTER TRIGGER dbo.trg_RecalcHoaDon_OnMUA_GOI
ON MUA_GOI
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    ;WITH H AS (
        SELECT MaHoaDon FROM inserted
        UNION
        SELECT MaHoaDon FROM deleted
    )
    SELECT DISTINCT MaHoaDon INTO #t FROM H WHERE MaHoaDon IS NOT NULL;

    DECLARE @hd VARCHAR(10);
    DECLARE cur CURSOR LOCAL FAST_FORWARD FOR SELECT MaHoaDon FROM #t;
    OPEN cur;
    FETCH NEXT FROM cur INTO @hd;
    WHILE @@FETCH_STATUS = 0
    BEGIN
        EXEC dbo.sp_RecalcHoaDon @hd;
        FETCH NEXT FROM cur INTO @hd;
    END
    CLOSE cur;
    DEALLOCATE cur;
END;
GO
