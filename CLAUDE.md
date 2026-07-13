# Real Estate Book Logger

Field-data bookkeeping for Delhi-NCR property records: Expo React Native app
for agents in the field, FastAPI backend, static web dashboard.

## The one rule that matters

**`shared/fields.json` is the single source of truth for record fields.**
The DB model, API validation/filters, dashboard columns/filters, and the
mobile form/detail view are all generated from it. To add, rename, or remove
a field, edit that one file — do not hand-edit field lists anywhere else.

- Field shape: `{ name, label, type: "text"|"number"|"select", options?, personal?, multiline? }`
- `personal: true` fields are consent-gated: the backend **nulls them** on
  create/update when `consent_given` is false (enforced in
  `backend/app/records.py:_apply_consent`), and the mobile form disables them
  until the consent checkbox is ticked.
- The mobile app imports `mobile/src/fields.json`, a **generated copy** made by
  `mobile/scripts/sync-fields.js` (runs on `npm install` / `npm start`).
  Never edit the copy. If you change `shared/fields.json`, re-run
  `node scripts/sync-fields.js` from `mobile/`.
- New fields appear as new SQLite columns via a startup `ALTER TABLE` shim in
  `backend/app/models.py:_add_missing_columns`. Renames leave the old column
  orphaned (harmless). Type changes of an existing field are NOT migrated.

## Layout

- `backend/` — FastAPI + SQLModel + SQLite. `app/models.py` builds the
  `Record` class dynamically from the fields config. JWT auth in `app/auth.py`
  (PyJWT + bcrypt, users are seed-only — no registration endpoint).
  `app/records.py` has CRUD, per-select-field query-param filters, free-text
  `q` search over text fields, and `/records/export.csv`.
- `backend/static/` — vanilla-JS dashboard served at `/dashboard` (no build step).
- `mobile/` — Expo (TypeScript) + react-native-paper + react-navigation.
  Screens in `src/screens/`; API client in `src/api.ts` (base URL from
  `EXPO_PUBLIC_API_URL`, defaulting to `<expo dev host>:8000`).

## Commands

```bash
# Backend (from backend/, venv at backend/.venv)
.venv/bin/python -m app.seed          # admin@example.com / changeme123 + sample data
.venv/bin/uvicorn app.main:app --reload

# Mobile (from mobile/)
npm start                              # Expo dev server (also re-syncs fields.json)
npx tsc --noEmit                       # typecheck
npx expo export --platform android     # verify the bundle compiles
```

Swagger docs at `/docs`. Smoke-test the API with curl (login → Bearer token).

## Conventions / gotchas

- Everything except auth is behind `get_current_user`; all logged-in users see
  all records (shared book by design).
- All record fields are optional — partial field data is expected.
- `JWT_SECRET` env var must be set in production (defaults to a dev value).
- Online-first: no offline sync in v1; don't add caching layers casually.
