/* ═══════════════════════════════════════════════════════════════
   SIMID MEDIA — ARCADE :: 3D MULTIPLAYER SHOOTER
   First-person arena FPS. WASD move, mouse aim, click to fire.
   • Bots always (config game.bots)
   • Real players sync via Firebase RTDB when configured
   • Score lives in RAM only — reload the page and it's gone.
   The game renders on the SAME canvas as the portal (SCENE3D).
   ═══════════════════════════════════════════════════════════════ */

const Game = {
  scene: null, camera: null,
  active: false, ready: false, exited: false,
  keys: {}, lock: false, paused: false,
  yaw: 0, pitch: 0,
  pos: new THREE.Vector3(0, 0, 14), vel: new THREE.Vector3(),
  hp: 100, score: 0, kills: 0, alive: true,
  respawnT: 0, invulnT: 0, fireCd: 0, regenT: 0, shake: 0,
  bots: [], ghosts: {}, ghostIds: [], crystals: [],
  tracers: [], bursts: [], net: null, netTimer: 0,
  arena: 90, bounds: 45, pillars: [], pillarsR: 1.4
};

Game.init = function () {
  const launchBtn = document.getElementById("launchBtn");
  const canvas = document.getElementById("bg3d");
  if (!launchBtn || !canvas) return;

  if (!SCENE3D.renderer) {
    launchBtn.addEventListener("click", () => showToast("// WebGL is off — the arena is closed."));
    return;
  }

  Game.nick = (typeof Chat !== "undefined" && Chat.nick) ||
    LocalStore.get("nick", null) || ("GHOST_" + Math.floor(100 + Math.random() * 900));

  Game.arena = (CONFIG.game && CONFIG.game.arena) || 90;
  Game.bounds = Game.arena / 2 - 1.5;
  const botCount = (CONFIG.game && CONFIG.game.bots) || 6;

  // scene + camera (shared renderer from SCENE3D)
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0a0a0e);
  scene.fog = new THREE.Fog(0x0a0a0e, 55, 130);
  Game.scene = scene;

  const camera = new THREE.PerspectiveCamera(72, window.innerWidth / window.innerHeight, 0.1, 260);
  camera.rotation.order = "YXZ";
  scene.add(camera);
  Game.camera = camera;

  scene.add(new THREE.AmbientLight(0x9aa0ad, 0.6));
  scene.add(new THREE.HemisphereLight(0x8a8f9c, 0x101014, 0.5));
  const l1 = new THREE.PointLight(0x9db8ff, 1.4, 80); l1.position.set(-40, 14, -40);
  const l2 = new THREE.PointLight(0x9db8ff, 1.4, 80); l2.position.set(40, 14, 40);
  const l3 = new THREE.PointLight(0x8a8f9c, 1.0, 80); l3.position.set(0, 22, 0);
  scene.add(l1, l2, l3);
  Game.arenaLights = [l1, l2, l3];

  // floor grid
  const grid = new THREE.GridHelper(Game.arena, Math.round(Game.arena / 2), 0x2a2f3a, 0x14161c);
  grid.material.transparent = true;
  grid.material.opacity = 0.4;
  scene.add(grid);

  // walls with sharp edge glow
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x15151b, roughness: 0.85, metalness: 0.2 });
  const wallGeo = new THREE.BoxGeometry(Game.arena, 12, 1);
  const wallEdge = new THREE.LineSegments(
    new THREE.EdgesGeometry(wallGeo),
    new THREE.LineBasicMaterial({ color: 0x9db8ff, transparent: true, opacity: 0.35 })
  );
  const half = Game.bounds + 1.5;
  [[0, half, 0], [0, -half, Math.PI], [half, 0, Math.PI / 2], [-half, 0, -Math.PI / 2]].forEach(([x, z, ry]) => {
    const m = new THREE.Mesh(wallGeo, wallMat);
    m.position.set(x, 6, z);
    m.rotation.y = ry;
    scene.add(m);
    const e = wallEdge.clone();
    e.position.copy(m.position);
    e.rotation.copy(m.rotation);
    scene.add(e);
  });

  // pillars for cover
  const pillarGeo = new THREE.BoxGeometry(1.6, 8, 1.6);
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0x1a1a21, roughness: 0.7, metalness: 0.3 });
  const pillarEdge = new THREE.LineSegments(
    new THREE.EdgesGeometry(pillarGeo),
    new THREE.LineBasicMaterial({ color: 0x5d7bbf, transparent: true, opacity: 0.5 })
  );
  const pillPos = [
    [-16, -16], [16, -16], [-16, 16], [16, 16],
    [0, -30], [0, 30], [-30, 0], [30, 0], [0, 0]
  ];
  pillPos.forEach(([x, z], i) => {
    const m = new THREE.Mesh(pillarGeo, pillarMat);
    m.position.set(x, 4, z);
    scene.add(m);
    const e = pillarEdge.clone();
    e.position.copy(m.position);
    scene.add(e);
    Game.pillars.push({ x, z, r: Game.pillarsR });
  });

  // sky decor: ascii planet + stars
  const skyPlanet = ASCII.planet(7, { count: 380, size: 0.4, colors: ["#2a2f3a", "#3c414c", "#5d7bbf"] });
  skyPlanet.position.set(32, 38, -52);
  scene.add(skyPlanet);
  Game.skyPlanet = skyPlanet;
  const starGeo = new THREE.BufferGeometry();
  const N = 900;
  const pos = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    pos[i * 3] = (Math.random() - 0.5) * 220;
    pos[i * 3 + 1] = 20 + Math.random() * 110;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 220;
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: 0x6b7280, size: 0.35, transparent: true, opacity: 0.7, depthWrite: false
  })));

  // first-person gun sprite
  const gun = ASCII.makeSprite("▮", "#9db8ff", 0.28);
  gun.position.set(0.34, -0.3, -0.7);
  gun.material.depthTest = false;
  camera.add(gun);
  Game.gun = gun;
  const gunGlow = ASCII.makeSprite("=", "#d8dce3", 0.16);
  gunGlow.position.set(0.34, -0.3, -0.9);
  gunGlow.material.depthTest = false;
  camera.add(gunGlow);
  Game.gunGlow = gunGlow;

  // crystals (pickups)
  for (let i = 0; i < 12; i++) Game.spawnCrystal(true);

  // bots
  for (let i = 0; i < botCount; i++) Game.spawnBot(true);

  // controls
  document.addEventListener("keydown", (e) => {
    Game.keys[e.key.toLowerCase()] = true;
    if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(e.key)) e.preventDefault();
    if (e.key === "Escape" && Game.active && !Game.lock) Game.exit();
  });
  document.addEventListener("keyup", (e) => { Game.keys[e.key.toLowerCase()] = false; });
  window.addEventListener("blur", () => { Game.keys = {}; });

  document.addEventListener("mousemove", (e) => {
    if (Game.active && Game.lock) {
      Game.yaw -= e.movementX * 0.0022;
      Game.pitch -= e.movementY * 0.0022;
      Game.pitch = Math.max(-1.45, Math.min(1.45, Game.pitch));
    }
  });
  document.addEventListener("mousedown", (e) => {
    if (Game.active && Game.lock && e.button === 0 && Game.alive) Game.shoot();
  });
  document.addEventListener("pointerlockchange", () => {
    if (!Game.active) return;
    Game.lock = document.pointerLockElement === document.body;
    if (!Game.lock && !Game.exited) Game.pause();
  });

  launchBtn.addEventListener("click", Game.launch);

  // pause overlay buttons
  const pause = document.getElementById("fpsPause");
  if (pause) {
    pause.addEventListener("click", () => {
      if (Game.active && !Game.lock) Game.resume();
    });
    const btns = document.createElement("div");
    btns.style.cssText = "margin-top:16px;display:flex;gap:10px;justify-content:center;";
    const res = document.createElement("button");
    res.className = "btn btn-primary";
    res.textContent = "RESUME ▸";
    res.addEventListener("click", (e) => { e.stopPropagation(); if (Game.active) Game.resume(); });
    const ext = document.createElement("button");
    ext.className = "btn btn-ghost";
    ext.textContent = "EXIT ARENA";
    ext.addEventListener("click", (e) => { e.stopPropagation(); Game.exit(); });
    btns.appendChild(res);
    btns.appendChild(ext);
    pause.querySelector("div").appendChild(btns);
  }

  // touch controls (mobile)
  Game.bindTouch();

  Game.ready = true;
  console.log("[SIMID] arcade armed. " + botCount + " bots in the arena.");
};

Game.launch = function () {
  if (!Game.ready || Game.active) return;
  Game.active = true;
  Game.exited = false;
  Game.paused = false;

  // hide portal panels, enter game world
  SCENE3D.mode = "game";
  if (SCENE3D.cssEl) SCENE3D.cssEl.style.display = "none";

  Game.pos.set(0, 0, 14);
  Game.yaw = 0; Game.pitch = 0;
  Game.hp = 100; Game.score = 0; Game.kills = 0;
  Game.alive = true; Game.invulnT = 1.2;
  Game.fireCd = 0; Game.tracers.length = 0;

  // respawn bots for a fresh match
  Game.bots.forEach((b) => Game.resetBot(b));

  document.getElementById("fpsHud").classList.add("on");
  document.getElementById("fpsPause").classList.remove("on");
  document.body.classList.remove("fps-dead");
  Game.updateHud();

  Game.setupNet();
  Game.requestLock();
  showToast("// welcome to the arena. don't get complacent.");
};

Game.requestLock = function () {
  try {
    document.body.requestPointerLock();
  } catch (err) {
    console.warn("[SIMID] pointer lock failed", err);
    Game.lock = false;
    Game.pause();
  }
};

Game.resume = function () {
  if (!Game.active) return;
  Game.paused = false;
  document.getElementById("fpsPause").classList.remove("on");
  Game.requestLock();
};

Game.pause = function () {
  if (!Game.active || Game.paused || Game.exited) return;
  Game.paused = true;
  Game.keys = {};
  const msg = document.getElementById("fpsPauseMsg");
  if (msg) msg.textContent = "CLICK TO RESUME · ESC TO EXIT THE ARENA";
  document.getElementById("fpsPause").classList.add("on");
};

Game.exit = function () {
  if (!Game.active) return;
  Game.exited = true;
  Game.active = false;
  Game.paused = false;
  if (document.pointerLockElement) document.exitPointerLock();

  SCENE3D.mode = "portal";
  if (SCENE3D.cssEl) SCENE3D.cssEl.style.display = "";
  document.getElementById("fpsHud").classList.remove("on");
  document.getElementById("fpsPause").classList.remove("on");

  Game.teardownNet();
  updateArcadeStats();
  showToast("// you left the arena. score: " + Game.score);
};

/* ─────────── spawn / reset ─────────── */
Game.randomPoint = function (minFromCenter) {
  minFromCenter = minFromCenter || 0;
  for (let i = 0; i < 20; i++) {
    const x = (Math.random() * 2 - 1) * (Game.bounds - 2);
    const z = (Math.random() * 2 - 1) * (Game.bounds - 2);
    if (Math.hypot(x, z) >= minFromCenter) return new THREE.Vector3(x, 0, z);
  }
  return new THREE.Vector3(0, 0, 0);
};

Game.BOT_NAMES = ["BOT_RAZOR", "BOT_KOGA", "BOT_VEX", "BOT_NULL", "BOT_ASH", "BOT_WIRE", "BOT_GLITCH", "BOT_MOTE"];

Game.spawnBot = function (first) {
  const names = Game.BOT_NAMES.slice();
  const used = Game.bots.map((b) => b.name);
  const name = (names.find((n) => used.indexOf(n) < 0)) || ("BOT_" + Math.floor(100 + Math.random() * 900));

  const bot = {
    name,
    pos: Game.randomPoint(12),
    hp: 100, alive: true, respawnT: 0,
    yaw: Math.random() * Math.PI * 2,
    shootT: 1 + Math.random() * 1.5,
    strafeDir: Math.random() > 0.5 ? 1 : -1,
    strafeT: 0
  };

  // body
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 1.6, 0.8),
    new THREE.MeshStandardMaterial({ color: 0x2b2f38, roughness: 0.6, metalness: 0.4 })
  );
  body.position.y = 1.15;
  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.5, 0.5, 0.5),
    new THREE.MeshStandardMaterial({ color: 0x3c414c, emissive: 0x9db8ff, emissiveIntensity: 0.6 })
  );
  head.position.y = 2.2;
  const eye = ASCII.makeSprite("◈", "#9db8ff", 0.5);
  eye.position.set(0, 2.2, 0.42);
  g.add(body, head, eye);
  g.position.copy(bot.pos);
  Game.scene.add(g);
  bot.mesh = g;
  bot.eye = eye;

  Game.bots.push(bot);
  if (first) bot.mesh.visible = true;
};

Game.resetBot = function (b) {
  b.pos.copy(Game.randomPoint(10));
  b.hp = 100;
  b.alive = true;
  b.respawnT = 0;
  b.mesh.visible = true;
  b.mesh.position.copy(b.pos);
  b.eye.material.opacity = 1;
};

Game.spawnCrystal = function (first) {
  const geo = new THREE.OctahedronGeometry(0.7, 0);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x0d0d12, emissive: 0x9db8ff, emissiveIntensity: 1.6,
    metalness: 0.3, roughness: 0.2, transparent: true, opacity: 0.95
  });
  const mesh = new THREE.Mesh(geo, mat);
  const p = Game.randomPoint(6);
  mesh.position.set(p.x, 1.5 + Math.random() * 1.5, p.z);
  Game.scene.add(mesh);
  const c = { mesh, taken: false, respawnT: 0, phase: Math.random() * 6 };
  Game.crystals.push(c);
  if (first) c.mesh.visible = true;
};

Game.resetCrystal = function (c) {
  const p = Game.randomPoint(6);
  c.mesh.position.set(p.x, 1.5 + Math.random() * 1.5, p.z);
  c.mesh.visible = true;
  c.taken = false;
  c.respawnT = 0;
};

/* ─────────── main tick (called by SCENE3D.loop) ─────────── */
Game.tick = function (dt) {
  if (Game.paused) return;
  const t = (performance.now() / 1000) % 100000;

  // fire cooldown + regen + timers
  Game.fireCd -= dt;
  Game.invulnT -= dt;
  Game.regenT -= dt;
  if (Game.alive && Game.regenT <= 0 && Game.hp < 100) {
    Game.hp = Math.min(100, Game.hp + 8 * dt);
  }

  if (Game.alive) {
    Game.movePlayer(dt);
    Game.aimCamera();
  } else {
    Game.respawnT -= dt;
    if (Game.respawnT <= 0) {
      Game.alive = true;
      Game.hp = 100;
      Game.invulnT = 1.6;
      Game.pos.copy(Game.randomPoint(6));
      document.body.classList.remove("fps-dead");
    }
  }

  // bots
  Game.bots.forEach((b) => Game.updateBot(b, dt));

  // crystals
  Game.crystals.forEach((c) => {
    c.mesh.rotation.y += dt * 1.6;
    c.mesh.position.y += Math.sin(t * 2 + c.phase) * 0.0015;
    if (c.taken) {
      c.respawnT -= dt;
      if (c.respawnT <= 0) Game.resetCrystal(c);
      return;
    }
    const dxz = Math.hypot(Game.pos.x - c.mesh.position.x, Game.pos.z - c.mesh.position.z);
    if (Game.alive && dxz < 1.9 && Math.abs(Game.pos.y + 1.7 - c.mesh.position.y) < 2.6) {
      c.taken = true;
      c.respawnT = 9;
      c.mesh.visible = false;
      Game.score += 25;
      Game.hp = Math.min(100, Game.hp + 15);
      Game.burst(c.mesh.position, "#9db8ff", 10);
      Game.addFeed("+25 <b>CRYSTAL</b>");
      Game.updateHud();
    }
  });

  // tracers
  for (let i = Game.tracers.length - 1; i >= 0; i--) {
    const tr = Game.tracers[i];
    tr.life -= dt;
    tr.line.material.opacity = Math.max(0, tr.life / tr.maxLife);
    if (tr.life <= 0) {
      Game.scene.remove(tr.line);
      tr.line.geometry.dispose();
      tr.line.material.dispose();
      Game.tracers.splice(i, 1);
    }
  }

  // bursts
  for (let i = Game.bursts.length - 1; i >= 0; i--) {
    const sp = Game.bursts[i];
    sp.userData.life -= dt * 1.3;
    sp.material.opacity = Math.max(0, sp.userData.life);
    sp.position.add(sp.userData.v);
    if (sp.userData.life <= 0) {
      Game.scene.remove(sp);
      sp.material.dispose();
      Game.bursts.splice(i, 1);
    }
  }

  // sky planet slowly turns
  if (Game.skyPlanet) Game.skyPlanet.rotation.y += dt * 0.03;

  // muzzle light fade
  if (Game.muzzleLight) Game.muzzleLight.intensity *= 0.8;

  // gun bob
  if (Game.gun) {
    const bob = Game.alive ? Math.sin(t * 8) * 0.006 : 0;
    Game.gun.position.y = -0.3 + bob + (Game.fireCd > 0.12 ? 0.06 : 0);
    if (Game.gunGlow) Game.gunGlow.position.y = Game.gun.position.y;
  }

  Game.updateHud();
  Game.netTimer -= dt;
  if (Game.net && Game.netTimer <= 0) { Game.netTimer = 0.08; Game.sendNet(); }
};

Game.movePlayer = function (dt) {
  const k = Game.keys;
  let f = 0, r = 0;
  if (k["w"] || k["arrowup"]) f += 1;
  if (k["s"] || k["arrowdown"]) f -= 1;
  if (k["d"] || k["arrowright"]) r += 1;
  if (k["a"] || k["arrowleft"]) r -= 1;
  // touch joystick
  if (Game.touch) {
    const tv = Game.touch.vec;
    f += -tv.y;
    r += tv.x;
  }

  const speed = (k["shift"] ? 13 : 7.5);
  const sin = Math.sin(Game.yaw), cos = Math.cos(Game.yaw);
  let vx = (-sin * f + cos * r) * speed;
  let vz = (-cos * f - sin * r) * speed;
  const mag = Math.hypot(vx, vz);
  if (mag > speed) { vx *= speed / mag; vz *= speed / mag; }

  Game.vel.x = vx;
  Game.vel.z = vz;

  // jump + gravity
  if ((k[" "] || k["space"]) && Game.pos.y <= 0.01) Game.vel.y = 8.5;
  Game.vel.y -= 24 * dt;

  Game.pos.x += Game.vel.x * dt;
  Game.pos.z += Game.vel.z * dt;
  Game.pos.y += Game.vel.y * dt;
  if (Game.pos.y < 0) { Game.pos.y = 0; Game.vel.y = 0; }

  // walls + pillars
  Game.pos.x = Math.max(-Game.bounds, Math.min(Game.bounds, Game.pos.x));
  Game.pos.z = Math.max(-Game.bounds, Math.min(Game.bounds, Game.pos.z));
  Game.pillars.forEach((p) => {
    const dx = Game.pos.x - p.x, dz = Game.pos.z - p.z;
    const d = Math.hypot(dx, dz);
    const min = p.r + 0.6;
    if (d < min && d > 0.001) {
      Game.pos.x = p.x + (dx / d) * min;
      Game.pos.z = p.z + (dz / d) * min;
    }
  });
};

Game.aimCamera = function () {
  Game.camera.position.set(Game.pos.x, Game.pos.y + 1.7, Game.pos.z);
  // recoil shake
  const sh = Game.shake;
  Game.camera.rotation.y = Game.yaw + (Math.random() - 0.5) * sh * 0.02;
  Game.camera.rotation.x = Game.pitch + (Math.random() - 0.5) * sh * 0.02;
  Game.shake *= 0.82;
  if (Game.shake < 0.001) Game.shake = 0;
  // invuln blink
  Game.camera.position.y += (Game.invulnT > 0 && Math.floor(performance.now() / 120) % 2 === 0) ? -0.05 : 0;
};

/* ─────────── shooting ─────────── */
Game.shoot = function () {
  if (Game.fireCd > 0) return;
  Game.fireCd = 0.16;
  Game.shake = Math.min(1, Game.shake + 0.5);

  const origin = Game.camera.position.clone();
  const dir = new THREE.Vector3();
  Game.camera.getWorldDirection(dir);
  const muzzle = origin.clone().add(dir.clone().multiplyScalar(0.6));

  // muzzle flash light + gun glow
  if (!Game.muzzleLight) {
    Game.muzzleLight = new THREE.PointLight(0x9db8ff, 0, 12);
    Game.scene.add(Game.muzzleLight);
  }
  Game.muzzleLight.position.copy(muzzle);
  Game.muzzleLight.intensity = 3;
  Game.gunGlow.material.opacity = 1;

  // raycast bots + ghosts
  const hit = Game.raycastTargets(origin, dir);
  const end = hit ? hit.point : origin.clone().add(dir.clone().multiplyScalar(120));

  Game.tracer(origin, end, hit ? 0x9db8ff : 0x6b7280);

  if (hit) {
    Game.hitmarker();
    if (hit.type === "bot") {
      hit.bot.hp -= 34;
      Game.burst(hit.point, "#9db8ff", 6);
      if (hit.bot.hp <= 0) Game.killBot(hit.bot);
      else Game.botFlash(hit.bot);
    } else if (hit.type === "ghost" && Game.net) {
      const g = hit.ghost;
      Game.net.hits.push({ to: g.uid, dmg: 34, by: Game.nick, from: Game.net.uid, ts: Date.now() });
      Game.burst(hit.point, "#9db8ff", 8);
      g.flash = 0.3;
      // credit only when this shot finishes the target (34 dmg)
      if (g.hp > 0 && g.hp <= 34) {
        Game.score += 100;
        Game.kills += 1;
        Game.addFeed("YOU ▸ " + esc(g.name || "??"));
        Game.updateHud();
        Game.explode(hit.point);
      }
      g.hp = Math.max(0, g.hp - 34);
    }
  }
};

Game.raycastTargets = function (origin, dir) {
  let best = null, bestT = 130;
  Game.bots.forEach((b) => {
    if (!b.alive) return;
    const c = new THREE.Vector3(b.pos.x, 1.2, b.pos.z);
    const t = raySphere(origin, dir, c, 1.0);
    if (t !== null && t < bestT) { bestT = t; best = { type: "bot", bot: b, point: origin.clone().addScaledVector(dir, t) }; }
  });
  Object.keys(Game.ghosts).forEach((uid) => {
    const g = Game.ghosts[uid];
    if (!g || !g.alive) return;
    const c = new THREE.Vector3(g.pos.x, 1.2, g.pos.z);
    const t = raySphere(origin, dir, c, 1.05);
    if (t !== null && t < bestT) { bestT = t; best = { type: "ghost", ghost: g, point: origin.clone().addScaledVector(dir, t) }; }
  });
  return best;
};

Game.tracer = function (a, b, color) {
  const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
  const mat = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
  const line = new THREE.Line(geo, mat);
  Game.scene.add(line);
  Game.tracers.push({ line, life: 0.12, maxLife: 0.12 });
};

Game.killBot = function (b) {
  b.alive = false;
  b.respawnT = 3;
  b.mesh.visible = false;
  Game.score += 100;
  Game.kills += 1;
  Game.addFeed("YOU ▸ " + b.name);
  Game.explode(b.pos);
  Game.updateHud();
};

Game.botFlash = function (b) {
  b.flash = 0.25;
};

Game.updateBot = function (b, dt) {
  if (!b.alive) {
    b.respawnT -= dt;
    if (b.respawnT <= 0) Game.resetBot(b);
    return;
  }

  const dTo = Game.pos.distanceTo(b.pos);
  const dirTo = new THREE.Vector3().subVectors(Game.pos, b.pos);
  dirTo.y = 0;
  if (dirTo.lengthSq() > 0.001) dirTo.normalize();
  b.yaw = Math.atan2(-dirTo.x, -dirTo.z);

  // movement: seek when far, strafe when close
  b.strafeT -= dt;
  if (b.strafeT <= 0) { b.strafeDir *= -1; b.strafeT = 1.5 + Math.random() * 2; }
  const speed = dTo > 24 ? 4.5 : 3.2;
  const side = new THREE.Vector3(-dirTo.z, 0, dirTo.x).multiplyScalar(b.strafeDir * (dTo < 24 ? 1 : 0.2));
  const move = dirTo.clone().multiplyScalar(speed).add(side);
  b.pos.x += move.x * dt;
  b.pos.z += move.z * dt;
  b.pos.x = Math.max(-Game.bounds, Math.min(Game.bounds, b.pos.x));
  b.pos.z = Math.max(-Game.bounds, Math.min(Game.bounds, b.pos.z));
  Game.pillars.forEach((p) => {
    const dx = b.pos.x - p.x, dz = b.pos.z - p.z;
    const dist = Math.hypot(dx, dz);
    const min = p.r + 0.9;
    if (dist < min && dist > 0.001) {
      b.pos.x = p.x + (dx / dist) * min;
      b.pos.z = p.z + (dz / dist) * min;
    }
  });

  b.mesh.position.copy(b.pos);
  b.mesh.rotation.y = b.yaw;
  if (b.flash > 0) {
    b.flash -= dt;
    b.eye.material.opacity = 0.25;
  } else {
    b.eye.material.opacity = 1;
  }

  // shoot at player
  if (Game.alive && Game.invulnT <= 0 && dTo < 55) {
    b.shootT -= dt;
    if (b.shootT <= 0) {
      b.shootT = 1.1 + Math.random() * 1.2;
      if (!Game.lineBlocked(b.pos, Game.pos)) {
        // beam from bot to player
        const from = new THREE.Vector3(b.pos.x, 1.5, b.pos.z);
        const toP = new THREE.Vector3(Game.pos.x, Game.pos.y + 1.5, Game.pos.z);
        Game.tracer(from, toP, 0xc96f6f);
        const chance = 0.16 + 0.4 * Math.max(0, 1 - dTo / 55);
        if (Math.random() < chance) Game.damagePlayer(10);
      }
    }
  }
};

Game.lineBlocked = function (a, b) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = dir.length();
  dir.normalize();
  for (let i = 0; i < Game.pillars.length; i++) {
    const p = Game.pillars[i];
    const t = raySphere(a, dir, new THREE.Vector3(p.x, 1, p.z), p.r + 0.4);
    if (t !== null && t < len) return true;
  }
  return false;
};

Game.damagePlayer = function (dmg) {
  if (!Game.alive || Game.invulnT > 0) return;
  Game.hp -= dmg;
  Game.regenT = 4.5;
  Game.shake = Math.min(1, Game.shake + 0.8);
  if (Game.hp <= 0) {
    Game.hp = 0;
    Game.alive = false;
    Game.respawnT = 2.5;
    Game.score = Math.max(0, Game.score - 50);
    Game.addFeed("YOU WERE TAKEN OUT");
    Game.explode(Game.pos);
    document.body.classList.add("fps-dead");
    Game.updateHud();
  }
};

/* ─────────── fx helpers ─────────── */
Game.burst = function (pos, color, n) {
  n = n || 8;
  for (let i = 0; i < n; i++) {
    const sp = ASCII.makeSprite(ASCII.rand(["✦", "✧", "◇", "·"]), color || "#9db8ff", 0.14);
    sp.position.copy(pos);
    sp.userData.v = new THREE.Vector3((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5);
    sp.userData.life = 1;
    Game.scene.add(sp);
    Game.bursts.push(sp);
  }
};

Game.explode = function (pos) {
  Game.burst(pos, "#9db8ff", 18);
  Game.burst(pos, "#d8dce3", 10);
  if (Game.muzzleLight) {
    Game.muzzleLight.position.copy(pos);
    Game.muzzleLight.intensity = 5;
  }
};

Game.hitmarker = function () {
  const h = document.getElementById("fpsHit");
  if (!h) return;
  h.classList.remove("pop");
  void h.offsetWidth;
  h.classList.add("pop");
};

Game.addFeed = function (html) {
  const feed = document.getElementById("fpsFeed");
  if (!feed) return;
  const div = document.createElement("div");
  div.innerHTML = html;
  feed.appendChild(div);
  while (feed.children.length > 5) feed.removeChild(feed.firstChild);
  setTimeout(() => { if (div.parentNode) div.parentNode.removeChild(div); }, 4200);
};

Game.updateHud = function () {
  const hp = Math.max(0, Math.round(Game.hp));
  document.getElementById("fpsScore").textContent = Game.score;
  document.getElementById("fpsKills").textContent = "KILLS " + Game.kills + " · HP " + hp;
  document.getElementById("fpsHp").textContent = "HP " + hp;
  document.getElementById("fpsHealthFill").style.transform = "scaleX(" + (hp / 100) + ")";
  const players = 1 + Game.bots.filter((b) => b.alive).length + Object.keys(Game.ghosts).length;
  document.getElementById("fpsPlayers").textContent =
    "PLAYERS " + players + " · BOTS " + Game.bots.filter((b) => b.alive).length;
};

function updateArcadeStats() {
  document.getElementById("arcadeBest").textContent = Game.score;
  document.getElementById("arcadeKills").textContent = Game.kills;
  const players = 1 + Game.bots.filter((b) => b.alive).length + Object.keys(Game.ghosts).length;
  document.getElementById("arcadePlayers").textContent = players;
}

/* ray vs sphere helper */
function raySphere(o, d, c, r) {
  const oc = new THREE.Vector3().subVectors(o, c);
  const b = oc.dot(d);
  const cq = oc.dot(oc) - r * r;
  const disc = b * b - cq;
  if (disc < 0) return null;
  const t = -b - Math.sqrt(disc);
  return t > 0 ? t : null;
}

/* ─────────── multiplayer (Firebase RTDB) ─────────── */
Game.setupNet = function () {
  if (DB.mode !== "online" || !DB.database) return;
  Game.net = {
    uid: "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
    hits: [],
    ref: DB.database.ref("game/players"),
    hitsRef: DB.database.ref("game/hits")
  };

  Game.net.ref.on("child_added", (snap) => Game.upsertGhost(snap));
  Game.net.ref.on("child_changed", (snap) => Game.upsertGhost(snap));
  Game.net.ref.on("child_removed", (snap) => Game.removeGhost(snap.key));

  Game.net.hitsRef.on("child_added", (snap) => {
    const h = snap.val();
    if (!h || h.to !== Game.net.uid || h.from === Game.net.uid) return;
    Game.damagePlayer(h.dmg || 12);
    Game.net.hitsRef.child(snap.key).remove().catch(() => {});
  });
};

Game.upsertGhost = function (snap) {
  const d = snap.val();
  if (!d || snap.key === (Game.net && Game.net.uid)) return;
  let g = Game.ghosts[snap.key];
  if (!g) {
    const group = new THREE.Group();
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.6, 0.8),
      new THREE.MeshStandardMaterial({ color: 0x353a45, roughness: 0.5, metalness: 0.5 })
    );
    body.position.y = 1.15;
    const head = new THREE.Mesh(
      new THREE.BoxGeometry(0.5, 0.5, 0.5),
      new THREE.MeshStandardMaterial({ color: 0x4a5160, emissive: 0x8a9bb8, emissiveIntensity: 0.7 })
    );
    head.position.y = 2.2;
    group.add(body, head);
    Game.scene.add(group);
    g = { uid: snap.key, mesh: group, pos: new THREE.Vector3(), alive: true, hp: 100, name: d.n || "???", flash: 0, nameEl: null };

    // name tag sprite
    const cn = document.createElement("canvas");
    cn.width = 256; cn.height = 48;
    const cx = cn.getContext("2d");
    cx.font = "bold 26px Consolas, monospace";
    cx.fillStyle = "#c8d3e8";
    cx.textAlign = "center";
    cx.fillText(g.name, 128, 30);
    const nameTex = new THREE.CanvasTexture(cn);
    const nameSp = new THREE.Sprite(new THREE.SpriteMaterial({ map: nameTex, transparent: true, depthWrite: false }));
    nameSp.scale.set(2.6, 0.5, 1);
    nameSp.position.y = 3.0;
    group.add(nameSp);
    g.nameSp = nameSp;

    Game.ghosts[snap.key] = g;
    Game.ghostIds.push(snap.key);
  }
  g.pos.set(d.x || 0, 0, d.z || 0);
  g.yaw = d.yaw || 0;
  g.hp = typeof d.hp === "number" ? d.hp : 100;
  g.name = d.n || g.name;    if (g.nameSp && d.n !== g.name) {
      const cn = document.createElement("canvas");
      cn.width = 256; cn.height = 48;
      const cx = cn.getContext("2d");
      cx.font = "bold 26px Consolas, monospace";
      cx.fillStyle = "#c8d3e8";
      cx.textAlign = "center";
      cx.fillText(g.name, 128, 30);
      g.nameSp.material.map = new THREE.CanvasTexture(cn);
      g.nameSp.material.needsUpdate = true;
    }
  g.alive = g.hp > 0;
  g.mesh.visible = g.alive;
  g.mesh.position.copy(g.pos);
  g.mesh.rotation.y = g.yaw;
};

Game.removeGhost = function (uid) {
  const g = Game.ghosts[uid];
  if (!g) return;
  Game.scene.remove(g.mesh);
  if (g.mesh.children) g.mesh.children.forEach((c) => { if (c.material && c.material.map) c.material.map.dispose(); });
  delete Game.ghosts[uid];
  const i = Game.ghostIds.indexOf(uid);
  if (i >= 0) Game.ghostIds.splice(i, 1);
};

Game.sendNet = function () {
  if (!Game.net) return;
  Game.net.ref.child(Game.net.uid).set({
    n: Game.nick,
    x: Math.round(Game.pos.x * 10) / 10,
    y: Math.round(Game.pos.y * 10) / 10,
    z: Math.round(Game.pos.z * 10) / 10,
    yaw: Math.round(Game.yaw * 10) / 10,
    hp: Math.round(Game.hp),
    k: Game.kills,
    ts: Date.now()
  }).catch(() => {});

  if (Game.net.hits.length) {
    const batch = Game.net.hits.splice(0, Game.net.hits.length);
    batch.forEach((h) => {
      Game.net.hitsRef.push(h).then((snap) => {
        // self-clean after 10s so stray hits never pile up
        setTimeout(() => snap.ref.remove().catch(() => {}), 10000);
      }).catch(() => {});
    });
  }
};

Game.teardownNet = function () {
  if (!Game.net) return;
  Game.net.ref.child(Game.net.uid).remove().catch(() => {});
  Game.net.ref.off();
  Game.net.hitsRef.off();
  Object.keys(Game.ghosts).forEach((u) => Game.removeGhost(u));
  Game.net = null;
};

/* ─────────── touch controls (mobile) ─────────── */
Game.bindTouch = function () {
  const isTouch = "ontouchstart" in window || (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);
  if (!isTouch) return;
  document.body.classList.add("touch");

  const stick = document.getElementById("touchJoystick");
  const knob = stick ? stick.querySelector("i") : null;
  const shoot = document.getElementById("touchShoot");
  let sx = 0, sy = 0, active = false;
  const base = { x: 0, y: 0 };

  const onStart = (e) => {
    if (!Game.active || !Game.alive) return;
    const t = e.touches[0];
    sx = t.clientX; sy = t.clientY;
    base.x = 0; base.y = 0;
    active = true;
    e.preventDefault();
  };
  const onMove = (e) => {
    if (!active || !Game.active) return;
    const t = e.touches[0];
    base.x = Math.max(-42, Math.min(42, t.clientX - sx));
    base.y = Math.max(-42, Math.min(42, t.clientY - sy));
    if (knob) knob.style.transform = "translate(" + base.x + "px," + base.y + "px)";
    e.preventDefault();
  };
  const onEnd = () => {
    active = false;
    base.x = 0; base.y = 0;
    if (knob) knob.style.transform = "translate(0,0)";
  };
  if (stick) {
    stick.addEventListener("touchstart", onStart, { passive: false });
    stick.addEventListener("touchmove", onMove, { passive: false });
    stick.addEventListener("touchend", onEnd);
  }
  if (shoot) {
    shoot.addEventListener("touchstart", (e) => { if (Game.active) Game.shoot(); e.preventDefault(); }, { passive: false });
  }  Game.touch = {
    stick, shoot, base,
    get vec() { return { x: base.x / 42, y: base.y / 42 }; }
  };
};


