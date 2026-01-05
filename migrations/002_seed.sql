USE PetCareX;
GO

SET NOCOUNT ON;

BEGIN TRAN;

------------------------------------------------------------
-- 0) DỮ LIỆU NỀN: CHINHANH
------------------------------------------------------------
INSERT INTO CHINHANH (MaCN, TenCN, Diachi, SDT, Giomocua, Giodongcua)
VALUES
('CN01', N'PetCareX - Quận 1',  N'123 Lê Lợi, Q1, TP.HCM', '0281234567', '08:00', '20:00'),
('CN02', N'PetCareX - Thủ Đức', N'456 Võ Văn Ngân, Thủ Đức, TP.HCM', '0287654321', '08:00', '21:00');

------------------------------------------------------------
-- 1) NHANVIEN (tạo đủ các vai trò)
-- Lưu ý trigger HOADON: NhanVienLap phải là "Nhân viên bán hàng"
------------------------------------------------------------
INSERT INTO NHANVIEN (MaNV, HoTen, NgaySinh, GioiTinh, ChucVu, MaCN, Luong, Thuong)
VALUES
('NV01', N'Nguyễn Minh An', '1995-02-10', N'Nam', N'Nhân viên bán hàng', 'CN01', 12000000, 500000),
('NV02', N'Lê Thị Bích',     '1998-06-21', N'Nữ',  N'Tiếp tân',          'CN01',  9000000, 300000),
('NV03', N'Trần Quốc Huy',   '1990-11-05', N'Nam', N'Bác sĩ thú y',       'CN01', 18000000, 1000000),
('NV04', N'Phạm Gia Khang',  '1988-03-12', N'Nam', N'Quản lí',            'CN02', 20000000, 2000000),
('NV05', N'Võ Ngọc Mai',     '1996-09-17', N'Nữ',  N'Nhân viên bán hàng', 'CN02', 12000000, 600000),
('NV06', N'Đặng Hoài Nam',   '1992-01-30', N'Nam', N'Bác sĩ thú y',       'CN02', 18000000, 1200000);

------------------------------------------------------------
-- 2) DICHVU
------------------------------------------------------------
INSERT INTO DICHVU (MaDV, TenDV)
VALUES
('DV01', N'Khám tổng quát'),
('DV02', N'Tắm & vệ sinh'),
('DV03', N'Cắt tỉa lông'),
('DV04', N'Tư vấn dinh dưỡng');

------------------------------------------------------------
-- 3) SANPHAM
-- Trigger TOATHUOC_OnlyDrug yêu cầu LoaiSP = "Thuốc" khi kê toa
-- Trigger MUAHANG_NotDrug cấm mua Thuốc trong MUAHANG
------------------------------------------------------------
INSERT INTO SANPHAM (MaSP, TenSP, LoaiSP, DonGia)
VALUES
('SP01', N'Thức ăn hạt cho chó 1kg', N'Đồ ăn', 120000),
('SP02', N'Cát vệ sinh mèo 5L',     N'Phụ kiện', 90000),
('SP03', N'Đồ chơi bóng cao su',    N'Đồ chơi', 50000),
('SP04', N'Amoxicillin 500mg',      N'Thuốc',  3000),
('SP05', N'Vitamin tổng hợp',       N'Thuốc',  2000);

------------------------------------------------------------
-- 4) VACCINE
------------------------------------------------------------
INSERT INTO VACCINE (MaVC, TenVC, NgaySanXuat, LieuLuong, DonGia)
VALUES
('VC01', N'Vaccine Dại (Rabies)',      '2025-10-01', 1.0, 250000),
('VC02', N'Vaccine 5 bệnh (DHPPiL)',   '2025-09-15', 1.0, 450000),
('VC03', N'Vaccine 3 bệnh mèo (FVRCP)','2025-08-20', 1.0, 400000);

------------------------------------------------------------
-- 5) GOITIEMPHONG + GOITIEMPHONG_VACCINE
------------------------------------------------------------
INSERT INTO GOITIEMPHONG (MaGoi, TenGoi, ThoiGian, KhuyenMai)
VALUES
('G01', N'Gói cơ bản cho chó', 6, 10),
('G02', N'Gói cơ bản cho mèo', 6, 10);

INSERT INTO GOITIEMPHONG_VACCINE (MaGoi, MaVC, SoLieu)
VALUES
('G01', 'VC01', 1.0),
('G01', 'VC02', 1.0),
('G02', 'VC01', 1.0),
('G02', 'VC03', 1.0);

------------------------------------------------------------
-- 6) KHO theo chi nhánh
------------------------------------------------------------
INSERT INTO CHINHANH_SANPHAM (MaCN, MaSP, SoLuongTonKho)
VALUES
('CN01', 'SP01', 100), ('CN01', 'SP02', 80), ('CN01', 'SP03', 50),
('CN01', 'SP04', 500), ('CN01', 'SP05', 500),
('CN02', 'SP01', 120), ('CN02', 'SP02', 60), ('CN02', 'SP03', 40),
('CN02', 'SP04', 400), ('CN02', 'SP05', 450);

INSERT INTO CHINHANH_VACCINE (MaCN, MaVC, SoLuongTonKho)
VALUES
('CN01', 'VC01', 60), ('CN01', 'VC02', 40), ('CN01', 'VC03', 30),
('CN02', 'VC01', 70), ('CN02', 'VC02', 35), ('CN02', 'VC03', 45);

------------------------------------------------------------
-- 7) KHACHHANG + TAIKHOAN_MATKHAU (dùng SEQ_KHACHHANG)
-- Password ở đây chỉ demo (để plain hoặc hash tùy bạn).
-- Nếu bạn muốn hash bcrypt, làm từ app sẽ chuẩn hơn.
------------------------------------------------------------
DECLARE @makh1 VARCHAR(10), @makh2 VARCHAR(10);

DECLARE @n1 INT = NEXT VALUE FOR dbo.SEQ_KHACHHANG;
SET @makh1 = 'KH' + RIGHT('00000000' + CAST(@n1 AS VARCHAR(8)), 8);

DECLARE @n2 INT = NEXT VALUE FOR dbo.SEQ_KHACHHANG;
SET @makh2 = 'KH' + RIGHT('00000000' + CAST(@n2 AS VARCHAR(8)), 8);

INSERT INTO KHACHHANG (MaKH, Hoten, CCCD, SDT, Email, Gioitinh, Ngaysinh, Bac, Tichluy)
VALUES
(@makh1, N'Kim',  '012345678901', '0347969423', 'kim@example.com', N'Nam', '2000-04-26', N'Cơ bản', 0),
(@makh2, N'Lan',  '012345678902', '0912345678', 'lan@example.com', N'Nữ',  '2002-02-14', N'Thân thiết', 150);

-- Demo password plain (không khuyên). Bạn có thể thay bằng hash từ app.
INSERT INTO TAIKHOAN_MATKHAU (MaKH, Tendangnhap, Matkhau)
VALUES
(@makh1, 'kim', '123456'),
(@makh2, 'lan', '123456');

------------------------------------------------------------
-- 8) THUCUNG
------------------------------------------------------------
INSERT INTO THUCUNG (MaThuCung, MaKH, Ten, Loai, Giong, NgaySinh, GioiTinh, TinhTrangSK)
VALUES
('TC01', @makh1, N'Bơ',   N'Chó', N'Poodle', '2023-01-10', N'Đực', N'Khỏe'),
('TC02', @makh1, N'Mít',  N'Mèo', N'Anh lông ngắn', '2022-08-05', N'Cái', N'Dị ứng nhẹ'),
('TC03', @makh2, N'Sữa',  N'Mèo', N'Ba Tư', '2021-12-20', N'Cái', N'Khỏe');

------------------------------------------------------------
-- 9) HOADON (NhanVienLap phải là Nhân viên bán hàng -> dùng NV01/NV05)
------------------------------------------------------------
INSERT INTO HOADON (MaHoaDon, NhanVienLap, MaKH, TongTien, KhuyenMai, HinhThucThanhToan)
VALUES
('HD01', 'NV01', @makh1, 0, 0, N'Tiền mặt'),
('HD02', 'NV05', @makh2, 0, 5, N'Chuyển khoản');

COMMIT;

PRINT N'Đã tạo dữ liệu mẫu cơ bản: CN, NV, DV, SP, VC, Gói, kho, KH + TK, thú cưng, hóa đơn.';
PRINT N'Lưu ý: Chưa tạo PHIENDICHVU/TOATHUOC/MUAHANG/TIEMPHONG vì trigger F gọi sp_RecalcHoaDon (cần có stored procedure).';
GO
