# Real Estate Book Logger

Field-data bookkeeping for property records (Delhi-NCR flavored): a mobile app
for logging properties door-to-door, a FastAPI backend, and a web dashboard
with search, filters, and CSV export.

- **Backend** — FastAPI + SQLModel + SQLite, JWT email/password auth, auto
  Swagger docs at `/docs`
- **Dashboard** — served by the backend at `/dashboard` (searchable table,
  per-field filters, CSV export)
- **Mobile** — Expo React Native + react-native-paper (login, record list,
  dynamic add/edit form, detail view). Online-first; no offline sync in v1.

**One config to rule them all:** `shared/fields.json` defines the record
fields. The database model, API filters, dashboard table, and mobile form are
all generated from it — add or rename a field by editing that one array.
Fields marked `"personal": true` are consent-gated: they are disabled in the
form and stripped by the server unless the consent checkbox was ticked.

## Run the backend

```bash
cd backend
python3 -m venv .venv
.venv/bin/pip install -r requirements.txt

# Create the admin user + sample data (idempotent)
.venv/bin/python -m app.seed                     # admin@example.com / changeme123
# or: .venv/bin/python -m app.seed you@example.com yourpassword "Your Name"

.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

Then open:

- http://localhost:8000/dashboard — web dashboard
- http://localhost:8000/docs — Swagger API docs

To add more users, run the seed script again with different credentials
(there is deliberately no public registration endpoint).

## Run the mobile app

```bash
cd mobile
npm install
npm start          # Expo dev server — scan the QR with Expo Go on your phone
```

The app auto-targets port 8000 **on the same machine that runs the Expo dev
server**, so if the backend runs on your laptop (with `--host 0.0.0.0`) and
your phone is on the same Wi-Fi, it just works. To point elsewhere:

```bash
EXPO_PUBLIC_API_URL=https://api.example.com npm start
```

Log in with the seeded credentials. The "+" button opens the add form; the
consent checkbox unlocks the owner/intent fields.

### Note for WSL2 users

Phones can't reach a dev server inside WSL2 directly. Either run
`npm start -- --tunnel`, or run the Expo dev server on Windows, or set up
`netsh` port-forwarding for ports 8081 and 8000.

## Changing the fields

Edit `shared/fields.json`, then:

1. **Backend** — restart uvicorn; new columns are added to SQLite automatically.
2. **Dashboard** — nothing to do (it reads `/fields` at load).
3. **Mobile** — restart `npm start` (it re-copies the config into the app).

## Deployment

- **Backend**: runs on a Linux box behind [Caddy](https://caddyserver.com/) as
  a reverse proxy (Caddy terminates TLS with automatic HTTPS). Roughly:
  `uvicorn app.main:app --host 127.0.0.1 --port 8000` under systemd, plus a
  Caddyfile entry like `api.example.com { reverse_proxy 127.0.0.1:8000 }`.
  Set a real `JWT_SECRET` env var in production.
- **Android app**: built as an APK with [EAS Build](https://docs.expo.dev/build/setup/) —
  `npx eas build --platform android --profile preview` (with
  `EXPO_PUBLIC_API_URL` set to the deployed backend URL in `eas.json`).
