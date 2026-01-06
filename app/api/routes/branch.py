from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.services import branch_service

router = APIRouter()

@router.get("/{ma_cn}/revenue")
def revenue(ma_cn: str, granularity: str = "day", db: Session = Depends(get_db)):
    return {"items": branch_service.revenue(db, ma_cn, granularity)}

@router.get("/{ma_cn}/inventory/products")
def inv_products(ma_cn: str, db: Session = Depends(get_db)):
    return {"items": branch_service.inv_products(db, ma_cn)}

@router.get("/{ma_cn}/inventory/vaccines")
def inv_vaccines(ma_cn: str, db: Session = Depends(get_db)):
    return {"items": branch_service.inv_vaccines(db, ma_cn)}

@router.get("/{ma_cn}/vaccinations")
def vaccinations_in_range(ma_cn: str, from_date: str, to_date: str, db: Session = Depends(get_db)):
    return {"items": branch_service.vaccinations_in_range(db, ma_cn, from_date, to_date)}
