import { GameAdapter } from "./api.js";
import { DIFFICULTIES } from "./engine.js";
import { RealtimeShooter, WEAPONS } from "./shooter.js";
import { GameUI } from "./ui.js";

const SETTINGS_KEY = "last-stand.settings.v1";
const app = document.querySelector("#app");
const toastRegion = document.querySelector("#toast-region");
const adapter = new GameAdapter();
const ui = new GameUI(app);

let screen = "home";
let state = null;
let shooter = null;
let difficulty = "survivor";
let returnToGame = false;
let toastTimer;
let settings = loadSettings();

function loadSettings() {
  try {
    const value = JSON.parse(localStorage.getItem(SETTINGS_KEY));
    const scale = Number(value?.scale);
    return { reducedMotion: Boolean(value?.reducedMotion), scale: Number.isFinite(scale) ? Math.min(1.15, Math.max(0.85, scale)) : 1 };
  } catch {
    return { reducedMotion: false, scale: 1 };
  }
}

function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  document.documentElement.classList.toggle("reduced-motion", settings.reducedMotion);
  ui.scale = settings.scale;
  if (shooter) shooter.settings = settings;
}

function hasSave() {
  return RealtimeShooter.hasSave();
}

function scores() {
  return RealtimeShooter.leaderboard();
}

function disposeShooter() {
  if (shooter) {
    shooter.destroy();
    shooter = null;
  }
}

function render() {
  ui.render(screen, state, {
    hasSave: hasSave(),
    difficulty,
    entries: scores(),
    settings,
    returnGame: returnToGame,
    weapons: WEAPONS
  });
  if (screen === "setup") updateDifficultyNote();
  if (screen === "shooter" && state?.status === "active") {
    const canvas = app.querySelector(".action-canvas");
    if (canvas && (!shooter || shooter.canvas !== canvas)) {
      disposeShooter();
      shooter = new RealtimeShooter(canvas, state, onShooterEvent, settings);
    }
    if (ui.overlay && shooter) {
      shooter.setPaused(true);
      ui.setOverlay(ui.overlay, state);
    }
  }
}

function updateDifficultyNote() {
  const note = app.querySelector("[data-difficulty-note]");
  const selected = app.querySelector('input[name="difficulty"]:checked');
  if (note && selected) note.textContent = DIFFICULTIES[selected.value]?.desc || "";
}

function showToast(message, type = "info") {
  clearTimeout(toastTimer);
  toastRegion.textContent = "";
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  const dot = document.createElement("i");
  const text = document.createElement("span");
  text.textContent = message;
  toast.append(dot, text);
  toastRegion.append(toast);
  toastTimer = setTimeout(() => { toastRegion.textContent = ""; }, 2700);
}

function onShooterEvent(event) {
  if (!event || screen !== "shooter") return;
  if (event.type === "tick") {
    ui.updateShooter(event.state, { weapons: WEAPONS });
    return;
  }
  if (event.type === "message") {
    showToast(event.message, "info");
    return;
  }
  if (ui.overlay === "inventory" && ["heal", "ammo", "craft", "unlock", "weapon"].includes(event.type)) {
    ui.setOverlay("inventory", state);
  }
  if (event.type === "pause" || event.type === "inventory") {
    openOverlay(event.type);
    return;
  }
  if (event.type === "defeat" || event.type === "victory") {
    state = event.state;
    disposeShooter();
    screen = "results";
    ui.overlay = null;
    render();
    return;
  }
  if (event.type === "damage") {
    app.querySelector(".shooter-status")?.classList.remove("shooter-damaged");
    requestAnimationFrame(() => app.querySelector(".shooter-status")?.classList.add("shooter-damaged"));
  }
  if (event.type === "wave-clear") showToast(event.state?.message || "Wave cleared. Resupply before the next push.", "success");
  if (event.type === "pickup") showToast("Supply recovered.", "success");
  if (event.type === "craft" || event.type === "unlock" || event.type === "heal" || event.type === "ammo") showToast("Field kit updated.", "success");
}

function openOverlay(kind) {
  if (!state || screen !== "shooter") return;
  ui.overlay = kind;
  shooter?.setPaused(true);
  ui.setOverlay(kind, state);
}

function closeOverlay() {
  ui.overlay = null;
  app.querySelector(".overlay-backdrop")?.remove();
  if (screen === "shooter") shooter?.setPaused(false);
}

function startNewRun(name, selectedDifficulty) {
  disposeShooter();
  state = RealtimeShooter.start(name, selectedDifficulty);
  difficulty = selectedDifficulty;
  screen = "shooter";
  ui.overlay = null;
  render();
  app.querySelector(".action-canvas")?.focus();
}

async function confirmAction(title, copy, actionText) {
  const dialog = document.querySelector("#confirm-dialog");
  dialog.querySelector("#confirm-title").textContent = title;
  dialog.querySelector("#confirm-copy").textContent = copy;
  dialog.querySelector('[value="confirm"]').textContent = actionText;
  dialog.showModal();
  return new Promise((resolve) => {
    dialog.addEventListener("close", () => resolve(dialog.returnValue === "confirm"), { once: true });
  });
}

function goHome() {
  if (state?.status === "active") RealtimeShooter.persistState(state);
  disposeShooter();
  state = null;
  ui.overlay = null;
  returnToGame = false;
  screen = "home";
  render();
}

function resumeRun() {
  const saved = RealtimeShooter.load();
  if (saved) {
    disposeShooter();
    state = saved;
    difficulty = saved.difficulty;
    ui.overlay = null;
    screen = "shooter";
    render();
    app.querySelector(".action-canvas")?.focus();
    showToast("Safehouse position restored.", "success");
    return;
  }
  const legacy = adapter.load();
  if (legacy) {
    adapter.clearSave();
    showToast("An older turn-based save cannot resume in the new real-time mode.", "danger");
  } else {
    showToast("No valid save was found on this device.", "danger");
  }
}

app.addEventListener("submit", async (event) => {
  if (!event.target.matches('[data-form="start"]')) return;
  event.preventDefault();
  const formData = new FormData(event.target);
  const name = String(formData.get("name") || "").trim();
  const selectedDifficulty = String(formData.get("difficulty") || "survivor");
  if (!name) {
    showToast("Enter a survivor callsign first.", "danger");
    event.target.querySelector('[name="name"]').focus();
    return;
  }
  if (hasSave() && !(await confirmAction("Replace your current run?", "Starting a new run permanently replaces the saved safehouse position.", "REPLACE SAVE"))) return;
  try {
    adapter.clearSave();
    startNewRun(name, selectedDifficulty);
    showToast("Safehouse secured. Move with WASD and aim with the mouse.", "success");
  } catch (error) { showToast(error.message, "danger"); }
});

app.addEventListener("change", (event) => {
  if (event.target.matches('input[name="difficulty"]')) {
    difficulty = event.target.value;
    app.querySelectorAll(".difficulty-card").forEach((card) => card.classList.toggle("selected", card.contains(event.target)));
    updateDifficultyNote();
  }
  if (event.target.matches("[data-setting]")) {
    const key = event.target.dataset.setting;
    settings[key] = key === "scale" ? Number(event.target.value) : event.target.checked;
    saveSettings();
    if (screen === "settings") render();
    showToast("Field settings updated.", "success");
  }
});

app.addEventListener("click", async (event) => {
  const button = event.target.closest("[data-action]");
  if (!button || button.disabled) return;
  const action = button.dataset.action;

  if (screen === "shooter" && shooter) {
    if (action === "begin-wave") shooter.beginWave();
    else if (action === "fire-once") {
      if (shooter.state.phase === "combat" && shooter.fireTimer <= 0) shooter.fire();
    } else if (action === "reload") shooter.reload();
    else if (action === "heal") shooter.useMedkit();
    else if (action === "use-ammo") shooter.useAmmoPack();
    else if (action === "craft-medkit" || action === "craft-ammo") {
      const cost = action === "craft-medkit" ? 5 : 3;
      if (!(await confirmAction("Spend field salvage?", `This crafting recipe consumes ${cost} salvage.`, "CRAFT"))) return;
      shooter.craft(action === "craft-medkit" ? "medkit" : "ammo");
      ui.setOverlay("inventory", state);
    } else if (action === "unlock-rifle" || action === "unlock-shotgun") {
      const cost = action === "unlock-rifle" ? 10 : 14;
      if (!(await confirmAction("Unlock this weapon?", `This weapon costs ${cost} salvage.`, "UNLOCK WEAPON"))) return;
      shooter.unlock(action === "unlock-rifle" ? "rifle" : "shotgun");
      ui.setOverlay("inventory", state);
    } else if (action === "switch-pistol") shooter.switchWeapon("pistol");
    else if (action === "switch-rifle") shooter.switchWeapon("rifle");
    else if (action === "switch-shotgun") shooter.switchWeapon("shotgun");
    else if (action === "inventory") openOverlay("inventory");
    else if (action === "missions") openOverlay("missions");
    else if (action === "pause") openOverlay("pause");
    else if (action === "resume" || action === "close-overlay") closeOverlay();
    else if (action === "save-exit" || action === "home") {
      if (action === "save-exit") showToast("Position saved locally.", "success");
      closeOverlay();
      goHome();
    } else if (action === "abandon") {
      if (await confirmAction("Abandon this run?", "This run is recorded as lost and its save is removed.", "ABANDON RUN")) {
        state.status = "defeat";
        state.player.health = 0;
        shooter.finish("defeat");
      }
    } else if (action === "settings") {
      returnToGame = true;
      closeOverlay();
      disposeShooter();
      screen = "settings";
      render();
    }
    return;
  }

  if (action === "new-game") {
    difficulty = "survivor";
    screen = "setup";
    ui.overlay = null;
    render();
    app.querySelector("#survivor-name")?.focus();
  } else if (action === "continue") resumeRun();
  else if (action === "home") goHome();
  else if (action === "leaderboard") {
    ui.overlay = null;
    screen = "leaderboard";
    render();
  } else if (action === "settings") {
    returnToGame = false;
    screen = "settings";
    render();
  } else if (action === "missions") {
    screen = "missions";
    render();
  } else if (action === "replay") {
    difficulty = "survivor";
    screen = "setup";
    render();
    app.querySelector("#survivor-name")?.focus();
  } else if (action === "return-game") {
    returnToGame = false;
    screen = "shooter";
    ui.overlay = null;
    render();
    app.querySelector(".action-canvas")?.focus();
  } else if (action === "clear-data") {
    if (!(await confirmAction("Clear browser data?", "This removes this browser's saved run, leaderboard, and settings.", "CLEAR DATA"))) return;
    RealtimeShooter.clearSave();
    adapter.clearSave();
    localStorage.removeItem("last-stand.action-scores.v1");
    localStorage.removeItem("last-stand.mock-scores.v1");
    localStorage.removeItem(SETTINGS_KEY);
    settings = loadSettings();
    goHome();
    showToast("Local prototype data cleared.", "success");
  }
});

app.addEventListener("close-overlay", closeOverlay);

document.addEventListener("keydown", (event) => {
  if (screen === "shooter" && state?.status === "active") {
    if (event.key === "Escape") {
      if (ui.overlay) closeOverlay();
      else openOverlay("pause");
      event.preventDefault();
    } else if (event.key === "Enter" && state.phase === "intermission" && !ui.overlay) {
      shooter?.beginWave();
      event.preventDefault();
    }
  }
  if (event.key === "Escape" && screen === "game") {
    if (ui.overlay) closeOverlay();
    else openOverlay("pause");
  }
});

saveSettings();
screen = "home";
render();
