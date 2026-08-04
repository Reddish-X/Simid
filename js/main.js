/* ═══════════════════════════════════════════════════════════════
   SIMID MEDIA — BOOT SEQUENCE
   ═══════════════════════════════════════════════════════════════ */

(function () {
  "use strict";

  function boot() {
    // backend first (never blocks the rest)
    DB.init();
    DB.updateStatus();

    // fill all ASCII art blocks
    document.querySelectorAll("[data-art]").forEach((el) => {
      ASCII.drawInto(el, el.dataset.art);
    });
    ASCII.drawInto(document.getElementById("heroAscii"), "crystal");

    // wire portal links from config (discord / instagram / sites / place)
    wireLinks();

    // hero typewriter
    typewriter("heroSub", "> EVERYTHING IS 3D :: NOTHING IS SCROLLING");

    // functional modules first — they must work even without WebGL
    Chat.init();
    Notes.init();
    Gallery.init();

    // 3D last + optional: if WebGL is unavailable the site still lives
    try { SCENE3D.init(); } catch (err) { console.warn("[SIMID] 3D skipped:", err); }
    try { Game.init(); } catch (err) { console.warn("[SIMID] game skipped:", err); }

    wireChips();

    if (typeof updateArcadeStats === "function") updateArcadeStats();

    // easter egg
    console.log("%c◈ SIMID MEDIA ◈", "color:#9db8ff;font-size:18px;font-weight:bold;");
    console.log("%c> the whole site is a 3D model now. fly around with WASD.", "color:#8a8a93;");

    // first-visit toast
    if (!localStorage.getItem("simid_visited")) {
      setTimeout(() => {
        showToast(DB.mode === "online"
          ? "// you're inside SIMID MEDIA. fly around — WASD moves you."
          : "// offline demo mode — add Firebase keys in js/config.js to go GLOBAL");
      }, 900);
      localStorage.setItem("simid_visited", "1");
    }
  }

  /* ─── links ─── */
  function wireLinks() {
    const L = CONFIG.links || {};
    const setHref = (sel, url) => {
      const el = document.querySelector(sel);
      if (el) {
        el.href = url || "#";
        if (!url) el.addEventListener("click", (e) => { e.preventDefault(); showToast("// set your link in js/config.js"); });
      }
    };
    setHref('[data-link="discord"]', L.discord);
    setHref('[data-link="instagram"]', L.instagram);

    const sitesCard = document.querySelector('[data-link="sites"]');
    const sites = Array.isArray(L.sites) ? L.sites : [];
    if (sitesCard) {
      if (sites.length) {
        sitesCard.href = sites[0].url || "#";
      } else {
        sitesCard.addEventListener("click", (e) => { e.preventDefault(); showToast("// add sites in js/config.js"); });
      }
    }

    const placeCard = document.querySelector('[data-link="place"]');
    if (placeCard && CONFIG.placeUrl) placeCard.href = CONFIG.placeUrl;

    // render extra site chips
    const hint = document.getElementById("linkHint");
    if (hint && sites.length) {
      const chips = sites.map((s) =>
        '<a class="tag" style="text-decoration:none;color:var(--ice);border-color:rgba(157,184,255,0.3)" href="' + esc(s.url) + '" target="_blank" rel="noopener">' + esc(s.name) + ' ↗</a>'
      ).join(" ");
      hint.innerHTML = "// warps: " + chips;
    }
  }

  /* ─── chip navigation ─── */
  function wireChips() {
    const fallback = document.body.classList.contains("fallback");
    document.querySelectorAll("#navChips [data-fly]").forEach((chip) => {
      chip.addEventListener("click", () => {
        const name = chip.dataset.fly;
        if (fallback) {
          const el = document.getElementById("p-" + name);
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "start" });
            document.querySelectorAll("#navChips [data-fly]").forEach((c) =>
              c.classList.toggle("active", c === chip));
          }
          return;
        }
        if (typeof SCENE3D !== "undefined" && SCENE3D.flyTo) SCENE3D.flyTo(name);
      });
    });
  }

  /* ─── typewriter ─── */
  function typewriter(id, text) {
    const el = document.getElementById(id);
    if (!el) return;
    let i = 0;
    (function tick() {
      if (i <= text.length) {
        el.textContent = text.slice(0, i) + (i < text.length ? "▌" : "");
        i += 2;
        setTimeout(tick, 24);
      }
    })();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
