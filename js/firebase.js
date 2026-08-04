/* ═══════════════════════════════════════════════════════════════
   SIMID MEDIA — BACKEND LAYER
   Tries Firebase. If keys are missing in js/config.js, the site
   drops into OFFLINE DEMO mode: everything still works, but data
   only lives in the visitor's own browser (chat still syncs
   between tabs of the same machine, for fun).
   ═══════════════════════════════════════════════════════════════ */

const DB = {
  mode: "offline",   // 'online' | 'offline'
  database: null,
  storage: null
};

DB.init = function () {
  const fb = CONFIG.firebase || {};
  const hasKeys = fb.apiKey && fb.databaseURL;
  if (!hasKeys) {
    DB.mode = "offline";
    console.log("[SIMID] offline demo mode — add Firebase keys in js/config.js to go global.");
    return;
  }
  try {
    firebase.initializeApp(fb);
    DB.database = firebase.database();
    DB.storage = firebase.storage();
    DB.mode = "online";
    console.log("[SIMID] firebase connected.");
  } catch (err) {
    console.warn("[SIMID] firebase init failed → offline mode", err);
    DB.mode = "offline";
  }
};

/* ─────────── tiny local store (offline mode) ─────────── */
const LocalStore = {
  get(key, fallback) {
    try { return JSON.parse(localStorage.getItem("simid_" + key)) ?? fallback; }
    catch { return fallback; }
  },
  set(key, val) {
    try { localStorage.setItem("simid_" + key, JSON.stringify(val)); } catch {}
  }
};

/* ─────────── toast ─────────── */
let toastTimer = null;
function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 3400);
}

/* ─────────── escape html (chat/notes safety) ─────────── */
function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

/* ─────────── net status dot in nav ─────────── */
DB.updateStatus = function () {
  const el = document.getElementById("netStatus");
  if (!el) return;
  if (DB.mode === "online") {
    el.textContent = "NET::GLOBAL";
    el.className = "nav-status online";
  } else {
    el.textContent = "NET::DEMO";
    el.className = "nav-status offline";
  }
};
