USE PetCareX;
GO
/* =========================================================
   1. FUNCTION: Giá gói tiêm
   ========================================================= */
CREATE OR ALTER FUNCTION dbo.fn_GiaGoiTiemPhong(@MaGoi VARCHAR(10))
RETURNS DECIMAL(18,2)
AS
BEGIN
    DECLARE @Gia DECIMAL(18,2);

    SELECT 
        @Gia = SUM(gtpv.SoLieu * vc.DonGia)
               * (1 - ISNULL(g.KhuyenMai,0)/100.0)
    FROM GOITIEMPHONG g
    LEFT JOIN GOITIEMPHONG_VACCINE gtpv ON g.MaGoi = gtpv.MaGoi
    LEFT JOIN VACCINE vc ON vc.MaVC = gtpv.MaVC
    WHERE g.MaGoi = @MaGoi
    GROUP BY g.KhuyenMai;

    RETURN ISNULL(@Gia,0);
END;
GO

/* =========================================================
   2. FUNCTION: Tổng tiền hóa đơn
   ========================================================= */
CREATE OR ALTER FUNCTION dbo.fn_CalculateHoaDonTotal(@MaHoaDon VARCHAR(10))
RETURNS DECIMAL(18,2)
AS
BEGIN
    DECLARE @Tong DECIMAL(18,2) = 0;

    -- Dịch vụ
    SELECT @Tong += ISNULL(SUM(GiaTien),0)
    FROM PHIENDICHVU
    WHERE MaHoaDon = @MaHoaDon;

    -- Thuốc
    SELECT @Tong += ISNULL(SUM(tt.Soluong * sp.DonGia),0)
    FROM PHIENDICHVU pd
    JOIN TOATHUOC tt ON pd.MaPhien = tt.MaPhien
    JOIN SANPHAM sp ON tt.MaThuoc = sp.MaSP
    WHERE pd.MaHoaDon = @MaHoaDon;

    -- Mua hàng
    SELECT @Tong += ISNULL(SUM(mh.SoLuong * sp.DonGia),0)
    FROM PHIENDICHVU pd
    JOIN MUAHANG mh ON pd.MaPhien = mh.MaPhien
    JOIN SANPHAM sp ON mh.MaSP = sp.MaSP
    WHERE pd.MaHoaDon = @MaHoaDon;

    -- Tiêm lẻ
    SELECT @Tong += ISNULL(SUM(tp.SoLieu * vc.DonGia),0)
    FROM PHIENDICHVU pd
    JOIN TIEMPHONG tp ON pd.MaPhien = tp.MaPhien
    JOIN VACCINE vc ON tp.MaVC = vc.MaVC
    WHERE pd.MaHoaDon = @MaHoaDon
      AND tp.MaGoi IS NULL;

    -- Gói
    SELECT @Tong += ISNULL(SUM(dbo.fn_GiaGoiTiemPhong(MaGoi)),0)
    FROM MUA_GOI
    WHERE MaHoaDon = @MaHoaDon;

    -- Khuyến mãi hóa đơn
    SELECT @Tong = @Tong * (1 - ISNULL(KhuyenMai,0)/100.0)
    FROM HOADON
    WHERE MaHoaDon = @MaHoaDon;

    RETURN @Tong;
END;
GO

/* =========================================================
   3. TRIGGER: Recalculate hóa đơn (TRUNG TÂM)
   ========================================================= */
CREATE OR ALTER TRIGGER trg_RecalcHD_All
ON PHIENDICHVU
AFTER INSERT, UPDATE, DELETE
AS
BEGIN
    SET NOCOUNT ON;

    UPDATE h
    SET TongTien = dbo.fn_CalculateHoaDonTotal(h.MaHoaDon)
    FROM HOADON h
    WHERE h.MaHoaDon IN (
        SELECT MaHoaDon FROM inserted
        UNION
        SELECT MaHoaDon FROM deleted
    );
END;
GO

/* =========================================================
   4. PROCEDURE: Kê thuốc (KHÔNG TRỪ KHO)
   ========================================================= */
CREATE OR ALTER PROCEDURE sp_KeThuoc
    @MaPhien VARCHAR(10),
    @MaThuoc VARCHAR(10),
    @SoLuong INT
AS
BEGIN
    SET NOCOUNT ON;

    INSERT INTO TOATHUOC (MaPhien, MaThuoc, Soluong)
    VALUES (@MaPhien, @MaThuoc, @SoLuong);
END;
GO

/* =========================================================
   5. TRIGGER: Chặn chỉnh sửa sau CONFIRMED
   ========================================================= */
CREATE OR ALTER TRIGGER trg_BlockEditConfirmed_TOATHUOC
ON TOATHUOC
AFTER UPDATE, DELETE
AS
BEGIN
    IF EXISTS (
        SELECT 1
        FROM deleted d
        JOIN PHIENDICHVU pd ON d.MaPhien = pd.MaPhien
        WHERE pd.TrangThai = N'CONFIRMED'
    )
        THROW 50010, N'Không được chỉnh sửa toa thuốc sau khi đã thanh toán', 1;
END;
GO

CREATE OR ALTER TRIGGER trg_BlockEditConfirmed_MUAHANG
ON MUAHANG
AFTER UPDATE, DELETE
AS
BEGIN
    IF EXISTS (
        SELECT 1
        FROM deleted d
        JOIN PHIENDICHVU pd ON d.MaPhien = pd.MaPhien
        WHERE pd.TrangThai = N'CONFIRMED'
    )
        THROW 50011, N'Không được chỉnh sửa mua hàng sau khi đã thanh toán', 1;
END;
GO

CREATE OR ALTER TRIGGER trg_BlockEditConfirmed_TIEMPHONG
ON TIEMPHONG
AFTER UPDATE, DELETE
AS
BEGIN
    IF EXISTS (
        SELECT 1
        FROM deleted d
        JOIN PHIENDICHVU pd ON d.MaPhien = pd.MaPhien
        WHERE pd.TrangThai = N'CONFIRMED'
    )
        THROW 50012, N'Không được chỉnh sửa tiêm phòng sau khi đã thanh toán', 1;
END;
GO

CREATE OR ALTER TRIGGER trg_BlockEditConfirmed_PHIENDICHVU
ON PHIENDICHVU
AFTER UPDATE, DELETE
AS
BEGIN
    IF EXISTS (
        SELECT 1 FROM deleted WHERE TrangThai = N'CONFIRMED'
    )
        THROW 50013, N'Không được chỉnh sửa phiên dịch vụ đã thanh toán', 1;
END;
GO

/* =========================================================
   6. TRIGGER: Check MaKH khi mua gói
   ========================================================= */
CREATE OR ALTER TRIGGER trg_Check_MuaGoi_KH
ON MUA_GOI
AFTER INSERT, UPDATE
AS
BEGIN
    IF EXISTS (
        SELECT 1
        FROM inserted i
        JOIN HOADON h ON i.MaHoaDon = h.MaHoaDon
        WHERE i.MaKH <> h.MaKH
    )
    BEGIN
        RAISERROR(N'Lỗi: Mã khách hàng không khớp với hóa đơn!',16,1);
        ROLLBACK;
    END
END;
GO

/* =========================================================
   7. PROCEDURE: CONFIRM PHIÊN DỊCH VỤ (CHỐT NGHIỆP VỤ)
   ========================================================= */
-- 2. Cập nhật lại Procedure xác nhận hóa đơn (Đa chi nhánh)
CREATE OR ALTER PROCEDURE dbo.sp_ConfirmHoaDon
    @MaHoaDon        VARCHAR(10),
    @HinhThucTT      NVARCHAR(50),
    @NhanVienLap     VARCHAR(10) = 'NV_SYSTEM'
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;

        -- 0. Check còn phiên cần thanh toán không
        IF NOT EXISTS (
            SELECT 1 FROM PHIENDICHVU
            WHERE MaHoaDon = @MaHoaDon
              AND TrangThai = N'BOOKING'
        )
            THROW 50020, N'Hóa đơn không còn phiên nào cần thanh toán', 1;

        -- 1. Check tồn kho
        IF EXISTS (
            SELECT 1
            FROM MUAHANG mh
            JOIN PHIENDICHVU pd ON mh.MaPhien = pd.MaPhien
            JOIN CHINHANH_SANPHAM csp 
                 ON csp.MaSP = mh.MaSP AND csp.MaCN = pd.MaCN
            WHERE pd.MaHoaDon = @MaHoaDon 
              AND pd.TrangThai = N'BOOKING'
              AND csp.SoLuongTonKho < mh.SoLuong
        )
            THROW 50021, N'Một số sản phẩm không đủ hàng tại chi nhánh đã chọn', 1;

        -- 2. Trừ kho
        UPDATE csp
        SET csp.SoLuongTonKho -= mh.SoLuong
        FROM MUAHANG mh
        JOIN PHIENDICHVU pd ON mh.MaPhien = pd.MaPhien
        JOIN CHINHANH_SANPHAM csp 
             ON csp.MaSP = mh.MaSP AND csp.MaCN = pd.MaCN
        WHERE pd.MaHoaDon = @MaHoaDon 
          AND pd.TrangThai = N'BOOKING';

        -- 3. Confirm phiên
        UPDATE pd
        SET 
            pd.GiaTien = CASE 
                WHEN pd.MaDV = 'DV_RETAIL' THEN 0
                WHEN pd.GiaTien IS NULL OR pd.GiaTien = 0 THEN dv.DonGia
                ELSE pd.GiaTien
            END,
            pd.TrangThai = N'CONFIRMED',
            pd.ThoiDiemKetThuc = GETDATE()
        FROM PHIENDICHVU pd
        LEFT JOIN DICHVU dv ON pd.MaDV = dv.MaDV
        WHERE pd.MaHoaDon = @MaHoaDon 
          AND pd.TrangThai = N'BOOKING';

        -- 4. Update hóa đơn
        UPDATE HOADON
        SET 
            HinhThucThanhToan = @HinhThucTT,
            NhanVienLap = @NhanVienLap,
            NgayLap = GETDATE(),
            TongTien = dbo.fn_CalculateHoaDonTotal(@MaHoaDon)
        WHERE MaHoaDon = @MaHoaDon;

        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END;


CREATE OR ALTER PROCEDURE dbo.sp_MuaGoiTiemPhong
    @MaKH VARCHAR(10),
    @MaGoi VARCHAR(10),
    @MaHoaDon VARCHAR(10)
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;

        -- 1. Kiểm tra hóa đơn thuộc khách
        IF NOT EXISTS (
            SELECT 1 FROM HOADON
            WHERE MaHoaDon = @MaHoaDon
              AND MaKH = @MaKH
        )
            THROW 50030, N'Hóa đơn không thuộc khách hàng', 1;

        -- 2. Ghi nhận mua gói
        IF NOT EXISTS (
            SELECT 1 FROM MUA_GOI
            WHERE MaKH = @MaKH AND MaGoi = @MaGoi AND MaHoaDon = @MaHoaDon
        )
        INSERT INTO MUA_GOI (MaKH, MaGoi, MaHoaDon)
        VALUES (@MaKH, @MaGoi, @MaHoaDon);

        -- 3. Cấp quyền vaccine
        INSERT INTO GOI_KHACHHANG_VACCINE (MaKH, MaGoi, MaVC, Solieuconlai)
        SELECT
            @MaKH,
            g.MaGoi,
            g.MaVC,
            g.SoLieu
        FROM GOITIEMPHONG_VACCINE g
        WHERE g.MaGoi = @MaGoi
          AND NOT EXISTS (
              SELECT 1
              FROM GOI_KHACHHANG_VACCINE x
              WHERE x.MaKH = @MaKH
                AND x.MaGoi = g.MaGoi
                AND x.MaVC = g.MaVC
          );

        -- 4. Áp khuyến mãi vào hóa đơn
        UPDATE HOADON
        SET KhuyenMai = (
            SELECT KhuyenMai FROM GOITIEMPHONG WHERE MaGoi = @MaGoi
        )
        WHERE MaHoaDon = @MaHoaDon;

        -- 5. Recalculate
        UPDATE HOADON
        SET TongTien = dbo.fn_CalculateHoaDonTotal(@MaHoaDon)
        WHERE MaHoaDon = @MaHoaDon;

        COMMIT;
    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END;
GO
