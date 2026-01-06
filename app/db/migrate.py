# app/api/db/migrate.py
from pathlib import Path
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError

from app.core.config import settings
from app.db.session import MASTER_ENGINE, ENGINE

MIGRATIONS_DIR = Path(__file__).resolve().parents[2] / "migrations"


def ensure_database_exists():
    db = settings.MSSQL_DB 
    print("Ensuring database exists:", db)
    # 1) Check existence (can be in a transaction ok)
    with MASTER_ENGINE.connect() as conn:
        exists = conn.execute(text("SELECT DB_ID(:db)"), {"db": db}).scalar()
    print("Database exists:", exists is not None)
    if exists is None:
        print("Database does not exist, creating:", db)
        # 2) CREATE DATABASE must be AUTOCOMMIT
        with MASTER_ENGINE.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
            conn.execute(text(f"CREATE DATABASE [{db}]"))


def ensure_migrations_table():
    with ENGINE.begin() as conn:
        conn.execute(text("""
        IF OBJECT_ID('__schema_migrations', 'U') IS NULL
        CREATE TABLE __schema_migrations(
            filename NVARCHAR(255) NOT NULL PRIMARY KEY,
            applied_at DATETIME NOT NULL DEFAULT GETDATE()
        );
        """))


def is_applied(conn, filename: str) -> bool:
    return conn.execute(
        text("SELECT 1 FROM __schema_migrations WHERE filename = :f"),
        {"f": filename},
    ).first() is not None


def mark_applied(conn, filename: str):
    conn.execute(
        text("INSERT INTO __schema_migrations(filename) VALUES (:f)"),
        {"f": filename},
    )


def split_go_batches(sql: str):
    batches = []
    cur = []
    for line in sql.splitlines():
        if line.strip().upper() == "GO":
            if cur:
                batches.append("\n".join(cur))
                cur = []
        else:
            cur.append(line)
    if cur:
        batches.append("\n".join(cur))
    return [b for b in batches if b.strip()]


def run_sql_file(conn, path: Path):
    sql = path.read_text(encoding="utf-8")
    for batch in split_go_batches(sql):
        conn.execute(text(batch))


def migrate():
    ensure_database_exists()
    ensure_migrations_table()

    sql_files = sorted(MIGRATIONS_DIR.glob("*.sql"))

    with ENGINE.begin() as conn:
        for f in sql_files:
            if not is_applied(conn, f.name):
                print("Applying migration:", f.name)
                run_sql_file(conn, f)
                mark_applied(conn, f.name)
            else:
                print("Skipping already applied migration:", f.name)
