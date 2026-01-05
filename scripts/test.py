from sqlalchemy import create_engine, text
from sqlalchemy.engine import URL

url = URL.create(
    "mssql+pyodbc",
    username="sa",
    password="YourStrong!Passw0rd",
    host="localhost",
    port=1433,
    database="master",
    query={"driver": "ODBC Driver 17 for SQL Server", "Encrypt": "no"},
)

engine = create_engine(url, future=True, pool_pre_ping=True)

with engine.connect() as conn:
    print(conn.execute(text("SELECT @@VERSION")).scalar())
