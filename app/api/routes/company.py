from fastapi import APIRouter, Depends, Query, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any

from app.api.deps import get_db
from app.services import company_service

router = APIRouter()

@router.get("/revenue/by-branch") # CT1
def get_revenue_by_branch(db: Session = Depends(get_db)):
    """Doanh thu của từng chi nhánh [CT1]"""
    return {"items": company_service.get_revenue_by_branch(db)}

@router.get("/revenue/total") # CT2
def get_total_revenue(db: Session = Depends(get_db)):
    """Tổng doanh thu của các chi nhánh [CT2]"""
    return company_service.get_total_revenue(db)

@router.get("/services/top-revenue") # CT3
def get_top_services(db: Session = Depends(get_db)):
    """Dịch vụ mang lại doanh thu cao nhất trong 6 tháng gần nhất [CT3]"""
    return {"items": company_service.get_top_revenue_services(db)}

@router.get("/memberships/distribution") # CT4
def get_membership_stats(db: Session = Depends(get_db)):
    """Tình hình hội viên (Cơ bản / Thân thiết / VIP) [CT4]"""
    return {"items": company_service.get_membership_stats(db)}

# Tra cứu nhân viên [CT5]
@router.get("/staff/search")
def search_staff(keyword: str = Query(""), db: Session = Depends(get_db)):
    return {"items": company_service.search_staff(db, keyword)}

# Thêm nhân viên [CT5]
@router.post("/staff")
def create_staff(staff_data: dict, db: Session = Depends(get_db)):
    try:
        return company_service.create_staff(db, staff_data)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Mã nhân viên đã tồn tại hoặc dữ liệu không hợp lệ")

# Sửa lương / Điều động [CT5, CT6]
@router.put("/staff/{ma_nv}/assignment")
def update_staff(ma_nv: str, payload: dict, db: Session = Depends(get_db)):
    try:
        ma_cn = payload.get("ma_cn_moi")
        luong = payload.get("luong_moi")
        return company_service.update_staff(db, ma_nv, ma_cn, luong)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

# Xóa nhân viên [CT5]
@router.delete("/staff/{ma_nv}")
def delete_staff(ma_nv: str, db: Session = Depends(get_db)):
    try:
        return company_service.delete_staff(db, ma_nv)
    except Exception as e:
        raise HTTPException(status_code=400, detail="Nhân viên này đã có dữ liệu giao dịch, không thể xóa")

@router.get("/customers/count-by-branch") # CT7
def get_customer_count(db: Session = Depends(get_db)):
    """Tra cứu số khách hàng của từng chi nhánh [CT7]"""
    return {"items": company_service.get_customer_count_by_branch(db)}

@router.get("/pets/overall-stats") # CT8
def get_pet_stats(db: Session = Depends(get_db)):
    """Thống kê về số lượng thú cưng trên toàn hệ thống [CT8]"""
    return {"items": company_service.get_total_pets_stats(db)}


@router.get("/branches/all")
def get_branches(db: Session = Depends(get_db)):
    return {"items": company_service.get_all_branches(db)}