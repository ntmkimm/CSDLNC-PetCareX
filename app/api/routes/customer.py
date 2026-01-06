# app/api/routes/customer.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.services import customer_service

router = APIRouter()

@router.get("/packages")  # KH1
def list_packages(db: Session = Depends(get_db)):
    return {"items": customer_service.kh1_list_packages(db)}

@router.get("/pets")  # KH2
def list_pets(ma_kh: str, db: Session = Depends(get_db)):
    return {"items": customer_service.kh2_list_pets(db, ma_kh)}

@router.post("/pets")  # KH2
def create_pet(ma_kh: str, ma_thu_cung: str, ten: str, loai: str = None, giong: str = None, db: Session = Depends(get_db)):
    return customer_service.kh2_create_pet(db, ma_kh, ma_thu_cung, ten, loai, giong)

@router.delete("/pets/{ma_thu_cung}")  # KH2
def delete_pet(ma_thu_cung: str, ma_kh: str, db: Session = Depends(get_db)):
    return customer_service.kh2_delete_pet(db, ma_thu_cung, ma_kh)

@router.get("/pets/{ma_thu_cung}/vaccinations")  # KH3
def pet_vaccination_history(ma_thu_cung: str, ma_kh: str, db: Session = Depends(get_db)):
    return {"items": customer_service.kh3_pet_vaccination_history(db, ma_thu_cung, ma_kh)}

@router.post("/appointments")  # KH6
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
    return customer_service.kh6_create_appointment(
        db=db,
        ma_kh=ma_kh,
        ma_hoa_don=ma_hoa_don,
        nhan_vien_lap=nhan_vien_lap,
        ma_phien=ma_phien,
        ma_thu_cung=ma_thu_cung,
        ma_dv=ma_dv,
        gia_tien=gia_tien,
        hinh_thuc_thanh_toan=hinh_thuc_thanh_toan,
    )

@router.post("/orders/products")  # KH4
def buy_product(ma_phien: str, ma_sp: str, so_luong: int, db: Session = Depends(get_db)):
    return customer_service.kh4_buy_product(db, ma_phien, ma_sp, so_luong)

@router.post("/orders/packages")  # KH4
def buy_package(ma_kh: str, ma_hoa_don: str, ma_goi: str, db: Session = Depends(get_db)):
    return customer_service.kh4_buy_package(db, ma_kh, ma_hoa_don, ma_goi)

@router.get("/me/loyalty")  # KH5
def my_loyalty(ma_kh: str, db: Session = Depends(get_db)):
    return customer_service.kh5_my_loyalty(db, ma_kh)

@router.post("/invoices/{ma_hoa_don}/review")  # KH7
def review_invoice(ma_hoa_don: str, ma_kh: str, diem_dv: int, muc_do_hailong: int,
                   thai_do_nhanvien: str = None, binh_luan: str = None, db: Session = Depends(get_db)):
    return customer_service.kh7_review_invoice(db, ma_hoa_don, ma_kh, diem_dv, muc_do_hailong, thai_do_nhanvien, binh_luan)
