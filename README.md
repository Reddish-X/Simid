# SIMID MEDIA ◈ everything is 3D

A maximalist dark personal site for **Simid** — monochrome gray, sharp, and the **whole page lives inside a 3D model**. No scrolling on desktop: your sections float as interactive 3D panels around a central ASCII crystal, and you fly between them.

## Run it

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## Flying around (desktop)

| Input | Action |
| --- | --- |
| `WASD` / arrows | fly forward / strafe |
| drag mouse | look around |
| `R` / `F` | fly up / down |
| mouse wheel | zoom in / out |
| click a panel | fly to it |
| `1`–`6` or bottom chips | warp straight to a section |
| `ESC` | leave a panel, back to orbit |

On phones/tablets (or small windows) it automatically falls back to a normal scroll layout.

## The 3D world

- central ASCII crystal + glyph ring, floating models: torus knot, cube, sphere, **pyramid, planet with rings, monolith, glyph rocks**
- wireframe accents, grid floor, drifting ascii glyphs, star dust, crystal sparkle bursts
- CSS3D panels keep the chat / gallery / note fully interactive

## The ARCADE — 3D multiplayer shooter

- first-person arena FPS on the same canvas: `WASD` move, mouse aim, click fire, `SPACE` jump
- bots with names hunt you; health, killfeed, hitmarkers, tracers, crystal pickups (+25, +15 HP)
- **score lives in RAM only — reload the page and it's gone**
- real multiplayer: when Firebase is configured, live players sync into the arena (position, name, HP, kills)

## Make it yours

Edit **`js/config.js`**:

```js
links: {
  discord: "https://discord.gg/YOUR_INVITE",      // your invite
  instagram: "https://instagram.com/YOUR_HANDLE", // your handle
  sites: [ { name: "SITE_ONE", url: "https://..." } ]
},
placeUrl: "place/",
adminKey: "simid-secret",                          // ← change this
game: { bots: 6, arena: 90 }
```

### THE PLACE folder

`place/` is a placeholder site. Drop **any** website into it as **`place/index.html`** — the `PLACE` chip and card link straight to it.

### Go GLOBAL (optional, free)

The chat / gallery / note / shooter work in offline demo mode until you add Firebase keys (5 min):

1. https://console.firebase.google.com → create a project
2. Project settings ⚙ → your web app → copy the config
3. Realtime Database → create DB (test mode is fine while testing)
4. Storage → enable
5. Paste the values into `js/config.js` → `firebase`
6. Publish `firebase-rules.json` as your Realtime Database rules

Then chat is global, notes/gallery sync for everyone, and the arena fills with real players.

## Files

```
index.html         3D panel layout + HUDs
css/style.css      monochrome dark theme
js/config.js       links, place, firebase keys, admin key, game tuning
js/ascii.js        2D art + 3D ascii models
js/scene.js        the portal world + CSS3D panels + flight controls
js/game.js         3D arena shooter (bots + multiplayer)
js/chat.js         global chat (50 chars)
js/notes.js        simid writes / public reads
js/uploads.js      picture wall
js/firebase.js     backend + offline demo fallback
js/main.js         boot sequence
place/index.html   placeholder for your other website
```
