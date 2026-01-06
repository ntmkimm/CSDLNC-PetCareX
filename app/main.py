# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.migrate import migrate
from app.api.router import api_router

app = FastAPI(title="PetCareX API")

origins = [
    "http://localhost:3000",   # Next.js dev
    "http://127.0.0.1:3000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,     # nếu sau này dùng cookie auth
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
def on_startup():
    migrate()

app.include_router(api_router, prefix="/api")
