/* ═══════════════════════════════════════════════════════════════
   SIMID MEDIA — SIGHT STORAGE (gallery)
   Simid uploads random pictures (needs admin key), the public
   simply sees the whole wall.
   ═══════════════════════════════════════════════════════════════ */

const Gallery = {
  seen: new Set(),
  currentFile: null
};

Gallery.init = function () {
  const fileInput = document.getElementById("fileInput");
  const adminBtn = document.getElementById("adminModeBtn");
  const keyInput = document.getElementById("adminKeyInput");
  const uploadBtn = document.getElementById("uploadBtn");
  const status = document.getElementById("uploadStatus");
  if (!fileInput) return;

  fileInput.addEventListener("change", () => {
    Gallery.currentFile = fileInput.files[0] || null;
    if (Gallery.currentFile) {
      status.textContent = "// selected: " + Gallery.currentFile.name.slice(0, 30);
    }
  });

  adminBtn.addEventListener("click", () => {
    const show = keyInput.hidden;
    keyInput.hidden = !show;
    uploadBtn.hidden = !show;
    if (show) keyInput.focus();
  });

  uploadBtn.addEventListener("click", async () => {
    const key = keyInput.value.trim();
    if (key !== CONFIG.adminKey) { showToast("// wrong key. no touchy."); return; }
    if (!Gallery.currentFile) { showToast("// pick a picture first ⬆"); return; }
    if (!Gallery.currentFile.type.startsWith("image/")) { showToast("// that's not an image, fam"); return; }
    status.textContent = "// uploading...";
    try {
      await Gallery.upload(Gallery.currentFile, key);
      status.textContent = "// uploaded ✓";
      keyInput.value = "";
      keyInput.hidden = true;
      uploadBtn.hidden = true;
      fileInput.value = "";
      Gallery.currentFile = null;
    } catch (err) {
      status.textContent = "";
      showToast("// upload failed: " + (err.message || err));
    }
  });

  Gallery.watch();
};

Gallery.upload = async function (file, key) {
  const name = Date.now() + "-" + file.name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-40);

  if (DB.mode === "online") {
    const ref = DB.storage.ref("uploads/" + name);
    await ref.put(file);
    const url = await ref.getDownloadURL();
    await DB.database.ref("uploads").push({ url, name, key, ts: Date.now() });
    return;
  }

  // offline demo: dataURL into localStorage
  if (file.size > 3.5 * 1024 * 1024) {
    throw new Error("too big for demo mode — keep it under 3.5MB or go global with Firebase");
  }
  const dataUrl = await new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result);
    r.onerror = rej;
    r.readAsDataURL(file);
  });
  const rec = { url: dataUrl, name, key, ts: Date.now() };
  const list = LocalStore.get("uploads", []);
  list.push(rec);
  if (list.length > 30) list.splice(0, list.length - 30);
  LocalStore.set("uploads", list);
  Gallery.renderItem(rec);
};

Gallery.watch = function () {
  const grid = document.getElementById("galleryGrid");
  const empty = document.getElementById("galleryEmpty");
  if (!grid) return;

  const after = () => {
    empty.style.display = grid.children.length ? "none" : "block";
  };

  if (DB.mode === "online") {
    DB.database.ref("uploads").orderByChild("ts").limitToLast(60).on("child_added", (snap) => {
      const r = snap.val();
      if (!r || !r.url) return;
      r.id = snap.key;
      Gallery.renderItem(r);
      after();
    });
    after();
    return;
  }

  // offline demo
  LocalStore.get("uploads", []).forEach((r) => {
    r.id = r.id || ("off-" + r.ts + "-" + r.name);
    Gallery.renderItem(r);
  });
  after();
  window.addEventListener("storage", (e) => {
    if (e.key === "simid_uploads") {
      LocalStore.get("uploads", []).forEach((r) => {
        r.id = r.id || ("off-" + r.ts + "-" + r.name);
        Gallery.renderItem(r);
      });
      after();
    }
  });
};

Gallery.renderItem = function (r) {
  const grid = document.getElementById("galleryGrid");
  if (!grid || Gallery.seen.has(r.id)) return;
  Gallery.seen.add(r.id);

  const item = document.createElement("div");
  item.className = "gallery-item";
  const img = document.createElement("img");
  img.loading = "lazy";
  img.alt = "sight: " + r.name;
  img.src = r.url;
  img.onerror = () => { item.style.display = "none"; };
  const cap = document.createElement("div");
  cap.className = "g-cap";
  const d = new Date(r.ts || Date.now());
  cap.textContent = d.toLocaleDateString([], { month: "short", day: "numeric" }) + " :: " + (r.name || "sight");
  item.appendChild(img);
  item.appendChild(cap);
  grid.prepend(item);
};
