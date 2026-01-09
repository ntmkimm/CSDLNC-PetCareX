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

@router.get("/staff/search") # CT5
def search_staff(keyword: Optional[str] = None, db: Session = Depends(get_db)):
    """Tra cứu nhân sự toàn hệ thống [CT5]"""
    return {"items": company_service.search_staff(db, keyword)}

@router.put("/staff/{ma_nv}/assignment") # CT6
def update_staff(
    ma_nv: str, 
    ma_cn_moi: str, 
    luong_moi: float, 
    db: Session = Depends(get_db)
):
    """Quản lý nhân sự: cập nhật lương, phân công chi nhánh [CT6]"""
    try:
        return company_service.update_staff_assignment(db, ma_nv, ma_cn_moi, luong_moi)
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.get("/customers/count-by-branch") # CT7
def get_customer_count(db: Session = Depends(get_db)):
    """Tra cứu số khách hàng của từng chi nhánh [CT7]"""
    return {"items": company_service.get_customer_count_by_branch(db)}

@router.get("/pets/overall-stats") # CT8
def get_pet_stats(db: Session = Depends(get_db)):
    """Thống kê về số lượng thú cưng trên toàn hệ thống [CT8]"""
    return {"items": company_service.get_total_pets_stats(db)}