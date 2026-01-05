# app/api/routes/customer.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.api.deps import get_db  # bỏ require_role

router = APIRouter()

@router.get("/packages")  # KH1
def list_packages(db: Session = Depends(get_db)):
    rows = db.execute(
        text("SELECT MaGoi, TenGoi, ThoiGian, KhuyenMai FROM GOITIEMPHONG")
    ).mappings().all()
    return {"items": rows}


@router.get("/pets")  # KH2 (tra cứu thú cưng)
def list_pets(ma_kh: str, db: Session = Depends(get_db)):
    rows = db.execute(
        text("SELECT * FROM THUCUNG WHERE MaKH = :makh"),
        {"makh": ma_kh},
    ).mappings().all()
    return {"items": rows}


@router.post("/pets")  # KH2 (thêm thú cưng)
def create_pet(
    ma_kh: str,
    ma_thu_cung: str,
    ten: str,
    loai: str = None,
    giong: str = None,
    db: Session = Depends(get_db),
):
    db.execute(
        text("""
            INSERT INTO THUCUNG(MaThuCung, MaKH, Ten, Loai, Giong)
            VALUES(:id, :makh, :ten, :loai, :giong)
        """),
        {"id": ma_thu_cung, "makh": ma_kh, "ten": ten, "loai": loai, "giong": giong},
    )
    db.commit()
    return {"ok": True, "MaThuCung": ma_thu_cung}


@router.delete("/pets/{ma_thu_cung}")  # KH2 (xóa thú cưng)
def delete_pet(ma_thu_cung: str, ma_kh: str, db: Session = Depends(get_db)):
    res = db.execute(
        text("DELETE FROM THUCUNG WHERE MaThuCung = :id AND MaKH = :makh"),
        {"id": ma_thu_cung, "makh": ma_kh},
    )
    db.commit()
    if res.rowcount == 0:
        raise HTTPException(status_code=404, detail="Pet not found")
    return {"ok": True}


@router.get("/pets/{ma_thu_cung}/vaccinations")  # KH3
def pet_vaccination_history(ma_thu_cung: str, ma_kh: str, db: Session = Depends(get_db)):
    # ensure pet belongs to customer
    pet = db.execute(
        text("SELECT 1 FROM THUCUNG WHERE MaThuCung = :id AND MaKH = :makh"),
        {"id": ma_thu_cung, "makh": ma_kh},
    ).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")

    rows = db.execute(
        text("""
            SELECT tp.MaPhien, tp.MaVC, vc.TenVC, tp.NgayTiem, tp.SoLieu, tp.MaGoi
            FROM PHIENDICHVU pd
            JOIN TIEMPHONG tp ON tp.MaPhien = pd.MaPhien
            JOIN VACCINE vc ON vc.MaVC = tp.MaVC
            WHERE pd.MaThuCung = :pet
            ORDER BY tp.NgayTiem DESC
        """),
        {"pet": ma_thu_cung},
    ).mappings().all()
    return {"items": rows}


@router.post("/appointments")  # KH6: đặt dịch vụ/tiêm phòng (tạo HOADON + PHIENDICHVU draft)
def create_appointment(
    ma_kh: str,
    ma_hoa_don: str,
    nhan_vien_lap: str,
    ma_phien: str,
    ma_thu_cung: str,
    ma_dv: str,
    gia_tien: float,
    hinh_thuc_thanh_toan: str,
    db: Session = Depends(get_db),
):
    # (tạm) ensure pet belongs to customer
    pet = db.execute(
        text("SELECT 1 FROM THUCUNG WHERE MaThuCung = :id AND MaKH = :makh"),
        {"id": ma_thu_cung, "makh": ma_kh},
    ).first()
    if not pet:
        raise HTTPException(status_code=404, detail="Pet not found")

    # 1) tạo hóa đơn
    db.execute(
        text("""
            INSERT INTO HOADON(MaHoaDon, NhanVienLap, MaKH, HinhThucThanhToan, KhuyenMai, TongTien)
            VALUES(:hd, :nv, :kh, :httt, 0, 0)
        """),
        {"hd": ma_hoa_don, "nv": nhan_vien_lap, "kh": ma_kh, "httt": hinh_thuc_thanh_toan},
    )

    # 2) tạo phiên dịch vụ
    db.execute(
        text("""
            INSERT INTO PHIENDICHVU(MaPhien, MaHoaDon, MaThuCung, MaDV, GiaTien)
            VALUES(:ph, :hd, :pet, :dv, :gia)
        """),
        {"ph": ma_phien, "hd": ma_hoa_don, "pet": ma_thu_cung, "dv": ma_dv, "gia": gia_tien},
    )

    db.commit()
    return {"ok": True, "MaHoaDon": ma_hoa_don, "MaPhien": ma_phien}


@router.post("/orders/products")  # KH4: mua sản phẩm (gọi sp_MuaHang)
def buy_product(ma_phien: str, ma_sp: str, so_luong: int, db: Session = Depends(get_db)):
    # (tạm) không validate phiên thuộc KH
    db.execute(text("EXEC dbo.sp_MuaHang :p, :sp, :sl"), {"p": ma_phien, "sp": ma_sp, "sl": so_luong})
    db.commit()
    return {"ok": True}


@router.post("/orders/packages")  # KH4: mua gói (gọi sp_MuaGoiTiemPhong)
def buy_package(ma_kh: str, ma_hoa_don: str, ma_goi: str, db: Session = Depends(get_db)):
    # validate hóa đơn thuộc KH
    ok = db.execute(
        text("SELECT 1 FROM HOADON WHERE MaHoaDon = :hd AND MaKH = :kh"),
        {"hd": ma_hoa_don, "kh": ma_kh},
    ).first()
    if not ok:
        raise HTTPException(status_code=404, detail="Invoice not found")

    db.execute(text("EXEC dbo.sp_MuaGoiTiemPhong :hd, :goi"), {"hd": ma_hoa_don, "goi": ma_goi})
    db.commit()
    return {"ok": True}


@router.get("/me/loyalty")  # KH5
def my_loyalty(ma_kh: str, db: Session = Depends(get_db)):
    row = db.execute(
        text("SELECT MaKH, Hoten, Bac, Tichluy FROM KHACHHANG WHERE MaKH = :kh"),
        {"kh": ma_kh},
    ).mappings().first()
    if not row:
        raise HTTPException(status_code=404, detail="Customer not found")
    return row


@router.post("/invoices/{ma_hoa_don}/review")  # KH7
def review_invoice(
    ma_hoa_don: str,
    ma_kh: str,
    diem_dv: int,
    muc_do_hailong: int,
    thai_do_nhanvien: str = None,
    binh_luan: str = None,
    db: Session = Depends(get_db),
):
    db.execute(
        text("""
            MERGE NHANXET AS t
            USING (SELECT :kh AS MaKH, :hd AS MaHoaDon) AS s
            ON (t.MaKH = s.MaKH AND t.MaHoaDon = s.MaHoaDon)
            WHEN MATCHED THEN UPDATE SET
                DiemDV = :diem, Mucdohailong = :hl, Thaidonhanvien = :td, Binhluan = :bl
            WHEN NOT MATCHED THEN INSERT(MaKH, MaHoaDon, DiemDV, Mucdohailong, Thaidonhanvien, Binhluan)
                VALUES(:kh, :hd, :diem, :hl, :td, :bl);
        """),
        {
            "kh": ma_kh,
            "hd": ma_hoa_don,
            "diem": diem_dv,
            "hl": muc_do_hailong,
            "td": thai_do_nhanvien,
            "bl": binh_luan,
        },
    )
    db.commit()
    return {"ok": True}
