const icon = (name, size = 20) => {
  const shared = `width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"`;
  const paths = {
    cross: '<path d="M10 3H6a2 2 0 0 0-2 2v4h6v6h4v-6h6V5a2 2 0 0 0-2-2h-4v6h-4z"/><path d="M4 15v4a2 2 0 0 0 2 2h4v-6"/><path d="M14 15v6h4a2 2 0 0 0 2-2v-4"/>',
    bullet: '<path d="M12 22s7-4.4 7-11V5l-7-3-7 3v6c0 6.6 7 11 7 11z"/><path d="M12 8v8"/><path d="M9 12h6"/>',
    scrap: '<path d="m12 3 8 4.5v9L12 21l-8-4.5v-9z"/><path d="m4.3 7.6 7.7 4.5 7.7-4.5"/><path d="M12 21v-9"/>',
    target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
    reload: '<path d="M20 7v5h-5"/><path d="M4 17v-5h5"/><path d="M5.6 9a7 7 0 0 1 11.5-2.6L20 12"/><path d="M4 12l2.9 5.6A7 7 0 0 0 18.4 15"/>',
    dodge: '<path d="m3 16 6-6 4 4 8-8"/><path d="M15 6h6v6"/>',
    pause: '<path d="M8 5v14M16 5v14"/>',
    bag: '<path d="M5 8h14l1 13H4z"/><path d="M9 8V5a3 3 0 0 1 6 0v3"/><path d="M9 13h6"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.6a8 8 0 0 1-1.6.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.6-.9l-1.7.6-1.4-2.4 1.4-1.1a8 8 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.6a8 8 0 0 1 1.6-.9l.3-1.8h2.8l.3 1.8a8 8 0 0 1 1.6.9l1.7-.6 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 1.7z" transform="translate(-1 -1)"/>',
    arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    radio: '<path d="M5 5h14a2 2 0 0 1 2 2v12H3V7a2 2 0 0 1 2-2z"/><path d="M7 5 18 2"/><circle cx="8" cy="12" r="2"/><path d="M14 11h4M14 15h4"/>',
    skull: '<circle cx="12" cy="11" r="8"/><path d="M8 18v3h8v-3"/><path d="M9 10h.01M15 10h.01"/><path d="M9 14h6"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    close: '<path d="m18 6-12 12M6 6l12 12"/>',
    lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 1 1 8 0v3"/>'
  };
  return `<svg ${shared}>${paths[name] || paths.target}</svg>`;
};

const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

export class GameUI {
  constructor(root) {
    this.root = root;
    this.overlay = null;
    this.scale = 1;
  }

  render(screen, state, options = {}) {
    if (screen === "home") this.root.innerHTML = this.home(options);
    else if (screen === "setup") this.root.innerHTML = this.setup(options);
    else if (screen === "game") this.root.innerHTML = this.game(state, options);
    else if (screen === "shooter") this.root.innerHTML = this.shooter(state, options);
    else if (screen === "missions") this.root.innerHTML = this.missions();
    else if (screen === "leaderboard") this.root.innerHTML = this.leaderboard(options);
    else if (screen === "settings") this.root.innerHTML = this.settings(options);
    else if (screen === "results") this.root.innerHTML = this.results(state, options);
    else this.root.innerHTML = this.home(options);
    this.root.style.setProperty("--ui-scale", String(this.scale));
  }

  home({ hasSave = false } = {}) {
    return `<section class="title-screen screen-enter">
      <div class="title-top"><a class="wordmark" href="#" data-action="home" aria-label="Last Stand home"><span class="wordmark-mark">${icon("target", 18)}</span> NIGHTFALL<span class="wordmark-divider">/</span>STUDIOS</a><span class="top-edition">FIELD EDITION <i></i> BUILD 01.07</span></div>
      <div class="city-art" aria-hidden="true"><div class="moon"></div><div class="city-skyline skyline-back">${this.skyline(14)}</div><div class="city-skyline skyline-front">${this.skyline(11)}</div><div class="street"></div><div class="street-glow"></div><div class="silhouette"><i></i></div><div class="silhouette silhouette-two"><i></i></div></div>
      <div class="rain-layer" aria-hidden="true"></div><div class="home-vignette"></div>
      <div class="title-content"><p class="eyebrow"><span class="live-dot"></span> TRANSMISSION RECEIVED · 02:14 AM</p><h1>ZOMBIE SURVIVAL<span>LAST STAND</span></h1><p class="title-deck">The city fell. Your watch starts now.</p>
      <nav class="menu-actions" aria-label="Main menu">
        <button class="menu-primary" data-action="new-game"><span class="menu-index">01</span><span>New game</span>${icon("arrow", 19)}</button>
        <button class="menu-link" data-action="continue" ${hasSave ? "" : "disabled"}><span class="menu-index">02</span><span>Continue ${hasSave ? '<small class="save-indicator"><i></i> SAFEHOUSE SAVE FOUND</small>' : '<small class="menu-hint">NO ACTIVE RUN</small>'}</span>${icon("arrow", 17)}</button>
        <button class="menu-link" data-action="missions"><span class="menu-index">03</span><span>Mission briefing</span>${icon("arrow", 17)}</button>
        <button class="menu-link" data-action="leaderboard"><span class="menu-index">04</span><span>Hall of survivors</span>${icon("arrow", 17)}</button>
      </nav>
      </div>
      <div class="title-footer"><span>UNOFFICIAL FIELD NOTES <b>·</b> FIVE WAVES TO EXTRACTION</span><button class="footer-setting" data-action="settings">${icon("settings", 15)} SETTINGS</button><span class="footer-status"><i></i> LOCAL PROTOTYPE · OFFLINE</span></div>
      <span class="title-coordinate">38° 53' 51.6" N<br>77° 02' 11.3" W</span>
    </section>`;
  }

  skyline(count) {
    return Array.from({ length: count }, (_, index) => {
      const height = [46, 70, 55, 82, 39, 66, 92, 52, 73, 43, 84, 59, 76, 48][index % 14];
      const width = [38, 48, 30, 56, 42, 34, 60][index % 7];
      const windows = Array.from({ length: 6 }, (_, n) => `<i style="--w:${(n % 3) * 14 + 7}px;--y:${(n * 17) % 53}px"></i>`).join("");
      return `<span class="building" style="--building-height:${height}%;--building-width:${width}px">${windows}</span>`;
    }).join("");
  }

  setup({ difficulty = "survivor" } = {}) {
    return `<section class="setup-screen screen-enter"><header class="subpage-header"><button class="wordmark" data-action="home"><span class="wordmark-mark">${icon("target", 18)}</span> NIGHTFALL<span class="wordmark-divider">/</span>STUDIOS</button><button class="button button-quiet" data-action="home">${icon("close", 16)} BACK TO TITLE</button></header>
    <div class="setup-layout"><div class="setup-copy"><p class="eyebrow">BEFORE THE LIGHTS GO OUT</p><h1>WHO ARE<br>WE <em>LOSING?</em></h1><p class="muted">Five waves until extraction. No backup. No second chances.</p>
      <div class="briefing-card"><span class="briefing-icon">${icon("radio", 19)}</span><div><strong>LAST TRANSMISSION</strong><p>“Evac chopper arrives at dawn, day four. Keep the east barricade standing. If you can hear this — you’re the last one.”</p><small>— COMMAND, DISTRICT 09</small></div></div>
      <div class="night-mini">${[1, 2, 3, 4, 5].map((night) => `<div><span>0${night}</span><i></i><small>${["CONTACT", "BREACH", "RUNNERS", "ARMORED", "BRUTE"][night - 1]}</small></div>`).join("")}</div></div>
      <form class="setup-form" data-form="start"><p class="eyebrow">SURVIVOR DOSSIER <span>01 / 01</span></p><label for="survivor-name">CALLSIGN</label><input id="survivor-name" name="name" maxlength="24" placeholder="Enter your name" autocomplete="given-name" required>
      <label class="difficulty-label">THREAT LEVEL</label><div class="difficulty-grid">${Object.entries({ recruit: ["RECRUIT", "Room to breathe.", "LOW RISK"], survivor: ["SURVIVOR", "Every round counts.", "STANDARD"], nightmare: ["NIGHTMARE", "No safety net.", "HIGH RISK"] }).map(([key, values]) => `<label class="difficulty-card ${difficulty === key ? "selected" : ""}"><input type="radio" name="difficulty" value="${key}" ${difficulty === key ? "checked" : ""}><span>${values[0]}</span><small>${values[1]}</small><i>${values[2]}</i></label>`).join("")}</div>
      <p class="difficulty-note" data-difficulty-note></p><button class="button button-primary button-wide" type="submit">BEGIN YOUR WATCH ${icon("arrow", 18)}</button><p class="form-footnote">${icon("lock", 13)} SAVE DATA STAYS ON THIS DEVICE</p></form>
    </div><div class="screen-corner">DISTRICT 09 <b>·</b> EAST SAFEHOUSE</div></section>`;
  }

  game(state, options) {
    const { player, enemies } = state;
    const combat = state.phase === "combat" && state.status === "active";
    const selected = options.selectedEnemy || (enemies.find((enemy) => enemy.health > 0)?.id);
    const alive = enemies.filter((enemy) => enemy.health > 0);
    const hp = Math.round(player.health / player.maxHealth * 100);
    const stamina = Math.round(player.stamina / 100 * 100);
    return `<section class="game-screen screen-enter ${combat ? "combat-active" : "daylight-active"}">
      <header class="game-header"><button class="wordmark" data-action="home"><span class="wordmark-mark">${icon("target", 18)}</span> NIGHTFALL<span class="wordmark-divider">/</span>STUDIOS</button><div class="header-mission"><span class="live-dot ${combat ? "danger-dot" : ""}"></span><span>${combat ? "LIVE ENGAGEMENT" : "SAFEHOUSE · DAYLIGHT"}</span><i></i><b>NIGHT 0${state.night} / 03</b></div><div class="header-right"><span class="difficulty-chip">${state.difficulty.toUpperCase()}</span><button class="icon-button" aria-label="Mission briefing" title="Mission briefing" data-action="missions">${icon("radio", 18)}</button><button class="icon-button" aria-label="Settings" title="Settings" data-action="settings">${icon("settings", 18)}</button><button class="icon-button pause-button" aria-label="Pause" title="Pause (Escape)" data-action="pause">${icon("pause", 17)}</button></div></header>
      <div class="game-body"><section class="battlefield" aria-label="Battlefield">
        ${this.battleArt(state, selected)}
        <div class="battlefield-top"><div class="objective-tag">${icon("target", 15)} <span>${combat ? "OBJECTIVE: HOLD THE LINE" : state.status === "active" ? "OBJECTIVE: PREPARE FOR NIGHT" : "MISSION COMPLETE"}</span></div><span class="wave-tag">WAVE ${combat ? "01" : "—"} <i>/</i> 01</span></div>
        <div class="battle-alert ${combat ? "" : "hidden"}"><span class="alert-pulse"></span> ${alive.length} HOSTILE${alive.length === 1 ? "" : "S"} REMAINING</div>
        ${combat ? `<div class="enemy-field">${alive.map((enemy, index) => this.enemyFigure(enemy, index, selected)).join("")}</div>` : `<div class="daylight-card"><span class="daylight-mark">${icon("radio", 23)}</span><p class="eyebrow">${state.status !== "active" ? "MISSION SECURED" : state.night === 1 && state.log.length < 2 ? "SAFEHOUSE · DISTRICT 09" : `DAWN AFTER NIGHT 0${Math.max(1, state.night - 1)}`}</p><h2>${state.status !== "active" ? "The night is over." : "Catch your breath."}</h2><p>${escapeHtml(state.lastReward || "Barricades are holding. Use daylight to recover and prepare.")}</p>${state.status === "active" ? `<button class="button button-primary" data-action="begin-night">BEGIN NIGHT 0${state.night} ${icon("arrow", 17)}</button>` : ""}</div>`}
        <div class="scene-caption"><span>DISTRICT 09 <b>·</b> EAST BARRICADE</span><span>LOCAL TIME 02:14 AM <i></i></span></div>
      </section>
      <aside class="hud-column"><div class="survivor-panel"><div class="panel-label">FIELD STATUS <span>LIVE</span></div><div class="survivor-id"><div class="avatar">${this.survivorAvatar()}</div><div><p class="eyebrow">SURVIVOR</p><h2>${escapeHtml(player.name)}</h2><small>${escapeHtml(state.difficulty.toUpperCase())} · DISTRICT 09</small></div></div>
        <div class="meter health-meter"><div class="meter-heading"><span>${icon("cross", 15)} HEALTH</span><b>${player.health}<small> / ${player.maxHealth}</small></b></div><div class="meter-track"><i style="--meter:${hp}%;--meter-color:${hp < 30 ? "var(--red-bright)" : "var(--green)"}"></i></div></div>
        <div class="meter stamina-meter"><div class="meter-heading"><span>${icon("dodge", 15)} STAMINA</span><b>${player.stamina}<small> / 100</small></b></div><div class="meter-track"><i style="--meter:${stamina}%;--meter-color:var(--amber)"></i></div></div>
        <div class="resource-grid"><div class="resource-cell">${icon("bullet", 16)}<span>MAGAZINE</span><b>${player.ammo}<small> / 12</small></b></div><div class="resource-cell">${icon("reload", 16)}<span>RESERVE</span><b>${player.reserve}</b></div><div class="resource-cell">${icon("scrap", 16)}<span>SALVAGE</span><b>${player.scrap}</b></div><div class="resource-cell">${icon("skull", 16)}<span>ELIMINATED</span><b>${player.kills}</b></div></div>
        <div class="score-strip"><span>RUN SCORE</span><b>${player.score.toLocaleString()}</b><small>PTS</small></div></div>
        <section class="action-panel"><div class="panel-label">FIELD ACTIONS <span>${combat ? "YOUR TURN" : "DAYLIGHT"}</span></div>${combat ? `<div class="actions-grid">
          <button class="action-card action-shoot" data-action="shoot" data-enemy="${selected}" ${player.ammo < 1 || !alive.length ? "disabled" : ""}><span class="action-icon">${icon("target", 19)}</span><strong>Fire weapon</strong><small><kbd>1</kbd> · 1 ROUND</small></button>
          <button class="action-card" data-action="heavy" data-enemy="${selected}" ${!alive.length ? "disabled" : ""}><span class="action-icon">${icon("scrap", 19)}</span><strong>Heavy strike</strong><small><kbd>2</kbd> · NO AMMO</small></button>
          <button class="action-card" data-action="reload" ${player.ammo >= 12 || player.reserve <= 0 ? "disabled" : ""}><span class="action-icon">${icon("reload", 19)}</span><strong>Reload</strong><small><kbd>R</kbd> · ${player.reserve} RESERVE</small></button>
          <button class="action-card" data-action="dodge" ${player.stamina < 30 ? "disabled" : ""}><span class="action-icon">${icon("dodge", 19)}</span><strong>Evade</strong><small><kbd>3</kbd> · −30 STAMINA</small></button>
          <button class="action-card" data-action="heal" ${player.medkits < 1 || player.health >= player.maxHealth ? "disabled" : ""}><span class="action-icon">${icon("cross", 19)}</span><strong>Use medkit</strong><small><kbd>4</kbd> · ${player.medkits} IN PACK</small></button>
          <button class="action-card" data-action="inventory"><span class="action-icon">${icon("bag", 19)}</span><strong>Inventory</strong><small><kbd>I</kbd> · ${player.medkits} MEDKITS</small></button>
        </div>` : `<div class="day-actions"><button class="button button-primary button-wide" data-action="begin-night">${state.night === 1 && state.log.length < 2 ? "DEFEND THE SAFEHOUSE" : `PREPARE FOR NIGHT 0${state.night}`} ${icon("arrow", 18)}</button><button class="button button-quiet button-wide" data-action="rest">REST · RECOVER 24 HP</button><button class="button button-quiet button-wide" data-action="inventory">${icon("bag", 16)} INVENTORY & CRAFTING</button></div>`}<div class="controls-foot">${icon("radio", 13)} <span>${combat ? "KEYS 1–4 · R RELOAD · I PACK · ESC PAUSE" : "SAFEHOUSE · REVIEW YOUR SUPPLIES"}</span></div></section>
        <section class="log-panel"><div class="panel-label">COMMS / FIELD LOG <span>RECENT</span></div><div class="log-list">${state.log.slice(0, 4).map((entry) => `<p class="log-entry log-${entry.tone}"><i></i><span>${escapeHtml(entry.text)}</span></p>`).join("")}</div></section>
      </aside></div></section>`;
  }

  shooter(state, options = {}) {
    const player = state.player;
    const weapon = options.weapons[player.weapon];
    const slot = player.weapons[player.weapon];
    const active = state.status === "active";
    const hp = Math.round(player.health / player.maxHealth * 100);
    const threat = state.enemies.length;
    return `<section class="shooter-screen screen-enter">
      <header class="shooter-header"><button class="wordmark" data-action="home"><span class="wordmark-mark">${icon("target", 18)}</span> NIGHTFALL<span class="wordmark-divider">/</span>STUDIOS</button>
        <div class="shooter-objective"><span class="live-dot ${state.phase === "combat" ? "danger-dot" : ""}"></span><b>${state.phase === "combat" ? "LIVE ENGAGEMENT" : active ? "SAFEHOUSE · INTERMISSION" : "OPERATION COMPLETE"}</b><i></i> WAVE ${String(state.night).padStart(2, "0")} / 05</div>
        <div class="shooter-menu"><button class="icon-button" data-action="inventory" title="Inventory (I)" aria-label="Inventory">${icon("bag", 18)}</button><button class="icon-button" data-action="settings" title="Settings" aria-label="Settings">${icon("settings", 18)}</button><button class="icon-button" data-action="pause" title="Pause (Escape)" aria-label="Pause">${icon("pause", 17)}</button></div>
      </header>
      <div class="shooter-world"><canvas class="action-canvas" tabindex="0" aria-label="Top-down zombie shooter battlefield. Use WASD to move and aim with the mouse."></canvas>
        <div class="shooter-top-hud"><div class="combat-chip"><span>${icon("target", 14)}</span>${state.phase === "combat" ? `${threat} HOSTILES` : "SAFEHOUSE SECURE"}</div><div class="combat-chip score-chip">${icon("skull", 14)} ${player.kills} ELIMINATED <i></i> ${player.score.toLocaleString()} PTS</div></div>
        <div class="shooter-status"><div class="shooter-vitals"><div class="vital-row"><span>${icon("cross", 14)} HEALTH</span><b data-hud="health">${Math.ceil(player.health)} <small>/ ${player.maxHealth}</small></b></div><div class="vital-track"><i data-hud="healthbar" style="--vital:${hp}%;--vital-color:${hp < 28 ? "#d65b45" : "#8a9b71"}"></i></div><div class="vital-row stamina-row"><span>${icon("dodge", 14)} STAMINA</span><b data-hud="stamina">${Math.ceil(player.stamina)} <small>/ 100</small></b></div><div class="vital-track stamina-track"><i data-hud="staminabar" style="--vital:${player.stamina}%"></i></div></div>
          <div class="weapon-readout"><span class="eyebrow" data-hud="weapon-name">${escapeHtml(weapon.name.toUpperCase())}</span><div class="ammo-readout"><b data-hud="ammo">${slot.ammo}</b><i>/</i><span data-hud="reserve">${slot.reserve}</span><small>ROUNDS</small></div><div class="weapon-slots">${["pistol", "rifle", "shotgun"].map((type, index) => `<span class="${player.weapon === type ? "weapon-current" : ""} ${player.weapons[type].unlocked ? "" : "weapon-locked"}">${index + 1} ${type.toUpperCase()}</span>`).join("")}</div></div>
        </div>
        <div class="shooter-controls"><div class="control-hints"><span><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> MOVE</span><i></i><span>MOUSE AIM · <b>CLICK</b> FIRE</span><i></i><span><kbd>R</kbd> RELOAD</span><i></i><span><kbd>SPACE</kbd> EVADE</span><i></i><span><kbd>E</kbd> PICK UP</span></div><div class="quick-actions"><button class="quick-button quick-fire" data-action="fire-once" ${state.phase !== "combat" ? "disabled" : ""}>FIRE</button><button class="quick-button" data-action="reload" ${state.phase !== "combat" || slot.ammo >= weapon.mag || slot.reserve <= 0 ? "disabled" : ""}>RELOAD <kbd>R</kbd></button><button class="quick-button" data-action="heal" ${player.medkits < 1 || player.health >= player.maxHealth ? "disabled" : ""}>MEDKIT · ${player.medkits}</button><button class="quick-button" data-action="inventory">PACK <kbd>I</kbd></button></div></div>
        <div class="wave-intermission" ${active && state.phase === "intermission" ? "" : "hidden"}><p class="eyebrow" data-wave-label>${state.night === 1 ? "DISTRICT 09 · SAFEHOUSE" : `WAVE 0${state.night - 1} CLEARED`}</p><h1 data-wave-heading>${state.night === 1 ? "HOLD THE LINE." : `WAVE 0${state.night}.`}</h1><p data-wave-copy>${state.night === 1 ? "The streets are quiet. That won't last." : "Catch your breath. The horde is regrouping."} <span>+${3 + state.night} SALVAGE ON CLEAR</span></p><button class="button button-primary" data-action="begin-wave">BEGIN WAVE 0${state.night} ${icon("arrow", 17)}</button><small>PRESS ENTER TO DEPLOY</small></div>
        ${state.phase === "combat" ? `<div class="interaction-hint" data-hud="pickup-hint"><kbd>E</kbd> ${state.loot.some((item) => Math.hypot(item.x - player.x, item.y - player.y) < 100) ? "COLLECT NEARBY LOOT" : "SCAVENGE NEARBY LOOT"}</div>` : ""}
        <div class="shooter-log" data-hud="log">${state.log.slice(0, 3).map((entry) => `<p class="log-${entry.tone}">${escapeHtml(entry.text)}</p>`).join("")}</div>
      </div>
      <div class="shooter-footer"><span>${icon("scrap", 14)} SALVAGE <b data-hud="scrap">${player.scrap}</b> <i></i> RESERVE CACHES <b data-hud="caches">${player.ammoPacks}</b></span><span>WASD MOVE <i>·</i> CURSOR AIM <i>·</i> SURVIVE FIVE WAVES</span></div>
    </section>`;
  }

  updateShooter(state, options = {}) {
    const player = state.player;
    const weapon = options.weapons[player.weapon];
    const slot = player.weapons[player.weapon];
    const hp = Math.round(player.health / player.maxHealth * 100);
    const setText = (selector, text) => {
      const element = this.root.querySelector(`[data-hud="${selector}"]`);
      if (element) element.textContent = text;
    };
    setText("health", `${Math.ceil(player.health)} / ${player.maxHealth}`);
    setText("stamina", `${Math.ceil(player.stamina)} / 100`);
    setText("ammo", slot.ammo);
    setText("reserve", slot.reserve);
    setText("weapon-name", weapon.name.toUpperCase());
    setText("scrap", player.scrap);
    setText("caches", player.ammoPacks);
    const healthBar = this.root.querySelector('[data-hud="healthbar"]');
    const staminaBar = this.root.querySelector('[data-hud="staminabar"]');
    if (healthBar) { healthBar.style.setProperty("--vital", `${hp}%`); healthBar.style.setProperty("--vital-color", hp < 28 ? "#d65b45" : "#8a9b71"); }
    if (staminaBar) staminaBar.style.setProperty("--vital", `${player.stamina}%`);
    const intermission = this.root.querySelector(".wave-intermission");
    if (intermission) {
      intermission.hidden = state.phase !== "intermission" || state.status !== "active";
      const firstWave = state.night === 1;
      const label = intermission.querySelector("[data-wave-label]");
      const heading = intermission.querySelector("[data-wave-heading]");
      const copy = intermission.querySelector("[data-wave-copy]");
      const deploy = intermission.querySelector("[data-action='begin-wave']");
      if (label) label.textContent = firstWave ? "DISTRICT 09 · SAFEHOUSE" : `WAVE 0${state.night - 1} CLEARED`;
      if (heading) heading.textContent = firstWave ? "HOLD THE LINE." : `WAVE 0${state.night}.`;
      if (copy) copy.innerHTML = `${firstWave ? "The streets are quiet. That won't last." : "Catch your breath. The horde is regrouping."} <span>+${3 + state.night} SALVAGE ON CLEAR</span>`;
      if (deploy) deploy.innerHTML = `BEGIN WAVE 0${state.night} ${icon("arrow", 17)}`;
    }
    const log = this.root.querySelector('[data-hud="log"]');
    if (log) log.innerHTML = state.log.slice(0, 3).map((entry) => `<p class="log-${entry.tone}">${escapeHtml(entry.text)}</p>`).join("");
    const slots = this.root.querySelector(".weapon-slots");
    if (slots) slots.innerHTML = ["pistol", "rifle", "shotgun"].map((type, index) => `<span class="${player.weapon === type ? "weapon-current" : ""} ${player.weapons[type].unlocked ? "" : "weapon-locked"}">${index + 1} ${type.toUpperCase()}</span>`).join("");
    const objective = this.root.querySelector(".shooter-objective");
    if (objective) objective.innerHTML = `<span class="live-dot ${state.phase === "combat" ? "danger-dot" : ""}"></span><b>${state.phase === "combat" ? "LIVE ENGAGEMENT" : state.status === "active" ? "SAFEHOUSE · INTERMISSION" : "OPERATION COMPLETE"}</b><i></i> WAVE ${String(state.night).padStart(2, "0")} / 05`;
    const chip = this.root.querySelector(".combat-chip");
    if (chip) chip.innerHTML = `<span>${icon("target", 14)}</span>${state.phase === "combat" ? `${state.enemies.length} HOSTILES` : "SAFEHOUSE SECURE"}`;
    const score = this.root.querySelector(".score-chip");
    if (score) score.innerHTML = `${icon("skull", 14)} ${player.kills} ELIMINATED <i></i> ${player.score.toLocaleString()} PTS`;
    const hint = this.root.querySelector('[data-hud="pickup-hint"]');
    if (hint) {
      const nearby = state.loot.some((item) => Math.hypot(item.x - player.x, item.y - player.y) < 100);
      hint.innerHTML = `<kbd>E</kbd> ${nearby ? "COLLECT NEARBY LOOT" : "SCAVENGE NEARBY LOOT"}`;
    }
    this.root.querySelectorAll(".quick-button").forEach((button) => {
      if (button.dataset.action === "heal") {
        button.disabled = player.medkits < 1 || player.health >= player.maxHealth;
        button.textContent = `MEDKIT · ${player.medkits}`;
      }
      if (button.dataset.action === "reload") button.disabled = state.phase !== "combat" || slot.ammo >= weapon.mag || slot.reserve <= 0;
    });
    this.root.querySelectorAll(".quick-fire").forEach((button) => { button.disabled = state.phase !== "combat"; });
  }

  battleArt(state, selected) {
    const combat = state.phase === "combat" && state.status === "active";
    const alive = state.enemies.filter((enemy) => enemy.health > 0);
    return `<svg class="battle-art" viewBox="0 0 1100 690" preserveAspectRatio="xMidYMid slice" role="img" aria-label="${combat ? "Ruined city battlefield with infected approaching" : "The east safehouse at dawn"}">
      <defs><linearGradient id="sky" x2="0" y2="1"><stop stop-color="${combat ? "#10181a" : "#25302e"}"/><stop offset=".62" stop-color="${combat ? "#33322e" : "#767064"}"/><stop offset="1" stop-color="#111312"/></linearGradient><linearGradient id="road" x2="0" y2="1"><stop stop-color="#33312d"/><stop offset="1" stop-color="#171816"/></linearGradient><radialGradient id="flare"><stop stop-color="#ff6741" stop-opacity=".45"/><stop offset="1" stop-color="#fc4730" stop-opacity="0"/></radialGradient><filter id="blur"><feGaussianBlur stdDeviation="18"/></filter></defs>
      <rect width="1100" height="690" fill="url(#sky)"/><circle cx="820" cy="183" r="126" fill="#cc5b42" opacity=".06" filter="url(#blur)"/><path d="M0 403 60 403 60 272 116 272 116 335 151 335 151 208 231 208 231 345 273 345 273 282 313 282 313 236 379 236 379 371 421 371 421 258 507 258 507 344 560 344 560 221 645 221 645 356 696 356 696 278 748 278 748 343 799 343 799 251 874 251 874 354 921 354 921 297 974 297 974 356 1023 356 1023 245 1081 245 1081 403 1100 403 1100 690 0 690z" fill="#202321" opacity=".78"/>
      <path d="M0 454 142 398 305 430 492 384 680 424 846 386 1100 440V690H0Z" fill="#292a26"/><path d="m453 690 114-300 50 0 215 300z" fill="url(#road)"/><path d="m564 690 36-251 18 0 74 251" fill="none" stroke="#a18865" stroke-opacity=".14" stroke-width="5" stroke-dasharray="29 31"/>
      <path d="M0 486h381l47 98H0z" fill="#403a31"/><path d="M0 484h402" stroke="#c4aa7e" stroke-opacity=".46" stroke-width="7"/><path d="m67 484 26 72m48-72 8 72m93-72-12 72m92-72-32 72" stroke="#171a19" stroke-width="9"/>
      <path d="M845 387v-184h14v184m-36-156h59v7h-59zm100 178v-219h13v219m-33-190h59v7h-59z" fill="#292a27"/><path d="M851 212h3v98h-3m104-112h3v98h-3" stroke="#f45a41" stroke-width="3" opacity=".74"/><ellipse cx="919" cy="384" rx="142" ry="87" fill="url(#flare)"/>
      ${[170, 361, 704, 1024].map((x, i) => `<g opacity=".75"><path d="M${x} 382v-100" stroke="#171a18" stroke-width="6"/><path d="M${x} 283q-28 0-29 25h58q-1-25-29-25" fill="#d58c4b" opacity="${i === 1 && combat ? ".45" : ".12"}"/></g>`).join("")}
      ${combat ? alive.map((enemy, i) => this.enemyFigure(enemy, i, selected)).join("") : `<g class="safehouse-marker" transform="translate(512 359)"><circle r="34" fill="#9eac81" fill-opacity=".11"/><circle r="21" fill="#9eac81" fill-opacity=".18"/><path d="M-8 13V-8l8-8 8 8v21M-4 14V2h8v12" fill="none" stroke="#bdc4a4" stroke-width="2"/></g>`}
      <g class="player-figure" transform="translate(530 473)"><ellipse cy="75" rx="74" ry="17" fill="#080a09" opacity=".55"/><path d="m-13 30-14 38 14 4 17-36 15 35 13-4-9-46" fill="#171918"/><path d="m-19-12-12 10 9 34 16 4 7-29 11 29 21-3 5-37-14-11z" fill="#292a25"/><path d="m-17-13-7 13 17 12 14-12 10 11 10-9-14-22-15 8z" fill="#414137"/><path d="m-10-39 21 1 6 29-14 13-18-9-5-24z" fill="#171a19"/><path d="m-8-36 18 1 1 7-18 1z" fill="#7c4439"/><path d="m-22-18-13 6 5 25 14-3zm31 1 14 5 5 23-13-3z" fill="#252824"/><path d="m14-18 27 20-4 5-34-14" fill="#30332e"/><path d="m33 4 30-11 2 4-28 17z" fill="#87806c"/><path d="m-22-9-8 13m50-11 7 11" stroke="#bc7653" stroke-opacity=".6" stroke-width="2"/></g>
      ${Array.from({ length: 16 }, (_, i) => `<circle class="dust" cx="${(i * 79 + 31) % 1080}" cy="${(i * 53 + 81) % 555}" r="${i % 3 + 1}" style="--dust-delay:${i * -0.65}s;--dust-duration:${6 + i % 5}s"/>`).join("")}
    </svg>`;
  }

  enemyFigure(enemy, index, selected) {
    const x = [225, 375, 728, 887, 590, 105][index % 6];
    const y = [427, 395, 416, 431, 366, 392][index % 6];
    const scale = enemy.type === "boss" ? 1.32 : enemy.type === "armored" ? 1.06 : 0.88;
    const health = Math.max(0, Math.round(enemy.health / enemy.maxHealth * 100));
    return `<g class="enemy-figure ${enemy.type} ${selected === enemy.id ? "enemy-selected" : ""}" transform="translate(${x} ${y}) scale(${scale})" data-enemy-select="${enemy.id}" tabindex="0" role="button" aria-label="Select ${escapeHtml(enemy.name)}, ${enemy.health} health">
      <ellipse cy="59" rx="31" ry="8" fill="#090a09" opacity=".6"/><path d="m-14 18-9 31 9 3 13-26 10 25 10-3-6-31" fill="#252522"/><path d="m-20-16-6 12 4 30 12 7 10-20 10 22 16-7 2-30-12-14z" fill="${enemy.type === "boss" ? "#3e3430" : enemy.type === "armored" ? "#40423b" : "#3a3c34"}"/><path d="m-11-40 20 3 5 23-12 15-18-8-4-20z" fill="#33332b"/><path d="m-11-34 17 2 1 6-18 1z" fill="#bc4f3b" opacity=".8"/><path d="m-24-13-12 17 7 7 15-13m26-7 16 9-4 9-18-6" fill="#34352f"/><path d="m-20 0-9 10m47-14 12 10" stroke="#78805d" stroke-width="2"/><rect x="-27" y="-63" width="54" height="3" rx="1" fill="#161817"/><rect x="-27" y="-63" width="${54 * health / 100}" height="3" rx="1" fill="${enemy.type === "boss" ? "#cb543c" : "#a85240"}"/><text x="0" y="-70" text-anchor="middle" fill="#e1d8c8" font-size="9" font-family="sans-serif" letter-spacing="1">${escapeHtml(enemy.name.toUpperCase())} ${health}%</text>
    </g>`;
  }

  survivorAvatar() {
    return `<svg viewBox="0 0 70 76" aria-hidden="true"><path d="m20 46-9 24 9 2 11-22 10 22 9-2-7-25" fill="#20211e"/><path d="m17 20-5 9 3 18 11 4 8-14 7 16 12-4 1-19-9-8z" fill="#414138"/><path d="m26 5 15 1 5 18-10 11-14-6-4-16z" fill="#282b27"/><path d="m25 9 14 1 1 5-15 1z" fill="#a34f3a"/><path d="m43 24 20 15-3 4-23-11" fill="#353730"/><path d="m60 38 9-4 1 3-8 5" fill="#89816c"/></svg>`;
  }

  overlayFor(kind, state) {
    const player = state.player;
    if (state.gameMode === "realtime") return this.shooterOverlay(kind, state);
    if (kind === "inventory") return `<section class="modal-panel inventory-modal" role="dialog" aria-modal="true" aria-labelledby="overlay-title"><header class="modal-heading"><div><p class="eyebrow">PACK & FIELD BENCH</p><h2 id="overlay-title">Inventory</h2></div><button class="icon-button" aria-label="Close inventory" data-action="close-overlay">${icon("close", 19)}</button></header><div class="inventory-resources"><span>${icon("scrap", 16)} ${player.scrap} SALVAGE</span><span>${icon("bullet", 16)} ${player.ammo} / ${player.reserve} ROUNDS</span></div><div class="item-grid">
    ${this.itemCard("cross", "FIELD MEDKIT", "Patch up and restore up to 38 health.", player.medkits, player.medkits ? "data-action='heal'" : "disabled", player.medkits ? "USE ITEM" : "OUT OF STOCK")}
    ${this.itemCard("bullet", "AMMO CACHE", "Twelve rounds added to reserve.", player.ammoPacks, player.ammoPacks ? "data-action='use-ammo'" : "disabled", player.ammoPacks ? "USE ITEM" : "OUT OF STOCK")}
    ${this.itemCard("scrap", "SALVAGE", "Recovered parts. Used at the field bench.", player.scrap, "disabled", "CRAFTING MATERIAL")}
    ${this.itemCard("target", "SERVICE RIFLE", "Reliable. Twelve-round magazine.", 1, "disabled", `${player.ammo} / 12 LOADED`)}
    </div><div class="crafting-section"><div class="panel-label">FIELD CRAFTING <span>CONFIRM BEFORE SPENDING</span></div><div class="recipe-grid"><article class="recipe-card"><div><b>${icon("cross", 18)} MEDKIT</b><small>Restores health in combat</small></div><span>4 <i>SCRAP</i></span><button class="button button-quiet" data-action="craft-medkit" ${player.scrap < 4 ? "disabled" : ""}>CRAFT</button></article><article class="recipe-card"><div><b>${icon("bullet", 18)} AMMO PACK</b><small>Adds 12 rounds to reserve</small></div><span>3 <i>SCRAP</i></span><button class="button button-quiet" data-action="craft-ammo" ${player.scrap < 3 ? "disabled" : ""}>CRAFT</button></article></div></div></section>`;
    if (kind === "missions") return `<section class="modal-panel mission-modal" role="dialog" aria-modal="true" aria-labelledby="overlay-title"><header class="modal-heading"><div><p class="eyebrow">OPERATION: LAST LIGHT</p><h2 id="overlay-title">Mission briefing</h2></div><button class="icon-button" aria-label="Close briefing" data-action="close-overlay">${icon("close", 19)}</button></header><p class="mission-summary">Three nights. One extraction window. Keep the east barricade standing until the chopper reaches District 09.</p><div class="mission-list">${[1, 2, 3].map((night) => `<article class="mission-row ${night < state.night ? "mission-cleared" : night === state.night ? "mission-current" : ""}"><span class="mission-number">0${night}</span><div><h3>${["First contact", "The breach", "The Warden"][night - 1]}</h3><p>${["Secure the safehouse. Expect a small infected group.", "Armored infected detected. Conserve ammunition.", "The Warden has been sighted. Clear the zone for extraction."][night - 1]}</p></div><span class="mission-state">${night < state.night ? icon("check", 17) : night === state.night ? "ACTIVE" : "LOCKED"}</span></article>`).join("")}</div><div class="mission-objective"><span>${icon("target", 18)}</span><div><b>PRIMARY OBJECTIVE</b><p>Survive the night. Eliminate every hostile. Reach extraction after Night 03.</p></div></div></section>`;
    if (kind === "pause") return `<section class="modal-panel pause-modal" role="dialog" aria-modal="true" aria-labelledby="overlay-title"><p class="eyebrow">ENGAGEMENT SUSPENDED</p><h2 id="overlay-title">Take a breath.</h2><p class="muted">Your position is saved locally on this device.</p><div class="pause-actions"><button class="button button-primary button-wide" data-action="resume">${icon("arrow", 17)} RETURN TO THE FIGHT</button><button class="button button-quiet button-wide" data-action="save-exit">SAVE & RETURN TO TITLE</button><button class="button button-danger button-wide" data-action="abandon">ABANDON THIS RUN</button></div></section>`;
    return "";
  }

  shooterOverlay(kind, state) {
    const player = state.player;
    if (kind === "inventory") return `<section class="modal-panel inventory-modal" role="dialog" aria-modal="true" aria-labelledby="overlay-title"><header class="modal-heading"><div><p class="eyebrow">FIELD KIT · WAVE ${String(state.night).padStart(2, "0")}</p><h2 id="overlay-title">Inventory</h2></div><button class="icon-button" aria-label="Close inventory" data-action="close-overlay">${icon("close", 19)}</button></header><div class="inventory-resources"><span>${icon("scrap", 16)} ${player.scrap} SALVAGE</span><span>${icon("bullet", 16)} ${player.weapons[player.weapon].ammo} / ${player.weapons[player.weapon].reserve} ROUNDS</span><span>${icon("cross", 16)} ${player.medkits} MEDKITS</span></div><div class="item-grid">
      ${this.itemCard("cross", "FIELD MEDKIT", "Restore up to 42 health.", player.medkits, player.medkits && player.health < player.maxHealth ? "data-action='heal'" : "disabled", player.medkits ? "USE ITEM" : "OUT OF STOCK")}
      ${this.itemCard("bullet", "AMMO CACHE", "Add ammunition to the equipped weapon.", player.ammoPacks, player.ammoPacks ? "data-action='use-ammo'" : "disabled", player.ammoPacks ? "USE ITEM" : "OUT OF STOCK")}
      ${this.itemCard("target", "SERVICE PISTOL", "12-round magazine · 31 damage · balanced.", player.weapons.pistol.ammo, "data-action='switch-pistol'", player.weapon === "pistol" ? "EQUIPPED" : "EQUIP")}
      ${this.itemCard("target", "ASSAULT RIFLE", "30-round magazine · fast automatic fire.", player.weapons.rifle.unlocked ? player.weapons.rifle.ammo : 10, player.weapons.rifle.unlocked ? "data-action='switch-rifle'" : state.phase === "intermission" && player.scrap >= 10 ? "data-action='unlock-rifle'" : "disabled", player.weapons.rifle.unlocked ? (player.weapon === "rifle" ? "EQUIPPED" : "EQUIP") : "UNLOCK · 10 SALVAGE")}
      ${this.itemCard("target", "PUMP SHOTGUN", "Six shells · seven close-range pellets.", player.weapons.shotgun.unlocked ? player.weapons.shotgun.ammo : 14, player.weapons.shotgun.unlocked ? "data-action='switch-shotgun'" : state.phase === "intermission" && player.scrap >= 14 ? "data-action='unlock-shotgun'" : "disabled", player.weapons.shotgun.unlocked ? (player.weapon === "shotgun" ? "EQUIPPED" : "EQUIP") : "UNLOCK · 14 SALVAGE")}
      </div><div class="crafting-section"><div class="panel-label">FIELD BENCH <span>${state.phase === "intermission" ? "SAFE TO CRAFT" : "LOCKED DURING ENGAGEMENT"}</span></div><div class="recipe-grid"><article class="recipe-card"><div><b>${icon("cross", 18)} MEDKIT</b><small>Restores health · intermission</small></div><span>5 <i>SALVAGE</i></span><button class="button button-quiet" data-action="craft-medkit" ${state.phase !== "intermission" || player.scrap < 5 ? "disabled" : ""}>CRAFT</button></article><article class="recipe-card"><div><b>${icon("bullet", 18)} AMMO CACHE</b><small>Restocks the active weapon</small></div><span>3 <i>SALVAGE</i></span><button class="button button-quiet" data-action="craft-ammo" ${state.phase !== "intermission" || player.scrap < 3 ? "disabled" : ""}>CRAFT</button></article></div></div></section>`;
    if (kind === "pause") return `<section class="modal-panel pause-modal" role="dialog" aria-modal="true" aria-labelledby="overlay-title"><p class="eyebrow">ENGAGEMENT SUSPENDED</p><h2 id="overlay-title">Hold position.</h2><p class="muted">Your run is saved on this browser. Escape resumes play.</p><div class="pause-actions"><button class="button button-primary button-wide" data-action="resume">${icon("arrow", 17)} RESUME GAME</button><button class="button button-quiet button-wide" data-action="save-exit">SAVE & RETURN TO TITLE</button><button class="button button-danger button-wide" data-action="abandon">ABANDON THIS RUN</button></div></section>`;
    if (kind === "missions") return `<section class="modal-panel mission-modal" role="dialog" aria-modal="true" aria-labelledby="overlay-title"><header class="modal-heading"><div><p class="eyebrow">OPERATION: LAST LIGHT</p><h2 id="overlay-title">Five-wave survival</h2></div><button class="icon-button" aria-label="Close briefing" data-action="close-overlay">${icon("close", 19)}</button></header><p class="mission-summary">Move through District 09. Clear each incoming wave, collect drops with E, resupply during intermission, and survive the Brute-led fifth wave.</p><div class="mission-objective"><span>${icon("target", 18)}</span><div><b>WASD MOVE · MOUSE AIM · LEFT CLICK FIRE</b><p>Press R to reload, Space to evade, E to collect drops, I for inventory and Escape to pause. Unlock the rifle and shotgun at the field bench.</p></div></div></section>`;
    return "";
  }

  itemCard(symbol, title, description, quantity, attribute, actionLabel) {
    return `<article class="item-card"><div class="item-symbol">${icon(symbol, 21)}</div><div class="item-copy"><h3>${title}</h3><p>${description}</p></div><b class="item-quantity">${String(quantity).padStart(2, "0")}<small> QTY</small></b><button class="button button-quiet item-action" ${attribute}>${actionLabel}</button></article>`;
  }

  leaderboard({ entries = [] } = {}) {
    return `<section class="subpage screen-enter"><header class="subpage-header"><button class="wordmark" data-action="home"><span class="wordmark-mark">${icon("target", 18)}</span> NIGHTFALL<span class="wordmark-divider">/</span>STUDIOS</button><button class="button button-quiet" data-action="home">BACK TO TITLE ${icon("arrow", 16)}</button></header><div class="leaderboard-content"><p class="eyebrow">THE ONES WHO MADE IT</p><h1>HALL OF<br><em>SURVIVORS</em></h1><div class="leaderboard-card">${entries.length ? `<div class="leaderboard-heading"><span>RANK / CALLSIGN</span><span>ELIMINATED</span><span>WAVES</span><span>SCORE</span></div>${entries.map((entry, index) => `<div class="leaderboard-entry"><span><i>${String(index + 1).padStart(2, "0")}</i> ${escapeHtml(entry.name)}<small>${escapeHtml(entry.difficulty || "SURVIVOR")}</small></span><b>${entry.kills}</b><b>${entry.nights} / 5</b><strong>${entry.score.toLocaleString()}</strong></div>`).join("")}` : `<div class="empty-record"><span>${icon("radio", 28)}</span><p>NO TRANSMISSIONS RECEIVED</p><small>Finish a run to have your callsign recorded here.</small></div>`}</div><p class="local-note">${icon("lock", 13)} SCORES ARE STORED LOCALLY IN THIS BROWSER</p></div></section>`;
  }

  missions() {
    return `<section class="subpage screen-enter"><header class="subpage-header"><button class="wordmark" data-action="home"><span class="wordmark-mark">${icon("target", 18)}</span> NIGHTFALL<span class="wordmark-divider">/</span>STUDIOS</button><button class="button button-quiet" data-action="home">BACK TO TITLE ${icon("arrow", 16)}</button></header><div class="leaderboard-content"><p class="eyebrow">OPERATION: LAST LIGHT · DISTRICT 09</p><h1>FIVE WAVES.<br><em>ONE WAY OUT.</em></h1><p class="mission-summary">Fight through five increasingly dangerous waves. Keep the east barricade standing, scavenge supplies, and defeat the Brute guarding the extraction route.</p><div class="mission-list mission-page-list">${[1, 2, 3, 4, 5].map((wave) => `<article class="mission-row"><span class="mission-number">0${wave}</span><div><h3>${["First contact", "The breach", "Fast movers", "Armored column", "The Brute"][wave - 1]}</h3><p>${["Basic walkers test the east barricade.", "Fast infected and armored units enter the district.", "Runners approach from multiple sides.", "The horde grows denser and more aggressive.", "A Brute joins the final push. Survive to extraction."][wave - 1]}</p></div><span class="mission-state">${wave === 5 ? "BRUTE" : `${4 + wave * 2} HOSTILES`}</span></article>`).join("")}</div><button class="button button-primary" data-action="new-game">CHOOSE YOUR CALLSIGN ${icon("arrow", 17)}</button></div></section>`;
  }

  settings({ settings, returnGame = false }) {
    const backAction = returnGame ? "return-game" : "home";
    const backLabel = returnGame ? "RETURN TO GAME" : "BACK TO TITLE";
    return `<section class="subpage screen-enter"><header class="subpage-header"><button class="wordmark" data-action="${backAction}"><span class="wordmark-mark">${icon("target", 18)}</span> NIGHTFALL<span class="wordmark-divider">/</span>STUDIOS</button><button class="button button-quiet" data-action="${backAction}">${backLabel} ${icon("arrow", 16)}</button></header><div class="settings-content"><p class="eyebrow">FIELD EQUIPMENT & ACCESSIBILITY</p><h1>YOUR<br><em>SETUP</em></h1><div class="settings-card"><div class="setting-row"><div><b>REDUCED MOTION</b><small>Limit battlefield movement and transitions.</small></div><label class="switch"><input type="checkbox" data-setting="reducedMotion" ${settings.reducedMotion ? "checked" : ""}><span></span></label></div><div class="setting-row"><div><b>INTERFACE SCALE</b><small>Adjust the size of interface text and controls.</small></div><label class="scale-control"><span>80%</span><input type="range" min="0.85" max="1.15" step="0.05" value="${settings.scale}" data-setting="scale" aria-label="Interface scale"><span>115%</span></label></div><div class="setting-row"><div><b>PROTOTYPE DATA</b><small>Clear save and leaderboard from this browser.</small></div><button class="button button-quiet" data-action="clear-data">CLEAR LOCAL DATA</button></div></div><p class="settings-footnote">NO SOUNDTRACK IS IMPLEMENTED; NO SOUND CONTROLS ARE SHOWN.</p></div></section>`;
  }

  results(state) {
    const victory = state.status === "victory";
    return `<section class="results-screen screen-enter ${victory ? "result-victory" : "result-defeat"}"><div class="result-glow"></div><header class="subpage-header"><span class="wordmark"><span class="wordmark-mark">${icon(victory ? "check" : "target", 18)}</span> NIGHTFALL<span class="wordmark-divider">/</span>STUDIOS</span><span class="top-edition">${victory ? "EVACUATION CONFIRMED" : "SIGNAL LOST"}</span></header><div class="result-content"><p class="eyebrow">${victory ? "DISTRICT 09 · MISSION COMPLETE" : "DISTRICT 09 · RUN TERMINATED"}</p><h1>${victory ? "YOU HELD<br>THE <em>LINE.</em>" : "THE NIGHT<br><em>WON.</em>"}</h1><p class="result-deck">${victory ? "The chopper found you. Not everyone made it — but you did." : "Your signal went dark. The safehouse is lost."}</p><div class="result-stats"><div><span>FINAL SCORE</span><b>${state.player.score.toLocaleString()}</b></div><div><span>ELIMINATED</span><b>${state.player.kills}</b></div><div><span>WAVES SURVIVED</span><b>${victory ? 5 : Math.max(0, state.night - (state.phase === "combat" ? 0 : 1))}<small> / 5</small></b></div><div><span>DIFFICULTY</span><b class="stat-text">${state.difficulty.toUpperCase()}</b></div></div><div class="button-row"><button class="button button-primary" data-action="replay">RUN IT BACK ${icon("arrow", 17)}</button><button class="button button-quiet" data-action="leaderboard">HALL OF SURVIVORS</button><button class="button button-quiet" data-action="home">MAIN MENU</button></div></div><footer class="title-footer"><span>YOUR RUN HAS BEEN RECORDED LOCALLY</span><span class="footer-status">${icon("lock", 13)} BROWSER PROTOTYPE</span></footer></section>`;
  }

  setOverlay(kind, state) {
    this.overlay = kind;
    this.root.querySelector(".overlay-backdrop")?.remove();
    if (!kind) {
      return;
    }
    const backdrop = document.createElement("div");
    backdrop.className = "overlay-backdrop";
    backdrop.innerHTML = this.overlayFor(kind, state);
    backdrop.addEventListener("click", (event) => {
      if (event.target === backdrop) this.root.dispatchEvent(new CustomEvent("close-overlay"));
    });
    this.root.append(backdrop);
    backdrop.querySelector("[data-action]")?.focus();
  }
}

export { escapeHtml, icon };
