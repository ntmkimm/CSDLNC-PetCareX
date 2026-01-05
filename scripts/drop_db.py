from sqlalchemy import text
from app.db.session import ENGINE, MASTER_ENGINE  # chỉnh import theo project bạn
from app.core.config import settings


def drop_database(db_name: str):
    # 1) Đóng connection pool đang trỏ vào DB cần drop (PetCareX)
    try:
        ENGINE.dispose()
    except Exception:
        pass

    # 2) Drop DB từ master, bắt buộc autocommit
    with MASTER_ENGINE.connect().execution_options(isolation_level="AUTOCOMMIT") as conn:
        # nếu DB tồn tại thì đá hết session rồi drop
        conn.execute(text(f"""
            IF DB_ID(:db) IS NOT NULL
            BEGIN
                ALTER DATABASE [{db_name}] SET SINGLE_USER WITH ROLLBACK IMMEDIATE;
                DROP DATABASE [{db_name}];
            END
        """), {"db": db_name})


if __name__ == "__main__":
    drop_database(settings.MSSQL_DB)
    print("Dropped database:", settings.MSSQL_DB)
