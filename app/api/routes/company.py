# app/api/routes/company.py
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.services import company_service

router = APIRouter()

@router.get("/revenue/by-branch")
def revenue_by_branch(db: Session = Depends(get_db)):
    return {"items": company_service.revenue_by_branch(db)}

@router.get("/revenue/total")
def revenue_total(db: Session = Depends(get_db)):
    return company_service.revenue_total(db)

@router.get("/services/top")
def top_services(months: int = 6, db: Session = Depends(get_db)):
    return {"items": company_service.top_services(db, months)}

@router.get("/memberships/stats")
def membership_stats(db: Session = Depends(get_db)):
    return {"items": company_service.membership_stats(db)}

@router.get("/customers/by-branch")
def customers_by_branch(db: Session = Depends(get_db)):
    return {"items": company_service.customers_by_branch(db)}

@router.get("/pets/stats")
def pets_stats(db: Session = Depends(get_db)):
    return {"items": company_service.pets_stats(db)}
