"""Record CRUD, filtered list, and CSV export — all driven by shared/fields.json."""

import csv
import inspect
import io
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, create_model
from sqlmodel import Session, col, or_, select

from .auth import get_current_user
from .config import FIELDS, PERSONAL_FIELDS, SELECT_FIELDS, TEXT_SEARCH_FIELDS
from .models import PY_TYPES, Record, User, get_session

router = APIRouter(prefix="/records", tags=["records"])

EXPORT_COLUMNS = (
    ["id", "created_at", "created_by", "consent_given", "consent_timestamp"]
    + [f["name"] for f in FIELDS]
)

RecordIn = create_model(
    "RecordIn",
    consent_given=(bool, False),
    **{f["name"]: (Optional[PY_TYPES[f["type"]]], None) for f in FIELDS},
)


def _validate_selects(body: BaseModel) -> None:
    for name, options in SELECT_FIELDS.items():
        value = getattr(body, name)
        if value is not None and value not in options:
            raise HTTPException(
                422, f"Invalid value for {name!r}: {value!r}. Allowed: {options}"
            )


def _apply_consent(record, body) -> None:
    """Copy field values onto the record; personal fields require consent."""
    for f in FIELDS:
        value = getattr(body, f["name"])
        if f.get("personal") and not body.consent_given:
            value = None
        setattr(record, f["name"], value)
    if body.consent_given and not record.consent_given:
        record.consent_timestamp = datetime.now(timezone.utc)
    elif not body.consent_given:
        record.consent_timestamp = None
    record.consent_given = body.consent_given


def _list_filters_dependency():
    """Build a dependency whose signature has one query param per select field,
    so filters appear in Swagger and stay in sync with fields.json."""

    def collect(**kwargs):
        return kwargs

    params = [
        inspect.Parameter(
            "q",
            inspect.Parameter.KEYWORD_ONLY,
            default=Query(None, description="Free-text search across text fields"),
            annotation=Optional[str],
        ),
        inspect.Parameter(
            "created_by",
            inspect.Parameter.KEYWORD_ONLY,
            default=Query(None),
            annotation=Optional[str],
        ),
    ]
    for name, options in SELECT_FIELDS.items():
        params.append(
            inspect.Parameter(
                name,
                inspect.Parameter.KEYWORD_ONLY,
                default=Query(None, description=f"One of: {', '.join(options)}"),
                annotation=Optional[str],
            )
        )
    collect.__signature__ = inspect.Signature(params)
    return collect


list_filters = _list_filters_dependency()


def _filtered_query(filters: dict):
    query = select(Record)
    q = filters.pop("q", None)
    if q:
        clauses = [col(getattr(Record, name)).contains(q) for name in TEXT_SEARCH_FIELDS]
        query = query.where(or_(*clauses))
    for name, value in filters.items():
        if value is not None:
            query = query.where(getattr(Record, name) == value)
    return query.order_by(col(Record.created_at).desc())


@router.get("")
def list_records(
    filters: dict = Depends(list_filters),
    limit: int = Query(200, le=1000),
    offset: int = 0,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    query = _filtered_query(dict(filters)).limit(limit).offset(offset)
    return session.exec(query).all()


@router.get("/export.csv")
def export_csv(
    filters: dict = Depends(list_filters),
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    rows = session.exec(_filtered_query(dict(filters))).all()
    buf = io.StringIO()
    writer = csv.DictWriter(buf, fieldnames=EXPORT_COLUMNS)
    writer.writeheader()
    for r in rows:
        writer.writerow({k: getattr(r, k) for k in EXPORT_COLUMNS})
    buf.seek(0)
    filename = f"records-{datetime.now(timezone.utc):%Y%m%d-%H%M}.csv"
    return StreamingResponse(
        buf,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/{record_id}")
def get_record(
    record_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    record = session.get(Record, record_id)
    if record is None:
        raise HTTPException(404, "Record not found")
    return record


@router.post("", status_code=201)
def create_record(
    body: RecordIn,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    _validate_selects(body)
    record = Record(created_by=user.email)
    _apply_consent(record, body)
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


@router.put("/{record_id}")
def update_record(
    record_id: int,
    body: RecordIn,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    record = session.get(Record, record_id)
    if record is None:
        raise HTTPException(404, "Record not found")
    _validate_selects(body)
    _apply_consent(record, body)
    session.add(record)
    session.commit()
    session.refresh(record)
    return record


@router.delete("/{record_id}", status_code=204)
def delete_record(
    record_id: int,
    session: Session = Depends(get_session),
    user: User = Depends(get_current_user),
):
    record = session.get(Record, record_id)
    if record is None:
        raise HTTPException(404, "Record not found")
    session.delete(record)
    session.commit()
