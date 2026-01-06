# app/services/db_utils.py
from __future__ import annotations

import re
from typing import Any, Dict, Optional

from fastapi import HTTPException
from sqlalchemy import text
from sqlalchemy.exc import DBAPIError
from sqlalchemy.orm import Session


_ERRNO_RE = re.compile(r"\b(\d{5})\b")  # bắt 5 chữ số như 63006


def _extract_sqlserver_throw_code(e: DBAPIError) -> Optional[int]:
    """
    Cố gắng lấy mã lỗi từ SQL Server THROW (vd: 63006).
    Tuỳ driver (pyodbc/pymssql) message khác nhau, nên mình bắt theo regex 5 chữ số.
    """
    msg = str(e.orig) if getattr(e, "orig", None) is not None else str(e)
    m = _ERRNO_RE.search(msg)
    if not m:
        return None
    try:
        return int(m.group(1))
    except ValueError:
        return None


def exec_sql(db: Session, sql: str, params: Optional[Dict[str, Any]] = None):
    """
    Execute SQL text, không auto commit. Dùng cho SELECT hoặc DML tuỳ bạn.
    """
    return db.execute(text(sql), params or {})


def exec_sp(db: Session, sp_sql: str, params: Dict[str, Any], *, commit: bool = True) -> None:
    """
    Gọi stored procedure: sp_sql dạng "EXEC dbo.sp_KeThuoc @MaPhien=:p, ..."
    Mặc định commit; nếu fail thì rollback và ném HTTPException.
    """
    try:
        db.execute(text(sp_sql), params)
        if commit:
            db.commit()
    except DBAPIError as e:
        db.rollback()

        code = _extract_sqlserver_throw_code(e)
        msg = str(e.orig) if getattr(e, "orig", None) is not None else str(e)

        # Mapping nhẹ nhàng:
        # - Lỗi nghiệp vụ / validation → 400
        # - Xung đột tồn kho / constraint → 409 (tuỳ bạn)
        status = 400
        if code in {60005, 61005, 63004, 63006}:  # không đủ tồn kho / không đủ liều
            status = 409

        raise HTTPException(status_code=status, detail=f"DB error{f' ({code})' if code else ''}: {msg}")
