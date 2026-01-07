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
    db: Session = Depends(get_db),
):
    return customer_service.kh16_create_booking(
        db, ma_kh, ma_thu_cung, ma_dv
    )

@router.get("/me/bookings")
def my_bookings(ma_kh: str, db: Session = Depends(get_db)):
    return {"items": customer_service.kh17_my_bookings(db, ma_kh)}

@router.post("/appointments/{ma_phien}/confirm")
def confirm_appointment(
    ma_phien: str,
    hinh_thuc_thanh_toan: str,
    db: Session = Depends(get_db),
):
    return customer_service.kh18_confirm_booking(
        db, ma_phien, hinh_thuc_thanh_toan
    )

@router.delete("/appointments/{ma_phien}")
def cancel_booking(ma_phien: str, ma_kh: str, db: Session = Depends(get_db)):
    return customer_service.kh15_cancel_appointment(db, ma_phien, ma_kh)


@router.get("/services")
def list_services(db: Session = Depends(get_db)):
    return {"items": customer_service.kh13_list_services(db)}

@router.get("/me/appointments")
def my_appointments(ma_kh: str, db: Session = Depends(get_db)):
    return {"items": customer_service.kh14_my_appointments(db, ma_kh)}


@router.get("/me/purchases")
def my_purchases(ma_kh: str, db: Session = Depends(get_db)):
    return {"items": customer_service.kh11_purchase_history(db, ma_kh)}
