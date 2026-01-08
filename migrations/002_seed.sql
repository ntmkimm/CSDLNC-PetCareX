USE PetCareX;
GO

-- 1. CHINHANH
INSERT INTO CHINHANH (MaCN, TenCN, Diachi, SDT, Giomocua, Giodongcua) VALUES
('CN001', N'PetCare Quận 1', N'123 Lê Lợi, Q1, HCM', '0901111001', '08:00', '21:00'),
('CN002', N'PetCare Quận 7', N'456 Nguyễn Lương Bằng, Q7, HCM', '0901111002', '08:00', '21:00'),
('CN003', N'PetCare Bình Thạnh', N'789 Điện Biên Phủ, BT, HCM', '0901111003', '08:00', '21:00'),
('CN004', N'PetCare Thủ Đức', N'101 Võ Văn Ngân, TĐ, HCM', '0901111004', '08:00', '21:00'),
('CN005', N'PetCare Quận 10', N'202 Ba Tháng Hai, Q10, HCM', '0901111005', '08:00', '21:00'),
('CN006', N'PetCare Gò Vấp', N'303 Quang Trung, GV, HCM', '0901111006', '08:00', '21:00'),
('CN007', N'PetCare Quận 5', N'404 Trần Hưng Đạo, Q5, HCM', '0901111007', '08:00', '21:00'),
('CN008', N'PetCare Quận 3', N'505 Cách Mạng Tháng 8, Q3, HCM', '0901111008', '08:00', '21:00'),
('CN009', N'PetCare Tân Bình', N'606 Cộng Hòa, TB, HCM', '0901111009', '08:00', '21:00'),
('CN010', N'PetCare Phú Nhuận', N'707 Phan Xích Long, PN, HCM', '0901111010', '08:00', '21:00');
GO

-- 2. NHANVIEN HỆ THỐNG
IF NOT EXISTS (SELECT 1 FROM NHANVIEN WHERE MaNV = 'NV_SYSTEM')
BEGIN
    INSERT INTO NHANVIEN (MaNV, HoTen, ChucVu, MaCN, Luong)
    VALUES ('NV_SYSTEM', N'Hệ thống thanh toán online', N'Nhân viên bán hàng', 'CN001', 0);
END
GO

-- 3. DICHVU
INSERT INTO DICHVU (MaDV, TenDV, DonGia) VALUES
('DV001', N'Khám bệnh đa khoa',        150000),
('DV002', N'Tiêm phòng Vaccine',       200000),
('DV003', N'Tắm rửa & Vệ sinh',        120000),
('DV004', N'Cắt tỉa lông nghệ thuật',  180000),
('DV005', N'Lưu trú nội trú',          250000),
('DV006', N'Xét nghiệm máu',           300000),
('DV007', N'Siêu âm / X-Quang',        400000),
('DV008', N'Phẫu thuật triệt sản',    1500000),
('DV009', N'Lấy cao răng',             220000),
('DV010', N'Điều trị nội ký sinh',     180000),
('DV_RETAIL', N'Mua sắm sản phẩm', 0);
GO

-- 4. SANPHAM
INSERT INTO SANPHAM (MaSP, TenSP, LoaiSP, DonGia) VALUES
('SP001', N'Paracetamol Pet', N'Thuốc', 50000),
('SP002', N'Antibiotic A', N'Thuốc', 120000),
('SP003', N'Vitamin C Plus', N'Thuốc', 80000),
('SP004', N'Canxi Nano', N'Thuốc', 150000),
('SP005', N'Thuốc bôi da ZinC', N'Thuốc', 95000),
('SP006', N'Hạt Royal Canin 2kg', N'Thức ăn', 450000),
('SP007', N'Pate Whiskas', N'Thức ăn', 35000),
('SP008', N'Dây dắt tự động', N'Đồ chơi', 250000),
('SP009', N'Chuồng sắt sơn tĩnh điện', N'Phụ kiện', 800000),
('SP010', N'Sữa tắm SOS', N'Phụ kiện', 180000);
GO

-- 5. VACCINE
INSERT INTO VACCINE (MaVC, TenVC, NgaySanXuat, LieuLuong, DonGia) VALUES
('VC001', N'Rabies (Dại)', '2025-01-01', 1.0, 150000),
('VC002', N'4 Bệnh Mèo', '2025-01-01', 0.5, 350000),
('VC003', N'7 Bệnh Chó', '2025-02-01', 1.0, 450000),
('VC004', N'Lepto (Vàng da)', '2025-01-15', 1.0, 200000),
('VC005', N'Parvo (Viêm ruột)', '2025-03-01', 1.0, 300000),
('VC006', N'FIP Mèo', '2025-01-10', 0.5, 500000),
('VC007', N'Bordetella (Ho cũi)', '2025-02-20', 1.0, 250000),
('VC008', N'Lyme Disease', '2025-03-10', 1.0, 400000),
('VC009', N'Canine Influenza', '2025-02-05', 1.0, 380000),
('VC010', N'Giardia Pet', '2025-01-25', 1.0, 280000);
GO

-- 6. GOITIEMPHONG
INSERT INTO GOITIEMPHONG (MaGoi, TenGoi, ThoiGian, KhuyenMai) VALUES
('G001', N'Gói Cún Con Toàn Diện', 12, 10),
('G002', N'Gói Mèo Con Khởi Đầu', 12, 15),
('G003', N'Gói Chăm Sóc Hàng Năm', 12, 5),
('G004', N'Gói Tiêm Nhắc Lại', 6, 0),
('G005', N'Gói Bảo Vệ Mùa Hè', 3, 20),
('G006', N'Gói VIP PetCare', 24, 25),
('G007', N'Gói Tiết Kiệm Standard', 12, 8),
('G008', N'Gói Khám & Tiêm Đặc Biệt', 12, 12),
('G009', N'Gói Combo 3 Bệnh', 6, 10),
('G010', N'Gói Chống Dịch Thu Đông', 4, 15);
GO

-- 7. KHACHHANG
INSERT INTO KHACHHANG (Hoten, CCCD, SDT, Gioitinh, Bac) VALUES
(N'Nguyễn Văn A', '001099000121', '0912345601', N'Nam', N'Cơ bản'),
(N'Trần Thị B', '001099000122', '0912345602', N'Nữ', N'Thân thiết'),
(N'Lê Văn C', '001099000123', '0912345603', N'Nam', N'VIP'),
(N'Phạm Thị D', '001099000124', '0912345604', N'Nữ', N'Cơ bản'),
(N'Hoàng Văn E', '001099000125', '0912345605', N'Nam', N'Thân thiết'),
(N'Đặng Thị F', '001099000126', '0912345606', N'Nữ', N'Cơ bản'),
(N'Bùi Văn G', '001099000127', '0912345607', N'Nam', N'VIP'),
(N'Vũ Thị H', '001099000128', '0912345608', N'Nữ', N'Cơ bản'),
(N'Ngô Văn I', '001099000129', '0912345609', N'Nam', N'Thân thiết'),
(N'Lý Thị K', '001099000130', '0912345610', N'Nữ', N'Cơ bản');
GO

-- 8. NHANVIEN
INSERT INTO NHANVIEN (MaNV, HoTen, NgaySinh, GioiTinh, ChucVu, MaCN, Luong) VALUES
('NV000001', N'Nguyễn Bác Sĩ 1', '1985-05-10', N'Nam', N'Bác sĩ thú y', 'CN001', 20000000),
('NV000002', N'Lê Tiếp Tân 1', '1995-02-20', N'Nữ', N'Tiếp tân', 'CN001', 8000000),
('NV000003', N'Trần Bán Hàng 1', '1992-08-15', N'Nam', N'Nhân viên bán hàng', 'CN001', 9000000),
('NV000004', N'Phạm Quản Lí 1', '1980-01-01', N'Nữ', N'Quản lí', 'CN001', 25000000),
('NV000005', N'Vũ Bác Sĩ 2', '1988-12-12', N'Nam', N'Bác sĩ thú y', 'CN002', 20000000),
('NV000006', N'Hoàng Bán Hàng 2', '1994-06-06', N'Nữ', N'Nhân viên bán hàng', 'CN002', 9000000),
('NV000007', N'Đặng Tiếp Tân 2', '1996-03-03', N'Nữ', N'Tiếp tân', 'CN002', 8000000),
('NV000008', N'Bùi Bác Sĩ 3', '1987-07-07', N'Nam', N'Bác sĩ thú y', 'CN003', 20000000),
('NV000009', N'Ngô Bán Hàng 3', '1993-09-09', N'Nam', N'Nhân viên bán hàng', 'CN003', 9000000),
('NV000010', N'Lý Quản Lí 2', '1982-11-11', N'Nữ', N'Quản lí', 'CN002', 25000000);
GO

-- 9. THUCUNG
-- Chèn THUCUNG (MaThuCung sẽ tự sinh, ta giả định là TC000001 -> TC000010)
INSERT INTO THUCUNG (MaKH, Ten, Loai, Giong, GioiTinh) VALUES
('KH000001', N'Lu Lu', N'Chó', N'Poodle', N'Đực'),
('KH000002', N'Miu Miu', N'Mèo', N'Anh lông ngắn', N'Cái'),
('KH000003', N'Ki Ki', N'Chó', N'Becgie', N'Đực'),
('KH000004', N'Bông', N'Chó', N'Samoyed', N'Cái'),
('KH000005', N'Mun', N'Mèo', N'Mèo mướp', N'Đực'),
('KH000006', N'Milu', N'Chó', N'Phú Quốc', N'Cái'),
('KH000007', N'Xám', N'Mèo', N'Xiêm', N'Đực'),
('KH000008', N'Kem', N'Chó', N'Corgi', N'Cái'),
('KH000009', N'Mập', N'Mèo', N'Ba Tư', N'Đực'),
('KH000010', N'Đen', N'Chó', N'Husky', N'Đực');
GO

-- 10. TAIKHOAN_MATKHAU
INSERT INTO TAIKHOAN_MATKHAU (MaKH, Tendangnhap, Matkhau) 
SELECT MaKH, 'user' + MaKH, '123456' FROM KHACHHANG;
GO

-- 11. TẠO 30 HÓA ĐƠN TRỐNG
DECLARE @i INT = 1;
WHILE @i <= 30
BEGIN
    INSERT INTO HOADON (NhanVienLap, MaKH, HinhThucThanhToan, KhuyenMai)
    VALUES (
        'NV000003', 
        'KH' + RIGHT('000000' + CAST(((@i - 1) % 10) + 1 AS VARCHAR), 6), 
        NULL, 
        0
    );
    SET @i += 1;
END
GO

-- 12. PHIÊN DỊCH VỤ KHÁM BỆNH (10 HĐ đầu)
-- SỬA LỖI: Không dùng FORMATMESSAGE, dùng RIGHT + CAST
INSERT INTO PHIENDICHVU (MaHoaDon, MaThuCung, MaDV, GiaTien, MaCN, TrangThai)
SELECT TOP 10
    h.MaHoaDon,
    'TC' + RIGHT('000000' + CAST(( (ROW_NUMBER() OVER (ORDER BY h.MaHoaDon)-1) % 10) + 1 AS VARCHAR), 6),
    'DV001', 0,
    CASE WHEN ROW_NUMBER() OVER (ORDER BY h.MaHoaDon) % 2 = 0 THEN 'CN002' ELSE 'CN001' END,
    'BOOKING'
FROM HOADON h ORDER BY h.MaHoaDon;
GO

-- 13. KHAMBENH + TOATHUOC
INSERT INTO KHAMBENH (MaPhien, BacSiPhuTrach, CacTrieuChung, ChanDoan)
SELECT MaPhien, 'NV000001', N'Mệt mỏi', N'Khám tổng quát' FROM PHIENDICHVU WHERE MaDV = 'DV001';

INSERT INTO TOATHUOC (MaPhien, MaThuoc, Soluong)
SELECT MaPhien, 'SP001', 2 FROM PHIENDICHVU WHERE MaDV = 'DV001';
GO

-- 14. PHIÊN BÁN LẺ (10 HĐ tiếp theo)
INSERT INTO PHIENDICHVU (MaHoaDon, MaDV, GiaTien, MaCN, TrangThai)
SELECT h.MaHoaDon, 'DV_RETAIL', 0, 'CN001', 'BOOKING'
FROM (SELECT MaHoaDon FROM HOADON ORDER BY MaHoaDon OFFSET 10 ROWS FETCH NEXT 10 ROWS ONLY) h;
GO

INSERT INTO MUAHANG (MaPhien, MaSP, SoLuong)
SELECT pd.MaPhien, 'SP006', 2 FROM PHIENDICHVU pd WHERE pd.MaDV = 'DV_RETAIL';
GO

-- 15. MUA GÓI TIÊM (10 HĐ cuối)
INSERT INTO MUA_GOI (MaKH, MaGoi, MaHoaDon)
SELECT h.MaKH, 'G001', h.MaHoaDon
FROM (SELECT MaHoaDon, MaKH FROM HOADON ORDER BY MaHoaDon OFFSET 20 ROWS FETCH NEXT 10 ROWS ONLY) h;
GO

-- 16. XÁC NHẬN THANH TOÁN
DECLARE @MaHD VARCHAR(10);
DECLARE cur CURSOR FOR SELECT MaHoaDon FROM HOADON;
OPEN cur;
FETCH NEXT FROM cur INTO @MaHD;
WHILE @@FETCH_STATUS = 0
BEGIN
    BEGIN TRY
        EXEC dbo.sp_ConfirmHoaDon @MaHoaDon = @MaHD, @HinhThucTT = N'Tiền mặt', @NhanVienLap = 'NV_SYSTEM';
    END TRY
    BEGIN CATCH
        PRINT 'Lỗi tại ' + @MaHD + ': ' + ERROR_MESSAGE();
    END CATCH;
    FETCH NEXT FROM cur INTO @MaHD;
END
CLOSE cur;
DEALLOCATE cur;
GO