# app/api/core/config.py
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    # SQL Server connection
    MSSQL_SERVER: str = "localhost"
    MSSQL_PORT: int = 1433
    MSSQL_USER: str = "sa"
    MSSQL_PASSWORD: str = "YourStrong!Passw0rd"
    MSSQL_DB: str = "PetCareX"
    MSSQL_DRIVER: str = "ODBC Driver 17 for SQL Server"

    JWT_SECRET: str = "change-me"
    JWT_ALG: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    class Config:
        env_file = ".env"

settings = Settings()
