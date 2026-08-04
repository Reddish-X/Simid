/* ═══════════════════════════════════════════════════════════════════
   SIMID MEDIA — CONFIG
   Edit this file to plug in your stuff. Then refresh the page.
   ═══════════════════════════════════════════════════════════════════ */

const CONFIG = {
  /* ─── SOCIAL / OTHER SITES ───────────────────────────────────────
     Put your real links here. The buttons in the PORTALS section
     will use these automatically. */
  links: {
    discord: "https://discord.gg/YOUR_INVITE",           // ← your discord invite
    instagram: "https://instagram.com/YOUR_HANDLE",      // ← your instagram
    sites: [                                             // ← your other sites
      { name: "SITE_ONE",  url: "https://example.com" },
      { name: "SITE_TWO",  url: "https://example.org" }
    ]
  },

  /* ─── THE PLACE ────────────────────────────────────────────────
     The "place" folder is a placeholder site: put ANY website in
     the place/ folder, name it index.html, and this link finds it. */
  placeUrl: "place/",

  /* ─── ARCADE ────────────────────────────────────────────────────
     Tuning for the 3D multiplayer shooter. Score lives in RAM
     only — reload and it's gone. That's the deal. */
  game: {
    bots: 6,            // AI bots in the arena (also with real players)
    arena: 90,          // arena size (world units, square)
    rounds: 0           // 0 = endless; set to 180 for a 3-minute match
  },

  /* ─── FIREBASE (free global backend) ─────────────────────────────
     Fill these in to turn the chat / gallery / note GLOBAL.
     Until you do, the site runs in OFFLINE DEMO mode (still fun,
     but data only lives in each visitor's browser).

     How to get them (5 min, free):
       1. Go to https://console.firebase.google.com → Create project
       2. Project settings ⚙ → your web app → copy the config object
       3. Realtime Database → Create DB (test mode is fine for now)
       4. Storage → Get started → enable it (rules: see firebase-rules.json)
       5. Paste the values below.
     Then run the rules in firebase-rules.json to lock it down. */
  firebase: {
    apiKey: "",
    authDomain: "",
    databaseURL: "",      // https://<your-project>-default-rtdb.firebaseio.com
    projectId: "",
    storageBucket: "",    // <your-project>.appspot.com
    messagingSenderId: "",
    appId: ""
  },

  /* ─── ADMIN KEY ──────────────────────────────────────────────────
     The secret you type to write notes / upload pictures.
     Visitors only ever see, never write. Change this to anything.
     (Note: it ships inside the page, so this is fun-grade security —
     don't protect your banking with it.) */
  adminKey: "simid-secret"
};
