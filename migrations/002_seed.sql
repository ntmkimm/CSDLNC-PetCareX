USE PetCareX;
GO

-- 1. CHINHANH (10 dòng)
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

-- 2. DICHVU (10 dòng)
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
('DV010', N'Điều trị nội ký sinh',     180000);

-- 3. SANPHAM (10 dòng: 5 Thuốc, 5 Phụ kiện để test Trigger)
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

-- 4. VACCINE (10 dòng)
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

-- 5. GOITIEMPHONG (10 dòng)
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

-- 6. KHACHHANG (10 dòng - MaKH tự sinh)
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

-- 7. NHANVIEN (10 dòng - Cần ít nhất 1 NV bán hàng để lập hóa đơn)
INSERT INTO NHANVIEN (HoTen, NgaySinh, GioiTinh, ChucVu, MaCN, Luong) VALUES
(N'Nguyễn Bác Sĩ 1', '1985-05-10', N'Nam', N'Bác sĩ thú y', 'CN001', 20000000),
(N'Lê Tiếp Tân 1', '1995-02-20', N'Nữ', N'Tiếp tân', 'CN001', 8000000),
(N'Trần Bán Hàng 1', '1992-08-15', N'Nam', N'Nhân viên bán hàng', 'CN001', 9000000),
(N'Phạm Quản Lí 1', '1980-01-01', N'Nữ', N'Quản lí', 'CN001', 25000000),
(N'Vũ Bác Sĩ 2', '1988-12-12', N'Nam', N'Bác sĩ thú y', 'CN002', 20000000),
(N'Hoàng Bán Hàng 2', '1994-06-06', N'Nữ', N'Nhân viên bán hàng', 'CN002', 9000000),
(N'Đặng Tiếp Tân 2', '1996-03-03', N'Nữ', N'Tiếp tân', 'CN002', 8000000),
(N'Bùi Bác Sĩ 3', '1987-07-07', N'Nam', N'Bác sĩ thú y', 'CN003', 20000000),
(N'Ngô Bán Hàng 3', '1993-09-09', N'Nam', N'Nhân viên bán hàng', 'CN003', 9000000),
(N'Lý Quản Lí 2', '1982-11-11', N'Nữ', N'Quản lí', 'CN002', 25000000);

-- 8. THUCUNG (10 dòng)
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

-- 9. TAIKHOAN_MATKHAU (10 dòng)
INSERT INTO TAIKHOAN_MATKHAU (MaKH, Tendangnhap, Matkhau) 
SELECT MaKH, 'user' + MaKH, '123456' FROM KHACHHANG;

-- 10. CUNGCAPDICHVU (10 dòng)
INSERT INTO CUNGCAPDICHVU (MaCN, MaDV) VALUES
('CN001','DV001'), ('CN001','DV002'), ('CN001','DV003'),
('CN002','DV001'), ('CN002','DV002'),
('CN003','DV001'), ('CN003','DV004'),
('CN004','DV001'), ('CN004','DV005'), ('CN005','DV001');

-- 11. CHINHANH_SANPHAM (Kho - 10 dòng)
INSERT INTO CHINHANH_SANPHAM (MaCN, MaSP, SoLuongTonKho) VALUES
('CN001','SP001', 100), ('CN001','SP002', 50), ('CN001','SP006', 20),
('CN002','SP001', 80), ('CN002','SP007', 100),
('CN003','SP003', 40), ('CN003','SP008', 15),
('CN001','SP004', 30), ('CN002','SP005', 60), ('CN005','SP010', 25);

-- 12. CHINHANH_VACCINE (Kho - 10 dòng)
INSERT INTO CHINHANH_VACCINE (MaCN, MaVC, SoLuongTonKho) VALUES
('CN001','VC001', 50), ('CN001','VC002', 30),
('CN002','VC001', 20), ('CN002','VC003', 15),
('CN003','VC004', 10), ('CN004','VC005', 25),
('CN005','VC001', 40), ('CN006','VC002', 10),
('CN001','VC006', 12), ('CN002','VC010', 18);

-- 13. GOITIEMPHONG_VACCINE (10 dòng)
INSERT INTO GOITIEMPHONG_VACCINE (MaGoi, MaVC, SoLieu) VALUES
('G001','VC001', 1.0), ('G001','VC003', 3.0),
('G002','VC001', 1.0), ('G002','VC002', 3.0),
('G003','VC001', 1.0), ('G006','VC001', 2.0),
('G006','VC003', 2.0), ('G006','VC005', 2.0),
('G009','VC005', 3.0), ('G010','VC004', 2.0);

-- 14. LICHSUDIEUDONG (10 dòng)
INSERT INTO LICHSUDIEUDONG (MaNV, MaCN, NgayBD, NgayKT, ChucVu) VALUES
('NV000001','CN001','2025-01-01','2025-06-01', N'Bác sĩ thú y'),
('NV000002','CN001','2025-01-01','2025-12-31', N'Tiếp tân'),
('NV000003','CN001','2025-01-01','2025-12-31', N'Nhân viên bán hàng'),
('NV000004','CN001','2025-01-01','2025-12-31', N'Quản lí'),
('NV000005','CN002','2025-01-01','2025-12-31', N'Bác sĩ thú y'),
('NV000001','CN002','2025-06-02','2025-12-31', N'Bác sĩ thú y'),
('NV000006','CN002','2025-01-01','2025-12-31', N'Nhân viên bán hàng'),
('NV000007','CN002','2025-01-01','2025-12-31', N'Tiếp tân'),
('NV000008','CN003','2025-01-01','2025-12-31', N'Bác sĩ thú y'),
('NV000009','CN003','2025-01-01','2025-12-31', N'Nhân viên bán hàng');

-- 15. HOADON (10 dòng - NV000003, NV000006, NV000009 là NV Bán hàng)
INSERT INTO HOADON (NhanVienLap, MaKH, HinhThucThanhToan, KhuyenMai) VALUES
('NV000003', 'KH000001', N'Tiền mặt', 0),
('NV000003', 'KH000002', N'Chuyển khoản', 5),
('NV000006', 'KH000003', N'Tiền mặt', 10),
('NV000006', 'KH000004', N'Tiền mặt', 0),
('NV000009', 'KH000005', N'Chuyển khoản', 0),
('NV000003', 'KH000006', N'Tiền mặt', 0),
('NV000006', 'KH000007', N'Chuyển khoản', 0),
('NV000009', 'KH000008', N'Tiền mặt', 5),
('NV000003', 'KH000009', N'Tiền mặt', 0),
('NV000006', 'KH000010', N'Chuyển khoản', 20);

-- 16. PHIENDICHVU (10 dòng - Gắn vào các hóa đơn trên)
INSERT INTO PHIENDICHVU (MaHoaDon, MaThuCung, MaDV, GiaTien) VALUES
('HD000001', 'TC000001', 'DV001', 200000),
('HD000002', 'TC000002', 'DV001', 200000),
('HD000003', 'TC000003', 'DV002', 100000),
('HD000004', 'TC000004', 'DV003', 150000),
('HD000005', 'TC000005', 'DV004', 300000),
('HD000006', 'TC000006', 'DV001', 200000),
('HD000007', 'TC000007', 'DV001', 200000),
('HD000008', 'TC000008', 'DV008', 1200000),
('HD000009', 'TC000009', 'DV001', 200000),
('HD000010', 'TC000010', 'DV001', 200000);

-- 17. KHAMBENH (10 dòng)
INSERT INTO KHAMBENH (MaPhien, BacSiPhuTrach, CacTrieuChung, ChanDoan) VALUES
('PD000001', 'NV000001', N'Bỏ ăn, nôn mửa', N'Viêm dạ dày cấp'),
('PD000002', 'NV000001', N'Ho, chảy mũi', N'Cảm lạnh'),
('PD000006', 'NV000005', N'Ngứa tai', N'Viêm tai ngoài'),
('PD000007', 'PD000007', N'Rụng lông', N'Nấm da'),
('PD000008', 'NV000008', N'Triệt sản', N'Khỏe mạnh'),
('PD000009', 'NV000001', N'Sốt nhẹ', N'Nhiễm khuẩn nhẹ'),
('PD000010', 'NV000005', N'Khám định kỳ', N'Khỏe mạnh'),
('PD000003', 'NV000001', N'Tiêm phòng', N'Khỏe mạnh'),
('PD000004', 'NV000001', N'Vệ sinh', N'Khỏe mạnh'),
('PD000005', 'NV000005', N'Cắt tỉa', N'Khỏe mạnh');

-- 18. TOATHUOC (10 dòng - Chỉ được dùng SP001-SP005 vì là Thuốc)
INSERT INTO TOATHUOC (MaPhien, MaThuoc, Soluong) VALUES
('PD000001', 'SP001', 2), ('PD000001', 'SP002', 1),
('PD000002', 'SP001', 3), ('PD000006', 'SP005', 1),
('PD000007', 'SP005', 2), ('PD000008', 'SP002', 1),
('PD000009', 'SP001', 1), ('PD000001', 'SP003', 5),
('PD000002', 'SP004', 1), ('PD000010', 'SP001', 2);

-- 19. MUAHANG (10 dòng - KHÔNG được dùng thuốc SP001-05)
INSERT INTO MUAHANG (MaPhien, MaSP, SoLuong) VALUES
('PD000001', 'SP006', 1), ('PD000002', 'SP007', 5),
('PD000003', 'SP006', 1), ('PD000004', 'SP010', 1),
('PD000005', 'SP008', 1), ('PD000006', 'SP007', 2),
('PD000007', 'SP009', 1), ('PD000008', 'SP006', 1),
('PD000009', 'SP010', 1), ('PD000010', 'SP007', 3);

-- 20. TIEMPHONG (10 dòng)
INSERT INTO TIEMPHONG (MaPhien, MaVC, MaGoi, BacSiPhuTrach, NgayTiem, SoLieu) VALUES
('PD000003', 'VC001', NULL, 'NV000001', '2025-04-01', 1.0),
('PD000004', 'VC002', NULL, 'NV000005', '2025-04-01', 1.0),
('PD000001', 'VC003', NULL, 'NV000008', '2025-04-01', 1.0),
('PD000002', 'VC001', 'G001', 'NV000001', '2025-04-01', 1.0),
('PD000005', 'VC004', NULL, 'NV000005', '2025-04-01', 1.0),
('PD000006', 'VC005', NULL, 'NV000008', '2025-04-01', 1.0),
('PD000007', 'VC001', 'G002', 'NV000001', '2025-04-01', 1.0),
('PD000008', 'VC002', NULL, 'NV000001', '2025-04-01', 1.0),
('PD000009', 'VC003', NULL, 'NV000005', '2025-04-01', 1.0),
('PD000010', 'VC004', NULL, 'NV000008', '2025-04-01', 1.0);

-- 21. MUA_GOI (10 dòng)
INSERT INTO MUA_GOI (MaKH, MaGoi, MaHoaDon) VALUES
('KH000001', 'G001', 'HD000001'),
('KH000002', 'G002', 'HD000002'),
('KH000003', 'G003', 'HD000003'),
('KH000004', 'G004', 'HD000004'),
('KH000005', 'G005', 'HD000005'),
('KH000006', 'G006', 'HD000006'),
('KH000007', 'G007', 'HD000007'),
('KH000008', 'G008', 'HD000008'),
('KH000009', 'G009', 'HD000009'),
('KH000010', 'G010', 'HD000010');

-- 22. NHANXET (10 dòng)
INSERT INTO NHANXET (MaKH, MaHoaDon, DiemDV, Mucdohailong, Binhluan) VALUES
('KH000001', 'HD000001', 10, 5, N'Dịch vụ rất tốt'),
('KH000002', 'HD000002', 9, 4, N'Bác sĩ nhiệt tình'),
('KH000003', 'HD000003', 8, 4, N'Sẽ quay lại'),
('KH000004', 'HD000004', 7, 3, N'Chờ hơi lâu'),
('KH000005', 'HD000005', 10, 5, N'Rất hài lòng'),
('KH000006', 'HD000006', 9, 5, N'Chuyên nghiệp'),
('KH000007', 'HD000007', 8, 4, N'Giá hợp lý'),
('KH000008', 'HD000008', 10, 5, N'Cảm ơn bác sĩ'),
('KH000009', 'HD000009', 9, 4, N'Tốt'),
('KH000010', 'HD000010', 6, 3, N'Cần cải thiện tốc độ');

-- 23. GOI_KHACHHANG_VACCINE (10 dòng)
INSERT INTO GOI_KHACHHANG_VACCINE (MaKH, MaGoi, MaVC, Solieuconlai) VALUES
('KH000001', 'G001', 'VC001', 1.0),
('KH000001', 'G001', 'VC003', 3.0),
('KH000002', 'G002', 'VC001', 1.0),
('KH000002', 'G002', 'VC002', 2.0),
('KH000003', 'G003', 'VC001', 1.0),
('KH000006', 'G006', 'VC001', 2.0),
('KH000006', 'G006', 'VC003', 2.0),
('KH000006', 'G006', 'VC005', 2.0),
('KH000009', 'G009', 'VC005', 3.0),
('KH000010', 'G010', 'VC004', 2.0);
GO

-- Kiểm tra kết quả
SELECT MaHoaDon, MaKH, TongTien FROM HOADON;