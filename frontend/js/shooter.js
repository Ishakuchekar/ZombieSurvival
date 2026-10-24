const SAVE_KEY = "last-stand.action-save.v1";
const SCORE_KEY = "last-stand.action-scores.v1";
const WORLD = { width: 2200, height: 1500 };
const WEAPONS = {
  pistol: { name: "Service pistol", mag: 12, damage: 31, rate: 3.2, reload: 0.8, reserve: 48, speed: 760, pellets: 1, spread: 0.025, color: "#e9c78f" },
  rifle: { name: "Assault rifle", mag: 30, damage: 18, rate: 9, reload: 1.25, reserve: 90, speed: 920, pellets: 1, spread: 0.055, color: "#d9b777" },
  shotgun: { name: "Pump shotgun", mag: 6, damage: 15, rate: 1.15, reload: 1.5, reserve: 30, speed: 630, pellets: 7, spread: 0.19, color: "#f2a871" }
};
const FOES = {
  walker: { name: "Walker", hp: 54, speed: 45, damage: 9, radius: 15, color: "#7d8566", score: 100, drop: 0.16 },
  runner: { name: "Runner", hp: 30, speed: 86, damage: 7, radius: 11, color: "#b48b68", score: 135, drop: 0.13 },
  armored: { name: "Armored", hp: 120, speed: 33, damage: 15, radius: 20, color: "#68736c", armor: 0.48, score: 190, drop: 0.27 },
  brute: { name: "Brute", hp: 235, speed: 27, damage: 24, radius: 27, color: "#8e5146", score: 400, drop: 0.6 }
};
const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
const random = (min, max) => min + Math.random() * (max - min);
const randomId = () => Math.random().toString(36).slice(2, 10);
const DIFFICULTY = { recruit: 0.76, survivor: 1, nightmare: 1.33 };

function initialState(name, difficulty) {
  return {
    gameMode: "realtime",
    status: "active",
    phase: "intermission",
    night: 1,
    difficulty: Object.hasOwn(DIFFICULTY, difficulty) ? difficulty : "survivor",
    player: {
      name: String(name).trim().slice(0, 24),
      x: WORLD.width / 2,
      y: WORLD.height / 2,
      angle: -Math.PI / 2,
      health: 100,
      maxHealth: 100,
      stamina: 100,
      scrap: 0,
      score: 0,
      kills: 0,
      medkits: 2,
      ammoPacks: 1,
      weapons: {
        pistol: { unlocked: true, ammo: 12, reserve: 48 },
        rifle: { unlocked: false, ammo: 0, reserve: 0 },
        shotgun: { unlocked: false, ammo: 0, reserve: 0 }
      },
      weapon: "pistol"
    },
    enemies: [],
    loot: [],
    log: [{ id: randomId(), text: "Safehouse secured. Hold the district through five waves.", tone: "story" }],
    obstacles: [
      { x: 200, y: 190, w: 370, h: 125, kind: "building" },
      { x: 790, y: 155, w: 265, h: 105, kind: "building" },
      { x: 1480, y: 190, w: 450, h: 125, kind: "building" },
      { x: 85, y: 585, w: 150, h: 48, kind: "barrier" },
      { x: 670, y: 460, w: 68, h: 150, kind: "container" },
      { x: 1195, y: 510, w: 205, h: 54, kind: "barrier" },
      { x: 1740, y: 465, w: 66, h: 160, kind: "container" },
      { x: 310, y: 895, w: 300, h: 130, kind: "building" },
      { x: 1005, y: 845, w: 95, h: 180, kind: "container" },
      { x: 1480, y: 905, w: 385, h: 120, kind: "building" },
      { x: 760, y: 1190, w: 215, h: 52, kind: "barrier" },
      { x: 1280, y: 1190, w: 65, h: 132, kind: "container" }
    ],
    waveSize: 0,
    combatClock: 0,
    lastSave: 0,
    message: "Intermission — collect yourself and prepare."
  };
}

export class RealtimeShooter {
  static hasSave() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      return RealtimeShooter.valid(saved) && saved.status === "active";
    } catch { return false; }
  }

  static load() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (RealtimeShooter.valid(saved) && saved.status === "active") return saved;
      localStorage.removeItem(SAVE_KEY);
    } catch { localStorage.removeItem(SAVE_KEY); }
    return null;
  }

  static clearSave() {
    localStorage.removeItem(SAVE_KEY);
  }

  static valid(state) {
    const player = state?.player;
    return state?.gameMode === "realtime" &&
      ["active", "victory", "defeat"].includes(state.status) &&
      ["intermission", "combat"].includes(state.phase) &&
      Number.isInteger(state.night) && state.night >= 1 && state.night <= 5 &&
      player && typeof player.name === "string" && player.name.length > 0 && player.name.length <= 24 &&
      Number.isFinite(player.health) && player.health >= 0 && player.health <= player.maxHealth &&
      Number.isFinite(player.stamina) && player.stamina >= 0 && player.stamina <= 100 &&
      ["scrap", "score", "kills", "medkits", "ammoPacks"].every((key) => Number.isFinite(player[key]) && player[key] >= 0) &&
      Number.isFinite(player.x) && player.x >= 20 && player.x <= WORLD.width - 20 &&
      Number.isFinite(player.y) && player.y >= 20 && player.y <= WORLD.height - 20 &&
      ["pistol", "rifle", "shotgun"].includes(player.weapon) &&
      player.weapons && ["pistol", "rifle", "shotgun"].every((weapon) => {
        const item = player.weapons[weapon];
        return item && typeof item.unlocked === "boolean" && Number.isInteger(item.ammo) &&
          item.ammo >= 0 && item.ammo <= WEAPONS[weapon].mag &&
          Number.isInteger(item.reserve) && item.reserve >= 0 && item.reserve <= 500;
      }) && Array.isArray(state.enemies) && state.enemies.length <= 80 &&
      Array.isArray(state.loot) && state.loot.length <= 100 &&
      Array.isArray(state.obstacles) && state.obstacles.length <= 100 &&
      state.enemies.every((enemy) => FOES[enemy.type] && Number.isFinite(enemy.x) &&
        Number.isFinite(enemy.y) && Number.isFinite(enemy.health) && enemy.health >= 0 &&
        enemy.health <= enemy.maxHealth);
  }

  static leaderboard() {
    try {
      const values = JSON.parse(localStorage.getItem(SCORE_KEY) || "[]");
      return Array.isArray(values) ? values.filter((row) =>
        typeof row.name === "string" && Number.isFinite(row.score) &&
        Number.isFinite(row.kills) && Number.isFinite(row.nights))
        .sort((a, b) => b.score - a.score).slice(0, 10) : [];
    } catch { return []; }
  }

  constructor(canvas, state, onChange, settings = {}) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d", { alpha: false });
    if (!this.ctx) throw new Error("This browser could not create a 2D canvas.");
    this.state = state;
    this.onChange = onChange;
    this.settings = settings;
    this.keys = new Set();
    this.mouse = { x: 0, y: 0, down: false };
    this.bullets = [];
    this.effects = [];
    this.particles = [];
    this.camera = { x: 0, y: 0 };
    this.time = 0;
    this.fireTimer = 0;
    this.reloadTimer = 0;
    this.attackFlash = 0;
    this.dodgeTimer = 0;
    this.invulnerable = 0;
    this.hitMarker = 0;
    this.shake = 0;
    this.paused = false;
    this.lastFrame = 0;
    this.destroyed = false;
    this.fpsUiClock = 0;
    this.handleKeyDown = (event) => this.keyDown(event);
    this.handleKeyUp = (event) => this.keys.delete(event.key.toLowerCase());
    this.handleMouseMove = (event) => this.mouseMove(event);
    this.handleMouseDown = (event) => { if (event.button === 0) { this.mouse.down = true; this.canvas.focus(); } };
    this.handleMouseUp = (event) => { if (event.button === 0) this.mouse.down = false; };
    this.handleContextMenu = (event) => event.preventDefault();
    this.handleBlur = () => { this.keys.clear(); this.mouse.down = false; };
    window.addEventListener("keydown", this.handleKeyDown);
    window.addEventListener("keyup", this.handleKeyUp);
    window.addEventListener("blur", this.handleBlur);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
    this.canvas.addEventListener("mousedown", this.handleMouseDown);
    window.addEventListener("mouseup", this.handleMouseUp);
    this.canvas.addEventListener("contextmenu", this.handleContextMenu);
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();
    this.persist();
    this.frame = (time) => this.loop(time);
    this.raf = requestAnimationFrame(this.frame);
  }

  static start(name, difficulty) {
    const clean = String(name).trim().slice(0, 24);
    if (!clean) throw new Error("Enter a survivor name first.");
    const state = initialState(clean, difficulty);
    RealtimeShooter.persistState(state);
    return state;
  }

  static persistState(state) {
    if (RealtimeShooter.valid(state) && state.status === "active") {
      localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    }
  }

  getState() { return this.state; }

  resize() {
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.viewWidth = rect.width;
    this.viewHeight = rect.height;
  }

  setPaused(paused) {
    this.paused = paused;
    this.keys.clear();
    this.mouse.down = false;
  }

  destroy() {
    this.destroyed = true;
    cancelAnimationFrame(this.raf);
    this.resizeObserver.disconnect();
    window.removeEventListener("keydown", this.handleKeyDown);
    window.removeEventListener("keyup", this.handleKeyUp);
    window.removeEventListener("blur", this.handleBlur);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
    this.canvas.removeEventListener("mousedown", this.handleMouseDown);
    window.removeEventListener("mouseup", this.handleMouseUp);
    this.canvas.removeEventListener("contextmenu", this.handleContextMenu);
  }

  keyDown(event) {
    if (event.target.matches("input, textarea, select")) return;
    const key = event.key.toLowerCase();
    if (["w", "a", "s", "d", " ", "arrowup", "arrowdown", "arrowleft", "arrowright", "tab"].includes(key)) event.preventDefault();
    if (this.paused || this.state.status !== "active") return;
    this.keys.add(key);
    if (key === "r") this.reload();
    else if (key === " ") this.dodge();
    else if (["1", "2", "3"].includes(key)) this.switchWeapon(["pistol", "rifle", "shotgun"][Number(key) - 1]);
    else if (key === "i" || key === "tab") this.onChange({ type: "inventory" });
    else if (key === "e") this.interact();
    else if (key === "escape") this.onChange({ type: "pause" });
  }

  mouseMove(event) {
    const rect = this.canvas.getBoundingClientRect();
    this.mouse.x = event.clientX - rect.left;
    this.mouse.y = event.clientY - rect.top;
  }

  loop(time) {
    if (this.destroyed) return;
    const delta = this.lastFrame ? Math.min((time - this.lastFrame) / 1000, 0.04) : 0;
    this.lastFrame = time;
    this.time += delta;
    if (!this.paused && this.state.status === "active") this.update(delta);
    this.draw();
    this.fpsUiClock += delta;
    if (this.fpsUiClock > 0.12) {
      this.fpsUiClock = 0;
      this.onChange({ type: "tick", state: this.state });
    }
    this.raf = requestAnimationFrame(this.frame);
  }

  update(delta) {
    const state = this.state;
    const player = state.player;
    this.dodgeTimer = Math.max(0, this.dodgeTimer - delta);
    this.invulnerable = Math.max(0, this.invulnerable - delta);
    this.fireTimer = Math.max(0, this.fireTimer - delta);
    this.attackFlash = Math.max(0, this.attackFlash - delta);
    this.hitMarker = Math.max(0, this.hitMarker - delta);
    this.shake = Math.max(0, this.shake - delta * 25);
    if (this.reloadTimer > 0) {
      this.reloadTimer -= delta;
      if (this.reloadTimer <= 0) this.completeReload();
    }
    const cameraX = clamp(player.x - this.viewWidth / 2, 0, WORLD.width - this.viewWidth);
    const cameraY = clamp(player.y - this.viewHeight / 2, 0, WORLD.height - this.viewHeight);
    this.camera.x = cameraX;
    this.camera.y = cameraY;
    const aimX = this.mouse.x + cameraX;
    const aimY = this.mouse.y + cameraY;
    player.angle = Math.atan2(aimY - player.y, aimX - player.x);

    if (state.phase === "combat") {
      this.movePlayer(delta);
      player.stamina = Math.min(100, player.stamina + 5 * delta);
      if (this.mouse.down && this.fireTimer <= 0 && this.reloadTimer <= 0) this.fire();
      this.updateBullets(delta);
      this.updateEnemies(delta);
      this.updateLoot(delta);
      if (state.enemies.length === 0) this.finishWave();
    }
    for (const effect of this.effects) effect.life -= delta;
    this.effects = this.effects.filter((effect) => effect.life > 0);
    for (const particle of this.particles) {
      particle.x += particle.vx * delta;
      particle.y += particle.vy * delta;
      particle.life -= delta;
    }
    this.particles = this.particles.filter((particle) => particle.life > 0);
    state.combatClock += delta;
    if (state.combatClock > 1.4) {
      state.combatClock = 0;
      this.persist();
    }
  }

  movePlayer(delta) {
    const player = this.state.player;
    let dx = (this.keys.has("d") || this.keys.has("arrowright") ? 1 : 0) - (this.keys.has("a") || this.keys.has("arrowleft") ? 1 : 0);
    let dy = (this.keys.has("s") || this.keys.has("arrowdown") ? 1 : 0) - (this.keys.has("w") || this.keys.has("arrowup") ? 1 : 0);
    const length = Math.hypot(dx, dy);
    if (!length) return;
    dx /= length;
    dy /= length;
    let speed = 235;
    if (this.invulnerable > 0 && this.dodgeTimer > 0.62) speed = 640;
    const nextX = player.x + dx * speed * delta;
    const nextY = player.y + dy * speed * delta;
    if (!this.blocked(nextX, player.y, 17)) player.x = clamp(nextX, 18, WORLD.width - 18);
    if (!this.blocked(player.x, nextY, 17)) player.y = clamp(nextY, 18, WORLD.height - 18);
    for (const enemy of this.state.enemies) {
      const radius = FOES[enemy.type].radius * 0.55 + 10;
      const gapX = player.x - enemy.x;
      const gapY = player.y - enemy.y;
      const distance = Math.hypot(gapX, gapY);
      if (distance > 0.01 && distance < radius) {
        const push = radius - distance;
        const separatedX = clamp(player.x + gapX / distance * push, 18, WORLD.width - 18);
        const separatedY = clamp(player.y + gapY / distance * push, 18, WORLD.height - 18);
        if (!this.blocked(separatedX, player.y, 17)) player.x = separatedX;
        if (!this.blocked(player.x, separatedY, 17)) player.y = separatedY;
      }
    }
  }

  blocked(x, y, radius) {
    return this.state.obstacles.some((o) =>
      x + radius > o.x && x - radius < o.x + o.w &&
      y + radius > o.y && y - radius < o.y + o.h);
  }

  fire() {
    const player = this.state.player;
    const type = player.weapon;
    const weapon = WEAPONS[type];
    const ammo = player.weapons[type];
    if (ammo.ammo < 1) {
      this.fireTimer = 0.28;
      this.addLog("Magazine empty — press R to reload.", "danger");
      this.onChange({ type: "message", message: "Magazine empty — press R to reload." });
      return;
    }
    ammo.ammo -= 1;
    this.fireTimer = 1 / weapon.rate;
    this.attackFlash = 0.09;
    this.shake = type === "shotgun" ? 5 : type === "rifle" ? 2.1 : 1.2;
    for (let pellet = 0; pellet < weapon.pellets; pellet += 1) {
      const angle = player.angle + random(-weapon.spread, weapon.spread);
      this.bullets.push({
        x: player.x + Math.cos(angle) * 24,
        y: player.y + Math.sin(angle) * 24,
        vx: Math.cos(angle) * weapon.speed,
        vy: Math.sin(angle) * weapon.speed,
        damage: weapon.damage,
        life: type === "shotgun" ? 0.3 : 0.7,
        color: weapon.color
      });
    }
    this.addEffect(player.x + Math.cos(player.angle) * 28, player.y + Math.sin(player.angle) * 28, "muzzle", 0.12);
    this.onChange({ type: "shot" });
  }

  updateBullets(delta) {
    for (const bullet of this.bullets) {
      bullet.x += bullet.vx * delta;
      bullet.y += bullet.vy * delta;
      bullet.life -= delta;
      if (this.blocked(bullet.x, bullet.y, 2)) {
        bullet.life = 0;
        this.addEffect(bullet.x, bullet.y, "spark", 0.22);
        continue;
      }
      for (const enemy of this.state.enemies) {
        if (enemy.health <= 0) continue;
        const spec = FOES[enemy.type];
        if (Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y) < spec.radius + 5) {
          const damage = Math.max(1, Math.round(bullet.damage * (1 - (spec.armor || 0))));
          enemy.health = Math.max(0, enemy.health - damage);
          enemy.flash = 0.13;
          enemy.knockX = bullet.vx * 0.028;
          enemy.knockY = bullet.vy * 0.028;
          bullet.life = 0;
          this.hitMarker = 0.12;
          this.addEffect(bullet.x, bullet.y, "blood", 0.38);
          if (enemy.health === 0) this.killEnemy(enemy);
          break;
        }
      }
    }
    this.bullets = this.bullets.filter((bullet) => bullet.life > 0);
  }

  updateEnemies(delta) {
    const player = this.state.player;
    for (const enemy of this.state.enemies) {
      const spec = FOES[enemy.type];
      enemy.attackTimer = Math.max(0, enemy.attackTimer - delta);
      enemy.flash = Math.max(0, enemy.flash - delta);
      let dx = player.x - enemy.x;
      let dy = player.y - enemy.y;
      let distance = Math.max(0.001, Math.hypot(dx, dy));
      dx /= distance;
      dy /= distance;
      if (distance > spec.radius + 23) {
        const steering = this.obstacleSteering(enemy, dx, dy);
        const nextX = enemy.x + steering.x * spec.speed * delta;
        const nextY = enemy.y + steering.y * spec.speed * delta;
        if (!this.blocked(nextX, enemy.y, spec.radius * 0.68)) enemy.x = nextX;
        else if (!this.blocked(enemy.x + -steering.y * spec.speed * delta, enemy.y, spec.radius * 0.68)) enemy.x += -steering.y * spec.speed * delta;
        if (!this.blocked(enemy.x, nextY, spec.radius * 0.68)) enemy.y = nextY;
        else if (!this.blocked(enemy.x, enemy.y + steering.x * spec.speed * delta, spec.radius * 0.68)) enemy.y += steering.x * spec.speed * delta;
      } else if (enemy.attackTimer <= 0 && this.invulnerable <= 0) {
        const damage = spec.damage * DIFFICULTY[this.state.difficulty];
        player.health = Math.max(0, player.health - damage);
        enemy.attackTimer = enemy.type === "runner" ? 0.78 : enemy.type === "brute" ? 1.35 : 1.08;
        this.shake = 8;
        this.addEffect(player.x, player.y, "impact", 0.35);
        this.addLog(`${spec.name} hits for ${Math.ceil(damage)} damage.`, "danger");
        this.onChange({ type: "damage" });
        if (player.health <= 0) {
          this.finish("defeat");
          return;
        }
        enemy.x = clamp(enemy.x, spec.radius, WORLD.width - spec.radius);
        enemy.y = clamp(enemy.y, spec.radius, WORLD.height - spec.radius);
      }
    }
    this.separateEnemies();
  }

  obstacleSteering(enemy, dx, dy) {
    const spec = FOES[enemy.type];
    let x = dx;
    let y = dy;
    for (const obstacle of this.state.obstacles) {
      const closestX = clamp(enemy.x, obstacle.x, obstacle.x + obstacle.w);
      const closestY = clamp(enemy.y, obstacle.y, obstacle.y + obstacle.h);
      const awayX = enemy.x - closestX;
      const awayY = enemy.y - closestY;
      const distance = Math.hypot(awayX, awayY);
      if (distance < spec.radius + 42) {
        const strength = (spec.radius + 42 - distance) / (spec.radius + 42);
        if (distance < 0.01) {
          const horizontal = Math.min(Math.abs(enemy.x - obstacle.x), Math.abs(enemy.x - obstacle.x - obstacle.w));
          x += (enemy.x < obstacle.x + obstacle.w / 2 ? -1 : 1) * (horizontal < 8 ? 1.2 : 0.7);
          y += (Math.random() - 0.5) * 0.2;
        } else {
          x += awayX / distance * strength * 2.3;
          y += awayY / distance * strength * 2.3;
        }
      }
    }
    const magnitude = Math.max(0.001, Math.hypot(x, y));
    return { x: x / magnitude, y: y / magnitude };
  }

  separateEnemies() {
    const enemies = this.state.enemies;
    for (let i = 0; i < enemies.length; i += 1) {
      for (let j = i + 1; j < enemies.length; j += 1) {
        const a = enemies[i]; const b = enemies[j];
        const minDistance = (FOES[a.type].radius + FOES[b.type].radius) * 0.68;
        const dx = b.x - a.x; const dy = b.y - a.y;
        const distance = Math.hypot(dx, dy);
        if (distance > 0.01 && distance < minDistance) {
          const push = (minDistance - distance) * 0.35;
          const px = dx / distance * push; const py = dy / distance * push;
          if (!this.blocked(a.x - px, a.y - py, 5)) { a.x -= px; a.y -= py; }
          if (!this.blocked(b.x + px, b.y + py, 5)) { b.x += px; b.y += py; }
        }
      }
    }
  }

  killEnemy(enemy) {
    const spec = FOES[enemy.type];
    const player = this.state.player;
    player.kills += 1;
    player.score += Math.round(spec.score * (this.state.difficulty === "nightmare" ? 1.35 : 1));
    player.scrap += enemy.type === "brute" ? 3 : enemy.type === "armored" ? 2 : 1;
    this.addLog(`${spec.name} eliminated. +${spec.score} score.`, "success");
    this.addEffect(enemy.x, enemy.y, "death", 0.5);
    this.spawnLoot(enemy.x, enemy.y, enemy.type === "brute" ? 0.72 : spec.drop);
    this.state.enemies = this.state.enemies.filter((item) => item !== enemy);
  }

  spawnLoot(x, y, chance) {
    if (Math.random() > chance) return;
    const roll = Math.random();
    const type = roll < 0.24 ? "medkit" : roll < 0.72 ? "ammo" : "scrap";
    this.state.loot.push({ id: randomId(), type, x: x + random(-20, 20), y: y + random(-20, 20), collected: false });
    this.addLog(`A ${type} drop hit the ground. Press E nearby to collect.`, "loot");
  }

  updateLoot() {
    for (const pickup of this.state.loot) {
      if (pickup.collected) continue;
      pickup.pulse = (pickup.pulse || 0) + 0.04;
    }
    this.state.loot = this.state.loot.filter((pickup) => !pickup.collected);
  }

  interact() {
    if (this.state.phase !== "combat") {
      this.addLog("No nearby salvage. Start the wave to scavenge the district.", "story");
      this.onChange({ type: "message", message: "No nearby item to collect." });
      return;
    }
    const player = this.state.player;
    const pickup = this.state.loot.find((item) => Math.hypot(item.x - player.x, item.y - player.y) < 66);
    if (!pickup) {
      this.onChange({ type: "message", message: "Move closer to a loot marker, then press E." });
      return;
    }
    pickup.collected = true;
    if (pickup.type === "medkit") player.medkits += 1;
    else if (pickup.type === "ammo") {
      player.weapons.pistol.reserve += 14;
      if (player.weapons.rifle.unlocked) player.weapons.rifle.reserve += 22;
    } else player.scrap += 2;
    this.addLog(`${pickup.type[0].toUpperCase()}${pickup.type.slice(1)} collected.`, "success");
    this.onChange({ type: "pickup" });
    this.persist();
  }

  finishWave() {
    const state = this.state;
    const player = state.player;
    const clearedNight = state.night;
    state.phase = "intermission";
    player.health = Math.min(player.maxHealth, player.health + 9);
    player.stamina = 100;
    player.scrap += 3 + clearedNight;
    player.weapons[player.weapon].reserve += 8;
    state.loot = [];
    this.addLog(`Wave ${clearedNight} cleared. +${3 + clearedNight} salvage, +8 reserve rounds.`, "story");
    if (clearedNight >= 5) {
      this.finish("victory");
      return;
    }
    state.night = clearedNight + 1;
    state.message = `Wave ${clearedNight} cleared — resupply, then start wave ${state.night}.`;
    this.persist();
    this.onChange({ type: "wave-clear" });
  }

  beginWave() {
    if (this.state.status !== "active" || this.state.phase !== "intermission") return;
    const wave = this.state.night;
    const factor = DIFFICULTY[this.state.difficulty];
    const count = 4 + wave * 2;
    this.state.phase = "combat";
    this.state.waveSize = count;
    this.state.enemies = [];
    for (let i = 0; i < count; i += 1) {
      let type = "walker";
      const roll = Math.random();
      if (wave >= 2 && roll < Math.min(0.36, 0.1 + wave * 0.035)) type = "runner";
      else if (wave >= 2 && roll < Math.min(0.56, 0.22 + wave * 0.035)) type = "armored";
      else if (wave >= 3 && roll > 0.91 - Math.min(0.15, wave * 0.025)) type = "brute";
      if (wave === 5 && i === count - 1) type = "brute";
      const spec = FOES[type];
      const edge = Math.floor(Math.random() * 4);
      const x = edge === 0 ? 50 : edge === 1 ? WORLD.width - 50 : random(90, WORLD.width - 90);
      const y = edge === 2 ? 50 : edge === 3 ? WORLD.height - 50 : random(90, WORLD.height - 90);
      this.state.enemies.push({
        id: randomId(), type, x, y, health: Math.round(spec.hp * (1 + (wave - 1) * 0.19) * factor),
        maxHealth: Math.round(spec.hp * (1 + (wave - 1) * 0.19) * factor),
        attackTimer: random(0.1, 1.1), flash: 0, knockX: 0, knockY: 0
      });
    }
    this.addLog(`Wave ${wave}: ${count} hostiles incoming.`, "danger");
    this.persist();
    this.onChange({ type: "wave-start" });
  }

  reload() {
    if (this.state.phase !== "combat" || this.reloadTimer > 0) return;
    const weapon = WEAPONS[this.state.player.weapon];
    const slot = this.state.player.weapons[this.state.player.weapon];
    if (slot.ammo >= weapon.mag) return this.onChange({ type: "message", message: "Magazine is already full." });
    if (slot.reserve <= 0) return this.onChange({ type: "message", message: "No reserve ammunition. Scavenge or craft ammo." });
    this.reloadTimer = weapon.reload;
    this.onChange({ type: "reload-start" });
  }

  completeReload() {
    const weapon = WEAPONS[this.state.player.weapon];
    const slot = this.state.player.weapons[this.state.player.weapon];
    const amount = Math.min(weapon.mag - slot.ammo, slot.reserve);
    slot.ammo += amount;
    slot.reserve -= amount;
    this.addLog(`${weapon.name} reloaded.`, "success");
    this.onChange({ type: "reload" });
  }

  switchWeapon(type) {
    if (!WEAPONS[type]) return;
    if (!this.state.player.weapons[type].unlocked) {
      this.onChange({ type: "message", message: `${WEAPONS[type].name} is locked. Unlock it at the safehouse.` });
      return;
    }
    this.state.player.weapon = type;
    this.reloadTimer = 0;
    this.addLog(`${WEAPONS[type].name} equipped.`, "action");
    this.onChange({ type: "weapon" });
  }

  dodge() {
    const player = this.state.player;
    if (this.state.phase !== "combat") return;
    if (this.dodgeTimer > 0) return this.onChange({ type: "message", message: `Evade recharging (${this.dodgeTimer.toFixed(1)}s).` });
    if (player.stamina < 28) return this.onChange({ type: "message", message: "Too exhausted to evade." });
    const mouseX = this.mouse.x + this.camera.x;
    const mouseY = this.mouse.y + this.camera.y;
    let angle = Math.atan2(player.y - mouseY, player.x - mouseX);
    let dx = (this.keys.has("d") ? 1 : 0) - (this.keys.has("a") ? 1 : 0);
    let dy = (this.keys.has("s") ? 1 : 0) - (this.keys.has("w") ? 1 : 0);
    if (dx || dy) angle = Math.atan2(dy, dx);
    const nextX = clamp(player.x + Math.cos(angle) * 145, 20, WORLD.width - 20);
    const nextY = clamp(player.y + Math.sin(angle) * 145, 20, WORLD.height - 20);
    if (!this.blocked(nextX, nextY, 17)) {
      player.x = nextX;
      player.y = nextY;
    }
    player.stamina -= 28;
    this.invulnerable = 0.48;
    this.dodgeTimer = 2.4;
    this.addEffect(player.x, player.y, "dodge", 0.28);
    this.onChange({ type: "dodge" });
  }

  useMedkit() {
    const player = this.state.player;
    if (player.medkits < 1) return this.onChange({ type: "message", message: "No medkits in your pack." });
    if (player.health >= player.maxHealth) return this.onChange({ type: "message", message: "You are already at full health." });
    player.medkits -= 1;
    player.health = Math.min(player.maxHealth, player.health + 42);
    this.addLog("Medkit used. Wounds patched.", "success");
    this.persist();
    this.onChange({ type: "heal" });
  }

  useAmmoPack() {
    const player = this.state.player;
    const slot = player.weapons[player.weapon];
    if (player.ammoPacks < 1) return this.onChange({ type: "message", message: "No ammo caches in your pack." });
    player.ammoPacks -= 1;
    slot.reserve += player.weapon === "rifle" ? 30 : player.weapon === "shotgun" ? 12 : 18;
    this.addLog("Ammunition recovered from your field cache.", "success");
    this.persist();
    this.onChange({ type: "ammo" });
  }

  craft(recipe) {
    if (this.state.phase !== "intermission") return this.onChange({ type: "message", message: "Crafting is only available between waves." });
    const player = this.state.player;
    if (recipe === "medkit") {
      if (player.scrap < 5) return this.onChange({ type: "message", message: "Need 5 salvage to craft a medkit." });
      player.scrap -= 5;
      player.medkits += 1;
    } else if (recipe === "ammo") {
      if (player.scrap < 3) return this.onChange({ type: "message", message: "Need 3 salvage to craft ammunition." });
      player.scrap -= 3;
      player.ammoPacks += 1;
    }
    this.addLog(`${recipe === "medkit" ? "Medkit" : "Ammo cache"} crafted.`, "success");
    this.persist();
    this.onChange({ type: "craft" });
  }

  unlock(type) {
    if (this.state.phase !== "intermission") return this.onChange({ type: "message", message: "Weapon purchases are available between waves." });
    const player = this.state.player;
    const cost = type === "rifle" ? 10 : 14;
    if (!WEAPONS[type] || type === "pistol") return;
    if (player.weapons[type].unlocked) return this.onChange({ type: "message", message: "That weapon is already in your kit." });
    if (player.scrap < cost) return this.onChange({ type: "message", message: `Need ${cost} salvage to unlock the ${WEAPONS[type].name}.` });
    player.scrap -= cost;
    player.weapons[type] = { unlocked: true, ammo: WEAPONS[type].mag, reserve: WEAPONS[type].reserve };
    this.addLog(`${WEAPONS[type].name} acquired. Press ${type === "rifle" ? "2" : "3"} to equip.`, "success");
    this.persist();
    this.onChange({ type: "unlock" });
  }

  finish(status) {
    if (this.state.status !== "active") return;
    this.state.status = status;
    this.state.phase = "intermission";
    this.state.enemies = [];
    this.state.loot = [];
    if (status === "victory") {
      this.state.player.score += 1200;
      this.addLog("Five waves cleared. Extraction confirmed.", "success");
    } else this.addLog("Health critical. The district is lost.", "danger");
    localStorage.removeItem(SAVE_KEY);
    const rows = RealtimeShooter.leaderboard();
    rows.push({
      name: this.state.player.name,
      score: this.state.player.score,
      kills: this.state.player.kills,
      nights: status === "victory" ? 5 : this.state.night - 1,
      difficulty: this.state.difficulty.toUpperCase()
    });
    localStorage.setItem(SCORE_KEY, JSON.stringify(rows.sort((a, b) => b.score - a.score).slice(0, 50)));
    this.onChange({ type: status, state: this.state });
  }

  addLog(text, tone) {
    this.state.log.unshift({ id: randomId(), text, tone, time: "" });
    this.state.log = this.state.log.slice(0, 12);
  }

  addEffect(x, y, type, life) {
    this.effects.push({ x, y, type, life, maxLife: life });
  }

  persist() {
    if (this.state.status === "active") RealtimeShooter.persistState(this.state);
  }

  draw() {
    const ctx = this.ctx;
    const width = this.viewWidth || 800;
    const height = this.viewHeight || 600;
    ctx.save();
    if (this.shake > 0 && !this.settings.reducedMotion) ctx.translate(random(-this.shake, this.shake), random(-this.shake, this.shake));
    this.drawWorld(ctx, width, height);
    ctx.restore();
    if (this.state.phase === "intermission" && this.state.status === "active") this.drawIntermission(ctx, width, height);
    this.drawCrosshair(ctx);
    if (this.reloadTimer > 0) this.drawReload(ctx, width, height);
  }

  drawWorld(ctx, width, height) {
    const camera = this.camera;
    const startX = camera.x;
    const startY = camera.y;
    ctx.fillStyle = "#292b27";
    ctx.fillRect(0, 0, width, height);
    ctx.save();
    ctx.translate(-startX, -startY);
    const left = Math.floor(startX / 80) * 80;
    const top = Math.floor(startY / 80) * 80;
    for (let x = left; x < startX + width + 80; x += 80) {
      for (let y = top; y < startY + height + 80; y += 80) {
        const index = Math.abs(Math.floor(x / 80) * 17 + Math.floor(y / 80) * 31) % 4;
        ctx.fillStyle = ["#292b27", "#2c2e29", "#292a26", "#2b2d28"][index];
        ctx.fillRect(x, y, 79, 79);
        if (index === 1) {
          ctx.strokeStyle = "rgba(166,160,137,.045)";
          ctx.lineWidth = 1;
          ctx.beginPath(); ctx.moveTo(x + 10, y + 46); ctx.lineTo(x + 26, y + 49); ctx.lineTo(x + 30, y + 59); ctx.stroke();
        }
      }
    }
    this.drawRoad(ctx);
    for (const obstacle of this.state.obstacles) this.drawObstacle(ctx, obstacle);
    this.drawLoot(ctx);
    this.drawEnemies(ctx);
    this.drawBullets(ctx);
    this.drawPlayer(ctx);
    this.drawEffects(ctx);
    ctx.restore();
    const vignette = ctx.createRadialGradient(width / 2, height / 2, Math.min(width, height) * 0.2, width / 2, height / 2, Math.max(width, height) * 0.72);
    vignette.addColorStop(0, "rgba(6,8,7,0)");
    vignette.addColorStop(1, "rgba(6,8,7,.55)");
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, width, height);
    this.drawRain(ctx, width, height);
  }

  drawRoad(ctx) {
    ctx.fillStyle = "#22231f";
    ctx.fillRect(0, 700, WORLD.width, 145);
    ctx.fillRect(1060, 0, 125, WORLD.height);
    ctx.strokeStyle = "rgba(191,166,120,.17)";
    ctx.lineWidth = 3;
    ctx.setLineDash([24, 28]);
    ctx.beginPath(); ctx.moveTo(0, 772); ctx.lineTo(WORLD.width, 772); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(1120, 0); ctx.lineTo(1120, WORLD.height); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = "rgba(194,81,55,.12)";
    ctx.fillRect(0, 706, WORLD.width, 3);
    ctx.fillRect(1066, 0, 3, WORLD.height);
  }

  drawObstacle(ctx, o) {
    ctx.save();
    if (o.kind === "building") {
      ctx.fillStyle = "#171a18";
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = "#222622";
      ctx.fillRect(o.x + 10, o.y + 10, o.w - 20, o.h - 20);
      ctx.strokeStyle = "rgba(202,182,140,.18)";
      ctx.strokeRect(o.x + 10, o.y + 10, o.w - 20, o.h - 20);
      for (let x = o.x + 28; x < o.x + o.w - 25; x += 48) {
        ctx.fillStyle = "rgba(179,129,80,.16)";
        ctx.fillRect(x, o.y + 27, 15, 19);
        ctx.fillRect(x, o.y + o.h - 44, 15, 19);
      }
      ctx.fillStyle = "#111312";
      ctx.fillRect(o.x + o.w * 0.45, o.y + o.h - 12, o.w * 0.17, 12);
      ctx.fillStyle = "rgba(210,192,152,.12)";
      ctx.fillRect(o.x, o.y, o.w, 4);
    } else {
      ctx.fillStyle = o.kind === "barrier" ? "#454238" : "#38403d";
      ctx.fillRect(o.x, o.y, o.w, o.h);
      ctx.fillStyle = "rgba(219,186,123,.18)";
      ctx.fillRect(o.x + 4, o.y + 4, o.w - 8, 5);
      ctx.strokeStyle = "rgba(8,10,9,.6)";
      for (let stripe = 0; stripe < o.w; stripe += 28) {
        ctx.beginPath(); ctx.moveTo(o.x + stripe, o.y + o.h); ctx.lineTo(o.x + stripe, o.y); ctx.stroke();
      }
      ctx.fillStyle = "#171918";
      ctx.fillRect(o.x + 8, o.y + o.h - 3, 8, 10);
      ctx.fillRect(o.x + o.w - 16, o.y + o.h - 3, 8, 10);
    }
    ctx.restore();
  }

  drawPlayer(ctx) {
    const p = this.state.player;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.fillStyle = "rgba(0,0,0,.4)";
    ctx.beginPath(); ctx.ellipse(0, 12, 20, 13, 0, 0, Math.PI * 2); ctx.fill();
    if (this.invulnerable > 0) {
      ctx.strokeStyle = `rgba(202,211,170,${0.3 + Math.sin(this.time * 30) * 0.16})`;
      ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 24, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.fillStyle = "#41443b";
    ctx.beginPath(); ctx.ellipse(0, 2, 13, 17, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#777560";
    ctx.fillRect(-8, -11, 16, 10);
    ctx.fillStyle = "#252824";
    ctx.beginPath(); ctx.arc(0, -13, 9, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#ab5541";
    ctx.fillRect(-6, -16, 12, 3);
    ctx.fillStyle = "#302f29";
    ctx.fillRect(7, -3, 21, 6);
    ctx.fillStyle = "#958873";
    ctx.fillRect(17, -2, 13, 4);
    ctx.fillStyle = "#171918";
    ctx.fillRect(22, -1, 12, 2);
    if (this.attackFlash > 0) {
      ctx.fillStyle = "rgba(255,194,112,.85)";
      ctx.beginPath(); ctx.moveTo(32, 0); ctx.lineTo(49, -8); ctx.lineTo(45, 0); ctx.lineTo(49, 8); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  drawEnemies(ctx) {
    for (const enemy of this.state.enemies) {
      const spec = FOES[enemy.type];
      const radius = spec.radius;
      ctx.save();
      ctx.translate(enemy.x, enemy.y);
      const angle = Math.atan2(this.state.player.y - enemy.y, this.state.player.x - enemy.x);
      ctx.rotate(angle);
      ctx.fillStyle = "rgba(0,0,0,.4)";
      ctx.beginPath(); ctx.ellipse(0, radius * 0.7, radius * 1.25, radius * 0.7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = enemy.flash > 0 ? "#e3b2a2" : spec.color;
      ctx.beginPath(); ctx.ellipse(0, 2, radius * 0.78, radius, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = enemy.type === "armored" || enemy.type === "brute" ? "#343a36" : "#505344";
      ctx.beginPath(); ctx.arc(1, -radius * 0.72, radius * 0.6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#c7654a";
      ctx.fillRect(4, -radius * 0.79, 3, 2);
      ctx.fillRect(9, -radius * 0.79, 3, 2);
      ctx.strokeStyle = "#272a24";
      ctx.lineWidth = Math.max(2, radius * 0.27);
      ctx.beginPath(); ctx.moveTo(-radius * 0.7, 0); ctx.lineTo(-radius * 1.2, radius * 0.7); ctx.moveTo(radius * 0.7, 0); ctx.lineTo(radius * 1.1, radius * 0.7); ctx.stroke();
      ctx.restore();
      const ratio = clamp(enemy.health / enemy.maxHealth, 0, 1);
      ctx.fillStyle = "rgba(6,8,7,.72)";
      ctx.fillRect(enemy.x - radius, enemy.y - radius - 12, radius * 2, 3);
      ctx.fillStyle = enemy.type === "brute" ? "#c65340" : "#9e7961";
      ctx.fillRect(enemy.x - radius, enemy.y - radius - 12, radius * 2 * ratio, 3);
      if (enemy.type === "brute" || enemy.type === "armored") {
        ctx.fillStyle = "rgba(222,216,201,.74)";
        ctx.font = "9px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(spec.name.toUpperCase(), enemy.x, enemy.y - radius - 17);
      }
    }
  }

  drawBullets(ctx) {
    for (const bullet of this.bullets) {
      ctx.strokeStyle = bullet.color;
      ctx.lineWidth = 2;
      ctx.globalAlpha = clamp(bullet.life * 3.5, 0.15, 0.95);
      ctx.beginPath(); ctx.moveTo(bullet.x, bullet.y); ctx.lineTo(bullet.x - bullet.vx * 0.025, bullet.y - bullet.vy * 0.025); ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  drawLoot(ctx) {
    for (const pickup of this.state.loot) {
      const color = pickup.type === "medkit" ? "#9dae7e" : pickup.type === "ammo" ? "#d2aa70" : "#b28b67";
      const pulse = 1 + Math.sin((pickup.pulse || 0) * 3) * 0.08;
      ctx.save(); ctx.translate(pickup.x, pickup.y); ctx.scale(pulse, pulse);
      ctx.fillStyle = `${color}22`;
      ctx.beginPath(); ctx.arc(0, 0, 19, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = color; ctx.fillRect(-7, -7, 14, 14);
      ctx.fillStyle = "#20221e";
      if (pickup.type === "medkit") { ctx.fillRect(-1.5, -5, 3, 10); ctx.fillRect(-5, -1.5, 10, 3); }
      else if (pickup.type === "ammo") { ctx.fillRect(-3, -5, 6, 10); }
      else { ctx.fillRect(-4, -3, 8, 6); }
      ctx.restore();
    }
  }

  drawEffects(ctx) {
    for (const effect of this.effects) {
      const progress = 1 - effect.life / effect.maxLife;
      ctx.globalAlpha = clamp(effect.life / effect.maxLife, 0, 1);
      if (effect.type === "blood" || effect.type === "death") {
        ctx.fillStyle = effect.type === "death" ? "#865241" : "#a34d3c";
        ctx.beginPath(); ctx.arc(effect.x, effect.y, 3 + progress * 9, 0, Math.PI * 2); ctx.fill();
      } else if (effect.type === "muzzle") {
        ctx.fillStyle = "#f4c17e";
        ctx.beginPath(); ctx.arc(effect.x, effect.y, 4 + progress * 8, 0, Math.PI * 2); ctx.fill();
      } else if (effect.type === "dodge") {
        ctx.strokeStyle = "#c6d1a0"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(effect.x, effect.y, 13 + progress * 34, 0, Math.PI * 2); ctx.stroke();
      } else {
        ctx.strokeStyle = "#e7c58c"; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(effect.x, effect.y, 3 + progress * 13, 0, Math.PI * 2); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  drawRain(ctx, width, height) {
    ctx.save();
    ctx.strokeStyle = "rgba(195,205,198,.12)";
    ctx.lineWidth = 1;
    const offset = (this.time * 220) % 60;
    for (let x = -50; x < width + 50; x += 43) {
      const y = ((x * 19 + offset * 3) % (height + 50)) - 25;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 19); ctx.stroke();
    }
    ctx.restore();
  }

  drawCrosshair(ctx) {
    if (!this.viewWidth) return;
    const x = this.mouse.x;
    const y = this.mouse.y;
    ctx.save();
    ctx.strokeStyle = this.hitMarker > 0 ? "#e4c18a" : "rgba(228,224,210,.88)";
    ctx.lineWidth = 1.3;
    if (this.hitMarker > 0) {
      ctx.beginPath(); ctx.moveTo(x - 9, y - 9); ctx.lineTo(x - 3, y - 3); ctx.moveTo(x + 9, y - 9); ctx.lineTo(x + 3, y - 3); ctx.moveTo(x - 9, y + 9); ctx.lineTo(x - 3, y + 3); ctx.moveTo(x + 9, y + 9); ctx.lineTo(x + 3, y + 3); ctx.stroke();
    } else {
      ctx.beginPath(); ctx.arc(x, y, 8, 0, Math.PI * 2); ctx.moveTo(x - 13, y); ctx.lineTo(x - 7, y); ctx.moveTo(x + 7, y); ctx.lineTo(x + 13, y); ctx.moveTo(x, y - 13); ctx.lineTo(x, y - 7); ctx.moveTo(x, y + 7); ctx.lineTo(x, y + 13); ctx.stroke();
    }
    ctx.restore();
  }

  drawIntermission(ctx, width, height) {
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, "rgba(10,12,11,.35)");
    gradient.addColorStop(1, "rgba(10,12,11,.76)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);
    ctx.fillStyle = "rgba(200,172,127,.88)";
    ctx.font = "700 11px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(this.state.night === 1 ? "DISTRICT 09  /  SAFEHOUSE" : `WAVE ${String(this.state.night - 1).padStart(2, "0")} COMPLETE`, width / 2, height / 2 - 70);
    ctx.fillStyle = "#e5e0d3";
    ctx.font = "800 46px Impact, sans-serif";
    ctx.fillText(this.state.night === 1 ? "HOLD THE LINE" : `WAVE ${String(this.state.night).padStart(2, "0")}`, width / 2, height / 2 - 20);
    ctx.fillStyle = "rgba(225,222,211,.8)";
    ctx.font = "14px sans-serif";
    ctx.fillText(this.state.night === 1 ? "Your first wave is moving in from the perimeter." : "Resupply, craft, then head back into the district.", width / 2, height / 2 + 9);
    ctx.fillStyle = "rgba(220,214,198,.65)";
    ctx.font = "11px sans-serif";
    ctx.fillText("DEPLOY WHEN READY  ·  PRESS ENTER", width / 2, height / 2 + 48);
  }

  drawReload(ctx, width, height) {
    const weapon = WEAPONS[this.state.player.weapon];
    ctx.fillStyle = "rgba(9,11,10,.74)";
    ctx.fillRect(width / 2 - 75, height - 59, 150, 25);
    ctx.fillStyle = "#ded7c6";
    ctx.font = "700 10px sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`RELOADING · ${weapon.name.toUpperCase()}`, width / 2, height - 43);
    ctx.fillStyle = "#a65342";
    ctx.fillRect(width / 2 - 75, height - 36, 150 * clamp(1 - this.reloadTimer / weapon.reload, 0, 1), 2);
  }
}

export { WEAPONS };
