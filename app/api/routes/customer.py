# app/api/routes/customer.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.services import customer_service

router = APIRouter()

@router.get("/packages")
def list_packages(db: Session = Depends(get_db)):
    return {"items": customer_service.kh1_list_packages(db)}

@router.get("/pets")
def list_pets(ma_kh: str, db: Session = Depends(get_db)):
    return {"items": customer_service.kh2_list_pets(db, ma_kh)}

@router.post("/pets")
def create_pet(ma_kh: str, ten: str, loai: str = None, giong: str = None, db: Session = Depends(get_db)):
    return customer_service.kh2_create_pet(db, ma_kh, ten, loai, giong)

@router.delete("/pets/{ma_thu_cung}")
def delete_pet(ma_thu_cung: str, ma_kh: str, db: Session = Depends(get_db)):
    return customer_service.kh2_delete_pet(db, ma_thu_cung, ma_kh)

@router.get("/pets/{ma_thu_cung}/vaccinations")
def pet_vaccination_history(ma_thu_cung: str, ma_kh: str, db: Session = Depends(get_db)):
    return {"items": customer_service.kh3_pet_vaccination_history(db, ma_thu_cung, ma_kh)}

# ==========================================================
# BOOKING = PHIENDICHVU (TrangThai = BOOKING)
# ==========================================================
@router.post("/appointments")
def create_booking(
    ma_kh: str,
    ma_thu_cung: str,
    ma_dv: str,
    ma_cn: str,
    db: Session = Depends(get_db),
):
    return customer_service.kh16_create_booking(
        db, ma_kh, ma_thu_cung, ma_dv, ma_cn
    )

@router.get("/me/bookings")
def my_bookings(ma_kh: str, db: Session = Depends(get_db)):
    return {"items": customer_service.kh17_my_bookings(db, ma_kh)}
    
@router.get("/pets/{ma_thu_cung}/medical-history")
def pet_medical_history(ma_thu_cung: str, ma_kh: str, db: Session = Depends(get_db)):
    return {"items": customer_service.kh10_pet_medical_history(db, ma_thu_cung, ma_kh)}

@router.get("/products/search")
def search_products(
    keyword: str | None = None,
    loai: str | None = None,
    ma_cn: str | None = None, # Thêm tham số ma_cn ở đây
    db: Session = Depends(get_db),
):
    return {
        "items": customer_service.kh8_search_products(db, keyword, loai, ma_cn)
    }
    
@router.post("/orders/products")
def booking_product(
    ma_kh: str,      # Cần mã khách hàng để biết giỏ hàng của ai
    ma_sp: str,
    so_luong: int,
    ma_cn: str,
    db: Session = Depends(get_db),
):
    return customer_service.kh4_booking_product(db, ma_kh, ma_sp, so_luong, ma_cn)

@router.delete("/appointments/{ma_phien}")
def cancel_booking(ma_phien: str, ma_kh: str, db: Session = Depends(get_db)):
    return customer_service.kh15_cancel_appointment(db, ma_phien, ma_kh)


@router.get("/services")
def list_services(
    ma_cn: str | None = None, # Thêm tham số lọc theo chi nhánh
    db: Session = Depends(get_db)
):
    return {"items": customer_service.kh13_list_services(db, ma_cn)}

@router.get("/me/appointments")
def my_appointments(ma_kh: str, db: Session = Depends(get_db)):
    return {"items": customer_service.kh14_my_appointments(db, ma_kh)}


@router.get("/me/purchases")
def my_purchases(ma_kh: str, db: Session = Depends(get_db)):
    return {"items": customer_service.kh11_purchase_history(db, ma_kh)}

@router.get("/invoices/{ma_hoa_don}")
def get_invoice_detail(ma_hoa_don: str, ma_kh: str, db: Session = Depends(get_db)):
    return customer_service.kh12_invoice_detail(db, ma_hoa_don, ma_kh)

@router.post("/orders/confirm")
def confirm_invoice(
    ma_hoa_don: str,
    hinh_thuc_thanh_toan: str,
    db: Session = Depends(get_db),
):
    return customer_service.kh_confirm_invoice(
        db, ma_hoa_don, hinh_thuc_thanh_toan
    )
    
@router.post("/packages/buy")
def buy_package(
    ma_kh: str,
    ma_goi: str,
    db: Session = Depends(get_db),
):
    return customer_service.kh_buy_package(db, ma_kh, ma_goi)

@router.get("/me/purchased-packages/{ma_goi}/details")
def get_purchased_package_details(
    ma_goi: str, 
    ma_kh: str, 
    db: Session = Depends(get_db)
):
    """
    Lấy chi tiết danh sách vaccine và số mũi còn lại trong một gói cụ thể của khách hàng
    """
    return {
        "items": customer_service.kh_get_purchased_package_details(db, ma_kh, ma_goi)
    }

@router.get("/me/purchased-packages")
def get_my_purchased_packages(ma_kh: str, db: Session = Depends(get_db)):
    return {"items": customer_service.kh_get_my_purchased_packages(db, ma_kh)}

@router.get("/branches/by-service")
def get_branch_by_service(ma_dv: str, db: Session = Depends(get_db)):
    return {
        "items": customer_service.kh_get_chinhanh_by_service(db, ma_dv)
    }
    
@router.get("/branches/by-product")
def get_branch_by_product(ma_sp: str, db: Session = Depends(get_db)):
    return {
        "items": customer_service.kh_get_chinhanh_by_product(db, ma_sp)
    }