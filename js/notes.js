/* ═══════════════════════════════════════════════════════════════
   SIMID MEDIA — SIMID'S NOTE
   I write, you read. Writing requires the admin key from
   js/config.js; visitors only ever see.
   ═══════════════════════════════════════════════════════════════ */

const Notes = {
  lastVal: null
};

Notes.init = function () {
  const editBtn = document.getElementById("noteEditBtn");
  const editor = document.getElementById("noteEditor");
  const cancelBtn = document.getElementById("noteCancel");
  const saveBtn = document.getElementById("noteSave");
  const textEl = document.getElementById("noteText");
  const keyEl = document.getElementById("noteKey");
  if (!editBtn) return;

  editBtn.addEventListener("click", () => {
    editor.hidden = !editor.hidden;
    if (!editor.hidden) {
      textEl.value = Notes.lastVal ? Notes.lastVal.text : "";
      keyEl.value = "";
      keyEl.focus();
    }
  });
  cancelBtn.addEventListener("click", () => { editor.hidden = true; });

  saveBtn.addEventListener("click", () => {
    const key = keyEl.value.trim();
    const text = textEl.value.trim().slice(0, 600);
    if (!key || !text) { showToast("// need the key + some words"); return; }
    if (key !== CONFIG.adminKey) { showToast("// wrong key. no touchy."); return; }

    if (DB.mode === "online") {
      DB.database.ref("note/main").set({ text, key, ts: Date.now() })
        .then(() => { editor.hidden = true; showToast("// note beamed to the public ✓"); })
        .catch((err) => showToast("// save failed: " + err.message));
    } else {
      LocalStore.set("note", { text, key, ts: Date.now() });
      Notes.render({ text, key, ts: Date.now() });
      editor.hidden = true;
      showToast("// note saved (local demo mode) ✓");
    }
  });

  Notes.watch();
};

Notes.watch = function () {
  if (DB.mode === "online") {
    DB.database.ref("note/main").on("value", (snap) => {
      Notes.render(snap.val() || {});
    });
    return;
  }
  Notes.render(LocalStore.get("note", null));
  window.addEventListener("storage", (e) => {
    if (e.key === "simid_note") Notes.render(LocalStore.get("note", null));
  });
};

Notes.render = function (n) {
  const body = document.getElementById("noteBody");
  const date = document.getElementById("noteDate");
  if (!body) return;
  Notes.lastVal = n;

  if (n && n.text) {
    body.textContent = n.text;
    body.style.fontSize = "16px";
    date.textContent = new Date(n.ts || Date.now()).toLocaleDateString([], { year: "numeric", month: "short", day: "numeric" });
  } else {
    body.innerHTML = "";
    const pre = document.createElement("pre");
    pre.className = "ascii note-placeholder";
    ASCII.drawInto(pre, "note");
    body.appendChild(pre);
    date.textContent = "--/--/--";
  }
};
