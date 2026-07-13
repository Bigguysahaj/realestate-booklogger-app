import json
import os
from pathlib import Path

BACKEND_DIR = Path(__file__).resolve().parent.parent
REPO_ROOT = BACKEND_DIR.parent

FIELDS_PATH = REPO_ROOT / "shared" / "fields.json"
FIELDS: list[dict] = json.loads(FIELDS_PATH.read_text(encoding="utf-8"))

FIELD_NAMES = [f["name"] for f in FIELDS]
PERSONAL_FIELDS = [f["name"] for f in FIELDS if f.get("personal")]
SELECT_FIELDS = {f["name"]: f["options"] for f in FIELDS if f["type"] == "select"}
TEXT_SEARCH_FIELDS = [f["name"] for f in FIELDS if f["type"] == "text"]

DATABASE_URL = os.environ.get(
    "DATABASE_URL", f"sqlite:///{BACKEND_DIR / 'booklogger.db'}"
)
JWT_SECRET = os.environ.get("JWT_SECRET", "dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_DAYS = 30
