/* ═══════════════════════════════════════════════════════════════
   SIMID MEDIA — ASCII ART LIBRARY + 3D ASCII MODELS
   Monochrome core: gray scale + a single cold ice accent for the
   crystal shine. Every 3D model is built from ascii sprites.
   ═══════════════════════════════════════════════════════════════ */

const ASCII = {};

/* shared monochrome palette (cold grays + ice shine) */
ASCII.PALETTE = ["#d8dce3", "#9aa2b0", "#5f6672", "#e8ecf3", "#747c8a", "#ffffff"];
ASCII.ICE = "#9db8ff";      // single restrained accent
ASCII.ICE_DIM = "#6f89c9";

/* ─────────── 2D ASCII ART (for <pre> blocks) ─────────── */
ASCII.ART = {
  "crystal": `
              .        *
           *  /\\  .        *
       .     /  \\\\      *
            / /\\ \\\\     .
       *   / /  \\\\ \\\\  *
          / /    \\\\ \\\\     .
     .   / /      \\\\ \\\\   *
    *    \\\\ \\\\      / /   .
         \\\\ \\\\    / /   *
          \\\\ \\\\  / /   .
     .     \\\\ \\\\/ /    *
       *    \\\\  /   .
            \\\\/    *
        .       *
  `,
  "crystal-small": `
     /\\
    /  \\
   / /\\ \\
  / /  \\ \\
 / /    \\ \\
 \\ \\    / /
  \\ \\  / /
   \\ \\/ /
    \\  /
     \\/
  `,
  "discord": `
   .   .    .   .    .   .
   |\\ /|    |\\ /|    |\\ /|
   | V |____| V |____| V |
   |             |       |
   |  GAMER     <@>      |
   |_____________|_______|
  `,
  "camera": `
    .-----------.
   (   __ __     )
   |  |  |  |    |
   |  |  |  |    |
   |_____________|
   '-----------'
  `,
  "compass": `
       /\\
      /  \\
     / N  \\
    /      \\
   |  (●)   |
    \\      /
     \\ S  /
      \\  /
       \\/
  `,
  "note": `
   .-------------------.
   | SIMID'S NOTE:     |
   |   "____ is empty" |
   |   [sign here: __] |
   '-------------------'
  `,
  "skull": `
     .------.
    / .--.  \\
   | |    |  |
   | | (  ) | |
   |  \\__/  | |
    \\______/ /
     '------'
  `,
  "star": `
     /\\
    /  \\
   / /\\ \\
  / /  \\ \\
 / / /\\ \\ \\
 \\ \\ \\/ / /
  \\ \\  / /
   \\ \\/ /
    \\  /
     \\/
  `,
  "heart": `
    .--.   .--.
   /    \\ /    \\
  |  ♥   ♥   ♥  |
   \\           /
    \\         /
     '-------'
  `,
  "sword": `
      /\\
     /  \\____
    /        \\
   /  SLASH!  \\
   \\    ___   /
    \\  /   \\ /
     \\/     V
  `,
  "ghost": `
    .------.
   /  .--.  \\
  |  | oo|  |
  |  |  ^|  |
   \\  '--'  /
    \\______/
      |  |
      |  |
  `,
  "rocket": `
     /|\\
    / | \\
   |  |  |
   |  |  |
  /   |   \\
 /    |    \\
 \\   / \\   /
  \\_/   \\_/
   |     |
   |_____|
  `,
  "divider": `
   ╔══════════════════════════════════════════════════════╗
   ║       ▄▄▄▄  SIMID MEDIA  ▄▄▄▄  ASCII IS ART        ║
   ╚══════════════════════════════════════════════════════╝
  `,
  "big-diamond": `
         /\\
        /  \\
       / /\\ \\
      / /  \\ \\
     / / /\\ \\ \\
    / / /  \\ \\ \\
    \\ \\ \\  / / /
     \\ \\ \\/ / /
      \\ \\  / /
       \\ \\/ /
        \\  /
         \\/
  `,
  "rifle": `
      |████
      |████==≡
      |████  ▓
   ▓▓▓▓████▓▓▓
      |
  `,
  "planet": `
      .         ,
   .    ◍    .   .
   .   ~ ~   .     .
      '~ ~'
        ◍
  `
};

/* ─────────── helpers ─────────── */
ASCII.charSet = ["/", "\\", "|", "_", "-", "+", "=", "*", "#", "%", "@", "&", "$", "◈", "◆", "◇", "▓", "▒"];
ASCII.hexSet = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9", "A", "B", "C", "D", "E", "F"];

ASCII.rand = (arr) => arr[(Math.random() * arr.length) | 0];
ASCII.randChar = () => ASCII.rand(ASCII.charSet);

ASCII.drawInto = function (el, artKey, color) {
  const pre = el;
  if (!pre) return;
  pre.textContent = (ASCII.ART[artKey] || artKey).replace(/^\n/, "");
  if (color) pre.style.color = color;
};

/* ─────────── 3D: single ascii-char sprite ─────────── */
ASCII._texCache = {};
ASCII.getGlyphTexture = function (char, color) {
  const key = char + "|" + color;
  if (ASCII._texCache[key]) return ASCII._texCache[key];
  const c = document.createElement("canvas");
  const px = 64;
  c.width = c.height = px;
  const ctx = c.getContext("2d");
  ctx.font = "bold 42px Consolas, 'Courier New', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = color;
  ctx.shadowBlur = 14;
  ctx.fillStyle = color;
  ctx.fillText(char, px / 2, px / 2 + 2);
  const tex = new THREE.CanvasTexture(c);
  ASCII._texCache[key] = tex;
  return tex;
};

ASCII.makeSprite = function (char, color, size) {
  const tex = ASCII.getGlyphTexture(char, color);
  const mat = new THREE.SpriteMaterial({
    map: tex,
    transparent: true,
    depthWrite: false,
    sizeAttenuation: true
  });
  const sp = new THREE.Sprite(mat);
  sp.scale.set(size, size, 1);
  return sp;
};

/* ─────────── 3D: model built out of ascii sprites ─────────── */
ASCII.modelFromGeometry = function (geometry, opts = {}) {
  const {
    count = 1200,
    colors = ASCII.PALETTE,
    charSet = null,
    size = 0.14,
    seed = 1
  } = opts;

  const group = new THREE.Group();
  const chars = charSet || ASCII.charSet;

  let s = seed;
  const rnd = () => { s = (s * 16807) % 2147483647; return (s - 1) / 2147483646; };

  const posAttr = geometry.attributes.position;
  const countPos = posAttr.count;

  for (let i = 0; i < count; i++) {
    const idx = (i * 7 + (seed * 13)) % countPos;
    const x = posAttr.getX(idx), y = posAttr.getY(idx), z = posAttr.getZ(idx);
    const col = colors[(rnd() * colors.length) | 0];
    const ch = chars[(rnd() * chars.length) | 0];
    const sp = ASCII.makeSprite(ch, col, size * (0.7 + rnd() * 0.6));
    sp.position.set(x, y, z);
    group.add(sp);
  }
  return group;
};

/* ─────────── shape builders ─────────── */
ASCII.icosahedron = function (radius = 2, opts = {}) {
  const g = new THREE.IcosahedronGeometry(radius, 1);
  return ASCII.modelFromGeometry(g, Object.assign({ count: 1500, size: 0.13 }, opts));
};

ASCII.torus = function (radius = 1.6, tube = 0.45, opts = {}) {
  const g = new THREE.TorusGeometry(radius, tube, 14, 28);
  return ASCII.modelFromGeometry(g, Object.assign({ count: 900, size: 0.11 }, opts));
};

ASCII.torusKnot = function (radius = 1.4, tube = 0.3, opts = {}) {
  const g = new THREE.TorusKnotGeometry(radius, tube, 90, 12);
  return ASCII.modelFromGeometry(g, Object.assign({ count: 1500, size: 0.12 }, opts));
};

ASCII.cube = function (size = 2, opts = {}) {
  const g = new THREE.BoxGeometry(size, size, size);
  return ASCII.modelFromGeometry(g, Object.assign({ count: 900, size: 0.13 }, opts));
};

ASCII.sphere = function (radius = 1.6, opts = {}) {
  const g = new THREE.SphereGeometry(radius, 18, 12);
  return ASCII.modelFromGeometry(g, Object.assign({ count: 1000, size: 0.11 }, opts));
};

/* ─────────── NEW MODELS ─────────── */
ASCII.pyramid = function (size = 2.4, opts = {}) {
  const g = new THREE.ConeGeometry(size / 2, size, 4, 1);
  return ASCII.modelFromGeometry(g, Object.assign({ count: 900, size: 0.12 }, opts));
};

/* planet: sphere + a wire ring belt around it */
ASCII.planet = function (radius = 1.6, opts = {}) {
  const g = new THREE.Group();
  const body = ASCII.modelFromGeometry(
    new THREE.SphereGeometry(radius, 20, 14),
    Object.assign({ count: 1100, size: 0.1 }, opts)
  );
  const belt = new THREE.Mesh(
    new THREE.TorusGeometry(radius * 1.85, 0.035, 8, 60),
    new THREE.MeshBasicMaterial({ color: 0x9db8ff, transparent: true, opacity: 0.5 })
  );
  belt.rotation.x = Math.PI / 2.4;
  belt.rotation.z = 0.35;
  g.add(body, belt);
  g.userData.belt = belt;
  return g;
};

/* monolith: tall sharp slab with a hex code face */
ASCII.monolith = function (w = 1.6, h = 4.4, d = 0.9, opts = {}) {
  const g = new THREE.BoxGeometry(w, h, d);
  const chars = ASCII.charSet.concat(ASCII.hexSet);
  return ASCII.modelFromGeometry(g, Object.assign({ count: 1200, size: 0.12, charSet: chars }, opts));
};

/* ring: flat spinning glyph ring */
ASCII.ring = function (radius = 2.2, opts = {}) {
  const g = new THREE.RingGeometry(radius * 0.72, radius, 60);
  return ASCII.modelFromGeometry(g, Object.assign({ count: 650, size: 0.1 }, opts));
};

/* rough floating rock: distorted cube, sparse glyphs */
ASCII.rock = function (radius = 1.1, opts = {}) {
  const g = new THREE.DodecahedronGeometry(radius, 0);
  return ASCII.modelFromGeometry(g, Object.assign({
    count: 320,
    size: 0.16,
    charSet: ["#", "%", "▓", "▒", "@", "&"],
    colors: ["#565d6a", "#6a7180", "#454b57", "#7d8492"]
  }, opts));
};

/* hero crystal: mixed glyphs + hex, ice shine */
ASCII.heroCrystal = function (radius = 2.3, opts = {}) {
  const g = new THREE.IcosahedronGeometry(radius, 1);
  const mixed = ASCII.charSet.concat(ASCII.hexSet);
  return ASCII.modelFromGeometry(g, Object.assign({
    count: 1800,
    charSet: mixed,
    colors: ["#e8ecf3", "#9db8ff", "#c8d3e8", "#5f6672", "#ffffff", "#8aa3e0"],
    size: 0.13
  }, opts));
};
