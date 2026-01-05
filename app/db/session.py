# app/api/db/session.py
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.core.config import settings
from sqlalchemy.engine import URL

def build_conn_str(db_name: str) -> str:
    return URL.create(
        "mssql+pyodbc",
        username=settings.MSSQL_USER,
        password=settings.MSSQL_PASSWORD,
        host=settings.MSSQL_SERVER,
        port=settings.MSSQL_PORT,
        database=db_name,
        query={
            "driver": settings.MSSQL_DRIVER,
            "Encrypt": "no",
        },
    )

ENGINE = create_engine(build_conn_str(settings.MSSQL_DB), pool_pre_ping=True, future=True)
SessionLocal = sessionmaker(bind=ENGINE, autoflush=False, autocommit=False, future=True)

MASTER_ENGINE = create_engine(build_conn_str("master"), pool_pre_ping=True, future=True)
