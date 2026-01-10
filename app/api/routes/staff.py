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

@router.get("/invoices/{ma_hoa_don}")  # NV6-DETAIL
def invoice_detail(ma_hoa_don: str, db: Session = Depends(get_db)):
    return staff_service.nv6_invoice_detail(db, ma_hoa_don)

@router.get("/inventory")  # NV7
def inventory(ma_cn: str, db: Session = Depends(get_db)):
    return staff_service.nv7_inventory(db, ma_cn)

@router.post("/inventory/products/import")  # NV8
def import_product_stock(ma_cn: str, ma_sp: str, so_luong: int, db: Session = Depends(get_db)):
    return staff_service.nv8_import_product_stock(db, ma_cn, ma_sp, so_luong)

@router.get("/medicines")
def list_medicines(ma_cn: str, db: Session = Depends(get_db)):
    res = staff_service.nv7_inventory(db, ma_cn)
    return {"items": [p for p in res["products"] if p["LoaiSP"] == "Thuốc"]}

@router.get("/history/exams")
def get_pet_exam_history(ma_thu_cung: str, db: Session = Depends(get_db)):
    return {"items": staff_service.get_exam_history_by_pet(db, ma_thu_cung)}

@router.get("/history/vaccines")
def get_pet_vaccine_history(ma_thu_cung: str, db: Session = Depends(get_db)):
    return {"items": staff_service.get_vaccine_history_by_pet(db, ma_thu_cung)}

from typing import Optional
@router.get("/bookings")
def get_customer_bookings(
    ma_cn: str, 
    ma_kh: Optional[str] = None, 
    ma_dv: str = 'DV001',
    db: Session = Depends(get_db)
):
    return {"items": staff_service.get_bookings_by_customer(db, ma_cn, ma_kh, ma_dv)}

@router.post("/examination/complete")
def complete_examination(data: dict, db: Session = Depends(get_db)):
    # data bao gồm: ma_phien, ma_bs, trieu_chung, chan_doan, thuoc_list
    return staff_service.complete_exam_process(
        db, 
        data['ma_phien'], 
        data['ma_bs'], 
        data['trieu_chung'], 
        data['chan_doan'], 
        data['thuoc_list']
    )

@router.post("/vaccination/complete")
def complete_vaccination(data: dict, db: Session = Depends(get_db)):
    # Phải truyền đúng 4 tham số như định nghĩa hàm ở Service
    return staff_service.complete_vaccine_process(
        db,                     # 1. db
        data['ma_phien_goc'],   # 2. ma_phien
        data['ma_bs'],          # 3. ma_bs
        data['danh_sach_tiem']  # 4. danh_sach_tiem
    )

@router.get("/all-medicines")
def api_get_all_medicines(db: Session = Depends(get_db)):
    """API riêng cho bác sĩ lấy danh mục thuốc tổng"""
    items = staff_service.get_all_medicines(db)
    return {"items": items}

@router.post("/examination/start")
def api_start_examination(data: dict, db: Session = Depends(get_db)):
    ma_phien = data.get("ma_phien")
    if not ma_phien:
        raise HTTPException(status_code=400, detail="Thiếu mã phiên")
    
    # Gọi hàm từ service đã tách ở trên
    return staff_service.start_examination(db, ma_phien)

@router.get("/history/daily-all")
def get_daily_history(ma_cn: str, date: str, db: Session = Depends(get_db)):
    """
    API trả về nhật ký làm việc trong ngày của chi nhánh
    """
    # date định dạng: YYYY-MM-DD
    return staff_service.get_daily_history_all(db, ma_cn, date)