/* Dashboard: columns and filters are derived from /fields (shared/fields.json). */

const $ = (id) => document.getElementById(id);
const state = { token: localStorage.getItem("token"), fields: [], records: [], sort: { key: "created_at", dir: -1 } };

const META_COLUMNS = [
  { name: "id", label: "ID" },
  { name: "created_at", label: "Created" },
  { name: "created_by", label: "By" },
  { name: "consent_given", label: "Consent" },
];

async function api(path, opts = {}) {
  const res = await fetch(path, {
    ...opts,
    headers: { Authorization: `Bearer ${state.token}`, ...(opts.headers || {}) },
  });
  if (res.status === 401) { logout(); throw new Error("unauthorized"); }
  if (!res.ok) throw new Error(`${res.status} ${await res.text()}`);
  return res;
}

/* ---------- auth ---------- */

$("login").addEventListener("submit", async (e) => {
  e.preventDefault();
  $("loginErr").textContent = "";
  try {
    const res = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: $("email").value, password: $("password").value }),
    });
    if (!res.ok) throw new Error((await res.json()).detail || "Login failed");
    const data = await res.json();
    state.token = data.access_token;
    localStorage.setItem("token", state.token);
    localStorage.setItem("who", data.email);
    boot();
  } catch (err) {
    $("loginErr").textContent = err.message;
  }
});

function logout() {
  localStorage.removeItem("token");
  state.token = null;
  $("app").classList.add("hidden");
  $("topbar").classList.add("hidden");
  $("login").classList.remove("hidden");
}
$("logoutBtn").addEventListener("click", logout);

/* ---------- filters ---------- */

function buildFilters() {
  const wrap = $("filters");
  wrap.innerHTML = "";

  const search = document.createElement("label");
  search.innerHTML = `Search<input id="q" type="search" placeholder="Address, owner, notes…">`;
  wrap.appendChild(search);

  for (const f of state.fields.filter((f) => f.type === "select")) {
    const label = document.createElement("label");
    const opts = ['<option value="">All</option>']
      .concat(f.options.map((o) => `<option>${o}</option>`)).join("");
    label.innerHTML = `${f.label}<select data-filter="${f.name}">${opts}</select>`;
    wrap.appendChild(label);
  }

  const clear = document.createElement("button");
  clear.textContent = "Clear";
  clear.addEventListener("click", () => { buildFilters(); load(); });
  wrap.appendChild(clear);

  let t;
  $("q").addEventListener("input", () => { clearTimeout(t); t = setTimeout(load, 250); });
  wrap.querySelectorAll("select").forEach((s) => s.addEventListener("change", load));
}

function filterParams() {
  const params = new URLSearchParams();
  const q = $("q")?.value.trim();
  if (q) params.set("q", q);
  document.querySelectorAll("[data-filter]").forEach((s) => {
    if (s.value) params.set(s.dataset.filter, s.value);
  });
  return params;
}

/* ---------- table ---------- */

function columns() {
  return META_COLUMNS.concat(state.fields.map((f) => ({ name: f.name, label: f.label, personal: f.personal })));
}

function buildHead() {
  $("headRow").innerHTML = columns()
    .map((c) => `<th data-sort="${c.name}">${c.label}</th>`).join("");
  $("headRow").querySelectorAll("th").forEach((th) =>
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      state.sort = { key, dir: state.sort.key === key ? -state.sort.dir : 1 };
      render();
    })
  );
}

function cell(record, colName) {
  const value = record[colName];
  if (colName === "consent_given") return value ? '<span class="pill">Yes</span>' : "—";
  if (colName === "created_at" && value) return value.slice(0, 16).replace("T", " ");
  const field = state.fields.find((f) => f.name === colName);
  if (field?.personal && !record.consent_given) return '<span class="noconsent">no consent</span>';
  if (value === null || value === undefined || value === "") return "—";
  if (colName === "expected_price") return "₹" + Number(value).toLocaleString("en-IN");
  return String(value).replace(/</g, "&lt;");
}

function render() {
  const { key, dir } = state.sort;
  const rows = [...state.records].sort((a, b) => {
    const av = a[key], bv = b[key];
    if (av == null) return 1;
    if (bv == null) return -1;
    return (typeof av === "number" ? av - bv : String(av).localeCompare(String(bv))) * dir;
  });
  $("rows").innerHTML = rows
    .map((r) => `<tr>${columns().map((c) => `<td title="${c.name}">${cell(r, c.name)}</td>`).join("")}</tr>`)
    .join("");
  $("count").textContent = `${rows.length} record${rows.length === 1 ? "" : "s"}`;
}

async function load() {
  const res = await api(`/records?${filterParams()}`);
  state.records = await res.json();
  render();
}

/* ---------- export ---------- */

$("exportBtn").addEventListener("click", async () => {
  const res = await api(`/records/export.csv?${filterParams()}`);
  const blob = await res.blob();
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = (res.headers.get("Content-Disposition") || "").match(/filename="(.+)"/)?.[1] || "records.csv";
  a.click();
  URL.revokeObjectURL(a.href);
});

/* ---------- boot ---------- */

async function boot() {
  if (!state.token) return;
  try {
    state.fields = await (await api("/fields")).json();
  } catch { return; }
  $("login").classList.add("hidden");
  $("topbar").classList.remove("hidden");
  $("app").classList.remove("hidden");
  $("who").textContent = localStorage.getItem("who") || "";
  buildFilters();
  buildHead();
  load();
}

boot();
