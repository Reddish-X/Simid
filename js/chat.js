/* ═══════════════════════════════════════════════════════════════
   SIMID MEDIA — GLOBAL CHAT // 50 chars max // no rules
   Online  → Firebase Realtime Database (everyone on earth)
   Offline → localStorage + cross-tab sync (demo mode)
   ═══════════════════════════════════════════════════════════════ */

const Chat = {
  nick: "",
  seen: new Set(),
  lastSent: 0,
  nameColors: ["#c8cdd6", "#9aa2b0", "#e4e8ef", "#b7bdc9", "#8d95a5", "#d2d7e0", "#aab1c0", "#f0f2f6"]
};

Chat.init = function () {
  const form = document.getElementById("chatForm");
  const input = document.getElementById("chatText");
  const nameIn = document.getElementById("chatName");
  const counter = document.getElementById("chatCounter");
  if (!form) return;

  // nick: saved, or a fresh chaotic one
  Chat.nick = LocalStore.get("nick", null) || ("GLITCH_" + Math.floor(1000 + Math.random() * 9000));
  nameIn.value = Chat.nick;
  nameIn.addEventListener("change", () => {
    Chat.nick = (nameIn.value.trim().slice(0, 16)) || Chat.nick;
    nameIn.value = Chat.nick;
    LocalStore.set("nick", Chat.nick);
  });

  input.addEventListener("input", () => {
    const n = input.value.length;
    counter.textContent = n + "/50";
    counter.classList.toggle("limit", n >= 45);
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value.trim().slice(0, 50);
    if (!text) return;
    const now = Date.now();
    if (now - Chat.lastSent < 1500) { showToast("// slow down, the chat is fragile"); return; }
    Chat.lastSent = now;
    Chat.send({ name: Chat.nick || "??", text, ts: now });
    input.value = "";
    counter.textContent = "0/50";
  });

  Chat.addSystem("// channel open. say something loud. (50 chars)");
  Chat.watch();
};

Chat.colorFor = function (name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return Chat.nameColors[h % Chat.nameColors.length];
};

Chat.addSystem = function (text) {
  Chat.render({ name: "SYS", text, ts: Date.now(), system: true });
};

Chat.render = function (m, isSelf) {
  const win = document.getElementById("chatWindow");
  if (!win) return;
  if (Chat.seen.has(m.id)) return;
  Chat.seen.add(m.id);

  const div = document.createElement("div");
  div.className = "msg" + (m.system ? " system" : "") + (isSelf ? " self" : "");
  const t = new Date(m.ts || Date.now());
  const stamp = t.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  if (m.system) {
    div.textContent = m.text + "  — " + stamp;
  } else {
    const name = document.createElement("span");
    name.className = "m-name";
    name.textContent = m.name || "???";
    name.style.color = m.nameColor || Chat.colorFor(m.name || "?");
    const time = document.createElement("span");
    time.className = "m-time";
    time.textContent = stamp;
    const txt = document.createElement("span");
    txt.className = "m-text";
    txt.textContent = m.text; // textContent = injection-proof
    div.appendChild(name);
    div.appendChild(time);
    div.appendChild(txt);
  }
  win.appendChild(div);
  win.scrollTop = win.scrollHeight;

  // keep the DOM tidy
  while (win.children.length > 150) win.removeChild(win.firstChild);
};

Chat.watch = function () {
  const el = document.getElementById("chatConn");
  const count = document.getElementById("chatCount");

  if (DB.mode === "online") {
    el.textContent = "█ GLOBAL-LIVE";
    el.style.color = "#9db8ff";
    DB.database.ref("chat").orderByChild("ts").limitToLast(120).on("child_added", (snap) => {
      const m = snap.val();
      if (!m) return;
      m.id = snap.key;
      Chat.render(m, m.name === Chat.nick);
    });
    DB.database.ref("chat").on("value", (snap) => {
      count.textContent = (snap.numChildren() || 0) + " MSG";
    });
    return;
  }

  // offline demo mode: local + cross-tab via storage events
  el.textContent = "█ OFFLINE-DEMO";
  el.style.color = "#8a8a93";
  const list = LocalStore.get("chat", []);
  list.slice(-120).forEach((m) => { m.id = m.id || ("off-" + m.ts + "-" + m.text.length); Chat.render(m, m.name === Chat.nick); });
  count.textContent = list.length + " MSG (LOCAL)";

  window.addEventListener("storage", (e) => {
    if (e.key === "simid_chat") {
      const list2 = LocalStore.get("chat", []);
      list2.slice(-120).forEach((m) => { m.id = m.id || ("off-" + m.ts + "-" + m.text.length); Chat.render(m, m.name === Chat.nick); });
      count.textContent = list2.length + " MSG (LOCAL)";
    }
  });
};

Chat.send = function (m) {
  const clean = {
    name: (m.name || "??").toString().slice(0, 16),
    text: (m.text || "").toString().slice(0, 50),
    ts: Date.now()
  };
  if (!clean.text) return;

  if (DB.mode === "online") {
    DB.database.ref("chat").push(clean).catch((err) => showToast("// send failed: " + err.message));
    return;
  }
  // offline: store locally + broadcast to other tabs
  const list = LocalStore.get("chat", []);
  clean.id = "off-" + clean.ts + "-" + clean.text.length;
  list.push(clean);
  if (list.length > 200) list.splice(0, list.length - 200);
  LocalStore.set("chat", list);
  Chat.render(clean, true);
};
