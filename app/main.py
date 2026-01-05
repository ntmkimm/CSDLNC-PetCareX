# app/main.py
from fastapi import FastAPI
from app.db.migrate import migrate
from app.api.router import api_router

app = FastAPI(title="PetCareX API")

@app.on_event("startup")
def on_startup():
    migrate()

app.include_router(api_router, prefix="/api")
