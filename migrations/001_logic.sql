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
CREATE OR ALTER PROCEDURE dbo.sp_ConfirmPhienDichVu
    @MaPhien        VARCHAR(10),
    @NhanVienLap    VARCHAR(10) = NULL,
    @HinhThucTT     NVARCHAR(50),
    @KhuyenMai      FLOAT = 0
AS
BEGIN
    SET NOCOUNT ON;
    SET XACT_ABORT ON;

    BEGIN TRY
        BEGIN TRAN;

        IF @NhanVienLap IS NULL
            SET @NhanVienLap = 'NV_SYSTEM';

        DECLARE 
            @MaHoaDon VARCHAR(10),
            @MaKH VARCHAR(10),
            @TrangThai NVARCHAR(20),
            @GiaDichVu DECIMAL(18,2);

        /* 1. Kiểm tra phiên dịch vụ */
        SELECT 
            @TrangThai = pd.TrangThai,
            @MaKH = tc.MaKH
        FROM PHIENDICHVU pd
        JOIN THUCUNG tc ON pd.MaThuCung = tc.MaThuCung
        WHERE pd.MaPhien = @MaPhien;

        IF @TrangThai IS NULL
            THROW 50001, N'Phiên dịch vụ không tồn tại', 1;

        IF @TrangThai <> N'BOOKING'
            THROW 50002, N'Chỉ được xác nhận phiên ở trạng thái BOOKING', 1;

        /* 2. LẤY GIÁ DỊCH VỤ (CHỐT GIÁ) */
        SELECT @GiaDichVu = dv.DonGia
        FROM PHIENDICHVU pd
        JOIN DICHVU dv ON pd.MaDV = dv.MaDV
        WHERE pd.MaPhien = @MaPhien;

        IF @GiaDichVu IS NULL
            THROW 50005, N'Không xác định được giá dịch vụ', 1;

        /* 3. Tạo hóa đơn */
        EXEC dbo.sp_TaoHoaDon
            @MaHoaDon OUTPUT,
            @NhanVienLap,
            @MaKH,
            @HinhThucTT,
            @KhuyenMai;

        /* 4. CHECK THUỐC TRƯỚC KHI TRỪ */
        IF EXISTS (
            SELECT 1
            FROM TOATHUOC tt
            JOIN PHIENDICHVU pd ON tt.MaPhien = pd.MaPhien
            JOIN HOADON h ON pd.MaHoaDon = h.MaHoaDon
            JOIN NHANVIEN nv ON h.NhanVienLap = nv.MaNV
            JOIN CHINHANH_SANPHAM csp
                ON csp.MaSP = tt.MaThuoc AND csp.MaCN = nv.MaCN
            WHERE pd.MaPhien = @MaPhien
              AND csp.SoLuongTonKho < tt.Soluong
        )
            THROW 50003, N'Không đủ thuốc trong kho', 1;

        /* 5. TRỪ KHO THUỐC */
        UPDATE csp
        SET csp.SoLuongTonKho -= tt.Soluong
        FROM TOATHUOC tt
        JOIN PHIENDICHVU pd ON tt.MaPhien = pd.MaPhien
        JOIN HOADON h ON pd.MaHoaDon = h.MaHoaDon
        JOIN NHANVIEN nv ON h.NhanVienLap = nv.MaNV
        JOIN CHINHANH_SANPHAM csp
            ON csp.MaSP = tt.MaThuoc AND csp.MaCN = nv.MaCN
        WHERE pd.MaPhien = @MaPhien;

        /* 6. CHỐT PHIÊN + GHI GIÁ */
        UPDATE PHIENDICHVU
        SET 
            MaHoaDon = @MaHoaDon,
            GiaTien = @GiaDichVu,
            TrangThai = N'CONFIRMED',
            ThoiDiemKetThuc = GETDATE()
        WHERE MaPhien = @MaPhien;

        COMMIT;

        SELECT 
            N'OK' AS Status,
            @MaHoaDon AS MaHoaDon,
            @MaPhien AS MaPhien,
            @GiaDichVu AS GiaDichVu;

    END TRY
    BEGIN CATCH
        IF @@TRANCOUNT > 0 ROLLBACK;
        THROW;
    END CATCH
END;
GO
