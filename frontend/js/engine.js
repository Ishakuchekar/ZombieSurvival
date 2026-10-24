const SAVE_KEY = "last-stand.mock-save.v1";
const SCORES_KEY = "last-stand.mock-scores.v1";

const DIFFICULTIES = {
  recruit: { label: "Recruit", desc: "More room to breathe. A generous supply drop.", enemyScale: 0.82, damageScale: 0.78, reward: 0.9 },
  survivor: { label: "Survivor", desc: "The horde hits hard. Every round matters.", enemyScale: 1, damageScale: 1, reward: 1 },
  nightmare: { label: "Nightmare", desc: "No safety net. Higher stakes, greater rewards.", enemyScale: 1.2, damageScale: 1.35, reward: 1.35 }
};

const ENEMY_DATA = {
  walker: { name: "Shambler", health: 40, damage: 9, armor: 0, score: 100 },
  armored: { name: "Bulwark", health: 68, damage: 13, armor: 0.42, score: 160 },
  boss: { name: "The Warden", health: 132, damage: 18, armor: 0.2, score: 400 }
};

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
const makeId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export class MockGameEngine {
  hasSave() {
    try {
      const saved = JSON.parse(localStorage.getItem(SAVE_KEY));
      return Boolean(this.validState(saved) && saved.status === "active");
    } catch {
      return false;
    }
  }

  load() {
    try {
      const state = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (state && this.validState(state)) return state;
      this.clearSave();
    } catch {
      this.clearSave();
    }
    return null;
  }

  save(state) {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  }

  clearSave() {
    localStorage.removeItem(SAVE_KEY);
  }

  leaderboard() {
    try {
      const scores = JSON.parse(localStorage.getItem(SCORES_KEY));
      return Array.isArray(scores) ? scores.filter(this.validScore).sort((a, b) => b.score - a.score).slice(0, 10) : [];
    } catch {
      return [];
    }
  }

  start(name, difficulty) {
    const config = DIFFICULTIES[difficulty];
    if (!config) throw new Error("Choose a valid difficulty.");
    const cleanName = String(name).trim().slice(0, 24);
    if (!cleanName) throw new Error("Enter a survivor name to begin.");
    const state = {
      version: 1,
      status: "active",
      phase: "daylight",
      player: { name: cleanName, health: 100, maxHealth: 100, ammo: 12, reserve: 24, stamina: 100, scrap: 0, score: 0, kills: 0, medkits: 2, ammoPacks: 1, dodges: 0, damageTaken: 0 },
      difficulty,
      night: 1,
      enemies: [],
      turn: 0,
      log: [{ id: makeId(), text: `You made it to the safehouse, ${cleanName}. The radio says extraction arrives in three nights.`, tone: "story" }],
      lastReward: null
    };
    this.save(state);
    return state;
  }

  beginNight(state) {
    this.ensureActive(state);
    if (state.phase !== "daylight") throw new Error("The night has already begun.");
    const night = state.night;
    const count = 2 + night;
    const diff = DIFFICULTIES[state.difficulty];
    state.enemies = [];
    for (let i = 0; i < count; i += 1) {
      let type = "walker";
      if (night === 3 && i === count - 1) type = "boss";
      else if (night > 1 && Math.random() < 0.2 + night * 0.08) type = "armored";
      const template = ENEMY_DATA[type];
      const maxHealth = Math.round(template.health * (1 + (night - 1) * 0.23) * diff.enemyScale);
      state.enemies.push({ id: makeId(), type, name: template.name, health: maxHealth, maxHealth, damage: Math.round(template.damage * (1 + (night - 1) * 0.16) * diff.damageScale), armor: template.armor });
    }
    state.phase = "combat";
    this.addLog(state, `NIGHT ${night}. ${count} infected on approach. Hold the line.`, "danger");
    this.save(state);
    return state;
  }

  act(state, action, enemyId) {
    this.ensureActive(state);
    if (state.phase !== "combat") throw new Error("Combat actions are only available during the night.");
    const player = state.player;
    let combatTurn = true;

    switch (action) {
      case "shoot": {
        const target = this.target(state, enemyId);
        if (player.ammo < 1) throw new Error("Empty chamber. Reload before shooting.");
        player.ammo -= 1;
        const hit = 21 + Math.floor(Math.random() * 12);
        const damage = Math.max(1, Math.round(hit * (1 - target.armor)));
        target.health = Math.max(0, target.health - damage);
        this.addLog(state, `Shot fired — ${damage} damage to ${target.name}${target.armor ? " (armor absorbed some impact)" : ""}.`, "action");
        if (target.health === 0) this.defeat(state, target);
        break;
      }
      case "heavy": {
        const target = this.target(state, enemyId);
        const damage = 17 + Math.floor(Math.random() * 8);
        target.health = Math.max(0, target.health - Math.max(1, Math.round(damage * (1 - target.armor))));
        this.addLog(state, `Heavy strike lands on ${target.name}.`, "action");
        if (target.health === 0) this.defeat(state, target);
        break;
      }
      case "reload": {
        if (player.ammo >= 12) throw new Error("Your magazine is already full.");
        if (player.reserve < 1) throw new Error("No reserve ammunition remains.");
        const loaded = Math.min(12 - player.ammo, player.reserve);
        player.ammo += loaded;
        player.reserve -= loaded;
        this.addLog(state, `Reloaded ${loaded} rounds from reserve.`, "success");
        break;
      }
      case "dodge": {
        if (player.stamina < 30) throw new Error("Not enough stamina to dodge. Rest by taking another action.");
        player.stamina -= 30;
        player.dodges += 1;
        state.dodgeReady = true;
        this.addLog(state, "You roll clear of the horde. Incoming damage is reduced.", "success");
        break;
      }
      case "heal":
        if (player.medkits < 1) throw new Error("No medkits in your pack.");
        if (player.health >= player.maxHealth) throw new Error("You are already at full health.");
        player.medkits -= 1;
        player.health = Math.min(player.maxHealth, player.health + 38);
        this.addLog(state, "Medkit used. Wounds patched; keep moving.", "success");
        break;
      case "rest":
        player.stamina = Math.min(100, player.stamina + 32);
        this.addLog(state, "You steady your breathing and recover stamina.", "success");
        break;
      default:
        combatTurn = false;
        throw new Error("That action is not available.");
    }

    if (combatTurn && state.enemies.some((enemy) => enemy.health > 0)) this.enemyTurn(state);
    player.stamina = Math.min(100, player.stamina + 10);
    state.turn += 1;
    this.resolvePhase(state);
    this.save(state);
    return state;
  }

  useAmmoPack(state) {
    this.ensureActive(state);
    if (state.player.ammoPacks < 1) throw new Error("No ammunition packs available.");
    state.player.ammoPacks -= 1;
    state.player.reserve += 12;
    this.addLog(state, "Ammunition pack added to reserve (+12 rounds).", "success");
    this.save(state);
    return state;
  }

  craft(state, recipe) {
    this.ensureActive(state);
    const recipes = { medkit: { cost: 4, label: "Medkit", apply: () => { state.player.medkits += 1; } }, ammo: { cost: 3, label: "Ammo pack", apply: () => { state.player.ammoPacks += 1; } } };
    const selected = recipes[recipe];
    if (!selected) throw new Error("Choose a valid crafting recipe.");
    if (state.player.scrap < selected.cost) throw new Error(`Not enough scrap. ${selected.cost} required.`);
    state.player.scrap -= selected.cost;
    selected.apply();
    this.addLog(state, `Crafted ${selected.label}.`, "success");
    this.save(state);
    return state;
  }

  rest(state) {
    this.ensureActive(state);
    if (state.phase !== "daylight") throw new Error("Rest is available at the safehouse.");
    const before = state.player.health;
    state.player.health = Math.min(state.player.maxHealth, before + 24);
    this.addLog(state, `Safehouse rest: +${state.player.health - before} health.`, "success");
    this.save(state);
    return state;
  }

  advance(state) {
    this.ensureActive(state);
    if (state.phase !== "daylight") throw new Error("Clear the current horde before advancing.");
    if (state.night >= 3) throw new Error("There are no further nights.");
    state.night += 1;
    state.lastReward = null;
    this.addLog(state, `Daylight breaks. Night ${state.night} is approaching.`, "story");
    this.save(state);
    return state;
  }

  resume(state) {
    if (!this.validState(state) || state.status !== "active") throw new Error("This save is not playable.");
    return state;
  }

  abandon(state) {
    if (state?.status === "active" && state.player?.name) {
      this.finish(state, "defeat", "Run abandoned");
    }
    this.clearSave();
  }

  validState(state) {
    const player = state?.player;
    return state?.version === 1 && ["active", "victory", "defeat"].includes(state.status) &&
      player && typeof player.name === "string" && player.name.trim().length > 0 && player.name.length <= 24 &&
      Number.isInteger(state.night) && state.night >= 1 && state.night <= 3 &&
      ["daylight", "combat"].includes(state.phase) &&
      Object.hasOwn(DIFFICULTIES, state.difficulty) &&
      Number.isInteger(player.maxHealth) && player.maxHealth >= 1 && player.maxHealth <= 500 &&
      Number.isFinite(player.health) && player.health >= 0 && player.health <= player.maxHealth &&
      Number.isFinite(player.ammo) && player.ammo >= 0 && player.ammo <= 12 &&
      Number.isFinite(player.reserve) && player.reserve >= 0 && player.reserve <= 300 &&
      Number.isFinite(player.stamina) && player.stamina >= 0 && player.stamina <= 100 &&
      ["scrap", "score", "kills", "medkits", "ammoPacks", "dodges", "damageTaken"]
        .every((key) => Number.isFinite(player[key]) && player[key] >= 0) &&
      Number.isInteger(player.medkits) && player.medkits <= 100 &&
      Number.isInteger(player.ammoPacks) && player.ammoPacks <= 100 &&
      Array.isArray(state.enemies) && state.enemies.length <= 8 &&
      (state.phase !== "combat" || state.enemies.some((enemy) => enemy.health > 0)) &&
      (state.phase !== "daylight" || state.enemies.length === 0) &&
      state.enemies.every((enemy) => ["walker", "armored", "boss"].includes(enemy.type) &&
        Number.isFinite(enemy.health) && enemy.health >= 0 &&
        Number.isFinite(enemy.maxHealth) && enemy.maxHealth > 0 && enemy.health <= enemy.maxHealth &&
        Number.isFinite(enemy.damage) && enemy.damage >= 0 &&
        Number.isFinite(enemy.armor) && enemy.armor >= 0 && enemy.armor < 1);
  }

  validScore(entry) {
    return entry && typeof entry.name === "string" && entry.name.length <= 24 &&
      Number.isFinite(entry.score) && entry.score >= 0 &&
      Number.isFinite(entry.kills) && entry.kills >= 0 &&
      Number.isFinite(entry.nights) && entry.nights >= 0 && entry.nights <= 3;
  }

  ensureActive(state) {
    if (!this.validState(state) || state.status !== "active") {
      throw new Error("There is no valid active run for that action.");
    }
  }

  target(state, enemyId) {
    const enemy = state.enemies.find((candidate) => candidate.id === enemyId && candidate.health > 0);
    if (!enemy) throw new Error("That target is no longer in the fight.");
    return enemy;
  }

  enemyTurn(state) {
    const player = state.player;
    const evasive = Boolean(state.dodgeReady);
    state.dodgeReady = false;
    for (const enemy of state.enemies) {
      if (enemy.health <= 0) continue;
      const damage = Math.max(1, Math.round(enemy.damage * (evasive ? 0.35 : 1)));
      player.health = Math.max(0, player.health - damage);
      player.damageTaken += damage;
      this.addLog(state, `${enemy.name} strikes for ${damage} damage${evasive ? " — you evade most of it." : "."}`, player.health < 30 ? "danger" : "enemy");
      if (player.health === 0) break;
    }
  }

  defeat(state, enemy) {
    const data = ENEMY_DATA[enemy.type];
    const difficulty = DIFFICULTIES[state.difficulty];
    state.player.kills += 1;
    state.player.score += Math.round(data.score * difficulty.reward);
    const scrap = enemy.type === "boss" ? 4 : enemy.type === "armored" ? 2 : 1;
    state.player.scrap += scrap;
    this.addLog(state, `${enemy.name} eliminated. +${Math.round(data.score * difficulty.reward)} score · +${scrap} scrap.`, "success");
    if (Math.random() < (state.difficulty === "recruit" ? 0.48 : 0.34)) {
      state.player.medkits += 1;
      this.addLog(state, "Scavenged a medkit from the fallen.", "loot");
    }
  }

  resolvePhase(state) {
    if (state.player.health <= 0) {
      this.finish(state, "defeat", "The barricade fell");
      return;
    }
    if (!state.enemies.some((enemy) => enemy.health > 0)) {
      state.enemies = [];
      state.phase = "daylight";
      state.lastReward = state.night === 3 ? "Extraction is in sight." : "The horde is down. Scavenge and prepare.";
      state.player.reserve += 6;
      state.player.scrap += state.night;
      this.addLog(state, `Night ${state.night} cleared. +6 reserve rounds, +${state.night} salvage.`, "story");
      if (state.night === 3) this.finish(state, "victory", "Evacuation reached");
    }
  }

  finish(state, status, message) {
    if (state.status !== "active") return;
    state.status = status;
    if (status === "victory") state.player.score += 500;
    this.addLog(state, message, status === "victory" ? "success" : "danger");
    this.clearSave();
    const scores = this.leaderboard();
    scores.push({ name: state.player.name, score: state.player.score, kills: state.player.kills, nights: status === "victory" ? 3 : Math.max(0, state.night - 1), difficulty: DIFFICULTIES[state.difficulty].label });
    localStorage.setItem(SCORES_KEY, JSON.stringify(scores.sort((a, b) => b.score - a.score).slice(0, 50)));
  }

  addLog(state, text, tone = "neutral") {
    state.log.unshift({ id: makeId(), text, tone, time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) });
    state.log = state.log.slice(0, 35);
  }
}

export { DIFFICULTIES };
