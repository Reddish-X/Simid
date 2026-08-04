/* ═══════════════════════════════════════════════════════════════
   SIMID MEDIA — THE 3D UNIVERSE (the whole page lives here now)
   One shared fullscreen WebGL canvas. Two worlds:
     • PORTAL — the site itself: your sections float around the
       central crystal as interactive 3D panels (CSS3DRenderer).
       WASD to fly, drag to look, click a panel to fly to it.
     • GAME  — the 3D arena shooter (game.js) swaps in.
   ═══════════════════════════════════════════════════════════════ */

const SCENE3D = {
  renderer: null, scene: null, camera: null,
  cssRenderer: null, cssScene: null, cssEl: null,
  mode: "portal",            // 'portal' | 'game'
  groups: {}, particles: null, hexRain: [], sparkles: [],
  lights: [], panels: [], focused: null, fly: null,
  mouse: { x: 0, y: 0 },
  orbit: { yaw: 0, pitch: 0.06, radius: 16 },   // yaw 0 = camera on the FRONT side of the home panel
  keys: {}, dragging: false, lastDrag: { x: 0, y: 0 },
  time: 0, frames: 0, running: true, clock: null
};

/* ─────────── panel definitions ─────────── */
SCENE3D.PANEL_DEFS = [
  { id: "p-home",    name: "home",    w: 1040, h: 620, pos: [0, 2.0, -1],   rotY: 0 },
  { id: "p-links",   name: "links",   w: 780,  h: 600, pos: [-26, 1.8, 0],  rotY: Math.PI / 2 },
  { id: "p-chat",    name: "chat",    w: 780,  h: 600, pos: [26, 1.8, 0],   rotY: -Math.PI / 2 },
  { id: "p-arcade",  name: "arcade",  w: 780,  h: 600, pos: [0, 1.8, 26],   rotY: Math.PI },
  { id: "p-gallery", name: "gallery", w: 860,  h: 660, pos: [-18, 10.5, -18], rotY: Math.PI * 0.25 },
  { id: "p-note",    name: "note",    w: 780,  h: 600, pos: [18, 10.5, 18],  rotY: -Math.PI * 0.75 }
];

SCENE3D.isFallback = function () {
  return (window.matchMedia && window.matchMedia("(pointer: coarse)").matches) ||
    window.innerWidth < 860 ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent || "");
};

SCENE3D.init = function () {
  const canvas = document.getElementById("bg3d");
  if (!canvas) return;
  SCENE3D.canvas = canvas;
  SCENE3D.clock = new THREE.Clock();

  const fallback = SCENE3D.isFallback() || (typeof THREE.CSS3DRenderer === "undefined");
  if (fallback) {
    document.body.classList.add("fallback");
    document.body.classList.remove("portal");
  }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
  } catch (err) {
    console.warn("[SIMID] WebGL unavailable, running without 3D", err);
    canvas.style.display = "none";
    document.body.classList.add("fallback");
    document.body.classList.remove("portal");
    return;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  SCENE3D.renderer = renderer;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x070709, 42, 92);
  const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 200);
  camera.position.set(0, 2.6, 15);
  camera.lookAt(0, 3, 0);
  SCENE3D.scene = scene;
  SCENE3D.camera = camera;

  SCENE3D.buildEnvironment();
  SCENE3D.buildPortal();

  if (!fallback && typeof THREE.CSS3DRenderer !== "undefined") {
    SCENE3D.buildCSS3D();
    SCENE3D.bindControls();
  }

  window.addEventListener("resize", SCENE3D.onResize);
  document.addEventListener("visibilitychange", () => {
    SCENE3D.running = !document.hidden;
    if (SCENE3D.running) SCENE3D.loop();
  });

  SCENE3D.loop();
};

/* ─────────── portal world ─────────── */
SCENE3D.buildPortal = function () {
  const scene = SCENE3D.scene;

  // lights — cold gray / ice only
  scene.add(new THREE.AmbientLight(0x8a90a0, 0.55));
  const key = new THREE.PointLight(0x9db8ff, 1.5, 80);
  key.position.set(6, 6, 8);
  const rim = new THREE.PointLight(0x556, 1.1, 80);
  rim.position.set(-8, -2, -6);
  scene.add(key, rim);
  SCENE3D.lights = [key, rim];

  // grid floor
  const grid = new THREE.GridHelper(70, 35, 0x2a2f3a, 0x14161c);
  grid.position.y = -4.4;
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  scene.add(grid);

  // ── central structure: crystal + glyph ring ──
  // crystal raised + enlarged so it towers above the home panel at load
  const crystal = ASCII.heroCrystal(2.4, { count: 1100, size: 0.12 });
  crystal.position.set(0, 4.4, 0);
  scene.add(crystal);
  SCENE3D.groups.crystal = crystal;

  const ring = ASCII.ring(8.5, { count: 480, size: 0.11, colors: ["#9db8ff", "#5d7bbf", "#c8d3e8"] });
  ring.position.set(0, 4.4, 0);
  ring.rotation.x = Math.PI / 2.15;
  scene.add(ring);
  SCENE3D.groups.ring = ring;

  // ── more models (the menagerie) ──
  const knot = ASCII.torusKnot(1.9, 0.34, { count: 900, size: 0.11, colors: ["#d8dce3", "#9aa2b0", "#9db8ff"] });
  knot.position.set(-11, 0.2, 4);
  scene.add(knot);
  SCENE3D.groups.knot = knot;

  const cube = ASCII.cube(1.7, { count: 600, size: 0.1, colors: ["#9aa2b0", "#e8ecf3", "#5f6672"] });
  cube.position.set(11.5, 3.4, -5);
  scene.add(cube);
  SCENE3D.groups.cube = cube;

  const sphere = ASCII.sphere(1.2, { count: 520, size: 0.09, colors: ["#747c8a", "#c8cdd6", "#ffffff"] });
  sphere.position.set(-9, 5.2, -7);
  scene.add(sphere);
  SCENE3D.groups.sphere = sphere;

  const pyramid = ASCII.pyramid(2.6, { count: 650, size: 0.12, colors: ["#8a919f", "#d8dce3", "#6a7180"] });
  pyramid.position.set(9.5, 1.35, 8);
  scene.add(pyramid);
  SCENE3D.groups.pyramid = pyramid;

  const planet = ASCII.planet(1.5, { count: 780, size: 0.09, colors: ["#9db8ff", "#c8d3e8", "#5f6672"] });
  planet.position.set(-13, 6.6, -10);
  scene.add(planet);
  SCENE3D.groups.planet = planet;

  const monolith = ASCII.monolith(1.7, 4.6, 1.0, { count: 800, size: 0.12, colors: ["#565d6a", "#8a919f", "#9db8ff", "#3c414c"] });
  monolith.position.set(13, 2.3, -9);
  scene.add(monolith);
  SCENE3D.groups.monolith = monolith;

  SCENE3D.groups.rocks = [];
  const rockPos = [[-6, -3.2, 7, 1.0], [6, -3.1, -2, 0.8], [-2, -3.4, -8, 1.2]];
  rockPos.forEach(([x, y, z, r]) => {
    const rock = ASCII.rock(r, {});
    rock.position.set(x, y, z);
    scene.add(rock);
    SCENE3D.groups.rocks.push(rock);
  });

  // wireframe accents (cheap, sharp)
  const wire = new THREE.Mesh(
    new THREE.TorusKnotGeometry(3.1, 0.05, 60, 6),
    new THREE.MeshBasicMaterial({ color: 0x3c414c, wireframe: true, transparent: true, opacity: 0.35 })
  );
  wire.position.set(15, -2.8, -14);
  scene.add(wire);
  SCENE3D.groups.wire = wire;

  const wire2 = new THREE.Mesh(
    new THREE.TorusGeometry(4.2, 0.04, 8, 60),
    new THREE.MeshBasicMaterial({ color: 0x5d7bbf, wireframe: true, transparent: true, opacity: 0.3 })
  );
  wire2.position.set(-15, -2.5, 12);
  wire2.rotation.x = Math.PI / 2.4;
  scene.add(wire2);
  SCENE3D.groups.wire2 = wire2;

  // star dust
  const starGeo = new THREE.BufferGeometry();
  const N = 1600;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 120;
    pos[i * 3 + 1] = (Math.random() - 0.5) * 70;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 90;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0x6b7280, size: 0.06, transparent: true, opacity: 0.6,
    blending: THREE.AdditiveBlending, depthWrite: false
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);
  SCENE3D.particles = stars;

  // drifting ascii glyphs
  for (let i = 0; i < 60; i++) {
    const ch = ASCII.rand(["#", "0", "1", "◇", "◈", "+", "×", "▓", "▒"]);
    const col = ASCII.rand(["#5f6672", "#9aa2b0", "#9db8ff", "#747c8a"]);
    const sp = ASCII.makeSprite(ch, col, 0.15);
    sp.position.set((Math.random() - 0.5) * 70, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 60);
    sp.userData.speed = 0.25 + Math.random() * 0.7;
    sp.userData.twist = Math.random() * Math.PI * 2;
    scene.add(sp);
    SCENE3D.hexRain.push(sp);
  }
};

/* ─────────── procedural env for crystal shine ─────────── */
SCENE3D.buildEnvironment = function () {
  const c = document.createElement("canvas");
  c.width = c.height = 256;
  const ctx = c.getContext("2d");
  const grad = ctx.createLinearGradient(0, 0, 256, 256);
  grad.addColorStop(0, "#2a2f3a");
  grad.addColorStop(0.5, "#0b0c10");
  grad.addColorStop(1, "#1c2130");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 256, 256);
  ctx.fillStyle = "rgba(157,184,255,0.35)";
  for (let i = 0; i < 14; i++) {
    ctx.save();
    ctx.translate(Math.random() * 256, Math.random() * 256);
    ctx.rotate(Math.random() * Math.PI);
    ctx.fillRect(-40, -1.5, 80, 3);
    ctx.restore();
  }
  const tex = new THREE.CanvasTexture(c);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  try {
    const pmrem = new THREE.PMREMGenerator(SCENE3D.renderer);
    if (pmrem.compileEquirectangularShader) pmrem.compileEquirectangularShader();
    const rt = pmrem.fromEquirectangular(tex);
    SCENE3D.scene.environment = rt.texture;
    pmrem.dispose();
  } catch (err) {
    console.warn("[SIMID] env map skipped", err);
  }
};

/* ─────────── CSS3D panels ─────────── */
SCENE3D.buildCSS3D = function () {
  const cssEl = document.getElementById("css3d");
  if (!cssEl) return;
  SCENE3D.cssEl = cssEl;

  const cssRenderer = new THREE.CSS3DRenderer();
  cssRenderer.setSize(window.innerWidth, window.innerHeight);
  cssRenderer.domElement.style.position = "absolute";
  cssRenderer.domElement.style.inset = "0";
  cssEl.appendChild(cssRenderer.domElement);
  SCENE3D.cssRenderer = cssRenderer;

  const cssScene = new THREE.Scene();
  SCENE3D.cssScene = cssScene;

  SCENE3D.PANEL_DEFS.forEach((def) => {
    const el = document.getElementById(def.id);
    if (!el) return;
    el.style.width = def.w + "px";
    el.style.height = def.h + "px";
    const obj = new THREE.CSS3DObject(el);
    obj.position.set(def.pos[0], def.pos[1], def.pos[2]);
    obj.rotation.y = def.rotY;
    cssScene.add(obj);
    SCENE3D.panels.push({
      el, obj, def,
      normal: new THREE.Vector3(0, 0, 1).applyEuler(new THREE.Euler(0, def.rotY, 0)),
      w: def.w, h: def.h
    });
  });
};

/* ─────────── interactions ─────────── */
SCENE3D.bindControls = function () {
  document.addEventListener("keydown", SCENE3D.onKeyDown);
  document.addEventListener("keyup", (e) => { SCENE3D.keys[e.key.toLowerCase()] = false; });
  window.addEventListener("blur", () => { SCENE3D.keys = {}; });

  const isInteractive = (e) => {
    const t = e.target;
    if (!t || !t.closest) return false;
    return !!t.closest(".panel3d, .chips, .nav, .fps-hud, #fpsPause, .btn, button, a, input, textarea, label, select");
  };

  // drag to look (start on empty space only)
  window.addEventListener("pointerdown", (e) => {
    if (isInteractive(e)) return;
    SCENE3D.dragging = true;
    SCENE3D.lastDrag = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener("pointermove", (e) => {
    if (!SCENE3D.dragging) return;
    const dx = e.clientX - SCENE3D.lastDrag.x;
    const dy = e.clientY - SCENE3D.lastDrag.y;
    SCENE3D.lastDrag = { x: e.clientX, y: e.clientY };
    SCENE3D.orbit.yaw -= dx * 0.005;
    SCENE3D.orbit.pitch = Math.max(-1.2, Math.min(1.2, SCENE3D.orbit.pitch + dy * 0.005));
  });
  window.addEventListener("pointerup", () => { SCENE3D.dragging = false; });

  window.addEventListener("wheel", SCENE3D.onWheel, { passive: true });

  // click a panel's frame/title bar → fly to it (only real drags orbit)
  window.addEventListener("pointerdown", (e) => {
    if (SCENE3D.mode !== "portal") return;
    const t = e.target;
    if (!t || !t.closest) return;
    const panel = t.closest(".panel3d");
    if (!panel) return;                       // empty space → drag-orbit
    if (t.closest("button, a, input, textarea, select, label, .btn")) return; // controls stay clickable
    const isFrame = t.classList && t.classList.contains("panel3d") || !!t.closest(".panel-head");
    if (!isFrame) return;                     // body content (chat text, gallery) stays interactive
    SCENE3D.grab = { x: e.clientX, y: e.clientY, name: panel.dataset.panel };
  });
  window.addEventListener("pointerup", (e) => {
    if (!SCENE3D.grab) return;
    const moved = Math.hypot(e.clientX - SCENE3D.grab.x, e.clientY - SCENE3D.grab.y);
    if (moved < 8 && SCENE3D.grab.name && SCENE3D.grab.name !== SCENE3D.focused) {
      SCENE3D.flyTo(SCENE3D.grab.name);
    }
    SCENE3D.grab = null;
  });

  // number keys warp
  document.addEventListener("keydown", (e) => {
    if (SCENE3D.mode !== "portal") return;
    const idx = ["1", "2", "3", "4", "5", "6"].indexOf(e.key);
    if (idx >= 0) SCENE3D.flyTo(SCENE3D.PANEL_DEFS[idx].name);
  });
};

SCENE3D.onKeyDown = function (e) {
  SCENE3D.keys[e.key.toLowerCase()] = true;
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " "].includes(e.key)) e.preventDefault();
  if (e.key === "Escape") {
    if (SCENE3D.mode === "portal" && SCENE3D.focused) SCENE3D.unfocus();
  }
};

SCENE3D.onMouse = function (e) {
  SCENE3D.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  SCENE3D.mouse.y = (e.clientY / window.innerHeight) * 2 - 1;
};

SCENE3D.onWheel = function (e) {
  if (SCENE3D.mode !== "portal") return;
  const d = e.deltaY * 0.012;
  if (SCENE3D.focused) {
    const p = SCENE3D.panelByName(SCENE3D.focused);
    if (p) {
      SCENE3D.camera.position.addScaledVector(p.normal, d);
      SCENE3D.orbit.radius = SCENE3D.camera.position.distanceTo(new THREE.Vector3(p.def.pos[0], p.def.pos[1], p.def.pos[2]));
    }
  } else {
    SCENE3D.orbit.radius = Math.max(7, Math.min(46, SCENE3D.orbit.radius + d));
  }
};

SCENE3D.panelByName = function (name) {
  return SCENE3D.panels.find((p) => p.def.name === name) || null;
};

SCENE3D.flyTo = function (name) {
  const p = SCENE3D.panelByName(name);
  if (!p || SCENE3D.fly) return;
  const to = new THREE.Vector3(p.def.pos[0], p.def.pos[1], p.def.pos[2])
    .addScaledVector(p.normal, 12.5);
  to.y += 0.6;
  const from = SCENE3D.camera.position.clone();
  SCENE3D.fly = { from, to, lookAt: new THREE.Vector3(p.def.pos[0], p.def.pos[1], p.def.pos[2]), t: 0, dur: 1.1 };
  SCENE3D.focused = name;
  SCENE3D.setChip(name);
  SCENE3D.panels.forEach((pl) => pl.el.classList.toggle("focused", pl.def.name === name));
};

SCENE3D.unfocus = function () {
  SCENE3D.focused = null;
  SCENE3D.panels.forEach((pl) => pl.el.classList.remove("focused"));
  SCENE3D.setChip("home");
};

SCENE3D.setChip = function (name) {
  document.querySelectorAll("#navChips [data-fly]").forEach((c) => {
    c.classList.toggle("active", c.dataset.fly === name);
  });
};

/* ─────────── resize ─────────── */
SCENE3D.onResize = function () {
  const w = window.innerWidth, h = window.innerHeight;
  SCENE3D.camera.aspect = w / h;
  SCENE3D.camera.updateProjectionMatrix();
  SCENE3D.renderer.setSize(w, h);
  if (SCENE3D.cssRenderer) SCENE3D.cssRenderer.setSize(w, h);
};

/* ─────────── sparkle burst (crystal shine) ─────────── */
SCENE3D.sparkle = function (pos, color, count) {
  count = count || 8;
  for (let i = 0; i < count; i++) {
    const sp = ASCII.makeSprite(ASCII.rand(["✦", "✧", "◇", "·"]), color || "#9db8ff", 0.11);
    sp.position.copy(pos).add(new THREE.Vector3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)).multiplyScalar(1.6));
    sp.userData.life = 1;
    sp.userData.v = new THREE.Vector3((Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02, (Math.random() - 0.5) * 0.02);
    SCENE3D.scene.add(sp);
    SCENE3D.sparkles.push(sp);
  }
};

/* ─────────── main loop (drives portal AND game) ─────────── */
SCENE3D.loop = function () {
  if (!SCENE3D.running) return;
  requestAnimationFrame(SCENE3D.loop);
  const dt = Math.min(SCENE3D.clock.getDelta(), 0.05);
  SCENE3D.time += dt;

  if (SCENE3D.mode === "game" && typeof Game !== "undefined" && Game.active) {
    Game.tick(dt);
    SCENE3D.renderer.render(Game.scene, Game.camera);
    return;
  }

  SCENE3D.updatePortal(dt);
  if (SCENE3D.cssRenderer && SCENE3D.cssScene) {
    SCENE3D.cssRenderer.render(SCENE3D.cssScene, SCENE3D.camera);
  }
  SCENE3D.renderer.render(SCENE3D.scene, SCENE3D.camera);
};

SCENE3D.updatePortal = function (dt) {
  const t = SCENE3D.time;

  // camera: fly tween, else orbit / free-fly
  if (SCENE3D.fly) {
    SCENE3D.fly.t += dt / SCENE3D.fly.dur;
    const k = Math.min(1, SCENE3D.fly.t);
    const e = 1 - Math.pow(1 - k, 3); // ease-out cubic
    SCENE3D.camera.position.lerpVectors(SCENE3D.fly.from, SCENE3D.fly.to, e);
    SCENE3D.camera.lookAt(SCENE3D.fly.lookAt);
    if (k >= 1) {
      const look = SCENE3D.fly.lookAt;
      SCENE3D.orbit.radius = SCENE3D.camera.position.distanceTo(look);
      SCENE3D.fly = null;
    }
  } else if (SCENE3D.focused) {
    // stay aimed at the focused panel
    const p = SCENE3D.panelByName(SCENE3D.focused);
    if (p) SCENE3D.camera.lookAt(p.obj.position);
    SCENE3D.moveCamera(dt);
  } else {
    // idle orbit + free fly
    const moving = SCENE3D.keys["w"] || SCENE3D.keys["s"] || SCENE3D.keys["a"] || SCENE3D.keys["d"] ||
      SCENE3D.keys["arrowup"] || SCENE3D.keys["arrowdown"] || SCENE3D.keys["arrowleft"] || SCENE3D.keys["arrowright"] ||
      SCENE3D.keys["r"] || SCENE3D.keys["f"];
    if (!moving && !SCENE3D.dragging) {
      SCENE3D.orbit.yaw += dt * 0.06;
    }
    SCENE3D.orbit.radius = Math.max(7, Math.min(46, SCENE3D.orbit.radius));
    const cx = Math.sin(SCENE3D.orbit.yaw) * SCENE3D.orbit.radius;
    const cz = Math.cos(SCENE3D.orbit.yaw) * SCENE3D.orbit.radius;
  // keep camera above the floor when orbiting
  const cy = Math.max(-3.5, Math.sin(SCENE3D.orbit.pitch) * SCENE3D.orbit.radius);
    const target = new THREE.Vector3(cx, 2.0 + cy, cz);
    SCENE3D.camera.position.lerp(target, 0.12);
    SCENE3D.camera.lookAt(0, 3, 0);
    SCENE3D.moveCamera(dt);
  }

  // animate models
  const g = SCENE3D.groups;
  if (g.crystal) {
    g.crystal.rotation.y = t * 0.12;
    g.crystal.rotation.x = Math.sin(t * 0.3) * 0.15;
    g.crystal.position.y = 4.4 + Math.sin(t * 0.7) * 0.15;
  }
  if (g.ring) {
    g.ring.rotation.y = -t * 0.1;
    g.ring.rotation.z = t * 0.05;
  }
  if (g.knot) { g.knot.rotation.y = -t * 0.25; g.knot.rotation.x = t * 0.18; }
  if (g.cube) { g.cube.rotation.x = t * 0.3; g.cube.rotation.y = t * 0.4; g.cube.position.y = 3.4 + Math.cos(t * 0.5) * 0.3; }
  if (g.sphere) { g.sphere.rotation.x = t * 0.4; g.sphere.position.y = 5.2 + Math.sin(t * 0.7) * 0.35; }
  if (g.pyramid) { g.pyramid.rotation.y = t * 0.35; g.pyramid.rotation.x = Math.sin(t * 0.3) * 0.2; }
  if (g.planet) {
    g.planet.rotation.y = t * 0.15;
    if (g.planet.userData.belt) g.planet.userData.belt.rotation.z = 0.35 + Math.sin(t * 0.4) * 0.05;
  }
  if (g.monolith) { g.monolith.rotation.y = t * 0.06; g.monolith.position.y = 2.3 + Math.sin(t * 0.4) * 0.2; }
  if (g.rocks) g.rocks.forEach((r, i) => { r.rotation.y = t * 0.05 * (i + 1); r.rotation.x = t * 0.03; });
  if (g.wire) { g.wire.rotation.x = t * 0.12; g.wire.rotation.y = t * 0.18; }
  if (g.wire2) { g.wire2.rotation.y = t * 0.15; g.wire2.rotation.z = t * 0.08; }

  // lights drift
  SCENE3D.lights[0].position.x = Math.sin(t * 0.35) * 12;
  SCENE3D.lights[0].position.z = Math.cos(t * 0.35) * 12;

  // stars rotate slowly
  if (SCENE3D.particles) SCENE3D.particles.rotation.y = t * 0.012;

  // hex rain
  SCENE3D.hexRain.forEach((sp) => {
    sp.position.y += sp.userData.speed * 0.008;
    if (sp.position.y > 20) { sp.position.y = -20; sp.position.x = (Math.random() - 0.5) * 70; }
    sp.material.opacity = 0.3 + Math.sin(t * 2 + sp.userData.twist) * 0.25;
  });

  // sparkles fade
  for (let i = SCENE3D.sparkles.length - 1; i >= 0; i--) {
    const sp = SCENE3D.sparkles[i];
    sp.userData.life -= 0.02;
    sp.material.opacity = Math.max(0, sp.userData.life);
    sp.position.add(sp.userData.v);
    if (sp.userData.life <= 0) {
      SCENE3D.scene.remove(sp);
      sp.material.dispose();
      SCENE3D.sparkles.splice(i, 1);
    }
  }

  // occasional crystal sparkle
  SCENE3D.frames++;
  if (SCENE3D.frames % 130 === 0) {
    SCENE3D.sparkle(new THREE.Vector3(0, 4.4, 0), null, 5);
  }

  // panel visibility (front faces only, small hysteresis so they don't pop) + depth fade
  if (SCENE3D.panels.length) {
    SCENE3D.panels.forEach((p) => {
      const toPanel = new THREE.Vector3().subVectors(p.obj.position, SCENE3D.camera.position).normalize();
      const dot = toPanel.dot(p.normal);
      const shown = p.el.style.visibility !== "hidden";
      p.el.style.visibility = (dot < -0.05 || (shown && dot < 0.12)) ? "visible" : "hidden";
      const d = SCENE3D.camera.position.distanceTo(p.obj.position);
      p.el.style.opacity = Math.max(0.3, Math.min(1, 1.3 - d / 55));
    });
  }
};

/* free-fly camera movement (WASD + R/F) */
SCENE3D.moveCamera = function (dt) {
  const keys = SCENE3D.keys;
  let f = 0, r = 0, u = 0;
  if (keys["w"] || keys["arrowup"]) f += 1;
  if (keys["s"] || keys["arrowdown"]) f -= 1;
  if (keys["d"] || keys["arrowright"]) r += 1;
  if (keys["a"] || keys["arrowleft"]) r -= 1;
  if (keys["r"]) u += 1;
  if (keys["f"]) u -= 1;
  if (!f && !r && !u) return;

  const speed = (keys["shift"] ? 16 : 8) * dt;
  const dir = new THREE.Vector3();
  SCENE3D.camera.getWorldDirection(dir);
  dir.y = 0; dir.normalize();
  const right = new THREE.Vector3().crossVectors(dir, new THREE.Vector3(0, 1, 0));
  const move = new THREE.Vector3()
    .addScaledVector(dir, f * speed)
    .addScaledVector(right, r * speed);
  SCENE3D.camera.position.add(move);
  SCENE3D.camera.position.y += u * speed * 0.7;

  // keep inside the world
  const lim = 42;
  SCENE3D.camera.position.x = Math.max(-lim, Math.min(lim, SCENE3D.camera.position.x));
  SCENE3D.camera.position.z = Math.max(-lim, Math.min(lim, SCENE3D.camera.position.z));
  SCENE3D.camera.position.y = Math.max(-3, Math.min(24, SCENE3D.camera.position.y));
};

