from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

from . import auth, records
from .config import FIELDS
from .models import init_db

STATIC_DIR = Path(__file__).resolve().parent.parent / "static"

app = FastAPI(
    title="Real Estate Book Logger",
    description="Field-data bookkeeping for Delhi-NCR property records.",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth.router)
app.include_router(records.router)


@app.on_event("startup")
def on_startup():
    init_db()


@app.get("/fields", tags=["meta"])
def get_fields():
    return FIELDS


@app.get("/dashboard", include_in_schema=False)
def dashboard():
    return FileResponse(STATIC_DIR / "dashboard.html")


app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
