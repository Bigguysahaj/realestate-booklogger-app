"""User + Record models. Record's data columns are generated from shared/fields.json."""

from datetime import datetime, timezone
from typing import Optional

from sqlalchemy import text
from sqlmodel import Field, Session, SQLModel, create_engine

from .config import DATABASE_URL, FIELDS


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(index=True, unique=True)
    password_hash: str
    name: str = ""


PY_TYPES = {"text": str, "number": float, "select": str}


def _record_annotations() -> dict:
    anns: dict = {
        "id": Optional[int],
        "created_at": datetime,
        "created_by": str,
        "consent_given": bool,
        "consent_timestamp": Optional[datetime],
    }
    for f in FIELDS:
        anns[f["name"]] = Optional[PY_TYPES[f["type"]]]
    return anns


def _record_namespace() -> dict:
    ns: dict = {
        "__annotations__": _record_annotations(),
        "id": Field(default=None, primary_key=True),
        "created_at": Field(default_factory=lambda: datetime.now(timezone.utc)),
        "created_by": Field(default="", index=True),
        "consent_given": Field(default=False),
        "consent_timestamp": Field(default=None),
    }
    for f in FIELDS:
        ns[f["name"]] = Field(default=None)
    return ns


Record = type("Record", (SQLModel,), _record_namespace(), table=True)

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})


def init_db() -> None:
    SQLModel.metadata.create_all(engine)
    _add_missing_columns()


def _add_missing_columns() -> None:
    """Tiny migration: when a field is added to fields.json, ALTER the existing table."""
    sql_types = {"text": "VARCHAR", "number": "FLOAT", "select": "VARCHAR"}
    with engine.connect() as conn:
        existing = {
            row[1] for row in conn.execute(text("PRAGMA table_info(record)"))
        }
        for f in FIELDS:
            if f["name"] not in existing:
                conn.execute(
                    text(
                        f'ALTER TABLE record ADD COLUMN "{f["name"]}" {sql_types[f["type"]]}'
                    )
                )
        conn.commit()


def get_session():
    with Session(engine) as session:
        yield session
