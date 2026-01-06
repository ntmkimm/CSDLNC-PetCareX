# app/api/routes/staff.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.services import staff_service

router = APIRouter()

@router.post("/invoices")  # NV1
def create_invoice(ma_hoa_don: str, ma_kh: str, hinh_thuc: str, ma_nv: str, db: Session = Depends(get_db)):
    return staff_service.nv1_create_invoice(db, ma_hoa_don, ma_kh, hinh_thuc, ma_nv)

@router.get("/vaccines")  # NV2
def list_vaccines(db: Session = Depends(get_db)):
    return {"items": staff_service.nv2_list_vaccines(db)}

@router.get("/reports/revenue/daily")  # NV3
def revenue_daily(date: str, ma_cn: str, db: Session = Depends(get_db)):
    return {"items": staff_service.nv3_revenue_daily(db, date, ma_cn)}

@router.get("/schedule/vaccinations")  # NV4
def vaccinations_today(date: str, ma_cn: str, db: Session = Depends(get_db)):
    return {"items": staff_service.nv4_vaccinations_on_date(db, date, ma_cn)}

@router.get("/schedule/exams")  # NV5
def exams_today(date: str, ma_cn: str, db: Session = Depends(get_db)):
    return {"items": staff_service.nv5_exams_on_date(db, date, ma_cn)}

@router.get("/invoices")  # NV6
def search_invoices(from_date: str, to_date: str, ma_cn: str, ma_kh: str = None, db: Session = Depends(get_db)):
    return {"items": staff_service.nv6_search_invoices(db, from_date, to_date, ma_cn, ma_kh)}

@router.get("/inventory")  # NV7
def inventory(ma_cn: str, db: Session = Depends(get_db)):
    return staff_service.nv7_inventory(db, ma_cn)

@router.post("/inventory/products/import")  # NV8
def import_product_stock(ma_cn: str, ma_sp: str, so_luong: int, db: Session = Depends(get_db)):
    return staff_service.nv8_import_product_stock(db, ma_cn, ma_sp, so_luong)
