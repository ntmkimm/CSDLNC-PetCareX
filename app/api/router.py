# app/api/router.py
from fastapi import APIRouter

from app.api.routes import auth, customer, staff, branch, company

api_router = APIRouter()

api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(customer.router, prefix="/customer", tags=["customer"])
api_router.include_router(staff.router, prefix="/staff", tags=["staff"])
api_router.include_router(branch.router, prefix="/branch", tags=["branch"])
api_router.include_router(company.router, prefix="/company", tags=["company"])
